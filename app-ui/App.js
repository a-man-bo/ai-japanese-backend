import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ※ 주의: localhost 대신 본인 컴퓨터 IP나 ngrok/localtunnel URL을 적어야 합니다.
const API_BASE = 'https://petite-poems-jog.loca.lt';

export default function ChatScreen() {
    const [recording, setRecording] = useState(null);
    const [messages, setMessages] = useState([]);
    const [sound, setSound] = useState(null);
    const [selectedWord, setSelectedWord] = useState(null); // 모달 표시용 단어
    const scrollViewRef = useRef(null);

    // 컴포넌트 마운트 시 대화 기록 불러오기
    useEffect(() => {
        loadHistory();
    }, []);

    // messages 상태가 변경될 때마다 자동 저장 및 스크롤 하단 이동
    useEffect(() => {
        saveHistory(messages);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    // 언마운트 시 사운드 해제 (메모리 누수 방지)
    useEffect(() => {
        return sound
            ? () => {
                  sound.unloadAsync();
              }
            : undefined;
    }, [sound]);

    // 1. AsyncStorage 활용: 대화 로드/저장
    const loadHistory = async () => {
        try {
            const historyStr = await AsyncStorage.getItem('chatHistory');
            if (historyStr) {
                setMessages(JSON.parse(historyStr));
            } else {
                setMessages([{ role: 'assistant', text: 'こんにちは！(안녕하세요!)', translated: '무엇을 도와드릴까요?', id: Date.now() }]);
            }
        } catch (e) {
            console.error('History load error:', e);
        }
    };

    const saveHistory = async (msgs) => {
        try {
            if (msgs.length > 0) {
                await AsyncStorage.setItem('chatHistory', JSON.stringify(msgs));
            }
        } catch (e) {
            console.error('History save error:', e);
        }
    };

    const clearHistory = async () => {
        setMessages([{ role: 'assistant', text: 'こんにちは！新しい会話を始めましょう。', translated: '안녕하세요! 새로운 대화를 시작해봅시다.', id: Date.now() }]);
    }

    // 2. TTS 다시 듣기 (오디오 재생)
    const playAudio = async (url) => {
        if (!url) return;
        try {
            // 이미 재생 중인 사운드가 있으면 정지/해제
            if (sound) {
                await sound.unloadAsync();
            }
            const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: fullUrl },
                { shouldPlay: true }
            );
            setSound(newSound);
            await newSound.playAsync();
        } catch (error) {
            console.error('Audio play error:', error);
            alert("오디오 재생에 실패했습니다.");
        }
    };

    // 3. 음성 녹음 관련
    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
        } catch (err) {
            console.error('녹음 시작 실패:', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setRecording(null);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        const tempId = Date.now();
        setMessages(prev => [...prev, { role: 'user', text: "음성 인식 중...", id: tempId, pending: true }]);

        const formData = new FormData();
        formData.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' });
        formData.append('jlpt_level', 'N3');
        formData.append('scenario', '도쿄 카페에서 주문하기');

        try {
            const res = await fetch(`${API_BASE}/api/chat/audio`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            setMessages(prev => {
                const newHistory = [...prev];
                // 기존 '음성 인식 중...' 말풍선을 인식된 일본어 텍스트로 업데이트
                newHistory[newHistory.length - 1] = {
                    id: tempId,
                    role: 'user',
                    text: data.user_text_recognized,
                    correction: data.correction,
                    pending: false,
                };
                
                // AI 답변 추가
                newHistory.push({
                    id: Date.now() + 1,
                    role: 'assistant',
                    text: data.assistant_reply_jp,
                    translated: data.assistant_reply_ko,
                    tokens: data.tokens, // [{word, reading, meaning}]
                    audio_url: data.audio_url,
                });
                return newHistory;
            });
            
            // 자동 재생 원하면 아래 주석 해제
            if(data.audio_url) playAudio(data.audio_url);

        } catch (err) {
            console.error('서버 전송 에러:', err);
            // 에러 시 펜딩 메시지 삭제
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("서버 통신 실패. 백엔드가 켜져 있는지 확인하세요.");
        }
    };

    // 토큰 렌더링 헬퍼 (단어 탭 시)
    const renderTokens = (tokens, rawText) => {
        if (!tokens || tokens.length === 0) {
            return <Text style={styles.messageTextPixel}>{rawText}</Text>;
        }
        
        return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {tokens.map((tok, idx) => (
                    <TouchableOpacity 
                        key={idx} 
                        style={styles.wordToken}
                        onPress={() => setSelectedWord(tok)}
                    >
                        <Text style={styles.messageTextPixel}>{tok.word}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* 픽셀 스타일 헤더 */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>LV.99 AI 선생님</Text>
                <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}><Text style={styles.clearBtnText}>RESET</Text></TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
                {messages.map((msg) => (
                    <View key={msg.id} style={msg.role === 'user' ? styles.userBubbleWrapper : styles.aiBubbleWrapper}>
                        
                        {msg.role === 'assistant' && (
                            <View style={styles.aiHeader}>
                                <Text style={styles.aiName}>▶ 先生 (센세)</Text>
                                {msg.audio_url && (
                                    <TouchableOpacity 
                                        style={styles.playBtn}
                                        onPress={() => playAudio(msg.audio_url)}
                                    >
                                        <Text style={styles.playBtnText}>🔊 다시 듣기</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <View style={[styles.bubbleBase, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                            {msg.pending ? (
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <ActivityIndicator size="small" color="#000" />
                                    <Text style={[styles.messageTextPixel, {marginLeft: 10}]}>{msg.text}</Text>
                                </View>
                            ) : msg.role === 'assistant' && msg.tokens ? (
                                renderTokens(msg.tokens, msg.text)
                            ) : (
                                <Text style={styles.messageTextPixel}>{msg.text}</Text>
                            )}
                            
                            {msg.role === 'assistant' && msg.translated && (
                                <View style={styles.translateBox}>
                                    <Text style={styles.translateTextPixel}>{msg.translated}</Text>
                                </View>
                            )}

                            {msg.role === 'user' && msg.correction && msg.correction !== '' && (
                                <View style={styles.correctionBox}>
                                    <Text style={styles.correctionTitlePixel}>💡 교정 제안</Text>
                                    <Text style={styles.correctionTextPixel}>{msg.correction}</Text>
                                </View>
                            )}
                        </View>

                    </View>
                ))}
            </ScrollView>

            <View style={styles.inputArea}>
                <TouchableOpacity
                    style={[styles.recordBtn, recording ? styles.recordingBtn : null]}
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    activeOpacity={0.8}
                >
                    <Text style={styles.recordBtnText}>
                        {recording ? "[🔴 듣는 중... 손을 떼면 전송]" : "[🎙️ 누른 채로 말하기]"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 단어 사전 픽셀 스타일 모달 */}
            <Modal
                transparent={true}
                visible={!!selectedWord}
                animationType="fade"
                onRequestClose={() => setSelectedWord(null)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPressOut={() => setSelectedWord(null)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>단어 사전</Text>
                            <TouchableOpacity onPress={() => setSelectedWord(null)}>
                                <Text style={styles.closeBtn}>X</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedWord && (
                            <View style={styles.wordDetails}>
                                <Text style={styles.wordBig}>{selectedWord.word}</Text>
                                <Text style={styles.wordReading}>[ {selectedWord.reading} ]</Text>
                                <View style={styles.divider} />
                                <Text style={styles.wordMeaning}>{selectedWord.meaning}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

// 픽셀 아트 스타일 적용 (레트로 게임 느낌)
const PADDING = 12;
const BORDER_WIDTH = 3;
const FONT_FAMILY = 'monospace'; // 스마트폰에서 픽셀느낌을 낼 수 있는 기본 폰트

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#8b9bb4' }, // 레트로 블루/그레이 배경
    header: { 
        paddingVertical: 15, paddingHorizontal: 20, 
        backgroundColor: '#4a5b78', 
        borderBottomWidth: BORDER_WIDTH, 
        borderBottomColor: '#2b3a53',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 5
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffd700', fontFamily: FONT_FAMILY, textShadowColor: '#000', textShadowOffset: {width: 2, height: 2}, textShadowRadius: 0 },
    clearBtn: { backgroundColor: '#e74c3c', paddingHorizontal: 10, paddingVertical: 5, borderWidth: 2, borderColor: '#000', borderRadius: 4, borderBottomWidth: 4 },
    clearBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: FONT_FAMILY },
    scrollContent: { padding: 15, paddingBottom: 40 },
    
    userBubbleWrapper: { alignSelf: 'flex-end', marginVertical: 8, maxWidth: '85%' },
    aiBubbleWrapper: { alignSelf: 'flex-start', marginVertical: 8, maxWidth: '85%' },
    
    aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    aiName: { color: '#ffd700', fontWeight: 'bold', fontSize: 13, fontFamily: FONT_FAMILY, textShadowColor: '#000', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 0 },
    playBtn: { backgroundColor: '#f39c12', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: '#000', borderRadius: 4, borderBottomWidth: 3, marginLeft: 10 },
    playBtnText: { fontSize: 11, fontWeight: 'bold', color: '#fff', fontFamily: FONT_FAMILY },
    
    // 글로벌 단단한 모서리와 굵은 테두리 (픽셀 느낌의 핵심)
    bubbleBase: {
        padding: PADDING,
        borderWidth: BORDER_WIDTH,
        borderColor: '#000',
        borderRadius: 2,
        // 하드 드롭 섀도우
        borderBottomWidth: 6,
        borderRightWidth: 4,
    },
    userBubble: { backgroundColor: '#a8e6cf' }, // 예쁜 파스텔 그린
    aiBubble: { backgroundColor: '#fff' }, // 흰 배경에 검은 테두리로 클래식 RPG 느낌
    
    messageTextPixel: { fontSize: 16, fontFamily: FONT_FAMILY, color: '#000', lineHeight: 22 },
    
    // 개별 단어 디자인
    wordToken: {
        backgroundColor: '#f1f2f6',
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 2,
        paddingHorizontal: 3,
        paddingVertical: 1,
        marginRight: 4,
        marginBottom: 4,
    },

    translateBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopStyle: 'dashed', borderColor: '#ccc' },
    translateTextPixel: { fontSize: 14, color: '#555', fontFamily: FONT_FAMILY },
    
    correctionBox: { marginTop: 10, backgroundColor: '#ffeaa7', padding: 8, borderWidth: 2, borderColor: '#000', borderRadius: 2 },
    correctionTitlePixel: { fontWeight: 'bold', color: '#d35400', fontSize: 13, fontFamily: FONT_FAMILY, marginBottom: 4 },
    correctionTextPixel: { fontSize: 13, color: '#000', fontFamily: FONT_FAMILY, lineHeight: 18 },

    inputArea: { padding: 15, backgroundColor: '#4a5b78', borderTopWidth: BORDER_WIDTH, borderColor: '#2b3a53' },
    recordBtn: { 
        padding: 16, 
        backgroundColor: '#2ecc71', 
        borderWidth: BORDER_WIDTH, 
        borderColor: '#000', 
        borderRadius: 4,
        borderBottomWidth: 6,
        borderRightWidth: 4,
        alignItems: 'center' 
    },
    recordingBtn: { backgroundColor: '#e74c3c', borderBottomWidth: 2, borderRightWidth: 2, marginTop: 4, marginLeft: 2 }, // 눌렸을 때 효과
    recordBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff', fontFamily: FONT_FAMILY, textShadowColor: '#000', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 0 },

    // 모달 스타일 (픽셀 RPG 아이템 정보창 느낌)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { 
        width: '80%', 
        backgroundColor: '#34495e', 
        borderWidth: 4, 
        borderColor: '#ecf0f1', 
        borderRadius: 2,
        padding: 0,
    },
    modalHeader: { 
        backgroundColor: '#2c3e50', 
        padding: 10, 
        borderBottomWidth: 4, 
        borderColor: '#ecf0f1',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: { color: '#fff', fontWeight: 'bold', fontFamily: FONT_FAMILY, fontSize: 16 },
    closeBtn: { color: '#e74c3c', fontWeight: '900', fontSize: 18, fontFamily: FONT_FAMILY },
    wordDetails: { padding: 20, alignItems: 'center' },
    wordBig: { fontSize: 28, fontWeight: 'bold', color: '#f1c40f', fontFamily: FONT_FAMILY, marginBottom: 5 },
    wordReading: { fontSize: 16, color: '#ecf0f1', fontFamily: FONT_FAMILY, marginBottom: 15 },
    divider: { width: '80%', height: 2, backgroundColor: '#7f8c8d', marginBottom: 15 },
    wordMeaning: { fontSize: 18, color: '#fff', fontFamily: FONT_FAMILY, textAlign: 'center' }
});