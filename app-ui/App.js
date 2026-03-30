import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Modal, ActivityIndicator, Platform } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import * as Haptics from 'expo-haptics';

const API_BASE = 'https://ai-japanese-backend.onrender.com';

const VOCAB_DATA = {
    N5: [
        { word: "行く", reading: "いく", meaning: "가다" },
        { word: "食べる", reading: "たべる", meaning: "먹다" },
        { word: "飲む", reading: "のむ", meaning: "마시다" },
        { word: "水", reading: "みず", meaning: "물" },
        { word: "本", reading: "ほん", meaning: "책" },
        { word: "猫", reading: "ねこ", meaning: "고양이" },
        { word: "犬", reading: "いぬ", meaning: "개" }
    ],
    N4: [
        { word: "都合", reading: "つごう", meaning: "사정" },
        { word: "約束", reading: "やくそく", meaning: "약속" },
        { word: "準備", reading: "じゅんび", meaning: "준비" },
        { word: "連絡", reading: "れんらく", meaning: "연락" },
        { word: "趣味", reading: "しゅみ", meaning: "취미" },
        { word: "説明", reading: "せつめい", meaning: "설명" }
    ],
    N3: [
        { word: "条件", reading: "じょうけん", meaning: "조건" },
        { word: "感情", reading: "かんじょう", meaning: "감정" },
        { word: "結果", reading: "けっか", meaning: "결과" },
        { word: "直接", reading: "ちょくせつ", meaning: "직접" },
        { word: "我慢", reading: "がまん", meaning: "참음" },
        { word: "理解", reading: "りかい", meaning: "이해" }
    ],
    N2: [
        { word: "影響", reading: "えいきょう", meaning: "영향" },
        { word: "環境", reading: "かんきょう", meaning: "환경" },
        { word: "評価", reading: "ひょうか", meaning: "평가" },
        { word: "特徴", reading: "とくちょう", meaning: "특징" },
        { word: "現象", reading: "げんしょう", meaning: "현상" },
        { word: "対策", reading: "たいさく", meaning: "대책" }
    ],
    N1: [
        { word: "妥協", reading: "だきょう", meaning: "타협" },
        { word: "顕著", reading: "けんちょ", meaning: "현저함" },
        { word: "矛盾", reading: "むじゅん", meaning: "모순" },
        { word: "網羅", reading: "もうら", meaning: "망라" },
        { word: "懸念", reading: "けねん", meaning: "우려" },
        { word: "模索", reading: "もさく", meaning: "모색" }
    ]
};

const ALL_WORDS = Object.values(VOCAB_DATA).flat();

// Public sound URIs for quick feedback
const SOUND_CORRECT_URI = 'https://www.myinstants.com/media/sounds/correct-ding.mp3';
const SOUND_INCORRECT_URI = 'https://www.myinstants.com/media/sounds/buzzer.mp3';

export default function App() {
    let [fontsLoaded] = useFonts({ DotGothic16_400Regular });

    // Global
    const [activeTab, setActiveTab] = useState('chat');
    const [volume, setVolume] = useState(1.0);
    const [attendance, setAttendance] = useState({});

    // Sound Objects (Preloaded)
    const [correctSoundUrl, setCorrectSoundUrl] = useState();
    const [incorrectSoundUrl, setIncorrectSoundUrl] = useState();

    // Chat
    const [recording, setRecording] = useState(null);
    const [messages, setMessages] = useState([]);
    const [sound, setSound] = useState(null);
    const [selectedWord, setSelectedWord] = useState(null); 
    const scrollViewRef = useRef(null);

    // Vocab & Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState('N5');
    const [dailyGoal, setDailyGoal] = useState(5);
    const [vocabIndex, setVocabIndex] = useState(0);
    const [vocabFeedback, setVocabFeedback] = useState(null);
    const [vocabScore, setVocabScore] = useState(0);
    const [options, setOptions] = useState([]);

    useEffect(() => {
        loadHistory();
        loadAttendance();
        loadSettings();
        // Preload sounds
        Audio.Sound.createAsync({ uri: SOUND_CORRECT_URI }).then(({sound}) => setCorrectSoundUrl(sound)).catch(console.error);
        Audio.Sound.createAsync({ uri: SOUND_INCORRECT_URI }).then(({sound}) => setIncorrectSoundUrl(sound)).catch(console.error);
    }, []);

    useEffect(() => {
        saveHistory(messages);
        if (activeTab === 'chat') {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages, activeTab]);

    useEffect(() => {
        return sound ? () => { sound.unloadAsync(); } : undefined;
    }, [sound]);

    useEffect(() => {
        if (sound) sound.setVolumeAsync(volume).catch(e => console.log('Volume overflow clamped:', e));
    }, [volume]);

    // Reset game when level changes
    useEffect(() => {
        resetVocabSession();
    }, [selectedLevel]);

    const playFx = async (isCorrect) => {
        try {
            if (isCorrect) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                if (correctSoundUrl) await correctSoundUrl.replayAsync();
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                if (incorrectSoundUrl) await incorrectSoundUrl.replayAsync();
            }
        } catch (e) { console.log('SFX play err:', e); }
    };

    const loadSettings = async () => {
        try {
            const savedLevel = await AsyncStorage.getItem('targetLevel');
            const savedGoal = await AsyncStorage.getItem('dailyGoal');
            if (savedLevel) setSelectedLevel(savedLevel);
            if (savedGoal) setDailyGoal(parseInt(savedGoal, 10));
        } catch(e){}
    };

    const saveSettings = async (level, goal) => {
        setIsSettingsOpen(false);
        await AsyncStorage.setItem('targetLevel', level);
        await AsyncStorage.setItem('dailyGoal', goal.toString());
        setSelectedLevel(level);
        setDailyGoal(goal);
    };

    const resetVocabSession = () => {
        setVocabScore(0);
        setVocabIndex(0);
        setVocabFeedback(null);
        generateOptions(0, selectedLevel);
    };

    const loadAttendance = async () => {
        try {
            const data = await AsyncStorage.getItem('attendanceData');
            if (data) setAttendance(JSON.parse(data));
        } catch (e) {}
    };

    const getTodayDateString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const markAttendanceToday = async () => {
        try {
            const today = getTodayDateString();
            const newAtt = { ...attendance, [today]: true };
            setAttendance(newAtt);
            await AsyncStorage.setItem('attendanceData', JSON.stringify(newAtt));
        } catch (e) {}
    };

    const loadHistory = async () => {
        try {
            const historyStr = await AsyncStorage.getItem('chatHistory');
            if (historyStr) setMessages(JSON.parse(historyStr));
            else setMessages([{ role: 'assistant', text: 'こんにちは！(안녕하세요!)', translated: '오른쪽 위 버튼으로 볼륨 조절 가능합니다.', id: Date.now() }]);
        } catch (e) {}
    };
    const saveHistory = async (msgs) => msgs.length > 0 && await AsyncStorage.setItem('chatHistory', JSON.stringify(msgs));
    const clearHistory = async () => setMessages([{ role: 'assistant', text: '会話をリセットしました。', translated: '대화를 초기화했습니다.', id: Date.now() }]);

    const increaseVolume = () => setVolume(prev => Math.min(prev + 0.2, 2.0));
    const decreaseVolume = () => setVolume(prev => Math.max(prev - 0.2, 0.0));

    const playAudio = async (url) => {
        if (!url) return;
        try {
            if (sound) await sound.unloadAsync();
            const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
            const { sound: newSound } = await Audio.Sound.createAsync({ uri: fullUrl }, { shouldPlay: true, volume });
            setSound(newSound);
            await newSound.playAsync();
        } catch (error) { alert("오디오 로드 실패"); }
    };

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
        } catch (err) {}
    };

    const stopRecording = async () => {
        if (!recording) return;
        setRecording(null);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        const tempId = Date.now();
        setMessages(prev => [...prev, { role: 'user', text: "전송 중...", id: tempId, pending: true }]);

        const formData = new FormData();
        formData.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' });
        formData.append('jlpt_level', selectedLevel); 
        formData.append('scenario', '프리토킹'); // Can be expanded

        try {
            const res = await fetch(`${API_BASE}/api/chat/audio`, { method: 'POST', body: formData });
            const data = await res.json();

            setMessages(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = {
                    id: tempId, role: 'user', text: data.user_text_recognized, correction: data.correction, pending: false,
                };
                newHistory.push({
                    id: Date.now() + 1, role: 'assistant', text: data.assistant_reply_jp, translated: data.assistant_reply_ko, tokens: data.tokens, audio_url: data.audio_url,
                });
                return newHistory;
            });
            if(data.audio_url) playAudio(data.audio_url);
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("서버 연결 실패. (한국어/일본어 모두 가능하게 업데이트되었습니다)");
        }
    };

    const renderTokens = (tokens, rawText) => {
        if (!tokens || tokens.length === 0) return <Text style={styles.pixelText}>{rawText}</Text>;
        return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {tokens.map((tok, idx) => (
                    <TouchableOpacity key={idx} style={styles.tokenBtn} onPress={() => setSelectedWord(tok)}>
                        <Text style={styles.pixelTextSmall}>{tok.word}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }

    // ========================================
    // VOCAB LOGIC 
    // ========================================
    const generateOptions = (vIdx, level) => {
        const correctWord = VOCAB_DATA[level][vIdx];
        if(!correctWord) return;

        // Create a unique set of incorrect meanings
        const incorrectPool = ALL_WORDS.filter(w => w.meaning !== correctWord.meaning).map(w => w.meaning);
        const uniqueSet = Array.from(new Set(incorrectPool));
        
        // Shuffle and pick 3
        const shuffledPool = uniqueSet.sort(() => 0.5 - Math.random());
        const chosenIncorrect = shuffledPool.slice(0, 3);
        
        // Merge & Shuffle options
        let finalOptions = [...chosenIncorrect, correctWord.meaning];
        finalOptions = finalOptions.sort(() => 0.5 - Math.random());
        setOptions(finalOptions);
    };

    const handleSelectOption = (selectedMeaning) => {
        if (vocabFeedback !== null) return; 

        const current = VOCAB_DATA[selectedLevel][vocabIndex];
        const isCorrect = (selectedMeaning === current.meaning);
        
        setVocabFeedback(isCorrect ? 'correct' : 'incorrect');
        playFx(isCorrect);
        
        if (isCorrect) {
            const newScore = vocabScore + 1;
            setVocabScore(newScore);
            if (newScore === dailyGoal) {
                alert(`축하합니다! 하루 목표량(${dailyGoal}개) 달성! 출석 도장이 찍혔습니다.`);
                markAttendanceToday();
            }
        }
    };

    const nextVocab = () => {
        setVocabFeedback(null);
        let nextIdx = vocabIndex + 1;
        // Loop back if we exhausted the small list
        if (nextIdx >= VOCAB_DATA[selectedLevel].length) nextIdx = 0; 
        
        setVocabIndex(nextIdx);
        generateOptions(nextIdx, selectedLevel);
    };

    const renderCalendarGrid = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); 

        let grid = [];
        let row = [];

        for (let i = 0; i < firstDayOfWeek; i++) row.push(<View key={`empty-${i}`} style={styles.calCellEmpty} />);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isAttended = attendance[dateStr]; 
            row.push(
                <View key={`day-${day}`} style={[styles.calCell, isAttended && styles.calCellAttended]}>
                    <Text style={[styles.calText, isAttended && styles.calTextAttended]}>{day}</Text>
                </View>
            );
            if (row.length === 7) {
                grid.push(<View key={`row-${day}`} style={styles.calRow}>{row}</View>);
                row = [];
            }
        }
        if (row.length > 0) {
            while (row.length < 7) row.push(<View key={`empty-end-${row.length}`} style={styles.calCellEmpty} />);
            grid.push(<View key={`row-end`} style={styles.calRow}>{row}</View>);
        }

        return (
            <View style={styles.calendarContainer}>
                <Text style={styles.calMonthTitle}>{year}년 {month + 1}월</Text>
                <View style={styles.calRow}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((wk, i) => (
                        <View key={i} style={styles.calHeaderCell}><Text style={styles.calHeaderText}>{wk}</Text></View>
                    ))}
                </View>
                {grid}
            </View>
        );
    };

    // ========================================
    // RENDER WRAPPERS
    // ========================================
    if (!fontsLoaded) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0f380f" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>J-PHONE 3</Text>
                <View style={styles.headerControls}>
                    <TouchableOpacity style={styles.retroBtnSmallInfo} onPress={decreaseVolume}>
                        <Text style={styles.pixelTextSmallInv}>VOL -</Text>
                    </TouchableOpacity>
                    <Text style={styles.volText}>{Math.round(volume * 10)}</Text>
                    <TouchableOpacity style={styles.retroBtnSmallInfo} onPress={increaseVolume}>
                        <Text style={styles.pixelTextSmallInv}>VOL +</Text>
                    </TouchableOpacity>
                    {activeTab === 'chat' && <TouchableOpacity onPress={clearHistory} style={styles.retroBtnSmallErr}><Text style={styles.pixelTextSmallInv}>CLR</Text></TouchableOpacity>}
                </View>
            </View>

            <View style={styles.screenArea}>
                {activeTab === 'chat' && (
                    <View style={{flex: 1}}>
                        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
                            {messages.map((msg) => (
                                <View key={msg.id} style={msg.role === 'user' ? styles.userBubbleWrapper : styles.aiBubbleWrapper}>
                                    {msg.role === 'assistant' && (
                                        <View style={styles.aiHeader}>
                                            <Text style={styles.aiName}>▶ 相手(상대)</Text>
                                            {msg.audio_url && (
                                                <TouchableOpacity style={styles.retroBtnSmall} onPress={() => playAudio(msg.audio_url)}>
                                                    <Text style={styles.pixelTextSmallInv}>재생</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                    <View style={styles.bubbleBase}>
                                        {msg.pending ? (
                                            <Text style={styles.pixelText}>[ 발송중... (한국어 가능) ]</Text>
                                        ) : msg.role === 'assistant' && msg.tokens && msg.tokens.length > 0 ? (
                                            renderTokens(msg.tokens, msg.text)
                                        ) : <Text style={styles.pixelText}>{msg.text}</Text>}
                                        {msg.role === 'assistant' && msg.translated && <Text style={styles.pixelTextDim}>- {msg.translated}</Text>}
                                        {msg.role === 'user' && msg.correction && (
                                            <View style={styles.correctionBox}><Text style={styles.pixelTextDim}>[교정]: {msg.correction}</Text></View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <View style={styles.inputArea}>
                            <TouchableOpacity style={[styles.retroBtnLg, recording ? styles.recordingBtn : null]} onPressIn={startRecording} onPressOut={stopRecording} activeOpacity={0.8}>
                                <Text style={styles.pixelTextInv}>{recording ? "[듣고있음... 손떼면 발송]" : "[ 누르고 말하기 ]"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeTab === 'vocab' && (
                    <ScrollView contentContainerStyle={{flexGrow:1, padding:10}}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                            <Text style={styles.pixelTextSmall}>현재 레벨: {selectedLevel} | 목표: {dailyGoal}개</Text>
                            <TouchableOpacity style={styles.retroBtnSmallInfo} onPress={() => setIsSettingsOpen(true)}>
                                <Text style={styles.pixelTextSmallInv}>[⚙️ 환경설정]</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.pixelTextSmall, {alignSelf: 'flex-end', marginBottom: 10}]}>성공 횟수: {vocabScore} 회</Text>

                        {/* Question Block */}
                        <View style={styles.vocabCard}>
                            <Text style={styles.vocabMeaning}>{VOCAB_DATA[selectedLevel][vocabIndex]?.word}</Text>
                            {vocabFeedback !== null && <Text style={styles.vocabWordHint}>[{VOCAB_DATA[selectedLevel][vocabIndex]?.reading}]</Text>}
                        </View>

                        {/* Multiple Choice Options */}
                        <View style={styles.optionBlock}>
                            {options.map((opt, i) => {
                                let btnStyle = styles.optBtn;
                                let txtStyle = styles.optBtnText;
                                const currentMeaning = VOCAB_DATA[selectedLevel][vocabIndex]?.meaning;
                                
                                if (vocabFeedback) {
                                    if (opt === currentMeaning) {
                                        btnStyle = [styles.optBtn, styles.optBtnCorrect];
                                        txtStyle = [styles.optBtnText, styles.optBtnTextInv];
                                    } else {
                                        btnStyle = [styles.optBtn, styles.optBtnDisabled];
                                        txtStyle = [styles.optBtnText, styles.optBtnTextDisabled];
                                    }
                                }
                                
                                return (
                                    <TouchableOpacity key={i} style={btnStyle} disabled={vocabFeedback !== null} onPress={() => handleSelectOption(opt)}>
                                        <Text style={txtStyle}>{i+1}. {opt}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        
                        {/* Feedback Banner */}
                        {vocabFeedback !== null && (
                            <View style={styles.feedbackBox}>
                                <Text style={vocabFeedback === 'correct' ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                                    {vocabFeedback === 'correct' ? '⭕ 정답!' : '❌ 오답'} (뜻: {VOCAB_DATA[selectedLevel][vocabIndex]?.meaning})
                                </Text>
                                <TouchableOpacity style={[styles.retroBtnLg, {marginTop: 15}]} onPress={nextVocab}>
                                    <Text style={styles.pixelTextInv}>[ 다음 문제 넘어가기 ▶ ]</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                )}

                {activeTab === 'calendar' && (
                    <View style={styles.calendarTab}>
                        <Text style={[styles.pixelText, {alignSelf: 'center', marginBottom: 20}]}>=== 학습 결산 출석부 ===</Text>
                        {renderCalendarGrid()}
                        <View style={{marginTop: 30, backgroundColor: '#8bac0f', padding: 15, borderWidth: 4, borderColor: '#0f380f'}}>
                            <Text style={styles.pixelText}>• 목표 갯수를 채우면 스탬프 획득!</Text>
                            <Text style={styles.pixelText}>• 현재 하루 목표량: {dailyGoal} 개</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Bottom Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]} onPress={() => setActiveTab('chat')}>
                    <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>1. 통화</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'vocab' && styles.tabBtnActive]} onPress={() => setActiveTab('vocab')}>
                    <Text style={[styles.tabText, activeTab === 'vocab' && styles.tabTextActive]}>2. 연습</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'calendar' && styles.tabBtnActive]} onPress={() => setActiveTab('calendar')}>
                    <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>3. 출석</Text>
                </TouchableOpacity>
            </View>

            {/* Keyword Modal */}
            <Modal transparent={true} visible={!!selectedWord} animationType="none" onRequestClose={() => setSelectedWord(null)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setSelectedWord(null)}>
                    <View style={styles.modalContent}>
                        {selectedWord && (
                            <View style={styles.wordDetails}>
                                <Text style={styles.wordBig}>{selectedWord.word}</Text>
                                <Text style={styles.wordReading}>{selectedWord.reading}</Text>
                                <View style={styles.divider} />
                                <Text style={styles.wordMeaning}>{selectedWord.meaning}</Text>
                            </View>
                        )}
                        <Text style={[styles.pixelText, {textAlign: 'center', marginTop: 10}]}>[ 닫기 ]</Text>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Settings Modal */}
            <Modal transparent={true} visible={isSettingsOpen} animationType="slide">
                <View style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.8)'}]}>
                    <View style={styles.modalContentSettings}>
                        <Text style={[styles.wordBig, {marginBottom: 20}]}>⚙️ 학습 설정</Text>
                        
                        <Text style={styles.pixelTextSmall}>JLPT 목표 레벨 선택:</Text>
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 10}}>
                            {['N5','N4','N3','N2','N1'].map(lvl => (
                                <TouchableOpacity key={lvl} style={[styles.lvlBtn, selectedLevel === lvl && styles.lvlBtnActive]} onPress={() => setSelectedLevel(lvl)}>
                                    <Text style={[styles.lvlText, selectedLevel === lvl && styles.lvlTextActive]}>{lvl}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.pixelTextSmall, {marginTop: 20}]}>하루 목표 단어 갯수 설정:</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 10}}>
                            <TouchableOpacity style={styles.retroBtnSmallErr} onPress={() => setDailyGoal(p => Math.max(p-5, 5))}>
                                <Text style={styles.pixelTextSmallInv}>- 5 감소</Text>
                            </TouchableOpacity>
                            <Text style={styles.wordBig}>{dailyGoal}</Text>
                            <TouchableOpacity style={styles.retroBtnSmallInfo} onPress={() => setDailyGoal(p => Math.min(p+5, 50))}>
                                <Text style={styles.pixelTextSmallInv}>+ 5 증가</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{marginTop: 30}}>
                            <TouchableOpacity style={styles.retroBtnLg} onPress={() => saveSettings(selectedLevel, dailyGoal)}>
                                <Text style={styles.pixelTextInv}>[ 적용 및 게임 리셋 ]</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ========================================
// STYLES
// ========================================
const FONT = 'DotGothic16_400Regular';
const COLOR_BG = '#9bbc0f';
const COLOR_FG = '#0f380f';
const COLOR_FG_LIGHT = '#306230';
const COLOR_HIGHLIGHT = '#8bac0f';

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: COLOR_BG, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#c4cfa1' },
    
    header: { padding: 10, backgroundColor: COLOR_FG, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: COLOR_FG_LIGHT },
    headerTitle: { fontSize: 22, fontFamily: FONT, color: COLOR_BG },
    headerControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    volText: { fontFamily: FONT, color: COLOR_BG, fontSize: 14, width: 22, textAlign: 'center' },
    
    screenArea: { flex: 1, backgroundColor: COLOR_BG, borderWidth: 8, borderColor: '#555', margin: 10, borderRadius: 10, overflow: 'hidden' },
    
    // TABS
    tabBar: { flexDirection: 'row', backgroundColor: COLOR_FG, padding: 5, paddingBottom: Platform.OS === 'ios' ? 20 : 5 },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, marginHorizontal: 2, borderWidth: 2, borderColor: COLOR_BG },
    tabBtnActive: { backgroundColor: COLOR_BG },
    tabText: { fontFamily: FONT, fontSize: 18, color: COLOR_BG },
    tabTextActive: { color: COLOR_FG, fontWeight: 'bold' },

    // CORE FONTS
    pixelText: { fontFamily: FONT, fontSize: 16, color: COLOR_FG, lineHeight: 24 },
    pixelTextDim: { fontFamily: FONT, fontSize: 14, color: COLOR_FG_LIGHT, marginTop: 4 },
    pixelTextInv: { fontFamily: FONT, fontSize: 16, color: COLOR_BG, textAlign: 'center' },
    pixelTextSmall: { fontFamily: FONT, fontSize: 14, color: COLOR_FG, fontWeight: 'bold' },
    pixelTextSmallInv: { fontFamily: FONT, fontSize: 14, color: COLOR_BG },

    // CALENDAR GRID
    calendarTab: { flex: 1, padding: 20 },
    calendarContainer: { borderWidth: 4, borderColor: COLOR_FG, backgroundColor: COLOR_HIGHLIGHT, padding: 10 },
    calMonthTitle: { fontFamily: FONT, fontSize: 20, color: COLOR_FG, textAlign: 'center', marginBottom: 10 },
    calRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    calHeaderCell: { flex: 1, alignItems: 'center' },
    calHeaderText: { fontFamily: FONT, fontSize: 14, color: COLOR_FG },
    calCellEmpty: { flex: 1, margin: 2 },
    calCell: { flex: 1, aspectRatio: 1, margin: 2, borderWidth: 2, borderColor: COLOR_FG, backgroundColor: COLOR_BG, alignItems: 'center', justifyContent: 'center' },
    calCellAttended: { backgroundColor: COLOR_FG },
    calText: { fontFamily: FONT, fontSize: 12, color: COLOR_FG },
    calTextAttended: { color: COLOR_BG },

    // CHAT
    scrollContent: { padding: 10, paddingBottom: 20 },
    userBubbleWrapper: { alignSelf: 'flex-end', marginVertical: 6, maxWidth: '85%' },
    aiBubbleWrapper: { alignSelf: 'flex-start', marginVertical: 6, maxWidth: '85%' },
    aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    aiName: { fontFamily: FONT, fontSize: 14, color: COLOR_FG },
    bubbleBase: { padding: 10, borderWidth: 3, borderColor: COLOR_FG, backgroundColor: COLOR_HIGHLIGHT },
    correctionBox: { marginTop: 6, padding: 6, borderTopWidth: 2, borderColor: COLOR_FG, borderStyle: 'dotted' },
    tokenBtn: { borderWidth: 1, borderColor: COLOR_FG, backgroundColor: COLOR_BG, paddingHorizontal: 4, paddingVertical: 2, marginRight: 4, marginBottom: 4 },
    inputArea: { padding: 10, borderTopWidth: 4, borderColor: COLOR_FG, backgroundColor: COLOR_HIGHLIGHT },
    
    // BUTTONS
    retroBtnLg: { backgroundColor: COLOR_FG, padding: 15, borderWidth: 3, borderColor: COLOR_FG_LIGHT },
    recordingBtn: { backgroundColor: '#e74c3c' },
    retroBtnSmall: { backgroundColor: COLOR_FG, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: COLOR_BG },
    retroBtnSmallInfo: { backgroundColor: COLOR_FG_LIGHT, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: COLOR_BG },
    retroBtnSmallErr: { backgroundColor: '#e74c3c', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: COLOR_BG },

    // VOCAB
    vocabCard: { marginVertical: 10, padding: 30, borderWidth: 4, borderColor: COLOR_FG, alignItems: 'center', backgroundColor: COLOR_HIGHLIGHT },
    vocabMeaning: { fontFamily: FONT, fontSize: 40, color: COLOR_FG, textAlign: 'center' },
    vocabWordHint: { fontFamily: FONT, fontSize: 20, color: COLOR_FG_LIGHT, marginTop: 10 },
    
    optionBlock: { flexDirection: 'column', gap: 10 },
    optBtn: { backgroundColor: COLOR_BG, borderWidth: 3, borderColor: COLOR_FG, padding: 15 },
    optBtnCorrect: { backgroundColor: COLOR_FG },
    optBtnDisabled: { opacity: 0.5 },
    optBtnText: { fontFamily: FONT, fontSize: 20, color: COLOR_FG, textAlign: 'center' },
    optBtnTextInv: { color: COLOR_BG },
    optBtnTextDisabled: { color: COLOR_FG_LIGHT },

    feedbackBox: { marginTop: 15, padding: 10, borderWidth: 4, borderColor: COLOR_FG, backgroundColor: COLOR_BG },
    feedbackCorrect: { fontFamily: FONT, fontSize: 24, color: COLOR_FG, textAlign: 'center' },
    feedbackIncorrect: { fontFamily: FONT, fontSize: 24, color: '#e74c3c', textAlign: 'center' },

    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 56, 15, 0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: COLOR_HIGHLIGHT, borderWidth: 4, borderColor: COLOR_FG, padding: 20 },
    modalContentSettings: { width: '90%', backgroundColor: COLOR_BG, borderWidth: 6, borderColor: COLOR_FG, padding: 25 },
    wordDetails: { alignItems: 'center' },
    wordBig: { fontFamily: FONT, fontSize: 36, color: COLOR_FG },
    wordReading: { fontFamily: FONT, fontSize: 18, color: COLOR_FG_LIGHT, marginVertical: 10 },
    divider: { width: '100%', height: 2, backgroundColor: COLOR_FG, marginVertical: 10 },
    wordMeaning: { fontFamily: FONT, fontSize: 24, color: COLOR_FG },

    lvlBtn: { paddingHorizontal: 15, paddingVertical: 10, borderWidth: 3, borderColor: COLOR_FG, backgroundColor: COLOR_HIGHLIGHT },
    lvlBtnActive: { backgroundColor: COLOR_FG },
    lvlText: { fontFamily: FONT, fontSize: 18, color: COLOR_FG },
    lvlTextActive: { color: COLOR_BG },
});