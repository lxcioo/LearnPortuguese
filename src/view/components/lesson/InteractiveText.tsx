import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

// Hilfsfunktion: Verhindert Fehler beim Suchen von Satzzeichen
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function InteractiveText({ sentence, vocabulary, exerciseId, playAudio, textColor, highlightColor }: InteractiveTextProps) {
    const [activeVocabId, setActiveVocabId] = useState<string | null>(null);

    if (!vocabulary || vocabulary.length === 0) {
        return <Text style={[styles.text, { color: textColor }]}>{sentence}</Text>;
    }

    // SCHRITT 1: Text intelligent aufteilen, ohne dass Satzzeichen oder Leerzeichen verloren gehen
    let elements: any[] = [sentence];

    const sortedVocab = [...vocabulary]
        .map((vocab, originalIndex) => ({ ...vocab, originalIndex }))
        .sort((a, b) => b.text.length - a.text.length);

    sortedVocab.forEach((vocab) => {
        const newElements: any[] = [];
        elements.forEach((el) => {
            if (typeof el === 'string') {
                const regex = new RegExp(`(${escapeRegExp(vocab.text)})`, 'g');
                const parts = el.split(regex);

                parts.forEach(part => {
                    if (part === vocab.text) {
                        newElements.push({ type: 'vocab', vocabItem: vocab, text: part });
                    } else if (part.length > 0) {
                        newElements.push(part);
                    }
                });
            } else {
                newElements.push(el);
            }
        });
        elements = newElements;
    });

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
            <Text style={[styles.text, { color: textColor }]}>
                {elements.map((el, i) => {

                    if (typeof el === 'string') {
                        return <Text key={`string-${i}`}>{el}</Text>;
                    }

                    const vocab = el.vocabItem;
                    const isActive = activeVocabId === `vocab-${i}`;

                    return (
                        <Text
                            key={`vocab-${i}`}
                            onPress={() => handlePress(vocab, `vocab-${i}`)}
                            style={[
                                styles.interactiveWordText,
                                {
                                    color: highlightColor,
                                    textDecorationLine: 'underline',
                                    textDecorationStyle: 'dotted',
                                    textDecorationColor: highlightColor
                                }
                            ]}
                        >
                            {/* DER FIX FÜR DAS ZUCKEN: 
                Das Pop-up wird IMMER gerendert, aber unsichtbar gemacht (opacity). 
                Dadurch verändert sich die Zeilenhöhe beim Drauftippen niemals!
              */}
                            <View
                                style={[
                                    styles.tooltipAbsoluteWrapper,
                                    { opacity: isActive ? 1 : 0 }
                                ]}
                                pointerEvents={isActive ? 'auto' : 'none'}
                            >
                                <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                    <Text style={styles.tooltipText} numberOfLines={1}>
                                        {vocab.translation}
                                    </Text>
                                </View>
                                <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                            </View>
                            {/* Das angezeigte Wort */}
                            {el.text}
                        </Text>
                    );
                })}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // DER FIX FÜR DIE HÖHE ZUM LAUTSPRECHER: 
        // paddingTop wurde komplett gelöscht. flex: 1 lässt den Text perfekt neben dem Lautsprecher fließen.
        flex: 1,
        justifyContent: 'center',
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
        lineHeight: 40,
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        width: 200,
        left: '50%',
        marginLeft: -100,
        alignItems: 'center',
        marginBottom: 4,
        zIndex: 1000,
        elevation: 10,
    },
    tooltip: {
        paddingHorizontal: 12,
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