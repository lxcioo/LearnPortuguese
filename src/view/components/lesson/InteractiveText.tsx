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

    // Nach Länge sortieren, damit lange Phrasen wie "Auf Wiedersehen" zuerst gefunden werden
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
        // Wenn das Wort schon aktiv ist und nochmal getippt wird, schließe es
        if (activeVocabId === id) {
            setActiveVocabId(null);
            return;
        }

        setActiveVocabId(id);
        playAudio(`${exerciseId}_vocab_${vocabItem.originalIndex}`);

        // Automatisches Schließen nach 3 Sekunden
        setTimeout(() => {
            setActiveVocabId(current => current === id ? null : current);
        }, 3000);
    };

    return (
        <View style={styles.container}>
            {/* Ein einziger nativer Text-Block!
        Das garantiert perfekten Zeilenumbruch und lückenlose Satzzeichen.
      */}
            <Text style={[styles.text, { color: textColor }]}>
                {elements.map((el, i) => {

                    // Normaler Text & Satzzeichen
                    if (typeof el === 'string') {
                        return <Text key={`string-${i}`}>{el}</Text>;
                    }

                    // Interaktives Wort
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
                                    // Garantiert perfekte, echte Unterstreichung direkt am Wort
                                    textDecorationLine: 'underline',
                                    textDecorationStyle: 'dotted',
                                    textDecorationColor: highlightColor
                                }
                            ]}
                        >
                            {/* Das Pop-up */}
                            {isActive && (
                                <View style={styles.tooltipAbsoluteWrapper}>
                                    {/* Die grüne Blase, die sich dynamisch an die Textlänge anpasst */}
                                    <View style={[styles.tooltip, { backgroundColor: highlightColor }]}>
                                        <Text style={styles.tooltipText} numberOfLines={1}>
                                            {vocab.translation}
                                        </Text>
                                    </View>
                                    {/* Der kleine Pfeil darunter */}
                                    <View style={[styles.tooltipArrow, { borderTopColor: highlightColor }]} />
                                </View>
                            )}
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
        width: '100%',
        paddingTop: 45, // Puffer, damit das Pop-up nie den Aufgabentext verdeckt
        paddingHorizontal: 2,
    },
    text: {
        fontSize: 26,
        fontWeight: 'bold',
        lineHeight: 40, // Sorgt für genug Platz zwischen den Zeilen, falls Wörter umbrechen
    },
    interactiveWordText: {
        fontWeight: 'bold',
    },
    // --- DER FIX FÜR DIE SÄULE UND DIE ZENTRIERUNG ---
    tooltipAbsoluteWrapper: {
        position: 'absolute',
        bottom: '100%',
        // 1. Eine große, feste Breite verhindert den "Säulen-Bug" (Text-Wrap)
        width: 200,
        // 2. 'left: 50%' schiebt den Kasten an die Mitte des Wortes
        left: '50%',
        // 3. 'marginLeft' zieht ihn um genau die Hälfte (100px) zurück -> 100% perfekte Zentrierung!
        marginLeft: -100,
        alignItems: 'center',
        marginBottom: 4,
        zIndex: 1000,
        elevation: 10,
    },
    tooltip: {
        // Da der Parent 'alignItems: center' hat, schmiegt sich die Breite hier 
        // jetzt absolut perfekt und dynamisch an den Inhalt (die Übersetzung) an.
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 50, // Sieht bei sehr kurzen Wörtern wie "Ja" schöner aus
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