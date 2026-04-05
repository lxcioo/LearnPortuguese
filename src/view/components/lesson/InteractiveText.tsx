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

    // SCHRITT 1: Vokabeln als GANZE Phrasen im Text markieren
    let markedText = sentence;

    // Sortieren nach Länge: WICHTIG! So wird "Auf Wiedersehen" vor "Auf" gefunden.
    const sortedVocab = [...vocabulary]
        .map((vocab, originalIndex) => ({ ...vocab, originalIndex }))
        .sort((a, b) => b.text.length - a.text.length);

    sortedVocab.forEach((vocab, vIndex) => {
        // Wir ersetzen jetzt die KOMPLETTE Phrase durch EINEN einzigen Platzhalter!
        const regex = new RegExp(`(${escapeRegExp(vocab.text)})`, 'g');
        markedText = markedText.replace(regex, `___V${vIndex}___`);
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

                // Trennt den String nach unserem neuen, simplen Platzhalter
                const parts = rawWord.split(/(___V\d+___)/).filter(p => p !== '');

                // Z-Index: Das aktive Wort liegt immer oben
                const isBlockActive = parts.some(p => {
                    const match = p.match(/^___V(\d+)___$/);
                    return match && activeVocabId === `v_${match[1]}`;
                });

                return (
                    <View key={`word-${index}`} style={[styles.wordBlock, { zIndex: isBlockActive ? 100 : 1 }]}>
                        {parts.map((part, pIdx) => {
                            const match = part.match(/^___V(\d+)___$/);

                            if (match) {
                                // Es ist eine interaktive Vokabel (kann aus 1 oder mehreren Wörtern bestehen)
                                const vIndex = parseInt(match[1]);
                                const vocabItem = sortedVocab[vIndex];

                                const exactId = `v_${vIndex}`;
                                const isActive = activeVocabId === exactId;

                                return (
                                    <View key={`vocab-${pIdx}`} style={styles.interactiveAnchor}>

                                        {/* DER ABSOLUTE NULL-ANKER: Zentriert sich nun über der GANZEN Phrase! */}
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

                                        {/* Das anklickbare Wort (oder die ganze Phrase) */}
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
                                                {/* Wir rendern hier den kompletten String (z.B. "Auf Wiedersehen") */}
                                                {vocabItem.text}
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
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-start',
        rowGap: 10,
        columnGap: 8,
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
    tooltipAnchor: {
        position: 'absolute',
        top: 0,
        // "left: 50%" berechnet jetzt automatisch die Mitte der GESAMTEN Phrase!
        left: '50%',
        width: 0,
        height: 0,
        zIndex: 1000,
        overflow: 'visible',
    },
    tooltipContent: {
        position: 'absolute',
        bottom: 2,
        width: 200,
        left: -100,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
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