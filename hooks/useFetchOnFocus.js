// hooks/useFetchOnFocus.js
import { useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Runs a fetch function once on mount (with loading)
 * and silently when screen regains focus.
 *
 * Prevents continuous re-renders or refetch loops.
 */
export const useFetchOnFocus = (fetchFunction) => {
  const hasFetchedOnce = useRef(false);

  // Run once on mount
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await fetchFunction(true);
      if (isMounted) hasFetchedOnce.current = true;
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []); // ⚠️ No dependencies — only runs once

  // Run when screen comes into focus (after navigating back)
  useFocusEffect(() => {
    if (hasFetchedOnce.current) {
      fetchFunction(false);
    }
    // Returning empty cleanup function
    return () => {};
  });
};
