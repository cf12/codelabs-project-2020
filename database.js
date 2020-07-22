const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  id: mongoose.ObjectId,
});

const roomSchema = new mongoose.Schema({
  name: String,
  description: String,
  creator: String,
  id: mongoose.ObjectId,
});

const User = mongoose.model("User", userSchema);
const Room = mongoose.model("Room", roomSchema);

module.exports = {
  room: Room,
  user: User,
};
