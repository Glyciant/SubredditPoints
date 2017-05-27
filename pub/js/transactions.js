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
          if (data.length === 1) {
            if (!data[0].description) {
              data[0].description = "-";
            }
            if (!data[0].mod_note) {
              data[0].mod_note = "-";
            }
            data[0].id = data[0].timestamp;
            data[0].timestamp = new Date(data[0].timestamp);
            $("#transactions-table table tbody").append("<tr class='row' style='margin: 10px 0;' style='margin: 10px 0;'><td class='col s2' style='margin: 10px 0;'>" + data[0].id + "</td><td class='col s1' style='margin: 10px 0;'>" + data[0].timestamp.getDate() + "/" + (data[0].timestamp.getMonth() + 1) + "/" + data[0].timestamp.getFullYear() + "</td><td class='col s2' style='margin: 10px 0;'>" + data[0].from + "</td><td class='col s2' style='margin: 10px 0;'>" + data[0].title + "</td><td class='col s1' style='margin: 10px 0;'>" + data[0].description + "</td><td class='col s1' style='margin: 10px 0;'>" + data[0].difference + "</td><td class='col s3' style='margin: 10px 0;'>" + data[0].mod_note + "</td></tr>");
          }
          else {
            for (var i in data) {
              if (data[i].length === 1) {
                if (!data[i][0].description) {
                  data[i][0].description = "-";
                }
                if (!data[i][0].mod_note) {
                  data[i][0].mod_note = "-";
                }
                data[i][0].id = data[i][0].timestamp;
                data[i][0].timestamp = new Date(data[i][0].timestamp);
                $("#transactions-table table tbody").append("<tr class='row' style='margin: 10px 0;'><td class='col s2' style='margin: 10px 0;'>" + data[i][0].id + "</td><td class='col s1' style='margin: 10px 0;'>" + data[i][0].timestamp.getDate() + "/" + (data[i][0].timestamp.getMonth() + 1) + "/" + data[i][0].timestamp.getFullYear() + "</td><td class='col s2' style='margin: 10px 0;'>" + data[i][0].from + "</td><td class='col s2' style='margin: 10px 0;'>" + data[i][0].title + "</td><td class='col s1' style='margin: 10px 0;'>" + data[i][0].description + "</td><td class='col s1' style='margin: 10px 0;'>" + data[i][0].difference + "</td><td class='col s3' style='margin: 10px 0;'>" + data[i][0].mod_note + "</td></tr>");
              }
              else {
                for (var j in data[i]) {
                  if (!data[i][j].description) {
                    data[i][j].description = "-";
                  }
                  if (!data[i][j].mod_note) {
                    data[i][j].mod_note = "-";
                  }
                  data[i][j].id = data[i][j].timestamp;
                  data[i][j].timestamp = new Date(data[i][j].timestamp);
                  if (j == "0") {
                    var difference = 0;
                    for (var k in data[i]) {
                      difference += data[i][k].difference;
                    }
                    $("#transactions-table table tbody").append("<tr id='group-header' data-id='" + data[i][j].id + "' class='row' style='margin: 10px 0;'><td id='id-field' class='col s2' style='margin: 10px 0;'><i class='fa fa-chevron-right' aria-hidden='true'></td><td class='col s1' style='margin: 10px 0;'>" + data[i][j].timestamp.getDate() + "/" + (data[i][j].timestamp.getMonth() + 1) + "/" + data[i][j].timestamp.getFullYear() + "</td><td class='col s2' style='margin: 10px 0;'>" + data[i][j].from + "</td><td class='col s2' style='margin: 10px 0;'>" + data[i][j].title + "</td><td class='col s1' style='margin: 10px 0;'>List of Transactions</td><td class='col s1' style='margin: 10px 0;'>" + difference + "</td><td class='col s3' style='margin: 10px 0;'>-</td></tr>");
                  }
                  $("#transactions-table table tbody").append("<tr class='group-data-" +  data[i][0].id + "' style='display: none;' class='row' style='margin: 10px 0;'><td class='col s2' style='margin: 10px 0;'>" + data[i][j].id + "</td><td class='col s1' style='margin: 10px 0;'>" + data[i][j].timestamp.getDate() + "/" + (data[i][j].timestamp.getMonth() + 1) + "/" + data[i][j].timestamp.getFullYear() + "</td><td class='col s2' style='margin: 10px 0;'>" + data[i][j].from + "</td><td class='col s2' style='margin: 10px 0;'>" + data[i][j].title + "</td><td class='col s1' style='margin: 10px 0;'>" + data[i][j].description + "</td><td class='col s1' style='margin: 10px 0;'>" + data[i][j].difference + "</td><td class='col s3' style='margin: 10px 0;'>" + data[i][j].mod_note + "</td></tr>");
                }
              }
            }
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
