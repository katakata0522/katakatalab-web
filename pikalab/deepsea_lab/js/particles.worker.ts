interface Particle {
    x: number;
    y: number;
    size: number;
    baseSpeed: number;
    drift: number;
    opacity: number;
    fillStyle: string;
    angle: number;
    angleSpeed: number;
}

const TWO_PI = Math.PI * 2;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let numParticles = 0;
let width = 0;
let height = 0;

let scrollVelocity = 0;
let targetScrollVelocity = 0;

let currentDepth = 0;
let globalWind = 0;
let targetGlobalWind = 0;
let globalSpeedMult = 1;
let targetSpeedMult = 1;

function resetParticle(p: Particle, yPos: number | null = null): Particle {
    const opacity = Math.random() * 0.6 + 0.1;
    p.x = Math.random() * width;
    p.y = yPos !== null ? yPos : Math.random() * height;
    p.size = Math.random() * 2 + 0.5;
    p.baseSpeed = Math.random() * 0.5 + 0.1;
    p.drift = Math.random() * 0.4 - 0.2;
    p.opacity = opacity;
    p.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    p.angle = Math.random() * TWO_PI;
    p.angleSpeed = Math.random() * 0.02 - 0.01;
    return p;
}

function createParticle(yPos: number | null = null): Particle {
    return resetParticle({
        x: 0,
        y: 0,
        size: 0,
        baseSpeed: 0,
        drift: 0,
        opacity: 0,
        fillStyle: '',
        angle: 0,
        angleSpeed: 0
    }, yPos);
}

function initParticles(): void {
    particles = [];
    for (let i = 0; i < numParticles; i++) {
        particles.push(createParticle());
    }
}

function resize(w: number, h: number): void {
    width = w;
    height = h;
    if (canvas) {
        canvas.width = width;
        canvas.height = height;
    }
    
    const area = width * height;
    const targetParticles = Math.max(20, Math.min(200, Math.floor(area / 15000)));
    numParticles = targetParticles;
    
    if (particles.length < numParticles) {
        const toAdd = numParticles - particles.length;
        for (let i = 0; i < toAdd; i++) {
            particles.push(createParticle());
        }
    } else if (particles.length > numParticles) {
        particles.splice(numParticles);
    }
}

let isPaused = false;
let animationFrame: number | null = null;

function animate(): void {
    animationFrame = null;
    if (isPaused) return;
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, width, height);
    
    scrollVelocity += (targetScrollVelocity - scrollVelocity) * 0.1;
    targetScrollVelocity *= 0.8; 
    
    globalWind += (targetGlobalWind - globalWind) * 0.05;
    globalSpeedMult += (targetSpeedMult - globalSpeedMult) * 0.05;
    
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        p.angle += p.angleSpeed;
        p.x += Math.sin(p.angle) * 0.5 + p.drift + globalWind;
        p.y += (p.baseSpeed * globalSpeedMult) + scrollVelocity;
        
        if (p.y > height + 10) {
            resetParticle(p, -10);
        } else if (p.y < -10) {
            resetParticle(p, height + 10);
        }
        
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
        ctx.fillStyle = p.fillStyle;
        ctx.fill();
    }
    
    animationFrame = requestAnimationFrame(animate);
}

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;
    
    switch (type) {
        case 'INIT':
            canvas = payload.canvas;
            if (canvas) {
                ctx = canvas.getContext('2d', { alpha: true });
                resize(payload.width, payload.height);
                initParticles();
                if (animationFrame === null) animate();
            }
            break;
            
        case 'RESIZE':
            resize(payload.width, payload.height);
            break;
            
        case 'SCROLL':
            targetScrollVelocity = payload.deltaY * -0.5;
            break;
            
        case 'UPDATE_DEPTH':
            currentDepth = payload.depth;
            // 3000m〜3500mの間は海流が激しくなり吹雪（ブリザード）になる
            if (currentDepth >= 3000 && currentDepth <= 3500) {
                targetGlobalWind = 8.0; // 横殴りの風
                targetSpeedMult = 5.0;  // 落下速度アップ
            } else {
                targetGlobalWind = 0;
                targetSpeedMult = 1.0;
            }
            break;

        case 'PAUSE':
            isPaused = true;
            // 再開前に未実行のフレームを取り消し、二重ループを防ぐ。
            if (animationFrame !== null) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            break;

        case 'PLAY':
            if (isPaused) {
                isPaused = false;
                animate();
            }
            break;
    }
};

export {};
