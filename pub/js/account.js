$(document).delegate("#update-flair", "click", function() {
  if ($(this).data("busy") !== "true") {
    $(this).data("busy", "true");

    var username = $(this).data("username"),
        flair = $("#choose-flair input[type='radio']:checked").attr("id").replace("flair-", ""),
        text = $("#flair-text").val();

    $.post("/users/get/session", { username: username }, function(check) {
      if (check === true) {
        $.post("/users/update/twitchdb/", {
          username: username,
          flair: flair,
          text: text
        }, function(data) {
          if (data.message == "success") {
            $("#update-flair").data("busy", "false");
            Materialize.toast('The settings were updated successfully.', 4000);
          }
          else {
            $("#update-flair").data("busy", "false");
            Materialize.toast('An unknown error occurred.', 4000);
          }
        });
      }
      else {
        $("#update-flair").data("busy", "false");
        Materialize.toast('An unknown error occurred.', 4000);
      }
    });
  }
  else {
    Materialize.toast('You are making requests too quickly.', 4000);
  }
});

$(document).delegate("#group-header", "click", function() {
  var id = $(this).data("id");

  if ($(this).data("selected") == "true") {
    $("#id-field", this).html('<i class="fa fa-chevron-right" aria-hidden="true"></i>');
    $(this).data("selected", "false");
    $(".group-data-" + id).hide();
  }
  else {
    $("#id-field", this).html('<i class="fa fa-chevron-down" aria-hidden="true"></i>');
    $(this).data("selected", "true");
    $(".group-data-" + id).show();
  }
});
