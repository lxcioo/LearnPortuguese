import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const wordSpacing = currentFontSize * 0.22;
    const lineSpacing = currentFontSize * 0.3;

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

        const normSentence = sentence.toLowerCase();
        const normText = vocab.text.toLowerCase();
        const normTrans = vocab.translation.toLowerCase();

        if (!normSentence.includes(normText) && normSentence.includes(normTrans)) {
            searchStr = vocab.translation;
            displayPopup = vocab.text;
        }

        return { ...vocab, originalIndex, searchStr: searchStr, displayPopup };
    });

    const sortedVocab = mappedVocab.sort((a, b) => b.searchStr.length - a.searchStr.length);

    // NEU: Wir definieren alle Buchstaben, die zu einem Wort gehören können (inkl. Umlaute & PT-Zeichen).
    const wordChars = 'a-zA-Z0-9_äöüßÄÖÜáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ';

    sortedVocab.forEach((vocab, vIndex) => {
        // Die Regex prüft jetzt, ob VOR und NACH dem gesuchten Wort ein "Nicht-Wort-Zeichen" steht.
        // So wird "Tag" in "Nachmittag" sofort aussortiert, weil das "t" von "mit" ein Buchstabe ist.
        const regex = new RegExp(`(^|[^${wordChars}])(${escapeRegExp(vocab.searchStr)})(?![${wordChars}])`, 'gi');

        markedText = markedText.replace(regex, (match, p1, p2) => {
            const safeMatch = p2.replace(/\s/g, '@@@');
            return `${p1}___V${vIndex}---${safeMatch}___`;
        });
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
        <View style={[styles.container, { columnGap: wordSpacing, rowGap: lineSpacing }]}>
            {rawWords.map((rawWord, index) => {
                const parts = rawWord.split(/(___V\d+---.*?___)/).filter(p => p !== '');

                const isBlockActive = parts.some(p => {
                    const match = p.match(/^___V(\d+)---(.*?)___$/);
                    return match && activeVocabId === `v_${match[1]}`;
                });

                return (
                    <View key={`word-${index}`} style={[styles.wordBlock, { zIndex: isBlockActive ? 100 : 1 }]}>
                        {parts.map((part, pIdx) => {
                            const match = part.match(/^___V(\d+)---(.*?)___$/);

                            if (match) {
                                const vIndex = parseInt(match[1]);
                                const originalText = match[2].replace(/@@@/g, ' ');
                                const vocabItem = sortedVocab[vIndex];
                                const exactId = `v_${vIndex}`;
                                const isActive = activeVocabId === exactId;

                                return (
                                    <View key={`vocab-${pIdx}`} style={styles.interactiveAnchor}>
                                        <View style={styles.tooltipAnchor}>
                                            {isActive && (
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
                                                {originalText}
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
        borderLeftColor: 'rgba(0, 0, 0, 0)',
        borderRightColor: 'rgba(0, 0, 0, 0)',
        borderTopColor: '#333333',
        marginTop: -1,
    }
});