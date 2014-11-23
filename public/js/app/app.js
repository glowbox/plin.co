var two;

var displayCanvas;
var displayContext;

var viz;
var runCurr = 0;

var ellapsedTime = 0;
var lastFrameTime = 0;
var pngs = [];
var uploading = false;
var uploadCanvas;
var uploadContext;

var previousTime = 0;
var frameAccumulator = 0;
var playbackTime = 0;
var camera;
var scene;
var renderer;

var BOARD_RATIO = 36 / 57.25;

// Height of the canvas to render board content.
var renderSize = {
  width: 0,
  height: 0
};
updateRenderSize();

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
var mousePosition = {x:0, y:0};

// default values, configuration will be loaded from local storage later.
var targetPoints = [[0,0],[505,0],[505,800],[0,800]];

// List of named vizualizers and their constructors.
var visualizers = {
  'attract-mode' :  {
    'name' : 'Attract',
    'constructor' : AttractMode
  },
  'birds' : {
    'name' : 'Birds',
    'constructor' : BirdsViz
  },
  'voronoi' :  {
    'name' : 'Voronoi',
    'constructor' : VoronoiViz
  },
  'particles' :  {
    'name' : 'Particles',
    'constructor' : ParticleEsplode
  },
  'cardinal' :  {
    'name' : 'Cardinals',
    'constructor' : CardinalViz
  },
  'ribbons' :  {
    'name' : 'Ribbons',
    'constructor' : RibbonsViz
  },
  'strum' :  {
    'name' : 'Strum',
    'constructor' : StrumViz
  }
};
var currVisualizer;

$(function() {
  Math.seedrandom(puckID);

  if (live) {
    socket = io('http://localhost');
    socket.on('connect', appSocketOnConnect);
  }

  camera = new THREE.PerspectiveCamera( 75, BOARD_RATIO, 1, 10000 );
  camera.position.z = 100;
  camera.lookAt(new THREE.Vector3(0,0,0));

  scene = new THREE.Scene();

  renderer = new THREE.CanvasRenderer();
  renderer.setClearColor( 0x000000 );
  renderer.setSize( renderSize.width, renderSize.height );

  document.body.appendChild( renderer.domElement );

  displayCanvas = document.getElementsByTagName('canvas')[0];
  displayCanvas.setAttribute('id', 'canvas');
  displayContext = displayCanvas.getContext('2d');

  // create the temporary canvas to scale down captured frames.
  uploadCanvas = document.createElement('canvas');
  uploadCanvas.height = 800;
  uploadCanvas.width = uploadCanvas.height * BOARD_RATIO;
  uploadContext = uploadCanvas.getContext('2d');
  
  onWindowResize();
  
  board = new Board();
  viz = createVisualizer(visualizer);
  pngs = [];

  //viz = new AttractMode(board, 1);
  // viz = new ParticleEsplode(board, parseInt(puckID.toLowerCase(), 36));
  
  if(!useCSSProjectionMapping){
    initGLMapper();
  }

  loadProjectionConfiguration();
  updatePerspectiveTransform();

  previousTime = new Date().getTime();
  
  $(window).bind('keydown', appKeyDown);
  $(window).bind('mousedown', appMouseDown);
  $(window).bind('mouseup', appMouseUp);
  $(window).bind('mousemove', appMouseMove);
  $(window).bind('resize', onWindowResize);
  
  if(isLive){
    updatePerspectiveTransform();
  }

  if(!isPlayback){
    onAnimationFrame();
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
  console.log(data);
  freeMode = data.freemode;
  puckID = data.id;
  var visName = data.visualizer;

  if (freeMode) {
    Math.seedrandom(Math.random());
  } else {
    Math.seedrandom(puckID);
  }
  
  viz.destroy();
  viz = createVisualizer(visName);
  pngs = [];

  resizeCanvas();
  hasStarted = false;
  // $.post('/play');
}

function createVisualizer(name){
  if (DEBUG) console.log("CREATE: " + name);
  currVisualizer = name;
  if(visualizers[name]) {
    return new visualizers[name].constructor(board, puckID);
  } else {
    return new visualizers["attract-mode"].constructor(board, puckID);
  }
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
      ellapsedTime = 0;
      if (DEBUG) console.log('reset start Time');
    }
    viz.hit(0, parseInt(data.index, 10));
  }
}

function saveProjectionConfiguration() {
  if(Modernizr.localstorage){
    localStorage.setItem("plinco.targetPoints", JSON.stringify(targetPoints));
  }
}

function loadProjectionConfiguration() {
 if(Modernizr.localstorage){
    if(localStorage.getItem("plinco.targetPoints")){
      targetPoints = JSON.parse(localStorage.getItem("plinco.targetPoints"));
    }
  } 
}

function appKeyDown(e) {
  // Space bar or tilde
  if ((e.keyCode === 32) || (e.keyCode === 192)) {
    if(CALIBRATE_MAPPING){
      saveProjectionConfiguration();
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
      if(distanceTo(mx, my, targetPoints[i][0], targetPoints[i][1]) < 60) {
        dragging = true;
        dragIndex = i;
        break;
      }
    }
  }
}

function onAnimationFrame(){
  
  var now = new Date().getTime();
  var delta = now - previousTime;
  previousTime = now;
  frameAccumulator += delta;

  // Fixed time interval.. accumulate time until we exceed the frame rate,
  // then trigger rendering in 16 ms increments.
  if(frameAccumulator > 64){
    frameAccumulator = 64;
  }

  while(frameAccumulator > 16){
    animate(16);
    frameAccumulator -= 16;
  }

  window.requestAnimationFrame(onAnimationFrame);
}

function animate(deltaTime) {
  
  // handle playback of runs
  if (runCurr < runStats.length) {
    playbackTime += deltaTime;
    if (runStats[runCurr][0] * 1000 < playbackTime) {
      viz.hit(runCurr, parseInt(runStats[runCurr][1]));
      runCurr++;
    }
  }

  // If this is a tracked run, wait until it's done then notify the server.
  if (live && hasStarted && !freeMode) {
    ellapsedTime += deltaTime;
    lastFrameTime += deltaTime;
    if(ellapsedTime > viz.gifLength && !uploading) {
      onRunComplete();

    } else {
      // console.log(lastFrameTime, 1000/viz.framesPerSecond);
      if (lastFrameTime > 1000/viz.framesPerSecond) {
        lastFrameTime = 0;
        captureFrame();
      }
      // lastFrameTime, , 'gifLength': viz.gifLength
      // console.log(ellapsedTime);
    }
  }

  // render the currrent visualizer
  displayContext.save();
  var s = displayCanvas.width / board.width;
  displayContext.scale(s,s);
  viz.render(displayContext, deltaTime);
  displayContext.restore();

  renderer.render( scene, camera );

  // render calibration overlay
  if(isLive){
    updateCalibration();
  }
}

function captureFrame(){

  // copy the board image 
  uploadContext.fillStyle = "black";
  uploadContext.fillRect(0,0,uploadCanvas.width, uploadCanvas.height);
  uploadContext.drawImage( displayCanvas, 0, 0, displayCanvas.width, displayCanvas.height, 0, 0, uploadCanvas.width, uploadCanvas.height);

  var dataURL = uploadCanvas.toDataURL();
  pngs.push(dataURL);
}

function onRunComplete() {
  if (DEBUG) console.log('run complete');
  uploading = true;
  uploadImage(0);
}

function uploadImage(numUploaded) {
  if (DEBUG) console.log('uploading image ', numUploaded);
  $.post('/upload/', {
      'num': numUploaded++, 
      'id': puckID, 
      'type': 'image', 
      'fps': viz.framesPerSecond, 
      'gifLength': viz.gifLength, 
      'png': pngs[0]
    }, 
    function(data) {
      pngs = pngs.slice(1);
      uploadImageComplete(numUploaded);
    }
  );
}

function uploadImageComplete(numUploaded) {
  if (DEBUG) console.log('uploaded image ', numUploaded);
  if (pngs.length) {
    uploadImage(numUploaded);
  } else {
    allImagesUploaded();
  }
}

function allImagesUploaded() {
  hasStarted = false;
  uploading = false;
  if (DEBUG) console.log('all images uploaded');
  $.post('/upload/', {
      'id': puckID, 
      'type': 'done', 
      'fps': viz.framesPerSecond, 
      'gifLength': viz.gifLength, 
      'width': uploadCanvas.width, 
      'height': uploadCanvas.height
    }, 
    function(data) {
    }
  );
}

function updateRenderSize(){
  if(isLive) {
    // Make the canvas at least as tall as the display for live mode.
    renderSize.height = screen.height;
    renderSize.width = renderSize.height * BOARD_RATIO;
  } else {
    // Figure out the ideal dimension to fill the window without cropping.
    if(window.innerWidth / window.innerHeight < BOARD_RATIO) {
      renderSize.width = window.innerWidth;
      renderSize.height = renderSize.width / BOARD_RATIO;
    } else {
      renderSize.height = window.innerHeight;
      renderSize.width = renderSize.height * BOARD_RATIO;
    }
  }
}


function resizeCanvas() {

  displayCanvas.width = renderSize.width;
  displayCanvas.height = renderSize.height;

  $(displayCanvas).css({width: renderSize.width, height:renderSize.height});
}

function onWindowResize() {

  updateRenderSize();
  resizeCanvas();

  camera.aspect = BOARD_RATIO;
  camera.updateProjectionMatrix();
  renderer.setSize( renderSize.width, renderSize.height );
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


function updateCalibration() {
  // draw pegs on canvas to help alignment.

  if (CALIBRATE_MAPPING) {
  
    displayContext.save();
  
    var f = displayCanvas.width / board.width;
    displayContext.scale(f,f);
    displayContext.lineWidth = 0.5;
    displayContext.fillStyle = "white";
    displayContext.strokeStyle = "white";
    displayContext.strokeRect(0, 0, board.width, board.height);
  
    for(var i = 0; i < board.numPegs; i++){
      var coords = board.getPinCoordinates(i);
  
      displayContext.beginPath();
      displayContext.arc(coords.x, coords.y, 0.25, 0, 2 * Math.PI, false);
      displayContext.fillStyle = 'white';
      displayContext.fill();

      displayContext.fillStyle = 'gray';
      displayContext.font = "0.6pt verdana";
      displayContext.fillText(i, coords.x+0.5, coords.y+0.25);
    }

    displayContext.restore();
  }

  if(!useCSSProjectionMapping){
    renderGLMapper();
  }
}

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
  
  var sourcePoints = [[0, 0], [renderSize.width, 0], [renderSize.width, renderSize.height], [0, renderSize.height]];
  
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
 
  $(displayCanvas).css(transform, "matrix3d(" + matrix.join(',') + ")");
  $(displayCanvas).css(transform + "-origin", "0px 0px 0px");
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

  $(displayCanvas).hide();

  document.body.appendChild(glMapper.renderer.domElement);

  var canvasTex = new THREE.Texture(displayCanvas);
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
