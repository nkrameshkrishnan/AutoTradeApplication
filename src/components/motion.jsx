import { forwardRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';

// One easing for everything: a soft exponential settle.
export const EASE = [0.22, 1, 0.36, 1];

// Feedback is separate from entrances: small, quick, no delay.
export const press = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: { duration: 0.25, ease: EASE },
};

function useIsPhone() {
  const q = '(max-width: 640px)';
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setPhone(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

/**
 * Entrance for one group (a heading with its copy, a card, a media block).
 * hero: plays on mount, 0.8s. Otherwise reveals once when 15% is in view, 1s after a 0.1s delay.
 * media: scales 0.98 → 1 without travel.
 */
export function Reveal({ as = 'div', hero = false, media = false, tall = false, delay = 0, className, children, ...rest }) {
  const phone = useIsPhone();
  const Comp = motion[as] ?? motion.div;
  const from = media ? { opacity: 0, scale: 0.98 } : { opacity: 0, y: phone ? 8 : 12 };
  const to = media ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 };
  const stagger = phone ? 0 : delay;
  const trigger = hero
    ? { animate: to, transition: { duration: 0.8, ease: EASE, delay: stagger } }
    : {
        whileInView: to,
        viewport: { once: true, amount: tall ? 0 : 0.15 },
        transition: { duration: 1, ease: EASE, delay: 0.1 + stagger },
      };
  return (
    <Comp initial={from} {...trigger} className={className} {...rest}>
      {children}
    </Comp>
  );
}

export const PressButton = forwardRef(function PressButton({ className, children, disabled, ...rest }, ref) {
  return (
    <motion.button ref={ref} className={className} disabled={disabled} {...(disabled ? {} : press)} {...rest}>
      {children}
    </motion.button>
  );
});
