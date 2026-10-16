import { Application, Graphics } from "pixi.js";

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // 30x30 pixels per square

// 7 Classic Tetromino shapes & colors
const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
};
const COLORS = [0x00ffff, 0x0000ff, 0xffa500, 0xffff00, 0x00ff00, 0x800080, 0xff0000];
const SHAPE_KEYS = Object.keys(SHAPES);

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ width: 300, height: 600, backgroundColor: 0x111111 });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);
  // 2. Initialize Logic Grid (10x20 filled with 0s)
  let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  // Active piece state
  let currentPiece = null;
  let dropTimer = 0;
  const dropInterval = 1000; // Falls every 1000ms (1 second)

  // A single Graphics object handles all board rendering for performance
  const gameContainer = new Graphics();
  app.stage.addChild(gameContainer);
  // 3. Spawning Pieces
  function spawnPiece() {
    const randomKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    const colorIndex = SHAPE_KEYS.indexOf(randomKey) + 1;

    currentPiece = {
      matrix: SHAPES[randomKey],
      color: COLORS[colorIndex - 1],
      colorIndex: colorIndex,
      x: Math.floor((COLS - SHAPES[randomKey][0].length) / 2),
      y: 0
    };

    // Game Over condition: Newly spawned piece immediately collides
    if (checkCollision(currentPiece.x, currentPiece.y, currentPiece.matrix)) {
      alert("Game Over!");
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); // Reset
    }
  }
  // 4. Collision Detection
  function checkCollision(nextX, nextY, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          let boardX = nextX + c;
          let boardY = nextY + r;

          // Wall bounds check
          if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;

          // Static grid collision check (ignore above screen spawns)
          if (boardY >= 0 && grid[boardY][boardX]) return true;
        }
      }
    }
    return false;
  }
  // 5. Locking Pieces & Line Clearing
  function lockPiece() {
    for (let r = 0; r < currentPiece.matrix.length; r++) {
      for (let c = 0; c < currentPiece.matrix[r].length; c++) {
        if (currentPiece.matrix[r][c]) {
          if (currentPiece.y + r >= 0) {
            grid[currentPiece.y + r][currentPiece.x + c] = currentPiece.colorIndex;
          }
        }
      }
    }
    clearLines();
    spawnPiece();
  }

  function clearLines() {
    // Filter out rows that are entirely filled
    grid = grid.filter(row => row.some(cell => cell === 0));
    // Refill the top with empty rows
    while (grid.length < ROWS) {
      grid.unshift(Array(COLS).fill(0));
    }
  }
  // 6. Piece Movements
  function moveLeft() {
    if (!checkCollision(currentPiece.x - 1, currentPiece.y, currentPiece.matrix)) currentPiece.x--;
  }
  function moveRight() {
    if (!checkCollision(currentPiece.x + 1, currentPiece.y, currentPiece.matrix)) currentPiece.x++;
  }
  function drop() {
    if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.matrix)) {
      currentPiece.y++;
    } else {
      lockPiece();
    }
  }
  function rotate() {
    // Transpose and reverse matrix to rotate 90 deg
    const rotated = currentPiece.matrix[0].map((_, i) => currentPiece.matrix.map(row => row[i]).reverse());
    if (!checkCollision(currentPiece.x, currentPiece.y, rotated)) {
      currentPiece.matrix = rotated;
    }
  }

  // 7. Inputs
  window.addEventListener('keydown', (e) => {
    if (!currentPiece) return;
    if (e.key === 'ArrowLeft') moveLeft();
    if (e.key === "ArrowRight") moveRight();
    if (e.key === 'ArrowDown') drop();
    if (e.key === 'ArrowUp') rotate();
  });

  // 8. Render Engine
  function draw() {
    gameContainer.clear();

    // Draw Locked Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          gameContainer.rect(
            c * BLOCK_SIZE,
            r * BLOCK_SIZE,
            BLOCK_SIZE - 1,
            BLOCK_SIZE - 1,
          );
          gameContainer.fill({ color: COLORS[grid[r][c] - 1] });
        }
      }
    }

    // Draw Active Falling Piece
    if (currentPiece) {
      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c]) {
            gameContainer.rect(
              (currentPiece.x + c) * BLOCK_SIZE,
              (currentPiece.y + r) * BLOCK_SIZE,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1,
            );
            gameContainer.fill({ color: currentPiece.color });
          }
        }
      }
    }
  }
  // Start game
  spawnPiece();

  // 9. PixiJS Ticker (Updates game over time)
  app.ticker.add((ticker) => {
    dropTimer += ticker.deltaMS; // Accumulate real passing milliseconds
    if (dropTimer >= dropInterval) {
      drop();
      dropTimer = 0;
    }
    draw(); // Redraw frame
  });

})();
