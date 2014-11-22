Physics.renderer('plinco', function(proto) {
  
  var ctx = null;
  var worldScale = 1;
  var twoPi = 2 * Math.PI;

  return {
    'setContext' : function(c){
      ctx = c;
    },

    'createView' : function() {
      return false;
    },

    'init' : function(options) {
       var self = this;
       if(options.worldScale){
        worldScale = 1 / options.worldScale;
       }
      
       // call proto init
       proto.init.call(this, options);
    },

    'drawMeta' : function(meta) {
    },

    'beforeRender' : function() {
      // Called at the start of each frame. Set up the
      // canvas context to match the world scale.
      if(ctx){
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.scale(worldScale, worldScale);
      }
    },

    'drawBody' : function(body){
      if(ctx) {
        ctx.fillStyle = body.styles.fillStyle;
        switch(body.name){
          case 'circle':
            ctx.beginPath();
            ctx.arc(body.state.pos.x, body.state.pos.y, body.radius, 0, twoPi, false);
            ctx.fill();
          break;

          case 'rectangle':
            ctx.save();
            ctx.translate(body.state.pos.x, body.state.pos.y);
            ctx.rotate(body.state.angular.pos);
            ctx.fillRect(body.width / -2, body.height / -2, body.width, body.height);
            ctx.restore();
          break;

          case 'convex-polygon':
            ctx.save();
            ctx.translate(body.state.pos.x, body.state.pos.y);
            ctx.rotate(body.state.angular.pos);
            ctx.lineWidth = 0;
            ctx.beginPath();
            ctx.moveTo(body.geometry.vertices[0].x, body.geometry.vertices[0].y);
            for(var i = 1; i < body.geometry.vertices.length; i++){
              ctx.lineTo(body.geometry.vertices[i].x, body.geometry.vertices[i].y);
            }
            ctx.fill();
            ctx.restore();
          break;

          default:
           // Unknown body type
          break;
        }
      }
    }
  }
});

Physics.behavior('pin-constraints', function( parent ) {
  return {
      init: function( opts ){
          parent.init.call( this, opts );
          this.pins = [];
      },
      
      add: function( body, targetPos ){
          this.pins.push({
              body: body,
              target: Physics.vector( targetPos )
          });
      },
      
      behave: function( data ){
          
          var pins = this.pins
              ,pin;
          
          for (var i = 0, l = pins.length; i < l; i++){
              pin = pins[ i ];
              // move body to correct position
              pin.body.state.pos.clone( pin.target );
              pin.body.state.angular.pos = 0;
          }
      }
  };
});

function ParticleEsplode(board, puckID) {
  
  Math.random = new Math.seedrandom(puckID);

  this.physicsTime = 100000; // fake "time" for physics..
  var self = this;
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 7000;
  this.framesPerSecond = 10;

  var worldScale = 10;
  this.useDefaultRenderer = false;

  this.hideObsticles = false;
  this.geometry = [];


  var scheme = new ColorScheme;
  scheme.from_hue(Math.floor(Math.random() * 360))
    .scheme('tetrade')
    .distance(0.5)
    .add_complement(false)
    .variation('light')
    .web_safe(false);
  /*var colorValues = scheme.colors();
  this.colors = [];
  for (var i = 0; i < colorValues.length; i++) {
    var rgb = hexToRgb(colorValues[i]);
    this.colors.push([ rgb.r, rgb.g, rgb.b ]);
  }*/
  this.colors = scheme.colors();

  this.renderer = Physics.renderer('plinco', {
    'worldScale' : worldScale
  });


  this.world = new Physics.world({
      'integrator': 'verlet'
    }, 
    function(w, physics){
      w.add(Physics.behavior('constant-acceleration'));
      w.add(Physics.behavior('body-collision-detection'));
      w.add(Physics.behavior('body-impulse-response'));
      w.add(Physics.behavior('sweep-prune'));

      w.add(Physics.integrator('verlet', {
        drag: 0.01
      }));

      var bounds = Physics.aabb(0, 0, board.width * worldScale, board.height * worldScale);

      w.add(Physics.behavior('edge-collision-detection', {
          aabb: bounds,
          restitution: 0.5,
          cof: 0.9
      }));
    });

if(this.useDefaultRenderer) {
  var c = document.createElement("canvas");
  c.width= 800;
  c.height = 1500;
  c.style.left = "0px";
  c.id = 'tmp-canvas';
  document.body.appendChild(c);
    this.world.add(Physics.renderer('canvas', {
          el: c,
          width: board.width * worldScale,
          height: 1500
      }));
} else {
  this.world.add( this.renderer );
}

  /*
  addBody is a wrapper to scale from board units (inches) into an arbitrary
  world scale for the physics engine.

  This is needed because the physics engine does not behave well
  at small scales for some reason.  worldScale is pretty arbitrary but 
  generally the larger the scale, the more sluggish and dosile the movement.
  */
  this.addBody = function(type, options) {
    var initOptions = {
      'x': options.x * worldScale,
      'y': options.y * worldScale,
      'vx': options.vx * worldScale,
      'vy': options.vy * worldScale,
      'styles': options.styles,
      'mass' : options.mass,
      'restitution' : options.restitution,
      'hidden' : options.hidden
    };
    initOptions.cof = 0.1;
    
    switch(type){
      case 'circle':
        initOptions.radius = options.radius * worldScale;
      break;
      case 'rectangle':
        initOptions.width = options.width * worldScale;
        initOptions.height = options.height * worldScale;

      break;
      case 'convex-polygon':
        initOptions.vertices = [];
        for(var i = 0; i < options.vertices.length; i++){
          initOptions.vertices.push( {
            'x': options.vertices[i].x * worldScale,
            'y': options.vertices[i].y * worldScale,
          })
        }
      break;
    }

    var body = Physics.body(type, initOptions);

    this.geometry.push(body);
    this.world.add(body);

    return body;
  }

  this.addObsticles = function() {
    var pinConstraints = Physics.behavior('pin-constraints');
    
    // Add stationary pins
    for (var i = 0; i < board.numPegs; i++) {
      var coors = board.getPinCoordinates(i);
      var pin = this.addBody('circle', {
          x: coors.x,
          y: coors.y,
          radius: 0.15,
          hidden: this.hideObsticles,
          mass:100000,
          styles :{
            fillStyle : "#808080"
          },
          restitution: 0.5,
      } )
      pinConstraints.add(pin, pin.state.pos);
    }


    // Vertical baffles (TODO: Re-add these? Needs to be updated
    // if (i < 7) {
    //   var baffle = Physics.body('rectangle', {
    //       x: coors.x,
    //       y: window.innerHeight - (board.pegSpacing * .8) / 2,
    //       width: board.pegSpacing / 6,
    //       height: (board.pegSpacing * .8),
    //       mass: 10000000000,
    //       styles: {
    //           fillStyle: '#999999',
    //           angleIndicator: 'none'
    //       },
    //       hidden: self.hideGeometry,
    //       fixed: true,
    //       cof: 0,
    //       restitution: .8

    //       // restitution: 0.9
    //   });
    //   self.geometry.push(baffle);
    //   world.add(baffle);
    //   self.baffle.push(baffle);
    //   pinConstraints.add(baffle, baffle.state.pos);
    // }

    
    // Add triangular baffles
    var halfX = board.pegSpacingX / 2;
    var vertsLeft = [
      { 'x': 0, 'y': -board.pegSpacingY },
      { 'x': halfX, 'y': 0 },
      { 'x': 0, 'y': board.pegSpacingY }
    ];
    var vertsRight = [
      { 'x': halfX, 'y':  -board.pegSpacingY },
      { 'x': halfX, 'y': board.pegSpacingY },
      { 'x': 0, 'y': 0 }
    ];

    for(var i = 0; i < 6; i++) {
      var top = board.pegSpacingX + board.pegSpacingY + (i * board.pegSpacingY * 2);

      var bumperLeft = this.addBody('convex-polygon', {
        vertices : vertsLeft,
        x: halfX / 2,
        y: top,
        vx: 0,
        vy: 0,
        angle: 0,
        restitution: 0.0,
        mass:1000,
        hidden: this.hideObsticles,
        styles: {
          fillStyle: '#FF0000'
        }
      });

      pinConstraints.add(bumperLeft, bumperLeft.state.pos);

      var bumperRight = this.addBody('convex-polygon', {
        vertices : vertsRight,
        x: board.width - (halfX / 2),
        y: top,
        vx:0,
        vy:0,
        angle: 0,
        restitution: 0.0,
        mass:1000,
        hidden: this.hideObsticles,
        styles: {
          fillStyle: '#FF0000'
        }
      });

      pinConstraints.add(bumperRight, bumperRight.state.pos);
    }

    this.world.add(pinConstraints);
  }
 
  this.addObsticles();

  this.addParticles = function(x, y, runCurr) {
    for(var i = 0; i < 3; i++){
      var colorIndex = Math.floor(Math.random() * this.colors.length);
      if(Math.random() > 0.5){
        var r = Math.random() * 0.75 + 0.5;
        this.addBody('circle', {
          x: x + ((Math.random() > 0.5) ? 0.25 : -0.25),
          y: y - (r * 2) - 0.2,
          vy: -Math.random() * 0.05,
          vx: Math.random() * 0.1 - 0.05,
          radius: r,
          mass: 1,
          styles: {
              fillStyle: "#" + this.colors[colorIndex],
              angleIndicator: 'none'
          },
          restitution: 0.3
        });
      } else {
        var bh = Math.random() * 2 + 0.25;
        var bw = Math.random() * 2 + 0.25;
        this.addBody('rectangle', {
          x: x + ((Math.random() > 0.5) ? 0.25 : -0.25),
          y: y - bh - 0.15,
          vy: -Math.random() * 0.05,
          vx: Math.random() * 0.1 - 0.05,
          width: bw,
          height: bh,
          mass: 1,
          styles: {
              fillStyle: "#" + this.colors[colorIndex],
              angleIndicator: 'none'
          },
          restitution: 0.3
        });
      }
    }
  }

  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);
    this.addParticles(coor.x , coor.y, runCurr);
  },

  this.render = function(context, delta) {
    this.physicsTime += delta;
    this.world.step(this.physicsTime);
    if(!this.useDefaultRenderer){
      this.renderer.setContext(context);
    }
    this.world.render();
  }

  this.destroy = function() {
    for (var i = 0; i < this.geometry.length; i++) {
      this.world.remove(this.geometry[i]);
    }
  }
}