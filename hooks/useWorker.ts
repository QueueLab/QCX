import { useState, useEffect, useRef } from 'react';

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
    // Create a new worker instance
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

    // Cleanup worker on component unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [workerUrl]);

  const postMessage = (messageData: any) => {
    if (workerRef.current) {
      setIsLoading(true);
      setError(null);
      setData(null);
      workerRef.current.postMessage(messageData);
    }
  };

  return { postMessage, data, error, isLoading };
}
