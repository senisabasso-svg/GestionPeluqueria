import { motion } from "framer-motion";

type Props = { children: React.ReactNode; className?: string };

/** Panel estático: sin inclinación por mouse para evitar lag. */
export default function LoginGlassTilt({ children, className = "" }: Props) {
  return (
    <motion.div
      className={className}
      style={{
        rotateX: 0,
        rotateY: 0,
        transformPerspective: 960,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}
