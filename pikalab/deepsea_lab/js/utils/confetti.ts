export class ConfettiManager {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private particles: any[] = [];
    private animationId: number | null = null;
    private colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#42d6a4', '#42a5f5', '#fff'];

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    private resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    public fire() {
        if (!this.ctx || !this.canvas) return;
        this.particles = [];
        
        const count = 150;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 + 100, // Slightly below center
                r: Math.random() * 6 + 4, // radius
                dx: Math.random() * 20 - 10,
                dy: Math.random() * -20 - 5,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
                tiltAngle: 0
            });
        }
        
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        this.animate();
    }

    private animate() {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let activeParticles = 0;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            p.tiltAngle += p.tiltAngleIncrement;
            p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle) * 2;
            
            // Gravity and air resistance
            p.dy += 0.4;
            p.x += p.dx;
            p.y += p.dy;
            
            // Spinning effect
            const tiltX = p.r * Math.cos(p.tiltAngle);
            const tiltY = p.r * Math.sin(p.tiltAngle);

            if (p.y <= this.canvas.height + 20) {
                activeParticles++;
                this.ctx.beginPath();
                this.ctx.lineWidth = p.r;
                this.ctx.strokeStyle = p.color;
                this.ctx.moveTo(p.x + p.tilt + tiltX, p.y + tiltY);
                this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
                this.ctx.stroke();
            }
        }

        if (activeParticles > 0) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    public stop() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.particles = [];
    }
}
