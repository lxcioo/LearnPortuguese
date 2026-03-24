import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface Props {
    retry: () => void;
}

export function ErrorFallbackScreen({ retry }: Props) {
    return (
        <SafeAreaProvider>
            <View style={styles.errorContainer}>
                <Ionicons name="warning" size={64} color="#ff4757" />
                <Text style={styles.errorTitle}>Hoppla!</Text>
                <Text style={styles.errorMessage}>
                    Ein unerwarteter Fehler ist aufgetreten. Der Fehlerbericht wurde gerade automatisch gesendet, damit er im nächsten Update behoben werden kann!
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={retry}>
                    <Text style={styles.retryButtonText}>App neu laden</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
    errorTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 10, color: '#333' },
    errorMessage: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30, lineHeight: 24 },
    retryButton: { backgroundColor: '#58cc02', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
    retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});