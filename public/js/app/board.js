function Board(showPegs, hitFunc) {
  
  this.canvas;
  this.pegsHit = [];
  this.numPegs = 85;
  this.pegRadius = 3;
  this.BOARD_RATIO = 36 / 57.25;

  // TODO: Remove isLive - the board as a data structure should not have any knowledge of the context within which 
  // it is being used.  We should refactor this class to accept width/height as part of the constructor and let
  // the user of this class decide what dimensions to pass in.

  if (!isLive) {
    this.boardHeight = window.innerHeight;
    this.boardWidth = this.boardHeight * this.BOARD_RATIO;
    if (window.innerWidth < window.innerHeight) {
      // this.boardWidth = window.innerWidth;
      // this.boardHeight = this.boardWidth / this.BOARD_RATIO;
    }
    this.pegHeight = this.boardHeight * (13*4.5*.866666 / 58);
    this.pegWidth = this.boardWidth * (27 / 36);
    this.pegs = [];
    this.pegSpacing = this.pegWidth / 6;
    this.pegOffsetX = (window.innerWidth - this.pegWidth) / 2;
    this.pegOffsetY = (window.innerHeight - this.pegHeight) / 2;
  } else {
    this.boardHeight = 1920;
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


  this.generatePegs = function (boardWidth) {

    var physicalRatio = 36 / 57.25; // taken from real life measurements..
    var boardHeight = boardWidth / physicalRatio;

    this.pegs2 = [];

    var xInterval = boardWidth / 8;
    var yInterval = 0.5 * Math.sqrt(3) * xInterval; 
    var rows = 13;

    // loop through all rows.
    for(var y = 0; y < rows; y++){

      var isAlternateRow = (y % 2) == 1;

      var cols =    isAlternateRow ? 6 : 7; // Column count alternates every other row.
      var xOffset = isAlternateRow ? (xInterval * 1.5) : xInterval; // xOffset alternates by an extra 0.5 every other row.
      var yOffset = xInterval; // Pegs are offset from the top by the same amount as the X spacing.

      // loop through all columns for this row.
      for(var x = 0; x < cols; x++){
        var pegX = (x * xInterval) + xOffset;
        var pegY = (y * yInterval) + yOffset;
        this.pegs2.push({x: pegX, y: pegY});
      }
    }

    if(showPegs){
      var svg = this.generateSVG(boardWidth, boardHeight, hitFunc);
      svg.style.position = "fixed";
      svg.style.left = "0px";
      svg.style.right = "0px";
      document.body.appendChild(svg);
    }
  }

  this.generateSVG = function(boardWidth, boardHeight, clickHandler) {
    two = new Two({
      type: Two.Types['svg'],
      width: boardWidth,
      height: boardHeight
    });

    Two.Resolution = 10;

    var boardBounds = two.makeRectangle(boardWidth / 2, boardHeight / 2, boardWidth, boardHeight);
    boardBounds.fill = 'rgba(255,255,255,0.15)';
    two.update();

    for(var i = 0; i < this.numPegs; i++){
      var peg = two.makeCircle(this.pegs2[i].x, this.pegs2[i].y, 5);
      peg.fill = 'rgba(255, 255, 255, 1)';
      two.update();

      if(typeof(clickHandler) == 'function'){
        $(peg._renderer.elem).attr("data-index", i);
        $(peg._renderer.elem)
          .css('cursor', 'pointer')
          .click(clickHandler);
      }
    }

    return two.renderer.domElement;
  }

  this.init = function() {
    this.generatePegs(this.boardWidth);
    this.pegs = this.pegs2;
    return;

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
        $(peg._renderer.elem).attr("data-index", i);
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