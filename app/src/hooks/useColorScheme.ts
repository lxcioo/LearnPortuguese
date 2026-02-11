import { useTheme } from '@/app/src/context/ThemeContext';

export function useColorScheme() {
  const { theme } = useTheme();
  return theme;
}