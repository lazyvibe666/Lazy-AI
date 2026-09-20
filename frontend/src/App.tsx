import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { LandingPage } from './LandingPage';
import { LiveEnvironment } from './LiveEnvironment';

// 1. THE SLEEK GLOBAL CURSOR
export const GlobalCursor = () => {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // High-performance spring for zero-latency tracking (Dot)
  const cursorX = useSpring(mouseX, { damping: 25, stiffness: 700, mass: 0.5 });
  const cursorY = useSpring(mouseY, { damping: 25, stiffness: 700, mass: 0.5 });

  // Slower spring for the trailing ring
  const ringX = useSpring(mouseX, { damping: 30, stiffness: 200, mass: 0.8 });
  const ringY = useSpring(mouseY, { damping: 30, stiffness: 200, mass: 0.8 });

  const [isHover, setIsHover] = useState(false);

  useEffect(() => {
    const update = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      const target = e.target as HTMLElement;
      setIsHover(window.getComputedStyle(target).cursor === 'pointer' || target.closest('button') !== null || target.closest('.cursor-pointer') !== null || target.closest('a') !== null);
    };
    window.addEventListener('mousemove', update);
    return () => window.removeEventListener('mousemove', update);
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Trailing Ring */}
      <motion.div
        className="fixed top-0 left-0 z-[9998] pointer-events-none rounded-full border border-red-500/50 backdrop-blur-[2px] shadow-[0_0_15px_rgba(255,0,0,0.3)]"
        style={{ 
          x: ringX, 
          y: ringY,
          translateX: "-50%",
          translateY: "-50%"
        }}
        animate={{
          width: isHover ? 60 : 32,
          height: isHover ? 60 : 32,
          backgroundColor: isHover ? "rgba(255, 0, 0, 0.1)" : "rgba(0, 0, 0, 0)",
          borderWidth: isHover ? "2px" : "1px",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
      {/* Core Dot */}
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none rounded-full bg-red-600 shadow-[0_0_10px_rgba(255,0,0,0.8)]"
        style={{ 
          x: cursorX, 
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%"
        }}
        animate={{
          width: isHover ? 6 : 10,
          height: isHover ? 6 : 10,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      />
    </>
  );
};

function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [activeModal, setActiveModal] = useState<"about" | "privacy" | null>(null);

  return (
    <div className="cursor-none w-full h-full">
      <GlobalCursor />
      <AnimatePresence mode="popLayout">
        {!hasEntered ? (
          <LandingPage 
            key="landing" 
            onEnter={() => setHasEntered(true)} 
            activeModal={activeModal}
            setActiveModal={setActiveModal}
          />
        ) : (
          <LiveEnvironment key="live" />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
