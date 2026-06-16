import { createContext, useContext } from 'react';
import type { Entry } from './dictionary';

interface EntryContextValue {
  entry: Entry | null;
  setEntry: (entry: Entry | null) => void;
  crossRef: boolean;
  setCrossRef: (v: boolean) => void;
  panelOpen: boolean;
  togglePanel: () => void;
}

export const EntryContext = createContext<EntryContextValue>({
  entry: null,
  setEntry: () => {},
  crossRef: false,
  setCrossRef: () => {},
  panelOpen: false,
  togglePanel: () => {},
});

export const useEntry = () => useContext(EntryContext);
