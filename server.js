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

// wrapper for console output, muted if config.DEBUG is not enabled.
function debug(args) {
  if(config.DEBUG){
    console.log.call(console, args);
  }
}


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
var projectionTargetPoints = "[[0,0],[505,0],[505,800],[0,800]]";
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

  // client.get('projectionTargetPoints', function (e, r) {
  //   if (r) {
  //     projectionTargetPoints = r;
  //   }
  // });



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
  return res.render('app.mustache', {'projectionTargetPoints' : projectionTargetPoints, 'live': true, 'id': allIds[nextId], 'js': 'app'});
});

app.get('/live/', function(req, res){
  return res.render('app.mustache', {'projectionTargetPoints' : projectionTargetPoints, 'live': true, 'js': 'app'});
});

function isCallerMobile(req) {
  var ua = req.headers['user-agent'].toLowerCase(),
    isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(ua) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0, 4));
 
  return !!isMobile;
}

function updateSocketHistory() {
  io.emit('history', {'history': history});
}

function postTweet(tempId, gifName, path) {
  if (twitterRestClient) {
    history[history.length - 1]['tweeted'] = 'progress';
    updateSocketHistory();
    var status = 'Another round played! Check it out at http://plin.co/' + allIds[nextId] + '! #cascadiajs';
    console.log(history[history.length - 1]);
    if (history[history.length - 1]['twitter'].length) {
      status = 'Thanks for playing, @' + history[history.length - 1]['twitter'] + '. Check out your run at http://plin.co/' + allIds[nextId] + '! #cascadiajs';
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

        removeGifFiles(tempId, gifName, path);

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
    

  } else {
    if (knoxClient) {
      console.log('KNOX CLIENT!!!');
    }
    console.log(req.body);
    if (history.length) {
      history[history.length - 1]['saved'] = 'progress';
      updateSocketHistory();
    }

    var gifName = allIds[nextId] + '.gif';

    encoder = new GIFEncoder(Math.floor(800*(37/58)), 800);
    encoder.createReadStream().pipe(fs.createWriteStream(__dirname + '/tmp/' + gifName));
    encoder.start();
    encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
    encoder.setDelay(1000/req.body.fps);  // frame delay in ms
    encoder.setQuality(10);
    encoderFrames = req.body.gifLength/1000 * req.body.fps;
    getAnimationFrames(encoder, 0, encoderFrames, allIds[nextId]);

    endDrop();
    history[history.length - 1]['complete'] = true;
    updateSocketHistory();
    isRunning = false;
  }
  return res.send('success!');
});

function addFrame(encoder, currGif, max, gif) {
  encoderFramesCurr = currGif;
  debug('ADDING FRAMES: ' + currGif);

  //__dirname + '/tmp/_plinco/' + id + '-' + num++ + '.png'

  var gifName = gif + '.gif';
  var path = __dirname + '/tmp/' + gif;

  console.log(max, __dirname + '/tmp/_plinco/' + gif + '-' + currGif + '.png');
  try {
    PNG.decode(__dirname + '/tmp/_plinco/' + gif + '-' + currGif + '.png', function(pixels) {
      if (currGif++ < max) {
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
          return res.render('app.mustache', {id: id, run: data.runs[0], 'js': 'app', 'projectionTargetPoints' : projectionTargetPoints});
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

app.post('/set-projection-points/', function(req, res) {
  var targets = req.body.targetPoints;
  projectionTargetPoints = targets;
  if (client) {
    console.log("Saving projection mapping points..");
    client.set('projectionTargetPoints', targets);
  }
  return res.send('success!');
})

app.post('/end-run/', function(req, res) {
  endDrop();
  history[history.length - 1]['complete'] = true;
  updateSocketHistory();
  isRunning = false;
  return res.send('success!');
});

app.post('/free-run/', function(req, res) {
  if (history.length) {
    history[history.length - 1]['complete'] = true;
    updateSocketHistory();
  }
  endDrop();
  isRunning = false;
  io.emit('reset', {'id': req.body.mode, 'freemode': true});
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
  console.log(req.body.peg, String.fromCharCode(parseInt(req.body.peg) + 33), pegMap[req.body.peg]);
  serialReceived(String.fromCharCode(pegMap[req.body.peg] + 33));
  return res.send('success!');
});

app.post('/add-user/', function(req, res) {
  queue.push(req.body.username);
  var queueJSON = {
    'queue': queue
  }
  if (client) {
    client.set('queue', JSON.stringify(queueJSON), redis.print);
  }
  io.emit('queue', queueJSON);
  console.log(queueJSON);
  return res.send('success!');
});

app.post('/remove-user/', function(req, res) {
  var user = queue.splice(queue.indexOf(req.body.username), 1);
  console.log(user);
  var queueJSON = {
    'queue': queue
  }
  if (client) {
    client.set('queue', JSON.stringify(queueJSON), redis.print);
  }
  io.emit('queue', {'queue': queue});
  updateSocketHistory();
  return res.send('success!');
});

app.post('/next-user/', function(req, res) {
  var user = queue.splice(0, 1);
  var queueJSON = {
    'queue': queue
  }
  
  startDrop();

  if (client) {
    client.set('queue', JSON.stringify(queueJSON), redis.print);
  }
  history.push({
    'twitter': user.length ? user[0] : '',
    'id': allIds[nextId],
    'complete': 'progress'
  })
  io.emit('reset', {'id': allIds[nextId], 'freemode': false});
  io.emit('queue', {'queue': queue});
  updateSocketHistory();
  return res.send('success!');
});

function serialFakeTest(skip) {
  if (skip) {
    setTimeout(function() {
      startDrop();
    }, 1000);
  }
  var tempPegs = [11, 7, 19, 8, 26, 32, 38, 45, 51, 58, 64, 71, 77, 84];
  // var tempPegs = [0];
  var currPeg = 0;
  for (var i = 0; i < tempPegs.length; i++) {
    setTimeout(function() {
      serialReceived(String.fromCharCode(tempPegs[currPeg++] + 32));
    }, 1500 + i * 200);
  }
}


function startDrop() {
  debug('Starting record for: ' + allIds[nextId]);
 
  fs.mkdir('tmp/' + allIds[nextId] + '/');
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
      time: new Date().getTime()
    }
    if (client) {
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


function serialReceived(data){
  var codes = data.toString();
  for(var i = 0; i < codes.length; i++){
    handlePinCode(codes[i]);
  }
}


function handlePinCode(data) {
  debug('RAW CODE: ' + data);
  
  var raw = data;
  data = data.toString().charCodeAt(0) - 32;
  debug('Received data for peg: ' + pegMap[parseInt(data, 10)]);
  
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

    console.log(serialData);
    console.log(pin, lowest, row, col);

    if (serialData.length) {
      console.log(serialData);
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

    if (!errorPin) {
      if (isRunning) {
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

function getAnimationFrames(encoder, currGif, max, gif) {
  phantom.create(function (ph) {
    ph.createPage(function (page) {
      page.set('viewportSize', {width:Math.floor(800*(37/58)),height:800})
        console.log('http://localhost:' + port + '/' + gif);
        page.open('http://localhost:' + port + '/' + gif, function (status) {
          if (status !== 'success') {
              console.log('Unable to access the network!');
          } else {
              var num = 0;
              var interval = setInterval(function() {
                console.log('render frame ' + num);
                page.render(__dirname + '/tmp/_plinco/' + gif + '-' + num++ + '.png', function() {
                  //getBlank(++id);
                  // ph.exit();
                });

                if (num === 60) {
                  clearInterval(interval);
                  ph.exit();
                  addFrame(encoder, currGif, max, gif);
                }
              
              }, 100);
          }
      });
    });
  });
}

// getBlank('mon');