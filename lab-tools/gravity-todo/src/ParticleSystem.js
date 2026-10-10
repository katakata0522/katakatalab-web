// ParticleSystem — パフォーマンス最適化版
// arc()をfillRect()に置換、compositeOp切替を最小化
export class ParticleSystem {
  static MAX_PARTICLES = 800; // 1500→800に削減

  constructor(canvasContext) {
    this.ctx = canvasContext;
    this.particles = [];
    this.shockwaves = [];
  }

  explode(x, y, color = '#ff3366') {
    // パーティクル数を20-30から40-60に倍増、派手な粉砕感を演出
    const count = 40 + (Math.random() * 20) | 0;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 24, // 速度を上げて広範囲に飛び散るように
        vy: (Math.random() - 0.5) * 24 - 6, // やや上向きの初速を強化
        size: Math.random() * 5.0 + 2.0, // サイズのバリエーションを拡大
        life: 1.0,
        decay: Math.random() * 0.02 + 0.015, // 少し長く残るように
        color,
      });
    }

    // 上限超過時に古いパーティクルを捨てる
    if (this.particles.length > ParticleSystem.MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - ParticleSystem.MAX_PARTICLES);
    }
    
    // 衝撃波（Shockwave）の生成
    this.shockwaves.push({
      x, y,
      radius: 10,
      maxRadius: 150 + Math.random() * 100,
      life: 1.0,
      decay: 0.04,
      color
    });

    // --- 追加：プチ爽快な紙吹雪エフェクト ---
    const confettiCount = 15 + (Math.random() * 10) | 0;
    const confettiColors = ['#ffcc00', '#00e5ff', '#ff3366', '#ffffff', '#00e676'];
    for (let i = 0; i < confettiCount; i++) {
      const cColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20 - 5,
        sizeX: Math.random() * 8 + 4, // 細長い形
        sizeY: Math.random() * 4 + 2, // 細長い形
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.8, // 回転
        life: 1.0,
        decay: Math.random() * 0.01 + 0.01, // 少し長く舞う
        color: cColor,
        isConfetti: true // フラグ
      });
    }
  }

  updateAndDraw() {
    const particles = this.particles;
    if (particles.length === 0) return; // 何もなければ即座にreturn

    const ctx = this.ctx;
    // compositeOp切り替えは1回だけ
    ctx.globalCompositeOperation = 'screen';

    let writeIdx = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.5;
      p.life -= p.decay;

      if (p.life <= 0) continue;

      if (p.isConfetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        p.angle += p.spin;
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.sizeX * 0.5, -p.sizeY * 0.5, p.sizeX, p.sizeY);
        ctx.restore();
      } else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        // arc()→fillRect()に変更（arc+beginPath+fillは描画コスト高い）
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      }

      particles[writeIdx++] = p;
    }
    particles.length = writeIdx;

    // 状態を元に戻す
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    // 衝撃波（Shockwave）の描画
    const shockwaves = this.shockwaves;
    if (shockwaves.length > 0) {
      ctx.lineWidth = 4;
      let swWriteIdx = 0;
      for (let i = 0; i < shockwaves.length; i++) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.15; // イージングで広がる
        sw.life -= sw.decay;

        if (sw.life <= 0) continue;

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        
        // rgba文字列でなくHex等だった場合のためにglobalAlphaを利用
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.life;
        ctx.stroke();

        shockwaves[swWriteIdx++] = sw;
      }
      shockwaves.length = swWriteIdx;
      ctx.globalAlpha = 1.0;
    }
  }
}
