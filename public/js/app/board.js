function Board(showPegs, hitFunc) {
  this.pegsHit = [];

  this.numPegs = 85;
  this.pegRadius = 3;
  this.BOARD_RATIO = 37/58;
  var tempHeight = isLive ? 800 : window.innerHeight;
  var tempWidth = isLive ? (tempHeight * this.BOARD_RATIO) : window.innerHeight;
  this.pegHeight = tempHeight * (13*4.5*.866666 / 58);
  this.pegWidth = tempWidth * (27 / 36);
  console.log(this.pegWidth);
  // if (tempWidth < this.pegWidth) {
  //   this.pegWidth = (tempWidth - 50);
  //   this.pegHeight = this.pegWidth / this.BOARD_RATIO;
  // }
  console.log(this.pegWidth);
  this.pegs = [];
  this.pegSpacing = this.pegWidth / 6;
  this.pegOffsetX = this.pegSpacing + this.pegSpacing / 18;
  this.pegOffsetY = this.pegSpacing * .8666666 * 2;

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
      var y = Math.floor(i / 13) * (this.pegSpacing * .866666667 * 2) + this.pegOffsetY;
      if (localPin <= 6) {
        var num = i;
        if (i === 65 || i === 39 || i == 78) {
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