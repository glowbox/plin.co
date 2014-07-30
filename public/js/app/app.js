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

var BOARD_RATIO = 37/58;


var SCREEN_HEIGHT = isLive ? 800 : window.innerWidth,
    SCREEN_WIDTH = isLive ? (SCREEN_HEIGHT * BOARD_RATIO) : window.innerHeight,
      SCREEN_WIDTH_HALF = SCREEN_WIDTH  / 2,
      SCREEN_HEIGHT_HALF = SCREEN_HEIGHT / 2;

var DEBUG = false;
var SHOW_PEGS = true;
var CALIBRATE_MAPPING = false;

var gifs = [];
var board;

var socket;
var hasStarted;
var lastPeg;

var worker;
var contexts = [];
var gifSize = {};

var runIds = [];

var freeMode = true;

var mousePosition = {x:0,y:0};

$(function() {

  Math.seedrandom(puckID);

  if (live) {
    socket = io('http://localhost');
    socket.on('connect', function(){
      if (DEBUG) console.log('connected!');
      socket.on('peg', function(data){
        if (DEBUG) console.log(data.index);
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
        if (DEBUG) console.log('RUNNING ID: ' + data.id);
      });
      socket.on('reset', function(data){
        freeMode = data.freemode;
        puckID = data.id;
        viz.destroy();
        viz = chooseViz(puckID);
        resizeCanvas();
        hasStarted = false;
        // $.post('/play');
      });
      socket.on('end', function(data){
        puckID = data.id;
        hasStarted = false;
        if (DEBUG) console.log('NEXT ID: ' + data.id);
      });
      socket.on('disconnect', function(){});
    });
  }

  camera = new THREE.PerspectiveCamera( 75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000 );
  camera.position.z = 450;

  scene = new THREE.Scene();

  renderer = new THREE.CanvasRenderer();
  renderer.setClearColor( 0x000000 );
  renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
  //console.log(SCREEN_WIDTH, SCREEN_HEIGHT);
  document.body.appendChild( renderer.domElement );

  canvas = document.getElementsByTagName('canvas')[0];
  canvas.setAttribute('id', 'canvas');
  context = canvas.getContext('2d');

  onWindowResize();
  
  startTime = new Date().getTime() + 1000;
  lastImageTime = 0;

  if (SHOW_PEGS) {
    two = new Two({
      type: Two.Types['svg'],
      width:SCREEN_WIDTH,
      height:SCREEN_HEIGHT
    }).appendTo(document.body);

    Two.Resolution = 10;
  }

  board = new Board(SHOW_PEGS, function(e) {
                                  var pegNum = $(this).index();
                                  if (DEBUG) console.log(pegNum);
                                  viz.hit(++runCurr, pegNum);
                                });
  viz = chooseViz(puckID);

  // viz = new ParticleEsplode(board, parseInt(puckID.toLowerCase(), 36));

  worker = new Worker( '/js/app/worker.js' );
  worker.onmessage = function( event ){
    console.log( event.data );
  };

  function animate() {
    var now = new Date().getTime();
    if (live && hasStarted && !freeMode) {
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
          // if (viz.double) {
          //   var imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          //   var data = imageData.data;

          //   for(var i = 0; i < data.length; i += 4) {
          //     // red
          //     data[i] = 255 - data[i];
          //     // green
          //     data[i + 1] = 255 - data[i + 1];
          //     // blue
          //     data[i + 2] = 255 - data[i + 2];
          //   }
          //   tempCtx.putImageData(imageData, 0, 0);
          // }
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
        // draw pegs on canvas to help alignment.
    if (CALIBRATE_MAPPING) {
     context.fillStyle = "white";
     context.strokeStyle = "white";
     context.strokeRect(0,0,canvas.width,canvas.height);
     context.strokeRect(1,1,canvas.width-2,canvas.height-2);
     for(var i = 0; i < board.numPegs; i++){
       var coords = board.getPinCoordinates(i);
        context.fillRect(coords.x-2, coords.y-2, 5, 5);
     }
    }
    requestAnimationFrame(animate);
  }

  function resizeCanvas() {
    canvas.width = isLive ? SCREEN_WIDTH : window.innerWidth;
    canvas.height = isLive ? SCREEN_HEIGHT : window.innerHeight;
    if (viz.double && !isLive) {
      canvas.width = canvas.width * ((viz.double && window.devicePixelRatio) > 1 ? 2 : 1);
      canvas.height = canvas.height * ((viz.double && window.devicePixelRatio) > 1 ? 2 : 1);
    }
  }
  
  resizeCanvas();
  animate();

  $(window).bind('keydown', function(e) {
    if (e.keyCode === 32) {
      if(CALIBRATE_MAPPING){
        $.post('/set-projection-points/', {'targetPoints': JSON.stringify(targetPoints)});
      }
      CALIBRATE_MAPPING = !CALIBRATE_MAPPING;
    }
    if(CALIBRATE_MAPPING){
      var index = -1;
      switch(e.keyCode) {
        case 49: // 1
          index = 0;
        break;
        
        case 50: // 2
         index = 1;
        break;
        
        case 81: // q
          index = 3;
        break;
        
        case 87: // w
          index = 2;
        break;

        default:
          console.log(e.keyCode);
      }
      if(index !== -1) {
        targetPoints[index][0] = mousePosition.x;
        targetPoints[index][1] = mousePosition.y;
        updatePerspectiveTransform();
      }
    }
  });

  $(window).bind('mousedown', function(e) {
    
    if(CALIBRATE_MAPPING){
      var mx = e.pageX;
      var my = e.pageY;

      for(var i = 0; i < 4; i++){
        if(distanceTo(mx, my, targetPoints[i][0], targetPoints[i][1]) < 60){
          dragging = true;
          dragIndex = i;
          break;
        }
      }
    }
  });

  $(window).bind('mouseup', function(e) {
    if(dragging){
    }
    dragging = false;
  });

  $(window).bind('mousemove', function(e) {
    if(dragging && CALIBRATE_MAPPING) {
      targetPoints[dragIndex][0] = e.pageX;
      targetPoints[dragIndex][1] = e.pageY;
      updatePerspectiveTransform();
    }
    mousePosition.x = e.pageX;
    mousePosition.y = e.pageY;
  });
  // updatePerspectiveTransform();
});

function distanceTo(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
function hexToRgb(hex) {
  var bigint = parseInt(hex, 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  return { r: r, g: g, b: b };
}

var dragging = false;
var dragIndex = 0;

function updatePerspectiveTransform() {
  var transform = ["", "-webkit-", "-moz-", "-ms-", "-o-"].reduce(function(p, v) { return v + "transform" in document.body.style ? v : p; }) + "transform";
  
  var sourcePoints = [[0, 0], [SCREEN_WIDTH, 0], [SCREEN_WIDTH, SCREEN_HEIGHT], [0, SCREEN_HEIGHT]];
    

  for (var a = [], b = [], i = 0, n = sourcePoints.length; i < n; ++i) {
    var s = sourcePoints[i], t = targetPoints[i];
    a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]), b.push(t[0]);
    a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]), b.push(t[1]);
  }

  var X = solve(a, b, true);
  var matrix = [
    X[0], X[3], 0, X[6],
    X[1], X[4], 0, X[7],
       0,    0, 1,    0,
    X[2], X[5], 0,    1
  ].map(function(x) {
    return d3.round(x, 6);
  });
 
  $(canvas).css(transform, "matrix3d(" + matrix.join(',') + ")");
  $(canvas).css(transform + "-origin", "0px 0px 0px");
}

function onWindowResize() {
  if(isLive) {
    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
  } else {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }
}

function chooseViz(id) {
  if (parseInt(id.toLowerCase(), 36) % 3 == 1) {
    return new ParticleEsplode(board, parseInt(id.toLowerCase(), 36));
  } else if (parseInt(id.toLowerCase(), 36) % 3 == 2) {
    return new VoronoiViz(board, parseInt(id.toLowerCase(), 36));
  } else {
    return new BirdsViz(board, parseInt(id.toLowerCase(), 36));
  }
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



