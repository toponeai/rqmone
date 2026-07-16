import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * R.Q.M.1 Particle Engine — reusable GPU-friendly 2D canvas layer.
 *
 * Renders drifting stars + optional nebula wash behind any surface. Consumed
 * by the Galaxy background and any module that wants ambient space feel.
 * Single canvas, requestAnimationFrame loop, pauses when tab is hidden.
 */
export interface StarfieldProps {
  /** Number of stars. Auto-scales down on mobile viewports. */
  density?: number;
  /** Show a slow-drifting nebula wash. */
  nebula?: boolean;
  /** Optional className applied to the wrapper. */
  className?: string;
}

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  vx: number;
  vy: number;
  tw: number;
}

export function Starfield({ density = 160, nebula = true, className }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;
    let running = true;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(
        density,
        Math.max(40, Math.floor((w * h) / 8000)),
      );
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.7 + 0.2,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      if (nebula) {
        const g1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, Math.max(w, h) * 0.6);
        g1.addColorStop(0, "rgba(80,140,255,0.10)");
        g1.addColorStop(1, "rgba(80,140,255,0)");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, w, h);
        const g2 = ctx.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, Math.max(w, h) * 0.55);
        g2.addColorStop(0, "rgba(180,90,255,0.09)");
        g2.addColorStop(1, "rgba(180,90,255,0)");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, h);
      }
      for (const s of stars) {
        if (!reduced) {
          s.x += s.vx;
          s.y += s.vy;
          s.tw += 0.02;
          if (s.x < 0) s.x += w;
          if (s.x > w) s.x -= w;
          if (s.y < 0) s.y += h;
          if (s.y > h) s.y -= h;
        }
        const alpha = reduced ? s.a : s.a * (0.6 + Math.sin(s.tw) * 0.4);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,235,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density, nebula]);

  return (
    <div className={className} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
