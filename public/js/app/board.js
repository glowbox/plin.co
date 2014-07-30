function Board(showPegs, hitFunc) {
  this.pegsHit = [];

  this.numPegs = 85;
  this.pegRadius = 3;
  this.BOARD_RATIO = 37/58;
  if (!isLive) {
    this.boardHeight = window.innerHeight;
    this.boardWidth = this.boardHeight * this.BOARD_RATIO;
    if (window.innerWidth < window.innerHeight) {
      this.boardWidth = window.innerWidth;
      this.boardHeight = this.boardWidth / this.BOARD_RATIO;
    }
    this.pegHeight = this.boardHeight * (13*4.5*.866666 / 58);
    this.pegWidth = this.boardWidth * (27 / 36);
    this.pegs = [];
    this.pegSpacing = this.pegWidth / 6;
    this.pegOffsetX = (window.innerWidth - this.pegWidth) / 2;
    this.pegOffsetY = (window.innerHeight - this.pegHeight) / 2;
  } else {
    this.boardHeight = 800;
    this.boardWidth = this.boardHeight * this.BOARD_RATIO;
    this.pegHeight = this.boardHeight * (13*4.5*.866666 / 58);
    this.pegWidth = this.boardWidth * (27 / 36);
    // console.log(this.pegWidth);
    // if (this.boardWidth < this.pegWidth) {
    //   this.pegWidth = (this.boardWidth - 50);
    //   this.pegHeight = this.pegWidth / this.BOARD_RATIO;
    // }
    // console.log(this.pegWidth);
    this.pegs = [];
    this.pegSpacing = this.pegWidth / 6;
    this.pegOffsetX = this.pegSpacing + this.pegSpacing / 18;
    this.pegOffsetY = this.pegSpacing * .8666666 * 2;
  }

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
      var y = Math.floor(i / 13) * (this.pegSpacing * .866666667 * 2) + this.pegOffsetY + (this.pegSpacing * .8666) * 1.5;
      if (isLive) {
        y = Math.floor(i / 13) * (this.pegSpacing * .866666667 * 2) + this.pegOffsetY;
      }
      if (localPin <= 6) {
        var num = i;
        if (i === 65) {
          num = 0;
        }
        x = (num /13 * overallWidth) % overallWidth + this.pegOffsetX;
        y -= this.pegSpacing * .866666667;
      } else {
        x = (i /13 * overallWidth) % overallWidth - (overallWidth / 2)  + this.pegOffsetX;
      }

      if (showPegs) {
        var peg = two.makeCircle(x, y, this.pegRadius);
        peg.fill = 'rgba(255, 255, 255, 1)';
        two.update();
        $(peg._renderer.elem)
          .css('cursor', 'pointer')
          .click(hitFunc);
      }
      this.pegs.push({x: x, y: y});
    }
  }

  this.getPinCoordinates = function(index) {
    return {
      x: this.pegs[index].x,
      y: this.pegs[index].y
    }
  }
  this.init();
}