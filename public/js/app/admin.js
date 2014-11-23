// List of named vizualizers and their constructors.
var visualizers = {
  'attract-mode' :  {
    'name' : 'Attract'
  },
  'birds' : {
    'name' : 'Birds'
  },
  'voronoi' :  {
    'name' : 'Voronoi'
  },
  'particles' :  {
    'name' : 'Particles'
  },
  'cardinal' :  {
    'name' : 'Cardinal'
  },
  'ribbons' :  {
    'name' : 'Ribbons'
  }
};

$(function() {

  // Load list of visualization modes into the UI.
  for(var itm in visualizers){
    var btn = $(document.createElement('button'));
    btn.addClass('btn');
    btn.addClass('btn-default');
    btn.addClass('free-mode');
    btn.attr("data-mode", itm);
    btn.html(visualizers[itm].name);
    $("#visualizer-list").append(btn);

    if(itm != 'attract-mode'){
      var opt = $(document.createElement('option'));
      opt.val(itm);
      opt.html(visualizers[itm].name)
      $("#visualization").append(opt);
    }
  }

  var socket = io('http://localhost');
  socket.on('connect', function(){
    console.log('connected!');
    socket.on('queue', function(data){
      $('.queue').html('');
      for (var i = 0; i < data.queue.length; i++) {
        $('.queue').append('<li>' + data.queue[i].username + ' <a href="#" data-username="' + data.queue[i].username + '">Remove</a></li>');
        $('.queue li:last-child a').bind('touch, mousedown', removeUser);
      }
    });

    socket.on('history', function(data){
      $('table.history td').remove();
      for (var i = 0; i < data.history.length; i++) {
        var d = data.history[i];
        $('table.history').append('<tr class="row"> \
          <td class="col-md-1">' + d.id + '</td> \
          <td class="col-md-3">' + (d.twitter || '') + '</td>  \
          <td class="col-md-2 ' + d.complete + '"> </td> \
          <td class="col-md-2 ' + d.saved + '"> </td> \
          <td class="col-md-4 ' + d.tweeted + '"> </td> \
        </tr>');
      }
    });
    
    socket.on('disconnect', function(){});
  });

  function nextVis() {
    var listBox = $('#visualization')[0];
    var idx = listBox.selectedIndex + 1;
    var total = listBox.options.length;
    if(idx >= total){
      idx = 0;
    }
    listBox.selectedIndex = idx;
  }

  $('.username').bind('keypress', function(e) {
    if (e.keyCode === 13) {
      $.post('/add-user/', {'username': $(this).val(), 'visualizer' : $('#visualization').val()});
      $(this).val('');
      nextVis();
    }
  })
  $('.next-user').bind('touch, mousedown', function(e) {
    $.post('/next-user/', {'username': $(this).val(), 'visualizer' : $('#visualization').val()});
    nextVis();
  })
  $('.end-run').bind('touch, mousedown', function(e) {
    $.post('/end-run/');
  })
  $('.queue li a').bind('touch, mousedown', removeUser);
  $('.free-mode').bind('touch, mousedown', function(e) {
    $.post('/free-run/', {'visualizer': $(this).attr('data-mode')});
  })

  function removeUser(e) {
    if (e) {
      e.preventDefault();
    }
    $.post('/remove-user/', {'username': $(this).attr('data-username')});
  }
})