import React, { JSX, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    const [activeVocab, setActiveVocab] = useState<{ word: string, translation: string } | null>(null);

    if (!vocabulary || vocabulary.length === 0) {
        return <Text style={[styles.text, { color: textColor }]}>{sentence}</Text>;
    }

    const handlePress = (vocab: VocabWord, index: number) => {
        setActiveVocab({ word: vocab.text, translation: vocab.translation });
        playAudio(`${exerciseId}_vocab_${index}`);

        // Tooltip nach 3 Sekunden automatisch ausblenden
        setTimeout(() => setActiveVocab(null), 3000);
    };

    // Zerlegt den Satz so, dass Teilsätze und Wörter erkannt werden
    const renderInteractiveSentence = () => {
        let remainingText = sentence;
        const elements: JSX.Element[] = [];
        let keyIndex = 0;

        vocabulary.forEach((vocab, index) => {
            const parts = remainingText.split(vocab.text);
            if (parts.length > 1) {
                // Text VOR der Vokabel (falls vorhanden)
                if (parts[0]) {
                    elements.push(<Text key={`text-${keyIndex++}`} style={{ color: textColor }}>{parts[0]}</Text>);
                }

                // Die interaktive Vokabel selbst
                elements.push(
                    <Text
                        key={`vocab-${keyIndex++}`}
                        style={[
                            styles.interactiveWord,
                            {
                                textDecorationColor: highlightColor,
                                color: textColor // <--- Geändert: Behält die normale Textfarbe!
                            }
                        ]}
                        onPress={() => handlePress(vocab, index)}
                    >
                        {vocab.text}
                    </Text>
                );

                // Der Rest des Satzes für die nächste Iteration
                remainingText = parts.slice(1).join(vocab.text);
            }
        });

        // Den übrig gebliebenen Text anhängen
        if (remainingText) {
            elements.push(<Text key={`text-${keyIndex++}`} style={{ color: textColor }}>{remainingText}</Text>);
        }

        return <Text style={[styles.text, { color: textColor }]}>{elements}</Text>;
    };

    return (
        <View style={styles.container}>
            {/* Tooltip Pop-up */}
            {activeVocab && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.tooltipContainer}>
                    <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                        {/* Lautsprecher-Icon wurde hier entfernt */}
                        <Text style={styles.tooltipText}>{activeVocab.translation}</Text>
                    </View>
                    <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                </Animated.View>
            )}

            {/* Der eigentliche Satz */}
            {renderInteractiveSentence()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'flex-start',
        flex: 1,
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
        flexWrap: 'wrap',
    },
    interactiveWord: {
        textDecorationLine: 'underline',
        textDecorationStyle: 'dashed', // <--- Geändert: Gestrichelte Linie statt gepunktet
    },
    tooltipContainer: {
        position: 'absolute',
        top: -45,
        left: 0,
        alignItems: 'center',
        zIndex: 10,
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
        fontSize: 14,
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