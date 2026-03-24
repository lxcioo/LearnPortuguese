// src/services/DiscordService.ts
import { Platform } from 'react-native';

const WEBHOOK_URL = process.env.EXPO_PUBLIC_DISCORD_WEBHOOK_URL;

export const DiscordService = {

    async sendCrashReport(error: Error) {
        if (!WEBHOOK_URL) {
            console.warn("Discord Webhook URL fehlt in der .env Datei");
            return;
        }

        const osName = Platform.OS === 'ios' ? '🍏 iOS' : Platform.OS === 'android' ? '🤖 Android' : '💻 Web/Andere';
        const discordMessage = `**🚨 APP ABSTURZ ABGEFANGEN 🚨**\n**Gerät:** ${osName}\n\n**Fehlermeldung:**\n> ${error.message}\n\n**Stacktrace:**\n\`\`\`javascript\n${error.stack ? error.stack.substring(0, 1000) : 'Kein Stacktrace'}\n\`\`\``;

        try {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: discordMessage })
            });
            console.log("Crash erfolgreich an Discord gemeldet.");
        } catch (e) {
            console.error("Konnte Crash nicht an Discord senden:", e);
        }
    },

    async sendFeedback(senderName: string, feedback: string) {
        if (!WEBHOOK_URL) {
            throw new Error("Discord Webhook URL fehlt in der .env Datei");
        }

        const osName = Platform.OS === 'ios' ? '🍏 iOS' : Platform.OS === 'android' ? '🤖 Android' : '💻 Web/Andere';
        const discordMessage = `**💡 Neues Feedback**\n**Von:** ${senderName}\n**Gerät:** ${osName}\n\n**Nachricht:**\n> ${feedback}`;

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: discordMessage })
        });

        if (!response.ok) {
            throw new Error("Fehler beim Senden an Discord");
        }
    }
};