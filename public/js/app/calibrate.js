var currCircle;
var lastCircle;

$(function() {
  var currPeg = 0;
  two = new Two({
    type: Two.Types['svg'],
    fullscreen: true
  }).appendTo(document.body);

  Two.Resolution = 10;

  var circles = [];

  currCircle = two.makeCircle(two.width / 2, two.height / 2, 25);
  currCircle.fill = 'none';
  currCircle.stroke = 'orange';
  lastCircle = two.makeCircle(two.width / 2, two.height / 2, 30);
  lastCircle.fill = 'none';
  lastCircle.stroke = 'green';
  two.update();

  two.bind('update', function(frameCount) {
    for (var i = 0; i < circles.length; i++) {
      var c = circles[i];
      if (c.scale > 0) {
        c.scale -= .01;
      } else {
        c.scale = 0;
      }
    }
    if (currCircle.scale > 0) {
      currCircle.scale -= .01;
    } else {
      currCircle.scale = 1;
    }
    if (lastCircle.scale > 0) {
      lastCircle.scale -= .005;
    } else {
      lastCircle.scale = 1;
    }
  }).play();

  board = new Board(true, function(e) {
    currPeg = $(this).index();
    var coors = board.getPinCoordinates(currPeg);
    currCircle.translation.x = coors.x;
    currCircle.translation.y = coors.y;
    $.post('/pin-calib/', {'peg': currPeg});
  });

  $('.start-calib').bind('touch, mousedown', function(e) {
    $.post('/start-calib/');
  })
  $('.stop-calib').bind('touch, mousedown', function(e) {
    $.post('/stop-calib/');
  })

  var socket = io('http://localhost');
  socket.on('connect', function(){
    console.log('connected!');

    socket.on('peg', function(data){
      console.log('peg data: ' + data);
      var coors = board.getPinCoordinates(parseInt(data.index, 10));
      lastCircle.translation.x = coors.x;
      lastCircle.translation.y = coors.y;
    });
    
    socket.on('disconnect', function(){});
  });
})