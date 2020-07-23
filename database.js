const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  id: mongoose.ObjectId,
});

const messsageSchema = new mongoose.Schema({
  body: String,
  sender: String,
  time: String,
});

const roomSchema = new mongoose.Schema({
  name: String,
  description: String,
  creator: String,
  messages: [messsageSchema],
  id: mongoose.ObjectId,
});

const User = mongoose.model("User", userSchema);
const Room = mongoose.model("Room", roomSchema);
const Message = mongoose.model("Message", messsageSchema);

module.exports = {
  room: Room,
  user: User,
  message: Message,
};
