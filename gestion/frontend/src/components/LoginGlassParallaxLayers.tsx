import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * Fondo tipo tutorial glass + parallax (capas a distinta profundidad con el cursor).
 * Inspiración: https://www.youtube.com/watch?v=HBXdPRIWnz0
 */
export default function LoginGlassParallaxLayers() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 28, damping: 22, mass: 0.45 });
  const sy = useSpring(my, { stiffness: 28, damping: 22, mass: 0.45 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      mx.set((e.clientX / w - 0.5) * 2);
      my.set((e.clientY / h - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, reduce]);

  const x1 = useTransform(sx, (v) => v * 52);
  const y1 = useTransform(sy, (v) => v * 38);
  const x2 = useTransform(sx, (v) => v * 32);
  const y2 = useTransform(sy, (v) => v * 26);
  const x3 = useTransform(sx, (v) => v * 18);
  const y3 = useTransform(sy, (v) => v * 14);
  const x4 = useTransform(sx, (v) => v * -24);
  const y4 = useTransform(sy, (v) => v * -18);

  if (reduce) {
    return (
      <div className="login-glass-layers login-glass-layers--static" aria-hidden>
        <div className="login-glass-blob login-glass-blob--1" />
        <div className="login-glass-blob login-glass-blob--2" />
        <div className="login-glass-blob login-glass-blob--3" />
      </div>
    );
  }

  return (
    <div className="login-glass-layers" aria-hidden>
      <motion.div className="login-glass-blob login-glass-blob--1" style={{ x: x1, y: y1 }} />
      <motion.div className="login-glass-blob login-glass-blob--2" style={{ x: x2, y: y2 }} />
      <motion.div className="login-glass-blob login-glass-blob--3" style={{ x: x3, y: y3 }} />
      <motion.div className="login-glass-blob login-glass-blob--4" style={{ x: x4, y: y4 }} />
      <div className="login-glass-noise" />
    </div>
  );
}
