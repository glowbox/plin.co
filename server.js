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
var exec = require('child_process').exec;
var markdown = require( "markdown" ).markdown;
var client;
var bodyParser = require('body-parser');
var knox = require('knox');
var request = require('request')

var io = require('socket.io')(server);
var sockets = [];
io.on('connection', function(socket){
  if (config.DEBUG) console.log('CONNECTED!');
  sockets.push(socket);
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

var images = {};
var allIds = [];
var nextId;
var serialData = [];

var knoxClient = knox.createClient({
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.S3_BUCKET
});

// var SerialPort = require("serialport").SerialPort
// var serialPort = new SerialPort("/dev/tty-usbserial1", {
//   baudrate: 9600
// }, false); // this is the openImmediately flag [default is true]

// serialPort.open(function () {
//   serialPort.on('data', serialReceived);
// });

if (process.env.REDISCLOUD_URL) {
  var redis = require('redis');
  var url = require('url');
  var redisURL = url.parse(process.env.REDISCLOUD_URL);
  client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
  client.auth(redisURL.auth.split(":")[1]);

  client.get('allIds', function (e, r) {
    if (r) {
      var data = JSON.parse(r);
      allIds = data['ids'];
      nextId = data['ids'].indexOf(data['last']) + 1;
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

app.get('/', function(req, res){
  return res.render('home.mustache');
});

app.get('/live/test/', function(req, res){
  serialFakeTest();
  return res.render('home.mustache', {'live': true, 'id': allIds[nextId]});
});



function postTweet(tempId, gifName, path) {
  if (twitterRestClient) {
    twitterRestClient.statusesUpdateWithMedia(
      {
        'status': 'Thanks for playing, @thisisjohnbrown. Check out your run at http://plin.co/' + allIds[nextId] + '!',
        'media[]': __dirname + '/tmp/' + gifName
      },
      function(error, result) {
        if (error) {
          if (config.DEBUG) console.log('Error: ' + (error.code ? error.code + ' ' + error.message : error.message));
        }
        if (result) {
          // console.log(result);
        }

        removeGifFiles(tempId, gifName, path);

        // fs.unlinkSync(__dirname + '/tmp/' + gifName);
      }
    );
  }
}

function removeGifFiles(tempId, gifName, path) {
  if (!config.KEEP_GIFS) {
    var files = fs.readdirSync(path);
    files.forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
            deleteFolderRecursive(curPath);
        } else { // delete file
            fs.unlinkSync(curPath);
        }
    });
    fs.rmdirSync(path);
    fs.unlinkSync(__dirname + '/tmp/' + tempId + '.gif');
  }
}

app.post('/upload/', function(req, res) {
  // fs.exists('tmp/' + allIds[nextId] + '/', function (exists) {
  //   if (!exists) {
  //     fs.mkdir('tmp/' + allIds[nextId] + '/');
  //   }
  // });
  if (req.body.type === 'done') {
    var tempId = allIds[nextId];
    var gifName = allIds[nextId] + '.gif';
    var path = __dirname + '/tmp/' + tempId;
    exec(config.CONVERT + ' -delay ' + req.body.fps + ' -loop 0 -background black -layers Optimize -dispose previous ' + __dirname + '/tmp/' + allIds[nextId] + '/*.png ' + __dirname + '/tmp/' + gifName, function(error, stdout, stderr) {
      knoxClient.putFile(__dirname + '/tmp/' + gifName, gifName, function(err, res){

        if (config.POST_TWEET) {
          postTweet(tempId, gifName, path)
        } else {
          removeGifFiles(tempId, gifName, path);
        }

        ++nextId;
        if (config.DEBUG) console.log('Ready data for: ' + allIds[nextId]);
      });
    });

  } else {
    var data = req.body.png.replace(/^data:image\/\w+;base64,/, "");
    var buf = new Buffer(data, 'base64');
    var s = "000" + req.body.num;
    if (config.DEBUG) console.log('Saving file: ' + s.substr(s.length-3));
    fs.writeFile('tmp/' + allIds[nextId] + '/' + s.substr(s.length-3) + '.png', buf);
  }
  return res.send('success!');
});

app.get(/^\/([a-z]{3})$/, function(req, res) {
  var id = req.params[0];
  client.get(id, function (e, r) {
    if (r) {
      var data = JSON.parse(r);
      return res.render('home.mustache', {id: id, run: data.runs[0]});
    } else {
      return res.render('404.mustache');
    }
  });
  // return res.render('home.mustache', {id: req.params[0]});
});

app.get(/^\/([a-z]{3}).gif$/, function(req, res) {

  http.get('http://plin-co.s3.amazonaws.com/' + req.params[0] + '.gif', function(proxyRes) {
    if (proxyRes.statusCode === 200) {
      proxyRes.pipe(res);
    } else {
      return res.render('404.mustache');
    }
  });
});

function serialFakeTest() {
  setTimeout(function() {
    serialReceived('A');
  }, 1000);
  var tempPegs = [2, 3, 9, 16, 17, 23, 29, 28, 35, 36, 42, 48, 55, 54, 61];
  var currPeg = 0;
  for (var i = 0; i < tempPegs.length; i++) {
    setTimeout(function() {
      serialReceived(tempPegs[currPeg++]);
    }, 1500 + i * 100);
  }
  setTimeout(function() {
    serialReceived('B');
  }, 3000);
}

function serialReceived(data) {
  if (data === 'A') {
    if (config.DEBUG) console.log('Starting record for: ' + allIds[nextId]);
    fs.mkdir('tmp/' + allIds[nextId] + '/');
    for (var i = 0; i < sockets.length; i++) {
      sockets[i].broadcast.emit('start', {'id': allIds[nextId]});
    }
  } else if (data === 'B') {
    if (config.DEBUG) console.log('Setting data for: ' + allIds[nextId]);
    var startTime = serialData[0][0];
    for (var i = 0; i < serialData.length; i++) {
      serialData[i][0] = (serialData[i][0] - startTime) / 1000;
    }
    var dataComplete = {
      runs: [
        serialData
      ]
    }
    client.set(allIds[nextId], JSON.stringify(dataComplete), redis.print);
    serialData = [];
    client.get('allIds', function (e, r) {
      if (r) {
        var idData = JSON.parse(r);
        idData['last'] = allIds[nextId];
        client.set('allIds', JSON.stringify(idData), redis.print);
      }
    });
  } else {
    if (config.DEBUG) console.log('Received data for peg: ' + data);
    for (var i = 0; i < sockets.length; i++) {
      sockets[i].broadcast.emit('peg', {'index': data});
    }
    serialData.push([new Date().getTime(), data]);
  }
}
