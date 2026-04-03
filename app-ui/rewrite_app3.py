import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Modal, ActivityIndicator, Platform, Animated, ImageBackground, Image } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { VOCAB_DATA, ALL_WORDS } from './vocabData.js';

const ITEM_IMAGES = {
    sword_legendary: require('./assets/sprites/objects/icons & objects/weapon sprites/one_0108_v03.png'),
    chest: require('./assets/sprites/objects/19.07c - Treasure Chests 1.2a/treasure chests.png'),
    npc_shop: require('./assets/sprites/characters/npcs/npc woman A v01.png'),
    npc_slime: require('./assets/sprites/monsters/monsters/slippery slime v01.png'),
    npc_guild: require('./assets/sprites/characters/npcs/npc man A v01.png'),
    avatar: require('./assets/sprites/characters/base_skin_1.png'),
    bg: require('./assets/backgrounds/town_bg.png'),
    btn: require('./assets/ui/btn_texture.png'),
    battleBg: require('./assets/tilesets/tilesets/seasonal sample (spring).png'),
    enemy_slime: require('./assets/sprites/monsters/monsters/slippery slime v01.png')
};

const ENEMY_IMAGES = [
    require('./assets/sprites/monsters/monsters/slippery slime v01.png'),
    require('./assets/sprites/characters/npcs/npc man A v01.png'),
    require('./assets/sprites/characters/npcs/npc woman A v01.png'),
    require('./assets/sprites/characters/base_skin_2.png'),
    require('./assets/sprites/characters/base_skin_3.png'),
    require('./assets/sprites/characters/base_skin_4.png'),
    require('./assets/sprites/characters/base_skin_5.png')
];

const BG_IMAGES = [
    require('./assets/tilesets/tilesets/seasonal sample (spring).png'),
    require('./assets/tilesets/tilesets/seasonal sample (summer).png'),
    require('./assets/tilesets/tilesets/seasonal sample (autumn).png'),
    require('./assets/tilesets/tilesets/seasonal sample (winter).png')
];

const PixelButton = ({ style, onPress, disabled, children, activeOpacity }) => (
    <TouchableOpacity style={[style, { overflow: 'hidden' }]} onPress={onPress} disabled={disabled} activeOpacity={activeOpacity || 0.8}>
        <ImageBackground source={ITEM_IMAGES.btn} style={StyleSheet.absoluteFill} imageStyle={{resizeMode: 'cover', opacity: 0.9}} />
        {children}
    </TouchableOpacity>
);

export default function App() {
    let [fontsLoaded] = useFonts({ DotGothic16_400Regular });

    const [activeTab, setActiveTab] = useState('vocab'); 
    const [attendance, setAttendance] = useState({});

    // JRPG App States
    const [gold, setGold] = useState(0);
    const [crystals, setCrystals] = useState(0);
    const [inventory, setInventory] = useState([]);
    const [equipped, setEquipped] = useState({ hat: null, glasses: null, top: null, bottom: null, shoes: null, weapon: null });
    const [lastLoginTime, setLastLoginTime] = useState(Date.now());
    
    // Gacha & Town Interactive States
    const [gachaResult, setGachaResult] = useState(null);
    const [townDialog, setTownDialog] = useState(null);
    const [chestOpened, setChestOpened] = useState(false);

    const [selectedWord, setSelectedWord] = useState(null); 
    const [voices, setVoices] = useState([]);

    // Vocab & Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState('N5');
    const [vocabIndex, setVocabIndex] = useState(0);
    
    // Feedback States
    const [vocabFeedback, setVocabFeedback] = useState(null); 
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [vocabScore, setVocabScore] = useState(0);
    const [options, setOptions] = useState([]);
    
    // Battle Randomization
    const [currentEnemyImg, setCurrentEnemyImg] = useState(0);
    const [currentBgImg, setCurrentBgImg] = useState(0);

    // Animation
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const idleAnim = useRef(new Animated.Value(0)).current;
    const damageFlashAnim = useRef(new Animated.Value(0)).current;
    const enemyFadeAnim = useRef(new Animated.Value(1)).current;
    const enemyShakeAnim = useRef(new Animated.Value(0)).current; 

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

        // Idle Anim Loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(idleAnim, { toValue: -5, duration: 1200, useNativeDriver: true }),
                Animated.timing(idleAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ])
        ).start();

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
                await AsyncStorage.setItem('crystals', crystals.toString());
                await AsyncStorage.setItem('inventory', JSON.stringify(inventory));
                await AsyncStorage.setItem('equipped', JSON.stringify(equipped));
                await AsyncStorage.setItem('lastLoginTime', lastLoginTime.toString());
                await AsyncStorage.setItem('chestOpenedDate', chestOpened ? new Date().toDateString() : '');
            } catch(e){}
        };
        saveGameState();
    }, [gold, crystals, inventory, equipped, lastLoginTime, chestOpened]);

    useEffect(() => { resetVocabSession(); }, [selectedLevel]);

    const getBestVoice = () => {
        if (!voices || voices.length === 0) return undefined;
        const preferredVoices = ['kyoko', 'ja-jp-x-jab-network', 'female', 'ja-jp-language'];
        for (const pref of preferredVoices) {
            const found = voices.find(v => v.identifier.toLowerCase().includes(pref) || v.name.toLowerCase().includes(pref));
            if (found) return found.identifier;
        }
        return voices[0].identifier;
    };

    const loadSettings = async () => {
        try {
            const savedLevel = await AsyncStorage.getItem('targetLevel');
            if (savedLevel) setSelectedLevel(savedLevel);
            const savedGold = await AsyncStorage.getItem('gold');
            if (savedGold) setGold(parseInt(savedGold, 10));
            const savedCry = await AsyncStorage.getItem('crystals');
            if (savedCry) setCrystals(parseInt(savedCry, 10));
            
            const savedInv = await AsyncStorage.getItem('inventory');
            if (savedInv) setInventory(JSON.parse(savedInv));
            const savedEquip = await AsyncStorage.getItem('equipped');
            if (savedEquip) setEquipped(JSON.parse(savedEquip));

            const savedChestDate = await AsyncStorage.getItem('chestOpenedDate');
            if (savedChestDate === new Date().toDateString()) setChestOpened(true);

            const savedTime = await AsyncStorage.getItem('lastLoginTime');
            const now = Date.now();
            if (savedTime) {
                const diffMs = now - parseInt(savedTime, 10);
                const diffMin = Math.floor(diffMs / 60000);
                if (diffMin > 0) {
                    const earned = diffMin * 1;
                    if (earned > 0) {
                        setGold(g => g + earned);
                    }
                }
            }
            setLastLoginTime(now);
        } catch(e){}
    };
    
    // Status Logic
    const getJobTitle = (lvl) => {
        switch(lvl) {
            case 'N5': return '수습 용사';
            case 'N4': return '초급 모험가';
            case 'N3': return '정예 헌터';
            case 'N2': return '마스터';
            case 'N1': return '전설의 모험왕';
            default: return '무직';
        }
    };

    const calcStats = () => {
        let goldMulti = 1.0;
        let defCount = 0;
        Object.values(equipped).forEach(item => {
            if(item && item.buffMeta) {
                if(item.buffMeta.type === 'gold') goldMulti *= item.buffMeta.val;
                if(item.buffMeta.type === 'shield') defCount += parseInt(item.buffMeta.val);
            }
        });
        return { 
            luk: Math.round((goldMulti - 1.0) * 100), // LUK as % boost 
            def: defCount 
        };
    };
    const playerStats = calcStats();

    const saveSettings = async (level) => {
        setIsSettingsOpen(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await AsyncStorage.setItem('targetLevel', level);
        setSelectedLevel(level);
    };

    const resetVocabSession = () => {
        setVocabScore(0);
        let firstIdx = Math.floor(Math.random() * VOCAB_DATA[selectedLevel].length);
        setVocabIndex(firstIdx);
        setVocabFeedback(null);
        setSelectedAnswer(null);
        enemyFadeAnim.setValue(1);
        enemyShakeAnim.setValue(0);
        setCurrentEnemyImg(Math.floor(Math.random() * ENEMY_IMAGES.length));
        setCurrentBgImg(Math.floor(Math.random() * BG_IMAGES.length));
        Speech.stop(); 
        generateOptions(firstIdx, selectedLevel);
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
        
        if (isCorrect) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Critical Hit on Enemy
            Animated.sequence([
                Animated.timing(enemyShakeAnim, { toValue: 20, duration: 45, useNativeDriver: true }),
                Animated.timing(enemyShakeAnim, { toValue: -20, duration: 45, useNativeDriver: true }),
                Animated.timing(enemyShakeAnim, { toValue: 20, duration: 45, useNativeDriver: true }),
                Animated.timing(enemyShakeAnim, { toValue: -20, duration: 45, useNativeDriver: true }),
                Animated.timing(enemyShakeAnim, { toValue: 0, duration: 45, useNativeDriver: true })
            ]).start(() => {
                Animated.timing(enemyFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
            });

            const newScore = vocabScore + 1;
            setVocabScore(newScore);
            Speech.speak(current.word, { language: 'ja', rate: 0.85, voice: getBestVoice() });
            
            // Earn Gold
            const goldEarned = Math.floor(10 * (1 + playerStats.luk / 100));
            setGold(g => g + goldEarned);

            // Combo Reward
            if (newScore > 0 && newScore % 10 === 0) {
                setCrystals(c => c + 1);
                setTimeout(() => alert(`10콤보 돌파 보상으로 크리스탈 💎1개를 획득했습니다!`), 500);
            }
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            // RED FLASH (Player Damage)
            Animated.sequence([
                Animated.timing(damageFlashAnim, { toValue: 1, duration: 50, useNativeDriver: false }),
                Animated.timing(damageFlashAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
            ]).start();

            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 15, duration: 40, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -15, duration: 40, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 15, duration: 40, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -15, duration: 40, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true })
            ]).start();
            setGold(g => g + (vocabScore * 5)); 
        }
    };

    const nextVocab = () => {
        if (vocabFeedback === 'incorrect') setVocabScore(0);
        setVocabFeedback(null);
        setSelectedAnswer(null);
        enemyFadeAnim.setValue(1);
        enemyShakeAnim.setValue(0);
        
        setCurrentEnemyImg(Math.floor(Math.random() * ENEMY_IMAGES.length));
        setCurrentBgImg(Math.floor(Math.random() * BG_IMAGES.length));

        Speech.stop(); 
        let nextIdx;
        const poolSize = VOCAB_DATA[selectedLevel].length;
        if (poolSize > 1) {
            do { nextIdx = Math.floor(Math.random() * poolSize); } while (nextIdx === vocabIndex);
        } else { nextIdx = 0; }
        setVocabIndex(nextIdx);
        generateOptions(nextIdx, selectedLevel);
    };

    const readLoudly = () => {
        const current = VOCAB_DATA[selectedLevel][vocabIndex];
        Speech.stop();
        const v = getBestVoice();
        Speech.speak(current.word, { language: 'ja', rate: 0.85, voice: v });
        Speech.speak(current.exJp, { language: 'ja', rate: 0.95, voice: v });
    };

    const executeDraw = (mode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (mode === 'single' && gold < 100) return alert('골드가 부족합니다! (100G 필요)');
        if (mode === 'multi' && gold < 1000) return alert('골드가 부족합니다! (1000G 필요)');
        if (mode === 'crystal' && crystals < 10) return alert('크리스탈이 부족합니다! (💎10 필요)');

        if (mode === 'single') setGold(g => g - 100);
        else if (mode === 'multi') setGold(g => g - 1000);
        else if (mode === 'crystal') setCrystals(c => c - 10);

        const drawsCount = mode === 'multi' ? 11 : 1;
        const items = [];
        for(let i=0; i<drawsCount; i++) {
            const rand = Math.random();
            let pLegendary = mode==='crystal' ? 0.2 : 0.05;
            let pEpic = mode==='crystal' ? 0.5 : 0.15;
            let pRare = mode==='crystal' ? 1.0 : 0.40;

            let grade, color, nameObj, buffDesc, buffMeta, badge;
            if (rand < pLegendary) { grade='Legendary'; color='#ffeb3b'; nameObj='신화의'; buffDesc='골드 획득 +20%'; buffMeta={type:'gold', val:1.2}; badge='S'; } 
            else if (rand < pEpic) { grade='Epic'; color='#e91e63'; nameObj='영웅의'; buffDesc='골드 획득 +10%'; buffMeta={type:'gold', val:1.1}; badge='A'; }     
            else if (rand < pRare) { grade='Rare'; color='#03a9f4'; nameObj='희귀한'; buffDesc='골드 획득 +5%'; buffMeta={type:'gold', val:1.05}; badge='B'; }     
            else { grade='Common'; color='#ddd'; nameObj='평범한'; buffDesc='능력치 없음'; buffMeta=null; badge='C'; }                         

            const types = ['hat', 'glasses', 'top', 'bottom', 'shoes', 'weapon'];
            const type = types[Math.floor(Math.random() * types.length)];
            const typeKor = {hat:'모자', glasses:'안경', top:'상의', bottom:'하의', shoes:'신발', weapon:'무기'}[type];
            const emojis = {hat:['🧢','🎩','👑'], glasses:['🕶️','👓','🧐'], top:['👕','🧥','🦺'], bottom:['👖','🩳','👗'], shoes:['👟','🥾'], weapon:['🗡️','🦯','🏹','🛡️']}[type];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];

            let imageKey = (type === 'weapon' && grade === 'Legendary') ? 'sword_legendary' : null;
            items.push({ id: Date.now().toString() + i + Math.random().toString(), type, typeKor, grade, color, name: `${nameObj} ${typeKor}`, emoji, buffDesc, buffMeta, imageKey, badge });
        }
        
        setInventory(prev => [...items, ...prev]);
        setGachaResult(items);
    };

    const drawItem = () => {
        setTownDialog({
            speaker: '장비점 소니아',
            charImage: ITEM_IMAGES.npc_shop,
            text: '어서오세요 모험가님! 필요한 장비가 있나요?',
            options: [
                { label: '단일 뽑기 (100G)', action: () => { setTownDialog(null); executeDraw('single'); } },
                { label: '10+1 연속 뽑기 (1000G)', action: () => { setTownDialog(null); executeDraw('multi'); } },
                { label: '최고급 출현 확정 (💎10)', action: () => { setTownDialog(null); executeDraw('crystal'); } },
                { label: '다음에 올게요', action: () => setTownDialog(null) }
            ]
        });
    };

    const talkToSlime = () => {
        setTownDialog({
            speaker: '마나 슬라임',
            charImage: ITEM_IMAGES.npc_slime,
            text: '말캉말캉... 삐이잇...! (농장에 모인 골드를 달라는 것 같다)',
            options: [
                { label: '골드 수거하기', action: () => { 
                    setTownDialog(null); 
                    alert('누적된 자원을 확인했습니다!'); 
                } },
                { label: '쓰다듬기', action: () => { 
                    setTownDialog(null);
                    alert('슬라임이 기분 좋게 떨립니다.');
                }},
                { label: '그만둔다', action: () => setTownDialog(null) }
            ]
        });
    };

    const talkToGuildGuild = () => {
        const today = getTodayDateString();
        const hasAttended = !!attendance[today];
        
        setTownDialog({
            speaker: '길드 접수원 다이앤',
            charImage: ITEM_IMAGES.npc_guild,
            text: hasAttended 
                ? '오늘의 배급품(출석 보상)은 이미 챙겨드렸어요! 퀘스트(학습)를 이어가세요.' 
                : '오늘도 방문해주셨군요! 길드 인증을 하시고 매일의 배급품을 받아가세요.',
            options: [
                { 
                    label: hasAttended ? '[출석 완료]' : '출석 접수하기 💎', 
                    action: async () => { 
                        setTownDialog(null); 
                        if(!hasAttended) {
                            const newAtt = { ...attendance, [today]: true };
                            setAttendance(newAtt);
                            await AsyncStorage.setItem('attendanceData', JSON.stringify(newAtt));
                            setCrystals(c => c + 2); 
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            alert('출석 완료 찍음! 길드 자금으로 크리스탈 💎2개를 획득했습니다!');
                        }
                    } 
                },
                { label: '그만둔다', action: () => setTownDialog(null) }
            ]
        });
    };

    const openChest = () => {
        if(chestOpened) return alert('오늘은 이미 상자를 열었습니다.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setChestOpened(true);
        const randG = Math.floor(Math.random() * 50) + 50;
        setGold(g => g + randG);
        setCrystals(c => c + 1);
        alert(`보물상자 오픈!
${randG}G 와 크리스탈 💎1개를 얻었습니다.`);
    };

    const equipItem = (item) => { 
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEquipped(prev => ({ ...prev, [item.type]: item })); 
    };
    const unequipItem = (type) => { 
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                        {p}{i < parts.length - 1 && <Text style={styles.exJpBold}>{targetWord}</Text>}
                    </React.Fragment>
                ))}
            </Text>
        );
    }

    if (!fontsLoaded) return <View style={{flex:1, backgroundColor: '#000', justifyContent:'center'}}><ActivityIndicator /></View>;

    return (
        <LinearGradient colors={['#050814', '#151b3a', '#1e1b40']} style={styles.container}>
            <SafeAreaView style={{flex: 1}}>
                <View style={styles.header}>
                    <View style={styles.progressHeaderObj}>
                        <TouchableOpacity style={styles.iconBtn}><Text style={{fontSize:18}}>💎 <Text style={[styles.pixelFontSm, {color:'#fff'}]}>{crystals}</Text></Text></TouchableOpacity>
                        <View style={{flex:1}} />
                        <TouchableOpacity style={styles.iconBtn}><Text style={{fontSize:16, color:'#ffeb3b', fontFamily:FONT_PIXEL}}>💰 {gold} G</Text></TouchableOpacity>
                    </View>
                </View>

                <Animated.View style={[styles.screenArea, { transform: [{ translateX: shakeAnim }] }]}>
                    
                    {/* ===== VOCAB (BATTLE) TAB ===== */}
                    {activeTab === 'vocab' && (
                        <View style={{flex:1}}>
                            <Animated.View style={{position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor: 'rgba(255,0,0,0.6)', zIndex: 10, opacity: damageFlashAnim, pointerEvents: 'none'}} />
                            
                            <ImageBackground source={BG_IMAGES[currentBgImg]} style={{flex: 6, resizeMode: 'cover', justifyContent:'center', alignItems:'center'}}>
                                <View style={{position:'absolute', top: 15, left: 15, backgroundColor:'rgba(0,0,0,0.8)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 5, borderWidth: 2, borderColor:'#ffeb3b'}}>
                                    <Text style={[styles.pixelFontLg, {color:'#ffeb3b', fontSize: 20}]}>COMBO {vocabScore}</Text>
                                    <Text style={[styles.pixelFontSm, {color:'#fff', textAlign:'center'}]}>RANK {selectedLevel}</Text>
                                </View>

                                {vocabFeedback === null && (
                                    <Animated.View style={{alignItems:'center', opacity: enemyFadeAnim, transform: [{translateY: idleAnim}, {translateX: enemyShakeAnim}]}}>
                                        <View style={{flexDirection:'row', marginBottom: 5, width: 80, height: 10, backgroundColor:'#000', borderWidth:2, borderColor:'#fff', borderRadius: 4, overflow: 'hidden'}}>
                                            <View style={{backgroundColor:'#e91e63', width:'100%', height:'100%'}}/>
                                        </View>
                                        
                                        <View style={{backgroundColor:'rgba(0,0,0,0.7)', paddingHorizontal:20, paddingVertical:10, borderRadius:8, borderWidth:2, borderColor:'#fff', marginBottom: 15}}>
                                            <Text style={[styles.pixelFontSm, {color:'#aaa', textAlign:'center'}]}>{VOCAB_DATA[selectedLevel][vocabIndex]?.reading}</Text>
                                            <Text style={{fontSize: 42, fontWeight:'bold', color:'#fff', textAlign:'center'}}>{VOCAB_DATA[selectedLevel][vocabIndex]?.word}</Text>
                                        </View>

                                        <View style={{width: 80, height: 80, overflow:'hidden'}}>
                                            <Image source={ENEMY_IMAGES[currentEnemyImg]} style={{width:240, height:320, left:-80, top:0, position:'absolute', resizeMode:'stretch'}} />
                                        </View>
                                    </Animated.View>
                                )}

                                {vocabFeedback === 'correct' && (
                                    <Animated.View style={{backgroundColor:'rgba(0,0,0,0.85)', borderWidth:4, borderColor:'#32cd32', borderRadius:10, padding:20, width:'85%', alignItems:'center', opacity: enemyFadeAnim.interpolate({inputRange: [0, 1], outputRange: [1, 0]})}}>
                                        <Text style={[styles.pixelFontLg, {color:'#32cd32', fontSize: 22, marginBottom:10}]}>몬스터 처치 완료!</Text>
                                        <Text style={{fontSize: 32, fontWeight:'bold', color:'#fff', marginBottom:5}}>{VOCAB_DATA[selectedLevel][vocabIndex]?.word}</Text>
                                        <Text style={[styles.pixelFontSm, {color:'#ffeb3b', marginBottom: 15, fontSize: 18}]}>{VOCAB_DATA[selectedLevel][vocabIndex]?.meaning}</Text>
                                        
                                        <TouchableOpacity style={styles.ttsBtn} onPress={readLoudly}>
                                            <Text style={[styles.pixelFontSm, {color:'#000'}]}>🔊 발음/예문 듣기</Text>
                                        </TouchableOpacity>
                                        
                                        <View style={{width:'100%', backgroundColor:'rgba(255,255,255,0.1)', padding:10, borderRadius:6}}>
                                            <Text style={[styles.pixelFontSm, {color:'#fff', marginBottom: 5}]}>[ 전리품 분석 ]</Text>
                                            {renderExampleBolded(VOCAB_DATA[selectedLevel][vocabIndex]?.exJp, VOCAB_DATA[selectedLevel][vocabIndex]?.word)}
                                            <Text style={styles.exKo}>{VOCAB_DATA[selectedLevel][vocabIndex]?.exKo}</Text>
                                        </View>
                                    </Animated.View>
                                )}
                            </ImageBackground>

                            <View style={{flex: 4, backgroundColor:'#000', borderWidth: 6, borderColor:'#fff', padding: 15, justifyContent:'space-around'}}>
                                {vocabFeedback === null ? (
                                    <>
                                        <Text style={[styles.pixelFontLg, {color:'#fff', marginBottom: 15, fontSize: 18, textAlign:'center'}]}>▶ 뜻을 맞춰 공략하라!</Text>
                                        <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between'}}>
                                            {options.map((opt, i) => (
                                                <TouchableOpacity key={i} style={{width:'48%', paddingVertical:15, marginBottom:10, borderWidth:2, borderColor:'#555', borderRadius:8, backgroundColor:'#111', alignItems:'center'}} onPress={() => handleSelectOption(opt)} activeOpacity={0.7}>
                                                    <Text style={[styles.pixelFontLg, {color:'#fff', fontSize: 16}]}>{opt}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                ) : (
                                    <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                                        <Text style={[styles.pixelFontLg, {color: vocabFeedback==='correct'?'#32cd32':'#ff1e1e', fontSize:22, marginBottom:20}]}>
                                            {vocabFeedback==='correct' ? '전투 승리! (보상 +)' : '파티가 전멸했다 (콤보 리셋)'}
                                        </Text>
                                        <TouchableOpacity style={[styles.continueBtn, {width:'80%'}]} onPress={nextVocab}>
                                            <Text style={[styles.pixelFontLgBtn, {color:'#000', fontSize:20}]}>
                                                {vocabFeedback==='correct' ? '▶ 다음 마물 탐색' : '▶ 묘지에서 부활하여 재도전'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* ===== TOWN TAB ===== */}
                    {activeTab === 'town' && (
                        <View style={styles.townMapContainer}>
                            <ImageBackground source={ITEM_IMAGES.bg} style={styles.townMapBg} imageStyle={{resizeMode: 'cover'}}>
                                <View style={styles.topResourceHud}>
                                    <View style={styles.townLevelBadge}>
                                        <Text style={[styles.pixelFontLg, {color:'#fff'}]}>Lv.1</Text>
                                        <Text style={[styles.pixelFontSm, {color:'#aaa'}]}>시작의 마을</Text>
                                    </View>
                                </View>

                                {/* 1. Castle / Avatar */}
                                <TouchableOpacity style={[styles.mapBuilding, {top: '20%', left: '15%'}]} onPress={() => setActiveTab('profile')}>
                                    <Animated.View style={{transform: [{translateY: idleAnim}], width: 70, height: 70, overflow: 'hidden', backgroundColor:'rgba(0,0,0,0.4)', borderRadius:35, borderWidth:2, borderColor:'#fff', alignItems:'center'}}>
                                        <Image source={ITEM_IMAGES.avatar} style={{width: 630, height: 560, top: 5, left: -70, position:'absolute', resizeMode:'stretch'}} />
                                    </Animated.View>
                                    <View style={[styles.buildingLabel, {marginTop: 4}]}><Text style={[styles.pixelFontSm, {color:'#fff'}]}>내 정보</Text></View>
                                </TouchableOpacity>

                                {/* 2. Shop NPC */}
                                <TouchableOpacity style={[styles.mapBuilding, {top: '35%', right: '15%'}]} onPress={drawItem}>
                                    <Animated.View style={{transform: [{translateY: idleAnim}], width: 60, height: 60, overflow: 'hidden'}}>
                                        <Image source={ITEM_IMAGES.npc_shop} style={{width: 180, height: 240, top: 0, left: -60, position:'absolute', resizeMode:'stretch'}} />
                                    </Animated.View>
                                    <View style={styles.buildingLabel}><Text style={[styles.pixelFontSm, {color:'#fff'}]}>장비 상점</Text></View>
                                </TouchableOpacity>

                                {/* 3. Guild Attendance NPC (New) */}
                                <TouchableOpacity style={[styles.mapBuilding, {top: '65%', left: '10%'}]} onPress={talkToGuildGuild}>
                                    <Animated.View style={{transform: [{translateY: idleAnim}], width: 60, height: 60, overflow: 'hidden'}}>
                                        <Image source={ITEM_IMAGES.npc_guild} style={{width: 180, height: 240, top: 0, left: -60, position:'absolute', resizeMode:'stretch'}} />
                                    </Animated.View>
                                    <View style={[styles.buildingLabel, {marginTop: -5}]}><Text style={[styles.pixelFontSm, {color:'#fff'}]}>길드 안내원(출석)</Text></View>
                                </TouchableOpacity>

                                {/* 4. Slime Farm */}
                                <TouchableOpacity style={[styles.mapBuilding, {top: '50%', right: '35%'}]} onPress={talkToSlime}>
                                    <Animated.View style={{transform: [{translateY: idleAnim}], width: 50, height: 50, overflow: 'hidden'}}>
                                        <Image source={ITEM_IMAGES.npc_slime} style={{width: 150, height: 200, top: 0, left: -50, position:'absolute', resizeMode:'stretch'}} />
                                    </Animated.View>
                                    <View style={[styles.buildingLabel, {marginTop: -5}]}><Text style={[styles.pixelFontSm, {color:'#fff'}]}>농장 슬라임</Text></View>
                                </TouchableOpacity>

                                {/* 5. Treasure Chest */}
                                <TouchableOpacity style={[styles.mapBuilding, {top: '70%', right: '20%'}]} onPress={openChest}>
                                    <View style={{width: 50, height: 50, overflow: 'hidden'}}>
                                        <Image source={ITEM_IMAGES.chest} style={{width: 200, height: 400, top: chestOpened ? -100 : 0, left: 0, position:'absolute', resizeMode:'stretch'}} />
                                    </View>
                                    <View style={[styles.buildingLabel, {marginTop: -5}]}><Text style={[styles.pixelFontSm, {color:'#fff'}]}>보물상자</Text></View>
                                </TouchableOpacity>

                                <View style={styles.bottomMapNav}>
                                    <PixelButton style={styles.bigActionBtn} onPress={() => setActiveTab('vocab')}>
                                        <Text style={[styles.pixelFontLg, {color:'#fff', fontWeight:'bold', fontSize: 18}]}>▶ 길을 나선다 (전투배치)</Text>
                                    </PixelButton>
                                </View>
                            </ImageBackground>
                        </View>
                    )}

                    {/* ===== PROFILE (STATUS) TAB JRPG Revamp ===== */}
                    {activeTab === 'profile' && (
                        <View style={{flex: 1, backgroundColor: '#000', padding: 10}}>
                            {/* Inner Border for JRPG Feel */}
                            <View style={{flex: 1, borderWidth: 4, borderColor: '#fff', borderRadius: 6, backgroundColor: '#080808', padding: 10}}>
                                
                                <Text style={[styles.pixelFontLg, {color:'#ffeb3b', fontSize: 24, textAlign:'center', marginBottom: 15}]}>스테이터스 (STATUS)</Text>

                                <View style={{flexDirection: 'row', height: 260}}>
                                    {/* Left: Avatar & Stats Pane */}
                                    <View style={{flex: 1.2, borderWidth: 3, borderColor: '#aaa', borderRadius: 6, padding: 10, marginRight: 10, backgroundColor: '#111', alignItems:'center'}}>
                                        <Animated.View style={{width: 80, height: 80, overflow: 'hidden', backgroundColor:'rgba(255,255,255,0.1)', borderRadius: 4, borderWidth: 2, borderColor:'#fff', transform: [{translateY: idleAnim}]}}>
                                            <Image source={ITEM_IMAGES.avatar} style={{width: 720, height: 640, top: 5, left: -80, position:'absolute', resizeMode:'stretch'}} />
                                        </Animated.View>

                                        <View style={{marginTop: 15, width: '100%'}}>
                                            <Text style={[styles.pixelFontSm, {color:'#fff', fontSize: 12}]}>이름: 케빈</Text>
                                            <Text style={[styles.pixelFontSm, {color:'#fff', fontSize: 12, marginTop: 4}]}>직업: {getJobTitle(selectedLevel)}</Text>
                                            <Text style={[styles.pixelFontSm, {color:'#fff', fontSize: 12, marginTop: 4}]}>LV: {Math.floor(gold/100) + 1}</Text>
                                            
                                            <View style={{height: 1, backgroundColor: '#aaa', marginVertical: 8}}/>
                                            
                                            <Text style={[styles.pixelFontSm, {color:'#03a9f4', fontSize: 12}]}>골드부스팅: +{playerStats.luk}%</Text>
                                            <Text style={[styles.pixelFontSm, {color:'#32cd32', fontSize: 12, marginTop: 4}]}>오답방어율: {playerStats.def}</Text>
                                        </View>
                                    </View>

                                    {/* Right: Equipment Cross Pane */}
                                    <View style={{flex: 1, borderWidth: 3, borderColor: '#aaa', borderRadius: 6, backgroundColor: '#111', padding: 10, alignItems: 'center'}}>
                                        <Text style={[styles.pixelFontSm, {color:'#fff', marginBottom: 10}]}>장착(EQUIP)</Text>
                                        <View style={{flex: 1, position:'relative', width: '100%', alignItems:'center', justifyContent:'center'}}>
                                            {/* Top: Hat */}
                                            <View style={[styles.crossSlot, {top: 0}]}><Text onPress={() => unequipItem('hat')} style={{fontSize:24}}>{equipped.hat ? equipped.hat.emoji : '⛑'}</Text></View>
                                            {/* Mid-Left: Glasses/Accessories */}
                                            <View style={[styles.crossSlot, {left: 0, top: 50}]}><Text onPress={() => unequipItem('glasses')} style={{fontSize:24}}>{equipped.glasses ? equipped.glasses.emoji : '👓'}</Text></View>
                                            {/* Mid-Center: Top (Armor) */}
                                            <View style={[styles.crossSlot, {top: 50}]}><Text onPress={() => unequipItem('top')} style={{fontSize:24}}>{equipped.top ? equipped.top.emoji : '👕'}</Text></View>
                                            {/* Mid-Right: Weapon */}
                                            <View style={[styles.crossSlot, {right: 0, top: 50}]}>{equipped.weapon ? (equipped.weapon.imageKey ? <Image source={ITEM_IMAGES[equipped.weapon.imageKey]} style={{width: 32, height: 32}}/> : <Text onPress={() => unequipItem('weapon')} style={{fontSize:24}}>{equipped.weapon.emoji}</Text>) : <Text onPress={() => unequipItem('weapon')} style={{fontSize:24}}>{'🗡️'}</Text>}</View>
                                            {/* Bottom: Bottoms */}
                                            <View style={[styles.crossSlot, {top: 100}]}><Text onPress={() => unequipItem('bottom')} style={{fontSize:24}}>{equipped.bottom ? equipped.bottom.emoji : '👖'}</Text></View>
                                            {/* Bottom-2: Shoes */}
                                            <View style={[styles.crossSlot, {top: 150}]}><Text onPress={() => unequipItem('shoes')} style={{fontSize:24}}>{equipped.shoes ? equipped.shoes.emoji : '👟'}</Text></View>
                                        </View>
                                        <Text style={[styles.pixelFontSm, {color:'#777', fontSize: 10, marginTop:10}]}>*클릭해체</Text>
                                    </View>
                                </View>

                                {/* System Config / Goals */}
                                <View style={{marginTop: 10, borderWidth: 3, borderColor: '#aaa', borderRadius: 6, backgroundColor: '#111', padding: 10}}>
                                    <Text style={[styles.pixelFontSm, {color:'#fff', marginBottom: 5}]}>목표 급수 (수련장 위상)</Text>
                                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                        {['N5','N4','N3','N2','N1'].map(lvl => (
                                            <TouchableOpacity key={lvl} style={[styles.setLvlBtn, selectedLevel === lvl && styles.setLvlBtnActive]} onPress={() => saveSettings(lvl)}>
                                                <Text style={[styles.pixelFontLg, {color: selectedLevel===lvl?'#000':'#aaa'}]}>{lvl}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Bottom: Inventory Extension */}
                                <View style={{flex: 1, marginTop: 10, borderWidth: 3, borderColor: '#aaa', borderRadius: 6, backgroundColor: '#111', padding: 10}}>
                                    <Text style={[styles.pixelFontSm, {color:'#fff', marginBottom: 5}]}>인벤토리 (가방)</Text>
                                    <ScrollView style={{flex:1}}>
                                        {inventory.length === 0 ? (
                                            <Text style={[styles.pixelFontSm, {color:'#555', textAlign:'center', marginTop: 15}]}>가진 것이 없다.</Text>
                                        ) : (
                                            <View style={styles.invGrid}>
                                                {inventory.map((item, idx) => (
                                                    <TouchableOpacity key={item.id + idx} style={[styles.invItemSlot, {borderColor: item.color}]} onPress={() => equipItem(item)}>
                                                        {item.imageKey ? <Image source={ITEM_IMAGES[item.imageKey]} style={{width: 25, height: 25}} /> : <Text style={{fontSize: 22, textAlign:'center'}}>{item.emoji}</Text>}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </ScrollView>
                                </View>

                            </View>
                        </View>
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
                        <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>👤 상태</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Dialog Overlay */}
            <Modal transparent={true} visible={!!townDialog} animationType="fade" onRequestClose={() => setTownDialog(null)}>
                <View style={styles.dialogOverlay}>
                    <TouchableOpacity style={{flex:1}} onPress={() => setTownDialog(null)} />
                    {townDialog && (
                        <View style={styles.dialogBox}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={{width: 50, height: 50, overflow:'hidden', borderRadius: 25, borderWidth: 2, borderColor: '#fff', marginRight: 15, backgroundColor: '#000'}}>
                                    <Image source={townDialog.charImage} style={{width: 150, height: 200, left: -50, top: 0, position:'absolute', resizeMode:'stretch'}} />
                                </View>
                                <Text style={[styles.pixelFontLg, {color: '#ffeb3b', fontSize: 18}]}>{townDialog.speaker}</Text>
                            </View>
                            <Text style={[styles.pixelFontSm, {color: '#fff', fontSize: 15, marginTop: 15, lineHeight: 24}]}>{townDialog.text}</Text>
                            
                            <View style={{marginTop: 20, flexDirection:'row', flexWrap:'wrap', justifyContent:'flex-end'}}>
                                {townDialog.options.map((opt, i) => (
                                    <TouchableOpacity key={i} style={styles.dialogOptionBtn} onPress={opt.action}>
                                        <Text style={[styles.pixelFontLg, {color: '#fff', fontSize: 15}]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </Modal>

            {/* GACHA RESULT MULTI MODAL */}
            <Modal transparent={true} visible={!!gachaResult} animationType="zoom" onRequestClose={() => setGachaResult(null)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.dictCard, {borderColor: '#ffeb3b', padding: 15, width: '90%'}]}>
                        <Text style={[styles.pixelFontLg, {color: '#fff', marginBottom: 20, textAlign:'center', fontSize: 22}]}>✨ 장비 획득! ✨</Text>
                        <ScrollView style={{maxHeight: 400}}>
                            <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'center'}}>
                            {gachaResult && gachaResult.map((res, i) => (
                                <View key={i} style={{width: '30%', margin: '1.5%', padding: 10, borderWidth: 2, borderColor: res.color, borderRadius: 8, alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)'}}>
                                    {res.imageKey ? <Image source={ITEM_IMAGES[res.imageKey]} style={{width: 40, height: 40}} /> : <Text style={{fontSize: 34}}>{res.emoji}</Text>}
                                    <View style={{backgroundColor: res.color, paddingHorizontal: 4, borderRadius: 3, marginTop: 5}}>
                                        <Text style={[styles.pixelFontSm, {color:'#000', fontSize:10}]}>{res.grade}</Text>
                                    </View>
                                </View>
                            ))}
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={[styles.continueBtn, {marginTop: 20, width: '100%'}]} onPress={() => setGachaResult(null)}>
                            <Text style={[styles.pixelFontLgBtn, {color:'#000'}]}>인벤토리로 받기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const FONT_PIXEL = 'DotGothic16_400Regular';
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 10 },
    
    progressHeaderObj: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: { padding: 5, paddingHorizontal: 10 },
    
    screenArea: { flex: 1 },
    
    bottomNav: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.9)', borderTopWidth: 4, borderColor: '#fff', paddingVertical: 8, paddingHorizontal: 5 },
    navItem: { flex: 1, alignItems: 'center', paddingVertical: 12, marginHorizontal: 4, borderRadius: 8, backgroundColor: 'transparent' },
    navItemActive: { backgroundColor: '#ffeb3b', borderWidth: 3, borderBottomWidth: 6, borderColor: '#000' }, 
    navText: { fontFamily: FONT_PIXEL, fontSize: 14, color: '#aaa' },
    navTextActive: { color: '#000', fontWeight: 'bold' },

    pixelFontSm: { fontFamily: FONT_PIXEL, fontSize: 14, color: '#bbb' },
    pixelFontLg: { fontFamily: FONT_PIXEL, fontSize: 16, color: '#fff' },
    pixelFontLgBtn: { fontFamily: FONT_PIXEL, fontSize: 18, color: '#fff' },

    ttsBtn: { padding: 8, backgroundColor: '#ffeb3b', borderWidth: 3, borderBottomWidth: 5, borderColor: '#000', borderRadius: 6, marginBottom: 15 },
    exJpText: { fontSize: 15, color: '#fff', lineHeight: 22, fontWeight: '500' },
    exJpBold: { fontSize: 16, fontWeight: 'bold', color: '#ffeb3b' },
    exKo: { fontFamily: FONT_PIXEL, fontSize: 14, color: '#aaa', marginTop: 8 },

    continueBtn: { borderWidth: 3, borderBottomWidth: 8, borderColor: '#000', borderRadius: 8, paddingVertical: 15, marginTop: 10, alignItems: 'center', backgroundColor: '#fff' },

    townMapContainer: { flex: 1, backgroundColor: '#000' },
    townMapBg: { flex: 1, position: 'relative' },
    topResourceHud: { position: 'absolute', top: 20, left: 20 },
    townLevelBadge: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8, borderWidth: 2, borderColor: '#555' },
    mapBuilding: { position: 'absolute', alignItems: 'center' },
    buildingLabel: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#fff', marginTop: 8 },
    bottomMapNav: { position: 'absolute', bottom: 20, width: '100%', alignItems: 'center' },
    bigActionBtn: { width: '90%', paddingVertical: 16, borderWidth: 4, borderBottomWidth: 8, borderColor: '#000', borderRadius: 12, alignItems: 'center' },

    dialogOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' },
    dialogBox: { backgroundColor: '#000', borderWidth: 4, borderColor: '#fff', borderRadius: 8, margin: 15, padding: 20, minHeight: 180 },
    dialogOptionBtn: { backgroundColor: '#333', borderWidth: 2, borderColor: '#fff', borderRadius: 4, paddingHorizontal: 15, paddingVertical: 10, marginLeft: 10, marginTop: 10 },

    // Status / Profile Specific
    crossSlot: { position: 'absolute', width: 40, height: 40, backgroundColor: '#000', borderRadius: 4, borderWidth: 2, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
    
    invGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    invItemSlot: { width: '15%', margin: '2.5%', aspectRatio: 1, borderWidth: 2, borderRadius: 5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

    setLvlBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2, borderWidth: 2, borderColor: '#555', borderRadius: 6, backgroundColor: '#000' },
    setLvlBtnActive: { backgroundColor: '#ffeb3b', borderColor: '#fff' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    dictCard: { width: '85%', backgroundColor: '#222', borderWidth: 4, borderColor: '#fff', borderRadius: 8, padding: 25, alignItems: 'center' },
});
