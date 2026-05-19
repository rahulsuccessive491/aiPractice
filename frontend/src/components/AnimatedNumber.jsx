import { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'framer-motion';

export default function AnimatedNumber({ value, className = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const started = useRef(false);

  useEffect(() => {
    started.current = true;
    const ctrl = animate(count, value, { duration: 1.1, ease: [0.4, 0, 0.2, 1] });
    return ctrl.stop;
  }, [value, count]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
