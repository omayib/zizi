(function() {
    
    // Use p5.js instance mode so our canvas is contained inside the plugin container.
    var sketch = function(p) {
      // Game settings
      var boardSize = 6;  // 6×6 main board
      var cellSize = 50;  // Fixed cell size in pixels
      var player, obstacles, exits;
      var gameWon = false, level = 1;
      var popupShown = false;
      
      // Drag variables for obstacles
      var draggingObstacle = null, draggingOriginal = null, dragCandidate = null;
      
      // Exit data: each exit has a title, URL, and an icon image path.
      // (These icon files should be in your plugin’s assets folder.)
      var exitData = [
        { title: "Programmer", url: "https://informatika.amikom.ac.id/bagaimana-menjadi-programmer-masa-depan-di-era-ai/", iconURL: "programmer.png", targetType: "programmer" },
        { title: "Content Creator", url: "https://informatika.amikom.ac.id/lebih-dari-sekadar-hobi-konten-kreator-memang-menjajikan/", iconURL: "content-creator.png", targetType: "contentCreator" },
        { title: "Freelancer", url: "https://informatika.amikom.ac.id/gaji-puluhan-juta-per-bulan-alumni-informatika-lulus-tanpa-skripsi/", iconURL: "freelancer.png", targetType: "freelancer" }
      ];
      
      // Variables to hold loaded exit images.
      var exitIcon1, exitIcon2, exitIcon3;
      
      p.preload = function() {
        // Load exit icons and player image as before…
        exitIcon1 = p.loadImage(ziziGameAssets.baseUrl + exitData[0].iconURL);
        exitIcon2 = p.loadImage(ziziGameAssets.baseUrl + exitData[1].iconURL);
        exitIcon3 = p.loadImage(ziziGameAssets.baseUrl + exitData[2].iconURL);
        exitData[0].icon = exitIcon1;
        exitData[1].icon = exitIcon2;
        exitData[2].icon = exitIcon3;
      
        // Load player's image (example)
        playerImage = p.loadImage(ziziGameAssets.baseUrl + "Pink_Monster.png");
      
        // Load obstacle images from assets
        singleBlockImage = p.loadImage(ziziGameAssets.baseUrl + "single_beam.png");
        doubleVerticalImage = p.loadImage(ziziGameAssets.baseUrl + "double_beam_vertical.png");
        doubleHorizontalImage = p.loadImage(ziziGameAssets.baseUrl + "double_beam_horizontal.png");
      };
      
      p.setup = function() {
        // Set pixel density to 1 so canvas pixels match CSS pixels.
        p.pixelDensity(1);

        recalcCanvas();
        // Canvas dimensions: main board (6 columns) plus one extra column for exits.
        var canvas = p.createCanvas((boardSize + 1) * cellSize, boardSize * cellSize);
        canvas.parent("zizi-game-container");

         // Resize the container to exactly match the canvas dimensions.
        adjustContainerSize();

        resetLevel();
      };
      p.windowResized = function() {
        recalcCanvas();
        p.resizeCanvas((boardSize + 1) * cellSize, boardSize * cellSize);
        adjustContainerSize();
      };
      p.draw = function() {
        p.background(220);
        drawGrid();
        drawExits();
        drawObstacles();
        drawPlayer();
        
        // Display current level
        p.fill(0);
        p.textSize(16);
        p.textAlign(p.LEFT, p.TOP);
        p.text("Level: " + level, 10, 10);
        
      };

      function recalcCanvas() {
        // Use 90% of the window dimensions.
        var availableWidth = window.innerWidth * 0.9;
        var availableHeight = window.innerHeight * 0.9;
        
        // Calculate tentative cell size.
        var maxCellWidth = availableWidth / (boardSize + 1); // extra column for exits
        var maxCellHeight = availableHeight / boardSize;
        var computedCellSize = Math.min(maxCellWidth, maxCellHeight);
        
        // Only apply a maximum cell size on larger screens.
        if (window.innerWidth < 768) {
          // On mobile, use the computed cell size without a clamp.
          cellSize = computedCellSize;
        } else {
          // On larger screens, limit cellSize to a maximum (e.g., 50px)
          var maxAllowedCellSize = 50;
          cellSize = Math.min(computedCellSize, maxAllowedCellSize);
        }
      }
    function adjustContainerSize() {
        var container = document.getElementById("zizi-game-container");
        container.style.width = ((boardSize + 1) * cellSize) + "px";
        container.style.height = (boardSize * cellSize) + "px";
    }
      
      // Draw the main 6×6 grid cells.
      function drawGrid() {
        p.stroke(0);
        for (var i = 0; i < boardSize; i++) {
          for (var j = 0; j < boardSize; j++) {
            p.noFill();
            p.rect(i * cellSize, j * cellSize, cellSize, cellSize);
          }
        }
      }
      
      // Draw exit icons in the extra column (at x = boardSize).
      function drawExits() {
        if (!exits) return;
        exits.forEach(function(exit) {
          p.image(exit.icon, exit.x * cellSize, exit.y * cellSize, cellSize, cellSize);
        });
      }
      
      // Return a list of grid cells occupied by an obstacle.
      function getOccupiedCells(obstacle) {
        if (obstacle.type === "single") {
          return [{ x: obstacle.x, y: obstacle.y }];
        } else {
          if (obstacle.orientation === "horizontal") {
            return [{ x: obstacle.x, y: obstacle.y }, { x: obstacle.x + 1, y: obstacle.y }];
          } else {
            return [{ x: obstacle.x, y: obstacle.y }, { x: obstacle.x, y: obstacle.y + 1 }];
          }
        }
      }
      
      // Given an obstacle and a candidate position, return the cells it would occupy.
      function getCandidateCells(obstacle, candidate) {
        if (obstacle.type === "single") {
          return [{ x: candidate.x, y: candidate.y }];
        } else {
          if (obstacle.orientation === "horizontal") {
            return [{ x: candidate.x, y: candidate.y }, { x: candidate.x + 1, y: candidate.y }];
          } else {
            return [{ x: candidate.x, y: candidate.y }, { x: candidate.x, y: candidate.y + 1 }];
          }
        }
      }
      
      // Validate that an obstacle can move to the candidate position.
      function isValidBlockPosition(obstacle, candidate, index) {
        var cells = getCandidateCells(obstacle, candidate);
        // Ensure every cell is within the main board (0 to boardSize-1).
        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i];
          if (cell.x < 0 || cell.x >= boardSize || cell.y < 0 || cell.y >= boardSize) {
            return false;
          }
        }
        // Check collision with the player.
        for (var i = 0; i < cells.length; i++) {
          if (cells[i].x === player.x && cells[i].y === player.y) return false;
        }
        // Check collision with other obstacles.
        for (var j = 0; j < obstacles.length; j++) {
          if (j === index) continue;
          var otherCells = getOccupiedCells(obstacles[j]);
          for (var i = 0; i < cells.length; i++) {
            for (var k = 0; k < otherCells.length; k++) {
              if (cells[i].x === otherCells[k].x && cells[i].y === otherCells[k].y) return false;
            }
          }
        }
        return true;
      }
      
      // Draw obstacles. If an obstacle is being dragged, show it at the candidate position.
      function drawObstacles() {
        obstacles.forEach(function(obs, i) {
          // If dragging, show the candidate image (with feedback) instead of a rectangle.
          if (i === draggingObstacle && dragCandidate != null) {
            var valid = isValidBlockPosition(obs, dragCandidate, i);
            if (valid) p.tint(255, 255); // No tint if valid.
            else p.tint(255, 150);       // Semi-transparent tint if invalid.
            
            if (obs.type === "single") {
              p.image(singleBlockImage, dragCandidate.x * cellSize, dragCandidate.y * cellSize, cellSize, cellSize);
            } else {
              if (obs.orientation === "horizontal") {
                p.image(doubleHorizontalImage, dragCandidate.x * cellSize, dragCandidate.y * cellSize, cellSize * 2, cellSize);
              } else {
                p.image(doubleVerticalImage, dragCandidate.x * cellSize, dragCandidate.y * cellSize, cellSize, cellSize * 2);
              }
            }
            p.noTint();
          } else {
            // Not dragging: Draw the obstacle normally.
            if (obs.type === "single") {
              p.image(singleBlockImage, obs.x * cellSize, obs.y * cellSize, cellSize, cellSize);
            } else {
              if (obs.orientation === "horizontal") {
                p.image(doubleHorizontalImage, obs.x * cellSize, obs.y * cellSize, cellSize * 2, cellSize);
              } else {
                p.image(doubleVerticalImage, obs.x * cellSize, obs.y * cellSize, cellSize, cellSize * 2);
              }
            }
          }
        });
      }
      
      // Draw the player as a blue circle.
      function drawPlayer() {
        if (player) {
            p.image(playerImage, player.x * cellSize, player.y * cellSize, cellSize, cellSize);
          }
      }
      
      // Generate three exit objects on the extra column with unique rows (at least one cell apart).
      // Each exit is assigned one of the exitData objects (shuffled randomly).
      function generateRandomExits() {
        var exitRows = [];
        var valid = false;
        while (!valid) {
          var rows = [];
          for (var i = 0; i < boardSize; i++) rows.push(i);
          rows = p.shuffle(rows);
          exitRows = rows.slice(0, 3).sort(function(a, b) { return a - b; });
          if ((exitRows[1] - exitRows[0] >= 2) && (exitRows[2] - exitRows[1] >= 2)) valid = true;
        }
        var shuffledExits = p.shuffle(exitData);
        return exitRows.map(function(row, i) {
          return {
            x: boardSize,
            y: row,
            title: shuffledExits[i].title,
            url: shuffledExits[i].url,
            icon: shuffledExits[i].icon,
            iconURL: shuffledExits[i].iconURL,
            targetType: shuffledExits[i].targetType
          };
        });
      }
      
      // Generate random obstacles (some single, some double) for the main board.
      function generateRandomObstacles() {
        var count = 3 + level;
        var generated = [];
        var occupied = new Set();
        // Mark the player's starting cell as occupied.
        occupied.add("0," + Math.floor(boardSize / 2));
        
        while (generated.length < count) {
          var x = p.floor(p.random(boardSize));
          var y = p.floor(p.random(boardSize));
          var key = x + "," + y;
          if (occupied.has(key)) continue;
          
          var blockType = "single";
          var orientation = null;
          if (p.random() < 0.5) {
            var possible = [];
            if (x < boardSize - 1 && !occupied.has((x + 1) + "," + y)) possible.push("horizontal");
            if (y < boardSize - 1 && !occupied.has(x + "," + (y + 1))) possible.push("vertical");
            if (possible.length > 0) {
              blockType = "double";
              orientation = p.random(possible);
            }
          }
          if (blockType === "double") {
            generated.push({ type: "double", x: x, y: y, orientation: orientation });
            occupied.add(key);
            if (orientation === "horizontal") {
              occupied.add((x + 1) + "," + y);
            } else {
              occupied.add(x + "," + (y + 1));
            }
          } else {
            generated.push({ type: "single", x: x, y: y });
            occupied.add(key);
          }
        }
        return generated;
      }
      
      // Check if a cell is occupied by any obstacle.
      function isCellOccupiedByObstacle(x, y) {
        for (var i = 0; i < obstacles.length; i++) {
          var cells = getOccupiedCells(obstacles[i]);
          for (var j = 0; j < cells.length; j++) {
            if (cells[j].x === x && cells[j].y === y) return true;
          }
        }
        return false;
      }
      
      // Reset or level up the game.
      function resetLevel() {
        if (gameWon) level++;
        gameWon = false;
        popupShown = false;
        player = { x: 0, y: Math.floor(boardSize / 2) };
        exits = generateRandomExits();
        obstacles = generateRandomObstacles();
        draggingObstacle = null;
        draggingOriginal = null;
        dragCandidate = null;
        p.loop();
      }
      
      // Handle player movement via arrow keys.
      p.keyPressed = function() {
        if (gameWon) {
          resetLevel();
          return;
        }
        var dx = 0, dy = 0;
        if (p.keyCode === p.LEFT_ARROW) dx = -1;
        else if (p.keyCode === p.RIGHT_ARROW) dx = 1;
        else if (p.keyCode === p.UP_ARROW) dy = -1;
        else if (p.keyCode === p.DOWN_ARROW) dy = 1;
        
        var newX = player.x + dx;
        var newY = player.y + dy;
        
        // If moving into the extra column (exit area)
        if (newX === boardSize) {
            player.x = newX;
            player.y = newY;
            // Find the exit object for this row.
            var exitObj = exits.find(function(e) { return e.y === newY; });
            if (exitObj) {
              winGame(exitObj.targetType);
            }
            return;
          }
        
        // Boundary check.
        if (newX < 0 || newX >= boardSize || newY < 0 || newY >= boardSize) return;
        
        // Prevent moving into an obstacle.
        if (!isCellOccupiedByObstacle(newX, newY)) {
          player.x = newX;
          player.y = newY;
        }
      };
      
      // Mouse/Touch interactions for dragging obstacles.
      p.mousePressed = function() {
        var gridX = p.floor(p.mouseX / cellSize);
        var gridY = p.floor(p.mouseY / cellSize);
        if (gridX < 0 || gridX >= boardSize || gridY < 0 || gridY >= boardSize) return;
        for (var i = 0; i < obstacles.length; i++) {
          var obs = obstacles[i];
          if (obs.type === "single") {
            if (gridX === obs.x && gridY === obs.y) {
              draggingObstacle = i;
              draggingOriginal = { x: obs.x, y: obs.y };
              dragCandidate = { x: obs.x, y: obs.y };
              return;
            }
          } else {
            if (obs.orientation === "horizontal") {
              if ((gridX === obs.x || gridX === obs.x + 1) && gridY === obs.y) {
                draggingObstacle = i;
                draggingOriginal = { x: obs.x, y: obs.y };
                dragCandidate = { x: obs.x, y: obs.y };
                return;
              }
            } else { // vertical
              if (gridX === obs.x && (gridY === obs.y || gridY === obs.y + 1)) {
                draggingObstacle = i;
                draggingOriginal = { x: obs.x, y: obs.y };
                dragCandidate = { x: obs.x, y: obs.y };
                return;
              }
            }
          }
        }
      };
      
      p.mouseDragged = function() {
        if (draggingObstacle !== null) {
          var candidateX = p.floor(p.mouseX / cellSize);
          var candidateY = p.floor(p.mouseY / cellSize);
          var obs = obstacles[draggingObstacle];
          if (obs.type === "double") {
            if (obs.orientation === "horizontal") {
              candidateY = draggingOriginal.y;
            } else if (obs.orientation === "vertical") {
              candidateX = draggingOriginal.x;
            }
          }
          dragCandidate = { x: candidateX, y: candidateY };
        }
      };
      
      p.mouseReleased = function() {
        if (draggingObstacle !== null) {
          var obs = obstacles[draggingObstacle];
          if (isValidBlockPosition(obs, dragCandidate, draggingObstacle)) {
            obstacles[draggingObstacle].x = dragCandidate.x;
            obstacles[draggingObstacle].y = dragCandidate.y;
          } else {
            obstacles[draggingObstacle].x = draggingOriginal.x;
            obstacles[draggingObstacle].y = draggingOriginal.y;
          }
          draggingObstacle = null;
          draggingOriginal = null;
          dragCandidate = null;
        }
      };
      
      // winGame function, similar to your provided example.
    function winGame(targetType) {
        // (Optional) Play a celebration sound here if available.
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        var modalText = "";
        switch (targetType) {
            case "programmer":
                modalText = "You have achieved your dream of becoming a top Programmer!";
                break;
            case "contentCreator":
                modalText = "You have achieved your dream of becoming a renowned Content Creator!";
                break;
            case "freelancer":
                modalText = "You have achieved your dream of becoming a successful Freelancer!";
                break;
            default:
                modalText = "Wow! You've reached your dream!";
                break;
        }

        // Update the modal's paragraph text.
        var modalParagraph = document.querySelector("#winModal .modal-content p");
        if(modalParagraph) {
            modalParagraph.textContent = modalText;
        }
        
        // Display the win modal popup.
        var winModal = document.getElementById('winModal');
        winModal.style.display = 'block';
        
        // Set up the Play Again button.
        document.getElementById('playAgainBtn').addEventListener('click', function() {
          resetLevel();
          winModal.style.display = 'none';
        });
        
        // Determine URL based on targetType.
        var targetUrl = "";
        switch (targetType) {
          case "programmer":
            targetUrl = "https://informatika.amikom.ac.id/bagaimana-menjadi-programmer-masa-depan-di-era-ai/";
            break;
          case "contentCreator":
            targetUrl = "https://informatika.amikom.ac.id/lebih-dari-sekadar-hobi-konten-kreator-memang-menjajikan/";
            break;
          case "freelancer":
            targetUrl = "https://informatika.amikom.ac.id/gaji-puluhan-juta-per-bulan-alumni-informatika-lulus-tanpa-skripsi/";
            break;
          default:
            targetUrl = "https://informatika.amikom.ac.id/kurikulum";
            break;
        }
        document.getElementById('visitPageBtn').onclick = function() {
          window.open(targetUrl, '_blank');
        };
        
        // Mark game as won.
        gameWon = true;
      }
      
    };
    
    new p5(sketch, "zizi-game-container");
  })();
  