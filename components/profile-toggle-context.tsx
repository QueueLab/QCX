'use client'
import { createContext, useContext, useState, ReactNode } from "react"

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

  const toggleProfileSection = (section: ProfileToggleEnum) => {
    setActiveView(prevView => (prevView === section ? null : section))
  }

  const closeProfileView = () => {
    setActiveView(null)
  }

  return (
    <ProfileToggleContext.Provider value={{ activeView, toggleProfileSection, closeProfileView }}>
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
