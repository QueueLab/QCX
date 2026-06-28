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
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useHistoryToggle } from '../history-toggle-context';
import HistoryItem from '@/components/history-item'; // Adjust path if HistoryItem is moved or renamed
import type { Chat as DrizzleChat } from '@/lib/actions/chat-db'; // Use the Drizzle-based Chat type
import { UsageSummary } from '@/lib/types';

interface ChatHistoryClientProps {
  // userId is no longer passed as prop; API route will use authenticated user
}

export function ChatHistoryClient({}: ChatHistoryClientProps) {
  const [chats, setChats] = useState<DrizzleChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearPending, startClearTransition] = useTransition();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isCreditsVisible, setIsCreditsVisible] = useState(false);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const { isHistoryOpen } = useHistoryToggle();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [chatsRes, usageRes] = await Promise.all([
          fetch('/api/chats?limit=50&offset=0'),
          fetch('/api/usage')
        ]);

        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          setChats(chatsData.chats);
        }

        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsageSummary(usageData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (isHistoryOpen) {
      fetchData();
    }
  }, [isHistoryOpen]);

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
        setChats([]); // Clear chats from UI
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

  const totalCredits = 500;
  const usedCredits = usageSummary ? Math.ceil(usageSummary.totalCost * 100) : 0;
  const availableCredits = Math.max(0, totalCredits - usedCredits);
  const percentage = Math.min(100, (availableCredits / totalCredits) * 100);

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
      <div className="px-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground"
          onClick={() => setIsCreditsVisible(!isCreditsVisible)}
        >
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-yellow-500" />
            <span className="text-xs font-medium">Credits Preview</span>
          </div>
          {isCreditsVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>

        {isCreditsVisible && (
          <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span>Available Credits</span>
              <span className="font-bold">{availableCredits}</span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-yellow-500 h-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {usedCredits} credits used (${usageSummary?.totalCost.toFixed(4)} USD)
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {!chats?.length ? (
          <div className="text-foreground/30 text-sm text-center py-4">
            No search history
          </div>
        ) : (
          chats.map((chat) => (
            <HistoryItem key={chat.id} chat={{...chat, path: `/search/${chat.id}` }} />
          ))
        )}
      </div>
      <div className="mt-auto">
        <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full" disabled={!chats?.length || isClearPending} data-testid="clear-history-button">
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
              <AlertDialogCancel disabled={isClearPending} onClick={() => setIsAlertDialogOpen(false)} data-testid="clear-history-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isClearPending}
                onClick={(event) => {
                  event.preventDefault();
                  handleClearHistory();
                }}
                data-testid="clear-history-confirm"
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
