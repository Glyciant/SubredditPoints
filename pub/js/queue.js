$(document).delegate("#admin-approve", "click", function() {
  var id = $(this).data("id");

  $.post("/admin/approve/", {
    id: id
  }, function(data) {
    if (data.message == "success") {
      Materialize.toast('The nomination was approved.', 4000);
      $("#nomination-" + id).slideUp();
    }
    else {
      Materialize.toast('An unknown error occurred.', 4000);
    }
  });
});

$(document).delegate("#admin-reject", "click", function() {
  var id = $(this).data("id"),
      mod = $(this).data("username");

  $.post("/admin/reject/", {
    id: id
  }, function(data) {
    if (data.message == "success") {
      Materialize.toast('The nomination was rejected.', 4000);
      $("#nomination-" + id).slideUp();
      $.post("/users/update/balance/relative/", {
        username: data.data.nominee_author.toLowerCase(),
        balance: -1
      }, function(response) {
        var description;
        if (response.data.nominee_type == "post") {
          description = "Nomination from " + data.data.nominator_username + " for post at " + data.data.nominee_post_link + " has been rejected.";
        }
        else {
          description = "Nomination from " + data.data.nominator_username + " for comment at " + data.data.nominee_post_link + data.data.nominee_id + " has been rejected.";
        }
        $.post("/users/update/transaction/", {
          username: response.data.reddit_username,
          difference: -1,
          from: "Admin Team",
          title: "Nomination Rejected",
          description: description,
          mod_note: "Action by " + mod + "."
        });
      });
    }
    else {
      Materialize.toast('An unknown error occurred.', 4000);
    }
  });
});

$(document).delegate("#admin-approve-change", "click", function() {
  var id = $(this).data("id"),
      mod = $(this).data("username");

  $.post("/admin/approve/", {
    id: id
  }, function(data) {
    if (data.message == "success") {
      Materialize.toast('The nomination was approved.', 4000);
      $("#nomination-" + id).slideUp();
      $.post("/users/update/balance/relative/", {
        username: data.data.nominee_author.toLowerCase(),
        balance: 1
      }, function(response) {
        var description;
        if (response.data.nominee_type == "post") {
          description = "Nomination from " + data.data.nominator_username + " for post at " + data.data.nominee_post_link + " has been reapproved.";
        }
        else {
          description = "Nomination from " + data.data.nominator_username + " for comment at " + data.data.nominee_post_link + data.data.nominee_id + " has been reapproved.";
        }
        $.post("/users/update/transaction/", {
          username: response.data.reddit_username,
          difference: 1,
          from: "Admin Team",
          title: "Nomination Reapproved",
          description: description,
          mod_note: "Action by " + mod + "."
        });
      });
    }
    else {
      Materialize.toast('An unknown error occurred.', 4000);
    }
  });
});
