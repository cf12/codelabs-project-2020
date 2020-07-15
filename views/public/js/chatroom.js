const socket = io("/chatroom");

var roomId;

//on socket connection, ask server to join current room
socket.on("connect", () => {
  $.get("/userinfo", { roomid: true }, (rid) => {
    console.log(rid);
    roomId = rid;
    socket.emit("joinRoom", roomId);
  });
});

$("document").ready(() => {
  var outputArea = $("#chat-output");

  $("#user-input-form").on("submit", function (e) {
    e.preventDefault();

    var message = $("#user-input").val();

    $.get("/userinfo", { username: true }, (username) => {
      socket.emit("message", {
        name: username,
        message: message,
        roomId: roomId,
      });
    });

    $("#user-input").val("");
  });

  //handle new message through socket
  socket.on("message", (data) => {
    //get user's name, if message came from this user, add user-message else add bot-message
    $.get("/userinfo", { username: true }, (username) => {
      if (data.name === username) {
        outputArea.append(`
    <div class='user-message'>
      <div class='message'>
        ${data.message}
      </div>
    </div>
  `);
      } else {
        outputArea.append(`
    <div class='bot-message'>
      <div class='message'>
        ${data.message}
      </div>
    </div>
  `);
      }
    });
  });
});
