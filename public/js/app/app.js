var two;
var canvas;
var context;

$(function() {

  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');

  SHOW_PEGS = true;

  var runCurr = 0;
  var startTime = new Date().getTime() + 1000;

  if (SHOW_PEGS) {
    two = new Two({
      type: Two.Types['svg'],
      fullscreen: true
    }).appendTo(document.body);

    Two.Resolution = 10;
  }

  var board = new Board(SHOW_PEGS);
  //var viz = new Visualization(board, parseInt(puckID.toLowerCase(), 36));
  //var viz = new ParticleEsplode(board, parseInt(puckID.toLowerCase(), 36));
  var viz = new VoronoiViz(board, parseInt(puckID.toLowerCase(), 36));

  function animate() {
    if (runCurr < runStats.length) {
      if (startTime + runStats[runCurr][0] * 1000 < new Date().getTime()) {
        viz.hit(runCurr, parseInt(runStats[runCurr][1]));
        runCurr++;
      }
    }
    viz.render();
    requestAnimationFrame(animate);
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  animate();
});






function Board(showPegs) {
  this.pegsHit = [];

  this.numPegs = 78;
  this.pegRadius = 3;
  this.BOARD_RATIO = 36/46.8;
  this.pegHeight = (window.innerHeight - 50);
  this.pegWidth = this.pegHeight * this.BOARD_RATIO;
  if (window.innerWidth < this.pegWidth) {
    this.pegWidth = (window.innerWidth - 50);
    this.pegHeight = this.pegWidth / this.BOARD_RATIO;
  }
  this.pegs = [];
  this.pegSpacing = this.pegWidth / 6;
  this.pegOffsetX = (window.innerWidth - this.pegWidth) / 2;
  this.pegOffsetY = (window.innerHeight - this.pegHeight) / 2;

  this.init = function() {
    if (showPegs) {
      two = new Two({
        type: Two.Types['svg'],
        fullscreen: true
      }).appendTo(document.body);

      Two.Resolution = 10;
    }
    for (var i = 0; i < this.numPegs; i++) {
      var localPin = i % 13;
      var overallWidth = 13 * this.pegSpacing;
      var x = 0;
      var y = Math.floor(i / 13) * (this.pegSpacing * .866666667 * 2) + this.pegOffsetY + (this.pegSpacing * .8666);
      if (localPin <= 6) {
        var num = i;
        if (i === 65) {
          num = 0;
        }
        x = (num /13 * overallWidth) % overallWidth + this.pegOffsetX + this.pegSpacing/2;
        y -= this.pegSpacing * .866666667;
      } else {
        x = (i /13 * overallWidth) % overallWidth - (overallWidth / 2)  + this.pegOffsetX + this.pegSpacing/2;
      }

      if (showPegs) {
        var peg = two.makeCircle(x, y, this.pegRadius);
        peg.fill = 'rgba(255, 255, 255, ' + i/this.numPegs + ')';
        two.update();
        $(peg._renderer.elem)
          .css('cursor', 'pointer')
          .click(function(e) {
            var pegNum = $(this).index();
            pegHit(pegNum);
          });
      }
      this.pegs.push({x: x, y: y});
    }
  }

  this.getPinCoordinates = function(index) {
    return {
      x: this.pegs[index].x + this.pegOffsetX,
      y: this.pegs[index].y + this.pegOffsetY
    }
  }
  this.init();
}






function Visualization(board, puckID) {
  this.board = board;
  this.puckID = puckID;
  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);
    context.beginPath();
    context.arc(coor.x, coor.y, 20, 0, 2 * Math.PI, false);
    context.fillStyle = 'rgb(' +
      Math.floor((this.puckID * (runCurr + 1) * 17)) % 255 + ',' +
      Math.floor((this.puckID * (runCurr + 1) * 25)) % 255 + ',' +
      Math.floor((this.puckID * (runCurr + 1) * 40)) % 255 + ')';
    context.fill();
  },
  this.render = function() {

  }
}