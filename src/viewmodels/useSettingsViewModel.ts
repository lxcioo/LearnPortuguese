import { DiscordService } from '@/src/models/services/DiscordService';
import { UserProfileService } from '@/src/models/services/UserProfileService';
import { useTheme } from '@/src/views/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';

export function useSettingsViewModel() {
  const { isDarkMode, themeSetting, setThemeSetting, gender, setGender } = useTheme();
  const currentColors = {
    background: isDarkMode ? '#000' : '#F2F2F7',
    card: isDarkMode ? '#1C1C1E' : '#fff',
    text: isDarkMode ? '#fff' : '#000',
    secondaryText: isDarkMode ? '#EBEBF599' : '#3C3C4399',
    separator: isDarkMode ? '#38383A' : '#C6C6C8',
    accent: '#58cc02',
    destructive: '#FF453A',
  };

  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    UserProfileService.getUserProfile().then(profile => {
      if (profile) setName(profile.name);
    });
  }, []);

  const handleSaveName = async () => {
    if (name.trim()) {
      await UserProfileService.saveUserProfile(name.trim());
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) return;
    try {
      const senderName = name.trim() ? name.trim() : "Unbekannt (Gast)";
      await DiscordService.sendFeedback(senderName, feedback);
      Toast.show({ type: 'success', text1: 'Danke!', text2: 'Dein Feedback wurde erfolgreich gesendet.' });
      setFeedback('');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Fehler', text2: 'Senden fehlgeschlagen. Bitte überprüfe deine Internetverbindung.' });
    }
  };

  const performReset = async () => {
    setShowResetConfirm(false);
    try {
      await AsyncStorage.clear();
      Toast.show({ type: 'success', text1: 'Erfolg', text2: 'Alle Daten wurden zurückgesetzt. Bitte Neustarten.' });
    } catch (e) {
      console.error(e);
    }
  };

  const resetProgress = () => {
    setShowResetConfirm(true);
  };

  return {
    state: {
      name,
      feedback,
      showResetConfirm,
      isDarkMode,
      themeSetting,
      gender,
      currentColors,
    },
    actions: {
      setName,
      setFeedback,
      setShowResetConfirm,
      setThemeSetting,
      setGender,
      handleSaveName,
      submitFeedback,
      resetProgress,
      performReset,
    }
  };
}
