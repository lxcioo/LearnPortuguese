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

    // Bereinigt den Text: Trennt nach Leerzeichen, BEHÄLT aber alle Sonderzeichen und Leerzeichen lückenlos!
    const finalTokens: any[] = [];
    chunks.forEach(chunk => {
        if (chunk.isVocab) {
            finalTokens.push(chunk);
        } else {
            // Teilt exakt an Leerzeichen auf, ohne sie zu löschen. So bleibt z.B. " / " perfekt erhalten.
            const parts = chunk.text.split(/(\s+)/);
            parts.forEach(part => {
                if (part && part.length > 0) {
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
                // Normale Wörter, Satzzeichen und Leerzeichen
                if (!token.isVocab) {
                    return <Text key={`text-${i}`} style={[styles.text, { color: textColor }]}>{token.text}</Text>;
                }

                // Interaktive Vokabeln
                const isActive = activeVocabId === `${token.vocabIndex}-${i}`;

                return (
                    <View key={`vocab-${i}`} style={styles.vocabWrapper}>
                        {/* Perfekt zentriertes Tooltip Pop-up */}
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

                                {/* Feine, abgerundete Striche für einen Premium-Look */}
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
        rowGap: 6, // Sorgt für einen angenehmen Zeilenabstand beim Umbruch
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
    // Die Premium-Linie
    customDashesContainer: {
        position: 'absolute',
        bottom: -3, // Sitzt schön eng, direkt unter den Buchstaben
        left: 0,
        right: 0,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    dash: {
        width: 3.5, // Länge eines Strichs
        height: 1.5, // Hauchdünn
        borderRadius: 1, // Leicht abgerundet sieht viel professioneller aus
        marginRight: 2.5, // Angenehmer Abstand zwischen den Strichen
    },
    // Pop-up Styles
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        left: '50%', // Startet in der Mitte des Wortes...
        width: 160,
        marginLeft: -80, // ...und zieht sich um exakt die Hälfte zurück (absolut perfektes Zentrieren)
        alignItems: 'center',
        marginBottom: -4, // Zieht das Pop-up ein gutes Stück nach unten ans Wort ran
        zIndex: 100,
        elevation: 10,
    },
    tooltip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10, // Leicht abgerundetes Bubble-Design
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
        marginTop: -1, // Lässt den Pfeil mit der Box verschmelzen
    }
});