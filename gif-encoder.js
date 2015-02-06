var GIFEncoder = require('gifencoder');
var PNG = require('png-js');
var fs = require('fs');

var frames = [];
var width;
var height;
var fps;
var fileName;
var puckId;
var currentFrame = 0;

process.on('message', function(data) {
  frames   = data.frames;
  width    = data.width;
  height   = data.height;
  fps      = data.fps;
  puckId   = data.id;
  fileName = data.fileName;

  console.log("Encoding a gif: " + fileName);
  startEncoding();
});



function onComplete() {
  console.log("GIF Encoding finished for: " + fileName);
  process.send({
    'event' : 'complete', 
    'puckId' : puckId
  });
  process.disconnect();
}


/*
 * Start encoding the contents of the encoder queue.
 */
function startEncoding() {

  encoder = new GIFEncoder(width, height);
  encoder.createReadStream().pipe(fs.createWriteStream(fileName));
  encoder.start();
  
  console.log("Starting new GIF encoder for: " + fileName);

  encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
  encoder.setDelay(1000 / fps);  // frame delay in ms
  encoder.setQuality(10);

  encodeFrame();
}


/*
 * Encode one frame from the encoder queue.
 */
function encodeFrame() {
  var png = new PNG(frames[currentFrame]);

  png.decode(function(pixelData) {
    //var pixelData = frames[currentFrame];
    var frameCount = frames.length;
    
    console.log("Encoding " + fileName + " frame: " + (currentFrame+1) + " of " + frameCount);
    
    encoder.addFrame(pixelData);
    currentFrame++;
    
    if(currentFrame >= frames.length) {
      encoder.finish();
      encoder = null;

      onComplete();
    } else {
      encodeFrame();
    }
  });
}