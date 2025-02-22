


// Global variables used in the scene
let cellSize, rows, cols;
let grid = [];      // 2D array representing zizi cells
let currentCell;    // Used during zizi generation
let stack = [];     // For recursive backtracking
let graphics;       // For drawing the zizi

let player;         // Player sprite
let playerCell = { row: 0, col: 0 }; // Player’s current grid coordinates

let targets = [];   // Array holding the three target sprites
let beams = [];     // Array holding beam obstacles
let isMoving = false; // Prevent overlapping moves
let isDraggingBeam = false;
let beamDragged = false;


// Phaser game configuration
const config = {
    type: Phaser.AUTO,
    backgroundColor: "#ffffff", // sets background color to white
    parent: 'zizi-game-container',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,         // Scales the game to fit the screen
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
        autoRound: true, // Add this for crisp rendering
        parent: 'zizi-game-container',
        expandParent: false // Important for WordPress containment
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    input: {
        touch: {
            capture: true,
            preventDefault: true // Add this here instead
        }
    }
};

function handleResize() {
    const container = document.getElementById('zizi-game-container');
    if (game && game.scale && container) {
        const rect = container.getBoundingClientRect();
        game.scale.resize(rect.width, rect.height);
        game.events.emit('resize', rect);
    }
}

// Add debounced resize listener
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 100);
});


function preload() {
    // Load target icons from the assets directory
    this.load.image('programmer', ziziGameAssets.baseUrl + 'programmer.png');
    this.load.image('contentCreator', ziziGameAssets.baseUrl + 'content-creator.png');
    this.load.image('freelancer', ziziGameAssets.baseUrl + 'freelancer.png');

    // Load the user sprite
    this.load.image('userSprite', ziziGameAssets.baseUrl + 'Pink_Monster.png');

    // Load the beam obstacle image
    this.load.image('beam', ziziGameAssets.baseUrl + 'beam.png');

    // Load celebration sound
    this.load.audio('celebration', ziziGameAssets.baseUrl + 'level-win-6416.mp3');
    const dpr = window.devicePixelRatio || 1;
    this.load.setPath(ziziGameAssets.baseUrl + (dpr > 1 ? 'hd/' : 'sd/'));
}

function create() {
    // Define cell size and calculate zizi dimensions (columns & rows)
    this.input.addPointer(3); // Enable multi-touch
    const baseSize = Math.min(this.scale.width, this.scale.height);
    cellSize = Phaser.Math.Clamp(Math.floor(baseSize / 8), 60, 100);
    cols = Math.floor(this.cameras.main.width / cellSize);
    rows = Math.floor(this.cameras.main.height / cellSize);
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 30;

    // --- 1. Create the grid of cells ---
    for (let row = 0; row < rows; row++) {
        grid[row] = [];
        for (let col = 0; col < cols; col++) {
            grid[row][col] = {
                row: row,
                col: col,
                walls: { top: true, right: true, bottom: true, left: true },
                visited: false
            };
        }
    }

    // --- 2. Generate the zizi using recursive backtracking ---
    currentCell = grid[0][0];
    currentCell.visited = true;
    stack = [];

    // Continue until every cell is visited
    while (true) {
        let next = checkNeighbors(currentCell);
        if (next) {
            next.visited = true;
            stack.push(currentCell);
            removeWalls(currentCell, next);
            currentCell = next;
        } else if (stack.length > 0) {
            currentCell = stack.pop();
        } else {
            break;
        }
    }

    // --- 3. Draw the zizi ---
    graphics = this.add.graphics();
    graphics.lineStyle(2, 0x000000);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let cell = grid[row][col];
            let x = col * cellSize;
            let y = row * cellSize;
            // Draw top wall
            if (cell.walls.top) {
                graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + cellSize, y));
            }
            // Draw right wall
            if (cell.walls.right) {
                graphics.strokeLineShape(new Phaser.Geom.Line(x + cellSize, y, x + cellSize, y + cellSize));
            }
            // Draw bottom wall
            if (cell.walls.bottom) {
                graphics.strokeLineShape(new Phaser.Geom.Line(x + cellSize, y + cellSize, x, y + cellSize));
            }
            // Draw left wall
            if (cell.walls.left) {
                graphics.strokeLineShape(new Phaser.Geom.Line(x, y + cellSize, x, y));
            }
        }
    }

    // --- 4. Create the player ---
    // Place the player at the center of the starting cell (0,0)
    player = this.physics.add.sprite(cellSize / 2, cellSize / 2, 'userSprite');
    player.setDepth(1);
    playerCell = { row: 0, col: 0 };

    // --- 5. Place the three targets ---
    targets = [];

    // Target 1: Programmer at the bottom-right cell
    let target1 = this.add.image((cols - 0.5) * cellSize, (rows - 0.5) * cellSize, 'programmer');
    target1.setScale(0.1);
    target1.cellRow = rows - 1;
    target1.cellCol = cols - 1;
    target1.setDepth(1);
    target1.targetType = "programmer";  // Add target type
    targets.push(target1);

    // Target 2: Content Creator at the bottom-left cell
    let target2 = this.add.image(cellSize / 2, (rows - 0.5) * cellSize, 'contentCreator');
    target2.setScale(0.1);
    target2.cellRow = rows - 1;
    target2.cellCol = 0;
    target2.setDepth(1);
    target2.targetType = "contentCreator";  // Add target type
    targets.push(target2);

    // Target 3: Freelancer at the top-right cell
    let target3 = this.add.image((cols - 0.5) * cellSize, cellSize / 2, 'freelancer');
    target3.setScale(0.1);
    target3.cellRow = 0;
    target3.cellCol = cols - 1;
    target3.setDepth(1);
    target3.targetType = "freelancer";  // Add target type
    targets.push(target3);

    // --- 6. Create movable beam obstacles ---
    const beamsCount = 5;
    for (let i = 0; i < beamsCount; i++) {
        let r, c;
        // Avoid placing a beam at the start or at any target positions
        do {
            r = Phaser.Math.Between(0, rows - 1);
            c = Phaser.Math.Between(0, cols - 1);
        } while ((r === 0 && c === 0) ||
                 targets.some(target => target.cellRow === r && target.cellCol === c));
        
        let beamSprite = this.physics.add.sprite(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2, 'beam');
        
        beamSprite.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, beamSprite.width, beamSprite.height),
            Phaser.Geom.Rectangle.Contains
          );
        beamSprite.targetType = 'beam';
        beamSprite.cellRow = r;
        beamSprite.cellCol = c;
        beams.push(beamSprite);
        this.input.setDraggable(beamSprite);
    }
    this.input.on('pointerdown', (pointer) => {
        
        beamDragged = false;
        touchStartX = pointer.x;
        touchStartY = pointer.y;
    });

    this.input.on('pointerup', (pointer) => {
        if (isMoving || beamDragged) return;
        const distX = pointer.x - touchStartX;
        const distY = pointer.y - touchStartY;
                
        const absX = Math.abs(distX);
        const absY = Math.abs(distY);

        if (Math.max(absX, absY) < minSwipeDistance) return;

        if (absX > absY) {
            if (distX > 0) tryMove('right', this);
             else tryMove('left', this);
          } else {
              if (distY > 0) tryMove('down', this);
              else tryMove('up', this);
        }
    });
    // Drag events for beams
    this.input.on('dragstart', function (pointer, gameObject) {
        if (pointer.event && pointer.event.preventDefault) {
            pointer.event.preventDefault();
        }
        if (gameObject.targetType === 'beam') {
            isDraggingBeam = true;
            beamDragged = true;
            // Optionally stop the event from propagating further
            if (pointer.event && pointer.event.stopPropagation) {
                pointer.event.stopPropagation();
            }
        }
    });
    // Allow beams to be dragged and snapped to grid
    this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
        gameObject.x = dragX;
        gameObject.y = dragY;
    });
    this.input.on('dragend', function (pointer, gameObject) {
        let newCol = Phaser.Math.Clamp(Math.floor(gameObject.x / cellSize), 0, cols - 1);
        let newRow = Phaser.Math.Clamp(Math.floor(gameObject.y / cellSize), 0, rows - 1);
        gameObject.x = newCol * cellSize + cellSize / 2;
        gameObject.y = newRow * cellSize + cellSize / 2;
        gameObject.cellCol = newCol;
        gameObject.cellRow = newRow;
        isDraggingBeam = false;  
        beamDragged = true;
        setTimeout(() => {
            beamDragged = false;
        }, 100);
    });

    // --- 7. Setup discrete player movement ---
    // Listen for arrow key presses and attempt a move if not already moving
    this.input.keyboard.on('keydown', (event) => {
        if (isMoving) return;
        let direction;
        if (event.code === 'ArrowUp') direction = 'up';
        else if (event.code === 'ArrowDown') direction = 'down';
        else if (event.code === 'ArrowLeft') direction = 'left';
        else if (event.code === 'ArrowRight') direction = 'right';
        if (direction) {
            tryMove(direction, this);
        }
    });

    handleResize();
}

function update() {
    // No continuous update is required for discrete movement.
}

// ----- Helper Functions -----

// Returns the cell at (row, col) or undefined if out of bounds
function index(row, col) {
    if (row < 0 || col < 0 || row >= rows || col >= cols) return undefined;
    return grid[row][col];
}

// Checks unvisited neighbors for the zizi generation
function checkNeighbors(cell) {
    let neighbors = [];
    let top = index(cell.row - 1, cell.col);
    let right = index(cell.row, cell.col + 1);
    let bottom = index(cell.row + 1, cell.col);
    let left = index(cell.row, cell.col - 1);

    if (top && !top.visited) neighbors.push(top);
    if (right && !right.visited) neighbors.push(right);
    if (bottom && !bottom.visited) neighbors.push(bottom);
    if (left && !left.visited) neighbors.push(left);

    if (neighbors.length > 0) {
        let randIndex = Phaser.Math.Between(0, neighbors.length - 1);
        return neighbors[randIndex];
    }
    return undefined;
}

// Removes the walls between two adjacent cells
function removeWalls(a, b) {
    let x = a.col - b.col;
    if (x === 1) {
        a.walls.left = false;
        b.walls.right = false;
    } else if (x === -1) {
        a.walls.right = false;
        b.walls.left = false;
    }
    let y = a.row - b.row;
    if (y === 1) {
        a.walls.top = false;
        b.walls.bottom = false;
    } else if (y === -1) {
        a.walls.bottom = false;
        b.walls.top = false;
    }
}

// Attempts to move the player in the given direction
function tryMove(direction, scene) {
    let current = grid[playerCell.row][playerCell.col];
    let targetRow = playerCell.row;
    let targetCol = playerCell.col;

    // Determine destination based on direction and check if the wall is removed
    if (direction === 'up') {
        if (!current.walls.top) targetRow--;
    } else if (direction === 'down') {
        if (!current.walls.bottom) targetRow++;
    } else if (direction === 'left') {
        if (!current.walls.left) targetCol--;
    } else if (direction === 'right') {
        if (!current.walls.right) targetCol++;
    }

    // Ensure destination is within bounds
    if (targetRow < 0 || targetRow >= rows || targetCol < 0 || targetCol >= cols) return;

    // Check if a beam obstacle occupies the destination cell
    for (let beam of beams) {
        if (beam.cellRow === targetRow && beam.cellCol === targetCol) {
            // Movement is blocked by a beam—user must rearrange it
            return;
        }
    }

    // If valid, update player's grid position and tween to new cell center
    isMoving = true;
    playerCell.row = targetRow;
    playerCell.col = targetCol;
    scene.tweens.add({
        targets: player,
        x: targetCol * cellSize + cellSize / 2,
        y: targetRow * cellSize + cellSize / 2,
        duration: 150,
        onComplete: () => {
            isMoving = false;
            // Check win condition: has the player reached any target cell?
            for (let t of targets) {
                if (playerCell.row === t.cellRow && playerCell.col === t.cellCol) {
                    winGame(scene, t.targetType);
                    break;
                }
            }
        }
    });
}

// Win condition: when the player reaches any target cell
function winGame(scene, targetType) {
    // Play celebration sound
    scene.sound.play('celebration');

    // Trigger confetti effect using the confetti library
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });

    // Display the modal popup (ensure your HTML contains an element with id "winModal")
    document.getElementById('winModal').style.display = 'block';

    // Set up the Play Again button
    document.getElementById('playAgainBtn').addEventListener('click', () => {
         // Restart the current scene
        scene.scene.restart();

        // Optionally, hide the modal if it remains visible
        document.getElementById('winModal').style.display = 'none';
    });

    // Determine the URL based on targetType
    let targetUrl = "";
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

    document.getElementById('visitPageBtn').onclick = () => {
        window.open(targetUrl, '_blank');
    };

    // Optionally pause the game physics to prevent further movement
    scene.physics.world.pause();
}

// Wrap game initialization in DOM ready check
document.addEventListener('DOMContentLoaded', () => {
    const game = new Phaser.Game(config);
    window.game = game; // Make globally available
    
    if (game.canvas) {
        game.canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
    }


});