import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const STORAGE_KEY = "gp_login_intro_v1";

type Props = {
  onComplete: () => void;
};

/** Intro con tijeras + mechón (framer-motion). Se omite si ya se vio en esta sesión. */
export default function LoginIntroOverlay({ onComplete }: Props) {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(true);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* modo privado */
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (reduceMotion) {
      setShow(false);
      finish();
    }
  }, [reduceMotion, finish]);

  useEffect(() => {
    if (reduceMotion) return;
    const t = window.setTimeout(() => setShow(false), 3400);
    return () => window.clearTimeout(t);
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <AnimatePresence onExitComplete={finish}>
      {show && (
        <motion.div
          key="intro"
          className="login-intro-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
            filter: "blur(14px)",
            transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
          }}
          aria-hidden
        >
          <button type="button" className="login-intro-skip" onClick={() => setShow(false)}>
            Saltar
          </button>
          <div className="login-intro-glow" />
          <motion.div
            className="login-intro-stage"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="login-intro-kicker">Gestión de peluquerías</p>

            <div className="login-intro-scene">
              <div className="login-intro-hair-wrap">
                <div className="login-intro-hair-shine" />
                <motion.div
                  className="login-intro-hair login-intro-hair-upper"
                  initial={{ scaleY: 1 }}
                  animate={{ scaleY: 1 }}
                  style={{ transformOrigin: "bottom center" }}
                />
                <motion.div
                  className="login-intro-hair login-intro-hair-lower"
                  initial={{ y: 0, opacity: 1, rotate: 0 }}
                  animate={{ y: 56, opacity: 0, rotate: -10 }}
                  transition={{ delay: 1.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>

              <motion.div
                className="login-intro-scissors"
                initial={{ y: -36, rotate: -8 }}
                animate={{
                  y: [-36, 4, 4, -6, -6, 0],
                  rotate: [-8, 0, 0, 3, 3, 0],
                }}
                transition={{
                  duration: 2.9,
                  times: [0, 0.26, 0.34, 0.4, 0.48, 1],
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <svg viewBox="0 0 120 120" width="112" height="112" aria-hidden>
                  <defs>
                    <linearGradient id="intro-blade" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f1f5f9" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                  </defs>
                  <motion.g style={{ transformOrigin: "60px 56px" }} animate={{ rotate: [0, -24, 0, -20, 0, 0] }} transition={{ duration: 2.9, times: [0, 0.11, 0.18, 0.3, 0.38, 1], ease: "easeInOut" }}>
                    <path d="M60 56 L26 18 L18 26 L50 60 Z" fill="url(#intro-blade)" stroke="#64748b" strokeWidth="1.2" />
                  </motion.g>
                  <motion.g style={{ transformOrigin: "60px 56px" }} animate={{ rotate: [0, 24, 0, 20, 0, 0] }} transition={{ duration: 2.9, times: [0, 0.11, 0.18, 0.3, 0.38, 1], ease: "easeInOut" }}>
                    <path d="M60 56 L94 18 L102 26 L70 60 Z" fill="url(#intro-blade)" stroke="#64748b" strokeWidth="1.2" />
                  </motion.g>
                  <circle cx="60" cy="56" r="5" fill="#334155" />
                  <circle cx="42" cy="80" r="8" fill="none" stroke="#64748b" strokeWidth="2.4" />
                  <circle cx="78" cy="80" r="8" fill="none" stroke="#64748b" strokeWidth="2.4" />
                </svg>
              </motion.div>
            </div>

            <motion.p className="login-intro-tagline" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
              Sistema listo. Inicie sesión cuando quiera.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function shouldSkipLoginIntro(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
