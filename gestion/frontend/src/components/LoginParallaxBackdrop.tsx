import { useCallback } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, useMotionValue } from "framer-motion";

type Props = {
  children: React.ReactNode;
};

/**
 * Parallax por scroll + cursor: capas decorativas a distinta profundidad (estilo Apple).
 */
export default function LoginParallaxBackdrop({ children }: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  const yFar = useTransform(scrollY, [0, 720], [0, reduce ? 0 : -260]);
  const yMid = useTransform(scrollY, [0, 720], [0, reduce ? 0 : -140]);
  const yNear = useTransform(scrollY, [0, 720], [0, reduce ? 0 : -68]);
  const rotFar = useTransform(scrollY, [0, 720], [0, reduce ? 0 : -12]);
  const rotNear = useTransform(scrollY, [0, 720], [0, reduce ? 0 : 8]);
  const mist = useTransform(scrollY, [0, 480, 920], [0.5, 0.32, 0.18]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 24, damping: 18, mass: 0.55 });
  const smy = useSpring(my, { stiffness: 24, damping: 18, mass: 0.55 });

  const x1 = useTransform(smx, (v) => v * 0.7);
  const x2 = useTransform(smx, (v) => v * 0.45);
  const x3 = useTransform(smx, (v) => v * 0.28);
  const ym1 = useTransform(smy, (v) => v * 0.38);
  const ym2 = useTransform(smy, (v) => v * 0.24);
  const ym3 = useTransform(smy, (v) => v * 0.14);

  const yLayerFar = useTransform([yFar, ym1], ([a, b]) => Number(a) + Number(b));
  const yLayerMid = useTransform([yMid, ym2], ([a, b]) => Number(a) + Number(b));
  const yLayerNear = useTransform([yNear, ym3], ([a, b]) => Number(a) + Number(b));

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce) return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      mx.set((e.clientX / w - 0.5) * 40);
      my.set((e.clientY / h - 0.5) * 30);
    },
    [mx, my, reduce]
  );

  const onLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  return (
    <div className="login-parallax-root" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="login-parallax-layers" aria-hidden>
        <motion.div className="login-parallax-mist" style={{ opacity: mist }} />
        <motion.div
          className="login-parallax-blob login-parallax-blob--far"
          style={{ y: yLayerFar, x: x1, rotate: rotFar }}
        />
        <motion.div className="login-parallax-blob login-parallax-blob--mid" style={{ y: yLayerMid, x: x2 }} />
        <motion.div
          className="login-parallax-blob login-parallax-blob--near"
          style={{ y: yLayerNear, x: x3, rotate: rotNear }}
        />
        <div className="login-parallax-grid" />
      </div>

      <div className="login-parallax-content">{children}</div>
    </div>
  );
}
