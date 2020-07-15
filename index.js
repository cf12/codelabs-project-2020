const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("express-flash");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

//use ejs
app.set("view-engine", "ejs");

//use flash
app.use(flash());

//request parser for post requests
app.use(require("body-parser").urlencoded({ extended: true }));

//set static folder to /public
app.use("/public", express.static(path.join(__dirname, "public")));

//temporary list of users, to be replaced with database requests
const users = [
  { username: "user1", password: "pword", id: 0 },
  { username: "0", password: "0", id: 1 },
];

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
        return done(null, false, { message: "Incorrect username or password" });
      }
      if (comparePassword(user.password, password)) {
        return done(null, user);
      } else {
        return done(null, false, { message: "Incorrect username or password" });
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
  if (!req.user) {
    res.redirect("/login");
  } else {
    res.render("index.ejs", { rooms: rooms });
  }
});

//room route
app.get("/chatroom", (req, res) => {
  if (!req.user) {
    res.redirect("/login");
  } else if (!req.query.rid) {
    res.redirect("/");
  } else {
    req.session.roomId = req.query.rid;
    res.render("chatroom.ejs");
  }
});

//route for getting own session info
app.get("/userinfo", (req, res) => {
  if (!req.user) {
    res.sendStatus("500");
  } else if (req.query.username) {
    res.send(req.user.username);
  } else if (req.query.roomid) {
    res.send(req.session.roomId);
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
  }
  //check if username taken
  else if (
    users.find((user) => {
      return user.username === req.body.username;
    })
  ) {
    res.render("register.ejs", { error: "Username is taken" });
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

const rooms = [
  { name: "main room", id: 0 },
  { name: "room 2", id: 1 },
  { name: "room 3", id: 2 },
  { name: "room 4", id: 3 },
  { name: "room 5", id: 4 },
];

//socket channel for /chatroom
chatRoom = io.of("/chatroom");
chatRoom.on("connection", (socket) => {
  //join room on request
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId + "");
  });

  //emit sent messages to room
  socket.on("message", (data) => {
    chatRoom.to(data.roomId + "").emit("message", data);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
