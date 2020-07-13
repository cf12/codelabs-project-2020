const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

//use ejs
app.set("view-engine", "ejs");

//request parser for post requests
app.use(require("body-parser").urlencoded({ extended: true }));

//set static folder to /public
app.use("/public", express.static(path.join(__dirname, "public")));

//temporary list of users, to be replaced with database requests
const users = [{ username: "user1", password: "pword", id: 0 }];

//get user by username
const getUserByUsername = function (username, callback) {
  let user = users.find((user) => {
    return user.username === username;
  });
  callback(user, null);
};
const getUserById = function (id, callback) {
  let user = users.find((user) => {
    return user.id === id;
  });
  callback(user, null);
};
const comparePassword = function (pw1, pw2) {
  //replace with bcrypt compare later
  return pw1 === pw2;
};
const addUser = function (username, password) {
  //replace with database insert later
  let user = { username: username, password: password, id: users.length };
  users.push(user);
  return user;
};

//local strategy for authentication
passport.use(
  new LocalStrategy((username, password, done) => {
    getUserByUsername(username, (user, err) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "no user with that username" });
      }
      if (comparePassword(user.password, password)) {
        return done(null, user);
      } else {
        return done(null, false, { message: "incorrect password" });
      }
    });
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  getUserById(id, (user, err) => {
    if (err) return done(err);
    done(null, user);
  });
});

//init session
const sessionMiddleware = session({
  secret: "super secret",
  resave: false,
  saveUninitialized: false,
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
  res.sendFile(path.join(__dirname, "public/html/index.html"));
});

//room route
app.get("/chatroom", (req, res) => {
  res.sendFile(path.join(__dirname, "public/html/chatroom.html"));
});

//login post authenticate with passport
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

//register create account and login user
app.post("/register", (req, res) => {
  //check for empty fields
  if (!req.body.username || !req.body.password) {
    console.log("field empty");
    res.redirect("/register");
  }
  //check if username taken
  else if (
    users.find((user) => {
      return user.username === req.body.username;
    })
  ) {
    res.redirect("/register");
  }
  //success
  else {
    //create account
    let addedUser = addUser(req.body.username, req.body.password);

    //log in
    req.login(addedUser, function (err) {
      if (err) {
        return next(err);
      }
      return res.redirect("/");
    });
  }
});

//socket
io.on("connection", (socket) => {
  console.log("socket connected");
});

const rooms = [];

//socket channel for /chatroom
chatRoom = io.of("/room");
chatRoom.on("connection", (socket) => {
  //join room on request
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  //emit sent messages to room
  socket.on("message", (data) => {
    socket.to(data.roomId).emit(data.message);
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
