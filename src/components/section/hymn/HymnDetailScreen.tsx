import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
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
    RepeatMode, AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import { Slider } from "native-base";
import { apiClient, API_ENDPOINTS } from '../../../utils/api';
import { defaultStorage } from '../../../utils/mmkv';
import BannerAdComponent from "../../../adforus";
import BackHeaderLayout from "../../layout/header/backHeader";
import FontAwesomeIcons from 'react-native-vector-icons/FontAwesome';

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
    const [fontSize, setFontSize] = useState(16);
    const [isAccompany, setIsAccompany] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [randomPlay, setRandomPlay] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

    const playbackState = usePlaybackState();
    const progress = useProgress();

    const isPlaying = playbackState.state === State.Playing;
    const isInitializing = useRef(false);
    const hasAutoPlayed = useRef(false);
    const lastHymnId = useRef(hymnId);
    const isSyncingTrack = useRef(false);
    const appStateRef = useRef(AppState.currentState);
    const isNavigatingRef = useRef(false); // ✅ 네비게이션 중 플래그

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        const unsubscribeFocus = navigation.addListener('focus', async () => {
            console.log('🎵 찬송가 화면 포커스');
            isNavigatingRef.current = false;

            // ✅ 찬송가 플레이어 플래그 다시 활성화
            defaultStorage.set("is_hymn_player", true);
            console.log('[FOCUS] is_hymn_player = true');

            // ✅ 포커스 시에도 동기화 체크
            try {
                const backgroundHymnId = defaultStorage.getNumber('current_hymn_id') ?? hymnId;
                console.log(`[FOCUS] 현재 화면: ${hymnId}장, 스토리지: ${backgroundHymnId}장`);

                // ✅ 재생 위치 확인
                try {
                    const position = await TrackPlayer.getPosition();
                    const duration = await TrackPlayer.getDuration();
                    const state = await TrackPlayer.getState();

                    console.log(`[FOCUS] 플레이어 상태: ${state}`);
                    console.log(`[FOCUS] 재생 위치: ${position.toFixed(2)}s / ${duration.toFixed(2)}s`);
                } catch (posError) {
                    console.log(`[FOCUS] 재생 위치 확인 불가 (트랙 없음)`);
                }

                if (backgroundHymnId !== hymnId) {
                    console.log(`[FOCUS] 🔄 동기화 필요 - ${backgroundHymnId}장으로 이동`);
                    navigation.replace('HymnDetailScreen', { hymnId: backgroundHymnId });
                    return;
                }

                // ✅ 현재 재생 중인 트랙 확인
                const currentTrack = await TrackPlayer.getActiveTrack();
                if (currentTrack?.id?.startsWith('hymn-')) {
                    const parts = currentTrack.id.split('-');
                    const trackHymnId = parseInt(parts[1]);

                    console.log(`[FOCUS] 트랙 찬송가: ${trackHymnId}장`);

                    if (trackHymnId !== hymnId) {
                        console.log(`[FOCUS] 🔄 트랙 동기화 필요 - ${trackHymnId}장으로 이동`);
                        navigation.replace('HymnDetailScreen', { hymnId: trackHymnId });
                    }
                }
            } catch (error) {
                console.error('[FOCUS] 동기화 체크 실패:', error);
            }
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            console.log('👋 찬송가 화면 블러 (포커스 벗어남)');

            // ✅ 네비게이션 중인지 확인
            if (isNavigatingRef.current) {
                console.log('🔄 다른 찬송가로 화면 전환 중 - 플레이어 유지');
            } else {
                console.log('⏹ 찬송가 화면 완전히 벗어남 - 플레이어 정지');
                stopAndResetPlayer();
            }
        });

        return () => {
            console.log('🔴 찬송가 화면 언마운트');
            // ✅ 언마운트 시에도 플레이어 정지
            if (!isNavigatingRef.current) {
                console.log('⏹ 완전 종료 - 플레이어 정지');
                stopAndResetPlayer();
            } else {
                console.log('🔄 화면 전환 중 - 플레이어 유지');
            }
            subscription.remove();
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation]);

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        console.log(`[APP_STATE] ${appStateRef.current} → ${nextAppState}`);

        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
            console.log('[FOREGROUND] 찬송가 화면 복귀');

            // ✅ 찬송가 플레이어 플래그 확인
            const isHymnPlayer = defaultStorage.getBoolean('is_hymn_player') ?? false;

            if (!isHymnPlayer) {
                console.log('[FOREGROUND] ⚠️ 찬송가 플레이어 아님 - 동기화 스킵');
                return;
            }

            try {
                // ... 기존 코드 유지 ...
            } catch (error) {
                console.error('[FOREGROUND] 상태 확인 실패:', error);
            }
        } else if (nextAppState === 'background') {
            console.log('📱 백그라운드 전환');

            // ✅ 찬송가 플레이어 플래그 확인
            const isHymnPlayer = defaultStorage.getBoolean('is_hymn_player') ?? false;

            if (!isHymnPlayer) {
                console.log('[BACKGROUND] ⚠️ 찬송가 플레이어 아님 - 백그라운드 재생 스킵');
                return;
            }

            try {
                const state = await TrackPlayer.getState();
                const position = await TrackPlayer.getPosition();
                const duration = await TrackPlayer.getDuration();

                console.log(`[BACKGROUND] 플레이어 상태: ${state}`);
                console.log(`[BACKGROUND] 재생 위치: ${position.toFixed(2)}s / ${duration.toFixed(2)}s`);

                if (state === State.Playing) {
                    console.log('[BACKGROUND] ✅ 백그라운드 재생 계속 진행');
                    defaultStorage.set('hymn_was_playing', true);

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
                        android: {
                            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                        },
                    });
                } else {
                    console.log('[BACKGROUND] ⏸ 일시정지 상태 - 백그라운드 유지');
                }
            } catch (error) {
                console.error('[BACKGROUND] ❌ 백그라운드 처리 실패:', error);
            }
        }

        appStateRef.current = nextAppState;
    };

    const stopAndResetPlayer = async () => {
        try {
            console.log('[STOP] 플레이어 정지 시작');

            // ✅ 플레이어 상태 확인
            try {
                const state = await TrackPlayer.getState();
                console.log(`[STOP] 현재 플레이어 상태: ${state}`);

                // ✅ 재생 중이거나 일시정지 상태면 정지
                if (state === State.Playing || state === State.Paused || state === State.Ready || state === State.Buffering) {
                    await TrackPlayer.pause();
                    console.log('[STOP] ⏸ 일시정지 완료');

                    await TrackPlayer.stop();
                    console.log('[STOP] ⏹ 정지 완료');
                }
            } catch (stateError) {
                console.log('[STOP] 플레이어 상태 확인 불가 (이미 정지됨)');
            }

            // ✅ 큐 리셋
            await TrackPlayer.reset();
            console.log('[STOP] 🔄 큐 리셋 완료');

            // ✅ 플래그 초기화
            defaultStorage.set('hymn_was_playing', false);
            defaultStorage.set('is_hymn_player', false);
            console.log('[STOP] 📝 플래그 초기화 완료 (is_hymn_player = false)');

            console.log('[STOP] ✅ 플레이어 완전 정지 및 초기화 완료');
        } catch (error) {
            console.error('[STOP] ❌ 플레이어 정지 실패:', error);
        }
    };

    useEffect(() => {
        defaultStorage.set("is_hymn_player", true);
        defaultStorage.set("is_illdoc_player", false);

        loadHymnDetail();
        initializePlayer();

        // ✅ 저장된 값 가져오기 (undefined 체크)
        let savedAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled");
        let savedRandomPlay = defaultStorage.getBoolean("hymn_random_play_enabled");
        let savedIsAccompany = defaultStorage.getBoolean("hymn_is_accompany");

        console.log(`📥 저장된 원본 값:`);
        console.log(`  - 자동재생 원본: ${savedAutoPlay}`);
        console.log(`  - 랜덤재생 원본: ${savedRandomPlay}`);
        console.log(`  - 반주모드 원본: ${savedIsAccompany}`);

        // ✅ undefined면 false로 설정하고 저장
        if (savedAutoPlay === undefined || savedAutoPlay === null) {
            console.log('  ⚠️ 자동재생 값 없음 - false로 초기화');
            savedAutoPlay = false;
            defaultStorage.set("hymn_auto_play_enabled", false);
        }
        if (savedRandomPlay === undefined || savedRandomPlay === null) {
            console.log('  ⚠️ 랜덤재생 값 없음 - false로 초기화');
            savedRandomPlay = false;
            defaultStorage.set("hymn_random_play_enabled", false);
        }
        if (savedIsAccompany === undefined || savedIsAccompany === null) {
            console.log('  ⚠️ 반주모드 값 없음 - false로 초기화');
            savedIsAccompany = false;
            defaultStorage.set("hymn_is_accompany", false);
        }

        console.log(`📥 최종 설정 값:`);
        console.log(`  - 자동재생: ${savedAutoPlay ? 'ON' : 'OFF'}`);
        console.log(`  - 랜덤재생: ${savedRandomPlay ? 'ON' : 'OFF'}`);
        console.log(`  - 반주모드: ${savedIsAccompany ? 'ON' : 'OFF'}`);

        // ✅ 명시적으로 boolean 값으로 변환하여 설정
        setAutoPlay(savedAutoPlay === true);
        setRandomPlay(savedRandomPlay === true);
        setIsAccompany(savedIsAccompany === true);
    }, []);

    useEffect(() => {
        if (hymnData && playerReady) {
            checkAndSyncTrack();
        }
    }, [hymnData, playerReady, hymnId]);

    useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackState], async (event) => {
        console.log(`[HYMN_EVENT] 이벤트: ${event.type}, 앱 상태: ${AppState.currentState}`);

        if (AppState.currentState !== 'active') {
            console.log('[HYMN_EVENT] 백그라운드 - PlaybackService가 처리');
            return;
        }

        if (event.type === Event.PlaybackQueueEnded) {
            console.log('🎯 [포그라운드] 찬송가 재생 완료');

            const currentAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;
            console.log(`🔍 현재 자동재생 상태: ${currentAutoPlay ? 'ON' : 'OFF'}`);
            console.log(`🔍 hasAutoPlayed: ${hasAutoPlayed.current}`);

            if (!hasAutoPlayed.current && currentAutoPlay) {
                console.log('✅ 자동 다음곡 실행');
                hasAutoPlayed.current = true;
                defaultStorage.set('hymn_was_playing', true);

                setTimeout(() => {
                    handleNext();
                    hasAutoPlayed.current = false;
                }, 500);
            } else {
                console.log(`⏹ 자동재생 실행 안 함`);
            }
        } else if (event.type === Event.PlaybackState && event.state === State.Ended) {
            console.log('🎯 [포그라운드] 상태 종료 (Fallback)');

            const currentAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;

            if (!hasAutoPlayed.current && currentAutoPlay) {
                console.log('✅ 자동 다음곡 실행 (Fallback)');
                hasAutoPlayed.current = true;
                defaultStorage.set('hymn_was_playing', true);

                setTimeout(() => {
                    handleNext();
                    hasAutoPlayed.current = false;
                }, 800);
            }
        }
    });

    useEffect(() => {
        console.log(`🔁 자동재생 상태: ${autoPlay ? 'ON ✅' : 'OFF ❌'}`);
    }, [autoPlay]);

    useEffect(() => {
        if (lastHymnId.current !== hymnId) {
            hasAutoPlayed.current = false;
            lastHymnId.current = hymnId;
            console.log(`📌 찬송가 변경: ${hymnId}장, hasAutoPlayed 리셋`);
        }
    }, [hymnId]);

    const loadHymnDetail = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(API_ENDPOINTS.HYMN_DETAIL, {
                params: { id: hymnId }
            });

            let hymn = null;
            if (Array.isArray(response.data)) {
                hymn = response.data.find(item => item.id === hymnId);
            } else if (response.data.data) {
                if (Array.isArray(response.data.data)) {
                    hymn = response.data.data.find(item => item.id === hymnId);
                } else {
                    hymn = response.data.data;
                }
            } else {
                hymn = response.data;
            }

            if (hymn) {
                setHymnData(hymn);
                defaultStorage.set('current_hymn_id', hymn.id);
                console.log(`📖 찬송가 로드 완료: ${hymn.id}장 ${hymn.title}`);
            } else {
                throw new Error('찬송가를 찾을 수 없습니다.');
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
        if (isInitializing.current) return;
        isInitializing.current = true;

        try {
            defaultStorage.set("is_hymn_player", true);
            defaultStorage.set("is_illdoc_player", false);

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
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                },
            });

            await TrackPlayer.setRepeatMode(RepeatMode.Off);
            setPlayerReady(true);
            console.log('✅ 찬송가 플레이어 초기화 완료 (백그라운드 재생 지원)');
        } catch (error: any) {
            if (error.message?.includes('already been initialized')) {
                setPlayerReady(true);
            } else {
                console.error('❌ 플레이어 초기화 실패:', error);
            }
        } finally {
            isInitializing.current = false;
        }
    };

    const checkAndSyncTrack = async () => {
        if (isSyncingTrack.current) return;
        isSyncingTrack.current = true;

        try {
            const queue = await TrackPlayer.getQueue();
            if (queue.length === 0) {
                console.log('🔍 큐가 비어있음 - 새 트랙 추가');
                await updateTrack();
                isSyncingTrack.current = false;
                return;
            }

            const currentTrack = await TrackPlayer.getActiveTrack();
            if (!currentTrack) {
                console.log('🔍 활성 트랙 없음 - 새 트랙 추가');
                await updateTrack();
                isSyncingTrack.current = false;
                return;
            }

            const trackId = currentTrack.id;
            console.log(`🔍 현재 트랙 ID: ${trackId}`);

            if (trackId?.startsWith('hymn-')) {
                const parts = trackId.split('-');
                const backgroundHymnId = parseInt(parts[1]);

                console.log(`🔍 트랙 찬송가: ${backgroundHymnId}장, 화면 찬송가: ${hymnId}장`);

                if (backgroundHymnId === hymnId) {
                    // ✅ 재생 위치 및 상태 확인
                    try {
                        const position = await TrackPlayer.getPosition();
                        const duration = await TrackPlayer.getDuration();
                        const state = await TrackPlayer.getState();

                        console.log(`✅ 동일한 찬송가`);
                        console.log(`  - 재생 위치: ${position.toFixed(2)}s / ${duration.toFixed(2)}s`);
                        console.log(`  - 플레이어 상태: ${state}`);

                        // ✅ 자동재생 플래그 확인
                        const shouldAutoPlay = defaultStorage.getBoolean('hymn_was_playing') ?? false;
                        console.log(`  - 자동재생 플래그: ${shouldAutoPlay ? 'ON' : 'OFF'}`);

                        if (shouldAutoPlay) {
                            if (state === State.Playing) {
                                console.log('✅ 이미 재생 중 - 재생 위치 동기화 완료');
                            } else if (state === State.Paused || state === State.Ready || state === State.Stopped) {
                                console.log('▶ 일시정지/준비 상태 - 재생 재개');

                                // ✅ 재생 위치 유지하면서 재생 시작
                                setTimeout(async () => {
                                    try {
                                        const currentPosition = await TrackPlayer.getPosition();
                                        console.log(`▶ ${currentPosition.toFixed(2)}s 위치에서 재생 재개`);

                                        await TrackPlayer.play();
                                        console.log('✅ 재생 재개 성공');
                                    } catch (error) {
                                        console.error('❌ 재생 재개 실패:', error);
                                    }
                                }, 300);
                            } else if (state === State.Buffering || state === State.Loading) {
                                console.log('⏳ 버퍼링/로딩 중 - 완료 대기');

                                // ✅ 버퍼링 완료 후 자동 재생
                                const checkBuffering = setInterval(async () => {
                                    try {
                                        const newState = await TrackPlayer.getState();
                                        if (newState === State.Ready || newState === State.Paused) {
                                            clearInterval(checkBuffering);
                                            console.log('✅ 버퍼링 완료 - 재생 시작');
                                            await TrackPlayer.play();
                                        }
                                    } catch (e) {
                                        clearInterval(checkBuffering);
                                        console.error('❌ 버퍼링 체크 실패:', e);
                                    }
                                }, 500);

                                // 10초 후 타임아웃
                                setTimeout(() => {
                                    clearInterval(checkBuffering);
                                }, 10000);
                            } else {
                                console.log(`⚠️ 예상치 못한 상태: ${state}`);
                            }
                        } else {
                            console.log('⏹ 자동재생 비활성화 - 일시정지 유지');
                        }
                    } catch (posError) {
                        console.error('⚠️ 재생 위치 확인 실패:', posError);
                    }

                    isSyncingTrack.current = false;
                    return;
                } else {
                    console.log(`⚠️ 트랙과 화면이 다름 - ${backgroundHymnId}장 → ${hymnId}장`);
                }
            }

            console.log('🔄 새 트랙 로드 필요');
            await updateTrack();
        } catch (error) {
            console.error('❌ 트랙 동기화 실패:', error);
        } finally {
            isSyncingTrack.current = false;
        }
    };

    const updateTrack = async () => {
        if (!hymnData || (!hymnData.audio && !hymnData.mraudio)) {
            console.warn('⚠️ 음악 파일 URL이 없습니다.');
            return;
        }

        try {
            const wasPlaying = isPlaying;
            const shouldAutoPlay = wasPlaying || (defaultStorage.getBoolean('hymn_was_playing') ?? false);

            console.log(`🔄 트랙 업데이트:`);
            console.log(`  - wasPlaying: ${wasPlaying}`);
            console.log(`  - shouldAutoPlay: ${shouldAutoPlay}`);

            // ✅ 현재 재생 위치 저장 (같은 찬송가인 경우)
            let savedPosition = 0;
            try {
                const currentTrack = await TrackPlayer.getActiveTrack();
                if (currentTrack?.id === `hymn-${hymnData.id}`) {
                    savedPosition = await TrackPlayer.getPosition();
                    console.log(`  - 저장된 재생 위치: ${savedPosition.toFixed(2)}s`);
                }
            } catch (e) {
                console.log('  - 재생 위치 저장 불가');
            }

            if (wasPlaying) {
                await TrackPlayer.pause();
            }

            await TrackPlayer.reset();

            let trackUrl: string | null = null;
            let trackType: string = '';

            if (isAccompany) {
                trackUrl = hymnData.mraudio;
                trackType = '반주';
                if (!trackUrl) {
                    Alert.alert('알림', '반주 파일이 없습니다.');
                    return;
                }
            } else {
                trackUrl = hymnData.audio;
                trackType = '찬양';
                if (!trackUrl) {
                    Alert.alert('알림', '찬양 파일이 없습니다.');
                    return;
                }
            }

            console.log('🎵 트랙 추가:', {
                id: hymnData.id,
                url: trackUrl,
                title: hymnData.title,
                type: trackType,
            });

            await TrackPlayer.add({
                id: `hymn-${hymnData.id}`,
                url: trackUrl,
                title: `${hymnData.num}장 ${hymnData.title}`,
                artist: trackType,
                artwork: hymnData.image,
            });

            // ✅ 저장된 위치로 이동 (같은 찬송가인 경우)
            if (savedPosition > 0) {
                console.log(`⏩ 재생 위치 복원: ${savedPosition.toFixed(2)}s`);
                await TrackPlayer.seekTo(savedPosition);
            }

            if (shouldAutoPlay) {
                setTimeout(async () => {
                    try {
                        await TrackPlayer.play();
                        console.log('▶ 자동 재생 시작');

                        // ✅ 재생 위치 확인
                        setTimeout(async () => {
                            try {
                                const newPosition = await TrackPlayer.getPosition();
                                console.log(`✅ 현재 재생 위치: ${newPosition.toFixed(2)}s`);
                            } catch (e) {
                                console.log('재생 위치 확인 불가');
                            }
                        }, 1000);
                    } catch (error) {
                        console.error('❌ 자동 재생 실패:', error);
                    }
                }, 800);
            }
        } catch (error) {
            console.error('❌ 트랙 추가 실패:', error);
            Alert.alert('재생 실패', '음악 파일을 로드하는데 실패했습니다.');
        }
    };

    const togglePlayback = async () => {
        if (isProcessingAction) {
            console.log('[PLAY] 이미 처리 중');
            return;
        }

        try {
            setIsProcessingAction(true);

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
        } finally {
            setTimeout(() => {
                setIsProcessingAction(false);
            }, 300);
        }
    };

    const handleSliderStart = useCallback(() => {
        setIsSeeking(true);
    }, []);

    const handleSliderComplete = useCallback(async (value: number) => {
        try {
            await TrackPlayer.seekTo(value);
            setIsSeeking(false);
        } catch (error) {
            console.error('❌ seekTo 실패:', error);
            setIsSeeking(false);
        }
    }, []);

    const handlePrevious = useCallback(async () => {
        if (isProcessingAction) {
            console.log('[PREV] 이미 처리 중');
            return;
        }

        try {
            setIsProcessingAction(true);
            isNavigatingRef.current = true; // ✅ 네비게이션 시작
            console.log('[PREV] 🔄 이전 곡으로 이동 (네비게이션 플래그 ON)');

            if (randomPlay) {
                const randomId = Math.floor(Math.random() * 647) + 1;
                navigation.replace('HymnDetailScreen', { hymnId: randomId });
            } else if (hymnId > 1) {
                navigation.replace('HymnDetailScreen', { hymnId: hymnId - 1 });
            }
        } catch (error) {
            console.error('❌ 이전 곡 이동 실패:', error);
            isNavigatingRef.current = false;
        } finally {
            setTimeout(() => {
                setIsProcessingAction(false);
            }, 500);
        }
    }, [randomPlay, hymnId, navigation, isProcessingAction]);


    const handleNext = useCallback(async () => {
        if (isProcessingAction) {
            console.log('[NEXT] 이미 처리 중');
            return;
        }

        try {
            setIsProcessingAction(true);
            isNavigatingRef.current = true; // ✅ 네비게이션 시작
            console.log('[NEXT] 🔄 다음 곡으로 이동 (네비게이션 플래그 ON)');

            let nextId: number;

            if (randomPlay) {
                nextId = Math.floor(Math.random() * 647) + 1;
                console.log(`🎲 랜덤: ${nextId}장`);
            } else if (hymnId < 647) {
                nextId = hymnId + 1;
                console.log(`➡️ 다음: ${nextId}장`);
            } else {
                console.log('🏁 마지막 찬송가');
                setIsProcessingAction(false);
                isNavigatingRef.current = false;
                return;
            }

            const isAutoPlayEnabled = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;
            console.log(`🔍 자동재생 상태 확인: ${isAutoPlayEnabled ? 'ON' : 'OFF'}`);

            if (isAutoPlayEnabled) {
                defaultStorage.set('hymn_was_playing', true);
                console.log(`📝 다음 곡 설정: ${nextId}장, 자동재생 플래그: ON`);
            } else {
                defaultStorage.set('hymn_was_playing', false);
                console.log(`📝 다음 곡 설정: ${nextId}장, 자동재생 플래그: OFF`);
            }

            defaultStorage.set('current_hymn_id', nextId);

            navigation.replace('HymnDetailScreen', { hymnId: nextId });
        } catch (error) {
            console.error('❌ 다음 곡 이동 실패:', error);
            isNavigatingRef.current = false;
        } finally {
            setTimeout(() => {
                setIsProcessingAction(false);
            }, 500);
        }
    }, [randomPlay, hymnId, navigation, isProcessingAction]);

    const toggleRandomPlay = () => {
        const newValue = !randomPlay;
        setRandomPlay(newValue);
        defaultStorage.set("hymn_random_play_enabled", newValue);
        console.log(`🔀 랜덤재생: ${newValue ? 'ON ✅' : 'OFF ❌'}`);
    };

    const toggleAutoPlay = () => {
        const newValue = !autoPlay;
        console.log(`🔁 자동재생 토글: ${autoPlay ? 'ON' : 'OFF'} → ${newValue ? 'ON' : 'OFF'}`);

        setAutoPlay(newValue);
        defaultStorage.set("hymn_auto_play_enabled", newValue);

        setTimeout(() => {
            const saved = defaultStorage.getBoolean("hymn_auto_play_enabled");
            console.log(`✅ 저장 확인: ${saved ? 'ON ✅' : 'OFF ❌'}`);
        }, 100);
    };

    const toggleAccompany = async (isAccompanyMode: boolean) => {
        if (isProcessingAction) {
            console.log('[MODE] 이미 처리 중');
            return;
        }

        try {
            setIsProcessingAction(true);

            setIsAccompany(isAccompanyMode);
            defaultStorage.set("hymn_is_accompany", isAccompanyMode);

            const wasPlaying = isPlaying;

            if (wasPlaying) {
                await TrackPlayer.pause();
            }

            await TrackPlayer.reset();

            if (!hymnData) return;

            let trackUrl: string | null = null;
            let trackType: string = '';

            if (isAccompanyMode) {
                trackUrl = hymnData.mraudio;
                trackType = '반주';
                if (!trackUrl) {
                    Alert.alert('알림', '반주 파일이 없습니다.');
                    return;
                }
            } else {
                trackUrl = hymnData.audio;
                trackType = '찬양';
                if (!trackUrl) {
                    Alert.alert('알림', '찬양 파일이 없습니다.');
                    return;
                }
            }

            await TrackPlayer.add({
                id: `hymn-${hymnData.id}`,
                url: trackUrl,
                title: `${hymnData.num}장 ${hymnData.title}`,
                artist: trackType,
                artwork: hymnData.image,
            });

            if (wasPlaying) {
                setTimeout(async () => {
                    await TrackPlayer.play();
                }, 300);
            }
        } catch (error) {
            console.error('❌ 모드 변경 중 오류:', error);
            Alert.alert('오류', '모드를 변경하는데 실패했습니다.');
        } finally {
            setTimeout(() => {
                setIsProcessingAction(false);
            }, 500);
        }
    };

    const increaseFontSize = () => {
        setFontSize(prev => Math.min(prev + 2, 24));
    };

    const decreaseFontSize = () => {
        setFontSize(prev => Math.max(prev - 2, 12));
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
            <BackHeaderLayout title={`${hymnData.num}장 ${hymnData.title}`} />

            <View style={[styles.adContainer, { top: 65 }]}>
                <BannerAdComponent />
            </View>

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
                {showLyrics && (
                    <View style={styles.fontSizeControls}>
                        <TouchableOpacity
                            style={styles.fontSizeButton}
                            onPress={decreaseFontSize}
                        >
                            <Text style={styles.fontSizeButtonText}>가-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.fontSizeButton}
                            onPress={increaseFontSize}
                        >
                            <Text style={styles.fontSizeButtonText}>가+</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.imageContainer}>
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 250 }
                    ]}
                >
                    {hymnData.image && (
                        <Image
                            source={{ uri: hymnData.image }}
                            style={styles.sheetMusicImage}
                            resizeMode="contain"
                        />
                    )}
                </ScrollView>

                {showLyrics && hymnData.content && (
                    <View style={styles.lyricsOverlay}>
                        <ScrollView
                            style={styles.lyricsScrollView}
                            showsVerticalScrollIndicator={true}
                        >
                            <View style={styles.lyricsBox}>
                                <Text style={[styles.lyricsText, { fontSize }]}>
                                    {processContent(hymnData.content)}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                )}
            </View>

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
                        w="100%"
                        value={progress.position}
                        minValue={0}
                        maxValue={progress?.duration > 0 ? progress.duration : 100}
                        accessibilityLabel="sound"
                        onChange={handleSliderComplete}
                        step={1}
                    >
                        <Slider.Track>
                            <Slider.FilledTrack bg={color.bible} />
                        </Slider.Track>
                    </Slider>
                </View>

                <View style={styles.mainControls}>
                    <View style={styles.accompanyContainer}>
                        <TouchableOpacity
                            style={styles.accompanyOption}
                            onPress={() => toggleAccompany(false)}
                            disabled={isProcessingAction}
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
                            disabled={isProcessingAction}
                        >
                            <Text style={[
                                styles.accompanyLabel,
                                isAccompany && styles.accompanyLabelActive
                            ]}>
                                반주
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.playbackControls}>
                        <TouchableOpacity
                            onPress={handlePrevious}
                            style={styles.controlButton}
                            disabled={isProcessingAction}
                        >
                            <View style={styles.prevButton}>
                                <View style={[
                                    styles.prevBar,
                                    isProcessingAction && { backgroundColor: '#ccc' }
                                ]} />
                                <View style={[
                                    styles.prevTriangle,
                                    isProcessingAction && { borderRightColor: '#ccc' }
                                ]} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            disabled={isProcessingAction}
                            onPress={togglePlayback}
                        >
                            <FontAwesomeIcons
                                name={isPlaying ? "pause-circle" : "play-circle"}
                                size={60}
                                color={isProcessingAction ? "#ccc" : color.bible}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleNext}
                            style={styles.controlButton}
                            disabled={isProcessingAction}
                        >
                            <View style={styles.nextButton}>
                                <View style={[
                                    styles.nextTriangle,
                                    isProcessingAction && { borderLeftColor: '#ccc' }
                                ]} />
                                <View style={[
                                    styles.nextBar,
                                    isProcessingAction && { backgroundColor: '#ccc' }
                                ]} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.bibleButton}
                        onPress={() => navigation.navigate('BibleScreen')}
                    >
                        <Text style={styles.bibleButtonText}>성경</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomOptions}>
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
    fontSizeControls: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        gap: 8,
        zIndex: 20,
    },
    fontSizeButton: {
        width: 35,
        height: 35,
        borderRadius: 25,
        backgroundColor: '#2AC1BC',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    fontSizeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    lyricsToggleContainer: {
        marginTop: 80,
        flexDirection: 'row',
        alignItems: 'center',
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
        paddingBottom: 300,
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
        marginRight: 20,
        marginTop:-10,
        marginBottom:-10
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
        paddingHorizontal: 6,
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -30,
    },
    controlButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight:10
    },
    prevButton: {
        flexDirection: 'row',
        alignItems: 'center',
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
        marginLeft: 20,
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