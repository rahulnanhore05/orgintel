import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to safely poll an asynchronous operation with cleanup on unmount.
 */
export function usePolling(asyncFn, options = {}) {
  const {
    enabled = false,
    intervalMs = 3000,
    isTerminal = () => false,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const pollRef = useRef(null);

  const runPoll = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const result = await asyncFn();
      if (!isMountedRef.current) return;

      setData(result);
      setError(null);

      if (isTerminal(result)) {
        setIsPolling(false);
        onSuccess?.(result);
        return;
      }

      timeoutRef.current = setTimeout(() => {
        pollRef.current?.();
      }, intervalMs);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err);
      onError?.(err);
      setIsPolling(false);
    }
  }, [asyncFn, intervalMs, isTerminal, onSuccess, onError]);

  useEffect(() => {
    pollRef.current = runPoll;
  }, [runPoll]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      const timer = setTimeout(() => {
        setIsPolling(true);
        runPoll();
      }, 0);
      return () => {
        clearTimeout(timer);
        clearTimeout(timeoutRef.current);
      };
    } else {
      clearTimeout(timeoutRef.current);
    }

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutRef.current);
    };
  }, [enabled, runPoll]);

  const stop = useCallback(() => {
    setIsPolling(false);
    clearTimeout(timeoutRef.current);
  }, []);

  return { data, error, isPolling, stop };
}
