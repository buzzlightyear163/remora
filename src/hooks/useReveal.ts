import { useEffect } from 'react';

/** Adds `.shown` to every `.rv` element once it scrolls into view (threshold .1), like the reference. */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      es =>
        es.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('shown');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.rv:not(.shown)').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** ?at=pod&dy=120 deep-link support (reference feature used for screenshots). */
export function useAtParam() {
  useEffect(() => {
    const AT = new URLSearchParams(location.search);
    const at = AT.get('at');
    if (!at) return;
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('.rv').forEach(e => e.classList.add('shown'));
    const t = setTimeout(() => {
      document.getElementById(at)?.scrollIntoView();
      const dy = AT.get('dy');
      if (dy) scrollBy(0, +dy);
    }, 1500);
    return () => clearTimeout(t);
  }, []);
}
