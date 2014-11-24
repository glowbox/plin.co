var Bird = function () {

  var scope = this;

  THREE.Geometry.call( this );

  v(   4,   0,   0 );
  v( - 5, - 2,   1 );
  v( - 5,   0,   0 );
  v( - 5, - 2, - 1 );

  v(   0,   2, - 6 );
  v(   0,   2,   6 );
  v(   2,   0,   0 );
  v( - 3,   0,   0 );

  f3( 0, 2, 1 );
  // f3( 0, 3, 2 );

  f3( 4, 7, 6 );
  f3( 5, 6, 7 );

  this.computeFaceNormals();

  function v( x, y, z ) {

    scope.vertices.push( new THREE.Vector3( x, y, z ) );

  }

  function f3( a, b, c ) {

    scope.faces.push( new THREE.Face3( a, b, c ) );

  }

}

Bird.prototype = Object.create( THREE.Geometry.prototype );

var Boid = function() {

    var vector = new THREE.Vector3(),
    _acceleration, _width = 80, _height = 80, _depth = 50, _goal, _neighborhoodRadius = 1,
    _maxSpeed = 0.2, _maxSteerForce = 0.01, _avoidWalls = true;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    _acceleration = new THREE.Vector3();

    this.setGoal = function ( target ) {

        _goal = target;

    }

    this.setAvoidWalls = function ( value ) {
        _avoidWalls = value;
    }

    this.setWorldSize = function ( width, height, depth ) {

        _width = width;
        _height = height;
        _depth = depth;

    }

    this.run = function ( boids ) {

        if ( _avoidWalls ) {

            var speed = 1;

            vector.set( - _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( speed );
            _acceleration.add( vector );

            vector.set( _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( speed );
            _acceleration.add( vector );

            vector.set( this.position.x, - _height, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( speed );
            _acceleration.add( vector );

            vector.set( this.position.x, _height, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( speed );
            _acceleration.add( vector );

            vector.set( this.position.x, this.position.y, - _depth );
            vector = this.avoid( vector );
            vector.multiplyScalar( speed );
            _acceleration.add( vector );

            vector.set( this.position.x, this.position.y, _depth );
            vector = this.avoid( vector );
            vector.multiplyScalar( speed );
            _acceleration.add( vector );

        }/* else {

            this.checkBounds();

        }
        */

        if ( Math.random() > 0.5 ) {

            this.flock( boids );

        }

        this.move();

    }

    this.flock = function ( boids ) {

        if ( _goal ) {

            _acceleration.add( this.reach( _goal, 0.005 ) );

        }

        _acceleration.add( this.alignment( boids ) );
        _acceleration.add( this.cohesion( boids ) );
        _acceleration.add( this.separation( boids ) );

    }

    this.move = function () {

        this.velocity.add( _acceleration );

        var l = this.velocity.length();

        if ( l > _maxSpeed ) {

            this.velocity.divideScalar( l / _maxSpeed );

        }

        this.position.add( this.velocity );
        _acceleration.set( 0, 0, 0 );

    }

    this.checkBounds = function () {

        if ( this.position.x >   _width ) this.position.x = - _width;
        if ( this.position.x < - _width ) this.position.x =   _width;
        if ( this.position.y >   _height ) this.position.y = - _height;
        if ( this.position.y < - _height ) this.position.y =  _height;
        if ( this.position.z >  _depth ) this.position.z = - _depth;
        if ( this.position.z < - _depth ) this.position.z =  _depth;

    }

    //

    this.avoid = function ( target ) {

        var steer = new THREE.Vector3();

        steer.copy( this.position );
        steer.sub( target );

        steer.multiplyScalar( 1 / this.position.distanceToSquared( target ) );

        return steer;

    }

    this.repulse = function ( target ) {

        var distance = this.position.distanceTo( target );

        if ( distance < 1 ) {

            var steer = new THREE.Vector3();

            steer.subVectors( this.position, target ).normalize();
            steer.multiplyScalar( 1 / distance );

            _acceleration.sub( steer );

        }

    }

    this.reach = function ( target, amount ) {

        var steer = new THREE.Vector3();

        steer.subVectors( target, this.position );
        steer.multiplyScalar( amount );

        return steer;

    }

    this.alignment = function ( boids ) {

        var boid, velSum = new THREE.Vector3(),
        count = 0;

        for ( var i = 0, il = boids.length; i < il; i++ ) {

            if ( Math.random() > 0.6 ) continue;

            boid = boids[ i ];

            distance = boid.position.distanceTo( this.position );

            if ( distance > 0 && distance <= _neighborhoodRadius ) {

                velSum.add( boid.velocity );
                count++;

            }

        }

        if ( count > 0 ) {

            velSum.divideScalar( count );

            var l = velSum.length();

            if ( l > _maxSteerForce ) {

                velSum.divideScalar( l / _maxSteerForce );

            }

        }

        return velSum;

    }

    this.cohesion = function ( boids ) {

        var boid, distance,
        posSum = new THREE.Vector3(),
        steer = new THREE.Vector3(),
        count = 0;

        for ( var i = 0, il = boids.length; i < il; i ++ ) {

            if ( Math.random() > 0.6 ) continue;

            boid = boids[ i ];
            distance = boid.position.distanceTo( this.position );

            if ( distance > 0 && distance <= _neighborhoodRadius ) {

                posSum.add( boid.position );
                count++;

            }

        }

        if ( count > 0 ) {

            posSum.divideScalar( count );

        }

        steer.subVectors( posSum, this.position );

        var l = steer.length();

        if ( l > _maxSteerForce ) {

            steer.divideScalar( l / _maxSteerForce );

        }

        return steer;

    }

    this.separation = function ( boids ) {

        var boid, distance,
        posSum = new THREE.Vector3(),
        repulse = new THREE.Vector3();

        for ( var i = 0, il = boids.length; i < il; i ++ ) {

            if ( Math.random() > 0.6 ) continue;

            boid = boids[ i ];
            distance = boid.position.distanceTo( this.position );

            if ( distance > 0 && distance <= _neighborhoodRadius ) {

                repulse.subVectors( this.position, boid.position );
                repulse.normalize();
                repulse.divideScalar( distance );
                posSum.add( repulse );

            }

        }

        return posSum;

    }

}

function BirdsViz(board, puckID) {
  var self = this;
  this.board = board;
  this.puckID = puckID;
  this.double = true;

  this.gifLength = 12000;
  this.framesPerSecond = 4;
  this.name = "birds";
  
  this.birds = [];
  this.pegs = [];
  var bird;

  this.boids = [];
  this.locations = [];
  var boid;

  this.init = function() {
      //canvas.className = 'invert';
      var z = Math.random() * 40 - 20;
      z = 0;
      //var coor = board.getPinCoordinates(68);
      var startPoint = new THREE.Vector3( 0, 0, 0);
      for ( var i = 0; i < 100; i ++ ) {
        boid = this.boids[ i ] = new Boid();
        // boid.position.x = Math.random() * 400 - 200;
        // boid.position.y = Math.random() * 800 - 400;
        boid.position.z = Math.random() * 400 - 200;
        boid.position.x = startPoint.x;
        boid.position.y = 0;
        boid.position.z = startPoint.y;
        boid.velocity.x = Math.random() * 2 - 1;
        boid.velocity.y = Math.random() * 2 - 1;
        boid.velocity.z = Math.random() * 2 - 1;
        boid.setGoal(startPoint);
        boid.setAvoidWalls( true );
        boid.setWorldSize( 300, 600, 400 );

        bird = this.birds[ i ] = new THREE.Mesh( new Bird(), new THREE.MeshLambertMaterial( { color:'#ffffff', side: THREE.DoubleSide } ) );
        bird.scale.set(0.1,0.1,0.1);
        bird.phase = Math.floor( Math.random() * 62.83 );
        scene.add( bird );
      }

      var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
        hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        hemiLight.position.set( 0, 500, 0 );
        scene.add( hemiLight );

      var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( -1, 1.75, 1 );
        dirLight.position.multiplyScalar( 50 );
        scene.add( dirLight );
     // scene.add(new THREE.HemisphereLight());

      plane = new THREE.Mesh(
          new THREE.PlaneBufferGeometry( board.width, board.height, 8, 8 ),
          new THREE.MeshBasicMaterial( { emissive: 0x00ff00,wireframe:true, opacity: 1, transparent: true } )
      );
      plane.visible = false;
      scene.add( plane );

      var v3 = new THREE.Vector3();

      for(var i = 0; i < board.pegs.length; i++){
        var coor = board.getPinCoordinates(i);

        v3.set( ((coor.x / board.width) * 2) - 1, ((coor.y / board.height) * 2) - 1, camera.near);
        v3.y *= -1;
        v3.unproject(camera);

        var raycaster = new THREE.Raycaster( camera.position, v3.sub( camera.position ).normalize() );
        var intersects = raycaster.intersectObject( plane );

        if(intersects.length ){
          var peg = new THREE.Mesh( new THREE.BoxGeometry(0.1,0.1,1), new THREE.MeshBasicMaterial( { color:'#ffff00'} ) );
          peg.position.copy(intersects[ 0 ].point);
          peg.position.z = 0;
          peg.name = "peg"+i;
          peg.visible = false;
          scene.add(peg);
        }
      }
      
  }

  function onWindowResize() {

      camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
      camera.updateProjectionMatrix();

      renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

  }

  function onDocumentMouseDown( event ) {
      

  }

  this.render = function(ctx) {
    
    //context.fillStyle = 'black';
    //context.fillRect(0, 0, canvas.width, canvas.height);
    //console.log("Birds:" + this.birds.length);
    for ( var i = 0, il = this.birds.length; i < il; i++ ) {
      boid = this.boids[ i ];
      boid.run( this.boids );

      bird = this.birds[ i ];
      bird.position.copy( this.boids[ i ].position );

      color = bird.material.color;
      bird.material.opacity = 1;// - ( 500 - bird.position.z ) / 1000;
      // color.r = color.g = color.b = ( 500 - bird.position.z ) / 1000;

      bird.rotation.y = Math.atan2( - boid.velocity.z, boid.velocity.x );
      bird.rotation.z = Math.asin( boid.velocity.y / boid.velocity.length() );

      bird.phase = ( bird.phase + ( Math.max( 0, bird.rotation.z ) + 0.1 )  ) % 62.83;
      bird.geometry.vertices[ 5 ].y = bird.geometry.vertices[ 4 ].y = Math.sin( bird.phase ) * 5;
    }

    for(var i = 0; i < this.pegs.length; i++){
      this.pegs[i].rotation.y += 0.01;
      this.pegs[i].rotation.z += 0.02141;
    }
  }

  this.hit = function(runCurr, index) {
    var peg = new THREE.Mesh( new THREE.BoxGeometry(1,1,1), new THREE.MeshPhongMaterial( { sides:THREE.BothSides, transparent:true, opacity:0.6, color:'#ff0000', shininess:90} ) );
    peg.position.copy(scene.getObjectByName("peg"+index).position);
    scene.add(peg);
    this.pegs.push(peg);
    peg.rotation.y = Math.random() * Math.PI * 2;
    peg.rotation.z = Math.random() * Math.PI * 2;
    this.locations.push(peg.position.clone());

    //console.log(SCREEN_HEIGHT_HALF, coor, vector);
    for ( var i = 0, il = self.boids.length; i < il; i++ ) {
        boid = self.boids[ i ];
        //vector.z = boid.position.z;
        // boid.repulse( vector );
        boid.setGoal(this.locations[Math.floor(Math.random() * this.locations.length)]);

    }
  }

  this.destroy = function() {
    console.log("Destroying birds.");
    for ( var i = 0; i < this.birds.length; i++ ) {
      scene.remove(viz.birds[i]);
    }
    this.birds = [];
    this.boids = [];
  }

  this.init();
}