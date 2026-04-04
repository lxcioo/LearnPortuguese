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

export function InteractiveText({ sentence, vocabulary, exerciseId, playAudio, textColor, highlightColor }: InteractiveTextProps) {
    const [activeVocabId, setActiveVocabId] = useState<string | null>(null);

    if (!vocabulary || vocabulary.length === 0) {
        return <Text style={[styles.text, { color: textColor }]}>{sentence}</Text>;
    }

    // Tokenizer: Zerlegt den Text in seine Bestandteile
    let chunks = [{ text: sentence, isVocab: false, vocabItem: null as VocabWord | null, vocabIndex: -1 }];

    vocabulary.forEach((vocab, index) => {
        const newChunks: any[] = [];
        chunks.forEach(chunk => {
            if (chunk.isVocab) {
                newChunks.push(chunk);
            } else {
                const parts = chunk.text.split(vocab.text);
                parts.forEach((part, i) => {
                    if (part !== '') {
                        newChunks.push({ text: part, isVocab: false, vocabItem: null, vocabIndex: -1 });
                    }
                    if (i < parts.length - 1) {
                        newChunks.push({ text: vocab.text, isVocab: true, vocabItem: vocab, vocabIndex: index });
                    }
                });
            }
        });
        chunks = newChunks;
    });

    // Bereinigt den Text: Das ist der Game-Changer für lange Phrasen wie "Auf Wiedersehen"!
    const finalTokens: any[] = [];
    chunks.forEach(chunk => {
        // Wir trennen ALLES (auch Vokabeln) nach Leerzeichen auf
        const parts = chunk.text.split(/(\s+)/);

        parts.forEach(part => {
            if (part && part.length > 0) {
                // Prüfen, ob der Teil nur ein Leerzeichen ist
                const isSpace = /^\s+$/.test(part);

                if (isSpace || !chunk.isVocab) {
                    // Leerzeichen und normaler Text werden als Standard-Text gerendert
                    finalTokens.push({ text: part, isVocab: false, vocabItem: null, vocabIndex: -1 });
                } else {
                    // Die einzelnen Wörter einer Vokabel werden interaktiv. 
                    // So kann "Auf" in Zeile 1 stehen und "Wiedersehen" in Zeile 2 umbrechen!
                    finalTokens.push({ text: part, isVocab: true, vocabItem: chunk.vocabItem, vocabIndex: chunk.vocabIndex });
                }
            }
        });
    });

    const handlePress = (vocab: VocabWord | null, vocabIndex: number, chunkIndex: number) => {
        if (!vocab) return;
        const id = `${vocabIndex}-${chunkIndex}`;
        setActiveVocabId(id);
        playAudio(`${exerciseId}_vocab_${vocabIndex}`);

        setTimeout(() => {
            setActiveVocabId(current => current === id ? null : current);
        }, 3000);
    };

    return (
        <View style={styles.container}>
            {finalTokens.map((token, i) => {
                // Normale Wörter und Leerzeichen
                if (!token.isVocab) {
                    return <Text key={`text-${i}`} style={[styles.text, { color: textColor }]}>{token.text}</Text>;
                }

                // Interaktive Vokabeln
                const isActive = activeVocabId === `${token.vocabIndex}-${i}`;

                return (
                    <View key={`vocab-${i}`} style={styles.vocabWrapper}>
                        {/* Pop-up (sitzt jetzt viel tiefer am Wort) */}
                        {isActive && (
                            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.tooltipAbsoluteWrapper}>
                                <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                    <Text style={styles.tooltipText}>{token.vocabItem?.translation}</Text>
                                </View>
                                <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                            </Animated.View>
                        )}

                        <TouchableOpacity
                            activeOpacity={0.6}
                            onPress={() => handlePress(token.vocabItem, token.vocabIndex, i)}
                        >
                            <View style={styles.wordWithDashes}>
                                <Text style={[styles.text, styles.interactiveWordText, { color: highlightColor }]}>
                                    {token.text}
                                </Text>

                                {/* Noch feinere Unterstreichung */}
                                <View style={styles.customDashesContainer}>
                                    {[...Array(30)].map((_, idx) => (
                                        <View key={idx} style={[styles.dash, { backgroundColor: highlightColor }]} />
                                    ))}
                                </View>
                            </View>
                        </TouchableOpacity>
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
        justifyContent: 'center',
        rowGap: 6,
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    vocabWrapper: {
        position: 'relative',
    },
    wordWithDashes: {
        position: 'relative',
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    customDashesContainer: {
        position: 'absolute',
        bottom: -3,
        left: 0,
        right: 0,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    dash: {
        width: 3,        // Kürzer
        height: 1.2,     // Noch dünner & eleganter
        borderRadius: 1,
        marginRight: 2.5,
    },
    // Pop-up Styles
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        width: 160,
        marginLeft: -80,
        alignItems: 'center',
        marginBottom: -8, // Zieht das Pop-up noch spürbar weiter an das Wort heran
        zIndex: 100,
        elevation: 10,
    },
    tooltip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
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
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    }
});