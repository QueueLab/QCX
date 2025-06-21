'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
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
import HistoryItem from '@/components/history-item'; // Adjust path if HistoryItem is moved or renamed
import type { Chat as DrizzleChat } from '@/lib/actions/chat-db'; // Use the Drizzle-based Chat type

interface ChatHistoryClientProps {
  // userId is no longer passed as prop; API route will use authenticated user
}

export function ChatHistoryClient({}: ChatHistoryClientProps) {
  const [chats, setChats] = useState<DrizzleChat[]>([]);
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
        // API route /api/chats uses getCurrentUserId internally
        const response = await fetch('/api/chats?limit=50&offset=0'); // Example limit/offset
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch chats: ${response.statusText}`);
        }
        const data: { chats: DrizzleChat[], nextOffset: number | null } = await response.json();
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
        // We need a new API endpoint for clearing history
        // Example: DELETE /api/chats (or POST /api/clear-history)
        // This endpoint will call clearHistory(userId) from chat-db.ts
        const response = await fetch('/api/chats/all', { // Placeholder for the actual clear endpoint
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to clear history');
        }

        toast.success('History cleared');
        setChats([]); // Clear chats from UI
        setIsAlertDialogOpen(false);
        router.refresh(); // Refresh to reflect changes, potentially redirect if on a chat page
        // Consider redirecting to '/' if current page is a chat that got deleted.
        // The old clearChats action did redirect('/');
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
    // Optionally provide a retry button
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
            // Assuming HistoryItem is adapted for DrizzleChat and expects chat.id and chat.title
            // Also, chat.path will need to be constructed, e.g., `/search/${chat.id}`
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
