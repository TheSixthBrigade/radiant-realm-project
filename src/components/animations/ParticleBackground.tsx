import { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  particleCount?: number;
  color?: string;
  speed?: number;
  interactive?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  hue: number;
}

// Simplified world map coordinates (major landmasses)
const WORLD_MAP_POINTS = [
  // North America
  ...Array.from({ length: 150 }, () => ({
    x: 0.15 + Math.random() * 0.15,
    y: 0.2 + Math.random() * 0.25,
  })),
  // South America
  ...Array.from({ length: 80 }, () => ({
    x: 0.22 + Math.random() * 0.08,
    y: 0.5 + Math.random() * 0.25,
  })),
  // Europe
  ...Array.from({ length: 100 }, () => ({
    x: 0.48 + Math.random() * 0.08,
    y: 0.15 + Math.random() * 0.2,
  })),
  // Africa
  ...Array.from({ length: 120 }, () => ({
    x: 0.48 + Math.random() * 0.12,
    y: 0.35 + Math.random() * 0.3,
  })),
  // Asia
  ...Array.from({ length: 200 }, () => ({
    x: 0.6 + Math.random() * 0.25,
    y: 0.15 + Math.random() * 0.35,
  })),
  // Australia
  ...Array.from({ length: 60 }, () => ({
    x: 0.78 + Math.random() * 0.08,
    y: 0.6 + Math.random() * 0.15,
  })),
];

export function ParticleBackground({
  particleCount = 700,
  color = '#6366f1',
  speed = 0.5,
  interactive = true,
  className = '',
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    // Initialize particles based on world map coordinates
    const initParticles = () => {
      particlesRef.current = [];
      const pointsToUse = Math.min(particleCount, WORLD_MAP_POINTS.length);
      
      for (let i = 0; i < pointsToUse; i++) {
        const point = WORLD_MAP_POINTS[i % WORLD_MAP_POINTS.length];
        const baseX = point.x * canvas.width;
        const baseY = point.y * canvas.height;
        
        particlesRef.current.push({
          x: baseX + (Math.random() - 0.5) * 20,
          y: baseY + (Math.random() - 0.5) * 20,
          baseX,
          baseY,
          vx: 0,
          vy: 0,
          radius: Math.random() * 1.5 + 0.8,
          opacity: Math.random() * 0.4 + 0.4,
          hue: Math.random() * 60 + 180,
        });
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove);
    }

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Mouse interaction - push particles away
        if (interactive) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120 && distance > 0) {
            const force = (120 - distance) / 120 * 0.5;
            particle.vx -= (dx / distance) * force;
            particle.vy -= (dy / distance) * force;
          }
        }

        // Pull back to base position
        const returnForce = 0.05;
        particle.vx += (particle.baseX - particle.x) * returnForce;
        particle.vy += (particle.baseY - particle.y) * returnForce;

        // Apply friction
        particle.vx *= 0.85;
        particle.vy *= 0.85;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
      });

      // Draw connections first
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1, i + 6).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 80) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const avgHue = (p1.hue + p2.hue) / 2;
            const opacity = 0.15 * (1 - distance / 80);
            ctx.strokeStyle = `hsla(${avgHue}, 60%, 45%, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw particles
      particlesRef.current.forEach((particle) => {
        // Subtle glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius * 2.5
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 55%, ${particle.opacity * 0.8})`);
        gradient.addColorStop(0.5, `hsla(${particle.hue}, 70%, 50%, ${particle.opacity * 0.3})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 70%, 45%, 0)`);

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 75%, 60%, ${particle.opacity})`;
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particleCount, color, speed, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}
