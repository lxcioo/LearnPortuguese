import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface VocabWord {
    text: string;
    translation: string;
}

interface InteractiveTextProps {
    sentence: string;
    vocabulary?: VocabWord[];
    exerciseId: string;
    playAudio: (id: string) => void;
    textColor: string;
    highlightColor: string;
}

// Hilfsfunktion für Satzzeichen-sicheres Suchen
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function InteractiveText({ sentence, vocabulary, exerciseId, playAudio, textColor, highlightColor }: InteractiveTextProps) {
    const [activeVocabId, setActiveVocabId] = useState<string | null>(null);

    if (!vocabulary || vocabulary.length === 0) {
        return <Text style={[styles.text, { color: textColor }]}>{sentence}</Text>;
    }

    // SCHRITT 1: Vokabeln markieren
    let markedText = sentence;
    const sortedVocab = [...vocabulary]
        .map((vocab, originalIndex) => ({ ...vocab, originalIndex }))
        .sort((a, b) => b.text.length - a.text.length);

    sortedVocab.forEach((vocab, vIndex) => {
        // "Auf Wiedersehen" wird aufgeteilt in einzelne Platzhalter: "___V1_P0___ ___V1_P1___"
        const parts = vocab.text.split(/\s+/);
        const replacement = parts.map((_, pIndex) => `___V${vIndex}_P${pIndex}___`).join(' ');

        const regex = new RegExp(`(${escapeRegExp(vocab.text)})`, 'g');
        markedText = markedText.replace(regex, replacement);
    });

    // SCHRITT 2: Den Satz in natürliche Wort-Blöcke zerschneiden
    // Hier trennen wir an echten Leerzeichen. So bleibt z. B. "'Tschüss'?" ein zusammenhängender Block!
    const rawWords = markedText.split(/\s+/).filter(w => w.trim().length > 0);

    const handlePress = (vocabItem: any, id: string) => {
        if (activeVocabId === id) {
            setActiveVocabId(null);
            return;
        }

        setActiveVocabId(id);
        playAudio(`${exerciseId}_vocab_${vocabItem.originalIndex}`);

        setTimeout(() => {
            setActiveVocabId(current => current === id ? null : current);
        }, 3000);
    };

    return (
        <View style={styles.container}>
            {rawWords.map((rawWord, index) => {

                // Innerhalb eines Wort-Blocks schauen wir, ob ein Vokabel-Platzhalter steckt
                const parts = rawWord.split(/(___V\d+_P\d+___)/).filter(p => p !== '');

                // Z-Index Logik: Das aktive Wort muss ganz vorne liegen, damit sein Pop-up nicht überlagert wird
                const isBlockActive = parts.some(p => {
                    const match = p.match(/^___V(\d+)_P(\d+)___$/);
                    return match && activeVocabId === `v_${match[1]}`;
                });

                return (
                    <View
                        key={`word-${index}`}
                        style={[styles.wordBlock, { zIndex: isBlockActive ? 100 : 1 }]}
                    >
                        {parts.map((part, pIdx) => {
                            const match = part.match(/^___V(\d+)_P(\d+)___$/);

                            if (match) {
                                // Es ist eine interaktive Vokabel
                                const vIndex = parseInt(match[1]);
                                const pIndex = parseInt(match[2]);
                                const vocabItem = sortedVocab[vIndex];

                                // Wir holen uns exakt das Wort aus der Vokabel zurück
                                const wordText = vocabItem.text.split(/\s+/)[pIndex];
                                const isActive = activeVocabId === `v_${vIndex}`;

                                return (
                                    <View key={`vocab-${pIdx}`} style={styles.interactiveAnchor}>

                                        {/* DAS POP-UP: 100% zentriert, passt sich dem Text an, verschiebt das Layout nicht! */}
                                        {isActive && (
                                            <View style={styles.tooltipAbsoluteWrapper} pointerEvents="none">
                                                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.tooltipContent}>
                                                    <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                                        <Text style={styles.tooltipText}>{vocabItem.translation}</Text>
                                                    </View>
                                                    <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                                                </Animated.View>
                                            </View>
                                        )}

                                        {/* Das klickbare Wort */}
                                        <TouchableOpacity activeOpacity={0.6} onPress={() => handlePress(vocabItem, `v_${vIndex}`)}>
                                            <Text style={[
                                                styles.text,
                                                styles.interactiveWordText,
                                                {
                                                    color: highlightColor,
                                                    textDecorationLine: 'underline',
                                                    textDecorationStyle: 'dotted',
                                                    textDecorationColor: highlightColor
                                                }
                                            ]}>
                                                {wordText}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            } else {
                                // Es ist ein normales Satzzeichen oder Wort (z. B. "Wie" oder "?")
                                return <Text key={`text-${pIdx}`} style={[styles.text, { color: textColor }]}>{part}</Text>;
                            }
                        })}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-start',
        rowGap: 10,     // Zeilenabstand beim Umbruch
        columnGap: 8,   // Perfekter Wortabstand (ersetzt die Leerzeichen)
        paddingTop: 45, // Puffer für das Pop-up nach oben
    },
    wordBlock: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    interactiveAnchor: {
        position: 'relative',
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    // Pop-up Styles
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        width: 200,          // Große feste Breite verhindert den Android "Säulen-Bug"
        left: '50%',         // Startet exakt in der Mitte des Wortes
        marginLeft: -100,    // Zieht den Container um genau die Hälfte zurück -> 100% zentriert
        alignItems: 'center',// Zwingt die grüne Box, nur so breit zu werden wie der Text darin!
        marginBottom: 4,
    },
    tooltipContent: {
        alignItems: 'center',
    },
    tooltip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 50,
    },
    tooltipText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
        textAlign: 'center',
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    }
});