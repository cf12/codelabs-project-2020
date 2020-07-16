var socket = io();

socket.on("newRoom", (room) => {
  console.log("new room");
  $("#rooms-div").append(`<div class="col-lg-4 col-sm-6 mb-4">
            <div class="card h-100">
            <a href="/chatroom?rid=${room.id}>"><img class="card-img-top" src="http://placehold.it/700x400" alt=""></a>
            <div class="card-body">
                <h4 class="card-title">
                <a href="/chatroom?rid=${room.id}>">${room.name}</a>
                </h4>
                <p class="card-text">${room.description}</p>
            </div>
            </div>
    </div>`);
});
