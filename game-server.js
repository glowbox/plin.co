var config = require('./config');
var crypto = require('crypto');
var http = require('http');
var path = require('path');
var express = require('express');
var app = express();
var port = Number(process.env.PORT || 5000);
var server = http.createServer(app).listen(port);
var fs = require('fs');
var sys = require('sys');
var bodyParser = require('body-parser');
var knox = require('knox');
var request = require('request');
var redis = require('redis');

var childProcess = require("child_process");

var TMP_GIF_PATH = __dirname + '/tmp/';

var dbClient;
var knoxClient;

var serialData = [];
var pegMap = {};

var uploadFrameQueue = [];


/*
 * Wrapper for console output, muted if config.DEBUG is not enabled.
 */
function debug(args) {
  if(config.DEBUG){
    console.log.call(console, args);
  }
}


// Hopefully this never happens..
process.on('uncaughtException', function (err) {
  if (err.stack.indexOf('png-js') !== -1) {
    console.log(err.stack);
  } else {
    console.error(err.stack);
  }
  // console.log("Node NOT Exiting...");
});


// Start websocket server.
var io = require('socket.io')(server);

// Only use websocket (prevent fallback to XHR polling which I've seen happen
// sometimes for no apparent reason, even when connecting to localhost)
io.set('transports', ['websocket']);
io.on('connection', function(socket) {
  // Stub for socket connections.
  debug('Viewport Connected.');
});


var twitter = require('node-twitter');
var twitterRestClient;
if (process.env.TWITTER_CONSUMER_KEY) {
  twitterRestClient = new twitter.RestClient(
    process.env.TWITTER_CONSUMER_KEY,
    process.env.TWITTER_CONSUMER_TOKEN,
    process.env.TWITTER_ACCESS_TOKEN,
    process.env.TWITTER_ACCESS_TOKEN_SECRET
  );
}

knoxClient = knox.createClient({
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.S3_BUCKET
});

if (!process.env.OFFLINE) {
  // ignore pegmap in offline mode.  
} else {
  for (var i = 0; i < 85; i++) {
    pegMap[i.toString()] = i;
  }
}

if (process.env.SERIAL_PORT) {
  var SerialPort = require("serialport").SerialPort;

  var serialPort = new SerialPort(process.env.SERIAL_PORT, {
    baudrate: process.env.SERIAL_BAUD_RATE
  }, false);

  serialPort.open(function () {
    debug("SERIAL PORT OPENED");
    serialPort.on('data', serialReceived);
  });
}

/* 
 * Event handler for serial data.
 */
function serialReceived(data) {
  var codes = data.toString();
  for(var i = 0; i < codes.length; i++) {
    var pegCode = codes.charCodeAt(i) - 32;
    io.emit('peg', {'pegId': pegMap[pegCode], 'raw': pegCode});
  }
  debug("Peg hit: " + data);
}


if (process.env.REDISCLOUD_URL) {
  var url = require('url');
  var redisURL = url.parse(process.env.REDISCLOUD_URL);
  
  dbClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
  dbClient.auth(redisURL.auth.split(":")[1]);

  dbClient.get('pegMap', function (e, r) {
    if (r) {
      var data = JSON.parse(r);
      pegMap = data['map'];
    }
  });
}

app.use(bodyParser({limit: '50mb'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.set('views', __dirname + '/views');

app.set('view engine', 'html');
app.set('view engine', 'mustache');
app.engine('html', require('hogan-middleware').__express);
app.engine('mustache', require('hogan-middleware').__express);

app.use(express.static(__dirname + '/public'));


/*
 * Default end point to load game.
 */
app.get('/', function(req, res){
  getNextId(function(id){
    res.render('live.mustache', {'js': 'live', 'nextId': id});
  });
});


/*
 * Default end point to load game.
 */
app.get('/calibrate', function(req, res){
  getNextId(function(id){
    res.render('calibrate.mustache', {'js': 'calibrate', 'pegMap': JSON.stringify(pegMap)});
  });
});


/*
 * Default end point to load game.
 */
app.post('/save-calibration', function(req, res){
  var newMap = JSON.parse(req.body.map);
  
  dbClient.set('pegMap', JSON.stringify( {'map': newMap} ), redis.print);
  pegMap = newMap;

  debug("Peg map updated.");

  res.send('thanks.');
});


/*
 * End-point for getting the next available drop id.
 */
app.get('/next-id', function(req, res){
  getNextId( function(id) {
    if(id){
      res.send(id);
    } else {
      res.status(500).send('All out of IDs');
    }
  });
});


/*
 * Debug end-point for creating fake peg hits.
 */
app.post('/peg-hit', function(req, res) {
  serialReceived(String.fromCharCode(pegMap[req.body.peg] + 33));
  return res.send('success!');
});


/*
 * Saves the non-image data for a given drop (peg timings).
 */
app.post('/save-run', function(req, res) {
  
  var dropId = req.body.id;
  var data = req.body.data;

  data = JSON.parse(data);

  // create empty array for tweets..
  data['twitter'] = [];
  data['encoded'] = false;

  // Add the drop
  dbClient.set(dropId, JSON.stringify(data), redis.print);

  // Update the 'last' uid in the id list
  dbClient.get('allIds', function (e, r) {
    if (r) {
      var idData = JSON.parse(r);
      if(idData['ids'].indexOf(dropId) != -1){
        idData['last'] = dropId;
        dbClient.set('allIds', JSON.stringify(idData), redis.print);
      } else {
        console.log("Couldn't find drop ID in the list of all ids: " + dropId);
      }
    }
  });

  return res.send('saved.');
});


/*
 * Post a tweet for a drop.  If the drop is still being encoded,
 * the tweet will occur when encoding is finished.
 */
app.post('/tweet-run', function(req, res) {

  var dropId = req.body.id;
  var userName = req.body.user;

  addTweetToDrop(dropId, userName);

  return res.send('success!');
});


/*
 * Handle image upload.
 */
app.post('/upload', function(req, res) {
  // Parse PNG data and add the frame to the GIF encoder.
  var pngData = req.body.png;
  var pngData = pngData.replace(/^data:image\/\w+;base64,/, "");
  var buffer = new Buffer(pngData, 'base64');
  
  // Store this frame in the current queue of images.
  // Note: If there was ever more than one board connected to the 
  //       server, this could cause problems because the uploadFrameQueue
  //       doesn't keep track of the dropID, this system assumes only one
  //       client at a time.
  uploadFrameQueue.push(buffer);
  debug('Added frame to queue.');

  if(req.body.frame >= req.body.frameCount - 1){
    var encoderItem = {};

    encoderItem.frameCount  = req.body.frameCount;
    encoderItem.id          = req.body.id;
    encoderItem.fps         = req.body.fps;
    encoderItem.width       = req.body.width;
    encoderItem.height      = req.body.height;
    encoderItem.frames      = uploadFrameQueue;
    encoderItem.fileName    = TMP_GIF_PATH + req.body.id + '.gif';

    // Spawn a child process to encode the gif.
    var proc = childProcess.fork("./gif-encoder.js");
    proc.on("message", function(message) {
      if(message.event == "complete"){
        encoderFinished(message.puckId);
      }
    });
    proc.send(encoderItem);
    
    uploadFrameQueue = [];
  }

  res.send('Added Frame to queue!'); 
});

/*
 * Called when a GIF is done being encoded for a drop.
 */
function encoderFinished(puckId){

  dbClient.get(puckId, function (e, r) {
    if (r) {
      var runData = JSON.parse(r);
      runData.encoded = true;
      dbClient.set(puckId, JSON.stringify(runData), redis.print);
    }
  });


  saveGIF(puckId);
  postAllTweetsForDrop(puckId);
}


/*
 * Save a GIF to S3.
 */
function saveGIF(id) {
  var gifName = id + '.gif';
 
  debug("About to upload to S3: " + (TMP_GIF_PATH + gifName));
  
  var stats = fs.statSync(TMP_GIF_PATH + gifName);
  if(stats['size'] == 0){
    debug("ERROR: Gif is zero bytes! file: " + TMP_GIF_PATH + gifName);
    return;
  }
 
  knoxClient.putFile(TMP_GIF_PATH + gifName, gifName, function(err, res){
    debug('File uploaded to S3: ' + gifName);

    if (config.POST_TWEET) {
      postTweet(id, null);
    } 
  });
}


/*
 * Return the next available UID.
 */
function getNextId(_callback) {
  dbClient.get('allIds', function (e, r) {
    if (r) {
      var data = JSON.parse(r);
      var lastIndex = data['ids'].indexOf(data['last']);
      if(lastIndex < data['ids'].length - 1) {
        var nextId = data['ids'][lastIndex + 1];
        _callback(nextId);
      } else {
        _callback(null);
      }
    }
  });
}


/*
 * Add a twitter username to a given dropId.
 * 
 * If the drop GIF is currently being encoded, the tweet will not be 
 * sent out until the encoding is finished.
 */
function addTweetToDrop(dropId, userName) {
  // Save twitter ID into the list for this run.
  dbClient.get(dropId, function (e, r) {
    if (r) {
      var runData = JSON.parse(r);
      if(runData.twitter.indexOf(userName.toLowerCase()) == -1) {
        runData.twitter.push(userName.toLowerCase());
        dbClient.set(dropId, JSON.stringify(runData), redis.print);

        if(runData.encoded) {
          postTweet(dropId, userName);
        }
      } else {
        debug("User is already in the twitter list.");
      }
    } else {
      debug("Unable to add tweet to drop: " + dropId + ", drop not found.");
    }
  });
}


/*
 * Post all tweets for a given drop.
 * Currently only called when the GIF is done encoding.
 */
function postAllTweetsForDrop(dropId){
  dbClient.get(dropId, function (e, r) {
    if (r) {
      var runData = JSON.parse(r);
      for(var i = 0; i < runData.twitter.length; i++){
        postTweet(dropId, runData.twitter[i]);
      }
    }
  });
}


/*
 * Hit the twitter API and post a tweet for a given drop.
 */
function postTweet(puckId, userName){
 
   if (twitterRestClient) {

    var status = 'Another round played at Byte Me 4.0! Check out the replay at http://plin.co/' + puckId;
    
    if (userName != null) {
      status = 'Thanks for playing at Byte Me 4.0, @' + userName + '. Check out the replay at http://plin.co/' + puckId;
    }
    
    twitterRestClient.statusesUpdateWithMedia(
      {
        'status': status,
        'media[]': TMP_GIF_PATH + puckId + '.gif'
      },
      function(error, result) {
        if (error) {
          debug('Error: ' + (error.code ? error.code + ' ' + error.message : error.message));
        }
        if (result) {
          // console.log(result);
        }
      }
    );
  }
}


/*

function getGif(req, res) {
  http.get('http://plin-co.s3.amazonaws.com/' + req.params[0] + '.gif', function(proxyRes) {
    if (proxyRes.statusCode === 200) {
      proxyRes.pipe(res);
    } else {
      return res.render('404.mustache');
    }
  });
}


function getPng(req, res) {
  http.get('http://plin-co.s3.amazonaws.com/' + req.params[0] + '.png', function(proxyRes) {
    if (proxyRes.statusCode === 200) {
      proxyRes.pipe(res);
    } else {
      return res.render('404.mustache');
    }
  });
}
*/
