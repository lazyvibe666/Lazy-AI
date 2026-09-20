import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';
import { useStreamStore } from '../store/streamStore';
import { ChatMessage } from './ChatMessage';

export function ChatFeed() {
  const activeChatId = useChatStore((state) => state.activeChatId);
  const chatDatabase = useChatStore((state) => state.chatDatabase) || {};
  const isThinking = useChatStore((state) => state.isThinking);
  const activeGlobalMenu = useSettingsStore((state) => state.activeGlobalMenu);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const streamState = useStreamStore();

  const [greeting, setGreeting] = useState(() => window.localStorage.getItem('lazy_greeting') || "Hello, User.");

  useEffect(() => {
    const handleGreetingUpdate = () => {
      setGreeting(window.localStorage.getItem('lazy_greeting') || "Hello, User.");
    };
    window.addEventListener('lazy_greeting_updated', handleGreetingUpdate);
    return () => window.removeEventListener('lazy_greeting_updated', handleGreetingUpdate);
  }, []);

  const dbMessages = activeChatId ? (chatDatabase[activeChatId] || []) : [];
  
  // Combine db messages with active streaming message
  const messages = [...dbMessages];
  if (streamState.isStreaming) {
    messages.push({
      role: 'ai',
      content: streamState.content,
      thoughtProcess: streamState.thought
    });
  }

  const activeChat = activeChatId ? { id: activeChatId, messages } : null;
  const isModalOpen = activeGlobalMenu !== "none";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamState.content, streamState.thought, isThinking]);

  if (!activeChat) {
    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 no-scrollbar cursor-none pointer-events-auto relative">
        <AnimatePresence>
          {!isModalOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 -mt-16 flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="text-xl sm:text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500 tracking-tight text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] px-4">
                {greeting}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 no-scrollbar cursor-none pointer-events-auto relative">
      <div className="w-full max-w-[1100px] mx-auto flex flex-col gap-10 pt-16 pb-40">
        {(messages || []).filter(m => !m.isHidden).map((msg, index, arr) => (
          <ChatMessage 
            key={index} 
            msg={msg} 
            isLatest={index === arr.length - 1} 
            isLatestUserMessage={index === arr.map(m => m.role).lastIndexOf('user')}
            isThinking={isThinking} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
