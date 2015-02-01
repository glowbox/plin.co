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

var twitterName = '';

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

var visualizerChoices = [
  {
    name: "Voronoi",
    id:"voronoi"
  },
  {
    name: "Particles",
    id:"particles"
  },
  {
    name: "Random",
    id:"_random"
  },
  {
    name: "Cardinal",
    id:"cardinal"
  },
  {
    name: "Ribbons",
    id:"ribbons"
  }
];


var selectedVisualizer = 2;
var visualizerItemWidth = 160;
var visualizerOffsetX = 0;
var hideVisualizerSelectionTimeout = null;


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

  for(var i = 0; i < visualizerChoices.length; i++){
    var container = document.createElement('div');
    container.className = "vis-thumbnail";
    container.innerHTML = visualizerChoices[i].name;
    container.style.left = (i * visualizerItemWidth) + "px";
    document.getElementById('visualizer-options').appendChild(container);
  }
  $('.vis-thumbnail').removeClass('selected');
  $('.vis-thumbnail:eq(' + selectedVisualizer + ')').addClass('selected');
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
  if((currentState == STATE_IDLE) || (currentState == STATE_POST_DROP)) {
    startDrop();
  }

  if(currentState == STATE_DROP) {
    // TODO: Filter pegs to avoid false hits! (MOXY FRUVOUS)
    var pegIndex = parseInt(data.pegId, 10);
    renderer.onPeg(pegIndex);

    dropData.pegs.push([ellapsedCaptureTime / 1000, pegIndex]);
  }
}


function startDrop() {

  $('#canvas').removeClass('background');


  var selected = visualizerChoices[selectedVisualizer].id;

  if(selected == "_random") {
    currentVisualizer = getRandomVisualizer();
  } else {
    currentVisualizer = selected;
  }
  renderer.setVisualizer(currentVisualizer);   
  

  fakePeg = 0;
  ellapsedCaptureTime = 0;

  setState(STATE_DROP);

  dropData = {
    id: lastPuckId,
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

function startVisualizerTimeout() {
  $('#next-visualizer').addClass('show');
  window.clearTimeout(hideVisualizerSelectionTimeout);
  hideVisualizerSelectionTimeout = window.setTimeout(function() {
    $('#next-visualizer').removeClass('show');
  }, 3000);
}

function appKeyDown(e) {

  if((currentState == STATE_IDLE) || (currentState == STATE_POST_DROP)) {
    
    var newVisualizer = currentVisualizer;

    switch(e.keyCode) {
      case 40: // DOWN Arrow
      {
        selectedVisualizer--;
        if(selectedVisualizer < 0){
          selectedVisualizer = 0;
        }
        startVisualizerTimeout();
      }
      break;
      
      case 39: // Right Arrow
      {
        selectedVisualizer++;
        if(selectedVisualizer >= visualizerChoices.length) {
          selectedVisualizer = visualizerChoices.length - 1;
        }
        startVisualizerTimeout();
      }
      break;

      case 38: // UP arrow.
      {
         
      }
      break;
    }

    $('.vis-thumbnail').removeClass('selected');
    $('.vis-thumbnail:eq(' + selectedVisualizer + ')').addClass('selected');
  }

  if((currentState == STATE_POST_DROP) || (currentState == STATE_IDLE)) {

    var character = String.fromCharCode(e.keyCode);
    var validCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('');
    
    //console.log("Character: " + character + ", code:" + e.keyCode);

    switch(e.keyCode) {
      case 13: // 'enter' key
        if(twitterName.length > 0){
          $.post('/tweet-run/', {
            'id':puckId,
            'user':twitterName
          }, function(data){
            twitterName = '';
            updateTwitterName();
          });
        }
      break;
      
      case 8: // backspace
        if(twitterName.length > 0){
          twitterName = twitterName.substring(0, twitterName.length-1);
        }
        e.preventDefault();
        e.stopPropagation();
      break;

      case 189: // HACK, catch dashes and turn them into underscores.
        character = '_';
        // continue on to the default case.

      default:
        if((twitterName.length < 15) && (validCharacters.indexOf(character) != -1)) {
          twitterName += character;
        }
      break;
    }
    
    updateTwitterName();
    resetIdleTimeout();
  
  }

 // if(current_state == STATE_DROP) { 
    if(e.keyCode == 38) { // 'a' key
      appSocketOnPeg({'pegId' : fakePeg});
      fakePeg += Math.floor(Math.random() * 4) + 5;
      
      if(fakePeg >= 85){
        fakePeg = 81 + Math.floor(Math.random() * 5);
      }
    }
 // }
}


function updateTwitterName() {
  document.getElementById("twitter-name").innerHTML = twitterName;
  if(twitterName != ""){
    $("#placeholder").hide();
  } else {
    $("#placeholder").show();
  }
}


function resetIdleTimeout() {
  idleTimeout = (new Date().getTime() + IDLE_TIMEOUT_INTERVAL);
}


function setState(newState) {
  resetIdleTimeout();
  lastStateChangeTime = new Date().getTime();
  currentState = newState;
  $(".status-panel").hide();
  $("#status-" + newState).show();

  if(currentState == STATE_UPLOADING){
    $("#upload-progress").css('width', "1%");
  }

  if(currentState == STATE_IDLE) {
    if(lastPuckId != null){
      $('#replay-id').html(lastPuckId);
      $('#canvas').addClass('background');
      $('#twitter').show();
    } else {
      $('#twitter').hide();
    }
  } else {
    
    $('#canvas').removeClass('background');
  }
}


function setAttractMode() {
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
    vals.push("lastPuckId: " + lastPuckId);
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


  updateVisualizerSelector();

  window.requestAnimationFrame(onAnimationFrame);
}

function updateVisualizerSelector(){
  var targetX = selectedVisualizer * visualizerItemWidth - 400 + 80;
  visualizerOffsetX += (targetX - visualizerOffsetX) * 0.05;
  document.getElementById('visualizer-options').style.left = -visualizerOffsetX + "px";
}


function onCaptureComplete() {
  uploadImageIndex = 0;
  setState(STATE_UPLOADING);
  uploadDrop();
}


function uploadDrop() {
  if (DEBUG) console.log('calling save-run', new Date().getTime());
  $.post('/save-run', {
      'id': puckId,
      'data': JSON.stringify(dropData)
    }, 
    function(data) {
      if (DEBUG) console.log('save-run responded, uploading images.', new Date().getTime());
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
    setState(STATE_IDLE);
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
  
  $("#upload-progress").css('width', (uploadImageIndex / capturedFrames.length * 100) + "%")

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
