'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Search,
  CircleUserRound,
  Map,
  CalendarDays,
  TentTree,
  Paperclip,
  ArrowRight,
  Plus
} from 'lucide-react'
import { History } from '@/components/history'
import { MapToggle } from './map-toggle'
import { ModeToggle } from './mode-toggle'
import { getEnhancedPrompt, getNewExamplePrompts } from '@/lib/actions/suggestions'; // Import server actions
import { LucideIcon } from 'lucide-react'; // For icon typing

interface MobileIconsBarProps {
  currentInput: string;
  setInput: (value: string) => void;
  examplePrompts: Array<{ heading: string; message: string; icon?: LucideIcon }>; // Receive current prompts
  setExamplePrompts: (prompts: Array<{ heading: string; message: string; icon?: LucideIcon }>) => void; // Setter for prompts
}

export const MobileIconsBar: React.FC<MobileIconsBarProps> = ({
  currentInput,
  setInput,
  examplePrompts, // Destructure examplePrompts
  setExamplePrompts
}) => {
  const router = useRouter()

  const handleNewChat = () => {
    router.push('/')
  }

  const handleMagnifyPrompt = async () => {
    if (currentInput) {
      const enhancedPromptText = await getEnhancedPrompt(currentInput);
      setInput(enhancedPromptText);
    } else {
      const existingPromptMessages = examplePrompts.map(p => p.message);
      const newPromptStrings = await getNewExamplePrompts(existingPromptMessages);
      // Map new prompt strings to the state structure. Icons are not available for these dynamic prompts.
      const newPromptsForState = newPromptStrings.map(prompt => ({
        heading: prompt,
        message: prompt
        // No icon for dynamically generated prompts by default
      }));
      setExamplePrompts(newPromptsForState);
    }
  }

  return (
    <div className="mobile-icons-bar-content">
      <Button variant="ghost" size="icon" onClick={handleNewChat}>
        <Plus className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button variant="ghost" size="icon">
        <CircleUserRound className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <MapToggle />
      <Button variant="ghost" size="icon">
        <CalendarDays className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleMagnifyPrompt}>
        <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon">
        <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon">
        <Paperclip className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon">
        <ArrowRight className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <History location="header" />
      <ModeToggle />
    </div>
  )
}

export default MobileIconsBar
