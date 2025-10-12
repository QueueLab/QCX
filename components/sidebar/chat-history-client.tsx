'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import HistoryItem from '@/components/history-item';
import { type Chat } from '@/lib/types';

interface ChatHistoryClientProps {
}

export function ChatHistoryClient({}: ChatHistoryClientProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearPending, startClearTransition] = useTransition();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchChats() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/chats');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch chats: ${response.statusText}`);
        }
        const data: { chats: Chat[] } = await response.json();
        setChats(data.chats);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
          toast.error(`Error fetching chats: ${err.message}`);
        } else {
          setError('An unknown error occurred.');
          toast.error('Error fetching chats: An unknown error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchChats();
  }, []);

  const handleClearHistory = async () => {
    startClearTransition(async () => {
      try {
        const response = await fetch('/api/chats/all', {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to clear history');
        }

        toast.success('History cleared');
        setChats([]);
        setIsAlertDialogOpen(false);
        router.refresh();
      } catch (err) {
        if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error('An unknown error occurred while clearing history.');
        }
        setIsAlertDialogOpen(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 space-y-3 h-full items-center justify-center">
        <Spinner />
        <p className="text-sm text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 space-y-3 h-full items-center justify-center text-destructive">
        <p>Error loading chat history: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 space-y-3 h-full">
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {!chats?.length ? (
          <div className="text-foreground/30 text-sm text-center py-4">
            No search history
          </div>
        ) : (
          chats.map((chat) => (
            <HistoryItem key={chat.id} chat={{...chat, path: `/search/${chat.id}`}} />
          ))
        )}
      </div>
      <div className="mt-auto">
        <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full" disabled={!chats?.length || isClearPending}>
              {isClearPending ? <Spinner /> : 'Clear History'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                chat history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isClearPending} onClick={() => setIsAlertDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isClearPending}
                onClick={(event) => {
                  event.preventDefault();
                  handleClearHistory();
                }}
              >
                {isClearPending ? <Spinner /> : 'Clear'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
