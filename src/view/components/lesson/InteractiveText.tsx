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

    // Bereinigt den Text: Bewahrt die natürlichen Leerzeichen für perfekte Abstände (Satzzeichen bleiben kleben!)
    const finalTokens: any[] = [];
    chunks.forEach(chunk => {
        if (chunk.isVocab) {
            finalTokens.push(chunk);
        } else {
            // Teilt den String in Wörter, BEHÄLT aber die Leerzeichen bei
            const parts = chunk.text.match(/\S+\s*|\s+/g) || [];
            parts.forEach(part => {
                if (part !== '') {
                    finalTokens.push({ text: part, isVocab: false, vocabItem: null, vocabIndex: -1 });
                }
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
                // Normale Wörter und Leerzeichen
                if (!token.isVocab) {
                    return <Text key={`text-${i}`} style={[styles.text, { color: textColor }]}>{token.text}</Text>;
                }

                // Interaktive Vokabeln
                const isActive = activeVocabId === `${token.vocabIndex}-${i}`;

                return (
                    <View key={`vocab-${i}`} style={styles.vocabWrapper}>
                        {/* Tooltip Pop-up (Tiefer gesetzt durch paddingBottom: 2) */}
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

                                {/* Custom Line: Garantiert kleine Striche & enge Abstände auf JEDEM Gerät! */}
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
        rowGap: 8,
        // columnGap KOMPLETT entfernt, damit Text natürlich fließt
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
        paddingBottom: 2, // Schafft exakt 2 Pixel Platz unter dem Wort für die Linie
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    // Die neue Custom-Linie
    customDashesContainer: {
        position: 'absolute',
        bottom: 0, // Sitzt haargenau in den 2 Pixeln Platz, die wir oben freigemacht haben
        left: 0,
        right: 0,
        flexDirection: 'row',
        overflow: 'hidden', // Schneidet überschüssige Striche sauber ab
    },
    dash: {
        width: 3, // Die Länge eines einzelnen Strichs (sehr fein)
        height: 2.5, // Die Dicke
        marginRight: 2, // Der kleine Abstand zwischen den Strichen
    },
    // Pop-up Styles
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        left: -80,
        right: -80,
        alignItems: 'center',
        paddingBottom: 2, // <-- Wurde von 6 auf 2 reduziert, Pop-up ist jetzt näher dran!
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