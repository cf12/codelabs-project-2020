$("document").ready(() => {
  //event listener for delete room
  $(".delete-button").each((index, value) => {
    $(value).on("click", () => {
      console.log("dsffa");
      $.get("/deleteroom", { rid: value.id }, (success) => {
        if (success) {
          window.location.href = window.location.href;
        }
      });
      return false;
    });
  });
});
