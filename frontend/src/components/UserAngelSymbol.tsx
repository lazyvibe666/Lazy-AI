import { motion } from 'framer-motion';

export const UserAngelSymbol = () => {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {/* Gentle Heavenly Aura */}
      <motion.div 
        className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl"
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(150,220,255,1)] overflow-visible relative z-10">
        <defs>
          <linearGradient id="haloGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#bae6fd" />
            <stop offset="70%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id="wingBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>

          <linearGradient id="wingTip" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2"/>
          </linearGradient>
          
          <radialGradient id="coreLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Intricate Halo */}
        <motion.g
          animate={{ y: [-1, 2, -1], rotate: [-2, 2, -2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "50% 15%" }}
        >
          {/* Outer Halo */}
          <ellipse cx="50" cy="18" rx="22" ry="7" fill="none" stroke="url(#haloGlow)" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.8"/>
          {/* Inner Solid Halo */}
          <ellipse cx="50" cy="18" rx="18" ry="5" fill="none" stroke="url(#haloGlow)" strokeWidth="3"/>
          <ellipse cx="50" cy="18" rx="18" ry="5" fill="none" stroke="#ffffff" strokeWidth="1" filter="blur(1px)"/>
        </motion.g>

        {/* Left Wing - Multiple Layers */}
        <motion.g
          animate={{ rotate: [-3, 8, -3], scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "45% 45%" }}
        >
          {/* Back Feathers */}
          <path d="M 45 45 Q 15 20 0 50 Q 20 75 40 65 Z" fill="url(#wingTip)" />
          {/* Mid Feathers */}
          <path d="M 46 45 Q 20 25 8 55 Q 25 70 41 62 Z" fill="url(#wingBase)" opacity="0.9" />
          {/* Front Detail Feathers */}
          <path d="M 47 45 Q 25 30 15 55 Q 30 65 42 58 Z" fill="#ffffff" opacity="0.9" />
          {/* Feather strokes */}
          <path d="M 46 45 Q 25 35 12 55" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.6"/>
          <path d="M 46 47 Q 28 40 18 58" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.6"/>
        </motion.g>

        {/* Right Wing - Multiple Layers */}
        <motion.g
          animate={{ rotate: [3, -8, 3], scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "55% 45%" }}
        >
          {/* Back Feathers */}
          <path d="M 55 45 Q 85 20 100 50 Q 80 75 60 65 Z" fill="url(#wingTip)" />
          {/* Mid Feathers */}
          <path d="M 54 45 Q 80 25 92 55 Q 75 70 59 62 Z" fill="url(#wingBase)" opacity="0.9" />
          {/* Front Detail Feathers */}
          <path d="M 53 45 Q 75 30 85 55 Q 70 65 58 58 Z" fill="#ffffff" opacity="0.9" />
          {/* Feather strokes */}
          <path d="M 54 45 Q 75 35 88 55" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.6"/>
          <path d="M 54 47 Q 72 40 82 58" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.6"/>
        </motion.g>

        {/* Core Heart / Soul Light */}
        <motion.g
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Outer diffuse */}
          <circle cx="50" cy="52" r="16" fill="url(#coreLight)" />
          {/* Inner bright core */}
          <circle cx="50" cy="52" r="7" fill="#ffffff" filter="blur(1px)"/>
          {/* Diamond center */}
          <path d="M 50 47 L 53 52 L 50 57 L 47 52 Z" fill="#ffffff" />
        </motion.g>
        
        {/* Orbiting Light Motes */}
        <motion.circle 
          cx="30" cy="30" r="1.5" fill="#ffffff"
          animate={{ y: [-5, 5, -5], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
        <motion.circle 
          cx="70" cy="25" r="2" fill="#ffffff"
          animate={{ y: [-8, 8, -8], opacity: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.2 }}
        />
        <motion.circle 
          cx="50" cy="75" r="1.5" fill="#bae6fd"
          animate={{ y: [5, -5, 5], opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}
        />
      </svg>
    </div>
  );
};
