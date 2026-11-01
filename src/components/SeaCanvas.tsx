import { useEffect, useRef } from 'react';
import type { Sea } from '../lib/sea';

/** Full-bleed WebGL particle whale behind the hero (pointer-reactive, pauses off-screen / hidden tab).
 *  three.js is loaded as a separate chunk so the page shell paints first. */
export function SeaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const hero = canvas.parentElement!;
    let sea: Sea | null = null;
    let disposed = false;
    let raf = 0;
    let mx = 0, my = 0;
    const fit = () => {
      if (!sea) return;
      const r = hero.getBoundingClientRect();
      sea.resize(r.width, r.height);
    };
    const move = (e: PointerEvent) => {
      mx = (e.clientX / innerWidth) * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const loop = (now: number) => {
      if (sea && !document.hidden && hero.getBoundingClientRect().bottom > 0 && (!reduced.matches || !sea.last)) {
        sea.render(reduced.matches ? 1 : now / 1000, mx, my);
      }
      raf = requestAnimationFrame(loop);
    };

    import('../lib/sea')
      .then(({ Sea }) => {
        if (disposed) return;
        try {
          sea = new Sea(canvas, { scale: 1.55 });
        } catch {
          canvas.hidden = true; // no WebGL: the radial gradient background remains
          return;
        }
        fit();
        raf = requestAnimationFrame(loop);
      })
      .catch(() => (canvas.hidden = true));

    addEventListener('resize', fit);
    addEventListener('pointermove', move);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener('resize', fit);
      removeEventListener('pointermove', move);
      sea?.dispose();
    };
  }, []);
  return <canvas id="sea" ref={ref} aria-label="Animated particle whale swimming through dark water" />;
}
