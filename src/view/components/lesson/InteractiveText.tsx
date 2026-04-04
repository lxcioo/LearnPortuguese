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

    // Tokenizer: Zerlegt den Text in normale Wörter und interaktive Vokabeln
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

    const handlePress = (vocab: VocabWord | null, vocabIndex: number, chunkIndex: number) => {
        if (!vocab) return;
        const id = `${vocabIndex}-${chunkIndex}`;
        setActiveVocabId(id);
        playAudio(`${exerciseId}_vocab_${vocabIndex}`);

        // Blendet das Pop-up nach 3 Sekunden wieder aus
        setTimeout(() => {
            setActiveVocabId(current => current === id ? null : current);
        }, 3000);
    };

    return (
        <View style={styles.container}>
            {chunks.map((chunk, i) => {
                // Normale Wörter (werden nach Leerzeichen getrennt, damit sie am Zeilenende normal umbrechen)
                if (!chunk.isVocab) {
                    const words = chunk.text.split(/(\s+)/);
                    return words.map((w, j) => (
                        w ? <Text key={`text-${i}-${j}`} style={[styles.text, { color: textColor }]}>{w}</Text> : null
                    ));
                }

                // Interaktive Vokabel
                const isActive = activeVocabId === `${chunk.vocabIndex}-${i}`;

                return (
                    <View key={`vocab-${i}`} style={styles.vocabWrapper}>
                        {/* Pop-up (erscheint jetzt exakt über diesem Container!) */}
                        {isActive && (
                            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.tooltipAbsoluteWrapper}>
                                <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                    <Text style={styles.tooltipText}>{chunk.vocabItem?.translation}</Text>
                                </View>
                                <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                            </Animated.View>
                        )}

                        {/* Neues, modernes "Soft-Highlight" Design */}
                        <TouchableOpacity
                            activeOpacity={0.6}
                            onPress={() => handlePress(chunk.vocabItem, chunk.vocabIndex, i)}
                            style={[styles.interactiveWordBg, { backgroundColor: 'rgba(88, 204, 2, 0.15)' }]}
                        >
                            <Text style={[styles.text, styles.interactiveWordText, { color: '#46a302' }]}>
                                {chunk.text}
                            </Text>
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
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    vocabWrapper: {
        position: 'relative',
        // Ein kleines bisschen Margin, damit die Vokabeln nicht kleben
        marginHorizontal: 2,
    },
    interactiveWordBg: {
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    interactiveWordText: {
        fontWeight: '800', // Etwas dicker als der normale Text
    },
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        left: -80, // Trick, um den Container über die Ränder hinauszuziehen...
        right: -80,
        alignItems: 'center', // ...und das Tooltip dann exakt in der Mitte zu zentrieren
        paddingBottom: 6, // Abstand zur Vokabel
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