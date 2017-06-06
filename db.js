var mongodb = require('mongodb').MongoClient,
    ObjectID = require('mongodb').ObjectID,
    helpers = require('./helpers'),
    assert = require('assert'),
    url = "mongodb://localhost:27017/subredditpoints";

function updateByTwitchId(ids, index, total) {
  mongodb.connect(url, function(err, db) {
    assert.equal(null, err);
    if (ids[index]) {
      db.collection("users").findOne({ twitch_id: ids[index].toString() }, function(err, data) {
        if (data) {
          data.transactions.push({
            timestamp: Date.now(),
            difference: 0.25,
            from: "System",
            title: "Streaming to Community",
            description: null,
            mod_note: null
          });
          data.balance = parseFloat(data.balance) + 0.25;
          db.collection("users").updateOne({ twitch_id: ids[index].toString() }, { $inc: { balance: 0.25 }, $set: { transactions: data.transactions } }, function(err, result) {
            Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function(response) {
              assert.equal(null, err);
              db.close();
              if (index < total - 1) {
                updateByTwitchId(ids, index + 1, total);
              }
            });
  				});
        }
        else {
          updateByTwitchId(ids, index + 1, total);
        }
      });
    }
  });
}

var users = {
  insert: (object) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").insertOne(object, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  update: (id, object) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").updateOne({ reddit_id: id }, object, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  delete: (id) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").deleteOne({ reddit_id: id }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByRedditId: (id) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").findOne({ reddit_id: id }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByRedditUsername: (name) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").findOne({ reddit_username: name.toLowerCase() }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByRedditName: (name) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").findOne({ reddit_name: name }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByDiscordId: (id) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").findOne({ discord_id: id }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByType: (type) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").find({ type: type }, function(err, result) {
          result.toArray().then(function(arrayResult) {
            assert.equal(null, err);
            db.close();
            if (arrayResult) {
              resolve(arrayResult);
            }
            else {
              resolve(null);
            }
          });
        });
      });
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("users").find({}, function(err, result) {
          result.toArray().then(function(arrayResult) {
            assert.equal(null, err);
            db.close();
            if (arrayResult) {
              resolve(arrayResult);
            }
            else {
              resolve(null);
            }
          });
        });
      });
    });
  }
};

var nominations = {
  insert: (object) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").insertOne(object, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  update: (id, object) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").updateOne({ nomination_id: id }, object, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  delete: (id) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").deleteOne({ nomination_id: id }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByNominationId: (id) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").findOne({ nomination_id: id }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByNominatorId: (id) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").findOne({ nominator_id: id }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByNomineeId: (id) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").findOne({ nominee_id: id }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getByStatus: (status) => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").findOne({ status: status }, function(err, result) {
          assert.equal(null, err);
          db.close();
          if (result) {
            resolve(result);
          }
          else {
            resolve(null);
          }
        });
      });
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      mongodb.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection("nominations").find({}, function(err, result) {
          result.toArray().then(function(arrayResult) {
            assert.equal(null, err);
            db.close();
            if (arrayResult) {
              resolve(arrayResult);
            }
            else {
              resolve(null);
            }
          });
        });
      });
    });
  }
};

module.exports = {
  users: users,
  nominations: nominations,
  updateByTwitchId: updateByTwitchId
};
