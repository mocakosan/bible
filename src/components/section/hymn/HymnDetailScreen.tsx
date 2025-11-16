import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Box, StatusBar } from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, {
    Capability,
    State,
    usePlaybackState,
    useProgress,
    RepeatMode,
} from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import { apiClient, API_ENDPOINTS } from '../../../utils/api';
import { defaultStorage } from '../../../utils/mmkv';
import BannerAdComponent from "../../../adforus";
import BackHeaderLayout from "../../layout/header/backHeader";

interface HymnData {
    id: number;
    num: string;
    oldnum: string;
    title: string;
    content: string;
    image: string;
    audio: string;
    mraudio: string;
}

export default function HymnDetailScreen() {
    const { navigation, route } = useNativeNavigation();
    const { hymnId } = route.params as { hymnId: number };
    const { color } = useBaseStyle();
    const insets = useSafeAreaInsets();

    const [hymnData, setHymnData] = useState<HymnData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLyrics, setShowLyrics] = useState(false);
    const [isAccompany, setIsAccompany] = useState(false); // false = 찬양, true = 반주
    const [playerReady, setPlayerReady] = useState(false);
    const [randomPlay, setRandomPlay] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);

    const playbackState = usePlaybackState();
    const progress = useProgress();

    const isPlaying = playbackState === State.Playing;
    const isInitializing = useRef(false);
    const hasAutoPlayed = useRef(false);
    const lastHymnId = useRef(hymnId);

    useEffect(() => {
        loadHymnDetail();
        initializePlayer();

        // 저장된 설정 불러오기
        const savedAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;
        const savedRandomPlay = defaultStorage.getBoolean("hymn_random_play_enabled") ?? false;
        const savedIsAccompany = defaultStorage.getBoolean("hymn_is_accompany") ?? false;

        setAutoPlay(savedAutoPlay);
        setRandomPlay(savedRandomPlay);
        setIsAccompany(savedIsAccompany);

        return () => {
            // 컴포넌트 언마운트 시에만 리셋
            TrackPlayer.pause().catch(err => console.log('Pause error:', err));
        };
    }, [hymnId]);

    useEffect(() => {
        if (hymnData && playerReady) {
            updateTrack();
        }
    }, [isAccompany, hymnData, playerReady]);

    // 곡이 끝났을 때 자동재생 처리
    useEffect(() => {
        if (!hymnData || !playerReady) return;

        const checkAutoNext = () => {
            // 재생이 완료되었는지 확인 (duration과 position이 거의 같을 때)
            if (progress.duration > 0 && progress.position > 0) {
                const isEnded = Math.abs(progress.duration - progress.position) < 1;

                if (isEnded && autoPlay && !hasAutoPlayed.current) {
                    console.log('🎵 곡 종료 - 자동재생 시작');
                    hasAutoPlayed.current = true;

                    setTimeout(() => {
                        handleNext();
                        hasAutoPlayed.current = false;
                    }, 500);
                }
            }
        };

        checkAutoNext();
    }, [progress.position, progress.duration, autoPlay, hymnData, playerReady]);

    // hymnId가 변경되면 자동재생 플래그 리셋
    useEffect(() => {
        if (lastHymnId.current !== hymnId) {
            hasAutoPlayed.current = false;
            lastHymnId.current = hymnId;

            // 자동재생이 켜져있고 이전 곡에서 재생 중이었다면 새 곡도 자동 재생
            if (autoPlay && defaultStorage.getBoolean("hymn_was_playing")) {
                setTimeout(async () => {
                    try {
                        await TrackPlayer.play();
                        console.log('▶ 자동재생 시작');
                    } catch (error) {
                        console.error('자동재생 실패:', error);
                    }
                }, 800);
            }
        }
    }, [hymnId, autoPlay]);

    const loadHymnDetail = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(API_ENDPOINTS.HYMN_DETAIL, {
                params: { id: hymnId }
            });

            console.log('✅ 찬송가 상세 데이터:', response.data);

            const data = response.data?.data || response.data;
            if (data) {
                setHymnData(data);
                defaultStorage.set("current_hymn_id", hymnId);
            } else {
                throw new Error('찬송가 데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ 찬송가 상세 로드 실패:', error);
            Alert.alert(
                '데이터 로드 실패',
                '찬송가 정보를 불러오는데 실패했습니다.',
                [{ text: '확인', onPress: () => navigation.goBack() }]
            );
        } finally {
            setLoading(false);
        }
    };

    const initializePlayer = async () => {
        if (isInitializing.current) {
            console.log('ℹ️ 이미 초기화 중입니다.');
            return;
        }

        isInitializing.current = true;

        try {
            let isSetup = false;
            try {
                const state = await TrackPlayer.getState();
                isSetup = state !== undefined;
            } catch {
                isSetup = false;
            }

            if (!isSetup) {
                await TrackPlayer.setupPlayer({
                    autoHandleInterruptions: true,
                    waitForBuffer: true,
                });
                console.log('✅ 찬송가 플레이어 초기화 완료');
            }

            await TrackPlayer.updateOptions({
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.Stop,
                    Capability.SeekTo,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                ],
                compactCapabilities: [Capability.Play, Capability.Pause],
                progressUpdateEventInterval: 1,
                android: {
                    appKilledPlaybackBehavior: 2,
                },
            });

            await TrackPlayer.setRepeatMode(RepeatMode.Off);

            setPlayerReady(true);
            console.log('✅ 찬송가 플레이어 설정 완료');
        } catch (error: any) {
            if (error.message?.includes('already been initialized')) {
                console.log('ℹ️ 플레이어 이미 초기화됨');
                setPlayerReady(true);
            } else {
                console.error('❌ 플레이어 초기화 실패:', error);
            }
        } finally {
            isInitializing.current = false;
        }
    };

    const updateTrack = async () => {
        if (!hymnData || (!hymnData.audio && !hymnData.mraudio)) {
            console.warn('⚠️ 음악 파일 URL이 없습니다.');
            return;
        }

        try {
            const wasPlaying = isPlaying;
            if (wasPlaying) {
                await TrackPlayer.pause();
            }

            await TrackPlayer.reset();

            const trackUrl = isAccompany
                ? (hymnData.mraudio || hymnData.audio)
                : (hymnData.audio || hymnData.mraudio);

            if (!trackUrl) {
                console.warn('⚠️ 재생 가능한 음악 파일이 없습니다.');
                return;
            }

            console.log('🎵 트랙 추가:', {
                id: hymnData.id,
                url: trackUrl,
                title: hymnData.title,
                type: isAccompany ? '반주' : '찬양'
            });

            await TrackPlayer.add({
                id: hymnData.id.toString(),
                url: trackUrl,
                title: hymnData.title,
                artist: isAccompany ? '반주' : '찬양',
                artwork: hymnData.image,
            });

            // 이전에 재생 중이었다면 자동으로 재생
            if (wasPlaying) {
                setTimeout(async () => {
                    await TrackPlayer.play();
                }, 300);
            }
        } catch (error) {
            console.error('❌ 트랙 추가 실패:', error);
            Alert.alert('재생 실패', '음악 파일을 로드하는데 실패했습니다.');
        }
    };

    const togglePlayback = async () => {
        try {
            const state = await TrackPlayer.getState();

            if (state === State.Playing) {
                await TrackPlayer.pause();
                defaultStorage.set("hymn_was_playing", false);
                console.log('⏸ 일시정지');
            } else {
                await TrackPlayer.play();
                defaultStorage.set("hymn_was_playing", true);
                console.log('▶ 재생');
            }
        } catch (error) {
            console.error('❌ 재생/일시정지 실패:', error);
        }
    };

    const handlePrevious = () => {
        if (randomPlay) {
            const randomId = Math.floor(Math.random() * 647) + 1;
            navigation.replace('HymnDetailScreen', { hymnId: randomId });
        } else if (hymnId > 1) {
            navigation.replace('HymnDetailScreen', { hymnId: hymnId - 1 });
        }
    };

    const handleNext = () => {
        if (randomPlay) {
            const randomId = Math.floor(Math.random() * 647) + 1;
            navigation.replace('HymnDetailScreen', { hymnId: randomId });
        } else if (hymnId < 647) {
            navigation.replace('HymnDetailScreen', { hymnId: hymnId + 1 });
        }
    };

    const toggleRandomPlay = () => {
        const newValue = !randomPlay;
        setRandomPlay(newValue);
        defaultStorage.set("hymn_random_play_enabled", newValue);
    };

    const toggleAutoPlay = () => {
        const newValue = !autoPlay;
        setAutoPlay(newValue);
        defaultStorage.set("hymn_auto_play_enabled", newValue);
    };

    const toggleAccompany = (isAccompanyMode: boolean) => {
        setIsAccompany(isAccompanyMode);
        defaultStorage.set("hymn_is_accompany", isAccompanyMode);
    };

    const processContent = (content: string) => {
        if (!content) return '';
        return content.replace(/\[후렴\]/g, '\n[후렴]');
    };

    if (loading || !hymnData) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color="#2AC1BC" />
                <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <Box safeAreaTop bg={color.status} />

            {/* 헤더 */}
            <BackHeaderLayout title={`${hymnData.num}장 ${hymnData.title}`} />
            <View style={[styles.adContainer, { top: 65 }]}>
                <BannerAdComponent />
            </View>
            {/* 가사보기 토글 */}
            <View style={styles.lyricsToggleContainer}>
                <Text style={styles.lyricsToggleLabel}>가사보기</Text>
                <TouchableOpacity
                    style={styles.toggleSwitch}
                    onPress={() => setShowLyrics(!showLyrics)}
                >
                    <View style={[
                        styles.toggleTrack,
                        showLyrics && styles.toggleTrackActive
                    ]}>
                        <View style={[
                            styles.toggleThumb,
                            showLyrics && styles.toggleThumbActive
                        ]} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* 악보 이미지 영역 */}
            <View style={styles.imageContainer}>
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 250 }
                    ]}
                >
                    {/* 악보 이미지 */}
                    {hymnData.image && (
                        <Image
                            source={{ uri: hymnData.image }}
                            style={styles.sheetMusicImage}
                            resizeMode="contain"
                        />
                    )}
                </ScrollView>

                {/* ✅ 가사 오버레이 - 스크롤 가능 */}
                {showLyrics && hymnData.content && (
                    <View style={styles.lyricsOverlay}>
                        <ScrollView
                            style={styles.lyricsScrollView}
                            showsVerticalScrollIndicator={true}
                        >
                            <View style={styles.lyricsBox}>
                                <Text style={styles.lyricsText}>
                                    {processContent(hymnData.content)}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* 플레이어 컨트롤 - 웹과 완전히 동일한 구조 */}
            <View style={[styles.playerContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                {/* 진행바 */}
                <View style={styles.progressBarContainer}>
                    <Slider
                        style={styles.progressSlider}
                        minimumValue={0}
                        maximumValue={progress.duration || 1}
                        value={progress.position}
                        onSlidingComplete={async (value) => {
                            await TrackPlayer.seekTo(value);
                        }}
                        minimumTrackTintColor="#2AC1BC"
                        maximumTrackTintColor="#E0E0E0"
                        thumbTintColor="transparent"
                    />
                    <View style={styles.progressBarTrack}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progress.duration > 0
                                        ? `${(progress.position / progress.duration) * 100}%`
                                        : '0%'
                                }
                            ]}
                        />
                    </View>
                </View>

                {/* 메인 컨트롤 */}
                <View style={styles.mainControls}>
                    {/* 찬양/반주 선택 */}
                    <View style={styles.accompanyContainer}>
                        <TouchableOpacity
                            style={styles.accompanyOption}
                            onPress={() => toggleAccompany(false)}
                        >
                            <Text style={[
                                styles.accompanyLabel,
                                !isAccompany && styles.accompanyLabelActive
                            ]}>
                                찬양
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.accompanyOption}
                            onPress={() => toggleAccompany(true)}
                        >
                            <Text style={[
                                styles.accompanyLabel,
                                isAccompany && styles.accompanyLabelActive
                            ]}>
                                반주
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* 재생 컨트롤 버튼들 */}
                    <View style={styles.playbackControls}>
                        {/* 이전 곡 */}
                        <TouchableOpacity
                            onPress={handlePrevious}
                            style={styles.controlButton}
                        >
                            <View style={styles.prevButton}>
                                <View style={styles.prevBar} />
                                <View style={styles.prevTriangle} />
                            </View>
                        </TouchableOpacity>

                        {/* 재생/일시정지 */}
                        <TouchableOpacity
                            onPress={togglePlayback}
                            style={styles.playButton}
                        >
                            {isPlaying ? (
                                <View style={styles.pauseIcon}>
                                    <View style={styles.pauseBar} />
                                    <View style={styles.pauseBar} />
                                </View>
                            ) : (
                                <View style={styles.playTriangle} />
                            )}
                        </TouchableOpacity>

                        {/* 다음 곡 */}
                        <TouchableOpacity
                            onPress={handleNext}
                            style={styles.controlButton}
                        >
                            <View style={styles.nextButton}>
                                <View style={styles.nextTriangle} />
                                <View style={styles.nextBar} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* 성경 버튼 */}
                    <TouchableOpacity
                        style={styles.bibleButton}
                        onPress={() => navigation.navigate('BibleScreen')}
                    >
                        <Text style={styles.bibleButtonText}>성경</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomOptions}>
                    {/* 랜덤재생 */}
                    <View style={styles.optionItem}>
                        <Text style={styles.optionLabel}>랜덤재생</Text>
                        <TouchableOpacity
                            style={styles.optionToggleWrapper}
                            onPress={toggleRandomPlay}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.optionTrack,
                                randomPlay && styles.optionTrackActive
                            ]}>
                                <View style={[
                                    styles.optionThumb,
                                    randomPlay && styles.optionThumbActive
                                ]} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* 자동재생 */}
                    <View style={styles.optionItem}>
                        <TouchableOpacity
                            style={styles.optionToggleWrapper}
                            onPress={toggleAutoPlay}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.optionTrack,
                                autoPlay && styles.optionTrackActive
                            ]}>
                                <View style={[
                                    styles.optionThumb,
                                    autoPlay && styles.optionThumbActive
                                ]} />
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.optionLabel, { marginLeft: 4 }]}>자동재생</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    adContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    backButtonText: {
        fontSize: 28,
        color: '#000000',
        fontWeight: '300',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    lyricsToggleContainer: {
        marginTop: 80,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    lyricsToggleLabel: {
        fontSize: 16,
        color: '#2AC1BC',
        fontWeight: '600',
    },
    toggleSwitch: {
        padding: 4,
    },
    toggleTrack: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
    },
    toggleTrackActive: {
        backgroundColor: '#2AC1BC',
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        marginLeft: 2,
    },
    toggleThumbActive: {
        marginLeft: 22,
    },
    imageContainer: {
        flex: 1,
        position: 'relative',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
    },
    sheetMusicImage: {
        width: '100%',
        minHeight: 500,
        marginTop: -160,
    },
    // ✅ 가사 오버레이 스타일 수정 - 스크롤 가능하게
    lyricsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    lyricsScrollView: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    lyricsBox: {
        paddingVertical: 10,
        paddingBottom: 300, // ✅ 하단 플레이어 공간 확보
    },
    lyricsText: {
        fontSize: 16,
        lineHeight: 28,
        color: '#000000',
    },
    playerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingTop: 0,
    },
    progressBarContainer: {
        width: '100%',
        height: 20,
        position: 'relative',
    },
    progressSlider: {
        width: '100%',
        height: 20,
        position: 'absolute',
        top: 0,
        zIndex: 2,
    },
    progressBarTrack: {
        width: '100%',
        height: 4,
        backgroundColor: '#E0E0E0',
        position: 'absolute',
        top: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#2AC1BC',
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    accompanyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: -6
    },
    accompanyOption: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    accompanyLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#999999',
    },
    accompanyLabelActive: {
        color: '#2AC1BC',
        borderWidth: 2,
        borderColor: '#2AC1BC',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    controlButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    prevButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    prevBar: {
        width: 3,
        height: 16,
        backgroundColor: '#2AC1BC',
    },
    prevTriangle: {
        width: 0,
        height: 0,
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderRightWidth: 12,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: '#2AC1BC',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    nextTriangle: {
        width: 0,
        height: 0,
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderLeftWidth: 12,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: '#2AC1BC',
    },
    nextBar: {
        width: 3,
        height: 16,
        backgroundColor: '#2AC1BC',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2AC1BC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playTriangle: {
        width: 0,
        height: 0,
        borderTopWidth: 12,
        borderBottomWidth: 12,
        borderLeftWidth: 20,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: '#FFFFFF',
        marginLeft: 4,
    },
    pauseIcon: {
        flexDirection: 'row',
        gap: 6,
    },
    pauseBar: {
        width: 6,
        height: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },
    bibleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#2AC1BC',
    },
    bibleButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2AC1BC',
    },
    bottomOptions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 80,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#2AC1BC',
        marginRight: 4,
    },
    optionToggleWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
    },
    optionTrack: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        position: 'relative',
    },
    optionTrackActive: {
        backgroundColor: '#2AC1BC',
    },
    optionThumb: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    optionThumbActive: {
        left: 22,
    },
});