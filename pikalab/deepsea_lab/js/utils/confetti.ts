interface ConfettiParticle {
    x: number;
    y: number;
    r: number;
    dx: number;
    dy: number;
    color: string;
    tilt: number;
    tiltAngleIncrement: number;
    tiltAngle: number;
}

const CONFETTI_COLORS = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#42d6a4', '#42a5f5', '#fff'];

export class ConfettiManager {
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;
    private particles: ConfettiParticle[] = [];
    private animationId: number | null = null;
    private readonly animateBound: () => void;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.animateBound = () => this.animate();

        window.addEventListener('resize', () => this.resize(), { passive: true });
        this.resize();
    }

    private resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    public fire() {
        if (!this.ctx || !this.canvas) return;
        const count = 150;
        const startX = this.canvas.width / 2;
        const startY = this.canvas.height / 2 + 100; // Slightly below center
        this.particles = new Array<ConfettiParticle>(count);

        for (let i = 0; i < count; i++) {
            this.particles[i] = {
                x: startX,
                y: startY,
                r: Math.random() * 6 + 4, // radius
                dx: Math.random() * 20 - 10,
                dy: Math.random() * -20 - 5,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
                tiltAngle: 0
            };
        }

        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.animate();
    }

    private animate() {
        this.animationId = null;
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const maxY = this.canvas.height + 20;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let activeParticles = 0;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            p.tiltAngle += p.tiltAngleIncrement;
            const cosTilt = Math.cos(p.tiltAngle);
            const sinTilt = Math.sin(p.tiltAngle);
            p.y += (cosTilt + 1 + p.r / 2) / 2;
            p.x += sinTilt * 2;

            // Gravity and air resistance
            p.dy += 0.4;
            p.x += p.dx;
            p.y += p.dy;

            if (p.y <= maxY) {
                activeParticles++;
                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r * cosTilt, p.y + p.r * sinTilt);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
                ctx.stroke();
            }
        }

        if (activeParticles > 0) {
            this.animationId = requestAnimationFrame(this.animateBound);
        } else {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    public stop() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.particles = [];
    }
}
