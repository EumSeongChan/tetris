const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const EMPTY = 0;

const COLORS = [
    null,
    '#00f0f0', // I - cyan
    '#f0f000', // O - yellow
    '#a000f0', // T - purple
    '#00f000', // S - green
    '#f00000', // Z - red
    '#0000f0', // J - blue
    '#f0a000'  // L - orange
];

const SHAPES = [
    [],
    [[1,1,1,1]],                    // I
    [[1,1],[1,1]],                  // O
    [[0,1,0],[1,1,1]],             // T
    [[0,1,1],[1,1,0]],             // S
    [[1,1,0],[0,1,1]],             // Z
    [[1,0,0],[1,1,1]],             // J
    [[0,0,1],[1,1,1]]              // L
];

class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.started = false;
        this.dropInterval = 1000;
        this.lastDrop = 0;
        this.animationId = null;

        this.startScreen = document.getElementById('startScreen');
        this.pauseScreen = document.getElementById('pauseScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');

        this.initBoard();
        this.bindEvents();
    }

    initBoard() {
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKey(e));
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    }

    handleKey(e) {
        if (!this.started || this.gameOver) return;

        if (e.key === 'p' || e.key === 'P') {
            this.togglePause();
            return;
        }

        if (this.paused) return;

        switch(e.key) {
            case 'ArrowLeft':
                this.move(-1, 0);
                break;
            case 'ArrowRight':
                this.move(1, 0);
                break;
            case 'ArrowDown':
                if (this.move(0, 1)) {
                    this.score += 1;
                    this.updateStats();
                }
                break;
            case 'ArrowUp':
                this.rotate();
                break;
            case ' ':
                e.preventDefault();
                this.hardDrop();
                break;
        }
    }

    start() {
        this.initBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        this.gameOver = false;
        this.paused = false;
        this.started = true;

        this.spawnPiece();
        this.nextPiece = this.randomPiece();
        this.updateStats();
        this.drawNextPiece();

        this.startScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.lastDrop = performance.now();
        this.gameLoop();
    }

    restart() {
        this.start();
    }

    togglePause() {
        if (this.gameOver) return;

        this.paused = !this.paused;

        if (this.paused) {
            this.pauseScreen.classList.remove('hidden');
        } else {
            this.pauseScreen.classList.add('hidden');
            this.lastDrop = performance.now();
            this.gameLoop();
        }
    }

    randomPiece() {
        const id = Math.floor(Math.random() * 7) + 1;
        const shape = SHAPES[id].map(row => [...row]);
        return {
            shape: shape,
            color: COLORS[id],
            x: Math.floor((COLS - shape[0].length) / 2),
            y: 0
        };
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece || this.randomPiece();
        this.currentPiece.x = Math.floor((COLS - this.currentPiece.shape[0].length) / 2);
        this.currentPiece.y = 0;
        this.nextPiece = this.randomPiece();
        this.drawNextPiece();

        if (this.collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
            this.endGame();
        }
    }

    collides(shape, offsetX, offsetY) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newX = offsetX + x;
                    const newY = offsetY + y;

                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }

                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    move(dx, dy) {
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;

        if (!this.collides(this.currentPiece.shape, newX, newY)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            return true;
        }
        return false;
    }

    rotate() {
        const shape = this.currentPiece.shape;
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                rotated[x][rows - 1 - y] = shape[y][x];
            }
        }

        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;

        // Wall kick attempts
        const kicks = [0, -1, 1, -2, 2];
        let valid = false;

        for (const kick of kicks) {
            if (!this.collides(rotated, this.currentPiece.x + kick, this.currentPiece.y)) {
                this.currentPiece.x += kick;
                valid = true;
                break;
            }
        }

        if (!valid) {
            this.currentPiece.shape = originalShape;
        }
    }

    hardDrop() {
        let dropDistance = 0;
        while (!this.collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        this.score += dropDistance * 2;
        this.updateStats();
        this.lockPiece();
    }

    lockPiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;

                    if (boardY >= 0) {
                        this.board[boardY][boardX] = COLORS.indexOf(this.currentPiece.color);
                    }
                }
            }
        }

        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;

        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== EMPTY)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(COLS).fill(EMPTY));
                linesCleared++;
                y++;
            }
        }

        if (linesCleared > 0) {
            const points = [0, 100, 300, 500, 800];
            this.score += points[linesCleared] * this.level;
            this.lines += linesCleared;

            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);

            this.updateStats();
        }
    }

    getGhostY() {
        let ghostY = this.currentPiece.y;
        while (!this.collides(this.currentPiece.shape, this.currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    updateStats() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    drawBlock(ctx, x, y, color, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, 3);
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 3, BLOCK_SIZE - 1);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x * BLOCK_SIZE + BLOCK_SIZE - 4, y * BLOCK_SIZE, 3, BLOCK_SIZE - 1);
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE + BLOCK_SIZE - 4, BLOCK_SIZE - 1, 3);

        ctx.globalAlpha = 1;
    }

    drawBoard() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.ctx.strokeStyle = '#1a1a2e';
        this.ctx.lineWidth = 0.5;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                this.ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }

        // Draw placed pieces
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(this.ctx, x, y, COLORS[this.board[y][x]]);
                }
            }
        }
    }

    drawCurrentPiece() {
        // Draw ghost piece
        const ghostY = this.getGhostY();
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    this.drawBlock(this.ctx, this.currentPiece.x + x, ghostY + y, this.currentPiece.color, 0.3);
                }
            }
        }

        // Draw current piece
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    this.drawBlock(this.ctx, this.currentPiece.x + x, this.currentPiece.y + y, this.currentPiece.color);
                }
            }
        }
    }

    drawNextPiece() {
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (!this.nextPiece) return;

        const shape = this.nextPiece.shape;
        const blockSize = 18;
        const offsetX = (this.nextCanvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - shape.length * blockSize) / 2;

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const px = offsetX + x * blockSize;
                    const py = offsetY + y * blockSize;

                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(px, py, blockSize - 1, blockSize - 1);

                    this.nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    this.nextCtx.fillRect(px, py, blockSize - 1, 2);
                    this.nextCtx.fillRect(px, py, 2, blockSize - 1);
                }
            }
        }
    }

    endGame() {
        this.gameOver = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        document.getElementById('finalScore').textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
    }

    gameLoop(timestamp) {
        if (this.gameOver || this.paused) return;

        const deltaTime = timestamp - this.lastDrop;

        if (deltaTime > this.dropInterval) {
            if (!this.move(0, 1)) {
                this.lockPiece();
            }
            this.lastDrop = timestamp;
        }

        this.drawBoard();
        this.drawCurrentPiece();

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// Initialize game
const game = new Tetris();
