/**
 * Animation utility hooks for consistent UX
 */

import { useAnimation } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useInView, useSpring } from 'framer-motion';

/** Triggers animation based on isActive flag */
export function useAnimationSequence(isActive: boolean) {
  const controls = useAnimation();

  useEffect(() => {
    controls.start(isActive ? 'animate' : 'initial');
  }, [isActive, controls]);

  return controls;
}

/** Triggers animation when element scrolls into view */
export function useScrollAnimation(options: { once?: boolean; amount?: number } = {}) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: options.once ?? true,
    amount: options.amount ?? 0.3,
  });

  return { ref, isInView };
}

/** Animates a number from 0 to target value */
export function useCountAnimation(value: number) {
  const spring = useSpring(0, { duration: 1000, bounce: 0 });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return spring;
}
