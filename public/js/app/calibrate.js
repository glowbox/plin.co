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

  currCircle = two.makeCircle(two.width / 2, two.height / 2, 30);
  currCircle.fill = 'none';
  currCircle.stroke = 'orange';

  lastCircle = two.makeCircle(two.width / 2, two.height / 2, 30);
  lastCircle.fill = 'rgba(0,255,0,0.5)';
  two.update();

  currCircle.visible = false;
  lastCircle.visible = false;

  two.bind('update', function(frameCount) {
    currCircle.scale = Math.sin(frameCount * 0.1) * 0.1 + 0.9;
    if (lastCircle.scale > 0.5) {
      lastCircle.scale -= .005;
    }
  }).play();

  board = new Board(true, function(e) {
    currPeg = $(this).attr("data-index");
    
    var coors = board.getPinCoordinates(currPeg);

    currCircle.translation.x = coors.x;
    currCircle.translation.y = coors.y;
    currCircle.visible = true;
    $("#selected-peg-index").html(currPeg);
    $.post('/pin-calib/', {'peg': currPeg});
  });

  $('.start-calib').bind('touch, mousedown', function(e) {
    $.post('/start-calib/');
  })
  $('.stop-calib').bind('touch, mousedown', function(e) {
    $.post('/stop-calib/');
    currCircle.visible = false;
    lastCircle.visible = false;
  })

  var socket = io('http://localhost');
  socket.on('connect', function(){
    console.log('connected!');

    socket.on('peg', function(data){
      console.log('peg data: ' + data);
      var coors = board.getPinCoordinates(parseInt(data.index, 10));
      lastCircle.translation.x = coors.x;
      lastCircle.translation.y = coors.y;
      lastCircle.scale = 1;
      lastCircle.visible = true;
    });
    
    socket.on('disconnect', function(){});
  });
})