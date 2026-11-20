import { useEffect, useRef } from "react";

/** Low-power 2D fallback: drifting cloud bands and a plane silhouette. */
export function Hero2D({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const g = c.getContext("2d")!;
    let raf = 0; let t = 0;
    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue("--primary").trim() || "#2457d6";
    const destructive = css.getPropertyValue("--destructive").trim() || "#d94841";
    const background = css.getPropertyValue("--background").trim() || "#fff8e7";
    const secondary = css.getPropertyValue("--secondary").trim() || "#eaf0ff";
    const card = css.getPropertyValue("--card").trim() || "#fffdf7";
    const draw = () => {
      const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio);
      const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, background); bg.addColorStop(1, secondary);
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const x = ((i * 197 + t * (8 + (i % 5) * 4)) % (w + 400)) - 200, y = ((i * 89) % h);
        const r = 60 + (i % 7) * 25;
        const grd = g.createRadialGradient(x, y, 0, x, y, r * devicePixelRatio);
        grd.addColorStop(0, "rgba(255,255,255,0.72)"); grd.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r * devicePixelRatio, 0, Math.PI * 2); g.fill();
      }
      g.save(); g.translate(w * 0.55, h * 0.48 + Math.sin(t / 40) * 8); g.scale(devicePixelRatio * 1.4, devicePixelRatio * 1.4);
      g.fillStyle = card; g.beginPath(); g.ellipse(0, 0, 120, 12, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(10, 0); g.lineTo(-40, 70); g.lineTo(-60, 70); g.lineTo(-25, 0); g.fill();
      g.beginPath(); g.moveTo(10, 0); g.lineTo(-40, -70); g.lineTo(-60, -70); g.lineTo(-25, 0); g.fill();
      g.fillStyle = destructive; g.beginPath(); g.moveTo(-95, 0); g.lineTo(-125, -40); g.lineTo(-135, -40); g.lineTo(-120, 0); g.fill();
      g.fillStyle = primary; g.fillRect(-80, -2, 145, 4);
      g.restore();
      t += 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return <canvas ref={ref} className="h-full w-full" aria-hidden />;
}
