const TILE = 36;
const COLS = 19;
const ROWS = 13;
const W = COLS * TILE;
const H = ROWS * TILE;
const FLOOR_ROW = ROWS - 1;
const GRAVITY = 2000;
const GRAVITY_RISE = 1500;
const JUMP_V = 760;
const MAX_FALL = 620;
const PLAYER_SPEED = 190;
const MAX_BUBBLES = 6;

const FRUITS = [
    { name: '체리', value: 500, color: '#ff5555' },
    { name: '딸기', value: 800, color: '#ff6b81' },
    { name: '포도', value: 1200, color: '#b06bff' },
    { name: '오렌지', value: 1500, color: '#ffa14d' },
    { name: '케이크', value: 2000, color: '#ffd166' }
];

const ENEMY_TYPES = {
    walker: { color: '#ff4d4d', speed: 70, ring: '#ff8080' },
    jumper: { color: '#ffb84d', speed: 78, ring: '#ffd9a0' },
    chaser: { color: '#c84dff', speed: 100, ring: '#e0a0ff' },
    hopper: { color: '#4dc3ff', speed: 58, ring: '#a0e8ff' }
};

const LEVELS = [
    {
        name: '동굴',
        platforms: [
            [2, [[7, 11]]],
            [4, [[2, 7], [11, 16]]],
            [7, [[2, 7], [11, 16]]],
            [9, [[3, 7], [11, 15]]]
        ],
        enemies: [
            ['walker', 4, FLOOR_ROW],
            ['walker', 15, FLOOR_ROW],
            ['jumper', 3, 7],
            ['chaser', 9, 2],
            ['hopper', 9, FLOOR_ROW]
        ]
    },
    {
        name: '중앙의 탑',
        platforms: [
            [2, [[4, 6], [8, 10], [12, 14]]],
            [4, [[1, 6], [7, 12], [13, 17]]],
            [6, [[3, 8], [11, 16]]],
            [8, [[5, 13]]],
            [10, [[1, 7], [12, 17]]]
        ],
        enemies: [
            ['walker', 4, FLOOR_ROW],
            ['walker', 16, FLOOR_ROW],
            ['jumper', 9, 4],
            ['walker', 5, 10],
            ['chaser', 5, 2],
            ['hopper', 9, FLOOR_ROW]
        ]
    },
    {
        name: '폭포의 미로',
        platforms: [
            [2, [[8, 10]]],
            [4, [[2, 6], [12, 16]]],
            [5, [[8, 10]]],
            [7, [[1, 16]]],
            [9, [[4, 7], [9, 14]]]
        ],
        enemies: [
            ['walker', 4, FLOOR_ROW],
            ['walker', 15, FLOOR_ROW],
            ['jumper', 5, 9],
            ['jumper', 12, 9],
            ['chaser', 9, 2],
            ['hopper', 9, 5],
            ['walker', 3, 6]
        ]
    },
    {
        name: '구불구불 길',
        platforms: [
            [2, [[2, 16]]],
            [4, [[5, 13]]],
            [6, [[1, 7], [12, 17]]],
            [8, [[3, 15]]],
            [10, [[1, 17]]]
        ],
        enemies: [
            ['walker', 3, 10],
            ['walker', 16, 10],
            ['jumper', 7, 6],
            ['chaser', 9, 4],
            ['hopper', 5, 2],
            ['jumper', 15, 2]
        ]
    },
    {
        name: '거품 성채',
        platforms: [
            [2, [[3, 5], [9, 11], [15, 17]]],
            [4, [[1, 17]]],
            [6, [[3, 17]]],
            [8, [[1, 15]]],
            [10, [[5, 17]]]
        ],
        enemies: [
            ['walker', 6, 10],
            ['walker', 15, 10],
            ['jumper', 4, 4],
            ['jumper', 14, 4],
            ['chaser', 9, 2],
            ['hopper', 9, 4],
            ['walker', 5, 6],
            ['chaser', 10, 6]
        ]
    }
];

class BubbleBobble {
    constructor() {
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.score = 0;
        this.high = parseInt(localStorage.getItem('bubbleBobbleHigh')) || 0;
        this.lives = 3;
        this.level = 1;
        this.chain = 0;
        this.chainTimer = 0;

        this.map = null;
        this.levelData = null;
        this.spawnX = 0;
        this.spawnY = 0;

        this.player = null;
        this.enemies = [];
        this.bubbles = [];
        this.trapped = [];
        this.fruits = [];
        this.fx = [];
        this.decor = [];

        this.keys = {};
        this.oldJump = false;
        this.started = false;
        this.paused = false;
        this.gameOver = false;
        this.cleared = false;
        this.time = 0;
        this.decorTimer = 0;

        this.audio = null;

        this.startScreen = document.getElementById('startScreen');
        this.pauseScreen = document.getElementById('pauseScreen');
        this.clearScreen = document.getElementById('clearScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');

        this.bindEvents();
        this.loadLevel(1);
        this.draw();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.start());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextLevel());

        const hold = (id, code) => {
            const btn = document.getElementById(id);
            const press = (e) => {
                e.preventDefault();
                this.keys[code] = true;
                btn.classList.add('active');
            };
            const release = () => {
                this.keys[code] = false;
                btn.classList.remove('active');
            };
            btn.addEventListener('pointerdown', press);
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointerleave', release);
            btn.addEventListener('pointercancel', release);
        };
        hold('leftBtn', 'touchLeft');
        hold('rightBtn', 'touchRight');
        hold('jumpBtn', 'touchJump');
        hold('shootBtn', 'touchShoot');
    }

    handleKeyDown(e) {
        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (this.started && !this.gameOver && !this.cleared) {
                this.togglePause();
            }
            return;
        }
        if (!this.started) {
            if (e.code === 'Space' || e.code === 'Enter') this.start();
            return;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
        this.keys[e.code] = true;
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    isSolid(c, r) {
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
        return this.map[r][c] === 'X';
    }

    solidBox(x, y, w, h) {
        const c0 = Math.floor(x / TILE);
        const c1 = Math.floor((x + w - 0.5) / TILE);
        const r0 = Math.floor(y / TILE);
        const r1 = Math.floor((y + h - 0.5) / TILE);
        for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
            for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++) {
                if (this.map[r][c] === 'X') return true;
            }
        }
        return false;
    }

    moveEntity(e, dx, dy) {
        const res = { hitGround: false, hitCeil: false };
        if (dx !== 0) {
            const nx = e.x + dx;
            if (!this.solidBox(nx, e.y, e.w, e.h)) {
                e.x = nx;
            } else {
                if (dx > 0) {
                    const col = Math.floor((nx + e.w - 0.5) / TILE);
                    e.x = col * TILE - e.w;
                } else {
                    const col = Math.floor((nx + 0.5) / TILE);
                    e.x = (col + 1) * TILE;
                }
                e.vx = 0;
            }
        }
        if (dy !== 0) {
            const ny = e.y + dy;
            if (!this.solidBox(e.x, ny, e.w, e.h)) {
                e.y = ny;
            } else {
                if (dy > 0) {
                    const row = Math.floor((ny + e.h - 0.5) / TILE);
                    e.y = row * TILE - e.h;
                    e.vy = 0;
                    res.hitGround = true;
                } else {
                    const row = Math.floor((ny + 0.5) / TILE);
                    e.y = (row + 1) * TILE;
                    e.vy = 0;
                    res.hitCeil = true;
                }
            }
        }
        return res;
    }

    loadLevel(n) {
        this.level = n;
        this.levelData = LEVELS[(n - 1) % LEVELS.length];
        this.chain = 0;
        this.chainTimer = 0;

        const map = [];
        for (let r = 0; r < ROWS; r++) {
            map.push(new Array(COLS).fill('.'));
        }
        for (let c = 0; c < COLS; c++) {
            map[0][c] = 'X';
            map[FLOOR_ROW][c] = 'X';
        }
        for (let r = 0; r < ROWS; r++) {
            map[r][0] = 'X';
            map[r][COLS - 1] = 'X';
        }
        for (const [row, segs] of this.levelData.platforms) {
            for (const [c1, c2] of segs) {
                for (let c = c1; c <= c2; c++) {
                    map[row][c] = 'X';
                }
            }
        }
        this.map = map.map(row => row.join(''));

        this.spawnX = 2 * TILE;
        this.spawnY = FLOOR_ROW * TILE - 28;

        this.enemies = [];
        for (const [type, col, row] of this.levelData.enemies) {
            this.enemies.push(this.makeEnemy(type, col * TILE + 5, row * TILE - 26));
        }
        this.bubbles = [];
        this.trapped = [];
        this.fruits = [];
        this.fx = [];
        this.decor = [];

        this.player = {
            x: this.spawnX,
            y: this.spawnY,
            w: 24,
            h: 28,
            vx: 0,
            vy: 0,
            dir: 1,
            onGround: false,
            coyote: 0,
            jumpBuffer: 0,
            firing: 0,
            inv: 0,
            face: 1
        };

        this.time = 0;
        this.updateHUD();
    }

    makeEnemy(type, x, y) {
        const t = ENEMY_TYPES[type];
        return {
            type,
            color: t.color,
            ring: t.ring,
            x,
            y,
            w: 26,
            h: 26,
            vx: (Math.random() < 0.5 ? -1 : 1) * t.speed * this.enemySpeed(),
            vy: 0,
            onGround: false,
            face: 1,
            jumpTimer: Math.random() * 1.5,
            hopTimer: Math.random() * 0.4,
            bouncePhase: Math.random() * 10
        };
    }

    enemySpeed() {
        return Math.min(2.0, 1 + (this.level - 1) * 0.09);
    }

    start() {
        this.score = 0;
        this.lives = 3;
        this.started = true;
        this.gameOver = false;
        this.paused = false;
        this.cleared = false;
        this.loadLevel(1);

        this.startScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        this.clearScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');

        this.initAudio();
        this.cancelLoop();
        const ts = performance.now();
        this.lastTime = ts;
        this.gameLoop(ts);
    }

    nextLevel() {
        this.loadLevel(this.level + 1);
        this.cleared = false;
        this.clearScreen.classList.add('hidden');
        const ts = performance.now();
        this.lastTime = ts;
        this.gameLoop(ts);
    }

    restart() {
        this.start();
    }

    togglePause() {
        if (this.gameOver || this.cleared) return;
        this.paused = !this.paused;
        if (this.paused) {
            this.pauseScreen.classList.remove('hidden');
            this.cancelLoop();
        } else {
            this.pauseScreen.classList.add('hidden');
            const ts = performance.now();
            this.lastTime = ts;
            this.gameLoop(ts);
        }
    }

    cancelLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    gameLoop(timestamp) {
        if (this.gameOver || this.paused || this.cleared) return;

        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        dt = Math.min(dt, 0.033);
        this.time += dt;

        this.update(dt);
        this.draw();

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        this.handleInput();
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateBubbles(dt);
        this.updateTrapped(dt);
        this.updateFruits(dt);
        this.updateFx(dt);
        this.updateDecor(dt);
        this.checkHits();
        this.checkClear();
    }

    handleInput() {
        const left = this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['touchLeft'];
        const right = this.keys['ArrowRight'] || this.keys['KeyD'] || this.keys['touchRight'];
        this.keys['_left'] = !!left;
        this.keys['_right'] = !!right;
        this.keys['_jump'] = !!(this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space'] || this.keys['touchJump']);
        this.keys['_shoot'] = !!(this.keys['KeyJ'] || this.keys['KeyK'] || this.keys['KeyZ'] || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['touchShoot']);
        this.keys['_up'] = !!(this.keys['ArrowUp'] || this.keys['KeyW']);
    }

    updatePlayer(dt) {
        const p = this.player;
        const left = this.keys['_left'];
        const right = this.keys['_right'];
        const jump = this.keys['_jump'];
        const shoot = this.keys['_shoot'];
        const up = this.keys['_up'];

        if (left && !right) {
            p.vx = -PLAYER_SPEED;
            p.face = -1;
        } else if (right && !left) {
            p.vx = PLAYER_SPEED;
            p.face = 1;
        } else {
            p.vx = 0;
        }

        if (!this.oldJump && jump) {
            p.jumpBuffer = 0.15;
        } else {
            p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
        }

        if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
            p.vy = -JUMP_V;
            p.onGround = false;
            p.coyote = 0;
            p.jumpBuffer = 0;
            this.playTone(340, 0.12, 'square', 0.06);
        } else if (this.oldJump && !jump && p.vy < -100) {
            p.vy *= 0.45;
        }
        this.oldJump = jump;

        p.vy = Math.min(p.vy + (p.vy < 0 ? GRAVITY_RISE : GRAVITY) * dt, MAX_FALL);
        this.moveEntity(p, p.vx * dt, 0);
        const res = this.moveEntity(p, 0, p.vy * dt);
        if (res.hitGround) {
            p.onGround = true;
            p.coyote = 0.2;
        } else {
            p.onGround = false;
            if (p.coyote > 0) p.coyote -= dt;
        }

        p.inv = Math.max(0, p.inv - dt);
        p.firing -= dt;
        if (p.firing < 0) p.firing = 0;

        if (shoot && p.firing === 0 && this.bubbles.length < MAX_BUBBLES) {
            const bx = p.face > 0 ? p.x + p.w : p.x - 24;
            const by = p.y + (p.h - 24) / 2;
            const bubble = { x: bx, y: by, vx: 0, vy: 0, t: 0, r: 12 };
            if (up) {
                bubble.vy = -260;
            } else {
                bubble.vx = 230 * p.face;
                bubble.vy = -36;
            }
            this.bubbles.push(bubble);
            p.firing = 0.42;
            this.playTone(620, 0.1, 'square', 0.05);
        }
    }

    dirTowardPlayer(e) {
        return this.player.x + this.player.w / 2 > e.x + e.w / 2 ? 1 : -1;
    }

    updateEnemies(dt) {
        const speedMul = this.enemySpeed();
        for (const e of this.enemies) {
            const def = ENEMY_TYPES[e.type];
            let dir = e.face;
            if (e.type === 'chaser') {
                dir = this.dirTowardPlayer(e);
            }
            e.face = dir;

            if (e.type === 'hopper') {
                e.hopTimer -= dt;
                if (e.onGround && e.hopTimer <= 0) {
                    e.vy = -520;
                    e.onGround = false;
                    e.hopTimer = 0.45;
                }
                e.vx = dir * def.speed * speedMul;
            } else {
                if (e.onGround) {
                    const ahead = dir === 1 ? e.x + e.w + 1 : e.x - 1;
                    const aheadCol = Math.floor(ahead / TILE);
                    const footRow = Math.floor((e.y + e.h + 1) / TILE);
                    const midRow = Math.floor((e.y + e.h / 2) / TILE);
                    const wallAhead = this.isSolid(aheadCol, midRow);
                    const edgeAhead = !this.isSolid(aheadCol, footRow);
                    if (wallAhead || edgeAhead) {
                        e.face = -dir;
                    }
                    e.vx = e.face * def.speed * speedMul;
                    if (e.type === 'jumper') {
                        e.jumpTimer -= dt;
                        if (e.jumpTimer <= 0) {
                            e.jumpTimer = 1.2 + Math.random() * 1.2;
                            if (Math.random() < 0.7) {
                                e.vy = -430;
                                e.onGround = false;
                            }
                        }
                    }
                } else {
                    e.vx = e.face * def.speed * speedMul * 0.4;
                }
            }

            e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
            this.moveEntity(e, e.vx * dt, 0);
            const res = this.moveEntity(e, 0, e.vy * dt);
            if (res.hitGround) e.onGround = true;
            if (res.hitCeil && e.type === 'hopper') e.vy = 40;
        }
    }

    popBubble(b) {
        this.fx.push({ x: b.x + b.r, y: b.y + b.r, t: 0, tMax: 0.3, color: '#cfeeff', big: true });
        this.playTone(950, 0.12, 'triangle', 0.08);
    }

    updateBubbles(dt) {
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.t += dt;
            b.vx *= Math.exp(-2.6 * dt);
            b.vy += (-70 - b.vy) * 2.8 * dt;

            let nx = b.x + b.vx * dt;
            if (nx < -b.r * 2) nx = W;
            if (nx > W) nx = -b.r * 2;
            b.x = nx;
            b.y += b.vy * dt;

            if (this.solidBox(b.x, b.y, b.r * 2, b.r * 2)) {
                b.dead = true;
                this.popBubble(b);
            } else if (b.y < 6) {
                b.y = 6;
                b.vy = Math.max(-60, b.vy);
            }
            if (b.t > 9) {
                b.dead = true;
                this.popBubble(b);
            }

            for (const e of this.enemies) {
                if (overlapBoxes(b.x, b.y, b.r * 2, b.r * 2, e.x, e.y, e.w, e.h)) {
                    b.dead = true;
                    this.trapEnemy(e, b);
                    break;
                }
            }
            if (b.dead) this.bubbles.splice(i, 1);
        }
    }

    trapEnemy(e, b) {
        const idx = this.enemies.indexOf(e);
        if (idx >= 0) this.enemies.splice(idx, 1);
        this.trapped.push({
            type: e.type,
            color: e.color,
            x: b.x,
            y: b.y,
            r: 14,
            vx: Math.random() < 0.5 ? -36 : 36,
            phase: 0,
            life: 0,
            rising: true
        });
        this.fx.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, t: 0, tMax: 0.25, color: e.color, big: false });
        this.playTone(470, 0.12, 'triangle', 0.06);
    }

    updateTrapped(dt) {
        for (let i = this.trapped.length - 1; i >= 0; i--) {
            const t = this.trapped[i];
            t.life += dt;
            t.phase += dt;

            if (t.rising) {
                t.y -= 140 * dt;
                if (t.y <= 34) {
                    t.y = 34;
                    t.rising = false;
                }
            } else {
                t.x += t.vx * dt;
                if (t.x < 4) { t.x = 4; t.vx = Math.abs(t.vx); }
                if (t.x > W - t.r * 2 - 4) { t.x = W - t.r * 2 - 4; t.vx = -Math.abs(t.vx); }
            }

            if (t.life > 15) {
                this.trapped.splice(i, 1);
                const ty = t.y + t.r;
                this.enemies.push(this.makeEnemy(t.type, t.x, ty));
                this.playTone(200, 0.15, 'sawtooth', 0.06);
            }
        }
    }

    updateFruits(dt) {
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            f.t += dt;
            f.vy = Math.min(f.vy + GRAVITY * dt, MAX_FALL);
            const res = this.moveEntity(f, 0, f.vy * dt);
            if (res.hitGround) {
                f.vy = -f.vy * 0.5;
                if (f.bounces-- <= 0) f.dead = true;
            }
            if (f.t > 8) f.dead = true;
            if (f.dead) this.fruits.splice(i, 1);
        }
    }

    updateFx(dt) {
        for (let i = this.fx.length - 1; i >= 0; i--) {
            const f = this.fx[i];
            f.t += dt;
            if (f.t >= f.tMax) this.fx.splice(i, 1);
        }
    }

    updateDecor(dt) {
        this.decorTimer -= dt;
        if (this.decorTimer <= 0) {
            this.decorTimer = 1.4;
            this.decor.push({ x: Math.random() * W, y: H + 10, speed: 30 + Math.random() * 40, size: 3 + Math.random() * 5 });
        }
        for (let i = this.decor.length - 1; i >= 0; i--) {
            const d = this.decor[i];
            d.y -= d.speed * dt;
            d.x += Math.sin(d.y * 0.02 + d.size) * 0.3;
            if (d.y < -10) this.decor.splice(i, 1);
        }
    }

    checkHits() {
        const p = this.player;

        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            if (overlapBoxes(b.x, b.y, b.r * 2, b.r * 2, p.x, p.y, p.w, p.h)) {
                this.bubbles.splice(i, 1);
                this.popBubble(b);
                this.addScore(10);
            }
        }

        for (let i = this.trapped.length - 1; i >= 0; i--) {
            const t = this.trapped[i];
            if (overlapBoxes(t.x, t.y, t.r * 2, t.r * 2, p.x, p.y, p.w, p.h)) {
                this.trapped.splice(i, 1);
                this.fx.push({ x: t.x + t.r, y: t.y + t.r, t: 0, tMax: 0.35, color: t.color, big: true });
                this.playTone(1000, 0.16, 'triangle', 0.09);

                if (this.chainTimer > 0) {
                    this.chain++;
                } else {
                    this.chain = 1;
                }
                this.chainTimer = 2.5;
                const pts = 1000 * this.chain;
                this.addScore(pts);
                this.floatText(t.x + t.r, t.y + 4, '+' + pts);

                const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
                this.fruits.push({
                    x: t.x,
                    y: t.y,
                    w: 20,
                    h: 20,
                    vx: 0,
                    vy: -240,
                    color: fruit.color,
                    value: fruit.value,
                    name: fruit.name,
                    t: 0,
                    bounces: 2,
                    dead: false
                });
            }
        }

        if (p.inv <= 0) {
            for (const e of this.enemies) {
                if (overlapBoxes(e.x, e.y, e.w, e.h, p.x, p.y, p.w, p.h)) {
                    this.hurt();
                    break;
                }
            }
        }

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            if (overlapBoxes(f.x, f.y, f.w, f.h, p.x, p.y, p.w - 6, p.h - 6)) {
                this.fruits.splice(i, 1);
                this.addScore(f.value);
                this.fx.push({ x: f.x + f.w / 2, y: f.y + f.h / 2, t: 0, tMax: 0.3, color: f.color, big: false });
                this.floatText(f.x + f.w / 2, f.y - 6, f.name + ' ' + f.value);
                this.playTone(760, 0.1, 'triangle', 0.08);
            }
        }
    }

    hurt() {
        this.lives--;
        this.playTone(180, 0.3, 'sawtooth', 0.1);
        this.fx.push({ x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2, t: 0, tMax: 0.4, color: '#ff5555', big: true });
        this.updateHUD();

        if (this.lives <= 0) {
            this.endGame();
        } else {
            this.player.x = this.spawnX;
            this.player.y = this.spawnY;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.inv = 2;
        }
    }

    addScore(pts) {
        this.score += pts;
        if (this.score > this.high) {
            this.high = this.score;
            localStorage.setItem('bubbleBobbleHigh', this.high);
        }
        this.updateHUD();
    }

    floatText(x, y, text) {
        this.fx.push({ x, y, t: 0, tMax: 0.8, text, float: true, color: '#ffd700' });
    }

    checkClear() {
        if (this.cleared || this.gameOver) return;
        if (this.enemies.length === 0 && this.trapped.length === 0) {
            this.cleared = true;
            const bonus = 1000 * this.level;
            this.addScore(bonus);
            document.getElementById('clearLevelName').textContent = this.levelData.name;
            document.getElementById('clearBonus').textContent = '+' + bonus;
            this.clearScreen.classList.remove('hidden');
            this.cancelLoop();
        }
    }

    endGame() {
        this.gameOver = true;
        this.cancelLoop();
        document.getElementById('finalScore').textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.high;
        const hearts = [];
        for (let i = 0; i < 3; i++) hearts.push(i < this.lives ? '♥' : '♡');
        document.getElementById('lives').textContent = hearts.join(' ');
        document.getElementById('level').textContent = this.level;
        document.getElementById('enemies').textContent = this.enemies.length + this.trapped.length;
    }

    initAudio() {
        if (this.audio) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.audio = new AC();
        } catch (e) {
            this.audio = null;
        }
    }

    playTone(freq, dur, type, vol) {
        if (!this.audio) return;
        try {
            const t0 = this.audio.currentTime;
            const osc = this.audio.createOscillator();
            const gain = this.audio.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 1.4), t0 + dur);
            gain.gain.setValueAtTime(vol, t0);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
            osc.connect(gain);
            gain.connect(this.audio.destination);
            osc.start(t0);
            osc.stop(t0 + dur);
        } catch (e) {}
    }

    draw() {
        const ctx = this.ctx;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0d1b33');
        g.addColorStop(1, '#123a5c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        for (const d of this.decor) {
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#bfeaff';
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        this.drawMap(ctx);

        for (const b of this.bubbles) this.drawBubble(ctx, b, false, null);
        for (const t of this.trapped) this.drawBubble(ctx, t, true, t);
        for (const f of this.fruits) this.drawFruit(ctx, f);
        for (const e of this.enemies) this.drawEnemy(ctx, e);

        const p = this.player;
        const blink = !(p.inv > 0 && Math.floor(this.time * 12) % 2 === 0);
        if (blink) {
            this.drawPlayer(ctx, p);
        }

        for (const f of this.fx) {
            if (f.float) {
                const a = 1 - f.t / f.tMax;
                ctx.globalAlpha = a;
                ctx.fillStyle = f.color;
                ctx.font = 'bold 16px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(f.text, f.x, f.y - f.t * 40);
                ctx.globalAlpha = 1;
            } else {
                const prog = f.t / f.tMax;
                const r = prog * (f.big ? 30 : 18);
                ctx.globalAlpha = 1 - prog;
                ctx.strokeStyle = f.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
        ctx.textAlign = 'left';
    }

    drawMap(ctx) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.map[r][c] === 'X') {
                    const x = c * TILE;
                    const y = r * TILE;
                    const grad = ctx.createLinearGradient(x, y, x, y + TILE);
                    grad.addColorStop(0, '#2a4166');
                    grad.addColorStop(1, '#16294a');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = 'rgba(160,232,255,0.12)';
                    ctx.fillRect(x, y, TILE, 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.fillRect(x, y + TILE - 3, TILE, 3);
                    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
                }
            }
        }
    }

    drawBubble(ctx, b, trapped, tb) {
        const r = b.r;
        const cx = b.x + r;
        const cy = b.y + r;
        const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
        grad.addColorStop(0, 'rgba(255,255,255,0.95)');
        grad.addColorStop(0.4, 'rgba(190,235,255,0.65)');
        grad.addColorStop(1, 'rgba(120,200,255,0.28)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(220,245,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (trapped) {
            const bob = Math.sin(tb.phase * 7) * 3;
            const c = tb.color;
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(cx, cy - 2 + bob, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.arc(cx - r * 0.28, cy - 4 + bob - r * 0.2, 2, 0, Math.PI * 2);
            ctx.arc(cx + r * 0.18, cy - 4 + bob - r * 0.2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.arc(cx - r * 0.28, cy - 4 + bob - r * 0.2, 1, 0, Math.PI * 2);
            ctx.arc(cx + r * 0.18, cy - 4 + bob - r * 0.2, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawPlayer(ctx, p) {
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        ctx.fillStyle = '#3ddc84';
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1f8f55';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#b7f7d2';
        ctx.beginPath();
        ctx.arc(cx - p.face * 2, cy + 4, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - p.face * 3 - 2, cy - 3, 3, 0, Math.PI * 2);
        ctx.arc(cx - p.face * 3 + 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#17381f';
        ctx.beginPath();
        ctx.arc(cx - p.face * 3 - 1, cy - 3, 1.4, 0, Math.PI * 2);
        ctx.arc(cx - p.face * 3 + 4, cy - 3, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2fae6e';
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 4 - 2, cy - 10);
            ctx.lineTo(cx + i * 4, cy - 16);
            ctx.lineTo(cx + i * 4 + 2, cy - 10);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawEnemy(ctx, e) {
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2 + Math.sin(e.bouncePhase + this.time * 8) * 1;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = e.ring;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - e.face * 3 - 2, cy - 2, 3.4, 0, Math.PI * 2);
        ctx.arc(cx - e.face * 3 + 3, cy - 2, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(cx - e.face * 3 - 1, cy - 2, 1.6, 0, Math.PI * 2);
        ctx.arc(cx - e.face * 3 + 4, cy - 2, 1.6, 0, Math.PI * 2);
        ctx.fill();

        if (e.type === 'hopper') {
            ctx.fillStyle = '#e8f6ff';
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy - 12);
            ctx.lineTo(cx, cy - 18);
            ctx.lineTo(cx + 8, cy - 12);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawFruit(ctx, f) {
        const cx = f.x + f.w / 2;
        const cy = f.y + f.h / 2;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 9);
        ctx.lineTo(cx + 4, cy - 14);
        ctx.moveTo(cx, cy - 9);
        ctx.lineTo(cx - 3, cy - 13);
        ctx.stroke();
    }
}

function overlapBoxes(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

const game = new BubbleBobble();