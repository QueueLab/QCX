'use client';

import React from 'react';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <h1 className="text-4xl font-bold mb-4 text-primary">You are offline</h1>
      <p className="text-lg text-muted-foreground max-w-md">
        It looks like you don't have an active internet connection.
        Some features of QCX may be unavailable until you're back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
      >
        Retry Connection
      </button>
    </div>
  );
}
