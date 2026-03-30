import { useTheme } from '@/src/view/context/ThemeContext';

export function useColorScheme() {
  const { theme } = useTheme();
  return theme;
}