import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '../store/settingsStore';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState("");

  const { temperature, top_p, max_tokens, system_prompt, setSettings, activeGlobalMenu, setActiveGlobalMenu, isSidebarOpen, setIsSidebarOpen } = useSettingsStore();
  
  const activeModal = ["search", "activity", "settings"].includes(activeGlobalMenu) ? activeGlobalMenu : "none";
  const setActiveModal = (val: string) => setActiveGlobalMenu(val);

  const handleModalToggle = (modalName: string) => {
    setActiveModal(activeModal === modalName ? "none" : modalName);
    if (window.innerWidth < 640 && activeModal !== modalName) {
      setIsSidebarOpen(false);
    }
  };
  
  // We'll map the UI's local state references to the global store with fallbacks for existing local storage
  const llmSettings = {
    temperature: temperature ?? 0.7,
    topP: top_p ?? 0.9,
    maxTokens: max_tokens ?? 2048,
    systemPrompt: system_prompt ?? ""
  };

  const setLlmSettings = (update: any) => {
    if (typeof update === 'function') {
      const nextState = update(llmSettings);
      setSettings({
        temperature: nextState.temperature,
        top_p: nextState.topP,
        max_tokens: nextState.maxTokens,
        system_prompt: nextState.systemPrompt
      });
    } else {
      setSettings({
        temperature: update.temperature ?? temperature,
        top_p: update.topP ?? top_p,
        max_tokens: update.maxTokens ?? max_tokens,
        system_prompt: update.systemPrompt ?? system_prompt
      });
    }
  };

  const { chatSessions, activeChatId, setActiveChatId, deleteSession, clearAllData, fetchGreeting } = useChatStore(
    useShallow((state) => ({
      chatSessions: state.chatSessions,
      activeChatId: state.activeChatId,
      setActiveChatId: state.setActiveChatId,
      deleteSession: state.deleteSession,
      clearAllData: state.clearAllData,
      fetchGreeting: state.fetchGreeting
    }))
  );

  const baseGlass = {
    background: 'rgba(255, 255, 255, 0.02)',
    borderTop: '1px solid rgba(255, 255, 255, 0.4)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
    borderRight: '1px solid rgba(0, 0, 0, 0.3)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.6)',
    boxShadow: 'inset 2px 2px 5px rgba(255, 255, 255, 0.3), inset -3px -3px 7px rgba(0, 0, 0, 0.5)',
    borderRadius: '1.5rem'
  };

  const redGlass = {
    background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.1) 0%, rgba(255,255,255,0.02) 100%)',
    borderTop: '1px solid rgba(255, 150, 150, 0.6)',
    borderLeft: '1px solid rgba(255, 100, 100, 0.4)',
    borderRight: '1px solid rgba(100, 0, 0, 0.4)',
    borderBottom: '1px solid rgba(100, 0, 0, 0.7)',
    boxShadow: 'inset 2px 2px 5px rgba(255, 150, 150, 0.5), inset -3px -3px 7px rgba(100, 0, 0, 0.6)',
    borderRadius: '1.5rem'
  };

  const createNewChat = () => {
    setActiveChatId(null);
  };

  const renderHighlightedName = (name: string, query: string) => {
    if (!query.trim()) return <span>{name}</span>;
    const parts = name.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="text-red-400 font-black bg-red-900/40 px-1 rounded shadow-[0_0_8px_rgba(255,0,0,0.5)]">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <>
      {/* Mobile Backdrop for Squeezed Scenarios */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md sm:hidden pointer-events-auto"
          />
        )}
      </AnimatePresence>
      <motion.aside 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`fixed left-2 sm:left-6 top-2 sm:top-6 bottom-2 sm:bottom-6 flex flex-col p-2 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] drop-shadow-[0_30px_60px_rgba(0,0,0,0.95)] z-[80] cursor-none overflow-hidden transition-all duration-300 ease-out ${isSidebarOpen ? 'w-[240px] sm:w-[260px]' : 'w-[60px] sm:w-[104px]'}`}
      >
        <div 
          className="absolute inset-0 pointer-events-none rounded-[1.5rem] sm:rounded-[2.5rem]"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)',
            backgroundColor: 'rgba(5, 5, 5, 0.15)',
            backdropFilter: 'blur(50px) saturate(200%)',
            WebkitBackdropFilter: 'blur(50px) saturate(200%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.25)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
            borderRight: '1px solid rgba(0, 0, 0, 0.5)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.8)',
            boxShadow: 'inset 1px 1px 3px rgba(255, 255, 255, 0.4), inset -2px -2px 6px rgba(0, 0, 0, 0.8), 0 40px 80px rgba(0,0,0,0.95)'
          }}
        />
        <div className="relative z-10 flex flex-col h-full gap-2 sm:gap-4">

          {/* Header */}
          <div 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-12 sm:h-16 w-full flex items-center justify-between shrink-0 cursor-pointer group relative z-10 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <div className="relative group/logo w-10 h-10 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center pl-[2px] sm:pl-0">
                <motion.div
                  className="absolute inset-0 w-full h-full"
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="absolute inset-0 h-10 w-10 sm:h-14 sm:w-14 object-contain"
                    animate={{ 
                      filter: !isSidebarOpen 
                        ? ["drop-shadow(0px 0px 5px rgba(255,0,0,0.4))", "drop-shadow(0px 0px 25px rgba(255,0,0,1))", "drop-shadow(0px 0px 5px rgba(255,0,0,0.4))"] 
                        : "drop-shadow(0px 0px 10px rgba(255,0,0,0.8))"
                    }}
                    transition={{
                      duration: !isSidebarOpen ? 2 : 0.3,
                      repeat: !isSidebarOpen ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              </div>
              
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.img 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 120 }}
                    exit={{ opacity: 0, width: 0 }}
                    src="/name.png" 
                    alt="LAZY AI" 
                    className="h-6 sm:h-10 object-contain object-left origin-left drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] sm:-ml-1"
                    style={{ transform: 'scale(2.5)' }}
                  />
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-red-500/30 border border-white/10 hover:border-red-500 transition-colors mr-2 z-20 cursor-none"
                  title="Close Sidebar"
                >
                  <svg className="w-4 h-4 text-gray-300 hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 w-full flex flex-col relative z-10 overflow-hidden pb-2 sm:pb-4">
            
            <div className="flex flex-col gap-2 pt-2 sm:pt-4 shrink-0">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={createNewChat}
                className="w-full h-11 sm:h-14 flex items-center cursor-none transition-colors mb-2 select-none group"
                style={baseGlass}
              >
                <div className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative z-10 flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-white font-black tracking-[0.15em] text-xs sm:text-sm uppercase transition-all pl-2">NEW CHAT</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => handleModalToggle("search")}
                className="w-full h-11 sm:h-14 flex items-center cursor-none transition-colors mb-2 select-none group"
                style={activeModal === "search" ? redGlass : baseGlass}
              >
                <div className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors ${activeModal === 'search' ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative z-10 flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-white font-black tracking-[0.15em] text-xs sm:text-sm uppercase transition-all pl-2">SEARCH</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 mt-4 sm:mt-8 mb-2 select-none">
                  <div className="text-white font-black tracking-[0.2em] text-xs sm:text-sm uppercase drop-shadow-[0_2px_4px_rgba(255,0,0,0.5)]">HISTORY</div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex-1 w-full overflow-y-auto mt-2 flex flex-col gap-2 no-scrollbar">
              {isSidebarOpen && chatSessions.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setActiveChatId(chat.id); setActiveModal("none"); }}
                  className="w-full p-2 sm:p-3 cursor-pointer transition-all flex flex-col gap-1 overflow-hidden shrink-0 select-none"
                  style={{ ...(activeChatId === chat.id ? redGlass : baseGlass), borderRadius: '1rem', minHeight: '3rem', marginBottom: '0.5rem' }}
                >
                  <span className="text-white font-bold text-xs sm:text-sm truncate">{chat.title}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:pt-4 border-t border-white/10 shrink-0">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => handleModalToggle("activity")}
                className="w-full h-11 sm:h-14 flex items-center cursor-none transition-colors mb-2 mt-2 select-none group"
                style={activeModal === "activity" ? redGlass : baseGlass}
              >
                <div className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors ${activeModal === 'activity' ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative z-10 flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-white font-black tracking-[0.15em] text-xs sm:text-sm uppercase transition-all pl-2">ACTIVITY</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => handleModalToggle("settings")}
                className="w-full h-11 sm:h-14 flex items-center cursor-none transition-colors select-none group"
                style={activeModal === "settings" ? redGlass : baseGlass}
              >
                <div className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors ${activeModal === 'settings' ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative z-10 flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-white font-black tracking-[0.15em] text-sm uppercase transition-all pl-2">SETTINGS</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* GLOBAL MODAL SYSTEM: Indestructible Glass Architecture */}
      <AnimatePresence>
      {activeModal !== "none" && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pb-[100px] sm:pb-[140px] pl-[75px] sm:pl-[140px]"
          onClick={() => setActiveModal("none")} 
        >
          {/* Background Dimmer: NO BLUR, NO DIMMING */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            className="absolute inset-0 bg-transparent pointer-events-none" 
          />
          
          {/* Modal Body */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()} 
            className="relative flex flex-col w-full max-w-[480px] max-h-full p-4 sm:p-10 rounded-3xl sm:rounded-[3rem] cursor-none z-[60]"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(10px) saturate(120%)',
              WebkitBackdropFilter: 'blur(10px) saturate(120%)',
              borderTop: '1px solid rgba(255, 255, 255, 0.6)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.4)',
              borderRight: '1px solid rgba(0, 0, 0, 0.4)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.7)',
              boxShadow: 'inset 2px 2px 6px rgba(255, 255, 255, 0.4), inset -3px -3px 10px rgba(0, 0, 0, 0.6), 0 30px 60px rgba(0,0,0,0.6)'
            }}
          >
            
            <div className="relative z-10 flex flex-col h-full w-full flex-1 min-h-0 overflow-hidden">
                
                {activeModal === "search" && (
                  <>
                    <h2 className="text-white font-black tracking-[0.1em] sm:tracking-[0.2em] text-base sm:text-xl uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-center border-b border-red-500/20 pb-4">
                      SEARCH YOUR CHAT
                    </h2>
                    <input 
                      type="text" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      placeholder="Search chats by name..." 
                      autoFocus 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 text-white tracking-[0.1em] text-xs sm:text-base focus:outline-none focus:border-red-500/80 focus:shadow-[0_0_20px_rgba(255,0,0,0.4)] placeholder-gray-500 transition-all mb-4 cursor-none"
                    />
                    <div className="w-full flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-2">
                      {chatSessions.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).map(chat => (
                        <div 
                          key={chat.id} 
                          onClick={() => { setActiveChatId(chat.id); setActiveModal("none"); }}
                          className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-red-500/70 hover:bg-black/40 cursor-pointer text-white tracking-widest flex justify-between items-center transition-all"
                        >
                          {renderHighlightedName(chat.title, searchQuery)}
                        </div>
                      ))}
                      {chatSessions.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <span className="text-gray-400 text-center mt-4 tracking-[0.2em] uppercase drop-shadow-md">No chats found.</span>
                      )}
                    </div>
                  </>
                )}

                {activeModal === "activity" && (
                  <div className="flex flex-col h-full overflow-hidden pb-2 sm:pb-4">
                    <div className="flex items-center justify-between border-b border-red-500/20 pb-3 sm:pb-4 shrink-0">
                      <h2 className="text-white font-black tracking-[0.1em] sm:tracking-[0.2em] text-base sm:text-xl uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">ACTIVITY HISTORY</h2>
                    </div>
                    
                    <div className="w-full mt-3 sm:mt-4 mb-3 sm:mb-4 shrink-0">
                      <button 
                        onClick={async () => {
                          clearAllData();
                          await fetchGreeting();
                          setActiveModal("none");
                          setIsSidebarOpen(false);
                        }} 
                        className="w-full p-3 sm:p-4 rounded-xl border border-red-500/30 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black tracking-[0.1em] sm:tracking-[0.2em] text-xs sm:text-base uppercase transition-all flex items-center justify-center gap-2 sm:gap-3 drop-shadow-[0_0_10px_rgba(255,0,0,0.4)] cursor-none group"
                      >
                        <svg className="w-4 h-4 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        CLEAR HISTORY
                      </button>
                    </div>

                    <div className="w-full flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-3 pr-2">
                      {chatSessions.map(chat => (
                        <div key={chat.id} className="p-4 bg-white/5 rounded-xl border-l-2 border-red-500 flex flex-col gap-1 transition-colors hover:bg-black/40 relative group/session shrink-0">
                          <button onClick={() => deleteSession(chat.id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors z-20 cursor-none opacity-0 group-hover/session:opacity-100">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                          <span className="text-gray-400 text-xs font-bold tracking-[0.2em] uppercase">Chat Created</span>
                          <span className="text-white tracking-widest text-lg pr-8">{chat.title}</span>
                          <span className="text-white font-bold text-sm mt-1 tracking-widest">{new Date(chat.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                      {chatSessions.length === 0 && (
                        <div className="py-8 flex items-center justify-center">
                          <p className="text-gray-400 font-sans tracking-widest text-xs uppercase drop-shadow-md">
                            NO RECENT ACTIVITY.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeModal === "settings" && (
                  <>
                    <h2 className="text-white font-black tracking-[0.1em] sm:tracking-[0.2em] text-base sm:text-xl uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-center border-b border-red-500/20 pb-3 sm:pb-4 shrink-0">
                      AI MODEL TUNING
                    </h2>
                    <div className="flex flex-col gap-4 mt-3 sm:mt-4 px-1 sm:px-2 overflow-y-auto no-scrollbar flex-1 pr-1 sm:pr-2 pb-4">
                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center">
                          <label className="text-white text-xs sm:text-sm font-bold tracking-[0.1em] sm:tracking-[0.2em] uppercase drop-shadow-md">Temperature</label>
                          <span className="text-red-400 font-mono font-bold tracking-widest text-xs sm:text-base">{llmSettings.temperature.toFixed(2)}</span>
                        </div>
                        <input 
                          type="range" min="0" max="2" step="0.01" 
                          value={llmSettings.temperature}
                          onChange={(e) => setLlmSettings({...llmSettings, temperature: parseFloat(e.target.value)})}
                          className="w-full h-2 bg-black rounded-lg appearance-none cursor-none accent-red-500 hover:shadow-[0_0_15px_rgba(255,0,0,0.5)] transition-shadow" 
                        />
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest">Controls randomness.</p>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center">
                          <label className="text-white text-xs sm:text-sm font-bold tracking-[0.1em] sm:tracking-[0.2em] uppercase drop-shadow-md">Top P</label>
                          <span className="text-red-400 font-mono font-bold tracking-widest text-xs sm:text-base">{llmSettings.topP.toFixed(2)}</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.01" 
                          value={llmSettings.topP}
                          onChange={(e) => setLlmSettings({...llmSettings, topP: parseFloat(e.target.value)})}
                          className="w-full h-2 bg-black rounded-lg appearance-none cursor-none accent-red-500 hover:shadow-[0_0_15px_rgba(255,0,0,0.5)] transition-shadow" 
                        />
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest">Nucleus sampling threshold.</p>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center">
                          <label className="text-white text-xs sm:text-sm font-bold tracking-[0.1em] sm:tracking-[0.2em] uppercase drop-shadow-md">Max Tokens</label>
                          <span className="text-red-400 font-mono font-bold tracking-widest text-xs sm:text-base">{llmSettings.maxTokens}</span>
                        </div>
                        <input 
                          type="range" min="256" max="8192" step="256" 
                          value={llmSettings.maxTokens}
                          onChange={(e) => setLlmSettings({...llmSettings, maxTokens: parseInt(e.target.value)})}
                          className="w-full h-2 bg-black rounded-lg appearance-none cursor-none accent-red-500 hover:shadow-[0_0_15px_rgba(255,0,0,0.5)] transition-shadow" 
                        />
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest">Maximum response length.</p>
                      </div>

                      <div className="w-full h-px bg-red-500/20 my-1 shrink-0"></div>

                      <h3 className="text-white font-black tracking-[0.1em] sm:tracking-[0.2em] text-base sm:text-lg uppercase drop-shadow-md text-center shrink-0">
                        Ai Advanced Settings
                      </h3>
                      
                      <div className="flex flex-col gap-2 shrink-0">
                        <label className="text-white text-xs sm:text-sm font-bold tracking-[0.1em] sm:tracking-[0.2em] uppercase drop-shadow-md">System Prompt</label>
                        <textarea 
                          rows={3}
                          value={llmSettings.systemPrompt}
                          onChange={(e) => setLlmSettings({...llmSettings, systemPrompt: e.target.value})}
                          placeholder="You are a helpful AI..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2 sm:p-3 text-white text-[10px] sm:text-sm tracking-widest focus:outline-none focus:border-red-500/80 focus:shadow-[0_0_20px_rgba(255,0,0,0.4)] placeholder-gray-500 transition-all resize-none cursor-none"
                        />
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest">Change the core persona of the AI.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
}
