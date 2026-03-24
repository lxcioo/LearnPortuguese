import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

// Wir erweitern den Typ um 'divers' ('d'), 'male' ('m'), 'female' ('f')
type Gender = 'm' | 'f' | 'd' | null;
type ThemeSetting = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

type ThemeContextType = {
  theme: ActiveTheme; // Das berechnete, aktive Theme (für die Farben)
  themeSetting: ThemeSetting; // Die gewählte Einstellung des Nutzers
  setThemeSetting: (setting: ThemeSetting) => void;
  isDarkMode: boolean;
  gender: Gender;
  setGender: (g: Gender) => void;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  themeSetting: 'system',
  setThemeSetting: () => { },
  isDarkMode: false,
  gender: null,
  setGender: () => { },
  isLoading: true,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useSystemColorScheme();
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>('system');
  const [gender, setGenderState] = useState<Gender>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme) {
          setThemeSettingState(savedTheme as ThemeSetting);
        }

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

  const setThemeSetting = async (setting: ThemeSetting) => {
    setThemeSettingState(setting);
    try {
      await AsyncStorage.setItem('userTheme', setting);
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

  // Logik: Wenn auf System, nutze das OS-Theme, ansonsten die feste Wahl
  const activeTheme: ActiveTheme = themeSetting === 'system' ? (systemScheme || 'light') : themeSetting;

  return (
    <ThemeContext.Provider value={{
      theme: activeTheme,
      themeSetting,
      setThemeSetting,
      isDarkMode: activeTheme === 'dark',
      gender,
      setGender,
      isLoading
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);