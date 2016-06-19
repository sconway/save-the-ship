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
var port = process.env.PORT || 1243,
    term;

// Set handlebars as the templating engine
// app.engine('handlebars', exphbs({ defaultLayout: 'main'}));
// app.set('view engine', 'handlebars');

// Disable etag headers on responses
app.disable('etag');

// Connect to our mongo database
// mongoose.connect('mongodb://localhost/react-tweets');
// mongoose.connect('mongodb://scott:root@ds013024.mlab.com:13024/heroku_bpp024hv');

// Create a new ntwitter instance
var twit = new twitter(config.twitter);


// Page Route
// app.get('/page/:page/:skip', routes.page);

// Set /public as our static content dir
app.use("/", express.static(__dirname + "/public"));

// Fire this bitch up (start our server)
var server = http.createServer(app).listen(port, function() {
  console.log('Express server listening on port ' + port);
});



// Index Route
// app.get('/', express.static(__dirname + 'index.html'));
// app.get('/', routes.index);
app.get('/', function(req, res) {

  res.sendFile(path.join(__dirname, 'index.html'));
  // Initialize socket.io
  var io = require('socket.io').listen(server);

  term = req.query.term || 'javascript';

  if (twit.currentTwitStream) {
    twit.currentTwitStream.destroy();
  }

    // Set a stream listener for tweets matching tracking keywords
  twit.stream('statuses/filter',{ track: term}, function(stream){
    // streamHandler(stream,io);
    stream.on('data', function(data) {

      if (data['user'] !== undefined) {

        // Construct a new tweet object
        var tweet = {
          twid: data['id_str'],
          active: false,
          author: data['user']['name'],
          avatar: data['user']['profile_image_url'],
          body: data['text'],
          date: data['created_at'],
          screenname: data['user']['screen_name'],
          tone: checkTweet(data['text'])
        };

        // only send the tweet if it has a keyword
        if (tweet.tone >= 0) {
          io.emit('tweet', tweet);
          console.log("tweet: ", data.text);
        } else {
          console.log("uninteresting tweet");
        }
      }
      
    });

    twit.currentTwitStream = stream;
  });
});


function checkTweet(tweet) {
  var text   = tweet.toLowerCase(),
      isGood = text.indexOf("love") >= 0,
      isBad  = text.indexOf("hate") >= 0,
      isNeutral = isGood && isBad;

  if ( isNeutral ) {
      return 2;
  } else if ( isGood ) {
      return 1;
  }else if ( isBad ) {
      return 0;
  } else {
    return -1;
  }
}





