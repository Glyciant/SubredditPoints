$(document).delegate("#update-flair", "click", function() {
  var username = $(this).data("username"),
      twitchdb = $("#twitchdb").prop("checked"),
      text = $("#flair-text").val();

  $.post("/users/get/session", { username: username }, function(check) {
    if (check === true) {
      $.post("/users/update/twitchdb/", {
        username: username,
        twitchdb: twitchdb,
        text: text
      }, function(data) {
        if (data.message == "success") {
          Materialize.toast('The settings were updated successfully.', 4000);
        }
        else {
          Materialize.toast('An unknown error occurred.', 4000);
        }
      });
    }
    else {
      Materialize.toast('An unknown error occurred.', 4000);
    }
  });
});
