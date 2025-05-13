// components/
'use client'
import { createContext, useContext, useState, ReactNode } from "react"
//import profile-toggle-context.tsx;

export enum ProfileToggleEnum {
  Account = "account",
  Settings = "settings",
  Security = "security",
}

interface ProfileToggleContextType {
  profileSection: ProfileToggleEnum
  setProfileSection: (section: ProfileToggleEnum) => void
}

const ProfileToggleContext = createContext<ProfileToggleContextType | undefined>(undefined)

interface ProfileToggleProviderProps {
  children: ReactNode
}

export const ProfileToggleProvider: React.FC<ProfileToggleProviderProps> = ({ children }) => {
  const [profileSection, setProfileSection] = useState<ProfileToggleEnum>(ProfileToggleEnum.Account)

  return (
    <ProfileToggleContext.Provider value={{ profileSection, setProfileSection }}>
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