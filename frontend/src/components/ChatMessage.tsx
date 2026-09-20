import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, ChevronDown, ChevronUp, Loader2, Clock } from 'lucide-react';
import { PureOccultEye } from './PureOccultEye';
import { UserAngelSymbol } from './UserAngelSymbol';
import mermaid from 'mermaid';
import { useSettingsStore } from '../store/settingsStore';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidChart = ({ chart }: { chart: string }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chartRef.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart)
        .then(({ svg }) => {
          if (chartRef.current) chartRef.current.innerHTML = svg;
        })
        .catch(e => {
          if (chartRef.current) chartRef.current.innerHTML = `<pre class="text-red-500 text-xs p-4">${e.message}</pre>`;
        });
    }
  }, [chart]);

  return <div ref={chartRef} className="my-4 flex justify-center w-full overflow-x-auto bg-neutral-900/50 p-4 rounded-xl border border-white/10" />;
};

export interface ChatMessageProps {
  msg: { 
    role: 'user' | 'ai' | 'system'; 
    content?: string; 
    thoughtProcess?: string; 
    rawBuffer?: string;
    isLoadingModel?: boolean;
    isAnalysisMode?: boolean;
    thinkingStartTime?: number;
    thinkingDurationMs?: number;
    responseDurationMs?: number;
    isAborted?: boolean;
    abortState?: 'loading' | 'thinking' | 'responding';
  };
  isLatest?: boolean;
  isLatestUserMessage?: boolean;
  isThinking?: boolean;
}

const ThinkingTimer: React.FC<{ startTime: number, duration?: number }> = ({ startTime, duration }) => {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    if (duration) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [duration]);
  
  const elapsedMs = duration || (Math.max(0, now - startTime));
  const seconds = Math.floor(elapsedMs / 1000);
  const ms = Math.floor((elapsedMs % 1000) / 100);
  
  if (seconds >= 60) {
     const mins = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return <span>{mins}m {secs}s</span>;
  }
  return <span>{seconds}.{ms}s</span>;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ msg, isLatest, isLatestUserMessage, isThinking }) => {
  const agentStatus = useSettingsStore(state => state.agentStatus);
  const isAgentMode = useSettingsStore(state => state.deep_search);
  const [showThinking, setShowThinking] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand thought process while generating thoughts, collapse when final content begins
  useEffect(() => {
    if (isThinking && isLatest) {
      if ((msg.thoughtProcess?.length || 0) > 0 && !(msg.content?.length || 0)) {
        setIsExpanded(true);
      } else if ((msg.content?.length || 0) > 0) {
        setIsExpanded(false);
      }
    }
  }, [msg.thoughtProcess, msg.content, isThinking, isLatest]);

  useEffect(() => {
    let timer: any;
    if (msg.role === 'ai' && msg.isLoadingModel) {
      timer = setTimeout(() => setShowLoading(true), 500);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [msg]);

  // Aggressive Backend Token Purge
  const cleanText = (t: string) => {
    if (!t) return '';
    let cleaned = t.replace(/<\|?channel\|?>?_?(?:thought|final|analysis).*?(?:<\|?message\|?>?)?|<\|turn\|>|<turn\|>|<\|?channel\|?>?thought|<channel\|>|<start_of_turn>|<end_of_turn>|<\|im_end\|>|<\|im_start\|>|<\/?thought>|<\/?think>|\[\/?thought\]/g, '');
    cleaned = cleaned.replace(/^(?:_?thought|_?final|assistant|model|system)\s*/i, '');
    return cleaned.trim();
  };

  let content = cleanText(msg.content || '');
  let thought = cleanText(msg.thoughtProcess || '');

  // FALLBACK: If generation is fully complete, but the model trapped its entire response
  // inside the <think> tags (leaving content completely empty), we seamlessly move it out.
  if (!isThinking && content.length === 0 && thought.length > 0) {
    content = thought;
    thought = '';
  }

  const isEmpty = !content && !thought;

  useEffect(() => {
    let timer: any;
    if (msg.role === 'ai' && isLatest && isThinking && !msg.isLoadingModel && isEmpty && !msg.isAnalysisMode && !msg.isAborted) {
      timer = setTimeout(() => setShowThinking(true), 500);
    } else {
      setShowThinking(false);
    }
    return () => clearTimeout(timer);
  }, [msg, isLatest, isThinking, isEmpty]);
  
  if (!msg) return null;
  const isAI = msg.role === 'ai';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <div className="w-full text-center py-4">
        <span className="text-red-500/80 font-mono text-xs tracking-widest uppercase">{content}</span>
      </div>
    );
  }

  // Determine States using the explicit boolean from the backend
  const showThoughtAccordion = (msg.isAnalysisMode || thought.length > 0) && !(msg.isAborted && msg.abortState === 'thinking');


  return (
    <div className={`flex w-full gap-5 sm:gap-6 my-4 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
      
      {/* 1. OUTSIDE AVATAR */}
      {isAI && isLatest && (
        <div className="flex-shrink-0 w-12 h-12 relative flex items-center justify-center pt-3">
          {(msg.isAnalysisMode || (isLatest && isThinking && content.length === 0)) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-4">
              <div className="w-16 h-16 rounded-full border border-red-500/30 border-t-red-500 animate-[spin_3s_linear_infinite] absolute mix-blend-screen" />
              <div className="w-12 h-12 rounded-full border border-red-900/30 border-b-red-400 animate-[spin_2s_reverse_linear_infinite] absolute mix-blend-screen" />
              <div className="w-8 h-8 bg-red-600/10 rounded-full animate-ping absolute mix-blend-screen" />
            </div>
          )}
          <div className={`relative z-10 scale-[0.55] origin-top drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] ${isThinking ? 'animate-pulse' : ''} ${(msg.isAnalysisMode || (isLatest && isThinking && content.length === 0)) ? 'drop-shadow-[0_0_30px_rgba(255,50,50,1)]' : ''}`}>
             <PureOccultEye/>
          </div>
        </div>
      )}
      {isAI && !isLatest && (
        <div className="flex-shrink-0 w-12 h-12 relative flex items-center justify-center pt-3"></div>
      )}
      {!isAI && isLatestUserMessage && (
        <div className="flex-shrink-0 w-12 h-12 relative flex items-center justify-center mt-1">
          <div className="scale-[0.55] origin-top drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
             <UserAngelSymbol/>
          </div>
        </div>
      )}
      {!isAI && !isLatestUserMessage && (
        <div className="flex-shrink-0 w-12 h-12 relative flex items-center justify-center mt-1"></div>
      )}

      {/* 2. WRAPPER FOR ATTACHMENTS AND BUBBLE */}
      <div className={`flex flex-col gap-2 w-full max-w-[calc(100%-3.5rem)] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[750px] ${isAI ? 'items-start' : 'items-end'}`}>
        
        {/* FLOATING ATTACHMENT PREVIEWS */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className={`flex flex-wrap gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
            {msg.attachments.map((att, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden shadow-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                {att.type === 'image' && att.url ? (
                  <img 
                    src={att.url} 
                    alt={att.name} 
                    className="max-h-72 max-w-full rounded-2xl object-cover hover:scale-[1.02] transition-transform" 
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-neutral-200 bg-black/50 border border-white/10 rounded-2xl">
                    <span className="text-red-400">📄</span> {att.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 3D GLASSMORPHIC BUBBLE (Auto-sizes using w-fit) */}
        <div 
          className={`relative group inline-block w-fit px-4 sm:px-5 py-3 sm:py-4 rounded-3xl border backdrop-blur-2xl transition-all duration-300 min-w-[50px] ${
            isAI 
              ? 'bg-gradient-to-br from-white/[0.03] to-black/60 border-t-white/10 border-l-white/5 border-r-black/50 border-b-black/80 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.8)]' 
              : 'bg-gradient-to-br from-red-900/30 to-black/80 border-t-red-500/30 border-l-red-500/20 border-r-black/50 border-b-black/80 shadow-[inset_1px_1px_3px_rgba(255,100,100,0.2),_0_15px_30px_rgba(0,0,0,0.9)]'
          }`}
        >

                {/* AGENT MODE STATUS */}
        {isAgentMode && isEmpty && (showLoading || (isLatest && agentStatus)) && (
          <div className="flex items-center gap-2 text-red-500/80 font-mono text-xs mb-2 transition-opacity duration-300">
            <Loader2 className="w-4 h-4 animate-spin"/>
            <span className="animate-pulse">{agentStatus || "Loading AI..."}</span>
          </div>
        )}

        {/* NON-AGENT MODE STATUS */}
        {!isAgentMode && isEmpty && (showLoading || (isLatest && agentStatus) || showThinking) && (
          <div className="flex items-center gap-2 text-white/50 font-mono text-xs mb-2 transition-opacity duration-300 animate-pulse">
            {(agentStatus === "Thinking..." || showThinking) ? <Brain className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{agentStatus || (showThinking ? "Thinking..." : "Loading AI...")}</span>
          </div>
        )}
        {/* STATE 3: Thought Process Accordion */}
        {isAI && showThoughtAccordion && (
          <div className="mb-4 border border-red-900/30 rounded-xl overflow-hidden bg-black/40">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-3 text-xs font-mono text-red-500/80 hover:bg-red-950/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>Thought Process</span>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {isExpanded && (
              <div className="p-4 border-t border-red-900/30 text-white/60 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {thought}
              </div>
            )}
          </div>
        )}
        {/* FINAL ANSWER WITH NATIVE TABLES */}
        {(content || msg.isAborted) && (
          <div className="text-[14px] sm:text-[17px] text-white/95 font-medium leading-[1.8] tracking-wide font-['Outfit'] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] prose prose-invert max-w-none w-full break-words prose-p:my-2 prose-headings:font-bold prose-headings:tracking-widest prose-headings:text-red-400 prose-a:text-red-400 prose-strong:text-white prose-strong:font-bold prose-strong:drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] prose-ul:list-disc prose-li:marker:text-red-500 prose-li:marker:text-lg prose-blockquote:border-l-4 prose-blockquote:border-red-500/60 prose-blockquote:bg-red-950/20 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:my-5 prose-blockquote:text-white/80 prose-blockquote:not-italic pb-6 sm:pb-0">
            {content && (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ ...props }) => (
                    <div className="overflow-x-auto my-4 rounded-xl border border-white/15 bg-neutral-950/80 shadow-md">
                      <table className="w-full text-left border-collapse text-xs" {...props} />
                    </div>
                  ),
                  thead: ({ ...props }) => (
                    <thead className="bg-neutral-800/90 border-b border-white/15 text-neutral-200 uppercase font-mono" {...props} />
                  ),
                  th: ({ ...props }) => (
                    <th className="p-3 border-r border-white/10 last:border-r-0 font-semibold" {...props} />
                  ),
                  td: ({ ...props }) => (
                    <td className="p-3 border-t border-r border-white/10 last:border-r-0 text-neutral-300" {...props} />
                  ),
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match && match[1] === 'mermaid') {
                      return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
                    }
                    return inline ? (
                      <code className="bg-neutral-800 text-red-300 px-1.5 py-0.5 rounded font-mono text-xs break-all" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-neutral-950 p-3 rounded-lg border border-white/10 text-xs font-mono text-neutral-300 overflow-x-auto my-2" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            )}
            
            {msg.isAborted && (
              <div className={`${content ? 'mt-4' : ''} inline-block font-black tracking-widest text-xs uppercase text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] border border-red-500/50 rounded-md px-2 py-1 bg-red-950/30`}>
                {msg.abortState === 'loading' ? 'Stopped Loading Model' : msg.abortState === 'thinking' ? 'Stopped Thinking' : 'Stopped Responding'}
              </div>
            )}
            
            {msg.responseDurationMs && (
              <div className="mt-5 flex justify-end">
                <span className="text-sm font-bold text-red-500 tracking-widest border border-red-500/20 rounded-full px-4 py-1.5 bg-red-950/40 drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">
                  Responded in {(msg.responseDurationMs / 1000).toFixed(2)}s
                </span>
              </div>
            )}
          </div>
        )}

        {/* FLOATING ACTION BUTTONS */}
        {content && (
          <>
            <div className={`absolute right-2 bottom-2 sm:-right-12 sm:bottom-auto ${isAI ? 'sm:bottom-2' : 'sm:top-2'} flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(content);
                  const el = document.getElementById(`copy-${msg.thinkingStartTime || ''}`);
                  if(el) {
                    const original = el.innerHTML;
                    el.innerHTML = '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                    setTimeout(() => el.innerHTML = original, 2000);
                  }
                }}
                className="p-2 rounded-full flex items-center justify-center transition-colors cursor-pointer bg-neutral-800/80 sm:bg-white/5 hover:bg-neutral-700 sm:hover:bg-white/20 text-neutral-300 sm:text-neutral-400 hover:text-white backdrop-blur-md shadow-lg"
                title="Copy"
                id={`copy-${msg.thinkingStartTime || ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
            </div>
            
            {isAI && msg.responseDurationMs && (
              <div className="absolute -left-12 bottom-2 flex flex-col items-center gap-0.5 text-[10px] font-bold tracking-wider text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] opacity-0 group-hover:opacity-100 transition-opacity">
                <Clock className="w-3 h-3" />
                {(msg.responseDurationMs / 1000).toFixed(1)}s
              </div>
            )}
          </>
        )}
            </div>
      </div>
    </div>
  );
};
