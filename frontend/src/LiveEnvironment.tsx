import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { ChatFeed } from './components/ChatFeed';
import { PromptBar } from './components/PromptBar';
import { useChatStore } from './store/chatStore';
import { useLLMStream } from './hooks/useLLMStream';

export function LiveEnvironment() {
  const { activeChatId, setActiveChatId, createSession, addMessage, setIsThinking, fetchGreeting } = useChatStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Guarantee a fresh empty chat on every hard refresh and fetch a dynamic greeting
  useEffect(() => {
    setActiveChatId(null);
    const init = async () => {
      await fetchGreeting();
      setIsInitializing(false);
    };
    init();
  }, [setActiveChatId, fetchGreeting]);

  // Removed the blocking "SYNCHRONIZING GEMMA 4..." overlay as requested
  // to ensure a flawless cinematic transition from the landing page.

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-black text-white" style={{ isolation: 'isolate' }}>
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, filter: "blur(20px) brightness(0.5)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px) brightness(1)", transition: { duration: 1.2, ease: "easeOut" } }}
        className="absolute inset-0 w-full h-full flex pointer-events-auto"
      >
      {/* 1. THE LIVE VIDEO BACKGROUND (GPU Isolation Stripped) */}
      <motion.div
        key="live-universe"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { duration: 3, ease: [0.4, 0.0, 0.2, 1] }
        }}
        className="fixed inset-0 w-full h-full z-0 bg-black"
      >
        <video 
          src="/SPACE.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          preload="auto"
          className="w-full h-full object-cover brightness-[0.75] contrast-[1.25] saturate-[1.3]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-0"></div>
      </motion.div>

      {/* 2. THE SIDEBAR AND MAIN CONTENT */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }} // Delays entry until camera flip starts resolving
        className="fixed inset-0 w-full h-full z-10 flex"
      >
        <Sidebar />
        
        {/* Main Content Area */}
        <motion.main 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }} // Staggers behind Sidebar
          className="flex-1 h-full relative z-10 flex flex-col pointer-events-none pl-[75px] sm:pl-[140px]"
        >
          <ChatFeed />
          <PromptBar />
        </motion.main>
      </motion.div>

      </motion.div>

    </div>
  );
}


