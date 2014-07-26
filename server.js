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
var request = require('request');
var PNG = require('png-js');
var GIFEncoder = require('gifencoder');

process.on('uncaughtException', function (err) {
  if (err.stack.indexOf('png-js') !== -1) {
    if (encoderFramesCurr < encoderFrames) {
      addFrame(encoder, ++encoderFramesCurr, encoderFrames);
    }
    console.log(err.stack);
  } else {
    console.error(err.stack);
  }
  // console.log("Node NOT Exiting...");
});

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

      // for (var i = 0; i < allIds.length; i++) {
      //   if (allIds[i] !== 'allIds') {
      //     client.del(allIds[i]);
      //   }
      // }
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

function isCallerMobile(req) {
  var ua = req.headers['user-agent'].toLowerCase(),
    isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(ua) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0, 4));
 
  return !!isMobile;
}

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

var encoder;
var encoderFrames;
var encoderFramesCurr;

app.post('/upload/', function(req, res) {
  // fs.exists('tmp/' + allIds[nextId] + '/', function (exists) {
  //   if (!exists) {
  //     fs.mkdir('tmp/' + allIds[nextId] + '/');
  //   }
  // });
  if (req.body.type === 'done') {
    

  } else {
    var tempId = allIds[nextId];
    var gifName = allIds[nextId] + '.gif';
    var path = __dirname + '/tmp/' + tempId;

    for (var i = 0; i < req.body.pngs.length; i++) {
      var data = req.body.pngs[i].replace(/^data:image\/\w+;base64,/, "");
      var buf = new Buffer(data, 'base64');
      var s = "000" + i;
      if (config.DEBUG) console.log('Saving file: ' + s.substr(s.length-3));
      fs.writeFile('tmp/' + tempId + '/' + s.substr(s.length-3) + '.png', buf);
    }

    encoder = new GIFEncoder(req.body.size.width, req.body.size.height);
    encoder.createReadStream().pipe(fs.createWriteStream(__dirname + '/tmp/' + gifName));
    encoder.start();
    encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
    encoder.setDelay(1000/req.body.fps);  // frame delay in ms
    encoder.setQuality(10);
    encoderFrames = req.body.pngs.length - 1;
    addFrame(encoder, 0, encoderFrames);
  }
  return res.send('success!');
});

function addFrame(encoder, currGif, max) {
  var f = "000" + currGif;
  encoderFramesCurr = currGif;
  if (config.DEBUG) console.log('ADDING FRAMES: ' + f.substr(f.length-3));

  var tempId = allIds[nextId];
  var gifName = allIds[nextId] + '.gif';
  var path = __dirname + '/tmp/' + tempId;

  try {
    PNG.decode(__dirname + '/tmp/' + tempId + '/' + f.substr(f.length-3) + '.png', function(pixels) {
      if (currGif++ < max) {
        encoder.addFrame(pixels);
        addFrame(encoder, currGif, max);
      } else {
        if (config.DEBUG) console.log('ENCODER FINISHED!');
        encoder.finish();

        knoxClient.putFile(__dirname + '/tmp/' + gifName, gifName, function(err, res){
          if (config.DEBUG) console.log('FILE PLACED');

          if (config.POST_TWEET) {
            postTweet(tempId, gifName, path)
          } else {
            removeGifFiles(tempId, gifName, path);
          }

          ++nextId;
          if (config.DEBUG) console.log('Ready data for: ' + tempId);
        });
      }
    });
  } catch(e) {
    console.log(e);
    currGif++;
    addFrame(encoder, currGif, max);
  }
}

app.get(/^\/([a-z]{3})$/, function(req, res) {
  var id = req.params[0];
  client.get(id, function (e, r) {
    if (r) {
      var data = JSON.parse(r);
      if (isCallerMobile(req)) {
        getGif(req, res);
      } else {
        return res.render('home.mustache', {id: id, run: data.runs[0]});
      }
    } else {
      return res.render('404.mustache');
    }
  });
  // return res.render('home.mustache', {id: req.params[0]});
});

function getGif(req, res) {
  http.get('http://plin-co.s3.amazonaws.com/' + req.params[0] + '.gif', function(proxyRes) {
    if (proxyRes.statusCode === 200) {
      proxyRes.pipe(res);
    } else {
      return res.render('404.mustache');
    }
  });
}

app.get(/^\/([a-z]{3}).gif$/, function(req, res) {
  getGif(req, res);
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
    }, 1500 + i * 200);
  }
  setTimeout(function() {
    serialReceived('B');
  }, 5000);
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
