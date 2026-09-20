import { create } from 'zustand';

interface StreamState {
  isStreaming: boolean;
  content: string;
  thought: string;
  setStream: (content: string, thought: string) => void;
  clearStream: () => void;
}

export const useStreamStore = create<StreamState>((set) => ({
  isStreaming: false,
  content: "",
  thought: "",
  setStream: (content, thought) => set({ isStreaming: true, content, thought }),
  clearStream: () => set({ isStreaming: false, content: "", thought: "" })
}));
