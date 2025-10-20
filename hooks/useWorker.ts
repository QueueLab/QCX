import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

type UseWorkerReturnType<T> = {
  postMessage: (data: any) => void;
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

export function useWorker<T>(workerUrl: URL): UseWorkerReturnType<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(workerUrl, { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<T>) => {
      setData(event.data);
      setIsLoading(false);
    };

    worker.onerror = (err: ErrorEvent) => {
      setError(err.message);
      setIsLoading(false);
    };

    worker.onmessageerror = (err: MessageEvent) => {
      setError('Worker message deserialization error');
      setIsLoading(false);
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [workerUrl]);

  const postMessage = useCallback((messageData: any) => {
    if (workerRef.current) {
      setIsLoading(true);
      setError(null);
      setData(null);
      workerRef.current.postMessage(messageData);
    }
  }, []);

  return useMemo(() => ({
    postMessage,
    data,
    error,
    isLoading
  }), [postMessage, data, error, isLoading]);
}
