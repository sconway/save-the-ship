// Require our dependencies
var express = require('express'),
  exphbs = require('express-handlebars'),
  http = require('http'),
  mongoose = require('mongoose'),
  twitter = require('twitter'),
  routes = require('./routes'),
  path = require('path'),
  config = require('./config'),
  streamHandler = require('./utils/streamHandler');

// Create an express instance and set a port variable
var app = express();
var port = process.env.PORT || 13024;

// Set handlebars as the templating engine
// app.engine('handlebars', exphbs({ defaultLayout: 'main'}));
// app.set('view engine', 'handlebars');

// Disable etag headers on responses
app.disable('etag');

// Connect to our mongo database
// mongoose.connect('mongodb://localhost/react-tweets');
mongoose.connect('mongodb://scott:root@ds013024.mlab.com:13024/heroku_bpp024hv');

// Create a new ntwitter instance
var twit = new twitter(config.twitter);

// Index Route
// app.get('/', express.static(__dirname + 'index.html'));
// app.get('/', routes.index);
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Page Route
app.get('/page/:page/:skip', routes.page);

// Set /public as our static content dir
app.use("/", express.static(__dirname + "/public"));

// Fire this bitch up (start our server)
var server = http.createServer(app).listen(port, function() {
  console.log('Express server listening on port ' + port);
});

// Initialize socket.io
var io = require('socket.io').listen(server);

// Set a stream listener for tweets matching tracking keywords
twit.stream('statuses/filter',{ track: 'trump'}, function(stream){
  streamHandler(stream,io);
});
