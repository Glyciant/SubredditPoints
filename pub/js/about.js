$(document).ready(function() {
  $("#admin-logos li img").each(function() {
    if ($(this).data("twitch")) {
      $.post("/users/get/twitch", {
        id: $(this).data("twitch")
      }, function(data) {
        $("img[data-twitch='" + data._id + "']").attr("src", data.logo);
      });
    }
  });

  $("#admin-logos li img").hover(function() {
    $("#username").html($(this).data("reddit"));
    $("#description").html($(this).data("bio"));
  }, function() {
    $("#username").html("Hover over the images for a short bio!");
    $("#description").html("Site Admins are /r/Twitch Moderators and Community Helpers.<br />&zwnj;");
  });
});
