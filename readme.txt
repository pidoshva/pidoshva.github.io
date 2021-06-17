Ship Placement

Player Ships
Player ships are placed by the user using the given form. The user selects the ship, the direction, and the starting column and row. A ship cannot be placed out of bounds and the same ship cannot be placed twice.
Computer Ships
There are 6 preconfigured ship placements in the config.json file which are loaded and then one is randomly picked and the ships are placed on the Computer Grid.

## Saving the Player's Ship Configuration
The player can save their ship configuration by placing their ships and then clicking the "Save Ships" button. These are stored in the browsers local storage. They can then be loaded for easier game setup.

Turns
Computer Turn
The computer attacks by randomly choosing a point in the grid. It checks to see if it has already guessed that point, if it has it will generate a new point, and then the point is checked to see if a ship was hit.
If it is a hit, the computer checks the surrounding points for ships. If ship is found it remembers that point and attacks it next time.
Player Turn
The player clicks a square on the Computer Grid and it gets checked to make sure it hasn't been chosen before and then checks if it is a ship. The cell is then marked either a hit or miss

Vadym Pidoshva
