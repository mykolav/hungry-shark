// -----------------------------
// Constants and Configuration
// -----------------------------
const BUBBLE_COUNT = 15;
const FIREWORK_COLORS = ['#ff0', '#f0f', '#0ff', '#0f0', '#f00', '#00f'];
const CELEBRATION_DURATION = 10000; // 10 seconds in milliseconds
const MAX_TEXT_WIDTH = 350; // Maximum width for celebration text

const CELEBRATION_PHRASES = [
    "Woohoo! You're crushing it!",
    "Look at you go! Sweet moves!",
    "That's what I'm talking about!",
    "You're on fire! 🔥",
    "Now we're talking!",
    "Unstoppable! Keep it up!",
    "You're nailing it!",
    "That's the way to do it!",
    "Now that's what I call skills!",
    "You're making it look easy!"
];

// Canvas and DOM setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Set canvas dimensions
canvas.width = 400;
canvas.height = 600;

// -----------------------------
// Game State Variables
// -----------------------------
let assetsLoaded = 0;
const requiredAssets = 3;
let shark;
let obstacles = [];
let seaweed;
let bubbles = [];
let score = 0;
let gameLoop;
let frameCount = 0;
let countdownActive = false;
let countdownValue = 3;
let celebrating = false;
let celebrationStart = 0;
let fireworks = [];
let celebratingSharks = [];
let celebrationPhrase = '';

// -----------------------------
// Helper Functions
// -----------------------------
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    return lines.map((line, i) => {
        ctx.fillText(line.trim(), x, y + (i * lineHeight));
    }).length * lineHeight;
}

function getRandomCelebrationPhrase() {
    const index = Math.floor(Math.random() * CELEBRATION_PHRASES.length);
    return CELEBRATION_PHRASES[index];
}

function startGameWhenAssetsLoaded() {
    assetsLoaded++;
    if (assetsLoaded === requiredAssets) {
        init();
    }
}

// -----------------------------
// Game Classes
// -----------------------------
class Bubble {
    constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 20;
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 10;
        this.size = Math.random() * 8 + 4;
        this.speed = Math.random() * 1 + 0.5;
        this.opacity = Math.random() * 0.4 + 0.1;
    }

    update() {
        this.y -= this.speed;

        if (this.y < -this.size) {
            this.reset();
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
        ctx.restore();
    }
}

class Firework {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.targetY = Math.random() * (canvas.height * 0.6);
        this.speed = 4 + Math.random() * 2;
        this.particles = [];
        this.exploded = false;
        this.color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    }

    update() {
        if (!this.exploded) {
            this.y -= this.speed;
            if (this.y <= this.targetY) {
                this.explode();
            }
        } else {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.life -= 0.01;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
            if (this.particles.length === 0) {
                this.reset();
            }
        }
    }

    explode() {
        this.exploded = true;
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 / 50) * i;
            const speed = 1 + Math.random() * 1;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1
            });
        }
    }

    draw() {
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        if (!this.exploded) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            for (const p of this.particles) {
                ctx.globalAlpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
}

class Seaweed {
    constructor() {
        this.image = new Image();
        this.image.onload = startGameWhenAssetsLoaded;
        this.image.src = 'seaweed.png';
        this.height = 120;
        this.y = canvas.height - this.height;

        this.frontOffset = 0;
        this.frontSpeed = 2.2;

        this.backOffset = 0;
        this.backSpeed = 0.3;
        this.backHeight = this.height * 2.25;
        this.backY = canvas.height - this.backHeight;
    }

    update() {
        this.frontOffset -= this.frontSpeed;
        this.backOffset -= this.backSpeed;

        if (this.frontOffset <= -canvas.width) this.frontOffset = 0;
        if (this.backOffset <= -canvas.width) this.backOffset = 0;
    }

    drawBackLayer() {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.drawImage(
            this.image,
            this.backOffset,
            this.backY,
            canvas.width,
            this.backHeight
        );
        ctx.drawImage(
            this.image,
            this.backOffset + canvas.width,
            this.backY,
            canvas.width,
            this.backHeight
        );
        ctx.restore();
    }

    drawFrontLayer() {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(
            this.image,
            this.frontOffset,
            this.y,
            canvas.width,
            this.height
        );
        ctx.drawImage(
            this.image,
            this.frontOffset + canvas.width,
            this.y,
            canvas.width,
            this.height
        );
        ctx.restore();
    }
}

class Obstacle {
    constructor() {
        this.spacing = 232.76;
        const minTop = 50;
        const maxTop = canvas.height - this.spacing - 50;
        this.top = Math.random() * (maxTop - minTop) + minTop;
        this.bottom = this.top + this.spacing;
        this.x = canvas.width;
        this.width = 80;
        this.speed = 1.9;
        this.passed = false;

        this.coralImage = new Image();
        this.coralImage.onload = startGameWhenAssetsLoaded;
        this.coralImage.src = 'coral-rectangle.png';
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width, this.top);
        ctx.scale(-1, -1);
        ctx.drawImage(
            this.coralImage,
            0,
            0,
            this.width,
            this.top
        );
        ctx.restore();

        ctx.drawImage(
            this.coralImage,
            this.x,
            this.bottom,
            this.width,
            canvas.height - this.bottom
        );
    }

    update() {
        this.x -= this.speed;
    }

    offscreen() {
        return this.x < -this.width;
    }
}

class Shark {
    constructor(isLeader = true) {
        this.x = canvas.width / 3;
        this.y = canvas.height / 2;
        this.width = 120;
        this.height = 60;
        this.velocity = 0;
        this.gravity = 0.2125;
        this.lift = -7.5;
        this.maxVelocity = 5;
        this.smoothing = 0.9;

        this.sharkImage = new Image();
        this.sharkImage.onload = startGameWhenAssetsLoaded;
        this.sharkImage.src = 'shark.png';

        this.dancingOffset = 0;
        this.dancingSpeed = 0.02;
        this.isLeader = isLeader;
        this.baseOffset = 0;
        this.dancingPhase = 0;
        this.dancingRadius = isLeader ? 80 : 100;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (celebrating) {
            const angle = this.isLeader ? 
                Math.atan2(Math.sin(this.dancingOffset * 2) * 40, Math.cos(this.dancingOffset) * this.dancingRadius) :
                Math.atan2(Math.sin(this.dancingOffset) * this.dancingRadius, Math.cos(this.dancingOffset) * this.dancingRadius);
            ctx.rotate(angle + Math.PI / 2);
        } else {
            const rotation = Math.atan(this.velocity / 15);
            ctx.rotate(rotation);
        }
        const aspectRatio = this.sharkImage.width / this.sharkImage.height;
        const drawWidth = this.height * aspectRatio;
        ctx.drawImage(
            this.sharkImage,
            -drawWidth / 2,
            -this.height / 2,
            drawWidth,
            this.height
        );
        ctx.restore();
    }

    update() {
        if (celebrating) {
            const centerX = canvas.width / 2 - this.width / 2;
            if (this.isLeader) {
                this.x = centerX + Math.cos(this.dancingOffset) * this.dancingRadius;
                this.y = canvas.height / 2 + Math.sin(this.dancingOffset * 2) * 40;
                this.dancingOffset += this.dancingSpeed;
            } else {
                const angle = this.baseOffset + this.dancingOffset;
                this.x = centerX + Math.cos(angle) * this.dancingRadius;
                this.y = canvas.height / 2 + Math.sin(angle) * this.dancingRadius;
                this.dancingOffset += this.dancingSpeed;
            }
        } else {
            this.velocity += this.gravity;
            this.velocity = Math.max(Math.min(this.velocity, this.maxVelocity), -this.maxVelocity);
            this.y += this.velocity * this.smoothing;

            if (this.y > canvas.height - this.height) {
                this.y = canvas.height - this.height;
                this.velocity = 0;
            }
            if (this.y < 0) {
                this.y = 0;
                this.velocity = 0;
            }
        }
    }

    flap() {
        this.velocity = Math.max(this.velocity + this.lift, -this.maxVelocity);
    }
}

// -----------------------------
// Game Logic Functions
// -----------------------------
function checkCollision(shark, obstacle) {
    const aspectRatio = shark.sharkImage.width / shark.sharkImage.height;
    const sharkDrawWidth = shark.height * aspectRatio;

    const sharkLeft = shark.x + (shark.width - sharkDrawWidth) / 2 + 10;
    const sharkRight = shark.x + (shark.width + sharkDrawWidth) / 2 - 10;
    const sharkTop = shark.y + 5;
    const sharkBottom = shark.y + shark.height - 5;

    if (sharkRight > obstacle.x + 5 && sharkLeft < obstacle.x + obstacle.width - 5) {
        if (sharkTop < obstacle.top || sharkBottom > obstacle.bottom) {
            return true;
        }
    }
    return false;
}

function init() {
    shark = new Shark();
    obstacles = [];
    seaweed = new Seaweed();
    bubbles = Array(BUBBLE_COUNT).fill(null).map(() => new Bubble());
    score = 0;
    frameCount = 0;
    scoreElement.textContent = 'Score: 0';
    gameOverElement.classList.add('hidden');
    startCountdown();
}

function gameOver() {
    cancelAnimationFrame(gameLoop);
    finalScoreElement.textContent = score;
    gameOverElement.classList.remove('hidden');
}

function drawCountdown() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = countdownValue === 0 ? 'GO!' : countdownValue.toString();
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

function startCountdown() {
    countdownActive = true;
    countdownValue = 3;
    shark.velocity = -2;

    function countdown() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        shark.update();

        bubbles.forEach(bubble => {
            bubble.update();
            bubble.draw();
        });

        seaweed.drawBackLayer();
        obstacles.forEach(obstacle => obstacle.draw());
        shark.draw();
        seaweed.drawFrontLayer();
        drawCountdown();

        if (countdownValue > 0) {
            countdownValue--;
            setTimeout(countdown, 1000);
        } else if (countdownValue === 0) {
            setTimeout(() => {
                countdownActive = false;
                gameLoop = requestAnimationFrame(update);
            }, 1000);
        }
    }

    countdown();
}

function startCelebration() {
    celebrating = true;
    celebrationStart = Date.now();
    fireworks = Array(5).fill(null).map(() => new Firework());
    celebrationPhrase = getRandomCelebrationPhrase();

    const currentState = {
        score,
        obstacles: [...obstacles],
        sharkPos: { 
            x: shark.x, 
            y: shark.y, 
            velocity: 0
        }
    };

    celebratingSharks = [];
    celebratingSharks.push(shark);

    for (let i = 0; i < 4; i++) {
        const followerShark = new Shark(false);
        followerShark.baseOffset = (Math.PI * 2 / 4) * i;
        followerShark.dancingOffset = shark.dancingOffset;
        celebratingSharks.push(followerShark);
    }

    function celebrationLoop() {
        if (!celebrating) return;

        celebratingSharks.forEach(s => s.update());
        seaweed.update();
        fireworks.forEach(f => f.update());

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        bubbles.forEach(bubble => {
            bubble.update();
            bubble.draw();
        });

        seaweed.drawBackLayer();

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textHeight = wrapText(ctx, celebrationPhrase, canvas.width / 2, canvas.height / 3, MAX_TEXT_WIDTH, 40);
        ctx.restore();

        fireworks.forEach(f => f.draw());
        celebratingSharks.forEach(s => s.draw());
        seaweed.drawFrontLayer();

        gameLoop = requestAnimationFrame(celebrationLoop);
    }

    celebrationLoop();

    setTimeout(() => {
        celebrating = false;
        fireworks = [];
        celebratingSharks = [];

        score = currentState.score;
        obstacles = currentState.obstacles;
        shark.x = currentState.sharkPos.x;
        shark.y = currentState.sharkPos.y;
        shark.velocity = currentState.sharkPos.velocity;
        scoreElement.textContent = `Score: ${score}`;

        cancelAnimationFrame(gameLoop);
        startCountdown();
    }, CELEBRATION_DURATION);
}

function update() {
    if (countdownActive || celebrating) return;

    frameCount++;
    shark.update();
    seaweed.update();

    const minObstacleSpacing = 231;
    const shouldAddObstacle = frameCount % 100 === 0 && 
        (obstacles.length === 0 || 
         obstacles[obstacles.length - 1].x <= canvas.width - minObstacleSpacing);

    if (shouldAddObstacle) {
        obstacles.push(new Obstacle());
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();

        if (checkCollision(shark, obstacles[i])) {
            gameOver();
            return;
        }

        if (!obstacles[i].passed && obstacles[i].x + obstacles[i].width < shark.x) {
            score++;
            scoreElement.textContent = `Score: ${score}`;
            obstacles[i].passed = true;

            if (score > 0 && score % 25 === 0) {
                startCelebration();
                return;
            }
        }

        if (obstacles[i].offscreen()) {
            obstacles.splice(i, 1);
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    bubbles.forEach(bubble => {
        bubble.update();
        bubble.draw();
    });

    seaweed.drawBackLayer();
    obstacles.forEach(obstacle => obstacle.draw());
    shark.draw();
    seaweed.drawFrontLayer();

    gameLoop = requestAnimationFrame(update);
}

// -----------------------------
// Event Handlers and Game Initialization
// -----------------------------
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (countdownActive) {
            return;
        }
        if (gameOverElement.classList.contains('hidden')) {
            shark.flap();
        }
    } else if (e.code === 'Enter' && !gameOverElement.classList.contains('hidden')) {
        init();
    }
});

canvas.addEventListener('click', () => {
    if (!countdownActive) {
        shark.flap();
    }
});

restartButton.addEventListener('click', () => {
    init();
});

// Initial game setup
shark = new Shark();
seaweed = new Seaweed();
const tempObstacle = new Obstacle();
tempObstacle.coralImage.onload = startGameWhenAssetsLoaded;
bubbles = Array(BUBBLE_COUNT).fill(null).map(() => new Bubble());