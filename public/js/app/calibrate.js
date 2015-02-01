var currCircle;
var lastCircle;

var selectedPegIndex = 0;

var changedPegs = [];
var board;

$(function() {
  
  board = new Board();

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

  function setSelectedPeg(index) {

    selectedPegIndex = index;
    console.log("Setting selected peg: " + index);
    var coors = board.getPinCoordinates(index);

    currCircle.translation.x = coors.x;
    currCircle.translation.y = coors.y;

    currCircle.visible = true;
    lastCircle.visible = false;
    
    var mapped = [];
    for(var m in map) {
      if(map[m] == index) {
        mapped.push(m);
      }
    }
    var mapList = (mapped.length > 0) ? mapped.join(', ') : "NONE";
    $("#selected-peg-index").html(index + ' (mapped code: ' + mapList + ')'); 
  }

  var boardSvg = board.showPegs(function(e) {
    setSelectedPeg(parseInt($(this).attr("data-index"), 10));
  });

  $('.save-calib').bind('touch, mousedown', function(e) {
    var response = confirm("Are you ABSOLUTELY SURE you want to save?");
    if(response){
      $.post("/save-calibration", {'map': JSON.stringify(map) });
      changedPegs = [];
      updatePegState();
    }
  });





  $(document.body).on('keydown', function(e){
    if(e.keyCode == 9){
      selectedPegIndex++;
      if(selectedPegIndex >= board.numPegs){
        selectedPegIndex = 0;
      }
      setSelectedPeg(selectedPegIndex);
      e.preventDefault();
      return false;
    }
  })


  var socket = io('http://localhost', { transports: ['websocket'] } );
  socket.on('connect', function() {
    socket.on('peg', function(data) {
      var coors = board.getPinCoordinates(selectedPegIndex);
      
      lastCircle.translation.x = coors.x;
      lastCircle.translation.y = coors.y;

      lastCircle.scale = 1.5;
      lastCircle.visible = true;

      // remove any instances of this peg.
      for(var code in map){
        if(map[code] == selectedPegIndex){
          map[code] = -1;
        }
      }

      console.log(data);

      map[data.raw] = selectedPegIndex;
      changedPegs.push(selectedPegIndex);

      updatePegState();
    });
    
    socket.on('disconnect', function(){});
  });

  updatePegState();
})

function checkIntegrity() { 
  var missingPegs = [];
  var missingCodes = [];
  var duplicatePegs = [];

  // Make sure there are 85 codes.
  for(var code = 0; code < 85; code++){
    if(!map.hasOwnProperty(code)) {
      missingCodes.push(code);
    }
  }

  // Make sure one of each peg exists in the map.
  for(var peg = 0; peg < 85; peg++) {
    
    var found = false;
    var count = 0;

    var pegMapping = [];

    for(var code in map) {
      if(map[code] == peg) {
        count++;
        pegMapping.push(code);
        found = true;
      }
    }
    
    if(count > 1){
      duplicatePegs.push(peg + '=>' + pegMapping.join(", "));        
    }

    if(!found){
      missingPegs.push(peg);
    }
  }

  console.log("Missing codes:" + missingCodes.join(", "))
  console.log("Missing pegs:" + missingPegs.join(", "))
  console.log("Duplicate pegs:" + duplicatePegs.join("| "))
}

function resetPegs() {
  for(var peg = 0; peg < 85; peg++) {
    map[peg] = -1;
  }
}

  function updatePegState(){
    for(var i = 0; i < board.numPegs; i++){
      var color = 'rgba(255,0,0,1)';
      
      var count = 0;
      for(var code in map){
        if(map[code] == i) {
          count++;
        }
      }
      if(count == 1) {
        color = 'rgba(255,255,255,1)';
      } else if(count > 1) {
        color = 'rgba(255,128,0,1)';
      }

      if(changedPegs.indexOf(i) != -1){
        color = 'rgba(0, 200, 200,1)';
      }

      $('#peg-' + i).attr('fill', color);
    }
  }