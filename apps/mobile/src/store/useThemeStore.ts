import { create } from 'zustand';
import { darkColors, lightColors, ThemeColors } from '../theme/colors';

interface ThemeState {
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: true, // Default to Infernux luxury dark mode
  colors: darkColors,
  toggleTheme: () =>
    set((state) => ({
      isDarkMode: !state.isDarkMode,
      colors: !state.isDarkMode ? darkColors : lightColors,
    })),
  setDarkMode: (isDark) =>
    set({
      isDarkMode: isDark,
      colors: isDark ? darkColors : lightColors,
    }),
}));

