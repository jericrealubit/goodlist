import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { ThemeTransition } from '@/components/theme-transition';
import { themes, type ThemeId } from '@/constants/themes';

const THEME_STORAGE_KEY = 'goodlist.themeId';

type ThemeContextValue = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string | null): value is ThemeId {
  return !!value && value in themes;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeIdState] = useState<ThemeId>('minimalSage');
  const [switching, setSwitching] = useState(false);
  // Read by the stable setThemeId below so it can ignore a re-tap of the
  // current theme without taking themeId as a dependency — which would give
  // every consumer a new context value on each render.
  const themeIdRef = useRef(themeId);
  themeIdRef.current = themeId;

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isThemeId(stored)) {
          setThemeIdState(stored);
        }
      })
      .catch(() => {});
  }, []);

  // Only a deliberate switch animates. Restoring the stored theme on launch
  // sets state directly above, so the veil never flashes over a cold start.
  const setThemeId = useCallback((id: ThemeId) => {
    if (themeIdRef.current === id) return;
    setSwitching(true);
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {});
  }, []);

  const handleTransitionFinish = useCallback(() => setSwitching(false), []);

  const value = useMemo(() => ({ themeId, setThemeId }), [themeId, setThemeId]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <ThemeTransition active={switching} onFinish={handleTransitionFinish} />
    </ThemeContext.Provider>
  );
}

export function useSelectedTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useSelectedTheme must be used within a ThemeProvider');
  }
  return context;
}
