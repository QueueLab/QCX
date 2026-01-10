import { create } from 'zustand'

export type MapProvider = 'mapbox' | 'google'

interface SettingsState {
  mapProvider: MapProvider
  setMapProvider: (provider: MapProvider) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  mapProvider: 'mapbox', // default
  setMapProvider: (provider) => set({ mapProvider: provider }),
}))
