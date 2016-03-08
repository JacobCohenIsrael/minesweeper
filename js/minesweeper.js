var minesweeper = angular.module('minesweeper', ['ngRoute'])
    .factory('gameFactory', function() {
        var factory = {};
        var settings = {
            width: 10,
            height: 10,
            mines: 10
        };
        settings.maxMines = Math.floor(settings.width*settings.height*0.3);
        factory.getSettings = function() {
            return settings;
        };
        factory.setSettings = function(newSettings) {
            settings = newSettings;
        };
        return factory;
    });
minesweeper.config(function ($routeProvider) {
   $routeProvider
       .when('/',
       {
           controller: 'minesweeperMenuController',
           templateUrl: 'views/menu.html'
       })
       .when('/Minesweeper',
       {
           controller: 'minesweeperGameController',
           templateUrl: 'views/minesweeper.html'
       })
       .otherwise({ redirectTo: '/' });
});
var controllers = {};
controllers.minesweeperMenuController = function ($scope, gameFactory) {
    
    
    console.log($scope);
    $scope.saveSettings = function() {
        var newSettings = {
            width: $scope.width,
            height: $scope.height,
            mines: $scope.mines
        };
        newSettings.maxMines = Math.floor(newSettings.width*newSettings.height*0.3);
        var settingsError = $('#settingsError');
        var settingsErrorSpan = settingsError.find('span');
        if(newSettings.width < 10 || newSettings.height < 10) {
            settingsError.show();
            settingsErrorSpan.html("Width and Height cannot be below 10!");
        } else if(newSettings.mines < 1) {
            settingsError.show();
            settingsErrorSpan.html("Must have at least 1 mine!");
        } else if(newSettings.mines > newSettings.maxMines) {
            settingsError.show();
            settingsErrorSpan.html("Too many mines! Up to "+newSettings.maxMines+ " mines are allowed!");
        } else if (isNaN(newSettings.width) || isNaN(newSettings.height) || isNaN(newSettings.mines)) {
            settingsError.show();
            settingsErrorSpan.html("Only numbers are allowed!");
        } else {
            gameFactory.setSettings(newSettings);
            $('#settingsModal').modal('hide');
        }
    };
    var settings = gameFactory.getSettings();
    $scope.width = settings.width;
    $scope.height = settings.height;
    $scope.mines = settings.mines;
};

controllers.minesweeperGameController = function($scope, gameFactory) {
    $scope.gameSettings = gameFactory.getSettings();
    $scope.remainingFlags = $scope.gameSettings.mines;
    $scope.minefield = createMinefield(gameFactory.getSettings());
    $scope.reavealAll = revealAll;
    $scope.uncoverSpot = function(spot, $event) {
        if($event.shiftKey && spot.isCovered) { // We do not want to flag covered spot
            if(spot.flag) {
                spot.flag = false; // flag off
                $scope.remainingFlags++;
            } else {
                if($scope.remainingFlags === 0) { // if no more flags left
                    alert("Out of flags!");
                } else {
                    spot.flag = true; // flag on
                    $scope.remainingFlags--;
                    if($scope.remainingFlags === 0) {
                        if (hasWonByFlags($scope.minefield, $scope.gameSettings)) {
                            revealAll($scope.minefield, $scope.gameSettings);
                            $scope.isWinMessageVisible = true;
                        }
                    }
                }
            }
        } else {
            if(!spot.isCovered || spot.flag) {
                return;
            }
            spot.isCovered = false;
            if(spot.content === "mine") {
                spot.content = "explode";
                revealAll($scope.minefield, $scope.gameSettings);
                $scope.isLostMessageVisible = true;
            } else if(hasWon($scope.minefield, $scope.gameSettings)) {
                revealAll($scope.minefield, $scope.gameSettings);
                $scope.isWinMessageVisible = true;
            } else {
                if(spot.content == "empty") {
                    if(spot.x > 0) {
                        var left = getSpot($scope.minefield, spot.y, spot.x-1);
                        if(left.content != "mine" && !left.flag) {
                            $scope.uncoverSpot(left, $event);
                        }
                    }
                    if(spot.x < $scope.gameSettings.width-1) {
                        var right = getSpot($scope.minefield, spot.y, spot.x+1);
                        if(right.content != "mine" && !right.flag) {
                            $scope.uncoverSpot(right, $event);
                        }
                    }
                    if(spot.y > 0) {
                        var above = getSpot($scope.minefield, spot.y-1, spot.x);
                        if(above.content != "mine" && !above.flag) {
                            $scope.uncoverSpot(above, $event);
                        }
                    }
                    if(spot.y < $scope.gameSettings.height-1) {
                        var below = getSpot($scope.minefield, spot.y+1, spot.x);
                        if(below.content != "mine" && !below.flag) {
                            $scope.uncoverSpot(below, $event);
                        }
                    }
                }
            }
        }
        console.debug(spot);
    };
};
minesweeper.controller(controllers);

function createMinefield(settings) {
    var minefield = {};
    minefield.rows = [];

    for(var i = 0; i < settings.height; i++) {
        var row = {};
        row.spots = [];

        for(var j = 0; j < settings.width; j++) {
            var spot = {};
            spot.isCovered = true;
            spot.content = "empty";
            spot.x = j;
            spot.y = i;
            row.spots.push(spot);
        }

        minefield.rows.push(row);
    }

    placeManyRandomMines(minefield, settings);
    calculateAllNumbers(minefield, settings);

    return minefield;
}

function getSpot(minefield, row, column) {
    return minefield.rows[row].spots[column];
}

function placeRandomMine(minefield, settings) {
    do {
        var row = Math.round(Math.random() * (settings.height-1));
        var column = Math.round(Math.random() * (settings.width-1));
        var spot = getSpot(minefield, row, column);
    } while(spot.content == "mine"); // Make sure you don't put a mine on a mine.

    spot.content = "mine";
}

function placeManyRandomMines(minefield, settings) {
    for(var i = 0; i < settings.mines; i++) {
        placeRandomMine(minefield, settings);
    }
}

function calculateNumber(minefield, row, column, settings) {
    var thisSpot = getSpot(minefield, row, column);

    // if this spot contains a mine then we can't place a number here
    if(thisSpot.content == "mine") {
        return;
    }

    var mineCount = 0;

    // check row above if this is not the first row
    if(row > 0) {
        // check column to the left if this is not the first column
        if(column > 0) {
            // get the spot above and to the left
            var spot = getSpot(minefield, row - 1, column - 1);
            if(spot.content == "mine") {
                mineCount++;
            }
        }

        // get the spot right above
        var spot = getSpot(minefield, row - 1, column);
        if(spot.content == "mine") {
            mineCount++;
        }

        // check column to the right if this is not the last column
        if(column < settings.width-1) {
            // get the spot above and to the right
            var spot = getSpot(minefield, row - 1, column + 1);
            if(spot.content == "mine") {
                mineCount++;
            }
        }
    }

    // check column to the left if this is not the first column
    if(column > 0) {
        // get the spot to the left
        var spot = getSpot(minefield, row, column - 1);
        if(spot.content == "mine") {
            mineCount++;
        }
    }

    // check column to the right if this is not the last column
    if(column < settings.width-1) {
        // get the spot to the right
        var spot = getSpot(minefield, row, column + 1);
        if(spot.content == "mine") {
            mineCount++;
        }
    }

    // check row below if this is not the last row
    if(row < settings.height-1) {
        // check column to the left if this is not the first column
        if(column > 0) {
            // get the spot below and to the left
            var spot = getSpot(minefield, row + 1, column - 1);
            if(spot.content == "mine") {
                mineCount++;
            }
        }

        // get the spot right below
        var spot = getSpot(minefield, row + 1, column);
        if(spot.content == "mine") {
            mineCount++;
        }

        // check column to the right if this is not the last column
        if(column < settings.width-1) {
            // get the spot below and to the right
            var spot = getSpot(minefield, row + 1, column + 1);
            if(spot.content == "mine") {
                mineCount++;
            }
        }
    }

    if(mineCount > 0) {
        thisSpot.content = mineCount;
    }
}

function calculateAllNumbers(minefield, settings) {
    for(var y = 0; y < settings.height; y++) {
        for(var x = 0; x < settings.width; x++) {
            calculateNumber(minefield, y, x, settings);
        }
    }
}

function hasWon(minefield, settings) {
    for(var y = 0; y < settings.height; y++) {
        for(var x = 0; x < settings.width; x++) {
            var spot = getSpot(minefield, y, x);
            if(spot.isCovered && spot.content != "mine") {
                return false;
            }
        }
    }

    return true;
}

function hasWonByFlags(minefield, settings) {
    for(var y = 0; y < settings.height; y++) {
        for(var x = 0; x < settings.width; x++) {
            var spot = getSpot(minefield, y, x);
            if(spot.flag && spot.content != "mine") {
                return false;
            }
        }
    }
    return true;
}

function revealAll(minefield, settings) {
    for(var y = 0; y < settings.height; y++) {
        for(var x = 0; x < settings.width; x++) {
            var spot = getSpot(minefield, y, x);
            spot.isCovered = false;
        }
    }
}