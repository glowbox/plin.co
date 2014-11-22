var currCircle;
var lastCircle;

$(function() {
  
  var board = new Board();

  var currPeg = 0;
  two = new Two({
    type: Two.Types['svg'],
    width: board.width,
    height:board.height
  }).appendTo(document.body);

  Two.Resolution = 10;

  var circles = [];

  currCircle = two.makeCircle(two.width / 2, two.height / 2, 1);
  currCircle.linewidth = 0.1;
  currCircle.fill = 'rgba(255,255,0,0.1)';
  currCircle.stroke = 'orange';

  lastCircle = two.makeCircle(two.width / 2, two.height / 2, 1);
  lastCircle.linewidth = 0;
  lastCircle.fill = 'rgba(0,255,0,0.5)';
  two.update();

  currCircle.visible = false;
  lastCircle.visible = false;

  var svg = two.renderer.domElement;

  svg.style.position = "fixed";
  svg.style.left = "0px";
  svg.style.right = "0px";
  svg.style.width = "100%";
  svg.style.height = "100%";

  svg.setAttribute("viewBox", "0 0 " + board.width + " " + board.height);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  two.bind('update', function(frameCount) {
    currCircle.scale = Math.sin(frameCount * 0.1) * 0.1 + 0.9;
    if (lastCircle.scale > 0.75) {
      lastCircle.scale -= .05;
    }
  }).play();

  var boardSvg = board.showPegs(function(e) {
    console.log(e);
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
      lastCircle.scale = 1.5;
      lastCircle.visible = true;
    });
    
    socket.on('disconnect', function(){});
  });
})