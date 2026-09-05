import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

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

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isThemeId(stored)) {
          setThemeIdState(stored);
        }
      })
      .catch(() => {});
  }, []);

  function setThemeId(id: ThemeId) {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {});
  }

  return <ThemeContext.Provider value={{ themeId, setThemeId }}>{children}</ThemeContext.Provider>;
}

export function useSelectedTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useSelectedTheme must be used within a ThemeProvider');
  }
  return context;
}
