require("dotenv").config();
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("express-flash");
const { brotliCompressSync } = require("zlib");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo")(session);

const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.io = io;

//connect mongoose
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connected to database");
  });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
const models = require("./database.js");
const User = models.user;
const Room = models.room;
const Message = models.message;

//use ejs
app.set("view-engine", "ejs");

//use flash
app.use(flash());

//request parser for post requests
app.use(require("body-parser").urlencoded({ extended: true }));

//set static folder to /public
app.use("/public", express.static(path.join(__dirname, "public")));

//get user by username
const getUserByUsername = function (username, callback) {
  User.findOne({ username: username }, (err, user) => {
    callback(user, null);
  });
};
const getUserById = function (id, callback) {
  User.findById(id, (err, user) => {
    callback(user, null);
  });
};
const comparePassword = function (password, hash) {
  return bcrypt.compareSync(password, hash);
};
const addUser = function (username, password, callback) {
  bcrypt.hash(password, 10, (err1, hash) => {
    let newUser = new User({
      username: username,
      password: hash,
    });

    newUser.save((err2, newUser) => {
      callback(err1 || err2, newUser);
    });
  });
};

const addRoom = function (name, description, creator, callback) {
  let newRoom = new Room({
    name: name,
    description: description,
    creator: creator,
  });

  newRoom.save((err, newRoom) => {
    callback(err, newRoom);
  });
};

const getRoomById = function (id, callback) {
  Room.findById(id, (room, err) => {
    callback((room, err));
  });
};

const addMessage = function (message, callback) {
  getRoomById(message.roomId, (room, err) => {
    if (err) {
      callback(null, err);
    } else {
      room.messages.push(
        new Message({
          body: message.message,
          sender: message.name,
          time: message.time,
        })
      );
      room.save((err, room) => {
        callback(err, room);
      });
    }
  });
};

//local strategy for authentication
passport.use(
  new LocalStrategy((username, password, done) => {
    getUserByUsername(username, (user, err) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Incorrect username or password" });
      }
      if (comparePassword(password, user.password)) {
        return done(null, user);
      } else {
        return done(null, false, { message: "Incorrect username or password" });
      }
    });
  })
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  getUserById(id, (user, err) => {
    if (err) return done(err);
    done(null, user);
  });
});

//init session
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: db }),
});
app.use(sessionMiddleware);

//share sessions with sockets
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

//use passport and connect to session
app.use(passport.initialize());
app.use(passport.session());

//default route
app.get("/", (req, res) => {
  if (!req.user) {
    res.redirect("/login");
  } else {
    Room.find({}, (err, roomList) => {
      if (!err) {
        rooms = [];
        roomList.forEach((room) => {
          roomUsers = roomsActiveUsers.find((r) => {
            return r.id === room._id.toString();
          });
          if (roomUsers) {
            rooms.push({
              name: room.name,
              description: room.description,
              creator: room.creator,
              _id: room._id,
              activeUsers: roomUsers.users,
            });
          } else {
            rooms.push({
              name: room.name,
              description: room.description,
              creator: room.creator,
              _id: room._id,
              activeUsers: [],
            });
          }
        });
        res.render("index.ejs", { rooms: rooms });
      } else {
        res.render("index.ejs", { rooms: [] });
      }
    });
  }
});

//room route
app.get("/chatroom", (req, res) => {
  if (!req.user) {
    res.redirect("/login");
  } else if (!req.query.rid) {
    res.redirect("/");
  } else {
    getRoomById(req.query.rid, (room, err) => {
      if (err) {
        res.redirect("/");
      } else {
        let messages = [];
        room.messages.forEach((message) => {
          messages.push({
            body: message.body,
            time: message.time,
            sender: message.sender,
            fromThisUser: message.sender === req.user.username,
          });
        });
        res.render("chatroom.ejs", { messages: messages, room: room });
      }
    });
  }
});

//route for getting own session info
app.get("/userinfo", (req, res) => {
  if (!req.user) {
    res.sendStatus("500");
  } else if (req.query.username) {
    res.send(req.user.username);
  }
});

//login post authenticate with passport
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

//login route
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

//register route
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

//register create account and login user
app.post("/register", (req, res) => {
  //check for empty fields
  if (!req.body.username || !req.body.password) {
    res.render("register.ejs", { error: "Fill all fields" });
  } else {
    //try to find user by that username
    getUserByUsername(req.body.username, (user, err) => {
      if (err) {
        console.error(err);
        //server error
        res.render("register.ejs", { error: "server error" });
      } else {
        //user exists
        if (user) {
          res.render("register.ejs", { error: "username taken" });
        } else {
          //create account
          addUser(req.body.username, req.body.password, (err, addedUser) => {
            //log in
            req.login(addedUser, function (err) {
              if (err) {
                console.error(err);
                return res.render("register.ejs", {
                  error: "Server error",
                });
              }
              return res.redirect("/");
            });
          });
        }
      }
    });
  }
});

//log out
app.get("/logout", (req, res) => {
  if (req.user) {
    req.logout();
  }
  res.redirect("/login");
});

//new room form
app.post("/newroom", (req, res) => {
  if (!req.user) {
    res.redirect("/login");
  } else if (!req.body.name) {
    res.render("newroom.ejs", { error: "Name field required" });
  } else {
    addRoom(
      req.body.name,
      req.body.description || "No description",
      req.user._id,
      (err, room) => {
        if (!err) {
          req.app.io.emit("newRoom", room);
          rooms.push(room);
        }
        res.redirect("/");
      }
    );
  }
});

//new room get route
app.get("/newroom", (req, res) => {
  if (!req.user) {
    res.redirect("/login");
  } else {
    res.render("newroom.ejs");
  }
});

//socket
io.on("connection", (socket) => {
  //console.log("socket connected");
});

const roomsActiveUsers = [];

//socket channel for /chatroom
chatRoom = io.of("/chatroom");
chatRoom.on("connection", (socket) => {
  //join room on request
  socket.on("joinRoom", (roomId) => {
    if (roomId && socket.request.session.passport) {
      getRoomById(roomId, (room, roomErr) => {
        if (!roomErr) {
          socket.join(roomId);

          socket.room = roomId;
          socket.userId = socket.request.session.passport.user;

          roomUsers = roomsActiveUsers.find((room) => {
            return room.id === roomId;
          });

          getUserById(socket.userId, (user, userErr) => {
            if (!userErr) {
              //if first user in room
              if (!roomUsers) {
                roomUsers = {
                  id: roomId,
                  users: [{ name: user.username, connections: 1 }],
                };
                roomsActiveUsers.push(roomUsers);
              } else {
                //find user in room's active users
                thisUser = roomUsers.users.find((u) => {
                  return u.name === user.username;
                });

                //if fist connection by this user
                if (!thisUser) {
                  roomUsers.users.push({ name: user.username, connections: 1 });
                }
                //else
                else {
                  thisUser.connections++;
                }
              }
              //emit join
              chatRoom.to(roomId).emit("userJoined", user.username);
              setTimeout(() => {
                io.emit("roomJoin", {
                  id: roomId,
                  userCount: roomUsers.users.length,
                });
              }, 500);
            }
          });
        }
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.room) {
      getRoomById(socket.room, (room, roomErr) => {
        if (!roomErr) {
          roomUsers = roomsActiveUsers.find((r) => {
            return r.id === socket.room;
          });

          getUserById(socket.userId, (user, userErr) => {
            let thisUser = roomUsers.users.find((u) => {
              return u.name === user.username;
            });

            if (!thisUser) {
              console.error("User left room they aren't in");
            } else {
              thisUser.connections--;
              //if user has no connections left to room
              if (thisUser.connections <= 0) {
                //remove user from users list
                roomUsers.users.splice(roomUsers.users.indexOf(thisUser), 1);
                //if room has no users, remove it from rooms' active users list
                if (roomUsers.users.length === 0) {
                  roomsActiveUsers.splice(
                    roomsActiveUsers.indexOf(roomUsers),
                    1
                  );
                }
                //emit left room
                chatRoom.to(socket.room).emit("userLeft", user.username);
                setTimeout(() => {
                  io.emit("roomLeave", {
                    id: socket.room,
                    userCount: roomUsers.users.length,
                  });
                }, 500);
              }
            }
          });
        }
      });
    }
  });

  //emit sent messages to room
  socket.on("message", (data) => {
    data.time = Date.now();

    addMessage(data, (err, message) => {
      if (err) {
        throw err;
      } else {
        chatRoom.to(data.roomId).emit("message", data);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
