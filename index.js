const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const express = require("express");
const session = require("express-session");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

//use ejs
app.set("view-engine", "ejs");

//request parser for post requests
app.use(express.urlencoded({ extended: true }));

//set static folder to /public
app.use(express.static(path.join(__dirname, "public")));

//default route
app.get("/", (req, res) => {
  res.redirect("/html/index.html");
});

//room route
app.get("/chatroom", (req, res) => {
  res.redirect("/html/chatroom.html");
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
