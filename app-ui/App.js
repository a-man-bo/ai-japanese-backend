import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Modal, ActivityIndicator, Platform, Animated, ImageBackground } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const VOCAB_DATA = {
    N5: [
        { word: "行く", reading: "いく", meaning: "가다", exJp: "明日、学校へ行く。", exKo: "내일, 학교에 간다." },
        { word: "食べる", reading: "たべる", meaning: "먹다", exJp: "朝ごはんを食べる。", exKo: "아침밥을 먹는다." },
        { word: "飲む", reading: "のむ", meaning: "마시다", exJp: "冷たい水を飲む。", exKo: "차가운 물을 마신다." },
        { word: "水", reading: "みず", meaning: "물", exJp: "コップに水を入れる。", exKo: "컵에 물을 넣는다." },
        { word: "本", reading: "ほん", meaning: "책", exJp: "図書館で本を借りる。", exKo: "도서관에서 책을 빌린다." },
        { word: "猫", reading: "ねこ", meaning: "고양이", exJp: "白い猫が寝ている。", exKo: "하얀 고양이가 자고 있다." },
        { word: "犬", reading: "いぬ", meaning: "개", exJp: "公園で犬と遊ぶ。", exKo: "공원에서 개와 논다." }
    ],
    N4: [
        { word: "都合", reading: "つごう", meaning: "사정", exJp: "明日は都合が悪いです。", exKo: "내일은 사정이 안 좋습니다." },
        { word: "約束", reading: "やくそく", meaning: "약속", exJp: "友達と約束をした。", exKo: "친구와 약속을 했다." },
        { word: "準備", reading: "じゅんび", meaning: "준비", exJp: "旅行の準備をする。", exKo: "여행 준비를 한다." },
        { word: "連絡", reading: "れんらく", meaning: "연락", exJp: "後でまた連絡します。", exKo: "나중에 다시 연락할게요." },
        { word: "趣味", reading: "しゅみ", meaning: "취미", exJp: "私の趣味は読書です。", exKo: "내 취미는 독서입니다." },
        { word: "説明", reading: "せつめい", meaning: "설명", exJp: "ルールを詳しく説明する。", exKo: "규칙을 자세히 설명한다." }
    ],
    N3: [
        { word: "条件", reading: "じょうけん", meaning: "조건", exJp: "厳しい条件を出す。", exKo: "엄격한 조건을 내세운다." },
        { word: "感情", reading: "かんじょう", meaning: "감정", exJp: "自分の感情を抑える。", exKo: "자신의 감정을 억누른다." },
        { word: "結果", reading: "けっか", meaning: "결과", exJp: "良い結果が出る。", exKo: "좋은 결과가 나오다." },
        { word: "直接", reading: "ちょくせつ", meaning: "직접", exJp: "社長に直接話す。", exKo: "사장님에게 직접 이야기하다." },
        { word: "我慢", reading: "がまん", meaning: "참음", exJp: "これ以上我慢できない。", exKo: "더 이상 참을 수 없다." },
        { word: "理解", reading: "りかい", meaning: "이해", exJp: "状況をよく理解する。", exKo: "상황을 잘 이해하다." }
    ],
    N2: [
        { word: "影響", reading: "えいきょう", meaning: "영향", exJp: "環境に影響を与える。", exKo: "환경에 영향을 주다." },
        { word: "環境", reading: "かんきょう", meaning: "환경", exJp: "自然環境を守る。", exKo: "자연 환경을 지키다." },
        { word: "評価", reading: "ひょうか", meaning: "평가", exJp: "高い評価を受ける。", exKo: "높은 평가를 받다." },
        { word: "特徴", reading: "とくちょう", meaning: "특징", exJp: "デザインに特徴がある。", exKo: "디자인에 특징이 있다." },
        { word: "現象", reading: "げんしょう", meaning: "현상", exJp: "不思議な現象が起きる。", exKo: "신비스런 현상이 일어나다." },
        { word: "対策", reading: "たいさく", meaning: "대책", exJp: "早めの対策が必要だ。", exKo: "빠른 대책이 필요하다." }
    ],
    N1: [
        { word: "妥協", reading: "だきょう", meaning: "타협", exJp: "絶対に妥協しない。", exKo: "절대로 타협하지 않는다." },
        { word: "顕著", reading: "けんちょ", meaning: "현저함", exJp: "傾向が顕著に表れる。", exKo: "경향이 현저하게 나타난다." },
        { word: "矛盾", reading: "むじゅん", meaning: "모순", exJp: "彼の発言には矛盾がある。", exKo: "그의 발언에는 모순이 있다." },
        { word: "網羅", reading: "もうら", meaning: "망라", exJp: "全分野を網羅する。", exKo: "모든 분야를 망라하다." },
        { word: "懸念", reading: "けねん", meaning: "우려", exJp: "将来への懸念を抱く。", exKo: "장래에 대한 우려를 품다." },
        { word: "模索", reading: "もさく", meaning: "모색", exJp: "解決策を模索する。", exKo: "해결책을 모색하다." }
    ]
};

const ALL_WORDS = Object.values(VOCAB_DATA).flat();

export default function App() {
    let [fontsLoaded] = useFonts({ DotGothic16_400Regular });

    const [activeTab, setActiveTab] = useState('vocab'); 
    const [attendance, setAttendance] = useState({});

    // JRPG App States
    const [gold, setGold] = useState(0);
    const [inventory, setInventory] = useState([]);
    const [equipped, setEquipped] = useState({ hat: null, glasses: null, top: null, bottom: null, shoes: null });
    const [gachaResult, setGachaResult] = useState(null);

    const [selectedWord, setSelectedWord] = useState(null); 
    const [voices, setVoices] = useState([]);

    // Vocab & Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState('N5');
    const [dailyGoal, setDailyGoal] = useState(10);
    const [vocabIndex, setVocabIndex] = useState(0);
    
    // Feedback States
    const [vocabFeedback, setVocabFeedback] = useState(null); // 'correct' | 'incorrect'
    const [selectedAnswer, setSelectedAnswer] = useState(null); // the exact option string clicked
    const [vocabScore, setVocabScore] = useState(0);
    const [options, setOptions] = useState([]);
    
    // Animation
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const initVoices = async () => {
            try {
                const allVoices = await Speech.getAvailableVoicesAsync();
                const jpVoices = allVoices.filter(v => v.language.includes('ja') || v.language.includes('jp'));
                setVoices(jpVoices);
            } catch(e) {}
        };
        initVoices();

        loadAttendance();
        loadSettings();

        // Idle Gold Ticker:
        const timer = setInterval(() => {
            setGold(prev => prev + 1);
            setLastLoginTime(Date.now());
        }, 60000);
        return () => clearInterval(timer);
    }, []);


    useEffect(() => {
        const saveGameState = async () => {
            try {
                await AsyncStorage.setItem('gold', gold.toString());
                await AsyncStorage.setItem('inventory', JSON.stringify(inventory));
                await AsyncStorage.setItem('equipped', JSON.stringify(equipped));
                await AsyncStorage.setItem('lastLoginTime', lastLoginTime.toString());
            } catch(e){}
        };
        saveGameState();
    }, [gold, inventory, equipped, lastLoginTime]);

    useEffect(() => { resetVocabSession(); }, [selectedLevel]);

    const getRandomVoice = () => {
        if(voices && voices.length > 0) {
            return voices[Math.floor(Math.random() * voices.length)].identifier;
        }
        return undefined;
    };

    const playFxAndAnimate = async (isCorrect) => {
        try {
            if (isCorrect) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                // JRPG Combat Shake (Screen Shaking on wrong answer purely!)
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 12, duration: 45, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 12, duration: 45, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true })
                ]).start();
            }
        } catch (e) {
            console.log(e);
        }
    };

    const loadSettings = async () => {
        try {
            const savedLevel = await AsyncStorage.getItem('targetLevel');
            const savedGoal = await AsyncStorage.getItem('dailyGoal');
            if (savedLevel) setSelectedLevel(savedLevel);
            if (savedGoal) setDailyGoal(parseInt(savedGoal, 10));

            const savedGold = await AsyncStorage.getItem('gold');
            if (savedGold) setGold(parseInt(savedGold, 10));
            
            const savedInv = await AsyncStorage.getItem('inventory');
            if (savedInv) setInventory(JSON.parse(savedInv));

            const savedEquip = await AsyncStorage.getItem('equipped');
            if (savedEquip) setEquipped(JSON.parse(savedEquip));

            const savedTime = await AsyncStorage.getItem('lastLoginTime');
            const now = Date.now();
            if (savedTime) {
                const diffMs = now - parseInt(savedTime, 10);
                const diffMin = Math.floor(diffMs / 60000);
                if (diffMin > 0) {
                    const earned = diffMin * 1;
                    if (earned > 0) {
                        setTimeout(() => alert(`마을 복귀!\n부재 중 쌓인 보상 ${earned}G를 획득했습니다.`), 800);
                        setGold(g => g + earned);
                    }
                }
            }
            setLastLoginTime(now);
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
        setSelectedAnswer(null);
        Speech.stop(); 
        generateOptions(0, selectedLevel);
    };

    const getTodayDateString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const loadAttendance = async () => {
        try {
            const data = await AsyncStorage.getItem('attendanceData');
            if (data) setAttendance(JSON.parse(data));
        } catch (e) {}
    };
    const markAttendanceToday = async () => {
        try {
            const today = getTodayDateString();
            const newAtt = { ...attendance, [today]: true };
            setAttendance(newAtt);
            await AsyncStorage.setItem('attendanceData', JSON.stringify(newAtt));
        } catch (e) {}
    };


    // ========================================
    // VOCAB LOGIC V9 JRPG Edition
    // ========================================
    const generateOptions = (vIdx, level) => {
        const currentWord = VOCAB_DATA[level][vIdx];
        if(!currentWord) return;
        
        const incorrectPool = ALL_WORDS.filter(w => w.meaning !== currentWord.meaning).map(w => w.meaning);
        const uniqueSet = Array.from(new Set(incorrectPool));
        const shuffledPool = uniqueSet.sort(() => 0.5 - Math.random());
        
        let finalOptions = [...shuffledPool.slice(0, 3), currentWord.meaning];
        setOptions(finalOptions.sort(() => 0.5 - Math.random()));
    };

    const handleSelectOption = (selectedMeaning) => {
        if (vocabFeedback !== null) return; 
        const current = VOCAB_DATA[selectedLevel][vocabIndex];
        const isCorrect = (selectedMeaning === current.meaning);
        
        setSelectedAnswer(selectedMeaning);
        setVocabFeedback(isCorrect ? 'correct' : 'incorrect');
        playFxAndAnimate(isCorrect);
        
        if (isCorrect) {
            const newScore = vocabScore + 1;
            setVocabScore(newScore);
            Speech.speak(current.word, { language: 'ja', rate: 0.85, voice: getRandomVoice() });
            
            if (newScore === 1) markAttendanceToday(); 
        } else {
            const reward = vocabScore * 10;
            if (reward > 0) {
                setTimeout(() => {
                    alert(`전투 오버!\n연속 ${vocabScore}콤보 달성.\n보상으로 ${reward}G를 획득했습니다!`);
                    setGold(g => g + reward);
                }, 600);
            }
        }
    };

    const nextVocab = () => {
        if (vocabFeedback === 'incorrect') {
            setVocabScore(0);
        }
        setVocabFeedback(null);
        setSelectedAnswer(null);
        Speech.stop(); 
        let nextIdx = (vocabIndex + 1) % VOCAB_DATA[selectedLevel].length;
        setVocabIndex(nextIdx);
        generateOptions(nextIdx, selectedLevel);
    };

    const readLoudly = () => {
        const current = VOCAB_DATA[selectedLevel][vocabIndex];
        Speech.stop();
        const v = getRandomVoice();
        Speech.speak(current.word, { language: 'ja', rate: 0.85, voice: v });
        Speech.speak(current.exJp, { language: 'ja', rate: 0.95, voice: v });
    };

    // ========================================
    // GACHA & INVENTORY SYSTEM
    // ========================================
    const drawItem = () => {
        if (gold < 100) {
            alert('골드가 부족합니다! (100G 필요)');
            return;
        }
        setGold(prev => prev - 100);
        
        const types = ['hat', 'glasses', 'top', 'bottom', 'shoes'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const rand = Math.random();
        let grade, color, nameObj;
        if (rand < 0.01) { grade = 'Legendary'; color = '#ffeb3b'; nameObj = '신화의'; } 
        else if (rand < 0.10) { grade = 'Epic'; color = '#e91e63'; nameObj = '영웅의'; }     
        else if (rand < 0.40) { grade = 'Rare'; color = '#03a9f4'; nameObj = '희귀한'; }     
        else { grade = 'Common'; color = '#aaa'; nameObj = '평범한'; }                         

        const typeKor = {hat:'모자', glasses:'안경', top:'상의', bottom:'하의', shoes:'신발'}[type];
        const emojis = {hat:['🧢','🎩','👑','🐶','🐱'], glasses:['🕶️','🥽','👓','😎','🧐'], top:['👕','🧥','👔','🥋','🦺'], bottom:['👖','🩳','👗','👘','🩲'], shoes:['👟','👞','🥾','👡','🩰']}[type];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];

        const newItem = { id: Date.now().toString(), type, typeKor, grade, color, name: `${nameObj} ${typeKor}`, emoji };
        
        setInventory(prev => [newItem, ...prev]);
        setGachaResult(newItem);
    };

    const equipItem = (item) => {
        setEquipped(prev => ({ ...prev, [item.type]: item }));
    };
    
    const unequipItem = (type) => {
        setEquipped(prev => ({ ...prev, [type]: null }));
    };

    const renderExampleBolded = (sentence, targetWord) => {
        if (!sentence) return null;
        const parts = sentence.split(targetWord);
        if (parts.length === 1) return <Text style={styles.exJpText}>{sentence}</Text>;
        
        return (
            <Text style={styles.exJpText}>
                {parts.map((p, i) => (
                    <React.Fragment key={i}>
                        {p}
                        {i < parts.length - 1 && <Text style={styles.exJpBold}>{targetWord}</Text>}
                    </React.Fragment>
                ))}
            </Text>
        );
    }

    const renderCalendarGrid = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
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
                    {/* Checkmark completely removed! Relying purely on cell solid JRPG fill. */}
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
                <Text style={styles.calTitle}>{year}年 {month + 1}月</Text>
                <View style={[styles.calRow, {marginBottom:10}]}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((wk, i) => (
                        <View key={i} style={styles.calHeaderCell}><Text style={styles.calHeaderText}>{wk}</Text></View>
                    ))}
                </View>
                {grid}
            </View>
        );
    };

    if (!fontsLoaded) return <View style={{flex:1, backgroundColor: '#000', justifyContent:'center', alignItems:'center'}}><ActivityIndicator color="#fff" /></View>;

    // Pure JRPG Cosmos Space Gradient
    return (
        <LinearGradient colors={['#050814', '#151b3a', '#1e1b40']} style={styles.container}>
            <SafeAreaView style={{flex: 1}}>
                
                <View style={styles.header}>
                    {activeTab === 'vocab' ? (
                        <View style={styles.progressHeaderObj}>
                            <TouchableOpacity style={styles.iconBtn}><Text style={{fontSize:20, color:'#fff'}}>🪙</Text></TouchableOpacity>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#ff9800' }]} />
                                <Text style={styles.progressText}>COMBO {vocabScore}</Text>
                            </View>
                            <TouchableOpacity style={styles.iconBtn}>
                                <Text style={{fontSize:16, color:'#ffeb3b', fontFamily:FONT_PIXEL}}>{gold} G</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.normalHeader}>
                            <Text style={styles.headerTitlePixel}>기록의 룬</Text>
                        </View>
                    )}
                </View>

                {/* Main Content Area Wrapped with Shake Animation */}
                <Animated.View style={[styles.screenArea, { transform: [{ translateX: shakeAnim }] }]}>
                    
                    {/* ===== VOCAB TAB V9 JRPG ===== */}
                    {activeTab === 'vocab' && (
                        <ScrollView contentContainerStyle={styles.vocabTabWrapper}>
                            
                            {/* JRPG Dialog Box */}
                            <View style={styles.vocabCard}>
                                <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 5}}>
                                    <View style={styles.levelBadge}><Text style={[styles.pixelFontSm, {color:'#fff'}]}>RANK {selectedLevel}</Text></View>
                                    <Text style={styles.pixelFontSm}>엔카운터!</Text>
                                </View>
                                
                                <Text style={styles.vocabAnswerReading}>{VOCAB_DATA[selectedLevel][vocabIndex]?.reading}</Text>
                                <Text style={styles.vocabTargetJapanese}>{VOCAB_DATA[selectedLevel][vocabIndex]?.word}</Text>
                                
                                {vocabFeedback === 'correct' && (
                                    <>
                                        <TouchableOpacity style={styles.ttsBtn} onPress={readLoudly}>
                                            <Text style={[styles.pixelFontSm, {color:'#000'}]}>🔊 전체 재생 마법</Text>
                                        </TouchableOpacity>

                                        <View style={styles.exampleBox}>
                                            <Text style={styles.exampleBadge}>실전 예문</Text>
                                            <View style={{marginTop: 5}}>
                                                {renderExampleBolded(VOCAB_DATA[selectedLevel][vocabIndex]?.exJp, VOCAB_DATA[selectedLevel][vocabIndex]?.word)}
                                            </View>
                                            <Text style={styles.exKo}>{VOCAB_DATA[selectedLevel][vocabIndex]?.exKo}</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Options Box */}
                            <View style={styles.optionBlock}>
                                {options.map((opt, i) => {
                                    const currentMeaning = VOCAB_DATA[selectedLevel][vocabIndex]?.meaning;
                                    const isCorrectOpt = opt === currentMeaning;
                                    
                                    let btnStyle = styles.optBtnV7;
                                    let textStyle = styles.optBtnTextV7;

                                    if (vocabFeedback !== null) {
                                        if (isCorrectOpt) {
                                            // Correct shows Green Flash
                                            btnStyle = [styles.optBtnV7, {backgroundColor: '#32cd32', borderColor: '#000'}];
                                            textStyle = [styles.optBtnTextV7, {color: '#000'}];
                                        } else if (vocabFeedback === 'incorrect' && opt === selectedAnswer) {
                                            // Wrong answer shows Red Pain
                                            btnStyle = [styles.optBtnV7, {backgroundColor: '#ff1e1e', borderColor: '#000'}];
                                            textStyle = [styles.optBtnTextV7, {color: '#fff'}];
                                        } else {
                                            // Remaining incorrect ones disabled
                                            btnStyle = [styles.optBtnV7, {backgroundColor: 'transparent', borderColor: '#444'}];
                                            textStyle = [styles.optBtnTextV7, {color: '#666'}];
                                        }
                                    }

                                    return (
                                        <TouchableOpacity key={i} style={btnStyle} disabled={vocabFeedback !== null} onPress={() => handleSelectOption(opt)}>
                                            <Text style={textStyle}>{opt}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {vocabFeedback !== null && (
                                <TouchableOpacity style={styles.continueBtn} onPress={nextVocab}>
                                    <Text style={[styles.pixelFontLgBtn, {color:'#000'}]}>
                                        {vocabFeedback === 'correct' ? '▶ 공격 계속! (콤보 UP)' : '▶ 부활하여 다시 도전'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}

                    {/* ===== TOWN TAB ===== */}
                    {activeTab === 'town' && (
                        <ImageBackground source={require('./assets/town_bg.png')} style={{flex: 1}} imageStyle={{opacity: 0.8, resizeMode: 'cover'}}>
                            <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 150}}>
                                <View style={styles.townHeader}>
                                    <Text style={[styles.pixelFontLg, {fontSize: 22, color:'#fff', textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: {width: 2, height: 2}}]}>🏰 거점 마을</Text>
                                    <View style={styles.goldBox}>
                                        <Text style={[styles.pixelFontLg, {color:'#ffeb3b', fontSize: 20}]}>{gold} G</Text>
                                        <Text style={[styles.pixelFontSm, {color:'#aaa', marginTop:2}]}>(1분당 1G 누적)</Text>
                                    </View>
                                </View>

                                <View style={styles.shopCard}>
                                    <Text style={[styles.pixelFontLg, {fontSize: 20, color:'#ffeb3b', marginBottom: 15, textAlign:'center'}]}>🛍️ 로토의 장비상점</Text>
                                    <Text style={[styles.pixelFontSm, {color:'#ddd', textAlign:'center', marginBottom: 20, lineHeight:20}]}>
                                        1회 뽑기: 100 G{'\n'}
                                        전투를 통해 골드를 모아 전설의 장비에 도전하라!
                                    </Text>
                                    
                                    <TouchableOpacity style={styles.gachaBtn} onPress={drawItem}>
                                        <Text style={styles.gachaBtnText}>장비 뽑기 (100G)</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </ImageBackground>
                    )}

                    {/* ===== PROFILE TAB ===== */}
                    {activeTab === 'profile' && (
                        <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 150}}>
                            {/* JRPG Status View */}
                            <View style={styles.profileHeaderCard}>
                                <View style={styles.avatarBox}>
                                    <Text style={{fontSize: 60}}>{equipped.hat?.emoji || '🦲'}</Text>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Text style={{fontSize: 26}}>{equipped.glasses?.emoji || '👁️'}</Text>
                                        <Text style={{fontSize: 26}}>👃</Text>
                                    </View>
                                    <Text style={{fontSize: 50}}>{equipped.top?.emoji || '👕'}</Text>
                                    <View style={{flexDirection:'row'}}>
                                        <Text style={{fontSize: 30}}>{equipped.bottom?.emoji || '👖'}</Text>
                                        <Text style={{fontSize: 30}}>{equipped.shoes?.emoji || '👣'}</Text>
                                    </View>
                                </View>
                                <View style={styles.statusBox}>
                                    <Text style={[styles.pixelFontLg, {fontSize: 20, color:'#ffeb3b', marginBottom: 5}]}>용사 (LV.{Math.floor(gold/100) + 1})</Text>
                                    <Text style={[styles.pixelFontSm, {color:'#fff', marginBottom: 2}]}>HP : 999 / 999</Text>
                                    <Text style={[styles.pixelFontSm, {color:'#fff', marginBottom: 2}]}>MP : ∞</Text>
                                    <Text style={[styles.pixelFontSm, {color:'#ffeb3b', marginTop: 10}]}>💰 {gold} G</Text>
                                    
                                    <View style={{marginTop: 15}}>
                                        {['hat', 'glasses', 'top', 'bottom', 'shoes'].map(type => (
                                            <TouchableOpacity key={type} onPress={() => unequipItem(type)} style={styles.equipSlotSm}>
                                                <Text style={[styles.pixelFontSm, {color: equipped[type] ? equipped[type].color : '#555'}]}>
                                                    {equipped[type] ? `[${equipped[type].emoji}] ${equipped[type].name}` : `[-] 미장착`}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* Inventory */}
                            <View style={styles.inventoryCard}>
                                <Text style={[styles.pixelFontLg, {color:'#fff', marginBottom:15}]}>🎒 소지품</Text>
                                {inventory.length === 0 ? (
                                    <Text style={[styles.pixelFontSm, {color:'#555', textAlign:'center'}]}>가진 것이 없다.</Text>
                                ) : (
                                    <View style={styles.invGrid}>
                                        {inventory.map((item, idx) => (
                                            <TouchableOpacity key={item.id + idx} style={[styles.invItemSlot, {borderColor: item.color}]} onPress={() => equipItem(item)}>
                                                <Text style={{fontSize: 24, textAlign:'center'}}>{item.emoji}</Text>
                                                <Text style={[styles.pixelFontSm, {color: item.color, fontSize:10, textAlign:'center', marginTop:2}]} numberOfLines={1}>{item.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Settings Block included in profile */}
                            <View style={styles.settingsCardProfile}>
                                <Text style={[styles.pixelFontLg, {fontSize: 18, color:'#fff', marginBottom:15}]}>⚙️ 시스템 / 레벨 설정</Text>
                                <Text style={[styles.pixelFontSm, {color:'#aaa'}]}>적 레벨 (JLPT 범위):</Text>
                                <View style={styles.levelRowProfile}>
                                    {['N5','N4','N3','N2','N1'].map(lvl => (
                                        <TouchableOpacity key={lvl} style={[styles.setLvlBtn, selectedLevel === lvl && styles.setLvlBtnActive]} onPress={async () => {
                                            setSelectedLevel(lvl);
                                            await AsyncStorage.setItem('targetLevel', lvl);
                                        }}>
                                            <Text style={[styles.pixelFontLg, {color: selectedLevel===lvl?'#000':'#fff'}]}>{lvl}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Calendar included in profile */}
                            <View style={{marginTop: 20}}>
                                {renderCalendarGrid()}
                                <View style={[styles.calInfoCard, {marginTop: 5}]}>
                                    <Text style={[styles.pixelFontLg, {color:'#fff'}]}>📌 모험가 수첩</Text>
                                    <Text style={[styles.pixelFontSm, {color:'#aaa'}]}>꾸준히 몬스터를 토벌하여 기록을 남기자.</Text>
                                </View>
                            </View>

                        </ScrollView>
                    )}
                </Animated.View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNav}>
                    <TouchableOpacity style={[styles.navItem, activeTab === 'vocab' && styles.navItemActive]} onPress={() => setActiveTab('vocab')}>
                        <Text style={[styles.navText, activeTab === 'vocab' && styles.navTextActive]}>⚔️ 전투</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.navItem, activeTab === 'town' && styles.navItemActive]} onPress={() => setActiveTab('town')}>
                        <Text style={[styles.navText, activeTab === 'town' && styles.navTextActive]}>🏰 마을</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]} onPress={() => setActiveTab('profile')}>
                        <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>👤 거점</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            <Modal transparent={true} visible={!!selectedWord} animationType="fade" onRequestClose={() => setSelectedWord(null)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setSelectedWord(null)}>
                    <View style={styles.dictCard}>
                        {selectedWord && (
                            <>
                                <Text style={{fontSize: 28, fontWeight:'bold', marginBottom:5, color:'#fff'}}>{selectedWord.word}</Text>
                                <Text style={{fontSize: 14, color:'#aaa', marginBottom:15}}>({selectedWord.reading})</Text>
                                <View style={{height:3, width:'100%', backgroundColor:'#fff', marginBottom:15}} />
                                <Text style={[styles.pixelFontLg, {color:'#fff'}]}>{selectedWord.meaning}</Text>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal transparent={true} visible={isSettingsOpen} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.settingsCard}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:20}}>
                            <Text style={[styles.pixelFontLg, {fontSize: 24, color:'#fff'}]}>⚙️ 시스템 옵션</Text>
                            <TouchableOpacity onPress={() => setIsSettingsOpen(false)}><Text style={{fontSize:24, color:'#fff'}}>✕</Text></TouchableOpacity>
                        </View>
                        
                        <Text style={[styles.pixelFontSm, {color:'#aaa'}]}>적 레벨 (JLPT 범위):</Text>
                        <View style={styles.levelRow}>
                            {['N5','N4','N3','N2','N1'].map(lvl => (
                                <TouchableOpacity key={lvl} style={[styles.setLvlBtn, selectedLevel === lvl && styles.setLvlBtnActive]} onPress={() => setSelectedLevel(lvl)}>
                                    <Text style={[styles.pixelFontLg, {color: selectedLevel===lvl?'#000':'#fff'}]}>{lvl}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.pixelFontSm, {marginTop: 30, color:'#aaa'}]}>일일 목표량:</Text>
                        <View style={styles.goalRow}>
                            <TouchableOpacity style={styles.goalBtn} onPress={() => setDailyGoal(p => Math.max(p-5, 5))}>
                                <Text style={[styles.pixelFontLgBtn, {color:'#fff'}]}>- 5</Text>
                            </TouchableOpacity>
                            <Text style={[styles.pixelFontLgBtn, {flex:1, textAlign:'center', color:'#fff'}]}>{dailyGoal} 체</Text>
                            <TouchableOpacity style={styles.goalBtn} onPress={() => setDailyGoal(p => Math.min(p+5, 50))}>
                                <Text style={[styles.pixelFontLgBtn, {color:'#fff'}]}>+ 5</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.continueBtn, {marginTop: 40}]} onPress={() => saveSettings(selectedLevel, dailyGoal)}>
                            <Text style={[styles.pixelFontLgBtn, {color:'#000'}]}>설정 저장 및 데이터 리셋</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* GACHA RESULT MODAL */}
            <Modal transparent={true} visible={!!gachaResult} animationType="fade" onRequestClose={() => setGachaResult(null)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGachaResult(null)}>
                    <View style={[styles.dictCard, {borderColor: gachaResult?.color || '#fff'}]}>
                        {gachaResult && (
                            <View style={{alignItems:'center'}}>
                                <Text style={[styles.pixelFontLg, {color: '#fff', marginBottom: 20}]}>✨ 장비 획득! ✨</Text>
                                <Text style={{fontSize: 60, marginBottom: 15}}>{gachaResult.emoji}</Text>
                                <Text style={[styles.pixelFontLg, {color: gachaResult.color, fontSize: 22, marginTop: 10}]}>{gachaResult.grade}</Text>
                                <Text style={[styles.pixelFontLg, {color: '#fff', fontSize: 18, marginTop: 5}]}>{gachaResult.name}</Text>
                                <TouchableOpacity style={[styles.continueBtn, {marginTop: 30, width: '100%'}]} onPress={() => setGachaResult(null)}>
                                    <Text style={[styles.pixelFontLgBtn, {color:'#000'}]}>확인</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </LinearGradient>
    );
}

// ========================================
// STYLES : JRPG DARK THEME Edition
// ========================================
const FONT_PIXEL = 'DotGothic16_400Regular';

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 10 },
    
    normalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
    headerTitlePixel: { fontFamily: FONT_PIXEL, fontSize: 24, color: '#fff' },
    
    // RPG Health Bar (HP)
    progressHeaderObj: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: { padding: 5, paddingHorizontal: 10 },
    progressBarContainer: { flex: 1, backgroundColor: '#000', borderWidth: 3, borderBottomWidth: 6, borderColor: '#fff', borderRadius: 8, height: 26, marginHorizontal: 10, overflow: 'hidden', justifyContent: 'center'},
    progressBarFill: { height: '100%', backgroundColor: '#32cd32', borderRightWidth: 3, borderColor: '#000' }, // Vibrant Green HP
    progressText: { position: 'absolute', alignSelf: 'center', fontFamily: FONT_PIXEL, fontSize: 13, color: '#fff', textShadowColor: '#000', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 0 },

    screenArea: { flex: 1 },
    
    // Bottom Nav (Chunky Modern + Retro)
    bottomNav: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.9)', borderTopWidth: 4, borderColor: '#fff', paddingVertical: 8, paddingHorizontal: 5 },
    navItem: { flex: 1, alignItems: 'center', paddingVertical: 12, marginHorizontal: 4, borderRadius: 8, backgroundColor: 'transparent' },
    navItemActive: { backgroundColor: '#ffeb3b', borderWidth: 3, borderBottomWidth: 6, borderColor: '#000' }, 
    navText: { fontFamily: FONT_PIXEL, fontSize: 14, color: '#aaa' },
    navTextActive: { color: '#000', fontWeight: 'bold' },

    // ========================================
    // VOCAB V9 (JRPG Dialog Box & Combat)
    // ========================================
    vocabTabWrapper: { padding: 20, flexGrow:1, paddingBottom: 150 },
    
    // The Dialog Box Element
    vocabCard: { backgroundColor: 'rgba(0, 0, 0, 0.85)', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 20, marginBottom: 15, minHeight: 180 },
    levelBadge: { backgroundColor: '#212250', paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderColor: '#fff', borderRadius: 4 },
    pixelFontSm: { fontFamily: FONT_PIXEL, fontSize: 14, color: '#bbb' },
    pixelFontLg: { fontFamily: FONT_PIXEL, fontSize: 16, color: '#fff' },
    pixelFontLgBtn: { fontFamily: FONT_PIXEL, fontSize: 18, color: '#000' },

    vocabTargetJapanese: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginVertical: 8 },
    vocabAnswerReading: { fontFamily: FONT_PIXEL, fontSize: 16, color: '#aaa', textAlign: 'center', marginTop: 5 },
    
    ttsBtn: { alignSelf: 'flex-end', padding: 8, backgroundColor: '#ffeb3b', borderWidth: 3, borderBottomWidth: 5, borderColor: '#000', borderRadius: 6, marginBottom: 10 },

    exampleBox: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderWidth: 2, borderColor: '#555', borderRadius: 6 },
    exampleBadge: { alignSelf: 'flex-start', fontFamily: FONT_PIXEL, fontSize: 12, backgroundColor: '#fff', color: '#000', paddingHorizontal: 6, paddingVertical: 2, marginBottom: 5, borderRadius: 4 },
    exJpText: { fontSize: 15, color: '#fff', lineHeight: 22, fontWeight: '500' },
    exJpBold: { fontSize: 16, fontWeight: 'bold', color: '#ffeb3b' },
    exKo: { fontFamily: FONT_PIXEL, fontSize: 14, color: '#aaa', marginTop: 8 },

    // The Options Matrix
    optionBlock: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 5 },
    optBtnV7: { width: '48%', marginBottom: 12, backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingVertical: 14, borderWidth: 3, borderBottomWidth: 7, borderColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    optBtnTextV7: { fontFamily: FONT_PIXEL, fontSize: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold' },

    continueBtn: { backgroundColor: '#ffeb3b', borderWidth: 3, borderBottomWidth: 8, borderColor: '#000', borderRadius: 8, paddingVertical: 15, marginTop: 10, alignItems: 'center' },

    // ========================================
    // CALENDAR TAB (Quest Log)
    // ========================================
    calendarContainer: { backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 20 },
    calTitle: { fontFamily: FONT_PIXEL, fontSize: 24, color: '#fff', textAlign: 'center', marginBottom: 15 },
    calRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    calHeaderCell: { flex: 1, alignItems: 'center' },
    calHeaderText: { fontFamily: FONT_PIXEL, fontSize: 16, color: '#aaa', fontWeight: 'bold' },
    calCellEmpty: { flex: 1, margin: 2 },
    calCell: { flex: 1, aspectRatio: 1, margin: 2, borderWidth: 2, borderColor: '#333', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    calCellAttended: { backgroundColor: '#fff', borderColor: '#fff', borderWidth: 2 },
    calText: { fontFamily: FONT_PIXEL, fontSize: 16, color: '#555' },
    calTextAttended: { color: '#000', fontWeight: 'bold' },
    calInfoCard: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 20, borderWidth: 4, borderColor: '#fff', borderRadius: 8, marginTop: 20 },

    // ========================================
    // MODALS (Settings / Dictionary)
    // ========================================
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    dictCard: { width: '100%', backgroundColor: 'rgba(0,0,0,0.95)', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 25 },
    settingsCard: { width: '100%', backgroundColor: 'rgba(0,0,0,0.95)', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 25 },
    levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    setLvlBtn: { borderWidth: 3, borderBottomWidth: 5, borderColor: '#555', borderRadius: 6, paddingHorizontal: 15, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
    setLvlBtnActive: { backgroundColor: '#ffeb3b', borderColor: '#000' },
    goalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 3, borderColor: '#555', borderRadius: 6, padding: 10, marginTop:10 },
    goalBtn: { backgroundColor: '#222', paddingHorizontal: 20, paddingVertical: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: '#aaa', borderRadius: 6 },

    // ========================================
    // TOWN & PROFILE STYLES
    // ========================================
    townHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    goldBox: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 10, borderWidth: 4, borderColor: '#fff', borderRadius: 8, alignItems: 'center' },
    shopCard: { backgroundColor: 'rgba(0, 0, 0, 0.85)', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 25, marginTop: 10, alignItems: 'center' },
    gachaBtn: { backgroundColor: '#ffeb3b', borderWidth: 3, borderBottomWidth: 8, borderColor: '#000', borderRadius: 8, paddingVertical: 15, paddingHorizontal: 30, marginTop: 10 },
    gachaBtnText: { fontFamily: FONT_PIXEL, fontSize: 18, color: '#000', fontWeight: 'bold' },

    profileHeaderCard: { backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 15, flexDirection: 'row' },
    avatarBox: { width: 100, alignItems: 'center', justifyContent: 'center', marginRight: 15, backgroundColor: '#000', borderWidth: 2, borderColor: '#333' },
    statusBox: { flex: 1, justifyContent: 'center' },
    equipSlotSm: { marginBottom: 8, padding: 4, backgroundColor: '#111', borderWidth: 1, borderColor: '#444' },
    
    inventoryCard: { backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 15 },
    invGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    invItemSlot: { backgroundColor: '#111', borderWidth: 2, width: '22%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 5 },
    
    settingsCardProfile: { backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 4, borderColor: '#aaa', borderRadius: 8, padding: 15, marginBottom: 15 },
    levelRowProfile: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }
});