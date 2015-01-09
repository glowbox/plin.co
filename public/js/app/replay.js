var renderer;
var pegIndex = 0;

var previousTime = 0;
var ellapsedTime = 0;
var frameAccumulator = 0;

var DEBUG = false; 


$(function() {
  Math.seedrandom(puckId);
  
  renderer = new PlincoRenderer();
  renderer.init();
  renderer.setCanvasSize(screen.width, screen.height);
  renderer.setVisualizer(visualizer, puckId);

  document.body.appendChild( renderer.getCanvas() );
  
  previousTime = new Date().getTime();
  onAnimationFrame();
});


function onAnimationFrame() {
  
  var now = new Date().getTime();
  var delta = now - previousTime;
  previousTime = now;
  frameAccumulator += delta;
  ellapsedTime += delta;

  // Fixed time interval.. accumulate time until we exceed the frame rate,
  // then trigger rendering in 16 ms increments.
  if(frameAccumulator > 64) {
    frameAccumulator = 64;
  }

  if(pegs.length > pegIndex){
    if((pegs[pegIndex][0] * 1000) < ellapsedTime){
      renderer.onPeg(pegs[pegIndex][1]);
      pegIndex++;
    }
  }

  while(frameAccumulator > 16){
    renderer.render(16);
    frameAccumulator -= 16;
  }

  window.requestAnimationFrame(onAnimationFrame);
}
