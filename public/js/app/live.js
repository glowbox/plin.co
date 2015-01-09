var ellapsedCaptureTime = 0;
var lastFrameTime = 0;
var capturedFrames = [];
var uploading = false;
var uploadImageIndex = 0;

var uploadCanvas;
var uploadContext;

var captureFrames = false;
var previousTime = 0;
var frameAccumulator = 0;

var socket;

var dropData = {
  visualizer: '',
  time: 0,
  pegs: []
};

var lastPuckId = null;

var currentVisualizer = 'attract-mode';
var renderer;

var IDLE_TIMEOUT_INTERVAL = 30 * 1000;
var idleTimeout = 0;

var STATE_IDLE = 'idle';
var STATE_DROP = 'drop';
var STATE_UPLOADING = 'uploading';
var STATE_POST_DROP = 'post-drop';

var lastStateChangeTime = 0;
var currentState = 'INVALID';

var DEBUG = true;
var fakePeg = 0; // used to spoof pegs via key press

$(function() {
  Math.seedrandom(puckId);

  socket = io('http://localhost', { transports: ['websocket'] } );

  socket.on('connect', appSocketOnConnect);
  
  $(window).bind('keydown', appKeyDown);
  /*$(window).bind('mousedown', appMouseDown);
  $(window).bind('mouseup', appMouseUp);
  $(window).bind('mousemove', appMouseMove);
  $(window).bind('resize', onWindowResize);*/
  
  renderer = new PlincoRenderer();
  renderer.init();
  renderer.setCanvasSize(screen.width, screen.height);
  renderer.setVisualizer(currentVisualizer, puckId);

  // create the temporary canvas to scale down captured frames.
  uploadCanvas = document.createElement('canvas');
  uploadCanvas.height = 800;
  uploadCanvas.width = uploadCanvas.height * renderer.getBoardRatio();
  uploadContext = uploadCanvas.getContext('2d');

  document.body.appendChild( renderer.getCanvas() );
  
  Maptastic("status", renderer.getCanvas());

  capturedFrames = [];
  previousTime = new Date().getTime();
  
  setState(STATE_IDLE);
  resetIdleTimeout();
  onAnimationFrame();
});

function appSocketOnConnect() {
  if (DEBUG) console.log('connected!');
  
  socket.on('peg', appSocketOnPeg);
  socket.on('disconnect', function(){
    if (DEBUG) console.log('socket disconnected!');
  });

  //socket.on('start', appSocketOnStart);
  //socket.on('reset', appSocketOnReset);
  //socket.on('end', appSocketOnEnd);
}


function appSocketOnPeg(data) {
  if(currentState == STATE_IDLE) {
    startDrop();
  }
  if(currentState == STATE_DROP) {
    // TODO: Filter pegs to avoid false hits.
    var pegIndex = parseInt(data.pegId, 10);
    renderer.onPeg(pegIndex);

    dropData.pegs.push([ellapsedCaptureTime / 1000, pegIndex]);
  }
}


function startDrop() {

  if(visualizers[currentVisualizer].isAttract){
    currentVisualizer = getRandomVisualizer();
    renderer.setVisualizer(currentVisualizer);
  }

  fakePeg = 0;
  ellapsedCaptureTime = 0;

  setState(STATE_DROP);

  dropData = {
    id: puckId,
    visualizer: currentVisualizer,
    time: new Date().getTime(),
    pegs: []
  };

  capturedFrames = [];
}


function getRandomVisualizer() {
  var choices = [];
  for(var itm in visualizers){
    if(!visualizers[itm].isAttract){
      choices.push(itm);
    }
  }
  return choices[Math.floor(Math.random() * choices.length)];
}


function appKeyDown(e) {

  if((currentState == STATE_IDLE) || (currentState == STATE_POST_DROP)) {
    
    var newVisualizer = currentVisualizer;

    switch(e.keyCode) {
      case 49: // '1'
      {
        newVisualizer = 'particles';
      }
      break;
      
      case 50: // '2'
      {
        newVisualizer = 'voronoi';
      }
      break;
      
      case 51: // '3'
      {
        newVisualizer = 'ribbons';
      }
      break;
    }

    if(currentVisualizer != newVisualizer) {
      
      // TODO: It would probably be better to handle this differently.
      // If a new state is chosen in teh post-drop state, go to idle
      // so the timeout won't re-set the vis..
      if(currentState == STATE_POST_DROP){
        setState(STATE_IDLE);
      }

      renderer.setVisualizer(newVisualizer);
      currentVisualizer = newVisualizer;
    }
  }

  if(currentState == STATE_POST_DROP) {
    switch(e.keyCode) {
      case 13: // 'enter' key
        console.log("Tweet something..");
      break;

      case 49: // '1' key
        e.preventDefault = true;
        e.stopPropagation();
      break;
    }
    resetIdleTimeout();
  }

  if(e.keyCode == 65) { // 'a' key
    appSocketOnPeg({'pegId' : fakePeg});
    fakePeg += Math.floor(Math.random() * 4) + 5;
    if(fakePeg >= 87){
      fakePeg = 81 + Math.floor(Math.random() * 6);
    }
  }
}


function resetIdleTimeout() {
  idleTimeout = (new Date().getTime() + IDLE_TIMEOUT_INTERVAL);
}


function setState(newState){
  resetIdleTimeout();
  lastStateChangeTime = new Date().getTime();
  currentState = newState;
  $("#status DIV").hide();
  $("#status-" + newState).show();
}


function setAttractMode(){
  renderer.setVisualizer('attract-mode');
  currentVisualizer = 'attract-mode';
}


function onAnimationFrame() {
  
  var now = new Date().getTime();
  var delta = now - previousTime;
  previousTime = now;
  frameAccumulator += delta;

  // Fixed time interval.. accumulate time until we exceed the frame rate,
  // then trigger rendering in 16 ms increments.
  if(frameAccumulator > 64) {
    frameAccumulator = 64;
  }

  while(frameAccumulator > 16){
    renderer.render(16);
    frameAccumulator -= 16;
  }

  updateFrameCapture(delta);

  if(now > idleTimeout) {
    if((currentState == STATE_IDLE) || (currentState == STATE_POST_DROP)){
      setState(STATE_IDLE);
      setAttractMode();
      resetIdleTimeout();
    } 
  }

  if(DEBUG) {

    var vals = [];
    
    vals.push("State: " + currentState);
    vals.push("PuckId: " + puckId);
    vals.push("Visualizer: " + currentVisualizer);

    if(currentState == STATE_DROP) {
      vals.push("Capture time: " + ellapsedCaptureTime);
      vals.push("Captured frames: " + capturedFrames.length);
    }

    if(currentState == STATE_UPLOADING) {
      vals.push("Uploading: " + uploadImageIndex + " of " + capturedFrames.length);
    }

    if(currentState == STATE_POST_DROP) {
      vals.push("Idle timeout: " + (idleTimeout - now));
    }

    document.getElementById("debug").innerHTML = vals.join("<br>");
  }


  window.requestAnimationFrame(onAnimationFrame);
}


function onCaptureComplete() {
  setState(STATE_UPLOADING);
  uploadImageIndex = 0;
  uploadDrop();
}

function uploadDrop() {
  $.post('/save-run', {
      'id': puckId,
      'data': JSON.stringify(dropData)
    }, 
    function(data) {
      uploadImages();
    }
  );
}


function updateFrameCapture(deltaTime) {
  // If this is a tracked run, wait until it's done then notify the server.

  if (currentState == STATE_DROP) {
    
    ellapsedCaptureTime += deltaTime;
    lastFrameTime += deltaTime;
    
    if(ellapsedCaptureTime > visualizers[currentVisualizer].captureLength) {
      onCaptureComplete();
    } else {
      if (lastFrameTime > 1000 / visualizers[currentVisualizer].captureFPS) {
        lastFrameTime = 0;
        captureFrame();
      }
    }
  }
}


function onUploadComplete() {
  capturedFrames.length = 0;

  $.get('/next-id', function(id) {
    lastPuckId = puckId;
    puckId = id;
    setState(STATE_POST_DROP);
  });
}


function captureFrame() {

  // copy the board image onto the upload canvas. This avoids alpha issues 
  // with transparent boards and allows for resizing prior to upload.

  uploadContext.fillStyle = "black";
  uploadContext.fillRect(0, 0, uploadCanvas.width, uploadCanvas.height);
  uploadContext.drawImage( renderer.getCanvas(), 
    0, 0, renderer.getCanvas().width, renderer.getCanvas().height, 
    0, 0, uploadCanvas.width, uploadCanvas.height);

  var dataURL = uploadCanvas.toDataURL();
  capturedFrames.push(dataURL);
}


function uploadImages() {

  if (DEBUG) console.log('uploading image ', uploadImageIndex);
  
  $.post('/upload/', {
      'width': uploadCanvas.width,
      'height': uploadCanvas.height,
      'frame': uploadImageIndex,
      'frameCount': capturedFrames.length,
      'id': puckId,
      'fps': currentVisualizer.captureFPS,
      'gifLength': currentVisualizer.captureLength, 
      'png': capturedFrames[uploadImageIndex]
    }, 
    function(data) {
      uploadImageIndex++;
      if (uploadImageIndex >= capturedFrames.length) {
        // all done.
        onUploadComplete();
      } else {
        // upload the next image. 
        uploadImages();
      }
    }
  );
}
