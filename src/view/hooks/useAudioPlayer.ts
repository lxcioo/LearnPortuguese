import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';

const BASE_URL = 'https://lxcioo.github.io/LearnPortuguese';

export const useAudioPlayer = () => {
  const [sound, setSound] = useState<Audio.Sound | undefined>();

  // Initiale Konfiguration (iOS Silent Mode Fix)
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.error("Audio Config Error:", e);
      }
    };
    configureAudio();
  }, []);

  // Cleanup beim Verlassen
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const playAudio = async (filename: string) => {
    try {
      const audioUrl = `${BASE_URL}/audio/${filename}.mp3`;
      if (sound) await sound.unloadAsync();
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (e) {
      console.error("Play Audio Error:", e);
    }
  };

  return { playAudio };
};