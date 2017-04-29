$(document).delegate("#generate-user", "click", function() {
  var username = $("#generate-reddit-name").val(),
      balance = $("#generate-user-balance").val(),
      type = $("#generate-user-type select").val(),
      display_type = $("#generate-user-display-type select").val(),
      bio = $("#generate-user-bio").val();

  if (!bio) {
    bio = null;
  }
  if (!display_type) {
    display_type = null;
  }

  $.post("/users/generate/", {
    username: username,
    balance: balance,
    type: type,
    bio: bio,
    display_type: display_type
  }, function(data) {
    if (data.message == "success") {
      Materialize.toast('The user was added successfully.', 4000);
    }
    else if (data.message == "not_found") {
      Materialize.toast('There is no user on Reddit with that username.', 4000);
    }
    else if (data.message == "exists") {
      Materialize.toast('That user already exists on the database.', 4000);
    }
    else {
      Materialize.toast('An unknown error occurred.', 4000);
    }
  });
});

$(document).delegate("#generate-user-type select", "change", function() {
  if (($("#generate-user-type select").val() == "mod" || $("#generate-user-type select").val() == "helper") && !$("#generate-user-bio").length) {
    $('<div class="col s12 input-field" id="generate-user-display-type"><select><option value="user" selected>User</option><option value="mod">Moderator</option><option value="helper">Community Helper</option><option value="staff">Staff</option><option value="admin">Admin</option><option value="global_mod">Global Moderator</option><option value="ama">AMA Host</option><option value="bot">Bot</option></select><label>Display Type</label></div>').insertAfter("#generate-user-type");
    $('<div class="col s12 input-field"><input id="generate-user-bio" type="text"><label for="generate-user-bio">Bio</label></div>').insertAfter("#generate-user-type");
    $('select').material_select();
  }
  else if (!($("#generate-user-type select").val() == "mod" || $("#generate-user-type select").val() == "helper")) {
    $("#generate-user-display-type").remove();
    $("#generate-user-bio").parent().remove();
  }
});
