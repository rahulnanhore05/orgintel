import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value by delayMs.
 */
export function useDebounce(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
