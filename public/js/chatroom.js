var outputArea = $("#chat-output");

$("document").ready(() => {
  $("#user-input-form").on("submit", function (e) {
    e.preventDefault();

    var message = $("#user-input").val();

    outputArea.append(`
    <div class='bot-message'>
      <div class='message'>
        hiii as well
        ${message}
      </div>
    </div>
  `);

    setTimeout(function () {
      outputArea.append(`
      <div class='user-message'>
        <div class='message'>
          Heyloooowww
        </div>
      </div>
    `);
    }, 250);

    $("#user-input").val("");
  });
});
