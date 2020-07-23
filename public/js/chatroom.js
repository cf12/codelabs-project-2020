const socket = io("/chatroom");

var roomId;

//on socket connection, ask server to join current room
socket.on("connect", () => {
  let params = window.location.href.split("?")[1].split("&");
  let paramObj = {};
  params.forEach((param) => {
    let pair = param.split("=");
    paramObj[pair[0]] = pair[1];
  });
  roomId = paramObj["rid"];
  socket.emit("joinRoom", roomId);
});

//user joined room
socket.on("userJoined", (username) => {
  //TODO alter list of users or user count
});

//user left room
socket.on("userLeft", (username) => {
  //TODO alter list of users or user count
});

$("document").ready(() => {
  //scroll to bottom
  document.getElementById("chat-section").scrollTop = document.getElementById(
    "chat-section"
  ).scrollHeight;

  $(".timesent").each((index, value) => {
    console.log($(value).html());
    $(value).html(new Date(parseInt($(value).html())).toLocaleString());
  });

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
    <div class='timesent'>
    ${new Date(data.time).toLocaleString()}
    </div>
      <div class='message'>
        ${data.message}
      </div>
    </div>
  `);
      } else {
        outputArea.append(`
    <div class='bot-message'>
        <div class='username'>
        ${data.name}
    </div>
    <div class='timesent'>
    ${new Date(data.time).toLocaleString()}
    </div>
      <div class='message'>
        ${data.message}
      </div>
    </div>
  `);
      }
    });
  });
});
