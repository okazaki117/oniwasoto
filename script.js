/**
 * 鬼は外 (Oni wa Soto) - Main Game Script
 */

class InputHandler {
    constructor(game) {
        this.game = game;
        this.mouseX = 0;
        this.mouseY = 0;

        window.addEventListener('mousemove', (e) => {
            const rect = this.game.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        window.addEventListener('mousedown', (e) => {
            if (this.game.gameState === 'PLAYING') {
                const rect = this.game.canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                this.game.throwBean(clickX, clickY);
            }
        });

        // Touch Events
        this.game.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.game.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        }, { passive: false });

        this.game.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.gameState === 'PLAYING') {
                const rect = this.game.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const clickX = touch.clientX - rect.left;
                const clickY = touch.clientY - rect.top;

                // Update aim position
                this.mouseX = clickX;
                this.mouseY = clickY;

                this.game.throwBean(clickX, clickY);
            }
        }, { passive: false });
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.input = new InputHandler(this);

        // Game State
        this.gameState = 'START'; // START, PLAYING, PAUSED, END
        this.score = 0;
        this.timeLeft = 30;
        this.gameTime = 0;
        this.currentSkin = 'default'; // 'default' or 'cute'

        // Entities
        this.beans = [];
        this.oniList = [];
        this.particles = [];
        this.popups = [];
        this.spawnTimer = 0;

        // UI Elements
        this.ui = {
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            hud: document.getElementById('hud'),
            score: document.getElementById('score'),
            timer: document.getElementById('timer'),
            finalScore: document.getElementById('final-score'),
            skinBtn: document.getElementById('skin-btn'),
            container: document.getElementById('game-container'),
            pauseBtn: document.getElementById('pause-btn'),
            pauseScreen: document.getElementById('pause-screen'),
            resumeBtn: document.getElementById('resume-btn'),
            pauseRestartBtn: document.getElementById('pause-restart-btn'),
            pauseTopBtn: document.getElementById('pause-top-btn'),
            gameoverTopBtn: document.getElementById('gameover-top-btn')
        };

        // Bind methods
        this.resize = this.resize.bind(this);
        this.loop = this.loop.bind(this);
        this.start = this.start.bind(this);
        this.restart = this.restart.bind(this);
        this.toggleSkin = this.toggleSkin.bind(this);
        this.togglePause = this.togglePause.bind(this);
        this.returnToTop = this.returnToTop.bind(this);

        // Event Listeners for UI
        document.getElementById('start-btn').addEventListener('click', this.start);
        document.getElementById('restart-btn').addEventListener('click', this.start);
        this.ui.skinBtn.addEventListener('click', this.toggleSkin);

        this.ui.pauseBtn.addEventListener('click', this.togglePause);
        this.ui.resumeBtn.addEventListener('click', this.togglePause);
        this.ui.pauseRestartBtn.addEventListener('click', this.restart);
        this.ui.pauseTopBtn.addEventListener('click', this.returnToTop);
        this.ui.gameoverTopBtn.addEventListener('click', this.returnToTop);

        window.addEventListener('resize', this.resize);

        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    toggleSkin() {
        if (this.currentSkin === 'default') {
            this.currentSkin = 'cute';
            this.ui.skinBtn.innerText = 'スキン: かわいい';
        } else {
            this.currentSkin = 'default';
            this.ui.skinBtn.innerText = 'スキン: 通常';
        }
    }

    togglePause() {
        if (this.gameState === 'PLAYING') {
            this.gameState = 'PAUSED';
            this.ui.pauseScreen.classList.remove('hidden');
            this.ui.pauseBtn.classList.add('hidden'); // Hide pause button while paused
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'PLAYING';
            this.ui.pauseScreen.classList.add('hidden');
            this.ui.pauseBtn.classList.remove('hidden');
            this.lastTime = performance.now(); // Reset delta time
        }
    }

    returnToTop() {
        this.gameState = 'START';
        this.ui.pauseScreen.classList.add('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.ui.hud.classList.add('hidden');
        this.ui.pauseBtn.classList.add('hidden');
        this.ui.startScreen.classList.remove('hidden');

        // Reset scene
        this.beans = [];
        this.oniList = [];
        this.particles = [];
        this.popups = [];
    }

    start() {
        this.gameState = 'PLAYING';
        this.score = 0;
        this.timeLeft = 30;
        this.gameTime = 0;
        this.beans = [];
        this.oniList = [];
        this.particles = [];
        this.popups = [];
        this.spawnTimer = 0;

        this.ui.score.innerText = this.score;
        this.ui.timer.innerText = this.timeLeft;
        this.ui.timer.style.color = '';
        this.ui.timer.style.transform = '';

        this.ui.startScreen.classList.add('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.ui.pauseScreen.classList.add('hidden'); // Ensure pause screen is hidden
        this.ui.hud.classList.remove('hidden');
        this.ui.pauseBtn.classList.remove('hidden');

        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    end() {
        this.gameState = 'END';
        this.ui.finalScore.innerText = this.score;
        this.ui.hud.classList.add('hidden');
        this.ui.pauseBtn.classList.add('hidden');
        this.ui.gameOverScreen.classList.remove('hidden');
    }

    restart() {
        this.togglePause(); // If restarting from pause, toggle logic handles UI hiding
        if (this.gameState === 'PAUSED') {
            // Logic handled by start() called immediately after, but we need to reset UI state if coming from pause
            this.ui.pauseScreen.classList.add('hidden');
        }
        this.start();
    }

    throwBean(x, y) {
        const startX = this.width / 2;
        const startY = this.height;
        const angle = Math.atan2(y - startY, x - startX);
        const speed = 12;

        this.beans.push(new Bean(startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed));
    }

    spawnEntity() {
        const edge = Math.floor(Math.random() * 3);
        let x, y;
        const margin = 50;

        if (edge === 0) { // Top
            x = Math.random() * this.width;
            y = -margin;
        } else if (edge === 1) { // Right
            x = this.width + margin;
            y = Math.random() * (this.height / 2);
        } else { // Left
            x = -margin;
            y = Math.random() * (this.height / 2);
        }

        const typeRoll = Math.random();
        const isFever = this.timeLeft <= 7;

        if (isFever) {
            if (typeRoll < 0.6) {
                this.oniList.push(new Oni(x, y, 'gold'));
            } else {
                this.oniList.push(new Oni(x, y, 'red'));
            }
        } else {
            if (typeRoll < 0.15) {
                this.oniList.push(new Fuku(x, y));
            } else if (typeRoll < 0.35) {
                this.oniList.push(new Oni(x, y, 'blue'));
            } else {
                this.oniList.push(new Oni(x, y, 'red'));
            }
        }
    }

    update(deltaTime) {
        if (this.gameState !== 'PLAYING') return;

        // Timer Logic
        this.gameTime += deltaTime;
        if (this.gameTime >= 1000) {
            this.timeLeft--;
            this.gameTime -= 1000;
            this.ui.timer.innerText = this.timeLeft;

            // Fever Warning
            if (this.timeLeft <= 7) {
                this.ui.timer.style.color = '#FFD700';
                this.ui.timer.style.transform = `scale(${1 + Math.random() * 0.2})`;
            }

            if (this.timeLeft <= 0) {
                this.end();
            }
        }

        // Spawn Logic
        this.spawnTimer += deltaTime;
        let spawnCheck = 0;

        if (this.timeLeft <= 7) {
            spawnCheck = 300;
        } else {
            spawnCheck = 1000 - (30 - this.timeLeft) * 20;
            spawnCheck = Math.max(400, spawnCheck);
        }

        if (this.spawnTimer > spawnCheck) {
            this.spawnEntity();
            this.spawnTimer = 0;
        }

        // Update Entities
        this.beans.forEach((bean, index) => {
            bean.update();
            if (bean.isOffScreen(this.width, this.height)) {
                this.beans.splice(index, 1);
            }
        });

        this.oniList.forEach((oni, index) => {
            oni.update(this.width, this.height);
            if (oni.y > this.height + 50 || oni.markedForDeletion) {
                this.oniList.splice(index, 1);
            }
        });

        this.particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) this.particles.splice(index, 1);
        });

        this.popups.forEach((p, index) => {
            p.update();
            if (p.life <= 0) this.popups.splice(index, 1);
        });

        this.checkCollisions();
    }

    checkCollisions() {
        for (let bIndex = this.beans.length - 1; bIndex >= 0; bIndex--) {
            const bean = this.beans[bIndex];
            let hit = false;

            for (let oIndex = this.oniList.length - 1; oIndex >= 0; oIndex--) {
                const oni = this.oniList[oIndex];
                const dx = bean.x - oni.x;
                const dy = bean.y - oni.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < bean.radius + oni.radius + 10) {
                    hit = true;
                    this.handleHit(oni);
                    this.oniList.splice(oIndex, 1);
                    break;
                }
            }

            if (hit) {
                this.beans.splice(bIndex, 1);
            }
        }
    }

    handleHit(entity) {
        let pts = 0;
        let color = '#fff';

        if (entity.type === 'fuku') {
            pts = -500;
            color = '#8B0000';
            this.createExplosion(entity.x, entity.y, '#FFD700');
        } else if (entity.type === 'gold') {
            pts = 500;
            color = '#FFD700';
            this.createExplosion(entity.x, entity.y, '#FFA500');
        } else if (entity.type === 'blue') {
            pts = 200;
            color = '#1D3557';
            this.createExplosion(entity.x, entity.y, '#1D3557');
        } else {
            pts = 100;
            color = '#E63946';
            this.createExplosion(entity.x, entity.y, '#E63946');
        }

        this.score += pts;
        this.ui.score.innerText = this.score;
        this.popups.push(new ScorePopup(entity.x, entity.y, pts, color));
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach(p => p.draw(this.ctx));
        this.oniList.forEach(oni => oni.draw(this.ctx, this.currentSkin));
        this.beans.forEach(bean => bean.draw(this.ctx));
        this.popups.forEach(p => p.draw(this.ctx));

        // Draw Fever Overlay
        if (this.timeLeft <= 7 && this.gameState === 'PLAYING') {
            this.ctx.save();
            this.ctx.globalAlpha = 0.1 + Math.sin(Date.now() / 100) * 0.05;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();

            this.ctx.save();
            this.ctx.font = 'bold 40px "Mochiy Pop One", sans-serif';
            this.ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('FEVER!!', this.width / 2, 100);
            this.ctx.restore();
        }
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.gameState === 'PLAYING') {
            this.update(deltaTime);
            this.draw();
            requestAnimationFrame(this.loop);
        }
    }
}

// --- Entities ---

class Bean {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 12;
        this.color = '#F4A261';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.8, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#D68C45';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    isOffScreen(w, h) {
        return this.x < 0 || this.x > w || this.y < 0 || this.y > h;
    }
}

class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 35;
        this.markedForDeletion = false;
    }

    update() { }
    draw(ctx, skin) { }
}

class Oni extends Entity {
    constructor(x, y, type) {
        super(x, y, type);
        this.speed = type === 'gold' ? 3.0 : (type === 'blue' ? 2.5 : 1.2);
        this.wobbleOffset = Math.random() * Math.PI * 2;
    }

    update(w, h) {
        const targetX = w / 2;
        const targetY = h + 200;
        const angle = Math.atan2(targetY - this.y, targetX - this.x);

        this.x += Math.cos(angle) * this.speed + Math.sin(Date.now() / 200 + this.wobbleOffset) * 2;
        this.y += Math.sin(angle) * this.speed;
    }

    draw(ctx, skin) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (skin === 'cute') {
            this.drawCute(ctx);
        } else {
            this.drawDefault(ctx);
        }

        ctx.restore();
    }

    drawCute(ctx) {
        // Tonkatsu Style: Rough breadcrumb texture (simulated with circles), brown
        let mainColor = '#D2B48C'; // Tan
        if (this.type === 'blue') mainColor = '#A9C1D9'; // Blue-ish breadcrumb? Or just blue tonkatsu
        if (this.type === 'gold') mainColor = '#DAA520';

        // Bumpy Outline (Breadcrumbs)
        ctx.fillStyle = mainColor;
        const bumps = 12;
        for (let i = 0; i < bumps; i++) {
            const angle = (i / bumps) * Math.PI * 2;
            const bx = Math.cos(angle) * this.radius;
            const by = Math.sin(angle) * this.radius;
            ctx.beginPath();
            ctx.arc(bx, by, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // Main Body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Face (Simple, tiny dots)
        // Eyes
        ctx.fillStyle = '#5C4033'; // Dark Brown
        ctx.beginPath();
        ctx.arc(-10, 0, 3, 0, Math.PI * 2);
        ctx.arc(10, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Snout / Nose (pink scrap)
        if (this.type !== 'blue' && this.type !== 'gold') {
            ctx.fillStyle = '#FFB7B2';
            ctx.beginPath();
            ctx.arc(-18, -15, 6, 0, Math.PI * 2); // Little scrap piece? No, let's keep it simple face
            ctx.fill();
        }
    }

    drawDefault(ctx) {
        let mainColor = '#E63946';
        if (this.type === 'blue') mainColor = '#1D3557';
        if (this.type === 'gold') mainColor = '#DAA520';

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();

        ctx.fillStyle = '#F4A261';
        if (this.type === 'blue') {
            ctx.beginPath();
            ctx.moveTo(0, -this.radius + 5);
            ctx.lineTo(-6, -this.radius - 12);
            ctx.lineTo(6, -this.radius - 12);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(-15, -this.radius + 8);
            ctx.lineTo(-20, -this.radius - 12);
            ctx.lineTo(-10, -this.radius - 12);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(15, -this.radius + 8);
            ctx.lineTo(10, -this.radius - 12);
            ctx.lineTo(20, -this.radius - 12);
            ctx.fill();
        }

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-12, -5, 6, 0, Math.PI * 2);
        ctx.arc(12, -5, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-12, -5, 2, 0, Math.PI * 2);
        ctx.arc(12, -5, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-20, -15);
        ctx.lineTo(-5, -10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(20, -15);
        ctx.lineTo(5, -10);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.arc(0, 10, 10, 0, Math.PI);
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(-8, 10);
        ctx.lineTo(-5, 18);
        ctx.lineTo(-2, 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, 10);
        ctx.lineTo(5, 18);
        ctx.lineTo(2, 10);
        ctx.fill();
    }
}

class Fuku extends Entity {
    constructor(x, y) {
        super(x, y, 'fuku');
        this.speed = 1.0;
        this.phase = Math.random() * Math.PI * 2;
    }

    update(w, h) {
        this.y += 1.0;
        this.x += Math.sin(this.y / 60 + this.phase) * 1.5;
    }

    draw(ctx, skin) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (skin === 'cute') {
            this.drawCute(ctx);
        } else {
            this.drawDefault(ctx);
        }
        ctx.restore();
    }

    drawCute(ctx) {
        // Neko Style: Cream body, fat, ears

        // Start Body
        ctx.fillStyle = '#FFFDD0'; // Cream

        // Ears
        ctx.beginPath();
        ctx.moveTo(-20, -10);
        ctx.lineTo(-30, -35);
        ctx.lineTo(-5, -25);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(20, -10);
        ctx.lineTo(30, -35);
        ctx.lineTo(5, -25);
        ctx.fill();

        // Body (Circle)
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Calico Spot (optional, maybe simple spots)
        ctx.fillStyle = '#CD853F'; // Light Brown
        ctx.beginPath();
        ctx.arc(-15, -15, 8, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = '#5C4033';
        ctx.beginPath();
        ctx.arc(-12, 0, 3, 0, Math.PI * 2);
        ctx.arc(12, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Whiskers
        ctx.strokeStyle = '#5C4033';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(35, -2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20, 5); ctx.lineTo(35, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-35, -2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-20, 5); ctx.lineTo(-35, 7); ctx.stroke();

        // Mouth
        ctx.beginPath();
        ctx.arc(0, 5, 5, 0, Math.PI); // Simple smile
        ctx.stroke();
    }

    drawDefault(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF5E1';
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(-18, -25);
        ctx.quadraticCurveTo(0, -50, 18, -25);
        ctx.quadraticCurveTo(0, -35, -18, -25);
        ctx.fill();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-12, 0, 8, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(12, 0, 8, Math.PI, 0);
        ctx.stroke();

        ctx.fillStyle = '#FFB7B2';
        ctx.beginPath();
        ctx.arc(-20, 15, 6, 0, Math.PI * 2);
        ctx.arc(20, 15, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 15, 6, 0, Math.PI);
        ctx.stroke();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
        this.size = Math.random() * 5 + 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;

        ctx.translate(this.x, this.y);
        ctx.rotate(this.life * 10);
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, this.size);
        ctx.lineTo(-this.size, this.size);
        ctx.fill();

        ctx.restore();
    }
}

class ScorePopup {
    constructor(x, y, score, color) {
        this.x = x;
        this.y = y;
        this.score = score > 0 ? `+${score}` : `${score}`;
        this.color = color;
        this.life = 1.0;
        this.vy = -1;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 24px "Mochiy Pop One", sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'white';

        ctx.strokeText(this.score, this.x, this.y);
        ctx.fillText(this.score, this.x, this.y);

        ctx.restore();
    }
}

window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
};
