'use client'

import { useState, useTransition } from 'react'
import { Button } from './ui/button'
import { Share } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
  DialogTitle
} from './ui/dialog'
import { shareChat } from '@/lib/actions/chat'
import { toast } from 'sonner'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import { Spinner } from './ui/spinner'

interface ChatShareProps {
  chatId: string
  className?: string
}

export function ChatShare({ chatId, className }: ChatShareProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const { copyToClipboard } = useCopyToClipboard({ timeout: 1000 })
  const [shareUrl, setShareUrl] = useState('')

  const handleShare = async () => {
    startTransition(async () => {
        const result = await shareChat(chatId)
        if (!result) {
          toast.error('Failed to share chat. Only owners can share chats.')
          return
        }

        const url = new URL(`/share/${chatId}`, window.location.href)
        setShareUrl(url.toString())
        copyToClipboard(url.toString())
        toast.success('Link copied to clipboard')
        setOpen(false)
    })
  }

  const handleCopy = () => {
    if (shareUrl) {
      copyToClipboard(shareUrl)
      toast.success('Link copied to clipboard')
      setOpen(false)
    } else {
      toast.error('No link to copy')
    }
  }

  return (
    <div className={className}>
      <Dialog
        open={open}
        onOpenChange={open => setOpen(open)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share link to search result</DialogTitle>
            <DialogDescription>
              Anyone with the link will be able to view this search result.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="items-center">
            {!shareUrl && (
              <Button onClick={handleShare} disabled={pending} size="sm">
                {pending ? <Spinner /> : 'Get link'}
              </Button>
            )}
            {shareUrl && (
              <Button onClick={handleCopy} disabled={pending} size="sm">
                {'Copy link'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
