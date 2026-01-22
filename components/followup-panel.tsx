'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ArrowRight } from 'lucide-react'

export function FollowupPanel() {
  const [input, setInput] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
