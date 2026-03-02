// components/
'use client'
import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react"
//import profile-toggle-context.tsx;

export enum ProfileToggleEnum {
  Account = "account",
  Settings = "settings",
  Appearance = "appearance",
  Security = "security",
}

interface ProfileToggleContextType {
  activeView: ProfileToggleEnum | null
  toggleProfileSection: (section: ProfileToggleEnum) => void
  closeProfileView: () => void
}

const ProfileToggleContext = createContext<ProfileToggleContextType | undefined>(undefined)

interface ProfileToggleProviderProps {
  children: ReactNode
}

export const ProfileToggleProvider: React.FC<ProfileToggleProviderProps> = ({ children }) => {
  const [activeView, setActiveView] = useState<ProfileToggleEnum | null>(null)

  const toggleProfileSection = useCallback((section: ProfileToggleEnum) => {
    setActiveView(prevView => (prevView === section ? null : section))
  }, [])

  const closeProfileView = useCallback(() => {
    setActiveView(null)
  }, [])

  const value = useMemo(() => ({
    activeView,
    toggleProfileSection,
    closeProfileView
  }), [activeView, toggleProfileSection, closeProfileView])

  return (
    <ProfileToggleContext.Provider value={value}>
      {children}
    </ProfileToggleContext.Provider>
  )
}

export const useProfileToggle = () => {
  const context = useContext(ProfileToggleContext)
  if (context === undefined) {
    throw new Error('Profile toggle context must be used within a ProfileToggleProvider')
  }
  return context
}