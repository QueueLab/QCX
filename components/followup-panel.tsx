'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useChatContext } from './chat-provider'
import { ArrowRight } from 'lucide-react'
import { useMapData } from './map/map-data-context'
import { useSettingsStore } from '@/lib/store/settings'

export function FollowupPanel() {
  const [input, setInput] = useState('')
  const { append, isLoading } = useChatContext()
  const { mapData } = useMapData()
  const { mapProvider } = useSettingsStore()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return

    const content = input.trim()
    setInput('')

    try {
      await append(
        { role: 'user', content },
        {
          body: {
            mapProvider,
            drawnFeatures: mapData.drawnFeatures || [],
          }
        }
      )
    } catch (error) {
      console.error('Failed to send follow-up:', error)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center space-x-1"
    >
      <Input
        type="text"
        name="input"
        placeholder="Explore"
        value={input}
        className="pr-14 h-12"
        onChange={e => setInput(e.target.value)}
      />
      <Button
        type="submit"
        size={'icon'}
        disabled={input.length === 0 || isLoading}
        variant={'ghost'}
        className="absolute right-1"
      >
        <ArrowRight size={20} />
      </Button>
    </form>
  )
}
