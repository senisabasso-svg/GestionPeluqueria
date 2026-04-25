import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/** Acento decorativo muy suave detrás del contenido al hacer scroll (salón autenticado). */
export default function TenantParallaxDecor() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  const yA = useTransform(scrollY, [0, 1400], [0, reduce ? 0 : -100]);
  const yB = useTransform(scrollY, [0, 1400], [0, reduce ? 0 : -55]);
  const yC = useTransform(scrollY, [0, 1400], [0, reduce ? 0 : -30]);

  return (
    <div className="tenant-parallax-decor" aria-hidden>
      <motion.div className="tenant-parallax-blob tenant-parallax-blob--a" style={{ y: yA }} />
      <motion.div className="tenant-parallax-blob tenant-parallax-blob--b" style={{ y: yB }} />
      <motion.div className="tenant-parallax-blob tenant-parallax-blob--c" style={{ y: yC }} />
    </div>
  );
}
