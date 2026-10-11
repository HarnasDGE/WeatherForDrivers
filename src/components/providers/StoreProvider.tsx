import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { getStore, initClientStore } from '@/store';

/**
 * Wrap every island's root with this: all islands get the same module-level store (getStore),
 * and the first one to mount hydrates it from localStorage.
 */
export default function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initClientStore();
  }, []);

  return <Provider store={getStore()}>{children}</Provider>;
}
