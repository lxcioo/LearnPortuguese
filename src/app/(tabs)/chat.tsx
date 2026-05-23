import { Colors } from '@/src/view/constants/theme';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useColorScheme } from '@/src/view/hooks/useColorScheme';
import { ChatMessage, useChatLogic } from '@/src/viewmodel/useChatLogic';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatTabScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDarkMode = colorScheme === 'dark';
    
    // Umgeht TypeScript-Fehler, falls der Name nicht im Context definiert ist
    const themeContext = useTheme() as any;
    const gender = themeContext.gender || 'm';
    const themeUserNameRaw = themeContext.userName || themeContext.name;
    const themeUserName = typeof themeUserNameRaw === 'string' ? themeUserNameRaw.replace(/['"]/g, '') : themeUserNameRaw;

    const [topic, setTopic] = useState('Alltag & Hobbys');
    const [isTopicModalVisible, setIsTopicModalVisible] = useState(false);
    const [customTopic, setCustomTopic] = useState('');
    const [hasStarted, setHasStarted] = useState(false);
    const [profileName, setProfileName] = useState<string>('');

    // Lade den Namen aus dem Profil-Screen (der meist in AsyncStorage speichert)
    useEffect(() => {
        const fetchName = async () => {
            try {
                let storedName = await AsyncStorage.getItem('userName') || await AsyncStorage.getItem('name') || await AsyncStorage.getItem('username');
                
                if (!storedName) {
                    const profileStr = await AsyncStorage.getItem('userProfile') || await AsyncStorage.getItem('profile');
                    if (profileStr) {
                        try {
                            const parsed = JSON.parse(profileStr);
                            storedName = parsed.name || parsed.userName || parsed.username;
                        } catch (e) {}
                    }
                }
                if (storedName) {
                    setProfileName(storedName.replace(/['"]/g, ''));
                }
            } catch (e) {
                console.log("Fehler beim Laden des Namens", e);
            }
        };
        fetchName();
    }, []);

    // Geschlechtsabhängiger Fallback, falls gar kein Name gefunden wird
    const fallbackName = gender === 'f' ? 'Lernende' : 'Lernender';
    const finalUserName = themeUserName || profileName || fallbackName;

    const { messages, isLoading, error, sendMessage, messageCount, MAX_MESSAGES_PER_DAY, initializeChat, resetChat, playAudioMessage, loadingAudioId, playingAudioId } = useChatLogic(finalUserName, gender, topic);

    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const handleLeaveChat = () => {
        resetChat();
        setHasStarted(false);
    };

    const handleSend = () => {
        if (inputText.trim()) {
            sendMessage(inputText);
            setInputText('');
        }
    };

    const startChat = (selectedTopic: string) => {
        setTopic(selectedTopic);
        setIsTopicModalVisible(false);
        setCustomTopic('');
        setHasStarted(true);
        initializeChat(selectedTopic);
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
                {!isUser && (
                    <View style={[styles.avatar, { backgroundColor: theme.cardBorder }]}>
                        <Ionicons name="sparkles" size={16} color={theme.text} />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isUser ? styles.messageBubbleUser : [styles.messageBubbleBot, { backgroundColor: isDarkMode ? '#2c2c2e' : '#f0f0f0' }]
                ]}>
                    <Text style={[styles.messageText, isUser ? styles.messageTextUser : { color: theme.text }]}>
                        {item.text}
                    </Text>
                    {!isUser && (
                        <TouchableOpacity
                            style={{ marginTop: 8, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => playAudioMessage(item.id, item.text)}
                            disabled={loadingAudioId === item.id}
                        >
                            {loadingAudioId === item.id ? (
                                <ActivityIndicator size="small" color={theme.icon} />
                            ) : (
                                <Ionicons 
                                    name={playingAudioId === item.id ? "volume-high" : "mic-outline"} 
                                    size={20} 
                                    color={playingAudioId === item.id ? '#58cc02' : theme.icon} 
                                />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        // edges top, left, right -> Damit der Chat Input nicht hinter der schwebenden Tab-Leiste verschwindet
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                {hasStarted && (
                    <TouchableOpacity onPress={handleLeaveChat} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                )}
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>KI Tutor</Text>
                    {hasStarted && <Text style={styles.headerSubtitle} numberOfLines={1}>{topic}</Text>}
                </View>
                <View style={styles.tokenContainer}>
                    <Ionicons name="battery-charging" size={14} color={messageCount >= MAX_MESSAGES_PER_DAY ? 'red' : '#58cc02'} />
                    <Text style={[styles.tokenText, { color: messageCount >= MAX_MESSAGES_PER_DAY ? 'red' : '#58cc02' }]}>
                        {MAX_MESSAGES_PER_DAY - messageCount}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {!hasStarted ? (
                    <View style={styles.startScreenContainer}>
                        <View style={[styles.avatarBig, { backgroundColor: theme.cardBorder }]}>
                            <Ionicons name="sparkles" size={40} color="#58cc02" />
                        </View>
                        <Text style={[styles.startScreenTitle, { color: theme.text }]}>KI Lernbegleiter</Text>
                        <Text style={[styles.startScreenText, { color: theme.icon }]}>Wähle ein Thema und schreibe frei auf Portugiesisch. Die KI korrigiert dich und hilft dir beim Lernen.</Text>
                        <TouchableOpacity style={styles.mainStartBtn} onPress={() => setIsTopicModalVisible(true)}>
                            <Text style={styles.mainStartBtnText}>Chat starten</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={item => item.id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.chatContainer}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="chatbubbles-outline" size={60} color={theme.border} />
                                    <Text style={[styles.emptyText, { color: theme.icon }]}>
                                        {isLoading ? "Die KI bereitet das Gespräch vor..." : `Sag "Olá" und starte deine Übung über das Thema "${topic}"!`}
                                    </Text>
                                </View>
                            )}
                        />

                        {error && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)', borderTopColor: theme.border }]}>
                            <TextInput
                                style={[styles.textInput, { color: theme.text, backgroundColor: isDarkMode ? '#2c2c2e' : '#f0f0f0' }]}
                                placeholder="Schreibe auf Portugiesisch..."
                                placeholderTextColor={theme.icon}
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity 
                                style={[styles.sendButton, { backgroundColor: inputText.trim() && !isLoading ? '#58cc02' : theme.border }]} 
                                onPress={handleSend}
                                disabled={!inputText.trim() || isLoading}
                            >
                                {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                {/* Spacer für die schwebende Tab-Navigation unten */}
                <View style={{ height: 90 }} />
            </KeyboardAvoidingView>

            {/* TOPIC MODAL */}
            <Modal visible={isTopicModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Ionicons name="sparkles" size={50} color="#58cc02" style={{ marginBottom: 15 }} />
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Wähle ein Thema</Text>
                        <Text style={[styles.modalSubtitle, { color: theme.icon }]}>Worüber möchtest du heute auf Portugiesisch sprechen?</Text>
                        <View style={styles.topicButtons}>
                        {['Im Café bestellen', 'Nach dem Weg fragen', 'Smalltalk & Hobbys'].map(t => {
                            const isSelected = customTopic === t;
                            return (
                                <TouchableOpacity key={t} style={[styles.topicBtn, { borderColor: isSelected ? '#58cc02' : theme.border, backgroundColor: isSelected ? 'rgba(88,204,2,0.1)' : 'transparent' }]} onPress={() => setCustomTopic(t)}>
                                    <Text style={[styles.topicBtnText, { color: isSelected ? '#58cc02' : theme.text }]}>{t}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        </View>
                        <Text style={[styles.orText, { color: theme.icon }]}>Oder eigenes Thema:</Text>
                        <TextInput
                            style={[styles.customTopicInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDarkMode ? '#2c2c2e' : '#f0f0f0' }]}
                            placeholder="z.B. Mein letzter Urlaub"
                            placeholderTextColor={theme.icon}
                            value={customTopic}
                            onChangeText={setCustomTopic}
                        />
                        <TouchableOpacity 
                            style={[styles.startBtn, { backgroundColor: customTopic.trim() ? '#58cc02' : theme.border }]}
                            onPress={() => customTopic.trim() && startChat(customTopic.trim())}
                            disabled={!customTopic.trim()}
                        >
                            <Text style={styles.startBtnText}>Chat Starten</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    startScreenContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    avatarBig: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    startScreenTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    startScreenText: { fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 24 },
    mainStartBtn: { backgroundColor: '#58cc02', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, shadowColor: '#58cc02', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    mainStartBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    backButton: { padding: 5, marginRight: 10, marginLeft: -10 },
    header: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1 },
    headerTitleContainer: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    headerSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
    tokenContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(88,204,2,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    tokenText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    keyboardAvoiding: { flex: 1 },
    chatContainer: { padding: 15, paddingBottom: 20 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
    messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    messageRowUser: { justifyContent: 'flex-end' },
    messageRowBot: { justifyContent: 'flex-start' },
    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    messageBubble: { maxWidth: '75%', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
    messageBubbleUser: { backgroundColor: '#58cc02', borderBottomRightRadius: 4 },
    messageBubbleBot: { borderBottomLeftRadius: 4 },
    messageText: { fontSize: 16, lineHeight: 22 },
    messageTextUser: { color: '#fff' },
    errorContainer: { backgroundColor: '#ffcccc', padding: 10, marginHorizontal: 15, borderRadius: 8, marginBottom: 10 },
    errorText: { color: '#cc0000', fontSize: 12, textAlign: 'center' },
    inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center', borderTopWidth: 1 },
    textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, fontSize: 16 },
    sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', padding: 25, borderRadius: 24, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
    topicButtons: { width: '100%', gap: 10 },
    topicBtn: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    topicBtnText: { fontSize: 16, fontWeight: '500' },
    orText: { marginVertical: 15, fontSize: 14 },
    customTopicInput: { width: '100%', height: 45, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
    startBtn: { width: '100%', paddingVertical: 14, borderRadius: 20, alignItems: 'center' },
    startBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});