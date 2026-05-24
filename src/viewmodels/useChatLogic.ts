import * as Network from 'expo-network';
import { useCallback, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { DiscordService } from '@/src/models/services/DiscordService';

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

export const useChatLogic = (userName: string, userGender: string | null, topic: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Kostenkontrolle: Maximal 15 Nachrichten pro Tag
    const [messageCount, setMessageCount] = useState(0);
    const MAX_MESSAGES_PER_DAY = 50;

    // TTS Audio State
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    // Audio initialisieren
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

    const playAudioMessage = async (messageId: string, text: string) => {
        if (loadingAudioId === messageId) return; // Verhindert mehrfaches Klicken
        
        try {
            setLoadingAudioId(messageId);
            
            // Falls aktuell ein anderes Audio läuft, stoppen
            if (sound) {
                await sound.unloadAsync();
                setPlayingAudioId(null);
            }

            // Text bereinigen (Markdown & Emojis entfernen, da sie das API-Limit belasten)
            const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').replace(/[*_]/g, '').trim();
            
            // Google TTS hat ein Limit von ca. 200 Zeichen. Wir teilen den Text in Chunks von max 150 Zeichen.
            const words = cleanText.split(/\s+/);
            const chunks: string[] = [];
            let currentChunk = '';
            
            for (const word of words) {
                if (currentChunk.length + word.length + 1 > 150) {
                    chunks.push(currentChunk);
                    currentChunk = word;
                } else {
                    currentChunk = currentChunk ? currentChunk + ' ' + word : word;
                }
            }
            if (currentChunk) chunks.push(currentChunk);

            setLoadingAudioId(null);
            setPlayingAudioId(messageId);

            // Sequentielles Abspielen der Chunks
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!chunk.trim()) continue;
                
                const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=pt-PT&client=tw-ob`;

                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: url },
                    { shouldPlay: true }
                );
                
                setSound(newSound);
                
                // Warten, bis der aktuelle Chunk fertig abgespielt ist
                await new Promise((resolve) => {
                    newSound.setOnPlaybackStatusUpdate((status) => {
                        // Wenn der Chunk zu Ende ist oder es einen Fehler gibt, weiter zum nächsten
                        if (status.isLoaded && status.didJustFinish) {
                            resolve(true);
                        } else if (!status.isLoaded && status.error) {
                            resolve(true); // Trotzdem weiter, damit die App nicht hängt
                        }
                    });
                });
            }

            setPlayingAudioId(null);

        } catch (e: any) {
            console.error("Play Audio Error:", e);
            const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
            setError(`Audio Fehler: ${errorMsg}`);
            
            try {
                const errorStack = e instanceof Error ? e.stack : 'N/A';
                await DiscordService.sendFeedback("AudioDebugger", `TTS Fehler aufgetreten:\n${errorMsg}\n\nStack:\n${errorStack}`);
            } catch (discordErr) {
                console.log("Konnte Fehler nicht an Discord senden", discordErr);
            }
        } finally {
            if (loadingAudioId === messageId) setLoadingAudioId(null);
        }
    };

    const resetChat = useCallback(() => {
        setMessages([]);
        setError(null);
        setIsLoading(false);
    }, []);

    const initializeChat = useCallback(async (currentTopic: string) => {
        if (messageCount >= MAX_MESSAGES_PER_DAY) {
            setError("Du hast dein tägliches Limit an Chat-Nachrichten erreicht.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const networkState = await Network.getNetworkStateAsync();
            if (!networkState.isConnected || !networkState.isInternetReachable) {
                throw new Error("Keine Internetverbindung. Bitte prüfe dein Netzwerk.");
            }

            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() || "";
            if (!apiKey) {
                throw new Error("API-Key fehlt in der .env Datei!");
            }

            const genderText = userGender === 'm' ? 'männlich' : userGender === 'f' ? 'weiblich' : 'neutral';
            
            const prompt = `Du bist ein persönlicher, geduldiger Tutor für europäisches Portugiesisch. Dein Lernender heißt "${userName || 'Lernender'}" und bevorzugt die Anrede für das Geschlecht ${genderText}. Dein Ziel ist es, in einem natürlichen Chat über das Thema "${currentTopic}" zu üben.

Deine Regeln:
Fokus: Bleibe strikt beim gewählten Thema.
Tonalität & Stil: Modern, motivierend, einladend, natürlich und umgangssprachlich. Verwende alltägliches europäisches Portugiesisch (z.B. schreibe "alguma coisa" anstelle des formelleren "algo", nutze "estar a + infinitiv").

AUFGABE: Beginne nun das Gespräch! Schreibe die allererste Nachricht an den Lernenden auf Portugiesisch. Begrüße ihn freundlich mit seinem Vornamen ("${userName || 'Lernender'}") und stelle eine einfache, offene Frage zum Thema "${currentTopic}", um ihn zum Schreiben zu animieren.`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7 }
                })
            });

            if (!response.ok) throw new Error(`API Fehler ${response.status}`);

            const data = await response.json();
            const answerText = data.candidates[0].content.parts[0].text;

            setMessages([{ id: Date.now().toString(), role: 'model', text: answerText }]);
            setMessageCount(prev => prev + 1);
        } catch (e: any) {
            setError(e.message || "Ein Fehler ist beim Starten des Chats aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    }, [userName, userGender, messageCount]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        if (messageCount >= MAX_MESSAGES_PER_DAY) {
            setError("Du hast dein tägliches Limit an Chat-Nachrichten erreicht.");
            return;
        }

        const newUserMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text.trim()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);
        setError(null);

        try {
            const networkState = await Network.getNetworkStateAsync();
            if (!networkState.isConnected || !networkState.isInternetReachable) {
                throw new Error("Keine Internetverbindung. Bitte prüfe dein Netzwerk.");
            }

            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() || "";
            if (!apiKey) {
                throw new Error("API-Key fehlt in der .env Datei!");
            }

            const genderText = userGender === 'm' ? 'männlich' : userGender === 'f' ? 'weiblich' : 'neutral';
            
            // Behalte nur die letzten 10 Nachrichten für den Kontext im Memory
            const recentMessages = messages.slice(-10);
            
            const prompt = `Du bist ein persönlicher, geduldiger Tutor für europäisches Portugiesisch. Dein Lernender heißt "${userName || 'Lernender'}" und bevorzugt die Anrede für das Geschlecht ${genderText}. Dein Ziel ist es, in einem natürlichen Chat über das Thema "${topic}" zu üben.

Deine Regeln:
Fokus: Bleibe strikt beim gewählten Thema. Wenn der Nutzer zu stark abweicht, lenke ihn freundlich zurück.
Korrektur: Wenn der Nutzer grammatikalische Fehler macht, verbessere ihn nett und erkläre kurz warum.
Hilfe-Hierarchie: Wenn der Nutzer eine Frage nicht versteht:
Schritt 1: Umschreibe die Frage auf einfachem Portugiesisch.
Schritt 2: Wenn das nicht hilft, gib einen Hinweis auf Deutsch.
Schritt 3 (Notfall): Übersetze den Kernsatz ins Deutsche.
Tonalität & Stil: Modern, motivierend, einladend, natürlich und umgangssprachlich. Verwende alltägliches europäisches Portugiesisch (z.B. schreibe "alguma coisa" anstelle des formelleren "algo", nutze "estar a + infinitiv"). Sprich den Lernenden hin und wieder mit seinem Namen ("${userName || 'Lernender'}") an.

Bisheriger Verlauf:
${recentMessages.map(m => `${m.role === 'user' ? (userName || 'Lernender') : 'Tutor'}: ${m.text}`).join('\n')}
${userName || 'Lernender'}: ${text}
Tutor:`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7 }
                })
            });

            if (!response.ok) throw new Error(`API Fehler ${response.status}`);

            const data = await response.json();
            const answerText = data.candidates[0].content.parts[0].text;

            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: answerText }]);
            setMessageCount(prev => prev + 1);
        } catch (e: any) {
            setError(e.message || "Ein Fehler ist bei der KI-Antwort aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    }, [messages, userName, userGender, topic, messageCount]);

    return { 
        messages, 
        isLoading, 
        error, 
        sendMessage, 
        setMessages, 
        messageCount, 
        MAX_MESSAGES_PER_DAY, 
        initializeChat, 
        resetChat,
        playAudioMessage,
        loadingAudioId,
        playingAudioId
    };
};