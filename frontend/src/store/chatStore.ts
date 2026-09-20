import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
}

export interface ChatAttachment {
  name: string;
  type: 'image' | 'file';
  url?: string;
  textContext: string;
}

export interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  attachments?: ChatAttachment[];
  thoughtProcess?: string;
  rawBuffer?: string;
  isLoadingModel?: boolean;
  isAnalysisMode?: boolean;
  thinkingStartTime?: number;
  thinkingDurationMs?: number;
  responseDurationMs?: number;
  isAborted?: boolean;
  abortState?: 'loading' | 'thinking' | 'responding';
  isHidden?: boolean;
}

interface ChatState {
  chatSessions: ChatSession[];
  chatDatabase: Record<string, ChatMessage[]>;
  activeChatId: string | null;
  isThinking: boolean;
  
  // Actions
  setActiveChatId: (id: string | null) => void;
  setIsThinking: (isThinking: boolean) => void;
  createSession: (id: string, firstMessage: string) => void;
  deleteSession: (id: string) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  updateLastMessage: (chatId: string, chunk: string, thoughtChunk?: string, rawChunk?: string) => void;
  setLastMessageLoading: (chatId: string, isLoading: boolean) => void;
  setLastMessageAnalysisMode: (chatId: string, isAnalysis: boolean) => void;
  setLastMessageResponseTime: (chatId: string, durationMs: number) => void;
  abortLastMessage: (chatId: string) => void;
  clearMessages: () => void;
  clearAllData: () => void;
  fetchGreeting: () => Promise<void>;
  getActiveChat: () => { id: string; messages: ChatMessage[] } | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chatSessions: [],
      chatDatabase: {},
      activeChatId: null,
      isThinking: false,

      getActiveChat: () => {
        const state = get();
        if (!state.activeChatId) return null;
        const db = state.chatDatabase || {}; // Crucial hydration fallback
        return {
          id: state.activeChatId,
          messages: db[state.activeChatId] || []
        };
      },

      clearAllData: () => {
        set({
          chatSessions: [],
          chatDatabase: {},
          activeChatId: null,
          isThinking: false
        });
      },

      fetchGreeting: async () => {
        try {
          const res = await fetch('http://127.0.0.1:8000/v1/greeting');
          if (res.ok) {
            const data = await res.json();
            window.localStorage.setItem('lazy_greeting', data.greeting);
            // Fire a custom event so ChatFeed can re-render if it's already mounted
            window.dispatchEvent(new Event('lazy_greeting_updated'));
          }
        } catch (e) {
          console.error("Failed to fetch greeting", e);
        }
      },

      setActiveChatId: (id) => set({ activeChatId: id }),
      
      setIsThinking: (isThinking) => set({ isThinking }),

      createSession: (id, firstMessage) => {
        const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage;
        set((state) => ({
          activeChatId: id,
          chatSessions: [{ id, title, timestamp: Date.now() }, ...(state.chatSessions || [])],
          chatDatabase: { ...(state.chatDatabase || {}), [id]: [] }
        }));
      },

      deleteSession: (id) => set((state) => {
        const db = state.chatDatabase || {};
        const newDb = { ...db };
        delete newDb[id];
        return {
          chatSessions: (state.chatSessions || []).filter(s => s.id !== id),
          chatDatabase: newDb,
          activeChatId: state.activeChatId === id ? null : state.activeChatId
        };
      }),

      addMessage: (chatId, message) => set((state) => {
        const db = state.chatDatabase || {};
        const newMessage = message.role === 'ai' ? { ...message, isLoadingModel: false } : message;
        return {
          chatDatabase: {
            ...db,
            [chatId]: [...(db[chatId] || []), newMessage]
          }
        };
      }),

      setLastMessageLoading: (chatId, isLoading) => set((state) => {
        const db = state.chatDatabase || {};
        const messages = db[chatId] || [];
        if (messages.length === 0) return state;

        const lastIndex = messages.length - 1;
        const lastMessage = messages[lastIndex];

        if (lastMessage.role !== 'ai') return state;

        const newMessages = [...messages];
        newMessages[lastIndex] = { ...lastMessage, isLoadingModel: isLoading };

        return {
          chatDatabase: {
            ...db,
            [chatId]: newMessages
          }
        };
      }),

      setLastMessageAnalysisMode: (chatId, isAnalysis) => set((state) => {
        const db = state.chatDatabase || {};
        const messages = db[chatId] || [];
        if (messages.length === 0) return state;

        const lastIndex = messages.length - 1;
        const lastMessage = messages[lastIndex];

        if (lastMessage.role !== 'ai') return state;

        const newMessages = [...messages];
        // Only update if it actually changed to avoid unnecessary re-renders
        if (lastMessage.isAnalysisMode === isAnalysis) return state;
        
        let newStartTime = lastMessage.thinkingStartTime;
        let newDuration = lastMessage.thinkingDurationMs;
        
        if (isAnalysis && !newStartTime) {
            newStartTime = Date.now();
        } else if (!isAnalysis && newStartTime && !newDuration) {
            newDuration = Date.now() - newStartTime;
        }

        newMessages[lastIndex] = { ...lastMessage, isAnalysisMode: isAnalysis, thinkingStartTime: newStartTime, thinkingDurationMs: newDuration };

        return {
          chatDatabase: {
            ...db,
            [chatId]: newMessages
          }
        };
      }),

      setLastMessageResponseTime: (chatId, durationMs) => set((state) => {
        const db = state.chatDatabase || {};
        const messages = db[chatId] || [];
        if (messages.length === 0) return state;

        const lastIndex = messages.length - 1;
        const lastMessage = messages[lastIndex];

        if (lastMessage.role !== 'ai') return state;

        const newMessages = [...messages];
        newMessages[lastIndex] = { ...lastMessage, responseDurationMs: durationMs };

        return {
          chatDatabase: {
            ...db,
            [chatId]: newMessages
          }
        };
      }),

      abortLastMessage: (chatId) => set((state) => {
        const db = state.chatDatabase || {};
        const messages = db[chatId] || [];
        if (messages.length === 0) return state;

        const lastIndex = messages.length - 1;
        const lastMessage = messages[lastIndex];

        if (lastMessage.role !== 'ai') return state;

        let abortState: 'loading' | 'thinking' | 'responding' = 'responding';
        if (lastMessage.isLoadingModel) {
            abortState = 'loading';
        } else if (lastMessage.isAnalysisMode && (!lastMessage.content || lastMessage.content.length === 0)) {
            abortState = 'thinking';
        }

        const newMessages = [...messages];
        newMessages[lastIndex] = { ...lastMessage, isAborted: true, abortState, isLoadingModel: false };

        return {
          chatDatabase: {
            ...db,
            [chatId]: newMessages
          }
        };
      }),

      // Strict Immutability required by Lead Engineer for 50ms chunks
      updateLastMessage: (chatId, chunk, thoughtChunk = "", rawChunk = "") => set((state) => {
        const db = state.chatDatabase || {};
        const messages = db[chatId] || [];
        if (messages.length === 0) return state;

        const lastIndex = messages.length - 1;
        const lastMessage = messages[lastIndex];

        if (lastMessage.role !== 'ai') return state;

        const newMessages = [...messages];
        
        let newStartTime = lastMessage.thinkingStartTime;
        let newDuration = lastMessage.thinkingDurationMs;
        
        // If we just received the first thought chunk
        if (thoughtChunk && !(lastMessage.thoughtProcess)) {
          newStartTime = Date.now();
        }
        
        // If we just received the first content chunk AFTER thinking
        if (chunk && lastMessage.thoughtProcess && !lastMessage.thinkingDurationMs && newStartTime) {
          newDuration = Date.now() - newStartTime;
        }

        newMessages[lastIndex] = {
          ...lastMessage,
          content: lastMessage.content + chunk,
          thoughtProcess: (lastMessage.thoughtProcess || "") + thoughtChunk,
          rawBuffer: (lastMessage.rawBuffer || "") + rawChunk,
          thinkingStartTime: newStartTime,
          thinkingDurationMs: newDuration
        };

        return {
          chatDatabase: {
            ...db,
            [chatId]: newMessages
          }
        };
      }),

      clearMessages: () => set({ chatDatabase: {} }) // Failsafe
    }),
    {
      name: 'lazy-ai-chat-storage', // Save to local storage automatically
      partialize: (state) => ({
        chatSessions: state.chatSessions,
        chatDatabase: state.chatDatabase,
      }), // Exclude activeChatId so a refresh ALWAYS gives a new clean chat!
    }
  )
);
