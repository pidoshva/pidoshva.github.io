window.onload = main();

function main()
{

  displayName();
  var game = newGame();
  var playerGrid = document.getElementById('playerGrid');
  var computerGrid = document.getElementById('computerGrid');
  game.computerShips = loadComputerConfig(game.computerShips);

  // Initialize player grid
  game.grid = initializeGrid(game.grid);
  playerGrid.innerHTML = displayGrid(game.grid);

  // Initialize computer grid
  game.computerGrid = initializeGrid(game.computerGrid);
  game.computerGrid = addShipsToGrid(game.computerShips, game.computerGrid, false);
  computerGrid.innerHTML = displayGrid(game.computerGrid);

  // Placement of the player's ships on the player grid
  game.grid = handleShipPlacement(game.grid, game.playerShips);

  // Save/Load game data
  var loadGameButton = document.getElementById('load-game');
  loadGameButton.onclick = function() {
    var saveGame = loadSaveGame();
    game.grid = addShipsToGrid(saveGame.playerShips, game.grid, true);
    game.playerShips = saveGame.playerShips;
    playerGrid.innerHTML = displayGrid(game.grid);
  }
  var saveGameButton = document.getElementById('save-game');
  saveGameButton.onclick = function() {
    saveGame(game);
    return false;
  }
  var clearStorage = document.getElementById('clear-storage');
  clearStorage.onclick = function() {
    clearLocalStorage();
    return false;
  }

  //Game play and turns
  var startGameButton = document.getElementById('start-game');
  startGameButton.onclick = function() {
    if (game.playerShips.placedCount == 5) {
      if (game.computerShips.shipsSunk === 5 || game.playerShips.shipsSunk === 5) {
        startGameButton.innerHTML = 'Start Game';
        main();
      }
      else {
        computerAttack();
        startGameButton.style.visibility = 'hidden';
        playerAttack();
        document.getElementById('debug').innerHTML = 'It is now your turn. Make a guess by clicking in the Computer Grid';
      }
    }
    else {
      document.getElementById('debug').innerHTML = 'You must place all your ships before you can play.';
    }
  }


  function playerAttack()
  {
    document.getElementById('debug').innerHTML = '';
    if (game.computerShips.shipsSunk !== 5 || game.playerShips.shipsSunk !== 5) {
      var cells = document.getElementsByTagName('td');
      for (var i = 0; i < cells.length; i++) {
        cells[i].onclick = function() {
          document.getElementById('debug').innerHTML = '';
          var message = document.getElementById('message');
          var newMessage = '<br>';
          var col = this.cellIndex;
          var row = this.parentNode.rowIndex;
          var cell = computerGrid.rows[row].cells[col];
          if (cell.className === 'hidden-ship') {
            newMessage = String.fromCharCode(65 + (col - 1))  + ' ' + row + ' was a ' + 'hit!';
            game.computerShips = markShipHit(cell.id, game.computerShips);
            game.computerGrid = markGridHit(row - 1, col - 1, game.computerGrid);
            computerGrid.innerHTML = displayGrid(game.computerGrid);
            if (game.computerShips[cell.id].sunk === true) {
              if (game.computerShips.shipsSunk === 5) {
                newMessage = 'You win!!';
                document.getElementById('start-game').style.visibility = 'visible';
                document.getElementById('start-game').innerHTML = 'New Game';
                playerAttack();
              }
              else {
                newMessage = cell.id + ' was sunk!';
              }
            }
          }
          else {
            if (cell.className !== 'hit') {
              newMessage = String.fromCharCode(65 + (col - 1))  + ' ' + row + ' was a ' + 'miss!';
              game.computerGrid = markGridMiss(row - 1, col - 1, game.computerGrid);
              computerGrid.innerHTML = displayGrid(game.computerGrid);
            }
          }
          message.innerHTML = newMessage;

          setTimeout(computerAttack, 1000);
          playerAttack();
        }
      }
    }
    else {
      newMessage = 'You win!!';
      document.getElementById('start-game').style.visibility = 'visible';
      document.getElementById('start-game').innerHTML = 'New Game';
    }
  }

  function computerAttack()
  {
    document.getElementById('debug').innerHTML = 'It is now your turn. Make a guess by clicking in the Computer Grid';
    if (game.playerShips.shipsSunk !== 5 || game.computerShips.shipsSunk !== 5) {
      var point = generatePoint();
      var row = point[0];
      var col = point[1];
      var samePoint = false;
      if (comparePoints(game.computerGuesses, point)) {
        samePoint = true;
        do {
          point = generatePoint();
          if (comparePoints(game.computerGuesses, point)) {
            point = generatePoint();
          }
          else {
            samePoint = false;
          }
        }
        while (samePoint);
      }
      row = point[0];
      col = point[1];
      game.computerGuesses.push(point);
      var cell = playerGrid.rows[row].cells[col];
      var message = document.getElementById('message');
      var newMessage = '<br>';
      if (cell.className === 'ship') {
        newMessage = 'The computer hit ' + cell.id;
        game.playerShips = markShipHit(cell.id, game.playerShips);
        game.grid = markGridHit(row - 1, col - 1, game.grid);
        playerGrid.innerHTML = displayGrid(game.grid);
        if (game.playerShips[cell.id].sunk === true) {
          if (game.playerShips.shipsSunk == 5) {
            document.getElementById('start-game').style.visibility = 'visible';
            document.getElementById('start-game').innerHTML = 'New Game';
            newMessage = 'The computer wins...';
          }
          else {
            newMessage = cell.id + ' was sunk!';
          }
        }


        var origRow = row;
        row++;
        if (row > 9) {
          row--;
        }
        cell = playerGrid.rows[row].cells[col];
        if (cell.className === 'ship') {
          game.computerRow = row;
          game.computerCol = col;
        }
        else {
          row--;
          if (row < 0) {
            row++;
          }
          cell = playerGrid.rows[row].cells[col];
          if (cell.className === 'ship') {
            game.computerRow = row;
            game.computerCol = col;
          }
          else {
            row--;
            if (row < 0) {
              row = row + 1;
            }
            cell = playerGrid.rows[row].cells[col];
            if (cell.className === 'ship') {
              game.computerRow = row;
              game.computerCol = col;
            }
            else {
              row = origRow;
              col++;
              if (col > 9) {
                col = col - 1;
              }
              cell = playerGrid.rows[row].cells[col];
              if (cell.className === 'ship') {
                game.computerRow = row;
                game.computerCol = col;
              }
              else {
                col = col - 1;
                if (col < 0) {
                  col = col + 1;
                }
                cell = playerGrid.rows[row].cells[col];
                if (cell.className === 'ship') {
                  game.computerRow = row;
                  game.computerCol = col;
                }
                else {
                  col--;
                  if (col < 0) {
                    col = col + 1;
                  }
                  cell = playerGrid.rows[row].cells[col];
                  if (cell.className === 'ship') {
                    game.computerRow = row;
                    game.computerCol = col;
                  }
                }
              }
            }
          }
        }
      }
      else {
        if (cell.className !== 'hit') {
          newMessage = 'The computer missed!';
          game.grid = markGridMiss(row - 1, col - 1, game.grid);
          playerGrid.innerHTML = displayGrid(game.grid);
        }
      }
      message.innerHTML = newMessage;
    }
    else {
      document.getElementById('start-game').style.visibility = 'visible';
      document.getElementById('message').innerHTML = 'The computer wins...';
      document.getElementById('start-game').innerHTML = 'New Game';
    }
  }

  function generatePoint() {
    var row = Math.floor((Math.random() * 10) + 1);
    var col = Math.floor((Math.random() * 10) + 1);
    if (game.computerRow > -1) {
      row = game.computerRow;
      game.computerRow = -1;
    }
    if (game.computerCol > -1) {
      col = game.computerCol;
      game.computerCol = -1;
    }
    var point = [row, col];
    return point;
  }

  function loadJSON(filename)
  {
    var httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', filename, false);
    httpRequest.send();
    var response = JSON.parse(httpRequest.responseText);
    return response;
  }

  function loadComputerConfig(computerShips)
  {
    var json = loadJSON('config.json')
    var shipConfig = Math.floor((Math.random() * 5) + 1);
    var i = 0;
    for (var key in computerShips) {
      switch (key) {
        case "computerCarrier":
          i = 0;
          break;
        case "computerBattleship":
          i = 1;
          break;
        case "computerCruiser":
          i = 2;
          break;
        case "computerSub":
          i = 3;
          break;
        case "computerDestroyer":
          i = 4;
          break;
      }
      computerShips[key].shipLocation = json.computer_config[shipConfig].ships[i];
    }
    return computerShips;
  }

  function initializeGrid(grid)
  {
    for (var h = 0; h < grid.length; h++) {
      for (var i = 0; i < grid.length; i++) {
        for (var j = 0; i < grid.length; i++) {
          grid[i][h] = '<td></td>';
        }
      }
    }
    return grid;
  }

  function addShipsToGrid(ships, grid, player)
  {
    for (var key in ships) {
      for (var a in ships[key].shipLocation) {
        var location = ships[key].shipLocation[a];
        if (player == true) {
          grid[location.x][location.y] = '<td class="ship" id="'+key+'"></td>';
        }
        else {
          grid[location.x][location.y] = '<td class="hidden-ship" id="'+key+'"></td>';
        }
      }
    }
    return grid;
  }

  function handleShipPlacement(grid, playerShips)
  {
    var placeButton = document.getElementById('place-button');
    placeButton.onclick = function() {
      var updatedShips = placeShip(playerShips);
      grid = addShipsToGrid(updatedShips, grid, true);
      playerGrid.innerHTML = displayGrid(grid);
      return grid;
    }
    return grid;
  }

  function handleLogin()
  {
    var loginButton = document.getElementById('login-button');
    var ajax = new XMLHttpRequest();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value
    var data = 'userName=' + username + '&password=' + password;
    ajax.onreadystatechange = function() {
      if (ajax.readyState == 4) {
        var response = JSON.parse(ajax.responseText);
        if (response.result == 'valid') {
          var timestamp = 'User: ' + username + ' ' + response.timestamp;
          localStorage.setItem('cs2550timestamp', timestamp);
          window.location = 'grid.html';
        }
        else {
          document.getElementById('home-message').innerHTML = '<h3>Invalid Login Credentials</h3>';
        }
      }
    }
    ajax.open('POST', 'http://universe.tc.uvu.edu/cs2550/assignments/PasswordCheck/check.php', true);
    ajax.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    ajax.send(data);
  }

  function saveGame(game) {
    var message = document.getElementById('debug').innerHTML = 'Your game was successfully saved!';
    var gameData = JSON.stringify(game);
    localStorage.setItem('save-game', gameData);
  }

  function loadSaveGame()
  {
    var message = document.getElementById('debug').innerHTML = 'Your game was successfully loaded!';
    var saveGame = localStorage.getItem('save-game');
    return JSON.parse(saveGame);
  }

  function clearLocalStorage()
  {
    var message = document.getElementById('debug').innerHTML = 'Your save game data was successfully cleared!';
    localStorage.removeItem('save-game');
    main();
  }

  function comparePoints(computerGuesses, point) {
    if (computerGuesses.length == 0) {
      return false;
    }
    for (var i = 0; i < computerGuesses.length; i++) {
      if (computerGuesses[i][0] === point[0] && computerGuesses[i][1] === point[1]) {
        return true;
      }
    }
    return false;
  }
}
