$(document).delegate("#get-user-submit", "click", function() {
  var username = $("#reddit-name").val();

  $.post("/users/get/", {
    username: username
  }, function(data) {
    if (data.message == "not_found") {
      Materialize.toast('There was no user found with that name.', 4000);
      $("#user-data").slideUp();
    }
    else if (data.message == "found") {
      $("#user-bio").parent().remove();
      $('#user-display-type').remove();
      $("#user-reddit-id").html(data.data.reddit_id);
      $("#user-reddit-name").html(data.data.reddit_name);
      if (data.data.twitch_id) {
        $("#user-twitch-id").html(data.data.twitch_id);
        $("#user-twitch-name").html(data.data.twitch_name);
      }
      else {
        $("#user-twitch-id").html("-");
        $("#user-twitch-name").html("-");
      }
      if (data.data.discord_id) {
        $("#user-discord-id").html(data.data.discord_id);
        $("#user-discord-name").html(data.data.discord_name);
      }
      else {
        $("#user-discord-id").html("-");
        $("#user-discord-name").html("-");
      }
      $("#user-transactions").html(data.data.transactions.length);
      $("#user-balance").val(data.data.balance);
      $("#user-type select").val(data.data.type);
      if (data.data.display_type) {
        $('<div class="col s12 input-field" id="user-display-type"><select><option value="user" selected>User</option><option value="mod">Moderator</option><option value="helper">Community Helper</option><option value="staff">Staff</option><option value="admin">Admin</option><option value="global_mod">Global Moderator</option><option value="ama">AMA Host</option><option value="bot">Bot</option></select><label>Display Type</label></div>').insertAfter("#user-type");
        $('#user-display-type select').val(data.data.display_type);
      }
      if (data.data.bio) {
        $('<div class="col s12 input-field"><input id="user-bio" type="text" value="' + data.data.bio + '"><label for="user-bio">Bio</label></div>').insertAfter("#user-type");
      }
      $('select').material_select();
      $("#update-user").data("username", data.data.reddit_username);
      Materialize.updateTextFields();
      $("#user-data").slideDown();
    }
    else {
      Materialize.toast('An unknown error occurred.', 4000);
    }
  });
});

$(document).delegate("#update-user", "click", function() {
  var username = $(this).data("username"),
      balance = $("#user-balance").val(),
      type = $("#user-type select").val(),
      display_type = $("#user-display-type select").val(),
      bio = $("#user-bio").val(),
      mod = $(this).data("mod");

  if (!bio) {
    bio = null;
  }
  if (!display_type) {
    display_type = null;
  }

  $.post("/users/update/", {
    username: username,
    balance: balance,
    type: type,
    bio: bio,
    display_type: display_type
  }, function(data) {
    if (data.message == "success") {
      var difference = parseInt(data.data.balance) - parseInt(data.old);
      $.post("/users/update/transaction/", {
        username: username,
        difference: difference,
        from: "Admin Team",
        title: "Manual Change",
        description: "",
        mod_note: "Action by " + mod + "."
      }, function(data) {
        if (data.message == "success") {
          Materialize.toast('The user\'s data has been updated.', 4000);
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

$(document).delegate("#user-type select", "change", function() {
  if (($("#user-type select").val() == "mod" || $("#user-type select").val() == "helper") && !$("#user-bio").length) {
    $('<div class="col s12 input-field" id="user-display-type"><select><option value="user" selected>User</option><option value="mod">Moderator</option><option value="helper">Community Helper</option><option value="staff">Staff</option><option value="admin">Admin</option><option value="global_mod">Global Moderator</option><option value="ama">AMA Host</option><option value="bot">Bot</option></select><label>Display Type</label></div>').insertAfter("#user-type");
    $('<div class="col s12 input-field"><input id="user-bio" type="text"><label for="user-bio">Bio</label></div>').insertAfter("#user-type");
    $('select').material_select();
  }
  else if (!($("#user-type select").val() == "mod" || $("#user-type select").val() == "helper")) {
    $("#user-display-type").remove();
    $("#user-bio").parent().remove();
  }
});
