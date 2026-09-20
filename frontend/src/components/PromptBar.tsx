import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { useLLMStream } from '../hooks/useLLMStream';
import { useSettingsStore } from '../store/settingsStore';

export function PromptBar() {
  const [inputText, setInputText] = useState("");
  const [isPromptHovered, setIsPromptHovered] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: 'image' | 'file'; url?: string; textContext: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith("image/");
      let previewUrl = "";

      if (isImg) {
        previewUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const formData = new FormData();
      formData.append("file", file);

      const backendUrl = `http://${window.location.hostname || "127.0.0.1"}:8000/v1/upload`;
      
      try {
        const res = await fetch(backendUrl, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.status === "success" && data.text) {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: isImg ? 'image' : 'file',
              url: previewUrl,
              textContext: data.text
            }
          ]);
        } else {
          alert(`Failed to analyze ${file.name}: ${data.error || "Unknown server error"}`);
        }
      } catch (err: any) {
        console.error("Upload error:", err);
        alert(`Could not upload ${file.name}. Check if the backend is running on port 8000.`);
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const { research, deep_search, dark_web, toggleResearch, toggleDeepSearch, toggleDarkWeb, setSettings, activeGlobalMenu, setActiveGlobalMenu, setNormalMode, selectedModel, setSelectedModel, isSidebarOpen } = useSettingsStore();
  
  const { activeChatId, setActiveChatId, createSession, addMessage, isThinking, setIsThinking, chatDatabase } = useChatStore();
  const db = chatDatabase || {};
  const messages = activeChatId ? (db[activeChatId] || []) : [];
  const isEmpty = messages.length === 0;
  const activeMenu = ["upload", "modes", "model"].includes(activeGlobalMenu) ? activeGlobalMenu : "none";
  const setActiveMenu = (val: string) => setActiveGlobalMenu(val);
  
  // We consider any global menu active (including Sidebar modals like 'activity', 'settings')
  const isAnyModalOpen = activeGlobalMenu !== "none";

  const availableModels = ["Gemma 4", "Qwen 3.8"];

  const { streamPrompt, cancelStream } = useLLMStream();

  const handleSendMessage = async () => {
    if (isUploading || isThinking) return;
    if (!inputText.trim() && attachedFiles.length === 0) return;

    const currentInput = inputText.trim();
    const currentAttachments = [...attachedFiles];

    setInputText("");
    setAttachedFiles([]);

    let currentId = activeChatId;
    if (!currentId) {
      currentId = crypto.randomUUID();
      setActiveChatId(currentId);
      createSession(currentId, currentInput || "Image Analysis");
    }

    addMessage(currentId, {
      role: 'user',
      content: currentInput || (currentAttachments.length > 0 ? "Analyze the attached image." : ""),
      attachments: currentAttachments
    });

    let payloadText = currentInput || "What is in this image?";
    if (currentAttachments.length > 0) {
      const attachmentsContext = currentAttachments
        .map((att) => `--- [ATTACHED FILE: ${att.name}] ---\\n${att.textContext}`)
        .join("\\n\\n");

      payloadText = `${attachmentsContext}\\n\\n[USER INSTRUCTION]:\\n${payloadText}\\n\\n(Important: The user has attached the image/file above. Analyze and describe it directly.)`;
    }

    setIsThinking(true);
    streamPrompt(payloadText, currentId, false);
  };

  const baseGlass = {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(12px) saturate(120%)',
    WebkitBackdropFilter: 'blur(12px) saturate(120%)',
    borderTop: '1px solid rgba(255, 255, 255, 0.4)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
    borderRight: '1px solid rgba(0, 0, 0, 0.3)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.6)',
    boxShadow: 'inset 2px 2px 5px rgba(255, 255, 255, 0.3), inset -3px -3px 7px rgba(0, 0, 0, 0.5), 0 5px 15px rgba(0,0,0,0.5)',
    borderRadius: '1.5rem'
  };

  const redGlass = {
    background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.1) 0%, rgba(255,255,255,0.02) 100%)',
    backdropFilter: 'blur(12px) saturate(150%)',
    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
    borderTop: '1px solid rgba(255, 150, 150, 0.6)',
    borderLeft: '1px solid rgba(255, 100, 100, 0.4)',
    borderRight: '1px solid rgba(100, 0, 0, 0.4)',
    borderBottom: '1px solid rgba(100, 0, 0, 0.7)',
    boxShadow: 'inset 2px 2px 5px rgba(255, 150, 150, 0.5), inset -3px -3px 7px rgba(100, 0, 0, 0.6), 0 5px 15px rgba(255,0,0,0.4)',
    borderRadius: '1.5rem'
  };

  return (
    <div className={`absolute ${isSidebarOpen ? 'left-[75px] sm:left-[280px]' : 'left-[75px] sm:left-[140px]'} right-0 flex justify-center px-1 sm:px-8 z-[70] pointer-events-auto transition-all duration-300 ease-in-out ${isEmpty && !isAnyModalOpen ? 'top-1/2 -translate-y-1/2 mt-12' : 'bottom-4 sm:bottom-6'}`}>
      <div className="w-full max-w-[1100px] flex flex-row items-center gap-1 sm:gap-4 lg:gap-6">
        {/* NEW Left-Side Buttons (Outside main prompt bar) */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Universal Attachment + Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-10 w-10 sm:h-14 sm:w-14 flex items-center justify-center shrink-0 transition-all cursor-none group rounded-full shadow-lg z-50"
            style={attachedFiles.length > 0 ? redGlass : baseGlass}
            title="Attach documents or images"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
          </motion.button>


        </div>

      <div 
        onMouseEnter={() => setIsPromptHovered(true)}
        onMouseLeave={() => setIsPromptHovered(false)}
        className="relative flex-1 w-full rounded-[2rem] sm:rounded-[3rem] flex items-center p-1 sm:p-4 transition-all flex-nowrap gap-1 sm:gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 40%, rgba(0, 0, 0, 0.6) 100%)',
          backgroundColor: 'rgba(10, 0, 0, 0.25)',
          backdropFilter: 'blur(48px) saturate(200%)',
          WebkitBackdropFilter: 'blur(48px) saturate(200%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          borderRight: '1px solid rgba(0, 0, 0, 0.5)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.8)',
          boxShadow: 'inset 1px 1px 3px rgba(255, 255, 255, 0.3), inset -2px -2px 6px rgba(0, 0, 0, 0.8), 0 30px 60px rgba(0,0,0,0.95)'
        }}
      >
        {/* Mode Option Button (Inside Prompt Bar) */}
        <div className="relative shrink-0 min-w-0 z-[60]">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (deep_search) {
                setSettings({ deep_search: false });
                setActiveMenu('none');
              } else {
                setActiveMenu(activeMenu === 'modes' ? 'none' : 'modes');
              }
            }}
            className="h-8 w-8 sm:h-12 sm:w-12 flex items-center justify-center shrink-0 transition-all cursor-none group rounded-[1.5rem]"
            style={deep_search ? redGlass : baseGlass}
            title="Modes"
          >
            {deep_search ? (
              <svg className="w-4 h-4 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11 C3 6, 7 3, 12 3 C17 3, 21 6, 21 11" strokeWidth="2" />
                <path d="M1 11 H23" strokeWidth="2" />
                <circle cx="8" cy="16" r="3" strokeWidth="2" />
                <circle cx="16" cy="16" r="3" strokeWidth="2" />
                <line x1="11" y1="16" x2="13" y2="16" strokeWidth="2" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            )}
          </motion.button>
          <AnimatePresence>
            {activeMenu === 'modes' && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-[calc(100%+16px)] sm:bottom-[calc(100%+24px)] left-0 w-32 rounded-2xl overflow-hidden flex flex-col p-1 z-50 cursor-none shadow-2xl"
                style={baseGlass}
              >
                <div 
                  onClick={() => { setSettings({ deep_search: !deep_search }); setActiveMenu('none'); }}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black tracking-wider uppercase transition-colors flex items-center gap-2 ${deep_search ? 'text-red-500 bg-red-900/20' : 'text-gray-300 hover:bg-white/10'}`}
                >
                  Agent
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 min-w-0 w-full relative flex flex-col justify-center">
        {/* RENDER ATTACHED FILES CHIPS */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-3">
          {attachedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-black/60 border border-white/20 rounded-full text-xs text-white backdrop-blur-md shadow-lg">
              {file.type === 'image' && file.url && (
                 <img src={file.url} alt="preview" className="w-5 h-5 rounded-md object-cover" />
              )}
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-500 ml-1 font-bold transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      

          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                 handleSendMessage();
              }
            }}
            placeholder="Ask me anything..."
            className="w-full min-w-0 bg-transparent border-none text-white font-bold tracking-normal sm:tracking-[0.1em] px-2 sm:px-6 py-2 sm:py-6 focus:outline-none placeholder-gray-500 text-[10px] sm:text-lg cursor-none drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] h-8 sm:h-16 overflow-hidden text-ellipsis whitespace-nowrap"
          />
        </div>

        {/* Model Switcher */}
        <div className="relative shrink-0 min-w-0">
          <motion.button 
            whileHover={!deep_search ? { scale: 1.05 } : {}}
            whileTap={!deep_search ? { scale: 0.95 } : {}}
            onClick={() => {
              if (!deep_search) setActiveMenu(activeMenu === 'model' ? 'none' : 'model');
            }}
            className={`h-8 px-1 sm:h-12 sm:px-4 flex items-center justify-center transition-colors cursor-none group ${deep_search ? 'opacity-30' : ''}`}
            style={baseGlass}
            title={deep_search ? "Turn off Agent Mode to switch models" : "Model Switcher"}
          >
            <span className="text-white text-[8px] sm:text-xs font-black tracking-widest uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[40px] sm:max-w-none">{selectedModel}</span>
            <svg className="hidden sm:block w-4 h-4 text-white ml-2 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </motion.button>
          <AnimatePresence>
            {activeMenu === 'model' && !deep_search && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full mb-6 sm:mb-8 right-0 w-32 rounded-2xl overflow-hidden flex flex-col p-1 z-50 cursor-none"
                style={baseGlass}
              >
                {availableModels.map(model => (
                  <div 
                    key={model}
                    onClick={() => { setSelectedModel(model); setActiveMenu('none'); }}
                    className={`px-3 py-2 rounded-lg text-[9px] sm:text-[10px] font-black tracking-wider uppercase transition-colors ${selectedModel === model ? 'text-red-500 bg-red-900/20' : 'text-gray-300 hover:bg-white/10'}`}
                  >
                    {model}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>



        <AnimatePresence mode="wait">
          {isThinking ? (
            <motion.button 
              key="stop-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                cancelStream();
                setIsThinking(false);
              }}
              className="h-8 w-8 sm:w-auto sm:h-14 sm:px-6 flex items-center justify-center shrink-0 cursor-none"
              style={{
                ...redGlass,
                background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.4) 0%, rgba(150, 0, 0, 0.8) 100%)',
                boxShadow: 'inset 1px 1px 4px rgba(255, 255, 255, 0.4), inset -2px -2px 6px rgba(0, 0, 0, 0.9), 0 8px 20px rgba(255,0,0,0.6), 0 0 20px rgba(255,0,0,0.8)'
              }}
              title="Stop Generation"
            >
              {/* Stop Icon (Square) */}
              <svg className="w-3 h-3 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"></path></svg>
            </motion.button>
          ) : (
            (inputText.trim().length > 0 || attachedFiles.length > 0) && (
              <motion.button 
                key="send-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={isUploading || isThinking || (!inputText.trim() && attachedFiles.length === 0)}
                className={`h-8 w-8 sm:w-auto sm:h-14 sm:px-6 flex items-center justify-center shrink-0 cursor-none transition-all ${
                  isUploading || isThinking ? 'opacity-50' : 'hover:brightness-125'
                }`}
                style={{
                  ...redGlass,
                  background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.4) 0%, rgba(150, 0, 0, 0.8) 100%)',
                  boxShadow: 'inset 1px 1px 4px rgba(255, 255, 255, 0.4), inset -2px -2px 6px rgba(0, 0, 0, 0.9), 0 8px 20px rgba(255,0,0,0.6), 0 0 20px rgba(255,0,0,0.8)'
                }}
                title="Send Message"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                )}
              </motion.button>
            )
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
