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

var gifs = [];
var board;

var socket;
var hasStarted;
var lastPeg;


$(function() {

  if (live) {
    socket = io('http://localhost');
    socket.on('connect', function(){
      console.log('connected!');
      socket.on('peg', function(data){
        if (lastPeg !== parseInt(data.index, 10)) {
          lastPeg = parseInt(data.index, 10);
          if (!hasStarted) {
            hasStarted = true;
            startTime = new Date().getTime();
            console.log('reset start Time');
          }
          viz.hit(0, parseInt(data.index, 10));
        }
      });
      socket.on('start', function(data){
        console.log('NEW ID: ' + data.id);
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





  // document.addEventListener( 'mousedown', onDocumentMouseDown, false );
  onWindowResize();

  SHOW_PEGS = true;
  
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
  //var viz = new Visualization(board, parseInt(puckID.toLowerCase(), 36));
  viz = new ParticleEsplode(board, parseInt(puckID.toLowerCase(), 36));
  // viz = new VoronoiViz(board, parseInt(puckID.toLowerCase(), 36));
  // viz = new BirdsViz(board, parseInt(puckID.toLowerCase(), 36));

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

          tempCanvas.width = board.pegWidth;
          tempCanvas.height = board.pegHeight;
          tempCtx.fillStyle = "black";
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

          tempCtx.drawImage(canvas, -board.pegOffsetX, -board.pegOffsetY);

          // tempCanvas.width = 400;
          // tempCanvas.height = 400 / (board.pegWidth / board.pegHeight);

          // write on screen
          var img = tempCanvas.toDataURL("image/png");
          gifs.push(img);
          
          $.post('/upload/', {'num': gifs.length, 'png': img, 'type': 'image'});
          console.log('upload ' + gifs.length);
        }
      } else if (diffMain > viz.gifLength && gifs.length) {
        $.post('/upload/', {'type': 'done'});
        console.log('done');
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
      canvas.width *= 2;
      canvas.height *= 2;
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
  this.pegOffsetX = (window.innerWidth - this.pegWidth) / 2;
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
            console.log(pegNum);
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
