var two;
var canvas;
var context;
var viz;
var runCurr = 0;
var startTime;
var lastImageTime;

var camera;
var scene;
var renderer;

var SCREEN_WIDTH = window.innerWidth,
      SCREEN_HEIGHT = window.innerHeight,
      SCREEN_WIDTH_HALF = SCREEN_WIDTH  / 2,
      SCREEN_HEIGHT_HALF = SCREEN_HEIGHT / 2;
var DEBUG = false;

var gifs = [];
var board;

var socket;
var hasStarted;
var lastPeg;

var worker;
var contexts = [];
var gifSize = {};


$(function() {

  if (live) {
    socket = io('http://localhost');
    socket.on('connect', function(){
      if (DEBUG) console.log('connected!');
      socket.on('peg', function(data){
        if (lastPeg !== parseInt(data.index, 10)) {
          lastPeg = parseInt(data.index, 10);
          if (!hasStarted) {
            hasStarted = true;
            startTime = new Date().getTime();
            if (DEBUG) console.log('reset start Time');
          }
          viz.hit(0, parseInt(data.index, 10));
        }
      });
      socket.on('start', function(data){
        if (DEBUG) console.log('NEW ID: ' + data.id);
      });
      socket.on('disconnect', function(){});
    });
  }

  camera = new THREE.PerspectiveCamera( 75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000 );
  camera.position.z = 450;

  scene = new THREE.Scene();

  

  renderer = new THREE.CanvasRenderer();
  renderer.setClearColor( 0xffffff );
  renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
  document.body.appendChild( renderer.domElement );

  canvas = document.getElementsByTagName('canvas')[0];
  canvas.setAttribute('id', 'canvas');
  context = canvas.getContext('2d');

  onWindowResize();

  SHOW_PEGS = false;
  
  startTime = new Date().getTime() + 1000;
  lastImageTime = 0;

  if (SHOW_PEGS) {
    two = new Two({
      type: Two.Types['svg'],
      fullscreen: true
    }).appendTo(document.body);

    Two.Resolution = 10;
  }

  board = new Board(SHOW_PEGS);
  // if (parseInt(puckID.toLowerCase(), 36) % 3 == 1) {
  //   viz = new ParticleEsplode(board, parseInt(puckID.toLowerCase(), 36));
  // } else if (parseInt(puckID.toLowerCase(), 36) % 3 == 2) {
    // viz = new VoronoiViz(board, parseInt(puckID.toLowerCase(), 36));
  // } else {
    // viz = new BirdsViz(board, parseInt(puckID.toLowerCase(), 36));
  // }
  viz = new ParticleEsplode(board, parseInt(puckID.toLowerCase(), 36));

  worker = new Worker( '/js/app/worker.js' );
  worker.onmessage = function( event ){
    console.log( event.data );
  };

  function animate() {
    var now = new Date().getTime();
    if (live && hasStarted) {
      var diffMain = now - startTime;
      if (diffMain > 0 && diffMain < viz.gifLength) {
        var diffLast = now - lastImageTime;
        if (diffLast > 1000 / viz.framesPerSecond) {
          lastImageTime = now;
          var tempCanvas = document.createElement("canvas"),
              tempCtx = tempCanvas.getContext("2d");

          var dOffset = ((viz.double && window.devicePixelRatio) > 1 ? 2 : 1);
          var maxWidth = (board.pegWidth) * dOffset;
          var maxHeight = (board.pegHeight) * dOffset;
          var ratio = maxWidth / maxHeight;
          tempCanvas.width = 480;
          tempCanvas.height = Math.floor(480 / ratio);
          var sizeRatio = maxWidth / tempCanvas.width;

          gifSize = {
            'width': tempCanvas.width,
            'height': tempCanvas.height
          }

          tempCtx.fillStyle = "black";
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(canvas, (canvas.width - maxWidth) / 2, (canvas.height - maxHeight) / 2, maxWidth, maxHeight, 0, 0, 480, Math.floor(480 / ratio));
          // tempCanvas.width = 480;
          // tempCanvas.height = Math.floor(480 * ratio);
          contexts.push(tempCanvas);
          if (viz.double) {
            var imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            var data = imageData.data;

            for(var i = 0; i < data.length; i += 4) {
              // red
              data[i] = 255 - data[i];
              // green
              data[i + 1] = 255 - data[i + 1];
              // blue
              data[i + 2] = 255 - data[i + 2];
            }
            tempCtx.putImageData(imageData, 0, 0);
          }
          gifs.push(0);
        }
      } else if (diffMain > viz.gifLength && gifs.length) {
        uploadImages();
        if (DEBUG) console.log('done');
        gifs = [];
      }
    }
    if (runCurr < runStats.length) {
      if (startTime + runStats[runCurr][0] * 1000 < now) {
        viz.hit(runCurr, parseInt(runStats[runCurr][1]));
        runCurr++;
      }
    }
    viz.render();
    renderer.render( scene, camera );
    requestAnimationFrame(animate);
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (viz.double) {
      canvas.width = canvas.width * ((viz.double && window.devicePixelRatio) > 1 ? 2 : 1);
      canvas.height = canvas.height * ((viz.double && window.devicePixelRatio) > 1 ? 2 : 1);
    }
  }
  
  resizeCanvas();
  animate();
});

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function uploadImages() {
  // $.post('/upload/', {'type': 'done', 'fps': viz.framesPerSecond});
  var pngs = [];
  for (var i = 0; i < contexts.length; i++) {
    var img = contexts[i].toDataURL("image/png");
    pngs.push(img);
  }
  // worker.postMessage(passData);
  $.post('/upload/', {'num': 0, 'pngs': pngs, 'type': 'image', 'fps': viz.framesPerSecond, 'size': gifSize});
  contexts = [];
}


function Board(showPegs) {
  this.pegsHit = [];

  this.numPegs = 78;
  this.pegRadius = 3;
  this.BOARD_RATIO = 36/57;
  this.pegHeight = (window.innerHeight - 50);
  this.pegWidth = this.pegHeight * this.BOARD_RATIO;
  if (window.innerWidth < this.pegWidth) {
    this.pegWidth = (window.innerWidth - 50);
    this.pegHeight = this.pegWidth / this.BOARD_RATIO;
  }
  this.pegs = [];
  this.pegSpacing = this.pegWidth / 7;
  this.pegOffsetX = (window.innerWidth - this.pegWidth) / 2 + this.pegSpacing / 2;
  this.pegOffsetY = (window.innerHeight - this.pegHeight) / 2;

  this.init = function() {
    if (showPegs) {
      two = new Two({
        type: Two.Types['svg'],
        fullscreen: true
      }).appendTo(document.body);

      Two.Resolution = 10;
    }
    for (var i = 0; i < this.numPegs; i++) {
      var localPin = i % 13;
      var overallWidth = 13 * this.pegSpacing;
      var x = 0;
      var y = Math.floor(i / 13) * (this.pegSpacing * .866666667 * 2) + this.pegOffsetY + (this.pegSpacing * .8666) * 1.5;
      if (localPin <= 6) {
        var num = i;
        if (i === 65) {
          num = 0;
        }
        x = (num /13 * overallWidth) % overallWidth + this.pegOffsetX;
        y -= this.pegSpacing * .866666667;
      } else {
        x = (i /13 * overallWidth) % overallWidth - (overallWidth / 2)  + this.pegOffsetX;
      }

      if (showPegs) {
        var peg = two.makeCircle(x, y, this.pegRadius);
        peg.fill = 'rgba(255, 255, 255, ' + i/this.numPegs + ')';
        two.update();
        $(peg._renderer.elem)
          .css('cursor', 'pointer')
          .click(function(e) {
            var pegNum = $(this).index();
            if (DEBUG) console.log(pegNum);
            viz.hit(++runCurr, pegNum);
          });
      }
      this.pegs.push({x: x, y: y});
    }
  }

  this.getPinCoordinates = function(index) {
    return {
      x: this.pegs[index].x,
      y: this.pegs[index].y
    }
  }
  this.init();
}
