import { motion } from 'framer-motion';

export const PureOccultEye = () => {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center mt-2">
      {/* Intense Glowing Aura */}
      <motion.div 
        className="absolute inset-0 bg-red-600/40 rounded-full blur-xl"
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(255,0,0,1)] overflow-visible relative z-10">
        <defs>
          <radialGradient id="wetSclera" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="80%" stopColor="#cc0000" />
            <stop offset="100%" stopColor="#660000" />
          </radialGradient>

          <radialGradient id="glowingIris" cx="50%" cy="50%" r="50%">
            <stop offset="10%" stopColor="#ff0000" />
            <stop offset="100%" stopColor="#330000" />
          </radialGradient>
        </defs>

        <motion.circle 
          cx="50" cy="50" r="46" 
          fill="none" stroke="#ff0000" strokeWidth="2" strokeDasharray="30 20 10 40"
          animate={{ rotate: 360, scale: [1, 1.05, 1] }}
          transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
          style={{ originX: "50px", originY: "50px" }}
        />

        <path d="M50 15 L90 85 L10 85 Z" fill="none" stroke="#ff0000" strokeWidth="6" />
        <path d="M25 55 Q50 35 75 55 Q50 75 25 55 Z" fill="url(#wetSclera)" stroke="#330000" strokeWidth="1" />
        <circle cx="50" cy="55" r="10" fill="url(#glowingIris)" />
        <circle cx="50" cy="55" r="4" fill="#000000" />
      </svg>
    </div>
  );
};
