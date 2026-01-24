/**
 * Canvas-based particle system with object pooling and additive blending.
 * Supports multiple presets for different visual effects.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  active: boolean;
}

interface ParticlePreset {
  count: number;
  velocityRange: { minX: number; maxX: number; minY: number; maxY: number };
  lifeRange: { min: number; max: number };
  sizeRange: { min: number; max: number };
  colors: string[];
  gravity: number;
}

const PRESETS: Record<string, ParticlePreset> = {
  perfectBurst: {
    count: 24,
    velocityRange: { minX: -150, maxX: 150, minY: -200, maxY: -100 },
    lifeRange: { min: 0.6, max: 1.0 },
    sizeRange: { min: 3, max: 6 },
    colors: ["#4ade80", "#22c55e", "#86efac"],
    gravity: 200,
  },
  greatBurst: {
    count: 16,
    velocityRange: { minX: -120, maxX: 120, minY: -180, maxY: -80 },
    lifeRange: { min: 0.5, max: 0.9 },
    sizeRange: { min: 2.5, max: 5 },
    colors: ["#fbbf24", "#f59e0b", "#fcd34d"],
    gravity: 180,
  },
  okBurst: {
    count: 8,
    velocityRange: { minX: -100, maxX: 100, minY: -150, maxY: -60 },
    lifeRange: { min: 0.4, max: 0.8 },
    sizeRange: { min: 2, max: 4 },
    colors: ["#60a5fa", "#3b82f6", "#93c5fd"],
    gravity: 160,
  },
  streakTrail: {
    count: 2,
    velocityRange: { minX: -20, maxX: 20, minY: -80, maxY: -40 },
    lifeRange: { min: 0.8, max: 1.2 },
    sizeRange: { min: 2, max: 3 },
    colors: ["#d946ef", "#e879f9", "#f0abfc"],
    gravity: -20, // Float upward
  },
  ambient: {
    count: 1,
    velocityRange: { minX: -30, maxX: 30, minY: -50, maxY: -20 },
    lifeRange: { min: 2.0, max: 3.5 },
    sizeRange: { min: 1, max: 2 },
    colors: ["#a78bfa", "#c084fc", "#e9d5ff"],
    gravity: 10,
  },
  milestone: {
    count: 40,
    velocityRange: { minX: -200, maxX: 200, minY: -250, maxY: -50 },
    lifeRange: { min: 0.8, max: 1.5 },
    sizeRange: { min: 4, max: 8 },
    colors: ["#4ade80", "#fbbf24", "#60a5fa", "#d946ef", "#f87171", "#22d3ee"],
    gravity: 220,
  },
};

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private lastTime: number = 0;
  private animationFrameId: number = 0;

  private readonly MAX_ACTIVE = 150;
  private readonly POOL_SIZE = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }
    this.ctx = ctx;

    // Initialize particle pool
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.particlePool.push(this.createParticle());
    }

    // Set composite mode for additive blending (neon glow)
    this.ctx.globalCompositeOperation = "lighter";
  }

  private createParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: "#ffffff",
      gravity: 0,
      active: false,
    };
  }

  private getParticleFromPool(): Particle | null {
    // Check if we've hit the active particle limit
    const activeCount = this.particles.filter((p) => p.active).length;
    if (activeCount >= this.MAX_ACTIVE) {
      return null;
    }

    // Try to reuse from pool
    const particle = this.particlePool.pop();
    if (particle) {
      return particle;
    }

    // Pool exhausted, try to reclaim inactive particle
    const inactive = this.particles.find((p) => !p.active);
    if (inactive) {
      return inactive;
    }

    return null;
  }

  private returnParticleToPool(particle: Particle): void {
    particle.active = false;
    if (this.particlePool.length < this.POOL_SIZE) {
      this.particlePool.push(particle);
    }
  }

  /**
   * Emit particles at a specific position with a preset configuration
   */
  emit(x: number, y: number, presetName: keyof typeof PRESETS): void {
    const preset = PRESETS[presetName];
    if (!preset) {
      console.warn(`Unknown particle preset: ${presetName}`);
      return;
    }

    for (let i = 0; i < preset.count; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break; // Hit limit

      const color = preset.colors[Math.floor(Math.random() * preset.colors.length)]!;
      const life =
        preset.lifeRange.min +
        Math.random() * (preset.lifeRange.max - preset.lifeRange.min);
      const size =
        preset.sizeRange.min +
        Math.random() * (preset.sizeRange.max - preset.sizeRange.min);

      particle.x = x;
      particle.y = y;
      particle.vx =
        preset.velocityRange.minX +
        Math.random() * (preset.velocityRange.maxX - preset.velocityRange.minX);
      particle.vy =
        preset.velocityRange.minY +
        Math.random() * (preset.velocityRange.maxY - preset.velocityRange.minY);
      particle.life = life;
      particle.maxLife = life;
      particle.size = size;
      particle.color = color;
      particle.gravity = preset.gravity;
      particle.active = true;

      this.particles.push(particle);
    }
  }

  /**
   * Start the animation loop
   */
  start(): void {
    this.lastTime = performance.now();
    this.tick();
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  /**
   * Clear all active particles
   */
  clear(): void {
    this.particles.forEach((p) => {
      if (p.active) {
        this.returnParticleToPool(p);
      }
    });
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private tick = (): void => {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = now;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]!;
      if (!particle.active) continue;

      // Update physics
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      // Update life
      particle.life -= dt;

      // Deactivate dead particles
      if (particle.life <= 0) {
        this.returnParticleToPool(particle);
        this.particles.splice(i, 1);
      }
    }
  }

  private render(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw particles
    for (const particle of this.particles) {
      if (!particle.active) continue;

      const lifeRatio = particle.life / particle.maxLife;
      const alpha = Math.min(lifeRatio * 2, 1); // Fade in first half, stay bright

      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = alpha;

      // Size decay over lifetime
      const currentSize = particle.size * (0.5 + lifeRatio * 0.5);

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  /**
   * Resize canvas (call when container resizes)
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
