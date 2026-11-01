import { useSyncExternalStore } from 'react';
import { store } from '../lib/store';

/** Subscribe a component to the page store; returns the (mutable) store instance. */
export function useStore() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}
