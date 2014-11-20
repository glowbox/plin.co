function Board() {
  
  this.numPegs = 85;
  this.pegs = [];
  this.width = 36;
  this.height = 57.25;
  this.aspectRatio = this.width / this.height;
  this.pegs = [];

  this.init = function(){
    this.generatePegs();
  }

  this.generatePegs = function () {

    var xInterval = this.width / 8;
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
        this.pegs.push({x: pegX, y: pegY});
      }
    }
  }

  this.showPegs = function(clickHandler) {
    var svg = this.generateSVG(clickHandler);

    svg.style.position = "fixed";
    svg.style.left = "0px";
    svg.style.right = "0px";
    svg.style.width = "100%";
    svg.style.height = "100%";

    $(svg).attr("viewBox", "0 0 " + this.width + " " + this.height);
    $(svg).attr("width", "100%");
    $(svg).attr("height", "100%");
    document.body.appendChild(svg);
  }

  this.generateSVG = function(clickHandler) {
    two = new Two({
      type: Two.Types['svg'],
      width: this.width,
      height: this.height
    });

    Two.Resolution = 10;

    var boardBounds = two.makeRectangle(this.width / 2, this.height / 2, this.width, this.height);
    boardBounds.fill = 'rgba(255,255,255,0.15)';
    two.update();

    for(var i = 0; i < this.numPegs; i++){
      var peg = two.makeCircle(this.pegs[i].x, this.pegs[i].y, 0.25);
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

  this.getPinCoordinates = function(index) {
    return {
      x: this.pegs[index].x,
      y: this.pegs[index].y
    }
  }

  this.init();
}