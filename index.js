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
app.use(express.static(path.join(__dirname, "/public")));

//default route
app.get("/", (req, res) => {
  res.render("index.ejs");
});

//room route
app.get("/room", (req, res) => {
  res.render("room.ejs");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
