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
      // TypeScript-Bypass: Wir zwingen TS hier (als "any"), den Wert zu akzeptieren.
      // Zur Laufzeit auf dem Smartphone existiert documentDirectory garantiert.
      const docDir = (FileSystem as any).documentDirectory;

      if (!docDir) {
        console.error("Fehler: Kein Zugriff auf das lokale Dateisystem.");
        return;
      }

      // 2. Pfad zusammenbauen
      const localUri = `${docDir}${filename}.mp3`;

      // 3. Datei-Info abrufen
      const fileInfo = await FileSystem.getInfoAsync(localUri);

      if (!fileInfo.exists) {
        console.log(`Audiodatei nicht gefunden. Lade ${filename}.mp3 herunter...`);
        const audioUrl = `${BASE_URL}/audio/${filename}.mp3`;

        // 4. Herunterladen
        const downloadResult = await FileSystem.downloadAsync(audioUrl, localUri);

        if (downloadResult.status !== 200) {
          console.error("Fehler beim Download der Audiodatei. URL:", audioUrl);
          return; // Abbruch, falls die Datei auf dem Server nicht existiert
        }
      } else {
        console.log(`Spiele Offline-Datei ab: ${filename}.mp3`);
      }

      if (sound) await sound.unloadAsync();

      // 5. Abspielen
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