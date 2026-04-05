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

// Hilfsfunktion: Schützt vor Regex-Fehlern bei Sonderzeichen
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function InteractiveText({ sentence, vocabulary, exerciseId, playAudio, textColor, highlightColor }: InteractiveTextProps) {
    const [activeVocabId, setActiveVocabId] = useState<string | null>(null);

    if (!vocabulary || vocabulary.length === 0) {
        return <Text style={[styles.text, { color: textColor }]}>{sentence}</Text>;
    }

    // SCHRITT 1: Intelligentes Suchen & Ersetzen
    // Wir iterieren über den originalen Text und ersetzen die Vokabeln durch Objekte,
    // ohne den restlichen Text oder Satzzeichen auch nur anzurühren.
    let elements: any[] = [sentence];

    // Wir sortieren nach Länge, damit lange Phrasen ("Auf Wiedersehen") vor kurzen Wörtern gefunden werden
    const sortedVocab = [...vocabulary]
        .map((vocab, originalIndex) => ({ ...vocab, originalIndex }))
        .sort((a, b) => b.text.length - a.text.length);

    sortedVocab.forEach((vocab) => {
        const newElements: any[] = [];
        elements.forEach((el) => {
            if (typeof el === 'string') {
                // Trennt den String exakt am Vokabel-Wort auf
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
        setActiveVocabId(id);
        playAudio(`${exerciseId}_vocab_${vocabItem.originalIndex}`);

        // Automatisches Schließen nach 3 Sekunden
        setTimeout(() => {
            setActiveVocabId(current => current === id ? null : current);
        }, 3000);
    };

    return (
        <View style={styles.container}>
            {/* HIER IST DIE MAGIE: 
        Wir nutzen EINEN EINZIGEN Text-Container. Dadurch verhält sich alles 
        wie ein völlig normaler Satz aus einem Buch. Zeilenumbrüche passieren 
        absolut natürlich, Leerzeichen stimmen zu 100%.
      */}
            <Text style={[styles.text, { color: textColor }]}>
                {elements.map((el, i) => {
                    // Normaler Text (inklusive aller Satzzeichen, Schrägstriche, Leerzeichen)
                    if (typeof el === 'string') {
                        return <Text key={`string-${i}`}>{el}</Text>;
                    }

                    // Interaktive Vokabel
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
                                    // 100% Native System-Unterstreichung – Keine künstlichen Linien mehr!
                                    textDecorationLine: 'underline',
                                    textDecorationStyle: 'dotted',
                                    textDecorationColor: highlightColor
                                }
                            ]}
                        >
                            {/* Das Pop-up: Wird absolut über dem angetippten Wort verankert */}
                            {isActive && (
                                <View style={styles.tooltipAnchor}>
                                    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.tooltipAbsoluteWrapper}>
                                        <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                            {/* Der Text bestimmt nun automatisch die Breite des Pop-ups! */}
                                            <Text style={styles.tooltipText}>{vocab.translation}</Text>
                                        </View>
                                        <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                                    </Animated.View>
                                </View>
                            )}
                            {/* Das eigentliche Wort */}
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
        width: '100%',
        paddingTop: 45, // Ausreichend Puffer nach oben, damit das Pop-up nie den Text drüber verdeckt
        paddingHorizontal: 5,
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
        lineHeight: 40, // Etwas mehr Zeilenabstand, damit sich Pop-ups und Text bei mehrzeiligen Sätzen nicht in die Quere kommen
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    // Pop-up Styles
    tooltipAnchor: {
        width: 0,
        height: 0,
        position: 'relative',
    },
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: 30, // Schwebt direkt und zentriert über dem Wort
        left: 0,
        transform: [{ translateX: '-50%' }], // Garantiert, dass das Pop-up IMMER in der exakten Mitte des Wortes sitzt
        alignItems: 'center',
        zIndex: 100,
        elevation: 10,
    },
    tooltip: {
        // Die Breite ist ab jetzt dynamisch. Sie wird nur noch vom Inhalt (Padding + Text) bestimmt!
        paddingHorizontal: 16,
        paddingVertical: 8,
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
        fontSize: 16,
        textAlign: 'center',
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    }
});