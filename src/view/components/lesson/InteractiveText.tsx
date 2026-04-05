import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// NEU: Wir nutzen ZoomIn und ZoomOut für eine flüssigere, fehlerfreie Animation!
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

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
    fontSize?: number;
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function InteractiveText({ sentence, vocabulary, exerciseId, playAudio, textColor, highlightColor, fontSize }: InteractiveTextProps) {
    const [activeVocabId, setActiveVocabId] = useState<string | null>(null);

    const currentFontSize = fontSize || 26;
    const currentLineHeight = currentFontSize * 1.4;

    if (!vocabulary || vocabulary.length === 0) {
        return (
            <Text style={{ color: textColor, fontSize: currentFontSize, lineHeight: currentLineHeight, fontWeight: 'bold' }}>
                {sentence}
            </Text>
        );
    }

    let markedText = sentence;

    const mappedVocab = vocabulary.map((vocab, originalIndex) => {
        let searchStr = vocab.text;
        let displayPopup = vocab.translation;

        if (!sentence.includes(vocab.text) && sentence.includes(vocab.translation)) {
            searchStr = vocab.translation;
            displayPopup = vocab.text;
        }

        return { ...vocab, originalIndex, searchStr, displayPopup };
    });

    const sortedVocab = mappedVocab.sort((a, b) => b.searchStr.length - a.searchStr.length);

    sortedVocab.forEach((vocab, vIndex) => {
        const regex = new RegExp(`(${escapeRegExp(vocab.searchStr)})`, 'g');
        markedText = markedText.replace(regex, `___V${vIndex}___`);
    });

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
                const parts = rawWord.split(/(___V\d+___)/).filter(p => p !== '');

                const isBlockActive = parts.some(p => {
                    const match = p.match(/^___V(\d+)___$/);
                    return match && activeVocabId === `v_${match[1]}`;
                });

                return (
                    <View key={`word-${index}`} style={[styles.wordBlock, { zIndex: isBlockActive ? 100 : 1 }]}>
                        {parts.map((part, pIdx) => {
                            const match = part.match(/^___V(\d+)___$/);

                            if (match) {
                                const vIndex = parseInt(match[1]);
                                const vocabItem = sortedVocab[vIndex];
                                const exactId = `v_${vIndex}`;
                                const isActive = activeVocabId === exactId;

                                return (
                                    <View key={`vocab-${pIdx}`} style={styles.interactiveAnchor}>
                                        <View style={styles.tooltipAnchor}>
                                            {isActive && (
                                                // Die Animation wurde auf ZoomIn / ZoomOut geändert. Das wirkt wie ein 
                                                // sanftes "Aufploppen" aus dem Wort heraus und versteckt den Rendering-Bug.
                                                <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)} style={styles.tooltipContent} pointerEvents="none">
                                                    <View style={styles.tooltip}>
                                                        <Text style={styles.tooltipText}>{vocabItem.displayPopup}</Text>
                                                    </View>
                                                    <View style={styles.tooltipArrow} />
                                                </Animated.View>
                                            )}
                                        </View>

                                        <TouchableOpacity activeOpacity={0.6} onPress={() => handlePress(vocabItem, exactId)}>
                                            <Text style={{
                                                color: highlightColor,
                                                fontSize: currentFontSize,
                                                lineHeight: currentLineHeight,
                                                fontWeight: 'bold',
                                                textDecorationLine: 'underline',
                                                textDecorationStyle: 'dotted',
                                                textDecorationColor: highlightColor
                                            }}>
                                                {vocabItem.searchStr}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            } else {
                                return (
                                    <Text
                                        key={`text-${pIdx}`}
                                        style={{ color: textColor, fontSize: currentFontSize, lineHeight: currentLineHeight, fontWeight: 'bold' }}
                                    >
                                        {part}
                                    </Text>
                                );
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
        flexShrink: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-start',
        rowGap: 8,
        columnGap: 8,
    },
    wordBlock: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    interactiveAnchor: {
        position: 'relative',
    },
    tooltipAnchor: {
        position: 'absolute',
        top: 0,
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
        backgroundColor: '#333333',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    tooltipText: {
        color: '#FFFFFF',
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
        // FIX: Explizites Nutzen der Null-Opacity rgba Werte verhindert das "Rechteck" auf Android!
        borderLeftColor: 'rgba(0, 0, 0, 0)',
        borderRightColor: 'rgba(0, 0, 0, 0)',
        borderTopColor: '#333333',
        marginTop: -1,
    }
});