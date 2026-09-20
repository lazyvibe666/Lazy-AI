import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useSettingsStore } from './store/settingsStore';

interface LandingPageProps {
  onEnter: () => void;
  activeModal: "about" | "privacy" | null;
  setActiveModal: (modal: "about" | "privacy" | null) => void;
}

type LandingState = "idle" | "loading" | "transitioning";

export function LandingPage({ onEnter, activeModal, setActiveModal }: LandingPageProps) {
  const selectedModel = useSettingsStore((state) => state.selectedModel);
  const [landingState, setLandingState] = useState<LandingState>("loading");
  const [progress, setProgress] = useState(0);
  const [displayNumber, setDisplayNumber] = useState(0);

  const springProgress = useSpring(0, { stiffness: 40, damping: 20, mass: 1 });
  const barWidth = useTransform(springProgress, (val) => `${val}%`);

  useEffect(() => {
    springProgress.set(progress);
  }, [progress, springProgress]);

  useEffect(() => {
    const unsubscribe = springProgress.on("change", (latest) => {
      setDisplayNumber(Math.floor(latest));
    });
    return () => unsubscribe();
  }, [springProgress]);

  const playLiquidClick = () => {
    const audio = new Audio('/water-drop1.mp3');
    audio.volume = 0.6;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const handleInitialize = () => {
    playLiquidClick();
    setProgress(1); // Start exactly at 1%
    setLandingState("loading");
  };

  useEffect(() => {
    if (landingState === "loading") {
      let isChecking = true;
      let checkInterval: NodeJS.Timeout;
      let modelLoaded = false;

      // Realistic slow progress up to 99%
      const fakeProgressInterval = setInterval(() => {
        setProgress(p => {
          if (p >= 99) {
            clearInterval(fakeProgressInterval);
            return 99;
          }
          // Very slow, realistic chunks (1% to 3%)
          return Math.min(99, p + Math.floor(Math.random() * 3) + 1);
        });
      }, 400);

      // 1. Start fetching greeting in background
      fetch("http://127.0.0.1:8000/v1/greeting")
        .then(res => res.json())
        .then(data => {
          if (data && data.greeting) {
            window.localStorage.setItem('lazy_greeting', data.greeting);
          }
        })
        .catch(() => {
          window.localStorage.setItem('lazy_greeting', 'SYSTEM ONLINE. READY FOR INPUT.');
        });

      // 2. Proactively load GEMMA 4
      fetch("http://127.0.0.1:8000/v1/model/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "GEMMA 4" })
      }).catch(console.error);

      // 3. Poll for model status
      const checkHealth = async () => {
        if (!isChecking) return;
        try {
          const statusRes = await fetch("http://127.0.0.1:8000/v1/model/status");
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === "loaded") {
              isChecking = false;
              clearInterval(checkInterval);
              clearInterval(fakeProgressInterval);
              setProgress(100);
              
              // Wait longer to allow spring animation to reach 100
              setTimeout(() => {
                setLandingState("transitioning");
                onEnter();
              }, 1200);
            }
          }
        } catch (e) {
          // Keep polling
        }
      };

      // Poll every 1 second
      checkInterval = setInterval(checkHealth, 1000);
      checkHealth(); // Immediate first check

      return () => {
        isChecking = false;
        clearInterval(fakeProgressInterval);
        clearInterval(checkInterval);
      };
    }
  }, [landingState, onEnter, selectedModel]);

  // Framer Motion properties for the camera flip
  const containerVariants = {
    idle: { opacity: 1, scale: 1, filter: "blur(0px)", rotateX: 0, rotateY: 0, z: 0 },
    loading: { opacity: 1, scale: 1, filter: "blur(0px)", rotateX: 0, rotateY: 0, z: 0 },
    transitioning: { 
      opacity: 1, 
      scale: 1,
      filter: "blur(0px)",
      rotateX: 0,
      rotateY: 0,
      z: 0
    }
  };

  return (
    <>
      <motion.div
        key="landing-page"
        variants={containerVariants}
        initial="idle"
        animate={landingState}
        exit={{ 
          opacity: 0, 
          scale: 1.15, 
          filter: "blur(10px) brightness(1.2)", 
          transition: { duration: 1.5, ease: "easeInOut" } 
        }} // Softer cinematic exit
        className="fixed inset-0 w-full h-full z-20 flex flex-col items-center justify-center overflow-hidden bg-black cursor-none"
        style={{ isolation: 'isolate', perspective: '1000px' }}
      >
        
        {/* Background Image Wrapper */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center brightness-[0.75] contrast-[1.25] saturate-[1.3] z-0"
          style={{ 
            backgroundImage: "url('/1stpage.jpeg')",
            transform: 'translateZ(0)' // Hardware acceleration lock
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
          
          <AnimatePresence mode="wait">
            {(landingState === "loading" || landingState === "transitioning") && (
              <motion.div
                key="loading-container"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center justify-center gap-[40px] sm:gap-[60px] w-full max-w-[600px] px-8 z-20 relative"
              >
                {/* PERFECTLY CENTERED BRANDING (Absolute Harmony) */}
                <div className="flex flex-row items-center justify-center pointer-events-none translate-x-[-2%]">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-[60px] sm:w-[85px] md:w-[95px] h-auto object-contain shrink-0 z-10" 
                  />
                  <div className="flex items-center justify-center h-16 sm:h-24 md:h-28 ml-0 sm:ml-2 overflow-visible">
                    <img 
                      src="/name.png" 
                      alt="LAZY AI" 
                      className="h-[140%] sm:h-[160%] md:h-[180%] w-auto object-contain" 
                    />
                  </div>
                </div>

                {/* SLEEK PROFESSIONAL LOADING INDICATOR */}
                <div className="flex flex-col items-center gap-4 w-full max-w-[300px] mt-8">
                  {/* Thin elegant progress bar */}
                  <div className="w-full h-[1px] bg-white/10 relative overflow-hidden rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-red-600 rounded-full"
                      style={{
                        width: barWidth,
                        boxShadow: '0 0 10px rgba(255,0,0,0.8), 0 0 20px rgba(255,0,0,0.4)'
                      }}
                    />
                    {/* Sweeping light effect across the bar */}
                    <motion.div
                      className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg]"
                      animate={{ left: ["-100%", "200%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  {/* Clean, tiny typography for status */}
                  <div className="flex justify-between w-full text-white/50 font-sans text-[9px] sm:text-[10px] tracking-widest uppercase">
                    <span className="font-semibold text-white/70">
                      {displayNumber < 30 ? "Initializing system components..." : 
                       displayNumber < 80 ? "Loading neural weights into VRAM..." : 
                       "Booting local LLM engine..."}
                    </span>
                    <span className="text-red-500/80 font-mono">{displayNumber}%</span>
                  </div>
                </div>

                {/* Tiny copyright/version text */}
                <div className="absolute -bottom-24 text-[8px] sm:text-[9px] text-white/20 tracking-widest uppercase font-sans">
                  Version 1.0.0.64 • Lazy AI Local Runtime
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>


        {/* MODALS */}
        <AnimatePresence>
          {activeModal !== null && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} 
              className="fixed inset-0 z-50 flex items-center justify-end py-4 pr-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setActiveModal(null)} 
            >
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }} 
                onClick={(e) => e.stopPropagation()} 
                className="relative flex flex-col w-[420px] h-[calc(100vh-2rem)] rounded-l-3xl border-l border-t border-red-500/40 shadow-[-30px_0_60px_rgba(0,0,0,0.8)]"
              >
                <div 
                  className="absolute inset-0 z-0 rounded-l-3xl pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30, 0, 0, 0.45) 0%, rgba(5, 0, 0, 0.7) 100%)',
                    backdropFilter: 'blur(24px) saturate(160%) contrast(110%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(160%) contrast(110%)',
                    boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.08), inset -2px -2px 4px rgba(255,0,0,0.1)'
                  }}
                />

                <motion.div 
                  initial={{ x: 30, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }} 
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
                  className="relative z-10 p-10 flex flex-col h-full gap-6 overflow-y-auto custom-hover-scroll"
                >
                  
                  {activeModal === "privacy" && (
                    <>
                      <div className="border-b border-red-500/20 pb-4 mb-2 shrink-0">
                        <h2 className="text-white font-black tracking-[0.2em] text-xl uppercase drop-shadow-[0_2px_10px_rgba(255,0,0,0.8)]">
                          PRIVACY POLICY & CONSENT
                        </h2>
                      </div>
                      <div className="flex-grow flex flex-col gap-6 pr-2">
                        <div className="flex flex-col gap-2">
                          <p className="text-gray-400 font-sans normal-case tracking-wide leading-relaxed text-xs text-left italic">
                            Effective Date: [04-06-2026]
                          </p>
                          <p className="text-gray-300 font-sans normal-case tracking-wide leading-relaxed text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,1)] text-left">
                            <strong className="text-white font-bold tracking-wider uppercase text-xs">1. Introduction</strong><br/>
                            Welcome to LAZY AI. We are committed to protecting the privacy, security, and integrity of our users and Services. This Privacy Policy explains how we collect, use, process, store, monitor, retain, disclose, and protect information when you access, browse, register for, log into, enter, interact with, or otherwise use our website, application, software, platform, chat services, and related products or services (collectively, the "Services"). Please read this Privacy Policy carefully before using the Services.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-gray-300 font-sans normal-case tracking-wide leading-relaxed text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,1)] text-left">
                            <strong className="text-white font-bold tracking-wider uppercase text-xs">2. Information We Collect</strong><br/>
                            To operate, maintain, improve, secure, and provide our Services, we may collect various categories of information, including but not limited to:
                          </p>
                          <ul className="list-disc pl-5 text-gray-400 font-sans text-xs leading-relaxed flex flex-col gap-1">
                            <li><strong className="text-gray-300">Personal Information:</strong> Full name, Username, Email address, Phone number, Account credentials, Billing information, Payment-related information, Mailing address.</li>
                            <li><strong className="text-gray-300">Technical Information:</strong> IP address, Device identifiers, Browser information, Operating system information, Device type, Internet service provider information, Network connection information.</li>
                            <li><strong className="text-gray-300">Usage Information:</strong> Pages visited, Features used, Chat interactions, Login and logout times, User preferences, Search history within the platform, Clickstream information, Session information.</li>
                          </ul>
                        </div>
                      </div>
                    </>
                  )}

                  {activeModal === "about" && (
                    <>
                      <div className="border-b border-red-500/20 pb-4 mb-2 shrink-0">
                        <h2 className="text-white font-black tracking-[0.2em] text-xl uppercase drop-shadow-[0_2px_10px_rgba(255,0,0,0.8)]">
                          ABOUT US
                        </h2>
                      </div>
                      <div className="flex-grow flex flex-col gap-6 pr-2 text-left">
                        <p className="text-gray-300 font-sans normal-case tracking-wide leading-relaxed text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,1)] text-left">
                          LAZY AI represents the bleeding edge of dark cosmic intelligence design. Forged in the abyss and engineered for supreme aesthetic superiority, we deliver an unparalleled chat experience.
                        </p>
                        <p className="text-gray-300 font-sans normal-case tracking-wide leading-relaxed text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,1)] text-left">
                          Our mission is to obliterate the boundaries between standard interfaces and high-fidelity 3D web experiences.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="mt-6 shrink-0 border-t border-red-500/20 pt-6">
                    <button 
                      onClick={() => setActiveModal(null)}
                      className="py-5 w-full border border-red-500/40 rounded-xl text-white font-bold tracking-[0.2em] text-sm uppercase hover:bg-red-900/60 hover:border-red-400 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.1)]"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    >
                      CLOSE
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </>
  );
}

function FlameEffects({ progress, state }: { progress: number, state: LandingState }) {
  const isLoading = state === "loading" || state === "transitioning";
  const intensity = progress / 100;
  
  return (
    <div className="absolute right-[-10%] sm:right-[0%] md:right-[5%] lg:right-[10%] top-1/2 -translate-y-1/2 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] md:w-[450px] md:h-[450px] pointer-events-none z-10 flex items-center justify-center">
      
      {/* Intense Core Heat */}
      <motion.div 
        className="absolute inset-0 rounded-full mix-blend-screen"
        animate={{
          background: `radial-gradient(circle, rgba(255,50,0,${isLoading ? 0.4 + (intensity * 0.4) : 0.1}) 0%, rgba(200,10,0,${isLoading ? 0.2 + (intensity * 0.2) : 0}) 40%, transparent 70%)`,
          scale: isLoading ? 1 + (intensity * 0.2) : 1,
          filter: `blur(${isLoading ? 10 + intensity * 20 : 25}px)`
        }}
        transition={{ duration: 0.1 }}
      />
      
      {/* Animated Fire SVG Filter & Shapes */}
      <svg className="w-full h-full relative z-10 mix-blend-screen" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="fireBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 0.3 0 0 0  0 0 0 0 0  0 0 0 18 -7" result="glow" />
            <feBlend in="SourceGraphic" in2="glow" mode="screen" />
          </filter>
        </defs>

        <motion.g filter="url(#fireBlur)" style={{ transformOrigin: "center" }} animate={{ scaleY: isLoading ? [1, 1.2, 0.9, 1.1] : [1, 1.05, 0.95, 1], scaleX: isLoading ? [1, 0.95, 1.05, 1] : [1, 1.02, 0.98, 1] }} transition={{ duration: isLoading ? 0.4 : 2, repeat: Infinity, ease: "easeInOut" }}>
          
          {/* Main Flame Core */}
          <motion.path 
            d="M 100 160 C 130 160, 150 120, 120 80 C 110 65, 105 40, 100 30 C 95 40, 90 65, 80 80 C 50 120, 70 160, 100 160 Z"
            fill="rgba(255,100,0,0.8)"
            animate={{ 
              d: isLoading 
                ? [
                    "M 100 160 C 140 160, 160 100, 120 70 C 110 60, 105 30, 100 10 C 95 30, 90 60, 80 70 C 40 100, 60 160, 100 160 Z",
                    "M 100 160 C 120 160, 140 110, 110 90 C 105 80, 100 40, 90 20 C 80 40, 70 80, 90 90 C 60 110, 80 160, 100 160 Z",
                    "M 100 160 C 140 160, 160 100, 120 70 C 110 60, 105 30, 100 10 C 95 30, 90 60, 80 70 C 40 100, 60 160, 100 160 Z"
                  ]
                : [
                    "M 100 160 C 130 160, 150 120, 120 80 C 110 65, 105 40, 100 30 C 95 40, 90 65, 80 80 C 50 120, 70 160, 100 160 Z",
                    "M 100 160 C 125 160, 145 115, 115 85 C 105 70, 102 45, 100 35 C 98 45, 95 70, 85 85 C 55 115, 75 160, 100 160 Z",
                    "M 100 160 C 130 160, 150 120, 120 80 C 110 65, 105 40, 100 30 C 95 40, 90 65, 80 80 C 50 120, 70 160, 100 160 Z"
                  ]
            }}
            transition={{ duration: isLoading ? 0.3 : 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Inner Flame Brightness */}
          <motion.path 
            d="M 100 150 C 115 150, 125 125, 110 100 C 105 90, 102 75, 100 65 C 98 75, 95 90, 90 100 C 75 125, 85 150, 100 150 Z"
            fill="rgba(255,200,50,0.9)"
            animate={{ 
              d: isLoading
                ? [
                    "M 100 150 C 120 150, 135 120, 115 90 C 108 80, 104 60, 100 45 C 96 60, 92 80, 85 90 C 65 120, 80 150, 100 150 Z",
                    "M 100 150 C 110 150, 120 125, 105 95 C 102 85, 100 70, 95 55 C 90 70, 85 85, 95 95 C 80 125, 90 150, 100 150 Z",
                    "M 100 150 C 120 150, 135 120, 115 90 C 108 80, 104 60, 100 45 C 96 60, 92 80, 85 90 C 65 120, 80 150, 100 150 Z"
                  ]
                : [
                    "M 100 150 C 115 150, 125 125, 110 100 C 105 90, 102 75, 100 65 C 98 75, 95 90, 90 100 C 75 125, 85 150, 100 150 Z",
                    "M 100 150 C 110 150, 120 120, 105 105 C 102 95, 100 80, 100 70 C 100 80, 98 95, 95 105 C 80 120, 90 150, 100 150 Z",
                    "M 100 150 C 115 150, 125 125, 110 100 C 105 90, 102 75, 100 65 C 98 75, 95 90, 90 100 C 75 125, 85 150, 100 150 Z"
                  ]
            }}
            transition={{ duration: isLoading ? 0.25 : 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          />

          {/* Core White Hot Base */}
          <circle cx="100" cy="140" r="15" fill="#ffffff" />
          
        </motion.g>
        
        {/* Ember Particles */}
        <AnimatePresence>
          {isLoading && Array.from({ length: 15 }).map((_, i) => (
            <motion.circle
              key={i}
              cx={100 + (Math.random() * 60 - 30)}
              cy={140}
              r={Math.random() * 2.5 + 1}
              fill="rgba(255,150,50,0.8)"
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ 
                y: -100 - (Math.random() * 50), 
                x: (Math.random() * 40 - 20),
                opacity: 0, 
                scale: 0 
              }}
              transition={{ 
                duration: 0.5 + Math.random() * 0.5, 
                repeat: Infinity, 
                delay: Math.random(), 
                ease: "easeOut" 
              }}
            />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}
