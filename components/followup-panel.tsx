'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useChatContext } from './chat-provider'
import { ArrowRight } from 'lucide-react'
import { useMapData } from './map/map-data-context'

export function FollowupPanel() {
  const [input, setInput] = useState('')
  const { append } = useChatContext()
  const { mapData } = useMapData()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await append(
      { role: 'user', content: input },
      {
        body: {
          drawnFeatures: mapData.drawnFeatures || [],
        }
      }
    )

    setInput('')
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
        disabled={input.length === 0}
        variant={'ghost'}
        className="absolute right-1"
      >
        <ArrowRight size={20} />
      </Button>
    </form>
  )
}
