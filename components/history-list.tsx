import React, { cache } from 'react';
import HistoryItem from './history-item';
import { ClearHistory } from './clear-history';
import { getChats } from '@/lib/actions/chat';
import { type Chat } from '@/lib/types';

type HistoryListProps = {
  userId?: string;
};

const loadChats = cache(async (userId?: string): Promise<Chat[] | null> => {
  return await getChats(userId);
});

export async function HistoryList({ userId }: HistoryListProps) {
  try {
    const chats = await loadChats(userId);

    if (!chats) {
      return (
        <div className="flex flex-col flex-1 space-y-3 h-full">
          <div className="text-foreground/30 text-sm text-center py-4">
            Failed to load search history
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 space-y-3 h-full">
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {!chats.length ? (
            <div className="text-foreground/30 text-sm text-center py-4">
              No search history
            </div>
          ) : (
            chats.map((chat: Chat) => (
              <HistoryItem
                key={chat.id}
                chat={{
                  ...chat,
                  path: `/search/${chat.id}`,
                }}
              />
            ))
          )}
        </div>
        <div className="mt-auto">
          <ClearHistory empty={!chats.length} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Failed to load chats:', error);
    return (
      <div className="flex flex-col flex-1 space-y-3 h-full">
        <div className="text-foreground/30 text-sm text-center py-4">
          Error loading search history
        </div>
      </div>
    );
  }
}
