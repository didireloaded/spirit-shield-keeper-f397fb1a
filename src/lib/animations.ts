/**
 * Global Animation Variants Library
 * Reusable framer-motion presets for consistent UX
 */

import { Variants } from 'framer-motion';

// Page Transitions (enhanced easing)
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  },
  // keep legacy "animate" key for backward compat
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// Stagger container for lists
export const staggerContainer: Variants = {
  enter: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

// Stagger list item
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
};

// Smooth scale on tap for buttons
export const scaleOnTap = {
  whileTap: { scale: 0.95 },
  transition: { duration: 0.1 },
};

// Bounce animation for important elements
export const bounce: Variants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
};

// Slide up from bottom (modals, sheets)
export const slideUp: Variants = {
  initial: { y: '100%' },
  animate: {
    y: 0,
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.2 },
  },
};

// ── Legacy aliases (backward compatibility) ──

export const slideUpVariants = slideUp;

export const slideFromRightVariants: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const scaleVariants: Variants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const listContainerVariants = staggerContainer;

export const listItemVariants = staggerItem;

export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },
};

export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const bounceVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 0.6, repeat: Infinity, repeatDelay: 3 },
  },
};

export const rotateVariants: Variants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: 'linear' },
  },
};

export const shakeVariants: Variants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

export const successCheckVariants: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
};

export const cardHoverVariants: Variants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  tap: { scale: 0.98 },
};
