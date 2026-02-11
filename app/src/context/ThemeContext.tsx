import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

// Wir erweitern den Typ um 'divers' ('d'), 'male' ('m'), 'female' ('f')
type Gender = 'm' | 'f' | 'd' | null;
type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  isDarkMode: boolean;
  gender: Gender;
  setGender: (g: Gender) => void;
  isLoading: boolean; // Um zu wissen, ob wir noch Daten laden
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDarkMode: false,
  gender: null,
  setGender: () => {},
  isLoading: true,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useSystemColorScheme();
  const [theme, setTheme] = useState<Theme>('light');
  const [gender, setGenderState] = useState<Gender>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 1. Theme laden
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme) {
          setTheme(savedTheme as Theme);
        } else {
          setTheme(systemScheme === 'dark' ? 'dark' : 'light');
        }

        // 2. Gender laden
        const savedGender = await AsyncStorage.getItem('userGender');
        if (savedGender) {
          setGenderState(savedGender as Gender);
        }
      } catch (e) {
        console.error("Settings loading error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('userTheme', newTheme);
    } catch (e) {
      console.error("Theme saving error", e);
    }
  };

  const setGender = async (g: Gender) => {
    setGenderState(g);
    try {
      if (g) {
        await AsyncStorage.setItem('userGender', g);
      } else {
        await AsyncStorage.removeItem('userGender');
      }
    } catch (e) {
      console.error("Gender saving error", e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode: theme === 'dark', gender, setGender, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);