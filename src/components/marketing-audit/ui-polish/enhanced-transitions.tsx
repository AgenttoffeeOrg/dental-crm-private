/**
 * Enhanced UI Transitions
 * World-class animations and transitions for premium feel
 */

'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ReactNode } from 'react';

// Easing functions
const easing = {
  ease: [0.4, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  easeOut: [0.0, 0.0, 0.2, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],
  spring: { type: 'spring', damping: 25, stiffness: 300 },
};

// Page transition variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: easing.easeIn,
    },
  },
};

// Stagger children
const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: { opacity: 0 },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easing.easeOut },
  },
  exit: { opacity: 0, y: -20 },
};

// Scale variants
const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: easing.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: easing.easeIn },
  },
};

// Slide variants
const slideVariants: Variants = {
  initial: (direction: 'left' | 'right' | 'up' | 'down') => ({
    opacity: 0,
    x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
    y: direction === 'up' ? -100 : direction === 'down' ? 100 : 0,
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.4, ease: easing.easeOut },
  },
  exit: (direction: 'left' | 'right' | 'up' | 'down') => ({
    opacity: 0,
    x: direction === 'left' ? 100 : direction === 'right' ? -100 : 0,
    y: direction === 'up' ? 100 : direction === 'down' ? -100 : 0,
    transition: { duration: 0.3, ease: easing.easeIn },
  }),
};

// Components
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={containerVariants}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={itemVariants}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={scaleVariants}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  direction = 'up',
}: {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={slideVariants}
      custom={direction}
    >
      {children}
    </motion.div>
  );
}

// Hover effects
export function HoverScale({ children, scale = 1.05 }: { children: ReactNode; scale?: number }) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2, ease: easing.easeOut }}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({ children }: { children: ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2, ease: easing.easeOut }}
    >
      {children}
    </motion.div>
  );
}

// Loading spinner
export function LoadingSpinner({ size = 40 }: { size?: number }) {
  return (
    <motion.div
      style={{
        width: size,
        height: size,
        border: `${size / 10}px solid rgba(0, 0, 0, 0.1)`,
        borderTop: `${size / 10}px solid #3B82F6`,
        borderRadius: '50%',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// Pulse effect
export function Pulse({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: easing.easeInOut }}
    >
      {children}
    </motion.div>
  );
}

// Fade in/out
export function Fade({ children, show }: { children: ReactNode; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Smooth height transition
export function SmoothHeight({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      transition={{ duration: 0.3, ease: easing.easeInOut }}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
}

// Number counter animation
export function CountUp({ value, duration = 1 }: { value: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ display: 'inline-block' }}
        animate={{ display: 'inline-block' }}
      >
        {Math.round(value)}
      </motion.span>
    </motion.span>
  );
}

// Progress bar
export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: easing.easeOut }}
      />
    </div>
  );
}

// Ripple effect
export function Ripple() {
  return (
    <motion.span
      className="absolute inset-0 rounded-full bg-white"
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 2, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: easing.easeOut }}
    />
  );
}

// Export all variants for custom usage
export { pageVariants, containerVariants, itemVariants, scaleVariants, slideVariants, easing };

