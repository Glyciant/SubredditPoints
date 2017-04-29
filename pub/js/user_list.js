$(document).delegate("#get-user-list", "click", function() {
  var source = $("#user-list-source select").val(),
      field = $("#user-list-field select").val();

  if (source && field) {
    $.post("/users/get/list/", {
      source: source,
      field: field
    }, function(response) {
      $("#user-list-table").slideUp(function() {
        $("#user-list-table table tbody").html("");
        if (response.message == "success") {
          var data = response.data;
          for (var i in data) {
            if (!data[i].twitch_name) {
              data[i].twitch_name = "-";
            }
            if (!data[i].discord_name) {
              data[i].discord_name = "-";
            }
            $("#user-list-table table tbody").append("<tr><td>" + data[i].reddit_name + "</td><td>" + data[i].twitch_name + "</td><td title='" + data[i].discord_id + "'>" + data[i].discord_name + "</td><td>" + data[i].balance + "</td><td style='text-transform: capitalize;'>" + data[i].type.replace("global_mod", "Global Mod") + "</td></tr>");
          }
          $("#user-list-table").slideDown();
        }
        else if (response.message == "not_found") {
          Materialize.toast('There were no results found.', 4000);
        }
      });
    });
  }
  else {
    Materialize.toast('You have not completed all the fields.', 4000);
  }
});

$(document).delegate("#user-list-source", "change", function() {
  if ($("#user-list-source select").val() == "discord") {
    $("#user-list-field select option[value=\"ama\"]").remove();
    $("#user-list-field select option[value=\"bot\"]").remove();
  }
  else {
    $('<option value="ama">AMA Host</option>').insertAfter('#user-list-field select option[value="global_mod"]');
    $('<option value="bot">Bot</option>').insertAfter('#user-list-field select option[value="ama"]');
  }
  $("#user-list-field select").val("user");
  $('select').material_select();
});
