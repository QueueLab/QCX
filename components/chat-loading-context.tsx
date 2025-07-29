'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatLoadingContextType {
  isChatLoading: boolean;
  setIsChatLoading: (isLoading: boolean) => void;
}

const ChatLoadingContext = createContext<ChatLoadingContextType | undefined>(undefined);

export const ChatLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isChatLoading, setIsChatLoading] = useState(false);
  return (
    <ChatLoadingContext.Provider value={{ isChatLoading, setIsChatLoading }}>
      {children}
    </ChatLoadingContext.Provider>
  );
};

export const useChatLoading = () => {
  const context = useContext(ChatLoadingContext);
  if (context === undefined) {
    throw new Error('useChatLoading must be used within a ChatLoadingProvider');
  }
  return context;
};
