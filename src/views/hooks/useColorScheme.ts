import { useTheme } from '@/src/views/context/ThemeContext';

export function useColorScheme() {
  const { theme } = useTheme();
  return theme;
}