$(function() {

  var two;
  var addShapesGroup;

  var squished = false;
  var num = parseInt(puckID, 32);

  var type = 'svg';
  two = new Two({
    type: Two.Types[type],
    fullscreen: true
  }).appendTo(document.body);

  Two.Resolution = 10;

  var pegGroup = two.makeGroup();
  var pegs = [];

  var blobs = [];
  var altered = false;

  var pegsHit = [];
  var runCurr = 0;
  var startTime = new Date().getTime() + 1000;

  for (var i = 0; i < 19; i++) {
    var peg = two.makeCircle((50*i+20) % (50*6+20) + 40, 20 + 50 * Math.floor(((i + 1) / 7)), 10);
    peg.fill = 'rgba(255, 255, 255, 1)';
    pegs.push(peg);
    two.update();
    pegGroup.add(peg);
    $(peg._renderer.elem)
      .css('cursor', 'pointer')
      .click(function(e) {
        var pegNum = $(this).index();
        pegHit(pegNum);
      });
  }

  for (i in "a") {
    var blob1 = two.makeCircle(two.width / 2, two.height / 2, two.height / 3);
    // blob1.curved = false;
    blob1.fill = 'rgba(255, 255, 255, 1)';
    blob1.noStroke();

    blobs.push(blob1);
  }

  addShapesGroup = two.makeGroup();
  var addShapesHolder = [];

  two
    .bind('update', function() {
      if (runCurr < runStats.length) {
        if (startTime + runStats[runCurr][0] * 1000 < new Date().getTime()) {
          pegHit(parseInt(runStats[runCurr][1]));
          runCurr++;
        }
      }
      if (!altered) {
        return;
      }
      for (var h = 0; h < blobs.length; h++) {
        if (!squished) {

          for (var i = 0; i < blobs[h].vertices.length; i++) {
            var v = blobs[h].vertices[i];
            var d = v.destination;

            if (v.equals(d)) {
              squished = true;
              break;
            }

            v.x += (d.x - v.x) * 0.125;
            v.y += (d.y - v.y) * 0.125;
          }

        }
      }
      return;

    }).play();

  function pegHit(pegNum) {
    console.log(pegNum);
    if (pegsHit.indexOf(pegNum) === -1) {
      pegsHit.push(pegNum);
      pegs[pegNum].fill = 'rgba(255, 255, 255, .5)';
      if (pegNum < 6) {
        altered = true;
        reset(blobs[0], pegNum);
      } else if (pegNum < 13) {
        changeColor(blobs[0], pegNum);
      } else {
        addShapes(blobs[0].offset, pegNum);
      }
    }
  }
  function reset(blob, offset) { 
    var tempNum = num;
    if (offset) {
      tempNum += offset;
    }
    console.log(tempNum);
    blob.translation.set(two.width / 2, two.height / 2);

    squished = false;

    for (var i = 0; i < blob.vertices.length; i++) {
      var mod = Math.abs(Math.cos(Math.abs(Math.cos(i + 40))));
      var radii = parseInt(((tempNum % (mod) / (mod) + .1) % 1 * 100), 10) / 100;
      if (radii === .5) {
        radii = .75;
      }
      var v = blob.vertices[i];
      var pct = (i + 1) / blob.vertices.length;
      var theta = pct * Math.PI * 2;
      var radius = radii * two.height / 3 + two.height / 6;
      var x = radius * Math.cos(theta);
      var y = radius * Math.sin(theta);
      // v.set(two.height / 3 * Math.cos(theta), two.height / 3 * Math.sin(theta));
      v.destination = new Two.Vector(x, y);
      v.step = Math.sqrt(1) + 2;
    }

  }

  function changeColor(blob, offset) {
    var tempNum = num;
    if (offset) {
      tempNum += offset;
    }
    blob.fill = 'rgba(' + ((tempNum * 19) % 255) + ', ' + ((tempNum * 85) % 255) + ', ' + ((tempNum * 3) % 255) + ', 1)';
  }

  function addShapes(blob, offset) {
    var tempNum = num;
    if (offset) {
      tempNum += offset;
    }
    var runningNum = tempNum;
    for (var i = 0; i < addShapesHolder.length; i++) {
      addShapesGroup.remove(addShapesHolder[i]);
    }

    for (var i = 0; i < tempNum % 4 + 4; i++) {
      var shape = two.makeCircle(two.width * ((runningNum % 100) / 100), two.height * ((runningNum * tempNum % 100) / 100), 20);
      shape.fill = 'rgba(' + ((runningNum * 19) % 255) + ', ' + ((runningNum * 85) % 255) + ', ' + ((runningNum * 3) % 255) + ', 1)';
      Two.Resolution = runningNum % 5 + 3;
      shape.curved = false;
      runningNum += Math.floor(offset);
      addShapesGroup.add(shape);
      addShapesHolder.push(shape);
    }
  }


  function querystring(key) {
     var re=new RegExp('(?:\\?|&)'+key+'=(.*?)(?=&|$)','gi');
     var r=[], m;
     while ((m=re.exec(document.location.search)) != null) r.push(m[1]);
     return r;
  }
});