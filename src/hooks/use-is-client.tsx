
'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook to determine if the component is mounted on the client.
 * This is useful to prevent hydration mismatches for components that
 * should only render on the client (e.g., those using browser-specific APIs).
 * @returns {boolean} `true` if the component is mounted on the client, otherwise `false`.
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
