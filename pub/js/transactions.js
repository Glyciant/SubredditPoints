$(document).delegate("#get-transactions", "click", function() {
  var source = $("#search-source select").val(),
      query = $("#search-query").val();

  if (source && query) {
    $.post("/transactions/get/", {
      source: source,
      query: query
    }, function(response) {
      $("#transactions-table").slideUp(function() {
        $("#transactions-table table tbody").html("");
        if (response.message == "success") {
          var data = response.data;
          for (var i in data) {
            if (!data[i].description) {
              data[i].description = "-";
            }
            if (!data[i].mod_note) {
              data[i].mod_note = "-";
            }
            data[i].id = data[i].timestamp;
            data[i].timestamp = new Date(data[i].timestamp);
            $("#transactions-table table tbody").append("<tr><td>" + data[i].id + "</td><td>" + data[i].timestamp.getDate() + "/" + (data[i].timestamp.getMonth() + 1) + "/" + data[i].timestamp.getFullYear() + "</td><td>" + data[i].from + "</td><td>" + data[i].title + "</td><td>" + data[i].description + "</td><td>" + data[i].difference + "</td><td>" + data[i].mod_note + "</td></tr>");
          }
          $("#transactions-table").slideDown();
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
