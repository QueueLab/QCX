'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from './ui/button'
import { Share, UserPlus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
  DialogTitle
} from './ui/dialog'
import { toast } from 'sonner'
import { Spinner } from './ui/spinner'

interface ChatShareProps {
  chatId: string
  className?: string
}

export function ChatShare({ chatId, className }: ChatShareProps) {
  const [open, setOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [participants, setParticipants] = useState<any[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)

  const fetchParticipants = async () => {
    setIsLoadingParticipants(true)
    try {
      const res = await fetch(`/api/chats/${chatId}/participants`)
      if (res.ok) {
        const data = await res.json()
        setParticipants(data.participants || [])
      }
    } catch (e) {
      console.error('Error fetching participants:', e)
    } finally {
      setIsLoadingParticipants(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchParticipants()
    }
  }, [open, chatId])

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/chats/${chatId}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ emailOrClerkId: emailInput.trim() })
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to add participant')
        }

        toast.success('Collaborator invited!')
        setEmailInput('')
        fetchParticipants()
      } catch (err: any) {
        toast.error(err.message || 'Error inviting collaborator')
      }
    })
  }

  const handleRemoveCollaborator = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/participants`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to remove participant')
      }

      toast.success('Collaborator removed')
      fetchParticipants()
    } catch (err: any) {
      toast.error(err.message || 'Error removing collaborator')
    }
  }

  return (
    <div className={className}>
      <Dialog
        open={open}
        onOpenChange={open => setOpen(open)}
        aria-labelledby="share-dialog-title"
        aria-describedby="share-dialog-description"
      >
        <DialogTrigger asChild>
          <Button
            className="rounded-full"
            size="icon"
            variant={'ghost'}
          >
            <Share size={14} />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle id="share-dialog-title">Share & Collaborate</DialogTitle>
            <DialogDescription id="share-dialog-description">
              Invite other QCX users to view and append to this chat in real-time.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCollaborator} className="flex items-center gap-2 mt-4">
            <input
              type="text"
              placeholder="Email or Clerk user ID"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              className="flex-1 min-w-0 bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending || !emailInput.trim()} size="sm">
              {isPending ? <Spinner /> : <><UserPlus className="mr-2" size={14} /> Invite</>}
            </Button>
          </form>

          <div className="mt-6">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Collaborators ({participants.length})
            </h4>
            {isLoadingParticipants ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                No collaborators invited yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {participants.map(p => (
                  <div key={p.userId} className="flex items-center justify-between p-2 bg-muted/50 border border-border/40 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCollaborator(p.userId)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove Collaborator"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ChatShare
