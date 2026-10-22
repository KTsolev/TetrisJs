import { Application, Graphics, Text, Assets } from "pixi.js";
import { Input, FancyButton } from '@pixi/ui';
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
  Z: [[1, 1, 0], [0, 1, 1]],
} as const;
const COLORS = [0x00ffff, 0x0000ff, 0xffa500, 0xffff00, 0x00ff00, 0x800080, 0xff0000];
const SHAPE_KEYS = Object.keys(SHAPES) as Array<keyof typeof SHAPES>;

(async () => {
  // Create a new application
  const app = new Application();
  let lines = 0;
  let score = 0;
  let level = 1;

  // Initialize the application
  await app.init({ width: 600, height: 600, backgroundColor: 0x111111 });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  Assets.addBundle('fonts', {
    ChaChicle: 'https://pixijs.com/assets/webfont-loader/ChaChicle.ttf',
    Lineal: 'https://pixijs.com/assets/webfont-loader/Lineal.otf',
    Dotrice: 'https://pixijs.com/assets/webfont-loader/Dotrice-Regular.woff',
    Crosterian: 'https://pixijs.com/assets/webfont-loader/Crosterian.woff2',
  });

  // 2. Initialize Logic Grid (10x20 filled with 0s)
  let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let isGameOn = true;

  type Piece = {
    matrix: number[][];
    color: number;
    colorIndex: number;
    x: number;
    y: number;
  };

  // Active piece state
  let currentPiece: Piece | null = null;
  let nextPieceState: Piece | null = null;
  let dropTimer = 0;
  let dropInterval = 1000; // Falls every 1000ms (1 second)

  // A single Graphics object handles all board rendering for performance
  const gameContainer = new Graphics();
  const nextPiece = new Graphics();

  await Assets.loadBundle('fonts')

  const text = new Text({
    text: 'Next Piece:',
    style: {
      fontFamily: 'Dotrice Regular',
      fontSize: 32,
      fill: 0xffffff,
    }
  });

  let scoreText = new Text({
    text: 'Score: ' + score,
    style: {
      fontFamily: 'Dotrice Regular',
      fontSize: 32,
      fill: 0xffffff,
    }
  });

  let linesText = new Text({
    text: 'Lines: ' + lines,
    style: {
      fontFamily: 'Dotrice Regular',
      fontSize: 32,
      fill: 0xffffff,
    }
  });


  let levelText = new Text({
    text: 'Level: ' + level,
    style: {
      fontFamily: 'Dotrice Regular',
      fontSize: 32,
      fill: 0xffffff,
    }
  });

  let gameOver = new Text({
    text: '',
    style: {
      fontFamily: 'Dotrice Regular',
      fontSize: 32,
      fill: 0xffffff,
    }
  });

  app.stage.addChild(gameContainer);
  app.stage.addChild(nextPiece);
  app.stage.addChild(text);
  app.stage.addChild(linesText);
  app.stage.addChild(scoreText);
  app.stage.addChild(levelText);
  app.stage.addChild(gameOver);

  function createRandomPiece(): Piece {
    const randomKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    const colorIndex = SHAPE_KEYS.indexOf(randomKey) + 1;

    return {
      matrix: SHAPES[randomKey].map(row => [...row]),
      color: COLORS[colorIndex - 1],
      colorIndex,
      x: Math.floor((COLS - SHAPES[randomKey][0].length) / 2),
      y: 0,
    };
  }

  // 3. Spawning Pieces
  function spawnPiece() {
    const pieceToSpawn = nextPieceState ?? createRandomPiece();

    currentPiece = {
      ...pieceToSpawn,
      x: Math.floor((COLS - pieceToSpawn.matrix[0].length) / 2),
      y: 0,
    };

    nextPieceState = createRandomPiece();

    // Game Over condition: Newly spawned piece immediately collides
    // if (true) {
    if (checkCollision(currentPiece.x, currentPiece.y, currentPiece.matrix)) {
      isGameOn = false;
      renderSaveProgres();
    }
  }

  // 4. Collision Detection
  function checkCollision(nextX: number, nextY: number, matrix: number[][]): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const boardX = nextX + c;
          const boardY = nextY + r;

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
    if (!currentPiece) return;

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
    const remaining = grid.filter(row => row.some(cell => cell === 0));
    const cleared = ROWS - remaining.length;

    grid = Array.from({ length: cleared }, () => Array(COLS).fill(0)).concat(remaining);

    if (cleared === 0) return;

    lines += cleared;
    score += cleared * 100;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 200);
    levelText.text = 'Level: ' + level;
  }

  // 6. Piece Movements
  function moveLeft() {
    if (!currentPiece) return;
    if (!checkCollision(currentPiece.x - 1, currentPiece.y, currentPiece.matrix)) currentPiece.x--;
  }

  function moveRight() {
    if (!currentPiece) return;
    if (!checkCollision(currentPiece.x + 1, currentPiece.y, currentPiece.matrix)) currentPiece.x++;
  }

  function drop() {
    if (!isGameOn) return;
    if (!currentPiece) return;
    if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.matrix)) {
      currentPiece.y++;
    } else {
      lockPiece();
    }
  }

  function rotate() {
    if (!currentPiece) return;

    const piece = currentPiece;
    // Transpose and reverse matrix to rotate 90 deg
    const rotated = piece.matrix[0].map((_, i) => piece.matrix.map(row => row[i]).reverse());
    if (!checkCollision(piece.x, piece.y, rotated)) {
      piece.matrix = rotated;
    }
  }

  function clearResults() {
    level = 1;
    score = 0;
    lines = 0;
    isGameOn = true;
    scoreText.text = 'Score: ' + 0;
    linesText.text = 'Lines: ' + 0;
    levelText.text = 'Level:' + 1;
  }

  function renderSaveProgres() {
    let name: string = "";
    gameOver.position.set(50, 60);
    gameOver.text = 'Game Over!';
    // 2. Create a background graphic for the text box
    const inputBg = new Graphics()
      .roundRect(0, 0, 250, 50, 50)
      .fill({ color: 0xffffff })
      .stroke({ width: 2, color: 0x2c3e50 });

    // 3. Instantiate the Input Component
    const textInput = new Input({
      bg: inputBg,                    // The background asset
      placeholder: 'Enter name...',   // Temporary placeholder text
      value: name || '', // Initial text value
      padding: {                      // Inside spacing for text placement
        top: 12,
        right: 15,
        bottom: 12,
        left: 15
      },
      textStyle: {      // Standard PixiJS text configurations
        fill: 0x2c3e50,
        fontSize: 18,
        fontFamily: 'Dotrice Regular'
      }
    });

    // 4. Position and add to stage
    textInput.position.set(20, 120)
    const defaultView = new Graphics().roundRect(0, 0, 150, 50, 10).fill(0x1e90ff);
    const text = new Text({
      text: 'Save',
      style: {
        fill: 0xffffff,
        fontFamily: 'Dotrice Regular',
        fontSize: 18,
      }
    });

    const button = new FancyButton({
      defaultView: defaultView,
      text: text,
    });

    button.onPress.connect(() => {
      console.log('FancyButton pressed!');
      saveData(name);
    });

    button.position.set(70, 190);
    // 5. Accessing the value on changes
    textInput.onChange.connect((value) => {
      name = value;
      console.log("Current text:", value);
    });

    app.stage.addChild(textInput);
    app.stage.addChild(button);
  }

  function saveData(name: string) {
    const playerName = name.trim();
    if (!playerName) return;

    const testObject = {
      name: playerName,
      score,
      lines,
      level,
    };
    localStorage.setItem(testObject.name, JSON.stringify(testObject));
  }

  // 7. Inputs
  window.addEventListener('keydown', (e) => {
    if (!isGameOn || !currentPiece) return;
    if (e.key === 'ArrowLeft') moveLeft();
    if (e.key === "ArrowRight") moveRight();
    if (e.key === 'ArrowDown') drop();
    if (e.key === 'ArrowUp') rotate();
  });

  // 8. Render Engine
  function draw() {
    gameContainer.clear();
    nextPiece.clear();

    // main board border
    gameContainer.rect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    gameContainer.stroke({ width: 3, color: 0xffffff });

    // next piece border
    nextPiece.position.set(360, 80);
    text.position.set(320, 0);
    scoreText.text = 'Score: ' + score;
    scoreText.position.set(320, 450);
    linesText.text = 'Lines: ' + lines;
    linesText.position.set(320, 500);

    nextPiece.rect(0, 0, 6 * BLOCK_SIZE, 6 * BLOCK_SIZE);
    nextPiece.stroke({ width: 3, color: 0xffa500 });


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

    // Draw next piece preview
    if (nextPieceState) {
      const previewOffsetX = 2;
      const previewOffsetY = 2;
      const matrix = nextPieceState.matrix;
      const offsetX = Math.floor((4 - matrix[0].length) / 2);

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            nextPiece.rect(
              (offsetX + c) * BLOCK_SIZE + previewOffsetX,
              (r + previewOffsetY) * BLOCK_SIZE + previewOffsetY,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1,
            );
            nextPiece.fill({ color: nextPieceState.color });
          }
        }
      }
    }
  }

  // Start game
  nextPieceState = createRandomPiece();
  clearResults();
  spawnPiece();

  // 9. PixiJS Ticker (Updates game over time)
  app.ticker.add((ticker) => {
    // if (!isGameOn) return;
    dropTimer += ticker.deltaMS; // Accumulate real passing milliseconds
    if (dropTimer >= dropInterval) {
      drop();
      dropTimer = 0;
    }
    draw(); // Redraw frame
  });

})();
