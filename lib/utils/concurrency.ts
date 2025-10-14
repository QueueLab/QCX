export async function runWithConcurrencyLimit<T>(limit: number, tasks: Array<() => Promise<T>>): Promise<PromiseSettledResult<T>[]> {
  if (limit <= 0) limit = 1;
  const results: PromiseSettledResult<T>[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      const task = tasks[current];
      try {
        const value = await task();
        results[current] = { status: 'fulfilled', value } as PromiseFulfilledResult<T>;
      } catch (reason) {
        results[current] = { status: 'rejected', reason } as PromiseRejectedResult;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function withBudget<T>(options: { maxMs: number; signal?: AbortSignal }, task: () => Promise<T>): Promise<T> {
  const { maxMs, signal } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('budget_exceeded')), maxMs);
  });

  if (signal) {
    if (signal.aborted) throw new Error('aborted');
    signal.addEventListener('abort', () => {
      if (timeoutId) clearTimeout(timeoutId);
    }, { once: true });
  }

  try {
    return await Promise.race([task(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function tokenGate(start: () => number, threshold: number, fn: () => Promise<void>): Promise<void> {
  if (start() >= threshold) {
    await fn();
    return;
  }
  // Poll lightly until threshold reached
  await new Promise<void>((resolve) => {
    const id = setInterval(async () => {
      if (start() >= threshold) {
        clearInterval(id);
        resolve();
      }
    }, 50);
  });
  await fn();
}


