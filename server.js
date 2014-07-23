var http = require('http');
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

var images = {};

var CONVERT = '/usr/local/bin/convert';


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
}

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








app.post('/upload/', function(req, res) {
  fs.mkdir('tmp/' + req.body.id + '/');
  if (req.body.type === 'done') {
    exec(CONVERT + ' -delay 10 -loop 0 -background black -dispose previous ' + __dirname + '/tmp/' + req.body.id + '/*.png ' + __dirname + '/tmp/' + req.body.id + '.gif');
    
    fs.readdir(__dirname + '/tmp/' + req.body.id, function(fileName) {
        fs.unlinkSync(__dirname + '/tmp/' + req.body.id + '/' + fileName);
        console.log(fileName);
    });

    fs.rmdir(__dirname + '/tmp/' + req.body.id);

  } else {
    var data = req.body.png.replace(/^data:image\/\w+;base64,/, "");
    var buf = new Buffer(data, 'base64');
    var s = "000" + req.body.num;
    fs.writeFile('tmp/' + req.body.id + '/' + s.substr(s.length-3) + '.png', buf);
  }
  return res.send('success!');
});

app.get(/^\/([a-z]{3})$/, function(req, res) {
  var id = req.params[0];
  client.get(id, function (e, r) {
    if (r) {
      var data = JSON.parse(r);
      console.log(data.runs[0]);
      return res.render('home.mustache', {id: id, run: data.runs[0]});
    } else {
      return res.render('404.mustache');
    }
  });
  // return res.render('home.mustache', {id: req.params[0]});
});



app.get(/^\/save\/([a-z]{3})$/, function(req, res) {
  if (client) {
    var id = req.params[0];
    if (id) {
      client.get(id, function (e, r) {
        if (!r) {
          var data = {
            runs: [
              [[0, 0], [.3, 1], [.6, 2], [1, 7], [1.3, 8], [1.6, 14]]
            ]
          }
          client.set(id, JSON.stringify(data), redis.print);
        } else {
          console.log(r);
          var data = JSON.parse(r);
          console.log(data);
          data.runs.push([[0, 0], [.3, 1], [.6, 2], [1, 7], [1.3, 8], [1.6, 14]]);
          client.set(id, JSON.stringify(data), redis.print);
        }
        // var order = JSON.parse(r).order;
        // for (var j = 0; j < order.length; j++) {
        //   scenes.push(order[j].json);
        //   gfys.push(order[j].gfy);
        // }
      });
    }
  }

  return res.send('success!');
});

app.get(/^\/([a-z]{3}).gif$/, function(req, res) {
  var img = fs.readFileSync('tmp/' + req.params[0] + '/result.gif');
  res.writeHead(200, {'Content-Type': 'image/gif' });
  res.end(img, 'binary');
});

function serialReceived(data) {
  if (data === 'A') {
    console.log('Start');
  } else if (data === 'A') {
    console.log('End');
  } else {
    console.log(data);
  }
}

app.listen(3001);