import { motion, useReducedMotion } from "framer-motion";

const float = (delay: number, y = 8) => ({
  y: [0, -y, 0],
  transition: { duration: 4 + delay * 0.4, repeat: Infinity, ease: "easeInOut", delay },
});

export default function LoginSalonIllustration() {
  const reduce = useReducedMotion();

  return (
    <div className="login-split-art" aria-hidden>
      <svg className="login-split-svg" viewBox="0 0 420 520" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="loginArtStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(191,219,254,0.85)" />
          </linearGradient>
        </defs>

        <motion.g
          stroke="url(#loginArtStroke)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={false}
          animate={reduce ? undefined : float(0, 10)}
        >
          <rect x="118" y="88" width="184" height="124" rx="10" opacity="0.9" />
          <path d="M138 118h144M138 138h96M138 158h120" opacity="0.55" />
        </motion.g>

        <motion.g
          stroke="url(#loginArtStroke)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={reduce ? undefined : float(0.5, 12)}
        >
          <path d="M210 228c-38 0-68 32-68 72v52h136v-52c0-40-30-72-68-72z" opacity="0.92" />
          <circle cx="210" cy="278" r="22" opacity="0.85" />
          <path d="M188 302c8 18 24 28 22 28h-4" opacity="0.6" />
        </motion.g>

        <motion.g
          stroke="url(#loginArtStroke)"
          strokeWidth="2"
          fill="none"
          animate={reduce ? undefined : float(1, 14)}
        >
          <circle cx="210" cy="248" r="48" opacity="0.35" />
          <path d="M178 248c0-18 14-32 32-32s32 14 32 32" />
        </motion.g>

        <motion.g stroke="url(#loginArtStroke)" strokeWidth="1.8" strokeLinecap="round" fill="none" animate={reduce ? undefined : float(0.2, 9)}>
          <path d="M52 120l22-12 12 22-22 12z" opacity="0.75" />
          <path d="M340 96h28M354 82v28" opacity="0.8" />
          <rect x="312" y="200" width="36" height="26" rx="4" opacity="0.65" />
          <path d="M72 280c12-8 28-8 40 0M92 300c-6 10-6 22 0 32" opacity="0.55" />
        </motion.g>

        <motion.g stroke="url(#loginArtStroke)" strokeWidth="2" fill="none" animate={reduce ? undefined : float(1.2, 11)}>
          <path d="M320 340l-36 20M284 360l36 20" />
          <circle cx="302" cy="350" r="6" />
        </motion.g>

        <motion.g stroke="url(#loginArtStroke)" strokeWidth="2" fill="none" animate={reduce ? undefined : float(0.8, 10)}>
          <path d="M96 380l28-48 28 48M124 352v56" />
        </motion.g>

        <motion.circle
          cx="118"
          cy="200"
          r="26"
          stroke="url(#loginArtStroke)"
          strokeWidth="2"
          fill="rgba(255,255,255,0.08)"
          initial={false}
          animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M108 200l8 8 16-16"
          stroke="url(#loginArtStroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={false}
          animate={reduce ? undefined : { pathLength: [0, 1, 1], opacity: [0.5, 1, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
