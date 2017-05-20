// Modules
var express = require('express'),
	config = require('./config'),
	helpers = require('./helpers'),
	db = require('./db'),
	bodyParser = require('body-parser'),
	app = express(),
	session = require('express-session'),
	cookieParser = require('cookie-parser'),
	swig = require('swig'),
	restler = require('restler'),
	distance = require('jaro-winkler'),
	stopword = require('stopword'),
	cron = require('node-cron'),
	discord = require('discord.js'),
	client = new discord.Client();

// Express Setup
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/pub'));
app.use(cookieParser());
app.use(session({secret: 'anything', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('view cache', false);
swig.setDefaults({cache: false});

// App Local Variables
app.locals = {
	name: config.app.points,
	github: "https://github.com/Heep123/SubredditPoints/"
};

// Session Local Variables
app.get('*', function(req, res, next) {
	if (req.session.reddit) {
		res.locals.reddit = req.session.reddit;
		db.users.getByRedditId(req.session.reddit.id).then(function(data) {
			if (data) {
				if (data.type == "mod" || data.type == "helper") {
					res.locals.admin = true;
				}
				if (data.type == "mod") {
					res.locals.mod = true;
				}
				if (data.twitch_id) {
					res.locals.twitch = {
						id: data.twitch_id,
						name: data.twitch_name
					};
				}
				if (data.discord_id) {
					res.locals.discord = {
						id: data.discord_id,
						name: data.discord_name
					};
				}
			}
			else {
				req.session.destroy();
			}
			next();
		});
	}
	else {
		next();
	}
});

// Get Index Page
app.get('/', function(req, res) {
  res.render('index', { title: "Home" });
});

app.get('/about/', function(req, res) {
	Promise.all([db.users.getByType("mod"), db.users.getByType("helper")]).then(function(data) {
		res.render('about', { title: "About", mods: data[0], helpers: data[1] });
	});
});

app.get('/faq/', function(req, res) {
  res.render('faq', { title: "FAQ" });
});

app.get('/account/', function(req, res) {
	if (req.session.reddit) {
		db.users.getByRedditUsername(req.session.reddit.name.toLowerCase()).then(function(data) {
			helpers.reddit.getFlair(req.session.reddit.name).then(function(flair) {
				if (data.twitch_id) {
					restler.get('http://www.twitchdb.tv/api/intro/status/' + data.twitch_id).on('complete', function(twitchdb) {
						var intro;
						if (twitchdb.message == "has_intro") {
							intro = twitchdb.intro_status;
						}
						else {
							intro = twitchdb.message;
						}
						res.render('account', { title: "Account", data: data.transactions, balance: data.balance, flair: flair, intro: intro });
					});
				}
				else {
					res.render('account', { title: "Account", data: data.transactions, flair: flair, intro: "no_twitch" });
				}
			});
		});
	}
	else {
		res.redirect("/");
	}
});

app.get('/redeem/', function(req, res) {
	if (req.session.reddit) {
		var title = "Redeem " + app.locals.name;
	  res.render('redeem', { title: title });
	}
	else {
		res.redirect("/");
	}
});

app.get('/admin/', function(req, res) {
	if (res.locals.admin) {
		db.nominations.getAll().then(function(queue) {
			res.render('admin', { title: "Admin Panel", queue: queue });
		});
	}
	else {
		res.redirect("/");
	}
});

app.get('/api/balance/:user/', function(req, res) {
	if (req.params.user) {
		db.users.getByRedditUsername(req.params.user.toLowerCase()).then(function(data) {
			if (data) {
				res.send({
					status: 200,
					id: data.reddit_id,
					username: data.reddit_name,
					balance: data.balance
				});
			}
			else {
				res.send({
					status: 404,
					error: "invalid_user",
					message: "That user does not exist."
				});
			}
		});
	}
	else {
		res.send({
			status: 400,
			error: "bad_request",
			message: "You must specify a username."
		});
	}
});

app.get('/api/balance/', function(req, res) {
	res.send({
		status: 400,
		error: "bad_request",
		message: "You must specify a username."
	});
});

app.get('/api*', function(req, res) {
	res.send({
		status: 404,
		error: "not_found",
		message: "That endpoint does not exist."
	});
});

// Redirect to Reddit authentication page
app.get('/auth/redirect/reddit/', function(req, res) {
	var id = config.reddit.auth.id,
			redirect = config.reddit.auth.redirect,
			scopes = "identity",
			state = Math.random().toString(36).substring(15);

	req.session.reddit_state = state;

	res.redirect("https://www.reddit.com/api/v1/authorize?client_id=" + id + "&response_type=code&state=" + state + "&redirect_uri=" + redirect + "&duration=permanent&scope=" + scopes);
});

// Handle redirect from Reddit authentication page
app.get('/auth/login/reddit/', function(req, res) {
	if (req.query.error != "access_denied") {
		if (req.query.state == req.session.reddit_state) {
			restler.post('https://www.reddit.com/api/v1/access_token', {
				username: config.reddit.auth.id,
				password: config.reddit.auth.secret,
				data: {
					code: req.query.code,
					grant_type: 'authorization_code',
					redirect_uri: config.reddit.auth.redirect
				}
			}).on('complete', function(data) {
				restler.get('https://oauth.reddit.com/api/v1/me', {
					'headers': {
						'User-Agent': 'Subreddit Points',
						'Authorization': 'bearer ' + data.access_token
					}
				}).on('complete', function(finaldata) {
					req.session.reddit_state = "";
					req.session.reddit = {};
					req.session.reddit.id = finaldata.id;
					req.session.reddit.name = finaldata.name;
					req.session.reddit.auth = data.access_token;
					db.users.getByRedditId(req.session.reddit.id).then(function(data) {
						if (!data) {
							var data = {
								reddit_id: req.session.reddit.id,
								reddit_username: req.session.reddit.name.toLowerCase(),
								reddit_name: req.session.reddit.name,
								twitch_id: null,
								twitch_name: null,
								discord_id: null,
								discord_name: null,
								type: "user",
								twitchdb: false,
								bio: null,
								balance: 0,
								display_type: null,
								transactions: [
									{
										timestamp: Date.now(),
										difference: 0,
										from: "System",
										title: "Account Created",
										description: null,
										mod_note: null
									}
								]
							};
							db.users.insert(data).then(function() {
								res.redirect('/account/');
							});
						}
						else {
							res.redirect('/account/');
						}
					});
				});
			});
		}
		else {
			res.render("error", { title: "403 Error", code: "403", message: "An invalid state parameter was returned." });
		}
	}
	else {
		res.render("error", { title: "401 Error", code: "401", message: "Access to your account was denied." });
	}
});

// Redirect to Twitch authentication page
app.get('/auth/redirect/twitch/', function(req, res) {
	var id = config.twitch.auth.id,
			redirect = config.twitch.auth.redirect,
			scopes = "user_read",
			state = Math.random().toString(36).substring(15);

	req.session.twitch_state = state;

	res.redirect("https://api.twitch.tv/kraken/oauth2/authorize?response_type=code&force_verify=true&client_id=" + id + "&state=" + state + "&redirect_uri=" + redirect + "&scope=" + scopes);
});

// Handle redirect from Twitch authentication page
app.get('/auth/login/twitch/', function(req, res) {
	if (req.query.error != "access_denied") {
		if (req.session.reddit) {
			if (req.query.state == req.session.twitch_state) {
				restler.post('https://api.twitch.tv/kraken/oauth2/token', {
					data: {
				    client_id: config.twitch.auth.id,
				    client_secret: config.twitch.auth.secret,
				    grant_type: 'authorization_code',
				    redirect_uri: config.twitch.auth.redirect,
				    code: req.query.code
					}
			  }).on('complete', function(data) {
					restler.get('https://api.twitch.tv/kraken/user?oauth_token=' + data.access_token + "&client_id=" + config.twitch.auth.id, {
						'headers': {
							"Accept": "application/vnd.twitchtv.v5+json"
						}
					}).on('complete', function(finaldata) {
						req.session.twitch_state = "";
						req.session.twitch = {};
						req.session.twitch.id = finaldata._id;
						req.session.twitch.name = finaldata.display_name;
						req.session.twitch.auth = data.access_token;
						db.users.getByRedditId(req.session.reddit.id).then(function(data) {
							if (!data) {
								res.render("error", { title: "400 Error", code: "400", message: "There doesn't appear to be a Reddit account connected." });
							}
							else {
								data.twitch_id = req.session.twitch.id;
								data.twitch_name = req.session.twitch.name;
								db.users.update(data.reddit_id, data).then(function() {
									res.redirect('/account/');
								});
							}
						});
					});
				});
			}
			else {
				res.render("error", { title: "403 Error", code: "403", message: "An invalid state parameter was returned." });
			}
		}
		else {
			res.render("error", { title: "400 Error", code: "400", message: "You are not logged in." });
		}
	}
	else {
		res.render("error", { title: "401 Error", code: "401", message: "Access to your account was denied." });
	}
});

// Handle disconnecting Twitch account
app.get('/auth/disconnect/twitch/', function(req, res) {
	if (req.session.reddit) {
		db.users.getByRedditId(req.session.reddit.id).then(function(data) {
			data.twitch_id = null;
			data.twitch_name = null;
			db.users.update(data.reddit_id, data).then(function() {
				res.redirect('/account/');
			});
		});
	}
	else {
		res.render("error", { title: "400 Error", code: "400", message: "There appears to be no account logged in." });
	}
});

// Redirect to Discord authentication page
app.get('/auth/redirect/discord/', function(req, res) {
	var id = config.discord.auth.id,
			redirect = config.discord.auth.redirect,
			scopes = "identify+guilds",
			state = Math.random().toString(36).substring(15);

	req.session.discord_state = state;

	res.redirect("https://discordapp.com/api/oauth2/authorize?client_id=" + id + "&scope=" + scopes + "&response_type=code&state=" + state);
});

// Handle redirect from Discord authentication page
app.get('/auth/login/discord/', function(req, res) {
	if (req.session.reddit) {
		if (req.query.state == req.session.discord_state) {
			restler.post('https://discordapp.com/api/oauth2/token', {
				data: {
			    client_id: config.discord.auth.id,
			    client_secret: config.discord.auth.secret,
			    grant_type: 'authorization_code',
			    redirect_uri: config.discord.auth.redirect,
			    code: req.query.code
				}
		  }).on('complete', function(data) {
				restler.get('https://discordapp.com/api/users/@me', {
					'headers': {
						'Authorization': "Bearer " + data.access_token
					}
				}).on('complete', function(finaldata) {
					req.session.discord_state = "";
					req.session.discord = {};
					req.session.discord.id = finaldata.id;
					req.session.discord.name = finaldata.username;
					req.session.discord.auth = data.access_token;
					db.users.getByRedditId(req.session.reddit.id).then(function(data) {
						if (!data) {
							res.render("error", { title: "400 Error", code: "400", message: "There doesn't appear to be a Reddit account connected." });
						}
						else {
							data.discord_id = req.session.discord.id;
							data.discord_name = req.session.discord.name;
							helpers.discord.setRole(data).then(function(response) {
								if (response == "success") {
									data.balance = data.balance + 1;
									data.transactions.push({
										timestamp: Date.now(),
										difference: 1,
										from: "System",
										title: "Joined Discord Server",
										description: null,
										mod_note: null
									});
								}
								db.users.update(data.reddit_id, data).then(function() {
									res.redirect('/account/');
								});
							});
						}
					});
				});
			});
		}
		else {
			res.render("error", { title: "403 Error", code: "403", message: "An invalid state parameter was returned." });
		}
	}
	else {
		res.render("error", { title: "400 Error", code: "400", message: "You are not logged in." });
	}
});

// Handle disconnecting Discord account
app.get('/auth/disconnect/discord/', function(req, res) {
	if (req.session.reddit) {
		db.users.getByRedditId(req.session.reddit.id).then(function(data) {
			helpers.discord.clearRoles(data).then(function(response) {
				if (response == "success") {
					data.balance = data.balance - 1;
					data.transactions.push({
						timestamp: Date.now(),
						difference: -1,
						from: "System",
						title: "Left Discord Server",
						description: null,
						mod_note: null
					});
				}
				data.discord_id = null;
				data.discord_name = null;
				db.users.update(data.reddit_id, data).then(function() {
					res.redirect('/account/');
				});
			});
		});
	}
	else {
		res.render("error", { title: "400 Error", code: "400", message: "There appears to be no account logged in." });
	}
});

// Log out
app.get('/auth/logout/', function(req, res) {
	req.session.destroy();
	res.redirect("/");
});

// Get user logged in
app.post('/users/get/session/', function(req, res) {
	if (req.session.reddit) {
		res.send(req.session.reddit.name == req.body.username)
	}
	else {
		res.send("not_found")
	}
});

// Get user from database
app.post('/users/get/', function(req, res) {
	db.users.getByRedditUsername(req.body.username).then(function(data) {
		if (!data) {
			res.send({ message: "not_found" });
		}
		else {
			res.send({ message: "found", data: data });
		}
	});
});

// Get user from Twitch API
app.post('/users/get/twitch/', function(req, res) {
	restler.get("https://api.twitch.tv/kraken/users/" + req.body.id + "?client_id=" + config.twitch.auth.id, {
		'headers': {
			"Accept": "application/vnd.twitchtv.v5+json"
		}
	}).on('complete', function(data) {
		res.send(data);
	});
});

// Get user list
app.post('/users/get/list/', function(req, res) {
	db.users.getAll().then(function(data) {
		var list = [];
		for (var i in data) {
			if (req.body.source == "discord" && !data[i].discord_id) {
				continue;
			}
			if (req.body.field == data[i].type) {
				list.push(data[i]);
			}
			else if (req.body.field.substring(0, 6) == "points") {
				if (parseInt(req.body.field.replace("points-", "")) <= data[i].balance) {
					list.push(data[i])
				}
			}
		}
		if (!list[0]) {
			res.send({ message: "not_found" });
		}
		else {
			res.send({ message: "success", data: list })
		}
	});
});

// Update user
app.post('/users/update/', function(req, res) {
	db.users.getByRedditUsername(req.body.username).then(function(data) {
		if (!data) {
			res.send({ message: "not_found" });
		}
		else {
			var old = data.balance;
			data.balance = parseInt(req.body.balance);
			data.type = req.body.type;
			data.bio = req.body.bio;
			data.display_type = req.body.display_type;
			db.users.update(data.reddit_id, data).then(function() {
				Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function(response) {
					res.send({ message: "success", data: data, old: old });
				});
			});
		}
	});
});

// Update user for TwitchDB
app.post('/users/update/twitchdb/', function(req, res) {
	db.users.getByRedditUsername(req.body.username).then(function(data) {
		if (!data) {
			res.send({ message: "not_found" });
		}
		else {
			data.twitchdb = (req.body.twitchdb == "true");
			db.users.update(data.reddit_id, data).then(function() {
				Promise.all([helpers.reddit.setFlair(data, req.body.text), helpers.discord.setRole(data)]).then(function(response) {
					res.send({ message: "success", data: data });
				});
			});
		}
	});
});

// Update user's balance with addition/subtraction
app.post('/users/update/balance/relative/', function(req, res) {
	db.users.getByRedditUsername(req.body.username).then(function(data) {
		if (!data) {
			res.send({ message: "not_found" });
		}
		else {
			data.balance = data.balance + parseInt(req.body.balance);
			db.users.update(data.reddit_id, data).then(function() {
				Promise.all([helpers.reddit.setFlair(data), helpers.discord.setRole(data)]).then(function(response) {
					res.send({ message: "success", data: data });
				});
			});
		}
	});
});

// Generate user
app.post('/users/generate/', function(req, res) {
	db.users.getByRedditUsername(req.body.username.toLowerCase()).then(function(data) {
		if (data) {
			res.send({ message: "exists" });
		}
		else {
			restler.get('https://www.reddit.com/user/' + req.body.username + '/about/.json').on("complete", function(account) {
				if (account.data) {
					var data = {
						reddit_id: account.data.id,
						reddit_username: account.data.name.toLowerCase(),
						reddit_name: account.data.name,
						twitch_id: null,
						twitch_name: null,
						discord_id: null,
						discord_name: null,
						type: req.body.type,
						bio: req.body.bio,
						balance: parseInt(req.body.balance),
						display_type: req.body.display_type,
						transactions: [
							{
								timestamp: Date.now(),
								difference: parseInt(req.body.balance),
								from: "System",
								title: "Account Created",
								description: null,
								mod_note: null
							}
						]
					};
					db.users.insert(data).then(function() {
						helpers.reddit.setFlair(data).then(function() {
							res.send({ message: "success" });
						});
						res.send({ message: "success" });
					});
				}
				else {
					res.send({ message: "not_found" });
				}
			});
		}
	});
});

// Add transaction record for user
app.post('/users/update/transaction/', function(req, res) {
	if (parseInt(req.body.difference) !== 0) {
		db.users.getByRedditUsername(req.body.username).then(function(data) {
			if (!data) {
				res.send({ message: "not_found" });
			}
			else {
				data.transactions.push({
					timestamp: Date.now(),
					difference: parseInt(req.body.difference),
					from: req.body.from,
					title: req.body.title,
					description: req.body.description,
					mod_note: req.body.mod_note
				}),
				db.users.update(data.reddit_id, data).then(function() {
					res.send({ message: "success" });
				});
			}
		});
	}
	else {
		res.send({ message: "success" });
	}
});

// Get transactions
app.post('/transactions/get/', function(req, res) {
	var list = [];
	if (req.body.source == "id") {
		db.users.getAll().then(function(data) {
			for (var i in data) {
				for (var j in data[i].transactions) {
					if (data[i].transactions[j].timestamp.toString() == req.body.query.toString()) {
						list.push(data[i].transactions[j]);
					}
				}
			}
			if (!list[0]) {
				res.send({ message: "not_found" });
			}
			else {
				res.send({ message: "success", data: list });
			}
		});
	}
	else if (req.body.source == "reddit") {
		db.users.getByRedditUsername(req.body.query.toLowerCase()).then(function(data) {
			if (data) {
				for (var i in data.transactions) {
					list.push(data.transactions[i]);
				}
			}
			if (!list[0]) {
				res.send({ message: "not_found" });
			}
			else {
				res.send({ message: "success", data: list });
			}
		});
	}
	else if (req.body.source == "discord") {
		db.users.getByDiscordId(req.body.query).then(function(data) {
			if (data) {
				for (var i in data.transactions) {
					list.push(data.transactions[i]);
				}
			}
			if (!list[0]) {
				res.send({ message: "not_found" });
			}
			else {
				res.send({ message: "success", data: list });
			}
		});
	}
	else {
		res.send({ message: "unknown" });
	}
});

// Approve Nomination
app.post('/admin/approve/', function(req, res) {
	db.nominations.getByNominationId(parseInt(req.body.id)).then(function(data) {
		if (!data) {
			res.send({ message: "not_found" });
		}
		else {
			data.status = "approved";
			db.nominations.update(data.nomination_id, data).then(function() {
				res.send({ message: "success", data: data });
			});
		}
	});
});

// Reject Nomination
app.post('/admin/reject/', function(req, res) {
	db.nominations.getByNominationId(parseInt(req.body.id)).then(function(data) {
		if (!data) {
			res.send({ message: "not_found" });
		}
		else {
			data.status = "rejected";
			db.nominations.update(data.nomination_id, data).then(function() {
				res.send({ message: "success", data: data });
			});
		}
	});
});

// 404 error
app.get('*', function(req, res, next) {
	res.render('error', { title: "404 Error", code: "404", message: "That page was not found." });
});

// Check for users joining/leaving Discord
client.on("guildMemberAdd", function(user) {
	if (user.guild.id == config.discord.bot.server) {
		db.users.getByDiscordId(user.user.id).then(function(data) {
			if (data) {
				helpers.discord.setRole(data).then(function() {
					data.balance = data.balance + 1;
					data.transactions.push({
						timestamp: Date.now(),
						difference: 1,
						from: "System",
						title: "Joined Discord Server",
						description: null,
						mod_note: null
					});
					Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function(response) {
						db.users.update(data.reddit_id, data);
					});
				});
			}
		});
	}
});

client.on("guildMemberRemove", function(user) {
	if (user.guild.id == config.discord.bot.server) {
		db.users.getByDiscordId(user.user.id).then(function(data) {
			if (data) {
				data.balance = data.balance - 1;
				data.transactions.push({
					timestamp: Date.now(),
					difference: -1,
					from: "System",
					title: "Left Discord Server",
					description: null,
					mod_note: null
				});
				Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function(response) {
					db.users.update(data.reddit_id, data);
				});
			}
		});
	}
});

client.login(config.discord.bot.token);

// Check Reddit API for nominations
var last_comment;
cron.schedule('*/3 * * * * *', function() {
	restler.get('https://www.reddit.com/r/Twitch/comments.json?limit=1').on("complete", function(data) {
		if (!last_comment) {
			last_comment = data.data.children[0].data.id;
		}
		if (last_comment != data.data.children[0].data.id) {
			last_comment = data.data.children[0].data.id;
			if (data.data.children[0].data.body.split(" ")[0] == "!nominate") {
				db.nominations.getByNominatorId(data.data.children[0].data.id).then(function(exists) {
					if (!exists) {
						var nomination = {
							nomination_id: Date.now(),
							nominator_id: data.data.children[0].data.id,
							nominator_username: data.data.children[0].data.author,
							status: "pending"
						};
						if (data.data.children[0].data.parent_id.substring(0, 3) == "t1_") {
							var url = data.data.children[0].data.link_url.toString() + data.data.children[0].data.parent_id.replace("t1_", "").toString() + ".json";
							restler.get(url).on("complete", function(parent) {
								nomination.nominee_type = "comment";
								nomination.nominee_post_id = parent[0].data.children[0].data.id;
								nomination.nominee_post_link = parent[0].data.children[0].data.url;
								nomination.nominee_post_title = parent[0].data.children[0].data.title;
								nomination.nominee_id = parent[1].data.children[0].data.id;
								nomination.nominee_author = parent[1].data.children[0].data.author;
								if (nomination.nominee_author != nomination.nominator_username) {
									db.nominations.getByNomineeId(nomination.nominee_id).then(function(exists) {
										if (!exists) {
											db.users.getByRedditUsername(nomination.nominee_author).then(function(data) {
												if (!data) {
													restler.get('https://www.reddit.com/user/' + nomination.nominee_author + "/about.json").on('complete', function(account) {
														var data = {
															reddit_id: account.data.id,
															reddit_username: account.data.name.toLowerCase(),
															reddit_name: account.data.name,
															twitch_id: null,
															twitch_name: null,
															discord_id: null,
															discord_name: null,
															type: "user",
															twitchdb: false,
															bio: null,
															balance: 1,
															display_type: null,
															transactions: [
																{
																	timestamp: Date.now(),
																	difference: 1,
																	from: nomination.nominator_username,
																	title: "Comment Nomination",
																	description: "Nomination from " + nomination.nominator_username + " for comment at " + url.replace(".json",""),
																	mod_note: null
																},
																{
																	timestamp: Date.now(),
																	difference: 0,
																	from: "System",
																	title: "Account Created",
																	description: null,
																	mod_note: null
																}
															]
														};
														db.users.insert(data).then(function() {
															db.nominations.insert(nomination);
														});
													});
												}
												else {
													data.balance = data.balance + 1;
													data.transactions.push({
														timestamp: Date.now(),
														difference: 1,
														from: nomination.nominator_username,
														title: "Comment Nomination",
														description: "Nomination from " + nomination.nominator_username + " for comment at " + url.replace(".json",""),
														mod_note: null
													});
													Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function(response) {
														db.users.update(data.reddit_id, data).then(function() {
															db.nominations.insert(nomination);
														});
													});
												}
											});
										}
									});
								}
							});
						}
						else if (data.data.children[0].data.parent_id.substring(0, 3) == "t3_") {
							var url = data.data.children[0].data.link_url.toString() + ".json";
							restler.get(url).on("complete", function(parent) {
								nomination.nominee_type = "post";
								nomination.nominee_id = parent[0].data.children[0].data.id;
								nomination.nominee_post_link = parent[0].data.children[0].data.url;
								nomination.nominee_post_title = parent[0].data.children[0].data.title;
								nomination.nominee_author = parent[0].data.children[0].data.author;
								if (nomination.nominee_author != nomination.nominator_username) {
									db.nominations.getByNomineeId(nomination.nominee_id).then(function(exists) {
										if (!exists) {
											db.users.getByRedditUsername(nomination.nominee_author).then(function(data) {
												if (!data) {
													restler.get('https://www.reddit.com/user/' + nomination.nominee_author + "/about.json").on('complete', function(account) {
														var data = {
															reddit_id: account.data.id,
															reddit_username: account.data.name.toLowerCase(),
															reddit_name: account.data.name,
															twitch_id: null,
															twitch_name: null,
															discord_id: null,
															discord_name: null,
															type: "user",
															twitchdb: false,
															bio: null,
															balance: 1,
															display_type: null,
															transactions: [
																{
																	timestamp: Date.now(),
																	difference: 1,
																	from: nomination.nominator_username,
																	title: "Post Nomination",
																	description: "Nomination from " + nomination.nominator_username + " for post at " + url.replace(".json",""),
																	mod_note: null
																},
																{
																	timestamp: Date.now(),
																	difference: 0,
																	from: "System",
																	title: "Account Created",
																	description: null,
																	mod_note: null
																}
															]
														};
														Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function(response) {
															db.users.insert(data).then(function() {
																db.nominations.insert(nomination);
															});
														});
													});
												}
												else {
													data.balance = data.balance + 1;
													data.transactions.push({
														timestamp: Date.now(),
														difference: 1,
														from: nomination.nominator_username,
														title: "Post Nomination",
														description: "Nomination from " + nomination.nominator_username + " for post at " + url.replace(".json",""),
														mod_note: null
													});
													Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function(response) {
														db.users.update(data.reddit_id, data).then(function() {
															db.nominations.insert(nomination);
														});
													});
												}
											});
										}
									});
								}
								if (parent[0].data.children[0].data.link_flair_css_class == "question") {
									helpers.reddit.setLinkFlair("t3_" + parent[0].data.children[0].data.id, "question-resolved", "Question [Resolved]");
								}
								if (parent[0].data.children[0].data.link_flair_css_class == "techsupport") {
									helpers.reddit.setLinkFlair("t3_" + parent[0].data.children[0].data.id, "techsupport-resolved", "Tech Support [Resolved]");
								}
								if (parent[0].data.children[0].data.link_flair_css_class == "bug") {
									helpers.reddit.setLinkFlair("t3_" + parent[0].data.children[0].data.id, "bug-resolved", "Bug Report [Resolved]");
								}
							});
						}
					}
				});
			}
			var title = data.data.children[0].data.link_title.split(" ");
			if ((title[0] == "Bi-Weekly" && title[1] == "Creative" && title[2] == "Contest") || (title[0] == "Clip" && title[1] == "Contest!")) {
				if (data.data.children[0].data.parent_id.substring(0, 3) == "t3_") {
					var url = data.data.children[0].data.link_url.toString() + data.data.children[0].data.parent_id.replace("t3_", "").toString() + ".json";
					restler.get(url).on("complete", function(parent) {
						if (parent[0].data.children[0].data.distinguished == "moderator") {
							db.users.getByRedditUsername(data.data.children[0].data.author.toLowerCase()).then(function(response) {
								if (response) {
									response.balance = response.balance + 1;
									response.transactions.push({
										timestamp: Date.now(),
										difference: 1,
										from: "System",
										title: "Contest Submission",
										description: "Contest submission at " + url.replace(".json",""),
										mod_note: null
									});
									Promise.all([helpers.reddit.setFlair(response, null), helpers.discord.setRole(response)]).then(function() {
										db.users.update(response.reddit_id, response);
									});
								}
								else {
									restler.get('https://www.reddit.com/user/' + data.data.children[0].data.author + "/about.json").on('complete', function(account) {
										var data = {
											reddit_id: account.data.id,
											reddit_username: account.data.name.toLowerCase(),
											reddit_name: account.data.name,
											twitch_id: null,
											twitch_name: null,
											discord_id: null,
											discord_name: null,
											type: "user",
											twitchdb: false,
											bio: null,
											balance: 1,
											display_type: null,
											transactions: [
												{
													timestamp: Date.now(),
													difference: 1,
													from: "System",
													title: "Contest Submission",
													description: "Contest submission at " + url.replace(".json",""),
													mod_note: null
												},
												{
													timestamp: Date.now(),
													difference: 0,
													from: "System",
													title: "Account Created",
													description: null,
													mod_note: null
												}
											]
										};
										Promise.all([helpers.reddit.setFlair(data, null), helpers.discord.setRole(data)]).then(function() {
											db.users.insert(data);
										});
									});
								}
							});
						}
					});
				}
			}
		}
	});
});

// Check Reddit API for new posts
var processed = [];
cron.schedule('*/3 * * * * *', function() {
	restler.get('https://www.reddit.com/r/Twitch/new.json?limit=1').on("complete", function(data) {
		if (processed.indexOf(data.data.children[0].data.id) === -1) {
			processed.push(data.data.children[0].data.id);
			restler.get(data.data.children[0].data.url + ".json").on("complete", function(exists) {
				if (exists) {
					for (var k in exists[1].data.children) {
						if (exists[1].data.children[k].data.author == config.reddit.bot.username) {
							return;
						}
					}
					db.users.getByRedditUsername(data.data.children[0].data.author.toLowerCase()).then(function(user) {
						if (!user || user.type == "user") {
							var re = new RegExp(" ", "g"),
									title = data.data.children[0].data.title.replace(re, "+");
							restler.get('https://www.reddit.com/r/Twitch/search.json?q=' + title + '&restrict_sr=on&limit=100&sort=new&t=all').on("complete", function(search) {
								if (search.data && search.data.children) {
									var results = search.data.children,
											j = 0,
											posts = [],
											links = [];
									for (var m in results) {
										if (data.data.children[0].data.id != results[m].data.id) {
											var difference = distance(stopword.removeStopwords(data.data.children[0].data.title.replace(/[^\w\s]/gi, '').split(" ")).join(" "), stopword.removeStopwords(results[m].data.title.replace(/[^\w\s]/gi, '').split(" ")).join(" "), { caseSensitive: false });
											if (difference >= 0.6) {
												posts.push({ title: results[m].data.title, link: results[m].data.url, distance: difference });
											}
										}
									}
									if (posts.length > 0) {
										posts.sort(function(a, b) {
										  return parseFloat(a.distance) - parseFloat(b.distance);
										});
										posts.reverse();
										for (var i in posts) {
											if (j > 4) {
												break;
											}
											j++;
											links.push({ title: posts[i].title, link: posts[i].link });
										}
										var comment = `Greetings ` + data.data.children[0].data.author + `,

As part of an attempt to cut back on the number of repetitive threads on /r/Twitch, we are trying to provide a short list of posts from Reddit's search function that may help you. The search found the following results for you:

`
										for (var i in links) {
											comment = comment + `- [` + links[i].title + `](` + links[i].link + `)
`
										}
										comment = comment + `
We hope these links will be helpful. If so, consider deleting your post to reduce spam on the subreddit. If the suggested links are irrelvant to your question, feel free to ignore this comment and continue as you were.

*I'm a bot and this action was performed automatically. If you have any questions or concerns, please contact the subreddit moderators via [modmail](https://www.reddit.com/message/compose?to=%2Fr%2FTwitch).*`
										helpers.reddit.comment("t3_" + data.data.children[0].data.id, comment).then(function() {
											restler.get('https://www.reddit.com/user/' + config.reddit.bot.username  + "/comments.json?limit=1&sort=new").on('complete', function(account) {
												helpers.reddit.distinguish("t1_" + account.data.children[0].data.id).then(function() {
													helpers.reddit.report("t3_" + data.data.children[0].data.id, "Possible Repetitive Thread").then(function() {
														helpers.reddit.remove("t1_" + account.data.children[0].data.id);
													});
												});
											});
										});
									}
								}
							});
						}
					});
				}
			});
		}
	});
});

function getCommunityStreams(offset)	{
	restler.get("https://api.twitch.tv/kraken/streams?limit=100&offset=" + offset + "&community_id=" + config.twitch.community + "&client_id=" + config.twitch.auth.id, {
		'headers': {
			"Accept": "application/vnd.twitchtv.v5+json"
		}
	}).on("complete", function(data) {
		var ids = [];
    for (var i in data.streams) {
			ids.push(data.streams[i].channel._id);
		}
		db.updateByTwitchId(ids, 0, data.streams.length);
		offset += 100;
    if (data._total > offset) {
      getCommunityStreams(offset);
    }
  });
}

cron.schedule('0 */15 * * * *', function() {
	getCommunityStreams(0);
});

var server = app.listen(config.app.port, function() {
	console.log('[DASHBOARD] Listening on: ' + config.app.port);
});
