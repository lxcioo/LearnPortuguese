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

    // Bereinigt den Text: Entfernt echte Leerzeichen, damit wir perfekte Abstände kontrollieren können
    const finalTokens: any[] = [];
    chunks.forEach(chunk => {
        if (chunk.isVocab) {
            finalTokens.push(chunk);
        } else {
            const words = chunk.text.split(/\s+/).filter(w => w.trim().length > 0);
            words.forEach(w => {
                finalTokens.push({ text: w, isVocab: false, vocabItem: null, vocabIndex: -1 });
            });
        }
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
                // Normale Wörter
                if (!token.isVocab) {
                    return <Text key={`text-${i}`} style={[styles.text, { color: textColor }]}>{token.text}</Text>;
                }

                // Interaktive Vokabeln
                const isActive = activeVocabId === `${token.vocabIndex}-${i}`;

                return (
                    <View key={`vocab-${i}`} style={styles.vocabWrapper}>
                        {/* Tooltip Pop-up */}
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
                                {/* Absolut positionierter Strich für Millimeter-genaue Platzierung */}
                                <View style={[styles.dashedLine, { borderColor: highlightColor }]} />
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
        rowGap: 10,
        columnGap: 8,
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    vocabWrapper: {
        position: 'relative',
    },
    wordWithDashes: {
        position: 'relative', // Erlaubt absolute Positionierung des Strichs innerhalb des Wortes
        paddingBottom: 2, // Minimaler Puffer, damit der Strich Platz hat
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    dashedLine: {
        position: 'absolute',
        bottom: 4,      // Zieht den Strich nach oben in den Text hinein (näher ans Wort). Erhöhe die Zahl, um den Strich noch höher zu ziehen!
        left: 2,        // Schiebt den Strich 2 Pixel nach rechts für die optische Mitte
        right: -2,      // Gleicht die 2 Pixel rechts wieder aus, damit der Strich nicht kürzer wird
        borderBottomWidth: 2.5,
        borderStyle: 'dashed',
    },
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        left: -80,
        right: -80,
        alignItems: 'center',
        paddingBottom: 6,
        zIndex: 100,
        elevation: 10,
    },
    tooltip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
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