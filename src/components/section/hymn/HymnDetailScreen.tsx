import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert, AppState,
} from 'react-native';
import { Box, StatusBar } from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, {
    Capability,
    State,
    Event,
    usePlaybackState,
    useProgress,
    useTrackPlayerEvents,
    RepeatMode,
} from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import { apiClient, API_ENDPOINTS } from '../../../utils/api';
import { defaultStorage } from '../../../utils/mmkv';
import BannerAdComponent from "../../../adforus";
import BackHeaderLayout from "../../layout/header/backHeader";
import {subscription} from "swr/subscription";

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
    const [isAccompany, setIsAccompany] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [randomPlay, setRandomPlay] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);

    const playbackState = usePlaybackState();
    const progress = useProgress();

    const isPlaying = playbackState === State.Playing;
    const isInitializing = useRef(false);
    const hasAutoPlayed = useRef(false);
    const lastHymnId = useRef(hymnId);
    const isSyncingTrack = useRef(false); // ✅ 트랙 동기화 중 플래그

    useEffect(() => {
        defaultStorage.set("is_hymn_player", true);
        defaultStorage.set("is_illdoc_player", false);
        console.log('🎵 찬송가 플레이어 플래그 우선 설정');

        loadHymnDetail();
        initializePlayer();

        // ✅ 저장된 설정 불러오기 - 자동재생 기본값 true로 변경
        const savedAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? true; // ✅ 기본값 true
        const savedRandomPlay = defaultStorage.getBoolean("hymn_random_play_enabled") ?? false;
        const savedIsAccompany = defaultStorage.getBoolean("hymn_is_accompany") ?? false;

        setAutoPlay(savedAutoPlay);
        setRandomPlay(savedRandomPlay);
        setIsAccompany(savedIsAccompany);

        // ✅ 처음 실행 시 자동재생 기본값 저장
        if (defaultStorage.getBoolean("hymn_auto_play_enabled") === undefined) {
            defaultStorage.set("hymn_auto_play_enabled", true);
            console.log('🔁 자동재생 기본값 설정: ON');
        }

        // ✅ 백그라운드에서 다음 곡으로 넘어갔는지 확인
        const checkBackgroundNext = () => {
            const backgroundNext = defaultStorage.getBoolean("hymn_background_next") ?? false;
            if (backgroundNext) {
                console.log('📱 백그라운드에서 넘어온 곡 - 자동재생 설정');
                defaultStorage.set("hymn_background_next", false);
                defaultStorage.set("hymn_was_playing", true);
            }
        };

        checkBackgroundNext();

        // ✅ AppState 리스너 추가
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('📱 앱이 포그라운드로 복귀');

                // ✅ 백그라운드에서 재생 중이던 트랙 동기화
                await syncBackgroundTrack();

                // 백그라운드에서 다음 곡으로 넘어갔는지 확인
                const newHymnId = defaultStorage.getNumber("current_hymn_id") ?? hymnId;
                if (newHymnId !== hymnId) {
                    console.log(`🔄 백그라운드에서 ${newHymnId}장으로 변경됨 - 화면 전환`);
                    defaultStorage.set("hymn_was_playing", true);
                    navigation.replace('HymnDetailScreen', { hymnId: newHymnId });
                }
            } else if (nextAppState === 'background') {
                // ✅ 백그라운드로 전환될 때도 플래그 재설정
                console.log('📱 앱이 백그라운드로 전환');
                defaultStorage.set("is_hymn_player", true);
                defaultStorage.set("is_illdoc_player", false);
            }
        });

        return () => {
            // 컴포넌트 언마운트 시에만 리셋
            TrackPlayer.pause().catch(err => console.log('Pause error:', err));
            defaultStorage.set("is_hymn_player", false);
            subscription.remove();
        };
    }, [hymnId, navigation]);

    // ✅ 백그라운드에서 재생 중이던 트랙 동기화 함수
    const syncBackgroundTrack = async () => {
        if (isSyncingTrack.current) {
            console.log('🔄 이미 동기화 중');
            return;
        }

        try {
            isSyncingTrack.current = true;

            // 현재 재생 중인 트랙 확인
            const queue = await TrackPlayer.getQueue();
            if (queue.length === 0) {
                console.log('📭 큐가 비어있음');
                isSyncingTrack.current = false;
                return;
            }

            const currentTrack = await TrackPlayer.getActiveTrack();
            if (!currentTrack) {
                console.log('⚠️ 활성 트랙 없음');
                isSyncingTrack.current = false;
                return;
            }

            // 백그라운드에서 재생된 트랙 ID 확인
            const trackId = currentTrack.id;
            console.log('🎵 백그라운드 트랙:', trackId);

            // 트랙 ID에서 찬송가 번호 추출
            if (trackId?.startsWith('hymn-')) {
                const backgroundHymnId = parseInt(trackId.split('-')[1]);
                console.log(`🔍 백그라운드에서 재생된 찬송가: ${backgroundHymnId}장`);

                // 현재 화면의 찬송가와 다르면 동기화 필요
                if (backgroundHymnId !== hymnId) {
                    console.log(`⚠️ 트랙 불일치: 화면=${hymnId}장, 백그라운드=${backgroundHymnId}장`);
                    isSyncingTrack.current = false;
                    return;
                }

                // 재생 위치 확인
                const position = await TrackPlayer.getProgress();
                console.log(`⏱️ 백그라운드 재생 위치: ${position.position.toFixed(1)}초`);

                // 재생 상태 확인
                const state = await TrackPlayer.getPlaybackState();
                const wasPlaying = state.state === State.Playing;
                console.log(`▶️ 백그라운드 재생 상태: ${wasPlaying ? '재생 중' : '일시정지'}`);

                // ✅ 트랙이 이미 올바르게 로드되어 있으므로 그대로 사용
                console.log('✅ 트랙 동기화 완료 - 백그라운드 재생 이어가기');

                // ✅ 자동재생이 켜져있으면 무조건 재생 (재생 중이 아닐 때만)
                if (autoPlay && !wasPlaying) {
                    setTimeout(async () => {
                        try {
                            await TrackPlayer.play();
                            defaultStorage.set("hymn_was_playing", true);
                            console.log('▶️ 포그라운드 복귀 - 자동 재생 시작');
                        } catch (error) {
                            console.error('재생 실패:', error);
                        }
                    }, 300);
                } else if (wasPlaying) {
                    console.log('✅ 이미 재생 중 - 그대로 유지');
                }

            } else if (trackId === hymnId.toString()) {
                // 포그라운드에서 추가한 트랙
                console.log('✅ 포그라운드 트랙 - 동기화 불필요');
            }

        } catch (error) {
            console.error('❌ 트랙 동기화 실패:', error);
        } finally {
            isSyncingTrack.current = false;
        }
    };

    useEffect(() => {
        if (hymnData && playerReady) {
            updateTrack();
        }
    }, [isAccompany, hymnData, playerReady]);

    // ✅ TrackPlayer 이벤트 리스너 - 자동재생 처리
    useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackState], async (event) => {
        if (!hymnData || !playerReady || !autoPlay) return;

        console.log('🎵 찬송가 TrackPlayer Event:', event.type);

        // 큐가 끝났을 때 (가장 확실한 방법)
        if (event.type === Event.PlaybackQueueEnded) {
            console.log('🏁 찬송가 재생 완료 - 자동 다음 장 시작');

            if (!hasAutoPlayed.current) {
                hasAutoPlayed.current = true;

                // ✅ 재생 중이었음을 저장
                defaultStorage.set("hymn_was_playing", true);

                setTimeout(() => {
                    handleNext();
                    hasAutoPlayed.current = false;
                }, 500);
            }
        }

        // 재생 상태가 종료로 변경된 경우 (보조 수단)
        else if (event.type === Event.PlaybackState && event.state === State.Ended) {
            console.log('🎯 찬송가 상태 종료 - 자동 다음 장 시작');

            if (!hasAutoPlayed.current) {
                hasAutoPlayed.current = true;

                // ✅ 재생 중이었음을 저장
                defaultStorage.set("hymn_was_playing", true);

                setTimeout(() => {
                    handleNext();
                    hasAutoPlayed.current = false;
                }, 800);
            }
        }
    });

    // hymnId가 변경되면 자동재생 플래그 리셋
    useEffect(() => {
        if (lastHymnId.current !== hymnId) {
            hasAutoPlayed.current = false;
            lastHymnId.current = hymnId;

            // ✅ 백그라운드에서 이미 로드된 트랙 확인
            checkAndSyncTrack();
        }
    }, [hymnId, autoPlay]);

    // ✅ 백그라운드에서 로드된 트랙 확인 및 동기화
    const checkAndSyncTrack = async () => {
        try {
            const queue = await TrackPlayer.getQueue();
            if (queue.length === 0) {
                console.log('📭 큐가 비어있음 - 일반 로딩');
                return;
            }

            const currentTrack = await TrackPlayer.getActiveTrack();
            if (!currentTrack) {
                console.log('⚠️ 활성 트랙 없음 - 일반 로딩');
                return;
            }

            const trackId = currentTrack.id;
            console.log('🎵 현재 트랙:', trackId);

            // 백그라운드에서 로드된 찬송가 트랙인지 확인
            if (trackId?.startsWith('hymn-')) {
                const backgroundHymnId = parseInt(trackId.split('-')[1]);

                if (backgroundHymnId === hymnId) {
                    console.log(`✅ 백그라운드에서 로드된 ${hymnId}장 트랙 발견 - 동기화`);

                    // 자동재생이 켜져있고 이전에 재생 중이었다면 재생
                    if (autoPlay && defaultStorage.getBoolean("hymn_was_playing")) {
                        setTimeout(async () => {
                            try {
                                const state = await TrackPlayer.getPlaybackState();
                                if (state.state !== State.Playing) {
                                    await TrackPlayer.play();
                                    console.log('▶ 백그라운드 트랙 이어서 재생');
                                }
                            } catch (error) {
                                console.error('재생 실패:', error);
                            }
                        }, 500);
                    }
                    return; // 트랙이 이미 있으므로 새로 로드하지 않음
                }
            }

            // 일반적인 자동재생 처리
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
        } catch (error) {
            console.error('❌ 트랙 확인 실패:', error);
        }
    };

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
            // ✅ 찬송가 플레이어 플래그 설정
            defaultStorage.set("is_hymn_player", true);
            defaultStorage.set("is_illdoc_player", false);
            console.log('🎵 찬송가 플레이어로 초기화');

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

            // ✅ RepeatMode를 명확히 Off로 설정
            await TrackPlayer.setRepeatMode(RepeatMode.Off);
            console.log('✅ RepeatMode.Off 설정 완료');

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
            // ✅ 백그라운드에서 이미 로드된 트랙 확인
            const queue = await TrackPlayer.getQueue();
            if (queue.length > 0) {
                const currentTrack = await TrackPlayer.getActiveTrack();
                if (currentTrack?.id?.startsWith('hymn-')) {
                    const backgroundHymnId = parseInt(currentTrack.id.split('-')[1]);
                    if (backgroundHymnId === hymnId) {
                        console.log('✅ 백그라운드 트랙과 일치 - 새로 로드하지 않음');

                        // ✅ 자동재생이 켜져있고 재생 중이 아니면 재생 시작
                        if (autoPlay) {
                            const state = await TrackPlayer.getPlaybackState();
                            if (state.state !== State.Playing) {
                                setTimeout(async () => {
                                    try {
                                        await TrackPlayer.play();
                                        defaultStorage.set("hymn_was_playing", true);
                                        console.log('▶️ 백그라운드 트랙 이어서 재생');
                                    } catch (error) {
                                        console.error('재생 실패:', error);
                                    }
                                }, 300);
                            } else {
                                console.log('✅ 이미 재생 중');
                            }
                        }
                        return;
                    }
                }
            }

            // ✅ 찬송가 플레이어임을 명확히 표시
            defaultStorage.set("is_hymn_player", true);
            defaultStorage.set("is_illdoc_player", false);
            console.log('🎵 찬송가 플레이어 플래그 설정 완료');

            const wasPlaying = isPlaying;

            // ✅ 자동재생이 켜져있고, 이전에 재생 중이었다면 자동 재생 플래그 확인
            const shouldAutoPlay = wasPlaying || (autoPlay && defaultStorage.getBoolean("hymn_was_playing"));

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
                type: isAccompany ? '반주' : '찬양',
                shouldAutoPlay
            });

            await TrackPlayer.add({
                id: hymnData.id.toString(),
                url: trackUrl,
                title: hymnData.title,
                artist: isAccompany ? '반주' : '찬양',
                artwork: hymnData.image,
            });

            // ✅ 이전에 재생 중이었거나 자동재생이 활성화되어 있다면 자동으로 재생
            if (shouldAutoPlay) {
                setTimeout(async () => {
                    await TrackPlayer.play();
                    console.log('▶ 자동 재생 시작');
                }, 300);
            }
        } catch (error) {
            console.error('❌ 트랙 추가 실패:', error);
            Alert.alert('재생 실패', '음악 파일을 로드하는데 실패했습니다.');
        }
    };

    const togglePlayback = async () => {
        try {
            // ✅ 찬송가 플레이어 플래그 확인
            defaultStorage.set("is_hymn_player", true);
            defaultStorage.set("is_illdoc_player", false);

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

    // ✅ 슬라이더 조작 핸들러 추가
    const handleSliderStart = useCallback(() => {
        setIsSeeking(true);
        console.log('🎚️ 슬라이더 조작 시작');
    }, []);

    const handleSliderComplete = useCallback(async (value: number) => {
        try {
            console.log('🎯 슬라이더 위치로 이동:', value.toFixed(1));
            await TrackPlayer.seekTo(value);
            setIsSeeking(false);
            console.log('✅ seekTo 성공');
        } catch (error) {
            console.error('❌ seekTo 실패:', error);
            setIsSeeking(false);
        }
    }, []);

    // ✅ useCallback으로 감싸서 최신 상태 참조 보장
    const handlePrevious = useCallback(() => {
        console.log('⏮️ 이전 곡으로 이동:', { randomPlay, hymnId });

        if (randomPlay) {
            const randomId = Math.floor(Math.random() * 647) + 1;
            navigation.replace('HymnDetailScreen', { hymnId: randomId });
        } else if (hymnId > 1) {
            navigation.replace('HymnDetailScreen', { hymnId: hymnId - 1 });
        }
    }, [randomPlay, hymnId, navigation]);

    // ✅ useCallback으로 감싸서 최신 상태 참조 보장
    const handleNext = useCallback(() => {
        console.log('⏭️ 다음 곡으로 이동:', { randomPlay, hymnId });

        if (randomPlay) {
            const randomId = Math.floor(Math.random() * 647) + 1;
            navigation.replace('HymnDetailScreen', { hymnId: randomId });
        } else if (hymnId < 647) {
            navigation.replace('HymnDetailScreen', { hymnId: hymnId + 1 });
        } else {
            console.log('🏁 마지막 찬송가입니다.');
        }
    }, [randomPlay, hymnId, navigation]);

    const toggleRandomPlay = () => {
        const newValue = !randomPlay;
        setRandomPlay(newValue);
        defaultStorage.set("hymn_random_play_enabled", newValue);
        console.log(`🔀 랜덤재생: ${newValue ? 'ON' : 'OFF'}`);
    };

    const toggleAutoPlay = () => {
        const newValue = !autoPlay;
        setAutoPlay(newValue);
        defaultStorage.set("hymn_auto_play_enabled", newValue);
        console.log(`🔁 자동재생: ${newValue ? 'ON' : 'OFF'}`);
    };

    const toggleAccompany = (isAccompanyMode: boolean) => {
        setIsAccompany(isAccompanyMode);
        defaultStorage.set("hymn_is_accompany", isAccompanyMode);
        console.log(`🎼 ${isAccompanyMode ? '반주' : '찬양'} 모드로 변경`);
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

            {/* 플레이어 컨트롤 */}
            <View style={[styles.playerContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <View style={styles.progressBarContainer}>
                    <View
                        style={styles.progressBarTrack}
                        pointerEvents="none"
                    >
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
                    <Slider
                        style={styles.progressSlider}
                        minimumValue={0}
                        maximumValue={progress.duration || 1}
                        value={isSeeking ? undefined : progress.position}
                        onSlidingStart={handleSliderStart}
                        onSlidingComplete={handleSliderComplete}
                        minimumTrackTintColor="transparent"
                        maximumTrackTintColor="transparent"
                        thumbTintColor="transparent"
                    />
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
        marginTop: -100,
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
        height: 40,
        position: 'relative',
        justifyContent: 'center',
    },
    progressSlider: {
        width: '100%',
        height: 40,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    progressBarTrack: {
        width: '100%',
        height: 4,
        backgroundColor: '#E0E0E0',
        position: 'absolute',
        top: 18,
        left: 0,
        right: 0,
        zIndex: 1,
        pointerEvents: 'none',
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