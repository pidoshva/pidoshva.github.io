function newGame()
{
  var game = initializeGame();
  return game;
}

function Game(grid, computerGrid, playerShips, computerShips)
{
  this.grid = grid;
  this.computerGrid = computerGrid;
  this.playerShips = playerShips;
  this.computerShips = computerShips;
  this.computerGuesses = new Array();
  this.computerRow = -1;
  this.computerCol = -1;
}

function PlayerShips()
{
  this.placedCount = 0;
  this.playerCarrier;
  this.playerBattleship;
  this.playerCruiser;
  this.playerSub;
  this.playerDestroyer;
  this.shipsSunk = 0;
}

function ComputerShips()
{
  this.computerCarrier;
  this.computerBattleship;
  this.computerCruiser;
  this.computerSub;
  this.computerDestroyer;
  this.shipsSunk = 0;
}

function Ship(size, location)
{
  this.shipSize = size;
  this.shipLocation = location;
  this.sunk = false;
  this.hits = 0;
}

// Functions
function initializeGame()
{
  var grid = createGridArray(10, 10);
  var computerGrid = createGridArray(10, 10);
  var playerShips = new PlayerShips();
  var computerShips = new ComputerShips();

  // Generates Player ships
  playerShips.playerCarrier = new Ship(5, []);
  playerShips.playerBattleship = new Ship(4, []);
  playerShips.playerCruiser = new Ship(3, []);
  playerShips.playerSub = new Ship(3, []);
  playerShips.playerDestroyer = new Ship(2, []);

  // Generates Computer ships
  computerShips.computerCarrier = new Ship(5, []);
  computerShips.computerBattleship = new Ship(4, []);
  computerShips.computerCruiser = new Ship(3, []);
  computerShips.computerSub = new Ship(3, []);
  computerShips.computerDestroyer = new Ship(2, []);

  var game = new Game(grid, computerGrid, playerShips, computerShips);
  return game;
}

function createGridArray(x, y)
{
  var grid = new Array();
  for (var i = 0; i < x; i++) {
    grid[i] = new Array();
    for (var j = 0; j < y; j++) {
      grid[i][j] = '';
    }
  }
  return grid;
}


function placeShip(playerShips)
{
  var debug = document.getElementById('debug');
  var ship = document.getElementById('ship').value;
  var row = parseInt(document.getElementById('row').value) - 1;
  var col = parseInt(document.getElementById('col').value) - 1;
  if (col > 9 || row > 9) {
    debug.innerHTML += '<p class="error">You cannot place a ship out of bounds.</p>'
    return false;
  }
  var direction = document.getElementById('direction').value;
  var location = [];
  if (playerShips[ship].shipLocation.length > 0) {
    debug.innerHTML += '<p class="error">That ship has already been placed</p>'
    return false;
  }
  if (direction == 'horizontal') {
    for (var i = 0; i < playerShips[ship].shipSize; i++) {
      if (col + playerShips[ship].shipSize > 10) {
        debug.innerHTML += '<p class="error">You cannot place a ship out of bounds.</p>'
        return false;
      }
      location.push({'x':col + i, 'y':row});
    }
  }
  else if (direction == 'vertical') {
    for (var i = 0; i < playerShips[ship].shipSize; i++) {
      if (row + playerShips[ship].shipSize > 10) {
        debug.innerHTML += '<p class="error">You cannot place a ship out of bounds.</p>'
        return false;
      }
      location.push({'x':col, 'y':row + i});
    }
  }
  debug.innerHTML = '<p><b>Ship: </b>' + ship + '</p><p><b> Column: </b>' + (col + 1) + '</p><p><b> Row: </b>' + (row + 1) + '</p><p><b> Direction: </b>' + direction;
  playerShips[ship].shipLocation = location;
  playerShips.placedCount++;
  return playerShips;
}

function markShipHit(ship, ships)
{
  if (ships[ship].hits < ships[ship].shipSize) {
    if (ships[ship].hits == ships[ship].shipSize - 1) {
      ships[ship].hits++;
      ships[ship].sunk = true;
      ships.shipsSunk++;
      return ships;
    }
    else {
      ships[ship].hits++;
      return ships;
    }
  }
  return ships;
}

function markShipSunk()
{

}

function markGridHit(row, col, grid)
{
  grid[col][row] = '<td class="hit"><b>HIT</b></td>';
  return grid;
}

function markGridMiss(row, col, grid)
{
  grid[col][row] = '<td class="miss"><b>MISS</b></td>';
  return grid;
}
