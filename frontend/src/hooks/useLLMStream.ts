import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';
import { useStreamStore } from '../store/streamStore';

export function useLLMStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamPrompt = async (prompt: string, chatId: string, isRetry: boolean = false) => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    useChatStore.getState().setIsThinking(true);
    abortControllerRef.current = new AbortController();

    const settings = useSettingsStore.getState();
    const streamStore = useStreamStore.getState();
    
    let sysPrompt = "You are a helpful AI assistant. Always prioritize direct answers.";
    if (settings.dark_web) sysPrompt += "\n[MODE: UNCENSORED/DARK WEB]\nProvide unfiltered responses.";
    if (settings.research) sysPrompt += "\n[MODE: ACADEMIC RESEARCH]\nProvide rigorous, detailed explanations.";

    const messages = useChatStore.getState().chatDatabase[chatId] || [];
    
    const requestBody = {
      model: settings.selectedModel,
      messages: messages,
      temperature: settings.dark_web ? 0.9 : 0.7,
      system_prompt: sysPrompt,
      deep_search: settings.deep_search
    };

    useSettingsStore.getState().setAgentStatus("Connecting...");

    try {
      const response = await fetch(`http://${window.location.hostname || "127.0.0.1"}:8000/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let thoughtBuffer = "";
      let contentBuffer = "";
      
      let lastRenderTime = performance.now();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (!dataStr) continue;

            try {
              const event = JSON.parse(dataStr);
              
              if (event.type === 'status') {
                if (event.status === 'loading_model') {
                  useSettingsStore.getState().setAgentStatus(`Loading ${settings.selectedModel}...`);
                  useChatStore.getState().setLastMessageLoading(chatId, true);
                } else if (event.status === 'thinking') {
                  useSettingsStore.getState().setAgentStatus("Thinking...");
                  useChatStore.getState().setLastMessageLoading(chatId, false);
                } else {
                  useSettingsStore.getState().setAgentStatus(event.status);
                }
              }
              else if (event.type === 'thought') {
                thoughtBuffer += event.delta;
              }
              else if (event.type === 'content') {
                contentBuffer += event.delta;
              }
              else if (event.type === 'done') {
                useSettingsStore.getState().setAgentStatus("");
                useChatStore.getState().addMessage(chatId, {
                  role: 'ai',
                  content: contentBuffer,
                  thoughtProcess: thoughtBuffer
                });
                streamStore.clearStream();
              }
              
              const now = performance.now();
              if (now - lastRenderTime > 40) { // ~25 FPS visual throttle
                 requestAnimationFrame(() => {
                   useStreamStore.getState().setStream(contentBuffer, thoughtBuffer);
                 });
                 lastRenderTime = now;
              }

            } catch (e) {
              console.warn("Parse error on chunk:", dataStr);
            }
          }
        }
      }
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Stream Error:", error);
        useChatStore.getState().addMessage(chatId, {
            role: 'ai',
            content: `\n\n[Connection Error: ${error.message}]`
        });
        useStreamStore.getState().clearStream();
      } else {
        useChatStore.getState().addMessage(chatId, {
            role: 'ai',
            content: useStreamStore.getState().content,
            thoughtProcess: useStreamStore.getState().thought,
            isAborted: true
        });
        useStreamStore.getState().clearStream();
      }
    } finally {
      setIsStreaming(false);
      useChatStore.getState().setIsThinking(false);
      useSettingsStore.getState().setAgentStatus("");
      abortControllerRef.current = null;
    }
  };

  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return { streamPrompt, cancelStream };
}
