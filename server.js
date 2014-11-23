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
var phantom = require('phantom');

var VIEWPORT_RATIO = 36 / 57.25;
var lastGif;

// wrapper for console output, muted if config.DEBUG is not enabled.
function debug(args) {
  if(config.DEBUG){
    console.log.call(console, args);
  }
}

process.on('uncaughtException', function (err) {
  if (err.stack.indexOf('png-js') !== -1) {
    if (encoderFramesCurr < encoderFrames) {
      addFrame(encoder, ++encoderFramesCurr, encoderFrames, lastGif);
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
  debug('CONNECTED!');
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

var queue = [];
var history = [];
var recent = [];
var images = {};
var allIds = ['2'];
var nextId = 0;
var serialData = [];
var isRunning = false;
var pegMap = {};

var isCalibrating = false;
var currCalibrationPin = -1;

var knoxClient;
knoxClient = knox.createClient({
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.S3_BUCKET
});
if (!process.env.OFFLINE) {
  
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
    serialPort.on('data', serialReceived);
  });
}

if (process.env.REDISCLOUD_URL) {
  var redis = require('redis');
  var url = require('url');
  var redisURL = url.parse(process.env.REDISCLOUD_URL);
  client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
  client.auth(redisURL.auth.split(":")[1]);

  client.get('pegMap', function (e, r) {
    if (r) {
      var data = JSON.parse(r);
      pegMap = data['map'];
    }
  });

  // var m = {};
  // for (var i = 0; i < 85; i++) {
  //   m[i] = i;
  // }
  // client.set('pegMap', JSON.stringify({'map': m}))

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

  // client.set('queue', JSON.stringify({'queue': []}), redis.print);
  client.get('queue', function (e, r) {
    if (r) {
      queue = JSON.parse(r).queue;
    }
  });

  client.get('recent', function (e, r) {
    if (r) {
      recent = JSON.parse(r).recent;
    }
  });

  // client.keys('*', function(e, keys) {
  //   for(var i = 0, len = keys.length; i < len; i++) {
  //     if (keys[i].length === 3) {
  //       client.del(keys[i]);
  //     }
  //   }
  // })

  // client.set('recent', JSON.stringify({'recent': []}), redis.print);
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
  return res.render('home.mustache', {'js': 'home', 'recent': recent});
});

app.get('/live/test/', function(req, res){
  serialFakeTest();
  return res.render('app.mustache', {'live': true, 'id': allIds[nextId], 'js': 'app'});
});

app.get('/live/', function(req, res){
  return res.render('app.mustache', {'live': true, 'js': 'app'});
});

function isCallerMobile(req) {
  var ua = req.headers['user-agent'].toLowerCase(),
    isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(ua) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0, 4));
 
  return !!isMobile;
}

function updateSocketHistory() {
  io.emit('history', {'history': history});
}

function postTweet(gif, gifName, path) {
  if (twitterRestClient) {
    history[history.length - 1]['tweeted'] = 'progress';
    updateSocketHistory();
    var status = 'Another round played! Check it out at http://plin.co/' + gif + '!';
    debug(history[history.length - 1]);
    if (history[history.length - 1]['twitter'].length) {
      status = 'Thanks for playing, @' + history[history.length - 1]['twitter'] + '. Check out your run at http://plin.co/' + gif + '!';
    }
    twitterRestClient.statusesUpdateWithMedia(
      {
        'status': status,
        'media[]': __dirname + '/tmp/' + gifName
      },
      function(error, result) {
        if (error) {
          debug('Error: ' + (error.code ? error.code + ' ' + error.message : error.message));
        }
        if (result) {
          // console.log(result);
        }

        removeGifFiles(gif, gifName, path);

        history[history.length - 1]['tweeted'] = true;
        updateSocketHistory()
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
    console.log('done');
    if (knoxClient) {
      debug('KNOX CLIENT!!!');
    }
    if (history.length) {
      history[history.length - 1]['saved'] = 'progress';
      updateSocketHistory();
    }

    var gifName = req.body.id + '.gif';

    encoder = new GIFEncoder(req.body.width, req.body.height);
    encoder.createReadStream().pipe(fs.createWriteStream(__dirname + '/tmp/' + gifName));
    encoder.start();
    encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
    encoder.setDelay(1000/req.body.fps);  // frame delay in ms
    encoder.setQuality(10);
    encoderFrames = req.body.gifLength/1000 * req.body.fps;
    addFrame(encoder, 0, encoderFrames - 2, req.body.id);
    //getAnimationFrames(encoder, 0, encoderFrames, req.body.id, 1000/req.body.fps);

    endDrop();
    history[history.length - 1]['complete'] = true;
    updateSocketHistory();
    isRunning = false;
  } else {
    var png = req.body.png;
    var data = png.replace(/^data:image\/\w+;base64,/, "");
    var buf = new Buffer(data, 'base64');
    fs.writeFileSync(__dirname + '/tmp/' + req.body.id + '/' + req.body.id + '-' + req.body.num + '.png', buf);
  }
  return res.send('success!');
});

function addFrame(encoder, currGif, max, gif) {
  encoderFramesCurr = currGif;
  lastGif = gif;
  console.log('ADD FRAME');
 // debug('ADDING FRAMES: ' + currGif);

  //__dirname + '/tmp/_plinco/' + id + '-' + num++ + '.png'

  var gifName = gif + '.gif';
  var path = __dirname + '/tmp/' + gif;

  try {
    var tmpFolder = __dirname + '/tmp/' + gif + '/';
    var imagePath = tmpFolder + gif + '-' + currGif + '.png';
    console.log("Encoding frame: " + imagePath);
    PNG.decode(imagePath, function(pixels) {
      if (currGif++ < max - 1) {
        encoder.addFrame(pixels);
       
        addFrame(encoder, currGif, max, gif);
      } else {
        debug('ENCODER FINISHED!');
        encoder.finish();

        var midId = '000' + Math.floor(currGif / 2);
        if (knoxClient) {
          // knoxClient.putFile(__dirname + '/tmp/' + gif + '/' + midId.substr(midId.length-3) + '.png', gif + '.png', function(err, res){

          // });

          knoxClient.putFile(__dirname + '/tmp/' + gifName, gifName, function(err, res){
            history[history.length - 1]['saved'] = true;
            updateSocketHistory()

            debug('FILE PLACED');
            debug(config.POST_TWEET);
            if (config.POST_TWEET) {
              postTweet(gif, gifName, path)
            } else {
              removeGifFiles(gif, gifName, path);
            }

            
            // debug('Ready data for: ' + allIds[nextId]);
            // io.emit('end', {'id': allIds[nextId]});
          });
        }
      }
    });
  } catch(e) {
    console.log(e);
    currGif++;
    addFrame(encoder, currGif, max, gif);
  }
}

app.get(/^\/([a-z]{3})$/, function(req, res) {
  var id = req.params[0];
  if (client) {
    client.get(id, function (e, r) {
      if (r) {
        var data = JSON.parse(r);
        if (isCallerMobile(req)) {
          getGif(req, res);
        } else {
          var vizId = (data.visualizer ? data.visualizer : '');
          return res.render('app.mustache', {id: id, run: data.runs[0], 'js': 'app', 'visualizer' : vizId});
        }
      } else {
        return res.render('404.mustache');
      }
    });
  } else {
    return res.render('app.mustache', {id: '1', run: [[0, 1], [.3, 2], [.6, 3]], 'js': 'app'});
  }
  // return res.render('home.mustache', {id: req.params[0]});
});

app.get('/render/:run_id', function(req, res) {
  if (client) {
    client.get(req.params.run_id, function (e, r) {
      if (r) {
        var data = JSON.parse(r);
        console.log(data);
        var vizId = (data.visualizer ? data.visualizer : '');
        return res.render('app.mustache', {playback: true, id: req.params.run_id, run: data.runs[0], 'js': 'app', 'visualizer' : vizId });
      } else {
        return res.render('404.mustache');
      }
    });
  } else {
    return res.render('app.mustache', {id: '1', run: [[0, 1], [.3, 2], [.6, 3]], 'js': 'app'});
  }
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

function getPng(req, res) {
  http.get('http://plin-co.s3.amazonaws.com/' + req.params[0] + '.png', function(proxyRes) {
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

app.get(/^\/([a-z]{3}).png$/, function(req, res) {
  getPng(req, res);
});

app.post('/play', function(req, res) {
  serialFakeTest(req.body.skip);
  return res.send('success!');
});

app.post('/end-run/', function(req, res) {
  if (isRunning) {
    endDrop();
    history[history.length - 1]['complete'] = true;
    updateSocketHistory();
    isRunning = false;
  }
  return res.send('success!');
});

app.post('/free-run/', function(req, res) {
  if (history.length) {
    history[history.length - 1]['complete'] = true;
    updateSocketHistory();
  }
  endDrop();
  isRunning = false;
  io.emit('reset', {'id': 0, 'visualizer': req.body.visualizer, 'freemode': true});
  return res.send('success!');
});

app.get('/admin', function(req, res) {
  console.log(queue);
  return res.render('admin.mustache', {'js': 'admin', 'queue': queue, 'history': history});
});

app.get('/calibrate', function(req, res) {
  // client.set('queue', JSON.stringify(queueJSON), redis.print);
  return res.render('calibrate.mustache', {'js': 'calibrate', 'map': JSON.stringify(pegMap)});
});

app.post('/start-calib', function(req, res) {
  isCalibrating = true;
  return res.send('success!');
});

app.post('/stop-calib', function(req, res) {
  isCalibrating = false;
  return res.send('success!');
});

app.post('/pin-calib', function(req, res) {
  currCalibrationPin = req.body.peg;
  return res.send('success!');
})

app.post('/peg-hit', function(req, res) {
  serialReceived(String.fromCharCode(pegMap[req.body.peg] + 33));
  return res.send('success!');
});

app.post('/add-user/', function(req, res) {
  addPlayer(req.body.username, req.body.vizualizer);
  return res.send('success!');
});

app.post('/remove-user/', function(req, res) {
  removePlayer(req.body.username);
  updateSocketHistory();
  return res.send('success!');
});

app.post('/next-user/', function(req, res) {
  var queueItem = getNextPlayer(req.body.username, req.body.visualizer);
  
  console.log("Starting drop for user: ", queueItem);
  startDrop();

  history.push({
    'twitter': queueItem.username,
    'id': allIds[nextId],
    'complete': 'progress',
    'visualizer': queueItem.visualizer
  })
  io.emit('reset', {'id': allIds[nextId], 'visualizer': queueItem.visualizer, 'freemode': false});
  updateSocketHistory();

  return res.send('success!');
});


function removePlayer(username){
  for(var i = 0; i < queue.length; i++){
    if(queue[i].username == username){
      queue.splice(i, 1);
      break;
    }
  }
  onQueueUpdate();
}


function addPlayer(username, visualizer){
  queue.push({
    'username' : username,
    'visualizer' : visualizer
  });
  onQueueUpdate();
}


function getNextPlayer(username, visualizer) {
  var queueItem = {};

  if(queue.length <= 0) {
    queueItem.username = (username != null) ? username : '';
    queueItem.visualizer = (visualizer != null) ? visualizer : '';
  } else {
    queueItem = queue.splice(0, 1)[0];  
    onQueueUpdate();
  }
  
  return queueItem;
}


function onQueueUpdate() {
  var queueJSON = {
    'queue': queue
  }
  if (client) {
    client.set('queue', JSON.stringify(queueJSON), redis.print);
  }
  io.emit('queue', {'queue': queue});
}


function serialFakeTest(skip) {
  if (skip) {
    setTimeout(function() {
      startDrop();
    }, 1000);
  }
  var tempPegs = [11, 7, 19, 8, 26, 32, 38, 45, 51, 58, 64, 71, 77, 84];
  for (var h = 0; h < tempPegs.length; h++) {
    for (var i = 0; i < 85; i++) {
      if (pegMap[i.toString()] == tempPegs[h]) {
        tempPegs[h] = i;
        i = pegMap.length + 1;
      }
    }
  }
  // var tempPegs = [0];
  var currPeg = 0;
  for (var i = 0; i < tempPegs.length; i++) {
    setTimeout(function() {
      serialReceived(String.fromCharCode(tempPegs[currPeg++] + 32), true);
    }, 1500 + i * 200);
  }
}


function startDrop() {
  debug('Starting record for: ' + allIds[nextId]);
 
  fs.mkdir('tmp/' + allIds[nextId] + '/', function(err){
  });

  io.emit('start', {'id': allIds[nextId]});
  serialData = [];
  isRunning = true;
}


function endDrop() {
  debug('Setting data for: ' + allIds[nextId]);
  
  if (serialData.length) {
    var startTime = serialData[0][0];
    var tempId = nextId;
    for (var i = 0; i < serialData.length; i++) {
      serialData[i][0] = (serialData[i][0] - startTime) / 1000;
    }
    var dataComplete = {
      runs: [
        serialData
      ],
      twitter: history.length ? history[history.length - 1]['twitter'] : '',
      time: new Date().getTime(),
      visualizer: history.length ? history[history.length - 1]['visualizer'] : ''
    };
    if (client) {
      console.log("Saving record: ", dataComplete);
      client.set(allIds[nextId], JSON.stringify(dataComplete), redis.print);
    }
    serialData = [];
    client.get('allIds', function (e, r) {
      if (r) {
        var idData = JSON.parse(r);
        idData['last'] = allIds[tempId];
        client.set('allIds', JSON.stringify(idData), redis.print);
      }
    });
    recent.unshift(allIds[tempId]);
    recent.splice(5);
    if (client) {
      client.set('recent', JSON.stringify({'recent': recent}), redis.print);
    }
    nextId++;
  }
  isRunning = false;
}


function serialReceived(data, force){
  var codes = data.toString();
  for(var i = 0; i < codes.length; i++){
    handlePinCode(codes[i], force);
  }
}


function handlePinCode(data, force) {
  
  var raw = data;
  data = data.toString().charCodeAt(0) - 32;
  debug('Pin: ' + pegMap[parseInt(data, 10)] + " (raw code: " + data + ")");
  
  if (!isCalibrating) {
    var pin = pegMap[parseInt(data, 10)];
    var errorPin = false;

    for (var i = 0; i < serialData.length; i++) {
      // if (serialData[i][1] > 12) {
      // }
    }

    var row = Math.floor(pin/6.5);
    var col = Math.floor(pin%6.5);
    var lowest = 0;

    for (var i = 0; i < serialData.length; i++) {
      var testPin = serialData[i][1];
      var testRow = Math.floor(testPin/6.5);
      if (testRow > lowest) {
        lowest = testRow;
      }
    }

    var filterPins = false;

    if(filterPins){
      if (serialData.length) {
        var lastPin = serialData[serialData.length - 1][1];
        var lastRow = Math.floor(lastPin/6.5);
        var lastCol = Math.floor(lastPin%6.5);
        if (lowest > 1) {
          if (Math.abs(lastCol - col) - Math.abs(lastRow - row) >= 3) {
            debug('TOO FAR AWAY');
            errorPin = true;
          } else if (lowest - row >= 2) {
            debug('HIGHER THAN THE LOWEST (MOXY FRUVOUS)');
            errorPin = true;
          }
        } else {

        }
      } else {
        if (row > 1) {
          debug('STARTED TOO FAR DOWN');
          errorPin = true;
        }
      }
    }
    
    if (!filterPins || !errorPin) {
      if (isRunning || force) {
        serialData.push([new Date().getTime(), pegMap[parseInt(data, 10)]]);
      }
      io.emit('peg', {'index': pegMap[parseInt(data, 10)]});
    }
  } else {
    // It's in calibration mode, store the pin mapping.
    pegMap[parseInt(data, 10)] = parseInt(currCalibrationPin, 10);
    if (client) {
      client.set('pegMap', JSON.stringify({'map': pegMap}));
    }
    io.emit('peg', {'index': pegMap[parseInt(data, 10)]});
  }
}

setTimeout(updateSocketHistory, 1000);

// function getAnimationFrames(encoder, currGif, max, gif, speed) {
//   phantom.create(function (ph) {
//     ph.createPage(function (page) {
//       page.set('viewportSize', {width:Math.floor(800 * VIEWPORT_RATIO),height:800})
//         page.open('http://localhost:' + port + '/render/' + gif, function (status) {
//           if (status !== 'success') {
//             console.log('Unable to access the network!');
//           } else {
//             var renderStart = new Date().getTime();
//             var finished = false;
//             var accum = 0;
//             var tmpFolder = __dirname + '/tmp/' + gif + '/';

//             for(var num = 0; num < max; num++) {
              
//               // Run the animation logic as fast as possible without skipping frames.
//               while(accum < speed) {
//                 page.evaluate(function() {
//                   animate(16);
//                 });
//                 accum += 16;
//               } 

//               accum -= speed;
              
//               debug('Render frame: ' + num);
//               page.render(tmpFolder + gif + '-' + num + '.png');
//             }

//             var waiting = true;
//             var lastFile = tmpFolder + gif + '-' + (max-1) + '.png';
            
//             var ellapsed = new Date().getTime() - renderStart;

//             console.log("Rendered in " + ellapsed + " milliseconds, waiting for PNG to exist: " + lastFile);

//             // TODO: there's probably a better way to do this.
//             while(waiting){
//               if(fs.existsSync(lastFile)){
//                 var stats = fs.statSync(lastFile);
//                 waiting = false;
//               }
//             }

//             console.log("All PNG's exist, GIF encoding can start now.");
//             ph.exit();
//             addFrame(encoder, currGif, max, gif);
//           }
//       });
//     });
//   });
  

// }

// getBlank('mon');