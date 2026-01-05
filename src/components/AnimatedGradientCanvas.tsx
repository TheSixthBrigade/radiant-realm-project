import { useEffect, useRef } from 'react';

interface AnimatedGradientCanvasProps {
  // Primary colors for the gradient
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  // Animation speed (0.1 = slow, 1 = fast)
  speed?: number;
  // Wave intensity (0 = no waves, 1 = strong waves)
  waveIntensity?: number;
  // Particle count
  particleCount?: number;
  // Show particles
  showParticles?: boolean;
  // Show glow effect
  showGlow?: boolean;
  // Overlay opacity (0-1)
  overlayOpacity?: number;
  // Preset themes
  preset?: 'green' | 'blue' | 'purple' | 'red' | 'orange' | 'cyan' | 'pink' | 'custom';
}

// Preset color themes
const presets = {
  green: {
    primary: 'hsl(155, 25%, 10%)',
    secondary: 'hsl(152, 35%, 16%)',
    accent: 'rgba(34, 197, 94, 1)',
    accentAlt: 'rgba(16, 185, 129, 1)',
  },
  blue: {
    primary: 'hsl(220, 25%, 10%)',
    secondary: 'hsl(215, 35%, 16%)',
    accent: 'rgba(59, 130, 246, 1)',
    accentAlt: 'rgba(99, 102, 241, 1)',
  },
  purple: {
    primary: 'hsl(270, 25%, 10%)',
    secondary: 'hsl(265, 35%, 16%)',
    accent: 'rgba(168, 85, 247, 1)',
    accentAlt: 'rgba(139, 92, 246, 1)',
  },
  red: {
    primary: 'hsl(0, 25%, 10%)',
    secondary: 'hsl(355, 35%, 16%)',
    accent: 'rgba(239, 68, 68, 1)',
    accentAlt: 'rgba(244, 63, 94, 1)',
  },
  orange: {
    primary: 'hsl(25, 25%, 10%)',
    secondary: 'hsl(20, 35%, 16%)',
    accent: 'rgba(249, 115, 22, 1)',
    accentAlt: 'rgba(251, 146, 60, 1)',
  },
  cyan: {
    primary: 'hsl(185, 25%, 10%)',
    secondary: 'hsl(180, 35%, 16%)',
    accent: 'rgba(6, 182, 212, 1)',
    accentAlt: 'rgba(34, 211, 238, 1)',
  },
  pink: {
    primary: 'hsl(330, 25%, 10%)',
    secondary: 'hsl(325, 35%, 16%)',
    accent: 'rgba(236, 72, 153, 1)',
    accentAlt: 'rgba(244, 114, 182, 1)',
  },
  custom: {
    primary: 'hsl(160, 20%, 6%)',
    secondary: 'hsl(155, 25%, 10%)',
    accent: 'rgba(34, 197, 94, 1)',
    accentAlt: 'rgba(16, 185, 129, 1)',
  },
};

// Helper to parse color string to RGB
const parseColor = (color: string): { r: number; g: number; b: number } => {
  // Handle hex
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  // Handle rgb/rgba
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
  }
  // Default fallback
  return { r: 34, g: 197, b: 94 };
};

export const AnimatedGradientCanvas = ({
  primaryColor,
  secondaryColor,
  accentColor,
  speed = 0.5,
  waveIntensity = 0.7,
  particleCount = 50,
  showParticles = true,
  showGlow = true,
  overlayOpacity = 0,
  preset = 'green',
}: AnimatedGradientCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let time = 0;
    
    // Get colors from preset or custom
    const colors = presets[preset] || presets.green;
    const accent = accentColor ? parseColor(accentColor) : parseColor(colors.accent);
    const accentAlt = parseColor(colors.accentAlt);
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    const animate = () => {
      time += 0.002 * speed;
      
      // Create gradient - dark base with color accents
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      
      // Animated offsets for flowing effect
      const offset1 = (Math.sin(time * 0.8) + 1) / 2;
      const offset2 = (Math.sin(time * 0.8 + 2) + 1) / 2;
      
      // Dynamic hue based on preset
      const baseHue = preset === 'green' ? 155 : 
                      preset === 'blue' ? 215 :
                      preset === 'purple' ? 265 :
                      preset === 'red' ? 355 :
                      preset === 'orange' ? 20 :
                      preset === 'cyan' ? 180 :
                      preset === 'pink' ? 325 : 155;
      
      // Very dark base
      gradient.addColorStop(0, `hsl(${baseHue}, 20%, ${6 + Math.sin(time) * 2}%)`);
      // Dark with color tint
      gradient.addColorStop(0.2, `hsl(${baseHue - 5}, 25%, ${10 + Math.sin(time + 1) * 2}%)`);
      // More visible color zone
      gradient.addColorStop(offset1 * 0.2 + 0.35, `hsl(${baseHue + Math.sin(time) * 8}, ${35 + Math.sin(time) * 10}%, ${16 + Math.sin(time) * 4}%)`);
      // Color blend
      gradient.addColorStop(0.55, `hsl(${baseHue + Math.sin(time + 2) * 10}, ${25 + Math.sin(time) * 8}%, ${14 + Math.sin(time) * 3}%)`);
      // Dark with hint of color
      gradient.addColorStop(offset2 * 0.15 + 0.7, `hsl(${baseHue}, 15%, ${9 + Math.sin(time + 3) * 2}%)`);
      // Almost black with color undertone
      gradient.addColorStop(1, `hsl(${baseHue - 5}, 20%, ${5 + Math.sin(time + 4) * 2}%)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Flowing waves with color accents
      if (waveIntensity > 0) {
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);
          
          for (let x = 0; x <= canvas.width; x += 6) {
            const y = canvas.height * (0.35 + i * 0.12) + 
              Math.sin(x * 0.002 + time * 1.5 + i * 0.8) * 100 * waveIntensity +
              Math.sin(x * 0.004 + time * 1.2 + i * 1.2) * 50 * waveIntensity +
              Math.cos(x * 0.001 + time + i) * 70 * waveIntensity;
            ctx.lineTo(x, y);
          }
          
          ctx.lineTo(canvas.width, canvas.height);
          ctx.closePath();
          
          // Wave colors
          const alpha = (0.12 - i * 0.02) * waveIntensity;
          ctx.fillStyle = i % 2 === 0 
            ? `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`
            : `rgba(${accentAlt.r}, ${accentAlt.g}, ${accentAlt.b}, ${alpha})`;
          ctx.fill();
        }
      }
      
      // Add glowing particles
      if (showParticles && particleCount > 0) {
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < particleCount; i++) {
          const x = (Math.sin(time * 0.3 + i * 47) + 1) / 2 * canvas.width;
          const y = (Math.cos(time * 0.2 + i * 31) + 1) / 2 * canvas.height;
          const size = 2 + Math.sin(time + i) * 1.5;
          const alpha = 0.25 + Math.sin(time * 2 + i) * 0.15;
          
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          // Mostly accent particles with some grey
          ctx.fillStyle = i % 4 === 0 
            ? `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`
            : i % 4 === 1
            ? `rgba(${accentAlt.r}, ${accentAlt.g}, ${accentAlt.b}, ${alpha})`
            : i % 4 === 2
            ? `rgba(${Math.min(accent.r + 50, 255)}, ${Math.min(accent.g + 50, 255)}, ${Math.min(accent.b + 50, 255)}, ${alpha})`
            : `rgba(100, 116, 139, ${alpha * 0.5})`;
          ctx.fill();
        }
      }
      
      // Add glow in corners
      if (showGlow) {
        const glowGradient = ctx.createRadialGradient(
          canvas.width * 0.1, canvas.height * 0.9, 0,
          canvas.width * 0.1, canvas.height * 0.9, canvas.width * 0.5
        );
        glowGradient.addColorStop(0, `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${0.15 + Math.sin(time) * 0.05})`);
        glowGradient.addColorStop(0.5, `rgba(${accentAlt.r}, ${accentAlt.g}, ${accentAlt.b}, ${0.05 + Math.sin(time + 1) * 0.02})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.globalCompositeOperation = 'source-over';
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [preset, primaryColor, secondaryColor, accentColor, speed, waveIntensity, particleCount, showParticles, showGlow]);
  
  return (
    <>
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />
      {overlayOpacity > 0 && (
        <div 
          className="fixed inset-0 bg-black pointer-events-none" 
          style={{ zIndex: 1, opacity: overlayOpacity }} 
        />
      )}
    </>
  );
};

export default AnimatedGradientCanvas;
