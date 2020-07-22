var socket = io();

$("document").ready(() => {
  //add room live on room created event
  socket.on("newRoom", (room) => {
    //append room card to room div
    $("#rooms-div")
      .append(`<div class="col-lg-4 col-sm-6 mb-4" id="room-card-${room._id}">
            <div class="card h-100">
            <a href="/chatroom?rid=${room._id}"><img class="card-img-top" src="http://placehold.it/700x400" alt=""></a>
            <div class="card-body">
                <h4 class="card-title">
                <a href="/chatroom?rid=${room._id}">${room.name}</a>
                </h4>
                <p class="card-text">${room.description}</p>
                <p class="card-text">Active users: <span class="user-count">0</span></p>
            </div>
            </div>
    </div>`);
  });

  //increase active user count when a user joins a room
  socket.on("roomJoin", (room) => {
    //get room element
    let roomCard = $(`#room-card-${room.id}`);

    //check if card exists
    if (roomCard) {
      //get user count element
      let userCount = roomCard.find(".user-count");
      userCount.html(room.userCount);
    }
  });

  //decrease active user count when a user leaves a room
  socket.on("roomLeave", (room) => {
    //get room element
    let roomCard = $(`#room-card-${room.id}`);

    //check if card exists
    if (roomCard) {
      //get user count element
      let userCount = roomCard.find(".user-count");
      userCount.html(room.userCount);
    }
  });
});
