/*!
 * 
 * grunt-nautilus
 * https://github.com/kitajchuk/grunt-nautilus
 *
 * Copyright (c) 2013 Brandon Kitajchuk
 * Licensed under the MIT license.
 *
 *
 */
(function ( window, undefined ) {


var app,
    
    // Keep track of controller modules
    controllers = [],
    
    // Keep track of executed modules
    executed = {},
    
    // Handle console fallback
    console = (window.console || {
        log: function () {}
    });


/**
 *
 * App {object}
 * @namespace app
 * @memberof! <global>
 *
 */
app = {};


/**
 *
 * Environment setting
 * @member env
 * @memberof app
 *
 */ 
app.env = "development";


/**
 *
 * Console.log polyfill
 * @method log
 * @memberof app
 *
 */
app.log = function () {
    var args = [].slice.call( arguments, 0 );
    
    if ( !/^dev/.test( app.env ) ) {
        return;
    }
    
    if ( !args.length ) {
        args.push( app );
        
    } else {
        args.unshift( "[App]:" );
    }
    
    // IE8 Doesn't support .call/.apply on console.log
    if ( console.log.apply ) {
        console.log.apply( console, args );
    }
};


/**
 *
 * Controller executor
 * @method exec
 * @param {string} module The name of the module controller to execute
 * @memberof app
 * @example app.exec( "foo" )
 *
 */
app.exec = function ( module ) {
    var moduleName = module;
    
    if ( app.controllers && app.controllers[ module ] ) {
        module = app.controllers[ module ];
        
    } else {
        module = undefined;
    }
    
    if ( executed[ moduleName ] ) {
            app.log( "Module " + moduleName + " already executed! Backing out..." );
            
    } else if ( module && (typeof module.init === "function") ) {
        module.init();
        
        executed[ moduleName ] = true;
    }
    
    return module;
};


/**
 *
 * Expose app to global scope
 *
 */
window.app = app;


})( window );
(function ( window, document, undefined ) {
  "use strict";
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
    var viz = new Visualization(board, parseInt(puckID.toLowerCase(), 36));

    function animate() {
      if (runCurr < runStats.length) {
        if (startTime + runStats[runCurr][0] * 1000 < new Date().getTime()) {
          viz.hit(runCurr, parseInt(runStats[runCurr][1]));
          runCurr++;
        }
      }
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
    }
  }
})( window, window.document );