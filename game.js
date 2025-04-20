// Game constants and setup
const BUBBLE_COUNT = 15;

// Initial canvas and DOM setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Set canvas dimensions
canvas.width = 400;
canvas.height = 600;

// Asset loading system
let assetsLoaded = 0;
const requiredAssets = 3;

function startGameWhenAssetsLoaded() {
    assetsLoaded++;
    if (assetsLoaded === requiredAssets) {
        init();
    }
}

// Game state variables
let shark;
let obstacles = [];
let seaweed;
let bubbles = [];
let score = 0;
let gameLoop;
let frameCount = 0;
let countdownActive = false;
let countdownValue = 3;

// Define all classes first
class Shark {
    constructor() {
        this.x = canvas.width / 3;
        this.y = canvas.height / 2;
        this.width = 120; // Increased from 90
        this.height = 60; // Increased from 45
        this.velocity = 0;
        this.gravity = 0.2125;    // Reduced by 15% from 0.25
        this.lift = -7.5;       // Increased by 25% from -6
        this.maxVelocity = 5;   // Reduced from 8
        this.smoothing = 0.9;   // Increased from 0.85

        this.sharkImage = new Image();
        this.sharkImage.onload = startGameWhenAssetsLoaded;
        this.sharkImage.src = 'shark.png';
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        const rotation = Math.atan(this.velocity / 15);
        ctx.rotate(rotation);
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
        // Apply gravity
        this.velocity += this.gravity;
        
        // Limit maximum velocity
        this.velocity = Math.max(Math.min(this.velocity, this.maxVelocity), -this.maxVelocity);
        
        // Apply smooth movement
        this.y += this.velocity * this.smoothing;

        // Boundary checks
        if (this.y > canvas.height - this.height) {
            this.y = canvas.height - this.height;
            this.velocity = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    flap() {
        // Add to current velocity instead of setting it directly
        this.velocity = Math.max(this.velocity + this.lift, -this.maxVelocity);
    }
}

class Obstacle {
    constructor() {
        this.spacing = 232.76;  // Increased by 10% from 211.6
        // Ensure the gap is always in a playable range (not too high or low)
        const minTop = 50;  // Minimum distance from top
        const maxTop = canvas.height - this.spacing - 50;  // Maximum distance from top
        this.top = Math.random() * (maxTop - minTop) + minTop;
        this.bottom = this.top + this.spacing;
        this.x = canvas.width;
        this.width = 80; // Increased from 60 to better show the coral texture
        this.speed = 1.9; // Reduced by 5% from 2
        this.passed = false;

        this.coralImage = new Image();
        this.coralImage.onload = startGameWhenAssetsLoaded;
        this.coralImage.src = 'coral-rectangle.png';
    }

    draw() {
        // Top obstacle - draw from 0 to this.top, inverted
        ctx.save();
        ctx.translate(this.x + this.width, this.top);
        ctx.scale(-1, -1);  // Flip both horizontally and vertically for top coral
        ctx.drawImage(
            this.coralImage,
            0,
            0,
            this.width,
            this.top
        );
        ctx.restore();

        // Bottom obstacle - draw from bottom to this.bottom
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

class Seaweed {
    constructor() {
        this.image = new Image();
        this.image.onload = startGameWhenAssetsLoaded;
        this.image.src = 'seaweed.png';
        this.height = 120;
        this.y = canvas.height - this.height;
        
        // Front layer parameters (much faster, brighter)
        this.frontOffset = 0;
        this.frontSpeed = 2.2; // Faster than obstacles (1.9)
        
        // Back layer parameters (slower, much larger, darker)
        this.backOffset = 0;
        this.backSpeed = 0.3;
        this.backHeight = this.height * 2.25; // Increased by 50% from 1.5
        this.backY = canvas.height - this.backHeight;
    }

    update() {
        // Update position of both layers
        this.frontOffset -= this.frontSpeed;
        this.backOffset -= this.backSpeed;

        // Reset positions when they move too far
        if (this.frontOffset <= -canvas.width) this.frontOffset = 0;
        if (this.backOffset <= -canvas.width) this.backOffset = 0;
    }

    drawBackLayer() {
        // Draw back layer first (larger, darker)
        ctx.save();
        ctx.globalAlpha = 0.6; // Darker
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
        // Draw front layer (normal size, brighter)
        ctx.save();
        ctx.globalAlpha = 0.9; // Brighter
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

class Bubble {
    constructor() {
        this.reset();
        // Start bubbles at random x positions and below the screen
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 20;
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 10;
        this.size = Math.random() * 8 + 4; // Random size between 4 and 12
        this.speed = Math.random() * 1 + 0.5; // Random speed between 0.5 and 1.5
        this.opacity = Math.random() * 0.4 + 0.1; // Random opacity between 0.1 and 0.5
    }

    update() {
        this.y -= this.speed;
        
        // Reset bubble when it goes off screen
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

// Create initial objects to start loading assets
shark = new Shark();
seaweed = new Seaweed();
// Just load the coral image once without adding to obstacles array
const tempObstacle = new Obstacle();
tempObstacle.coralImage.onload = startGameWhenAssetsLoaded;
bubbles = Array(BUBBLE_COUNT).fill(null).map(() => new Bubble());

// Rest of the game functions
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
    
    function countdown() {
        // Clear canvas and draw background elements
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw bubbles
        bubbles.forEach(bubble => {
            bubble.update();
            bubble.draw();
        });
        
        // Draw back seaweed layer
        seaweed.drawBackLayer();
        
        // Draw initial shark position
        shark.draw();
        
        // Draw front seaweed layer
        seaweed.drawFrontLayer();
        
        // Draw countdown
        drawCountdown();
        
        if (countdownValue > 0) {
            countdownValue--;
            setTimeout(countdown, 1000);
        } else if (countdownValue === 0) {
            setTimeout(() => {
                countdownActive = false;
                update();
            }, 1000);
        }
    }
    
    countdown();
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

function checkCollision(shark, obstacle) {
    // Define collision boundaries with some padding for smoother gameplay
    const sharkLeft = shark.x + 10;
    const sharkRight = shark.x + shark.width - 10;
    const sharkTop = shark.y + 5;
    const sharkBottom = shark.y + shark.height - 5;

    // Check if shark is within obstacle's x-range
    if (sharkRight > obstacle.x && sharkLeft < obstacle.x + obstacle.width) {
        // Check if shark hits top or bottom obstacle
        if (sharkTop < obstacle.top || sharkBottom > obstacle.bottom) {
            return true;
        }
    }
    return false;
}

function gameOver() {
    cancelAnimationFrame(gameLoop);
    finalScoreElement.textContent = score;
    gameOverElement.classList.remove('hidden');
}

function update() {
    frameCount++;
    
    // Check if we should add a new obstacle
    const minObstacleSpacing = 231; // Increased by 5% from 220
    const shouldAddObstacle = frameCount % 100 === 0 && 
        (obstacles.length === 0 || 
         obstacles[obstacles.length - 1].x <= canvas.width - minObstacleSpacing);

    if (shouldAddObstacle) {
        obstacles.push(new Obstacle());
    }

    // Update game objects
    shark.update();
    seaweed.update();  // Make sure seaweed movement is updated
    
    // Update obstacles
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
        }

        if (obstacles[i].offscreen()) {
            obstacles.splice(i, 1);
        }
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bubbles (background)
    bubbles.forEach(bubble => {
        bubble.update();
        bubble.draw();
    });

    // Draw back seaweed layer
    seaweed.drawBackLayer();

    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());

    // Draw shark
    shark.draw();

    // Draw front seaweed layer last (in front of everything)
    seaweed.drawFrontLayer();

    gameLoop = requestAnimationFrame(update);
}

// Event listeners
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