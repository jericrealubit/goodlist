import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { styleVariants, type StyleId } from '@/constants/style-variants';
import { themes, type ThemeId } from '@/constants/themes';

const THEME_STORAGE_KEY = 'goodlist.themeId';
const STYLE_STORAGE_KEY = 'goodlist.styleId';

type ThemeContextValue = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  styleId: StyleId;
  setStyleId: (id: StyleId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string | null): value is ThemeId {
  return !!value && value in themes;
}

function isStyleId(value: string | null): value is StyleId {
  return !!value && value in styleVariants;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeIdState] = useState<ThemeId>('classic');
  const [styleId, setStyleIdState] = useState<StyleId>('classic');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isThemeId(stored)) {
          setThemeIdState(stored);
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(STYLE_STORAGE_KEY)
      .then((stored) => {
        if (isStyleId(stored)) {
          setStyleIdState(stored);
        }
      })
      .catch(() => {});
  }, []);

  function setThemeId(id: ThemeId) {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {});
  }

  function setStyleId(id: StyleId) {
    setStyleIdState(id);
    AsyncStorage.setItem(STYLE_STORAGE_KEY, id).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, styleId, setStyleId }}>
      {children}
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

export function useSelectedStyle() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useSelectedStyle must be used within a ThemeProvider');
  }
  return { styleId: context.styleId, setStyleId: context.setStyleId };
}
