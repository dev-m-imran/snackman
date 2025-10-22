let upPressed = false;
let downPressed = false;
let leftPressed = false;
let rightPressed = false;

const main = document.querySelector("main");

//Player = 2, Wall = 1, Enemy = 3, Point = 0
let maze = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 1, 0, 0, 0, 0, 3, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 0, 0, 1, 0, 3, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 3, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Making enemy positions random
const playerStart = { x: 1, y: 1 };
const enemyCount = 3;
const placedEnemies = [];

function isNearPlayer(x, y) {
  return Math.abs(x - playerStart.x) <= 1 && Math.abs(y - playerStart.y) <= 1;
}

function isNearAnotherEnemy(x, y) {
  return placedEnemies.some(
    (enemy) => Math.abs(x - enemy.x) <= 1 && Math.abs(y - enemy.y) <= 1
  );
}

function getValidEnemyPositions() {
  const validPositions = [];
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (
        maze[y][x] === 0 &&
        !isNearPlayer(x, y) &&
        !isNearAnotherEnemy(x, y)
      ) {
        validPositions.push({ x, y });
      }
    }
  }
  return validPositions;
}

function placeEnemiesRandomly() {
  for (let i = 0; i < enemyCount; i++) {
    const validPositions = getValidEnemyPositions();
    if (validPositions.length === 0) break;

    const index = Math.floor(Math.random() * validPositions.length);
    const { x, y } = validPositions[index];

    maze[y][x] = 3;
    placedEnemies.push({ x, y });
  }
}
// Remove existing enemies from the maze (reset any '3' to '0')
for (let y = 0; y < maze.length; y++) {
  for (let x = 0; x < maze[y].length; x++) {
    if (maze[y][x] === 3) {
      maze[y][x] = 0;
    }
  }
}
placeEnemiesRandomly();

let lastMoveDir = "";
let mouthTimeout = null;

let playerHitAnimation = false;
let playerDeadAnimation = false;

//Populates the maze in the HTML
function renderMaze() {
  main.innerHTML = "";
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      let block = document.createElement("div");
      block.classList.add("block");
      switch (maze[y][x]) {
        case 1:
          block.classList.add("wall");
          break;
        case 2:
          block.id = "player";
          if (playerHitAnimation) block.classList.add("hit");
          if (playerDeadAnimation) block.classList.add("dead");
          let mouth = document.createElement("div");
          mouth.classList.add("mouth");
          if (lastMoveDir) mouth.classList.add(lastMoveDir); // Only set direction if moving
          block.appendChild(mouth);
          break;
        case 3:
          block.classList.add("enemy");
          break;
        case 0:
          block.classList.add("point");
          block.style.height = "1vh";
          block.style.width = "1vh";
          break;
        case 4:
          // visited/empty, draw nothing extra
          break;
        default:
          break;
      }
      main.appendChild(block);
    }
  }
}
renderMaze();

// --- ENEMY MOVEMENT LOGIC (GRID-BASED) ---
// Get initial enemy positions from the maze
let enemyPositions = [];
for (let y = 0; y < maze.length; y++) {
  for (let x = 0; x < maze[y].length; x++) {
    if (maze[y][x] === 3) {
      enemyPositions.push({ x, y });
    }
  }
}
let enemyDirections = enemyPositions.map(() => {
  const directions = ["up", "down", "left", "right"];
  return directions[Math.floor(Math.random() * directions.length)];
});

function canEnemyMoveGrid(x, y, direction) {
  switch (direction) {
    case "up":
      return maze[y - 1][x] !== 1; // Can move if not a wall
    case "down":
      return maze[y + 1][x] !== 1;
    case "left":
      return maze[y][x - 1] !== 1;
    case "right":
      return maze[y][x + 1] !== 1;
  }
}

function getNewRandomDirection(currentDirection) {
  const directions = ["up", "down", "left", "right"];
  // Filter out the current direction to avoid immediate reversal
  const availableDirections = directions.filter(
    (dir) => dir !== currentDirection
  );
  return availableDirections[
    Math.floor(Math.random() * availableDirections.length)
  ];
}

function getAvailableDirections(x, y) {
  const directions = [];
  if (canEnemyMoveGrid(x, y, "up")) directions.push("up");
  if (canEnemyMoveGrid(x, y, "down")) directions.push("down");
  if (canEnemyMoveGrid(x, y, "left")) directions.push("left");
  if (canEnemyMoveGrid(x, y, "right")) directions.push("right");
  return directions;
}

// --- PLAYER MOVEMENT LOGIC (GRID-BASED) ---
let playerPos = { x: 0, y: 0 };
// Find initial player position
for (let y = 0; y < maze.length; y++) {
  for (let x = 0; x < maze[y].length; x++) {
    if (maze[y][x] === 2) {
      playerPos = { x, y };
    }
  }
}

let score = 0;
const scoreDisplay = document.getElementById("scoreUp");
function countTotalPoints() {
  let total = 0;
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 0) total++;
    }
  }
  console.log("Total food points:", total); // Debug log
  return total;
}
let totalPoints = countTotalPoints();

// --- LEADERBOARD & LIVES ---
function getScores() {
  return JSON.parse(localStorage.getItem("snackman_scores") || "[]");
}
function saveScore(name, score) {
  const scores = getScores();
  scores.push({ name, score });
  localStorage.setItem("snackman_scores", JSON.stringify(scores));
}
function updateLeaderboard() {
  const scores = getScores()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const ol = document.querySelector(".leaderboard ol");
  ol.innerHTML = "";
  for (const entry of scores) {
    const li = document.createElement("li");
    li.textContent = `${entry.name}........${entry.score}`;
    ol.appendChild(li);
  }
}
updateLeaderboard();

// --- LIVES ---
let lives = 3;
function renderLives() {
  const ul = document.querySelector(".lives ul");
  ul.innerHTML = "";
  for (let i = 0; i < lives; i++) {
    const li = document.createElement("li");
    ul.appendChild(li);
  }
}
renderLives();

// --- FREEZE PLAYER ON HIT ---
let frozen = false;
function freezePlayer() {
  frozen = true;
  playerHitAnimation = true;
  renderMaze();
  const main = document.querySelector("main");
  if (main) main.classList.add("game-flash");
  setTimeout(() => {
    frozen = false;
    playerHitAnimation = false;
    renderMaze();
    if (main) main.classList.remove("game-flash");
  }, 2000); // 2 seconds
}

// --- MODIFIED COLLISION LOGIC ---
function handleEnemyCollision() {
  if (frozen) return; // Prevent multiple hits during freeze
  lives--;
  renderLives();
  freezePlayer();
  if (lives <= 0) {
    endGame();
  }
}

function getValidName(promptMsg) {
  let name = "";
  while (!name || !name.trim()) {
    name = prompt(promptMsg);
    if (name === null) name = "";
    if (!name || !name.trim()) {
      alert("Please enter your name.");
    }
  }
  return name.trim();
}

function endGame() {
  gameOver = true;
  let name = getValidName("Game Over! Enter your name for the leaderboard:");
  saveScore(name, score);
  updateLeaderboard();
  showRestartButton();
}

// --- MODIFIED movePlayer ---
function movePlayer(dir) {
  if (gameOver || frozen) return;
  let { x, y } = playerPos;
  let nx = x,
    ny = y;
  switch (dir) {
    case "up":
      ny = y - 1;
      break;
    case "down":
      ny = y + 1;
      break;
    case "left":
      nx = x - 1;
      break;
    case "right":
      nx = x + 1;
      break;
  }
  // Only move if next cell is not a wall
  if (maze[ny][nx] !== 1) {
    // If next cell is enemy, lose a life
    if (maze[ny][nx] === 3) {
      handleEnemyCollision();
      return;
    }
    // If next cell is a point, eat it
    if (maze[ny][nx] === 0) {
      score++;
      scoreDisplay.textContent = score;
      totalPoints--;
      // Check if all food is collected
      if (totalPoints <= 0) {
        gameOver = true;
        let name = getValidName(
          "🎉 You win! Enter your name for the leaderboard:"
        );
        saveScore(name, score);
        updateLeaderboard();
        showRestartButton();
        return;
      }
    }
    maze[y][x] = 4; // Mark old position as visited/empty
    maze[ny][nx] = 2; // Set new position
    playerPos = { x: nx, y: ny };
    lastMoveDir = dir; // Track last move direction
    renderMaze();
    // Close mouth after 200ms
    if (mouthTimeout) clearTimeout(mouthTimeout);
    mouthTimeout = setTimeout(() => {
      lastMoveDir = "";
      renderMaze();
    }, 200);
  }
}

// Keyboard controls
function keyDown(event) {
  if (gameOver || frozen) return;
  if (event.key === "ArrowUp") movePlayer("up");
  else if (event.key === "ArrowDown") movePlayer("down");
  else if (event.key === "ArrowLeft") movePlayer("left");
  else if (event.key === "ArrowRight") movePlayer("right");
}

// On-screen button controls
const lbttn = document.getElementById("lbttn");
const rbttn = document.getElementById("rbttn");
const ubttn = document.getElementById("ubttn");
const dbttn = document.getElementById("dbttn");

// --- ENEMY COLLISION CHECK ---
function checkEnemyCollision() {
  for (let i = 0; i < enemyPositions.length; i++) {
    if (
      enemyPositions[i].x === playerPos.x &&
      enemyPositions[i].y === playerPos.y
    ) {
      gameOver = true;
      showGameOverMessage("💀 Game Over! You were caught!");
      return true;
    }
  }
  return false;
}

function moveEnemies() {
  enemyPositions.forEach((enemy, index) => {
    const availableDirections = getAvailableDirections(enemy.x, enemy.y);
    if (availableDirections.length > 0) {
      // If current direction is not available, choose a new one
      if (!availableDirections.includes(enemyDirections[index])) {
        enemyDirections[index] =
          availableDirections[
            Math.floor(Math.random() * availableDirections.length)
          ];
      }

      // Move enemy in current direction
      const newPos = { ...enemy };
      switch (enemyDirections[index]) {
        case "up":
          newPos.y--;
          break;
        case "down":
          newPos.y++;
          break;
        case "left":
          newPos.x--;
          break;
        case "right":
          newPos.x++;
          break;
      }

      // Store the content of the new position
      const newCellContent = maze[newPos.y][newPos.x];

      // Only move if the new position is not a wall
      if (newCellContent !== 1) {
        // If moving to player position, handle collision
        if (newCellContent === 2) {
          handleEnemyCollision();
          return;
        }

        // Store the original content of the old position
        const oldCellContent = maze[enemy.y][enemy.x];

        // Update enemy position
        // If the enemy was on food, restore the food
        if (enemy.hasFood) {
          maze[enemy.y][enemy.x] = 0; // Restore food
        } else {
          maze[enemy.y][enemy.x] = oldCellContent === 3 ? 4 : oldCellContent; // Preserve original cell content
        }

        // If moving to a food cell, preserve the food
        if (newCellContent === 0) {
          maze[newPos.y][newPos.x] = 3; // Place enemy
          // Store the food position to restore it later
          enemyPositions[index] = { ...newPos, hasFood: true };
        } else {
          maze[newPos.y][newPos.x] = 3; // Place enemy
          enemyPositions[index] = { ...newPos, hasFood: false };
        }
      } else {
        // If hit a wall, choose a new direction
        enemyDirections[index] = getNewRandomDirection(enemyDirections[index]);
      }
    } else {
      // If no directions available, choose a new random direction
      enemyDirections[index] = getNewRandomDirection(enemyDirections[index]);
    }
  });
  renderMaze();
}

// Start enemy movement when game starts
function startEnemyMovement() {
  setInterval(() => {
    if (!gameOver) moveEnemies();
  }, 600); // Slower movement
}

// Store the original maze for reset
const originalMaze = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 1, 0, 0, 0, 0, 3, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 0, 0, 1, 0, 3, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 3, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Add Restart button to the startDiv, hidden by default
let startDiv = document.querySelector(".startDiv");
let restartBtn = document.createElement("div");
restartBtn.className = "start";
restartBtn.id = "restart_button";
restartBtn.style.display = "none";
restartBtn.innerHTML = `<img src="images/icon.png" alt="logo" /><h1>Restart?</h1>`;
startDiv.appendChild(restartBtn);

function resetGame() {
  // Reset all game state
  maze = originalMaze.map((row) => row.slice());
  placedEnemies.length = 0;
  playerPos = { x: 0, y: 0 };
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 2) playerPos = { x, y };
    }
  }
  score = 0;
  scoreDisplay.textContent = score;
  totalPoints = countTotalPoints();
  lastMoveDir = "";
  gameOver = false;
  lives = 3;
  renderLives();
  // Remove all enemies and re-place them
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 3) maze[y][x] = 0;
    }
  }
  placeEnemiesRandomly();
  // Re-initialize enemy positions and directions
  enemyPositions = [];
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 3) enemyPositions.push({ x, y });
    }
  }
  enemyDirections = enemyPositions.map(() => {
    const directions = ["up", "down", "left", "right"];
    return directions[Math.floor(Math.random() * directions.length)];
  });
  renderMaze();
  document.getElementById("game-over").style.display = "none";
}

// Show Restart button on game over
function showRestartButton() {
  restartBtn.style.display = "flex";
}
function hideRestartButton() {
  restartBtn.style.display = "none";
}

// When the start button is pressed, the start button is no longer visible
const startButton = document.querySelector("#start_button");
function removeStartButton() {
  startButton.style.display = "none";
  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);
  startEnemyMovement(); // Start enemy movement here
  lbttn.onclick = () => movePlayer("left");
  rbttn.onclick = () => movePlayer("right");
  ubttn.onclick = () => movePlayer("up");
  dbttn.onclick = () => movePlayer("down");
}
startButton.addEventListener("click", removeStartButton);

// When the restart button is pressed, reset the game
restartBtn.addEventListener("click", function () {
  resetGame();
  hideRestartButton();
  startEnemyMovement();
});

// Update all game over displays to show Restart button
function showGameOverMessage(msg) {
  const gameOverDiv = document.getElementById("game-over");
  gameOverDiv.textContent = msg;
  gameOverDiv.style.display = "block";
  showRestartButton();
  // If caught, hide message after 2 seconds
  if (msg.includes("caught")) {
    setTimeout(() => {
      gameOverDiv.style.display = "none";
    }, 2000);
  }
}

//Player movement
function keyUp(event) {
  if (event.key === "ArrowUp") {
    upPressed = false;
  } else if (event.key === "ArrowDown") {
    downPressed = false;
  } else if (event.key === "ArrowLeft") {
    leftPressed = false;
  } else if (event.key === "ArrowRight") {
    rightPressed = false;
  }
}

const player = document.querySelector("#player");
const playerMouth = player.querySelector(".mouth");
let playerTop = 0;
let playerLeft = 0;

function moveDown() {
  playerTop++;
  player.style.top = playerTop + "px";
  playerMouth.classList = "down";
}

function moveUp() {
  playerTop--;
  player.style.top = playerTop + "px";
  playerMouth.classList = "up";
}

function moveLeft() {
  playerLeft--;
  player.style.left = playerLeft + "px";
  playerMouth.classList = "left";
}

function moveRight() {
  playerLeft++;
  player.style.left = playerLeft + "px";
  playerMouth.classList = "right";
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
let gameOver = false;
async function moveInDirection() {
  if (gameOver) return;
  if (downPressed && canMove()) {
    moveDown();
  } else if (upPressed && canMove()) {
    moveUp();
  } else if (leftPressed && canMove()) {
    moveLeft();
  } else if (rightPressed && canMove()) {
    moveRight();
  }
}

setInterval(moveInDirection, 10);

function canMove() {
  const position = player.getBoundingClientRect();
  if (downPressed) {
    let newDown = position.bottom + 1;
    let downL = document.elementFromPoint(position.left, newDown);
    let downR = document.elementFromPoint(position.right, newDown);
    return !(
      downL.classList.contains("wall") || downR.classList.contains("wall")
    );
  }

  if (upPressed) {
    let newUp = position.top - 1;
    let upL = document.elementFromPoint(position.left, newUp);
    let upR = document.elementFromPoint(position.right, newUp);
    return !(upL.classList.contains("wall") || upR.classList.contains("wall"));
  }
  if (leftPressed) {
    let newLeft = position.left - 1;
    let leftT = document.elementFromPoint(newLeft, position.top);
    let leftB = document.elementFromPoint(newLeft, position.bottom);
    return !(
      leftT.classList.contains("wall") || leftB.classList.contains("wall")
    );
  }
  if (rightPressed) {
    let newRight = position.right + 1;
    let rightT = document.elementFromPoint(newRight, position.top);
    let rightB = document.elementFromPoint(newRight, position.bottom);
    return !(
      rightT.classList.contains("wall") || rightB.classList.contains("wall")
    );
  }
}

// setInterval(move, 5);

function deathAnimationByEnemy() {
  const enemies = document.querySelectorAll(".enemy");
  const playerRect = player.getBoundingClientRect();
  const main = document.querySelector("main");

  for (let i = 0; i < enemies.length; i++) {
    const enemyRect = enemies[i].getBoundingClientRect();
    if (
      playerRect.right > enemyRect.left &&
      playerRect.left < enemyRect.right &&
      playerRect.bottom > enemyRect.top &&
      playerRect.top < enemyRect.bottom
    ) {
      gameOver = true;
      playerDeadAnimation = true;
      renderMaze();
      if (main) main.classList.add("game-flash");
      setTimeout(() => {
        showGameOverMessage("💀 Game Over! You were caught!");
        playerDeadAnimation = false;
        renderMaze();
        if (main) main.classList.remove("game-flash");
      }, 2000); // 2 seconds
      return;
    }
  }
}
setInterval(deathAnimationByEnemy, 10);
