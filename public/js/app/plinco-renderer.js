var PlincoRenderer = function() {

  var displayCanvas;
  var displayContext;

  var visualizer;
  var visualizerSettings;
  var board;

  var camera;
  var scene;
  var renderer;

  var BOARD_RATIO = 36 / 57.25;

  // Height of the canvas to render board content.
  var renderSize = {
    'width': 0,
    'height': 0
  };

  var init = function() {
    camera = new THREE.PerspectiveCamera( 40, BOARD_RATIO, 1, 10000 );
    camera.position.z = 48;
    camera.lookAt(new THREE.Vector3(0,0,0));

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0x000000 );
    renderer.setSize( renderSize.width, renderSize.height );

    displayCanvas = document.createElement('canvas');
    displayCanvas.setAttribute('id', 'canvas');
    displayContext = displayCanvas.getContext('2d');

    board = new Board();
  };

  var getDisplayCanvas = function() {
    return displayCanvas;
  };

  var setVisualizer = function(name, puckId) {
    if (DEBUG) console.log("Create Visualizer: " + name);
    
    if(visualizers[name]) {
      visualizer = new visualizers[name].constructor(board, puckId);
      visualizerConfig = visualizers[name];
    } else {
      visualizer = new visualizers['attract-mode'].constructor(board, puckId);
      visualizerConfig = visualizers['attract-mode'];
    }
    
    displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  };

  var onPeg = function(pegId) {
    if(visualizer) {
      visualizer.hit(pegId);
    }
  };

  var render = function(deltaTime) {
    
    if(!visualizer){
      console.log("No visualizer..");
      return;
    }

    if(visualizerConfig.autoClear){
      displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    }

    // render the currrent visualizer
    displayContext.save();
    
    var scale = displayCanvas.width / board.width;
    displayContext.scale(scale, scale);
    visualizer.render(displayContext, deltaTime);
    
    displayContext.restore();

    // draw three.js scene if it's not empty.
    if(scene.children.length > 0){
      renderer.render( scene, camera );
      displayContext.drawImage( renderer.domElement, 0, 0, renderer.domElement.width, renderer.domElement.height, 0, 0, displayCanvas.width, displayCanvas.height);
    }
  };

  var setCanvasSize = function(width, height) {

    renderSize.height = screen.height;
    renderSize.width = renderSize.height * BOARD_RATIO;

    displayCanvas.width = renderSize.width;
    displayCanvas.height = renderSize.height;

    $(displayCanvas).css({ 
      'width': renderSize.width, 
      'height': renderSize.height
    });
  };

  return {
    'init' : init,
    'setCanvasSize' : setCanvasSize,
    'render' : render,
    'onPeg' : onPeg,
    'getCanvas' : getDisplayCanvas,
    'setVisualizer' : setVisualizer,
    'getBoardRatio' : function() {
      return BOARD_RATIO;
    }
  };
}