import React, { useState } from 'react';
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

// Hilfsfunktion: Verhindert Fehler beim Suchen von Wörtern mit Satzzeichen
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function InteractiveText({ sentence, vocabulary, exerciseId, playAudio, textColor, highlightColor }: InteractiveTextProps) {
    const [activeVocabId, setActiveVocabId] = useState<string | null>(null);

    // Speichert die exakten X/Y Koordinaten jedes Wortes auf dem Bildschirm
    const [wordLayouts, setWordLayouts] = useState<Record<string, { x: number, y: number, width: number, height: number }>>({});

    if (!vocabulary || vocabulary.length === 0) {
        return <Text style={[styles.text, { color: textColor }]}>{sentence}</Text>;
    }

    // SCHRITT 1: Text intelligent aufteilen (Behält alle Leerzeichen und Satzzeichen als reinen Text)
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

    // Speichert die Koordinaten des Wortes, sobald es auf dem Bildschirm gerendert wird
    const handleLayout = (id: string, event: any) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        setWordLayouts(prev => ({ ...prev, [id]: { x, y, width, height } }));
    };

    // Finde die Übersetzung für das aktuell aktive Wort
    const activeElement = elements.find((el, i) => `vocab-${i}` === activeVocabId);
    const activeTranslation = activeElement ? activeElement.vocabItem.translation : '';

    return (
        <View style={styles.container}>

            {/* DER TEXT-BLOCK:
        Hier ist absolut KEIN View-Container oder Pop-up mehr drin. Es ist 100% reiner Text.
        Dadurch kann sich nichts verziehen, nichts zucken und die Zeilenhöhe bleibt perfekt!
      */}
            <View style={styles.textWrapper}>
                <Text style={[styles.text, { color: textColor }]}>
                    {elements.map((el, i) => {

                        if (typeof el === 'string') {
                            return <Text key={`string-${i}`}>{el}</Text>;
                        }

                        const vocab = el.vocabItem;
                        const id = `vocab-${i}`;

                        return (
                            <Text
                                key={id}
                                onLayout={(e) => handleLayout(id, e)}
                                onPress={() => handlePress(vocab, id)}
                                style={[
                                    styles.interactiveWordText,
                                    {
                                        color: highlightColor,
                                        // Die echte, unverfälschte System-Unterstreichung
                                        textDecorationLine: 'underline',
                                        textDecorationStyle: 'dotted',
                                        textDecorationColor: highlightColor
                                    }
                                ]}
                            >
                                {el.text}
                            </Text>
                        );
                    })}
                </Text>

                {/* DAS ENTKOPPELTE POP-UP:
          Schwebt als Overlay VÖLLIG unabhängig über dem Text. 
          Es nutzt die zuvor gemessenen Koordinaten, um sich millimetergenau zu platzieren.
        */}
                {activeVocabId && wordLayouts[activeVocabId] && (
                    <View
                        style={[
                            styles.popupAnchor,
                            {
                                // Setzt den Ankerpunkt EXAKT in die horizontale Mitte des Wortes
                                left: wordLayouts[activeVocabId].x + (wordLayouts[activeVocabId].width / 2),
                                // Setzt den Ankerpunkt EXAKT auf die Oberkante des Wortes
                                top: wordLayouts[activeVocabId].y,
                            }
                        ]}
                        pointerEvents="none"
                    >
                        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.popupAbsoluteWrapper}>

                            {/* Die Bubble passt sich automatisch dynamisch an den Inhalt an */}
                            <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                <Text style={styles.tooltipText}>{activeTranslation}</Text>
                            </View>

                            <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                        </Animated.View>
                    </View>
                )}

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 10, // Leichtes Padding, damit Pop-ups oben am Rand Platz haben
    },
    textWrapper: {
        position: 'relative', // Zwingt das Pop-up, sich relativ zu diesem Textfeld auszurichten
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
        lineHeight: 40,
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    // --- Das neue, entkoppelte Pop-up System ---
    popupAnchor: {
        position: 'absolute',
        width: 0,
        height: 0,
        zIndex: 1000,
        elevation: 10,
    },
    popupAbsoluteWrapper: {
        position: 'absolute',
        bottom: 2, // Abstand: Schwebt exakt 2 Pixel ÜBER dem Wort
        width: 300, // Ein unsichtbarer, breiter Kasten verhindert den Android "Säulen-Bug"...
        marginLeft: -150, // ...und zieht den Kasten exakt in die Mitte über dem Anker!
        alignItems: 'center', // Sorgt dafür, dass die eigentliche Bubble (tooltip) nur so breit wird wie der Text!
    },
    tooltip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 40,
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