import * as Network from 'expo-network';
import { useCallback, useState } from 'react';

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

    return { messages, isLoading, error, sendMessage, setMessages, messageCount, MAX_MESSAGES_PER_DAY, initializeChat, resetChat };
};