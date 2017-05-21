var config = require('./config'),
  	restler = require('restler'),
    discord = require('discord.js'),
    client = new discord.Client();

var reddit = {
  getFlair: (username) => {
    return new Promise(function(resolve, reject) {
      restler.post('https://www.reddit.com/api/v1/access_token', {
        username: config.reddit.bot.id,
        password: config.reddit.bot.secret,
        data: {
          grant_type: "password",
          username: config.reddit.bot.username,
          password: config.reddit.bot.password,
        }
      }).on("complete", function(data) {
        restler.get('https://oauth.reddit.com/r/Twitch/api/flairlist.json?name=' + username, {
          accessToken: data.access_token
        }).on("complete", function(api) {
          if (api.users[0].user == username) {
            resolve(api.users[0].flair_text);
          }
          else {
            resolve("no_match");
          }
        });
      });
    });
  },
  setFlair: (user, text) => {
    return new Promise(function(resolve, reject) {
      restler.post('https://www.reddit.com/api/v1/access_token', {
        username: config.reddit.bot.id,
        password: config.reddit.bot.secret,
        data: {
          grant_type: "password",
          username: config.reddit.bot.username,
          password: config.reddit.bot.password,
        }
      }).on("complete", function(data) {
        restler.get('https://oauth.reddit.com/r/Twitch/api/flairlist.json?name=' + user.reddit_name, {
          accessToken: data.access_token
        }).on("complete", function(api) {
          if (api.users[0].user.toLowerCase() == user.reddit_name.toLowerCase()) {
            var flair = {
              api_type: "json",
              css_class: "",
              name: user.reddit_name,
              text: text
            };
            if ((api.users[0].flair_text === null || api.users[0].flair_text.length === 0 || api.users[0].flair_text.length === "") && !text) {
              flair.text = "bleedPurple";
            }
            else if (!text) {
              flair.text = api.users[0].flair_text;
            }
            if ((user.display_type === null && user.type == "user") || user.display_type == "user") {
              if (user.balance >= 1) {
                flair.css_class = "bits-1";
              }
              if (user.balance >= 10) {
                flair.css_class = "bits-10";
              }
              if (user.balance >= 25) {
                flair.css_class = "bits-25";
              }
              if (user.balance >= 50) {
                flair.css_class = "bits-50";
              }
              if (user.balance >= 75) {
                flair.css_class = "bits-75";
              }
              if (user.balance >= 100) {
                flair.css_class = "bits-100";
              }
              if (user.balance >= 200) {
                flair.css_class = "bits-200";
              }
              if (user.balance >= 300) {
                flair.css_class = "bits-300";
              }
              if (user.balance >= 400) {
                flair.css_class = "bits-400";
              }
              if (user.balance >= 500) {
                flair.css_class = "bits-500";
              }
              if (user.flair === "broadcaster") {
                flair.css_class = "introflair";
              }
              if (user.flair === "creative") {
                flair.css_class = "creativeflair";
              }
              if (user.flair === "irl") {
                flair.css_class = "irlflair";
              }
              if (user.flair === "music") {
                flair.css_class = "musicflair";
              }
              if (user.flair === "eating") {
                flair.css_class = "eatingflair";
              }
            }
            else {
              if ((user.display_type === null && user.type == "helper") || user.display_type == "helper") {
                flair.css_class = "helperflair";
              }
              if ((user.display_type === null && user.type == "mod") || user.display_type == "mod") {
                flair.css_class = "modflair";
              }
              if ((user.display_type === null && user.type == "ama") || user.display_type == "ama") {
                flair.css_class = "amaflair";
              }
              if ((user.display_type === null && user.type == "bot") || user.display_type == "bot") {
                flair.css_class = "botflair";
              }
              if ((user.display_type === null && user.type == "global_mod") || user.display_type == "global_mod") {
                flair.css_class = "gmodflair";
              }
              if ((user.display_type === null && user.type == "admin") || user.display_type == "admin") {
                flair.css_class = "adminflair";
              }
              if ((user.display_type === null && user.type == "staff") || user.display_type == "staff") {
                flair.css_class = "staffflair";
              }
            }
            restler.post('https://oauth.reddit.com/r/twitch/api/flair', {
              accessToken: data.access_token,
              data: flair
            }).on("complete", function(result) {
              if (result.json.errors.length === 0) {
								resolve({ message: "success" });
              }
              else {
								resolve({ message: "unknown_error" });
							}
            });
          }
          else {
            resolve("no_match");
          }
        });
      });
    });
  },
  setLinkFlair: (link, css, text) => {
    return new Promise(function(resolve, reject) {
      restler.post('https://www.reddit.com/api/v1/access_token', {
        username: config.reddit.bot.id,
        password: config.reddit.bot.secret,
        data: {
          grant_type: "password",
          username: config.reddit.bot.username,
          password: config.reddit.bot.password,
        }
      }).on("complete", function(data) {
        var flair = {
          api_type: "json",
          css_class: css,
          link: link,
          text: text
        };
        restler.post('https://oauth.reddit.com/r/twitch/api/flair', {
          accessToken: data.access_token,
          data: flair
        }).on("complete", function(result) {
          if (result.json.errors.length === 0) {
						resolve({ message: "success" });
          }
          else {
						resolve({ message: "unknown_error" });
					}
        });
      });
    });
  },
  comment: (post, comment) => {
    return new Promise(function(resolve, reject) {
      restler.post('https://www.reddit.com/api/v1/access_token', {
        username: config.reddit.bot.id,
        password: config.reddit.bot.secret,
        data: {
          grant_type: "password",
          username: config.reddit.bot.username,
          password: config.reddit.bot.password,
        }
      }).on("complete", function(data) {
        var submit = {
          api_type: "json",
          text: comment,
          thing_id: post
        };
        restler.post('https://oauth.reddit.com/api/comment', {
          accessToken: data.access_token,
          data: submit
        }).on("complete", function(result) {
          if (result.json.errors.length === 0) {
						resolve({ message: "success" });
          }
          else {
						resolve({ message: "unknown_error" });
					}
        });
      });
    });
  },
  distinguish: (comment) => {
    return new Promise(function(resolve, reject) {
      restler.post('https://www.reddit.com/api/v1/access_token', {
        username: config.reddit.bot.id,
        password: config.reddit.bot.secret,
        data: {
          grant_type: "password",
          username: config.reddit.bot.username,
          password: config.reddit.bot.password,
        }
      }).on("complete", function(data) {
        var submit = {
          api_type: "json",
          id: comment,
          how: "yes"
        };
        restler.post('https://oauth.reddit.com/api/distinguish', {
          accessToken: data.access_token,
          data: submit
        }).on("complete", function(result) {
          if (result.json.errors.length === 0) {
						resolve({ message: "success" });
          }
          else {
						resolve({ message: "unknown_error" });
					}
        });
      });
    });
  },
  remove: (comment) => {
    return new Promise(function(resolve, reject) {
      restler.post('https://www.reddit.com/api/v1/access_token', {
        username: config.reddit.bot.id,
        password: config.reddit.bot.secret,
        data: {
          grant_type: "password",
          username: config.reddit.bot.username,
          password: config.reddit.bot.password,
        }
      }).on("complete", function(data) {
        var submit = {
          api_type: "json",
          id: comment
        };
        restler.post('https://oauth.reddit.com/api/remove', {
          accessToken: data.access_token,
          data: submit
        }).on("complete", function(result) {
          if (result === {}) {
						resolve({ message: "success" });
          }
          else {
						resolve({ message: "unknown_error" });
					}
        });
      });
    });
  },
  report: (post, reason) => {
    return new Promise(function(resolve, reject) {
      restler.post('https://www.reddit.com/api/v1/access_token', {
        username: config.reddit.bot.id,
        password: config.reddit.bot.secret,
        data: {
          grant_type: "password",
          username: config.reddit.bot.username,
          password: config.reddit.bot.password,
        }
      }).on("complete", function(data) {
        var submit = {
          api_type: "json",
          thing_id: post,
          reason: reason
        };
        restler.post('https://oauth.reddit.com/api/report', {
          accessToken: data.access_token,
          data: submit
        }).on("complete", function(result) {
          if (result.json.errors.length === 0) {
						resolve({ message: "success" });
          }
          else {
						resolve({ message: "unknown_error" });
					}
        });
      });
    });
  }
};

var discord = {
  setRole: (user) => {
    return new Promise(function(resolve, reject) {
      if (user && user.discord_id) {
        var keys = Object.keys(config.discord.bot.roles),
            roles = [];
        for (var i in keys) {
          roles.push(config.discord.bot.roles[keys[i]]);
        }
        var guild = client.guilds.get(config.discord.bot.server),
            member = guild.members.get(user.discord_id);
        if (member) {
          member.removeRoles(roles).then(function() {
            roles = [];
            if (user.flair == "broadcaster") {
              roles.push(config.discord.bot.roles["intro"]);
            }
            else if (user.flair == "creative") {
              roles.push(config.discord.bot.roles["creative"]);
            }
            else if (user.flair == "gaming") {
              roles.push(config.discord.bot.roles["gaming"]);
            }
            else if (user.flair == "irl") {
              roles.push(config.discord.bot.roles["irl"]);
            }
            else if (user.flair == "music") {
              roles.push(config.discord.bot.roles["music"]);
            }
            else if (user.flair == "eating") {
              roles.push(config.discord.bot.roles["eating"]);
            }
            else {
              if (user.balance >= 1) {
                roles.push(config.discord.bot.roles["1"]);
              }
              if (user.balance >= 10) {
                roles.push(config.discord.bot.roles["10"]);
              }
              if (user.balance >= 25) {
                roles.push(config.discord.bot.roles["25"]);
              }
              if (user.balance >= 50) {
                roles.push(config.discord.bot.roles["50"]);
              }
              if (user.balance >= 75) {
                roles.push(config.discord.bot.roles["75"]);
              }
              if (user.balance >= 100) {
                roles.push(config.discord.bot.roles["100"]);
              }
              if (user.balance >= 200) {
                roles.push(config.discord.bot.roles["200"]);
              }
              if (user.balance >= 300) {
                roles.push(config.discord.bot.roles["300"]);
              }
              if (user.balance >= 400) {
                roles.push(config.discord.bot.roles["400"]);
              }
              if (user.balance >= 500) {
                roles.push(config.discord.bot.roles["500"]);
              }
            }
            if (user.type == "mod" || user.display_type == "mod") {
              roles.push(config.discord.bot.roles.mods);
            }
            if (user.type == "helper" || user.display_type == "helper") {
              roles.push(config.discord.bot.roles.helpers);
            }
            if (user.type == "staff" || user.display_type == "staff") {
              roles.push(config.discord.bot.roles.staff);
            }
            if (user.type == "admin" || user.display_type == "admin") {
              roles.push(config.discord.bot.roles.admin);
            }
            if (user.type == "global_mod" || user.display_type == "global_mod") {
              roles.push(config.discord.bot.roles.global_mods);
            }
            member.addRoles(roles).then(function() {
              resolve("success");
            }).catch(function(err) {
              discord.setRole(user);
            });
          }).catch(function(err) {
            discord.setRole(user);
          });;
        }
        else {
          resolve("no_server");
        }
      }
      else {
        resolve("not_found");
      }
    });
  },
  clearRoles: (user) => {
    return new Promise(function(resolve, reject) {
      if (user.discord_id) {
        var keys = Object.keys(config.discord.bot.roles),
            roles = [];
        for (var i in keys) {
          roles.push(config.discord.bot.roles[keys[i]]);
        }
        if (client.guilds.get(config.discord.bot.server).members.get(user.discord_id)) {
          client.guilds.get(config.discord.bot.server).members.get(user.discord_id).removeRoles(roles);
          resolve("success");
        }
        else {
          resolve("no_server");
        }
      }
      resolve("not_found");
    });
  }
};

client.login(config.discord.bot.token);

module.exports = {
  reddit: reddit,
  discord: discord
};
