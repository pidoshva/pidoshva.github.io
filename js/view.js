function displayGrid(grid)
{
  var html = '';
  for (var i = -1; i < grid.length; i++) {
    if (i == -1) {
      html += '<tr><th></th>';
    }
    else {
      html += '</tr><tr><th>' + (i + 1) + '</th>';
    }
    for (var j = 0; j < grid.length; j++) {
      if (i == -1) {
        html += '<th>' + String.fromCharCode(65 + j); + '</th></tr>';
      }
      else {
        html += grid[j][i];
      }
    }
  }
  return html;
}

function displayName()
{
  var playerName = document.getElementById('player-name');
  var nameInput = document.getElementById('name-input');
  nameInput.oninput = function() {
    playerName.innerHTML = 'Name: ' + this.value;
  }
}

function moveLegend()
{
  var legend = document.getElementById('legendTable');
  var id = setInterval(move, 10)
  var position = 500;
  function move() {
    if (position !== 0) {
      position--;
      legend.style.top = position + 'px';
    }
  }
}
