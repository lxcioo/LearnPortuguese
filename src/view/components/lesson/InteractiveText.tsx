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

// Hilfsfunktion: Schützt vor Abstürzen bei Sonderzeichen
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function InteractiveText({ sentence, vocabulary, exerciseId, playAudio, textColor, highlightColor }: InteractiveTextProps) {
    const [activeVocabId, setActiveVocabId] = useState<string | null>(null);

    if (!vocabulary || vocabulary.length === 0) {
        return <Text style={[styles.text, { color: textColor }]}>{sentence}</Text>;
    }

    // SCHRITT 1: Vokabeln im Text markieren
    let markedText = sentence;
    const sortedVocab = [...vocabulary]
        .map((vocab, originalIndex) => ({ ...vocab, originalIndex }))
        .sort((a, b) => b.text.length - a.text.length);

    sortedVocab.forEach((vocab, vIndex) => {
        // "Auf Wiedersehen" wird aufgeteilt: Jedes Einzelwort bekommt seine eigene ID!
        const parts = vocab.text.split(/\s+/);
        const replacement = parts.map((_, pIndex) => `___V${vIndex}_P${pIndex}___`).join(' ');

        const regex = new RegExp(`(${escapeRegExp(vocab.text)})`, 'g');
        markedText = markedText.replace(regex, replacement);
    });

    // SCHRITT 2: Den Satz in natürliche Blöcke zerteilen
    const rawWords = markedText.split(/\s+/).filter(w => w.trim().length > 0);

    const handlePress = (vocabItem: any, exactId: string) => {
        if (activeVocabId === exactId) {
            setActiveVocabId(null);
            return;
        }

        setActiveVocabId(exactId);
        playAudio(`${exerciseId}_vocab_${vocabItem.originalIndex}`);

        setTimeout(() => {
            setActiveVocabId(current => current === exactId ? null : current);
        }, 3000);
    };

    return (
        <View style={styles.container}>
            {rawWords.map((rawWord, index) => {

                // Trennt den String in Vokabel-Teile und Satzzeichen
                const parts = rawWord.split(/(___V\d+_P\d+___)/).filter(p => p !== '');

                // Z-Index: Das aktive Wort liegt immer oben
                const isBlockActive = parts.some(p => {
                    const match = p.match(/^___V(\d+)_P(\d+)___$/);
                    return match && activeVocabId === `v_${match[1]}_p_${match[2]}`;
                });

                return (
                    <View key={`word-${index}`} style={[styles.wordBlock, { zIndex: isBlockActive ? 100 : 1 }]}>
                        {parts.map((part, pIdx) => {
                            const match = part.match(/^___V(\d+)_P(\d+)___$/);

                            if (match) {
                                // Es ist ein interaktives Vokabel-Wort
                                const vIndex = parseInt(match[1]);
                                const pIndex = parseInt(match[2]); // <- Teil 0 (Auf), Teil 1 (Wiedersehen)
                                const vocabItem = sortedVocab[vIndex];

                                const wordText = vocabItem.text.split(/\s+/)[pIndex];
                                const exactId = `v_${vIndex}_p_${pIndex}`;
                                const isActive = activeVocabId === exactId;

                                return (
                                    <View key={`vocab-${pIdx}`} style={styles.interactiveAnchor}>

                                        {/* DER ABSOLUTE NULL-ANKER: 
                        Nimmt 0x0 Pixel Platz ein. Verhindert jedes Layout-Zucken! */}
                                        <View style={styles.tooltipAnchor}>
                                            {isActive && (
                                                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.tooltipContent} pointerEvents="none">
                                                    <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                                        <Text style={styles.tooltipText}>{vocabItem.translation}</Text>
                                                    </View>
                                                    <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                                                </Animated.View>
                                            )}
                                        </View>

                                        {/* Das anklickbare Wort */}
                                        <TouchableOpacity activeOpacity={0.6} onPress={() => handlePress(vocabItem, exactId)}>
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
                                // Es ist ein normales Wort oder Satzzeichen (z.B. "?")
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
        flex: 1, // Nimmt den restlichen Platz neben dem Lautsprecher ein (gleiche Höhe!)
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center', // Zentriert den Text vertikal zum Lautsprecher
        justifyContent: 'flex-start',
        rowGap: 10,
        columnGap: 8,
        // paddingTop komplett entfernt -> Keine Verschiebung nach unten mehr!
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

    // --- Das völlig isolierte Pop-up System ---

    // 1. Der Ankerpunkt: Liegt genau in der oberen Mitte des Wortes, ist aber 0x0 Pixel groß
    tooltipAnchor: {
        position: 'absolute',
        top: 0,
        left: '50%',
        width: 0,
        height: 0,
        zIndex: 1000,
        overflow: 'visible',
    },
    // 2. Der Container: Wächst aus dem 0x0 Punkt nach oben heraus
    tooltipContent: {
        position: 'absolute',
        bottom: 2, // Abstand zwischen Wort und Bubble
        width: 200, // Zwingt Android, den Text in einer Zeile zu lassen
        left: -100, // Zentriert den 200px Kasten perfekt über der Mitte
        alignItems: 'center', // Die Blase schmiegt sich an die Textlänge an
        justifyContent: 'flex-end',
    },
    // 3. Die Bubble an sich
    tooltip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
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