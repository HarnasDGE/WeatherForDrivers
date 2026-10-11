import { useEffect, useRef } from 'react';
import { useResolvedTheme } from '@/hooks/useTheme';
import type { Sky } from './sky';
import styles from './WeatherBackdrop.module.css';

interface Particle {
  x: number;
  y: number;
  /** px per second */
  speed: number;
  size: number;
  /** horizontal sway phase (snow) / opacity (stars) */
  phase: number;
}

interface Cloud {
  x: number;
  y: number;
  r: number;
  speed: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Particle colours per theme: they must stay visible but never compete with the text above. */
const INK = {
  light: {
    rain: 'rgba(36, 87, 214, 0.24)',
    snow: 'rgba(96, 120, 160, 0.45)',
    cloud: 'rgba(255, 255, 255, 0.75)',
    fog: 'rgba(255, 255, 255, 0.55)',
    star: '255, 255, 255',
  },
  dark: {
    rain: 'rgba(150, 185, 255, 0.35)',
    snow: 'rgba(235, 240, 250, 0.75)',
    cloud: 'rgba(120, 132, 150, 0.22)',
    fog: 'rgba(170, 180, 195, 0.14)',
    star: '255, 255, 255',
  },
} as const;

/**
 * Animated sky behind the forecast: falling rain or snow, drifting clouds or fog, lightning flashes,
 * stars at night. A gradient (CSS, per sky and theme) sits underneath the canvas.
 * With reduced motion it draws a single still frame.
 */
export default function WeatherBackdrop({ sky }: { sky: Sky }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const theme = useResolvedTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ink = INK[theme];
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let clouds: Cloud[] = [];
    let stars: Particle[] = [];

    const seed = () => {
      const area = (width * height) / (390 * 844);
      const falling =
        sky.kind === 'rain' || sky.kind === 'storm'
          ? 70 + 230 * sky.intensity
          : sky.kind === 'snow'
            ? 40 + 140 * sky.intensity
            : 0;
      particles = Array.from({ length: Math.round(falling * area) }, () => ({
        x: rand(-50, width + 50),
        y: rand(-height, height),
        speed: sky.kind === 'snow' ? rand(25, 70) : rand(650, 1000),
        size: sky.kind === 'snow' ? rand(1.5, 3.8) : rand(10, 22),
        phase: rand(0, Math.PI * 2),
      }));
      const cloudCount =
        sky.kind === 'clear'
          ? Math.round(sky.intensity * 4)
          : sky.kind === 'fog'
            ? 7
            : sky.kind === 'clouds'
              ? 3 + Math.round(sky.intensity * 4)
              : 4;
      clouds = Array.from({ length: cloudCount }, () => ({
        x: rand(-0.2, 1.2) * width,
        y: sky.kind === 'fog' ? rand(0.15, 1) * height : rand(-0.05, 0.4) * height,
        r: sky.kind === 'fog' ? rand(140, 260) : rand(70, 150),
        speed: rand(6, 16) * (sky.wind >= 0 ? 1 : -1),
      }));
      stars =
        sky.night && (sky.kind === 'clear' || sky.intensity < 0.5)
          ? Array.from({ length: Math.round(70 * area) }, () => ({
              x: rand(0, width),
              y: rand(0, height * 0.6),
              speed: rand(0.5, 1.6),
              size: rand(0.6, 1.6),
              phase: rand(0, Math.PI * 2),
            }))
          : [];
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      seed();
    };

    const drawCloud = (cloud: Cloud) => {
      const gradient = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
      const colour = sky.kind === 'fog' ? ink.fog : ink.cloud;
      gradient.addColorStop(0, colour);
      gradient.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.r * 1.6, cloud.r, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    let last = performance.now();
    let frame = 0;
    let nextFlash = performance.now() + rand(2500, 7000);

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        const twinkle = 0.45 + 0.4 * Math.sin((now / 1000) * star.speed + star.phase);
        ctx.fillStyle = `rgba(${ink.star}, ${twinkle})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      for (const cloud of clouds) {
        cloud.x += cloud.speed * dt;
        if (cloud.speed > 0 && cloud.x - cloud.r * 1.6 > width) cloud.x = -cloud.r * 1.6;
        if (cloud.speed < 0 && cloud.x + cloud.r * 1.6 < 0) cloud.x = width + cloud.r * 1.6;
        drawCloud(cloud);
      }

      if (sky.kind === 'snow') {
        ctx.fillStyle = ink.snow;
        for (const flake of particles) {
          flake.y += flake.speed * dt;
          flake.x += (Math.sin(now / 900 + flake.phase) * 18 + sky.wind * 40) * dt;
          if (flake.y > height + 5) {
            flake.y = -5;
            flake.x = rand(-50, width + 50);
          }
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (particles.length > 0) {
        const slant = 0.12 + sky.wind * 0.25;
        ctx.strokeStyle = ink.rain;
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const drop of particles) {
          drop.y += drop.speed * dt;
          drop.x += drop.speed * slant * dt;
          if (drop.y > height + 20) {
            drop.y = rand(-60, -10);
            drop.x = rand(-80, width);
          }
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.size * slant, drop.y - drop.size);
        }
        ctx.stroke();
      }

      if (sky.kind === 'storm' && !still && now > nextFlash && flashRef.current) {
        flashRef.current.animate(
          [{ opacity: 0 }, { opacity: 0.8 }, { opacity: 0.1 }, { opacity: 0.6 }, { opacity: 0 }],
          {
            duration: 650,
            easing: 'ease-out',
          },
        );
        nextFlash = now + rand(4000, 11000);
      }

      if (!still) frame = requestAnimationFrame(draw);
    };

    resize();
    frame = requestAnimationFrame(draw);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // Save battery: no frames while the tab is hidden.
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !still) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sky.kind, sky.intensity, sky.night, sky.wind, theme]);

  return (
    <div className={styles.backdrop} data-sky={sky.kind} data-night={sky.night} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div ref={flashRef} className={styles.flash} />
    </div>
  );
}
