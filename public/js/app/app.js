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

var BOARD_RATIO = 36/57.25;


var SCREEN_HEIGHT = isLive ? 1920 : window.innerWidth,
    SCREEN_WIDTH = isLive ? (SCREEN_HEIGHT * BOARD_RATIO) : window.innerHeight,
      SCREEN_WIDTH_HALF = SCREEN_WIDTH  / 2,
      SCREEN_HEIGHT_HALF = SCREEN_HEIGHT / 2;

var DEBUG = false;
var SHOW_PEGS = false;
var CALIBRATE_MAPPING = false;
var useCSSProjectionMapping = true;

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
    socket.on('connect', appSocketOnConnect);
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

  board = new Board();
  viz = chooseViz(puckID);
  //viz = new AttractMode(board, 1);

  // viz = new ParticleEsplode(board, parseInt(puckID.toLowerCase(), 36));
  
  if(!useCSSProjectionMapping){
    initGLMapper();
  }

  updatePerspectiveTransform();

  resizeCanvas();
  animate();

  $(window).bind('keydown', appKeyDown);
  $(window).bind('mousedown', appMouseDown);
  $(window).bind('mouseup', appMouseUp);
  $(window).bind('mousemove', appMouseMove);
  
  if(isLive){
    updatePerspectiveTransform();
  }
});

function appSocketOnConnect(){
  if (DEBUG) console.log('connected!');
  socket.on('peg', appSocketOnPeg);
  socket.on('start', appSocketOnStart);
  socket.on('reset', appSocketOnReset);
  socket.on('end', appSocketOnEnd);
  socket.on('disconnect', function(){});
}

function appSocketOnEnd(data){
  puckID = data.id;
  Math.seedrandom(puckID);
  hasStarted = false;
  if (DEBUG) console.log('NEXT ID: ' + data.id);
}

function appSocketOnReset(data){
  freeMode = data.freemode;
  puckID = data.id;
  if (freeMode) {
    Math.seedrandom(Math.random());
  } else {
    Math.seedrandom(puckID);
  }
  viz.destroy();
  if(data.id == 0){
    console.log("Set to attract mode.");
    viz = new AttractMode(board, 0);
  } else {
    viz = chooseViz(puckID);
  }
  resizeCanvas();
  hasStarted = false;
  // $.post('/play');
}

function appSocketOnStart(data){
  if (DEBUG) console.log('RUNNING ID: ' + data.id);
}

function appSocketOnPeg(data){
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
}

function appKeyDown(e) {
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
}

function appMouseMove(e) {
  if(dragging && CALIBRATE_MAPPING) {
    targetPoints[dragIndex][0] = e.pageX;
    targetPoints[dragIndex][1] = e.pageY;
    updatePerspectiveTransform();
  }
  mousePosition.x = e.pageX;
  mousePosition.y = e.pageY;
}


function appMouseUp(e) {
  if(dragging){
  }
  dragging = false;
}

function appMouseDown(e) {    
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
}

function animate() {
  var now = new Date().getTime();
  if (live && hasStarted && !freeMode) {
    var diffMain = now - startTime;
    if (diffMain > 0 && diffMain < viz.gifLength) {
      var diffLast = now - lastImageTime;
      if (diffLast > 1000 / viz.framesPerSecond) {
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
  context.save();
  var s = canvas.width / board.width;
   context.scale(s,s);
  viz.render(context);
  context.restore();

  renderer.render( scene, camera );
  

  // draw pegs on canvas to help alignment.
  if (CALIBRATE_MAPPING) {
   context.save();
   var f = canvas.width / board.width;
   context.scale(f,f);
   context.lineWidth = 0.5;
   context.fillStyle = "white";
   context.strokeStyle = "white";
   context.strokeRect(0, 0, board.width, board.height);
   //context.strokeRect(1, 1, board.widt-2,canvas.height-2);
   for(var i = 0; i < board.numPegs; i++){
     var coords = board.getPinCoordinates(i);
     //context.fillEllipse(coords.x-4, coords.y-4, 9, 9);
     context.beginPath();
     context.arc(coords.x, coords.y, 0.25, 0, 2 * Math.PI, false);
     context.fillStyle = 'white';
     context.fill();

     context.fillStyle = 'gray';
     context.font = "0.6pt verdana";
     context.fillText(i, coords.x+0.5, coords.y+0.25);
   }
   context.restore();
  }

  if(!useCSSProjectionMapping){
    renderGLMapper();
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
  if(!isLive){
    return;
  }

  if(useCSSProjectionMapping){
    updateCSSPerspectiveTransform();
  } else {
    updateGLPerspectiveTransform();
  }
}

function updateCSSPerspectiveTransform() {
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
  var idx = parseInt(id.toLowerCase(), 36);
  if (freeMode && isLive) {
    var modes = [ParticleEsplode, VoronoiViz]; //, BirdsViz];
    var index = idx % modes.length;
    return new modes[index](board, idx)
  } else {
    return new VoronoiViz(board, idx);
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
  $.post('/upload/', {'num': 0, 'type': 'image', 'fps': viz.framesPerSecond, 'gifLength': viz.gifLength});
  contexts = [];
}



//// GL Mapper - 3d transforms in css are not mip-mapped and look crunchy.
//// UPDATE: They look 100% the same. :|

var glMapper = {
};

function updateGLPerspectiveTransform() {

  var sourcePoints = [[0, 0], [board.BOARD_RATIO, 0], [board.BOARD_RATIO, 1], [0, 1]];
  var destPoints = [];

  for(var i = 0; i < targetPoints.length; i++){
    destPoints[i] = [
      (2 *  targetPoints[i][0] / window.innerWidth) - 1,
      -(2 * targetPoints[i][1] / window.innerHeight) + 1,
    ];
  }

  for (var a = [], b = [], i = 0, n = sourcePoints.length; i < n; ++i) {
    var s = sourcePoints[i], t = destPoints[i];
    a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]), b.push(t[0]);
    a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]), b.push(t[1]);
  }

  var X = solve(a, b, true);
  var xform = new THREE.Matrix4();
  
  xform.set( 
    X[0],  X[1],   0,  X[2], 
    X[3],  X[4],   0,  X[5], 
    0,     0,      0,  0,
    X[6], X[7],   0,  1 );

  // transform the vertices of the plane.
  for(var i = 0; i < glMapper.geoSourcePoints.length; i++) {
    glMapper.quad.geometry.vertices[i].copy(glMapper.geoSourcePoints[i]);
    glMapper.quad.geometry.vertices[i].applyProjection(xform);
  }

  glMapper.quad.geometry.verticesNeedUpdate = true;
}

function initGLMapper() {
  var r = new THREE.WebGLRenderer({antialias:false});

  r.setSize(window.innerWidth, window.innerHeight);

  glMapper.renderer = r;

  $(canvas).hide();

  document.body.appendChild(glMapper.renderer.domElement);

  var canvasTex = new THREE.Texture(canvas);
  glMapper.source = canvasTex;
  glMapper.source.anisotropy = 16;


  var cam = new THREE.OrthographicCamera( -1, 1, 1, -1, 0.1, 1000 );
  cam.position.set(0, 0, 1);
  cam.lookAt( scene.position );
    
  var quad = new THREE.Mesh( 
    new THREE.PlaneGeometry(board.BOARD_RATIO, 1, 40, 40), 
    new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.BackSide, wireframe:false, map: glMapper.source})
  );
  quad.geometry.applyMatrix( new THREE.Matrix4().makeTranslation(board.BOARD_RATIO / 2, 0.5, 0) );


  glMapper.geoSourcePoints = [];
  for(var i = 0; i < quad.geometry.vertices.length; i++){
    glMapper.geoSourcePoints.push( quad.geometry.vertices[i].clone());
  }
  glMapper.quad = quad;

  glMapper.camera = cam;
  glMapper.scene = new THREE.Scene();
  glMapper.scene.add(quad)
}

function renderGLMapper() {
  glMapper.source.needsUpdate = true;
  glMapper.renderer.render(glMapper.scene, glMapper.camera);
}
