function Board(showPegs, hitFunc) {
  this.pegsHit = [];



  this.numPegs = 85;
  this.pegRadius = 3;
  this.BOARD_RATIO = 36/57;

  this.viewportHeight = isLive ? 800 : window.innerHeight;
  this.viewportWidth = isLive ? (this.viewportHeight * this.BOARD_RATIO) : window.innerWidth;


  this.pegHeight = (this.viewportHeight - 50);
  this.pegWidth = this.pegHeight * this.BOARD_RATIO;
  if (this.viewportWidth < this.pegWidth) {
    this.pegWidth = (this.viewportWidth - 50);
    this.pegHeight = this.pegWidth / this.BOARD_RATIO;
  }
  this.pegs = [];
  this.pegSpacing = this.pegWidth / 7;
  this.pegOffsetX = (this.viewportWidth - this.pegWidth) / 2 + this.pegSpacing / 2;
  this.pegOffsetY = (this.viewportHeight - this.pegHeight) / 2;

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