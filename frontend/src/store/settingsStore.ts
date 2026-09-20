import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  temperature: number;
  top_p: number;
  max_tokens: number;
  system_prompt: string;
  research: boolean;
  deep_search: boolean;
  dark_web: boolean;
  vm_mode: boolean;
  selectedModel: string;
  isSwitchingModel: boolean;
  agentStatus: string;
  activeGlobalMenu: string;
  isSidebarOpen: boolean;
  
  // Actions
  setSettings: (settings: Partial<SettingsState>) => void;
  toggleResearch: () => void;
  toggleDeepSearch: () => void;
  toggleDarkWeb: () => void;
  toggleVmMode: () => void;
  setNormalMode: () => void;
  setSelectedModel: (model: string) => void;
  setIsSwitchingModel: (isSwitching: boolean) => void;
  setAgentStatus: (status: string) => void;
  setActiveGlobalMenu: (menu: string) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 2048,
      system_prompt: "",
      research: false,
      deep_search: false,
      dark_web: false,
      vm_mode: false,
      selectedModel: "Gemma 4",
      isSwitchingModel: false,
      agentStatus: "",
      activeGlobalMenu: "none",
      isSidebarOpen: false,

      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
      toggleResearch: () => set((state) => {
        const next = !state.research;
        return { research: next };
      }),
      toggleDeepSearch: () => set((state) => {
        const next = !state.deep_search;
        return { deep_search: next };
      }),
      toggleDarkWeb: () => set((state) => {
        const next = !state.dark_web;
        return { dark_web: next };
      }),
      setNormalMode: () => set({ research: false, deep_search: false, dark_web: false, vm_mode: false }),
      toggleVmMode: () => set((state) => {
        const next = !state.vm_mode;
        return { 
          vm_mode: next
        };
      }),
      setIsSwitchingModel: (isSwitching) => set({ isSwitchingModel: isSwitching }),
      setAgentStatus: (status) => set({ agentStatus: status }),
      setSelectedModel: (model) => {
        set({ selectedModel: model });
        // Fire proactive load — isSwitchingModel is controlled by the stream events
        // 'loading' → true, 'generating' → false, so we never set it here
        fetch("http://127.0.0.1:8000/v1/model/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model })
        }).catch(e => {
          console.error("Proactive model load failed:", e);
        });
      },
      setActiveGlobalMenu: (menu) => set({ activeGlobalMenu: menu }),
      setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    }),
    {
      name: 'lazy-ai-settings-storage',
    }
  )
);
