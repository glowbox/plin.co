$(function() {
  var socket = io('http://localhost');
  socket.on('connect', function(){
    console.log('connected!');
    socket.on('queue', function(data){
      $('.queue').html('');
      for (var i = 0; i < data.queue.length; i++) {
        $('.queue').append('<li>' + data.queue[i] + ' <a href="#" data-username="' + data.queue[i] + '">Remove</a></li>');
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

  $('.username').bind('keypress', function(e) {
    if (e.keyCode === 13) {
      $.post('/add-user/', {'username': $(this).val()});
      $(this).val('');
    }
  })
  $('.next-user').bind('touch, mousedown', function(e) {
    $.post('/next-user/', {'username': $(this).val()});
  })
  $('.end-run').bind('touch, mousedown', function(e) {
    $.post('/end-run/');
  })
  $('.queue li a').bind('touch, mousedown', removeUser);
  $('.free-mode').bind('touch, mousedown', function(e) {
    $.post('/free-run/', {'mode': $(this).attr('data-mode')});
  })

  function removeUser(e) {
    if (e) {
      e.preventDefault();
    }
    $.post('/remove-user/', {'username': $(this).attr('data-username')});
  }
})