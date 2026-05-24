import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
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
      const docDir = (FileSystem as any).documentDirectory;

      if (sound) await sound.unloadAsync();

      // FALLBACK: Wenn kein lokales Dateisystem existiert (z.B. im Web-Browser) -> Direkt streamen!
      if (!docDir) {
        console.log(`Kein Speicherzugriff. Streame direkt: ${audioUrl}`);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        setSound(newSound);
        return;
      }

      // NORMALER WEG: Auf dem Android-Gerät lokal speichern
      const localUri = `${docDir}${filename}.mp3`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);

      if (!fileInfo.exists) {
        const downloadResult = await FileSystem.downloadAsync(audioUrl, localUri);
        if (downloadResult.status !== 200) {
          console.error("Download fehlgeschlagen. Versuche direkten Stream...");
          // Notfall-Stream, falls der Download serverseitig abgelehnt wird
          const { sound: fallbackSound } = await Audio.Sound.createAsync(
            { uri: audioUrl }, { shouldPlay: true }
          );
          setSound(fallbackSound);
          return;
        }
      }

      // Abspielen der lokal gespeicherten Datei
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: localUri },
        { shouldPlay: true }
      );
      setSound(newSound);

    } catch (e) {
      console.error("Play Audio Error:", e);
    }
  };

  return { playAudio };
};