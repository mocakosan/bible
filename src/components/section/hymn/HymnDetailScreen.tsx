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
    RepeatMode,
    AppKilledPlaybackBehavior,
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
    const isProcessingAutoNext = useRef(false);
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
    const isAutoNextingRef = useRef(false);
    const playbackState = usePlaybackState();
    const progress = useProgress();
    const isNavigatingRef = useRef(false);
    const isPlaying = playbackState.state === State.Playing;
    const isInitializing = useRef(false);
    const hasAutoPlayed = useRef(false);
    const lastHymnId = useRef(hymnId);
    const isSyncingTrack = useRef(false);
    const isUpdatingTrack = useRef(false);
    const appStateRef = useRef(AppState.currentState);


    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        const unsubscribeFocus = navigation.addListener('focus', async () => {
            console.log('🎵 찬송가 화면 포커스');
            isNavigatingRef.current = false;

            // ✅ 자동 다음곡 이동 완료
            if (isAutoNextingRef.current) {
                console.log('[FOCUS] 🔄 자동 다음곡 이동 완료');
                isAutoNextingRef.current = false;

                // ✅ 자동 다음곡 처리 플래그 해제 (약간의 지연)
                setTimeout(() => {
                    isProcessingAutoNext.current = false;
                }, 500);
            }

            // ✅ 찬송가 플레이어 플래그 활성화
            defaultStorage.set("is_hymn_player", true);
            console.log('[FOCUS] is_hymn_player = true');

            // ✅ current_hymn_id가 없으면 현재 화면 ID로 설정 (HymnListScreen에서 온 경우)
            const storedHymnId = defaultStorage.getNumber('current_hymn_id');
            if (!storedHymnId || storedHymnId === 0) {
                console.log('[FOCUS] 📝 스토리지 ID 없음 - 현재 화면 ID로 초기화');
                defaultStorage.set('current_hymn_id', hymnId);
            }

            // ✅ 백그라운드 동기화 체크
            try {
                const backgroundHymnId = defaultStorage.getNumber('current_hymn_id') ?? hymnId;
                const backgroundIsAccompany = defaultStorage.getBoolean('hymn_is_accompany') ?? false;

                console.log(`[FOCUS] 현재 화면: ${hymnId}장, 스토리지: ${backgroundHymnId}장`);
                console.log(`[FOCUS] 현재 반주모드: ${isAccompany ? '반주' : '찬양'}, 스토리지: ${backgroundIsAccompany ? '반주' : '찬양'}`);

                // ✅ 현재 재생 중인 트랙 확인
                const currentTrack = await TrackPlayer.getActiveTrack();

                // ✅ 트랙이 없으면 새로 시작 (HymnListScreen에서 온 경우)
                if (!currentTrack) {
                    console.log('[FOCUS] 🆕 트랙 없음 - 새로 시작');
                    // ✅ 반주 모드 UI 동기화
                    if (backgroundIsAccompany !== isAccompany) {
                        console.log(`[FOCUS] 🎹 반주모드 UI 동기화: ${backgroundIsAccompany ? '반주' : '찬양'}`);
                        setIsAccompany(backgroundIsAccompany);
                    }
                    return;
                }

                if (currentTrack.id?.startsWith('hymn-')) {
                    const parts = currentTrack.id.split('-');
                    const trackHymnId = parseInt(parts[1]);

                    console.log(`[FOCUS] 트랙 찬송가: ${trackHymnId}장`);
                    console.log(`[FOCUS] 트랙 타입: ${currentTrack.artist}`);

                    // ✅ 재생 위치 확인
                    try {
                        const position = await TrackPlayer.getPosition();
                        const duration = await TrackPlayer.getDuration();
                        const state = await TrackPlayer.getState();

                        console.log(`[FOCUS] 플레이어 상태: ${state}`);
                        console.log(`[FOCUS] 재생 위치: ${position.toFixed(2)}s / ${duration.toFixed(2)}s`);

                        // ✅ ended 상태이면 트랙 동기화 하지 않음 (다음 곡으로 이동한 것이므로)
                        if (state === State.Ended) {
                            console.log('[FOCUS] ⚠️ 이전 트랙이 ended 상태 - 동기화 스킵 (정상적인 다음 곡 이동)');

                            // ✅ 반주 모드 UI 동기화만 수행
                            if (backgroundIsAccompany !== isAccompany) {
                                console.log(`[FOCUS] 🎹 반주모드 UI 동기화: ${backgroundIsAccompany ? '반주' : '찬양'}`);
                                setIsAccompany(backgroundIsAccompany);
                            }
                            return;
                        }
                    } catch (posError) {
                        console.log(`[FOCUS] 재생 위치 확인 불가`);
                    }

                    // ✅ 트랙 찬송가와 화면 찬송가가 다르면 동기화
                    if (trackHymnId !== hymnId) {
                        console.log(`[FOCUS] 🔄 백그라운드에서 ${trackHymnId}장으로 변경됨 - 화면 동기화`);

                        // ✅ 네비게이션 플래그 설정 (플레이어 유지)
                        isNavigatingRef.current = true;

                        // ✅ 화면 이동
                        navigation.replace('HymnDetailScreen', { hymnId: trackHymnId });
                        return;
                    }

                    // ✅ 같은 찬송가지만 반주 모드가 다른 경우 UI 동기화
                    if (backgroundIsAccompany !== isAccompany) {
                        console.log(`[FOCUS] 🎹 반주모드 UI 동기화: ${backgroundIsAccompany ? '반주' : '찬양'}`);
                        setIsAccompany(backgroundIsAccompany);
                    }
                } else if (backgroundHymnId !== hymnId) {
                    // ✅ 트랙이 없지만 스토리지가 다르면 동기화
                    console.log(`[FOCUS] 🔄 스토리지 동기화 - ${backgroundHymnId}장으로 이동`);
                    isNavigatingRef.current = true;
                    navigation.replace('HymnDetailScreen', { hymnId: backgroundHymnId });
                    return;
                }
            } catch (error) {
                console.error('[FOCUS] 동기화 체크 실패:', error);
            }
        });

        const unsubscribeBlur = navigation.addListener('blur', async () => {
            console.log('👋 찬송가 화면 블러 (포커스 벗어남)');

            // ✅ 자동재생 플래그 확인
            const wasPlaying = defaultStorage.getBoolean('hymn_was_playing') ?? false;
            console.log(`[BLUR] 자동재생 플래그: ${wasPlaying ? 'ON' : 'OFF'}`);

            // ✅ 자동 다음곡 이동 중이거나 자동재생 플래그가 켜져있으면 플레이어 유지
            if (isAutoNextingRef.current || wasPlaying) {
                console.log('[BLUR] 🎵 자동 다음곡 이동 중 또는 자동재생 ON - 플레이어 유지');
                return;
            }

            // ✅ 네비게이션 중인지 확인
            if (isNavigatingRef.current) {
                console.log('[BLUR] 🔄 다른 찬송가로 화면 전환 중 - 플레이어 유지');
                return;
            }

            try {
                const state = await TrackPlayer.getState();
                console.log(`[BLUR] 현재 플레이어 상태: ${state}`);

                if (state === State.Playing || state === State.Buffering || state === State.Loading) {
                    console.log('[BLUR] 🎵 재생 중 또는 버퍼링 중 - 백그라운드 재생 유지');
                    // ✅ is_hymn_player 플래그 유지 (백그라운드 자동재생을 위해)
                    // stopAndResetPlayer()를 호출하지 않음
                } else {
                    console.log('[BLUR] ⏹ 재생 중 아님 - 플레이어 정지');
                    stopAndResetPlayer();
                }
            } catch (error) {
                console.error('[BLUR] ❌ 상태 확인 실패:', error);
                stopAndResetPlayer();
            }
        });

        return () => {
            console.log('🔴 찬송가 화면 언마운트');

            const wasPlaying = defaultStorage.getBoolean('hymn_was_playing') ?? false;

            if (!isNavigatingRef.current && !isAutoNextingRef.current && !wasPlaying) {
                console.log('⏹ 완전 종료 - 플레이어 정지');
                stopAndResetPlayer();
            } else {
                console.log('🔄 화면 전환 중 또는 자동재생 상태 - 플레이어 유지');
                console.log(`  - isNavigatingRef: ${isNavigatingRef.current}`);
                console.log(`  - isAutoNextingRef: ${isAutoNextingRef.current}`);
                console.log(`  - wasPlaying: ${wasPlaying}`);
            }
            subscription.remove();
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation, hymnId]);

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
                // ✅ 백그라운드에서 변경된 찬송가 ID 확인
                const backgroundHymnId = defaultStorage.getNumber('current_hymn_id') ?? hymnId;
                console.log(`[FOREGROUND] 현재 화면 찬송가: ${hymnId}장`);
                console.log(`[FOREGROUND] 백그라운드 찬송가: ${backgroundHymnId}장`);

                // ✅ 현재 재생 중인 트랙 확인
                const currentTrack = await TrackPlayer.getActiveTrack();
                let trackHymnId = backgroundHymnId;

                if (currentTrack?.id?.startsWith('hymn-')) {
                    const parts = currentTrack.id.split('-');
                    trackHymnId = parseInt(parts[1]);
                    console.log(`[FOREGROUND] 트랙 찬송가: ${trackHymnId}장`);
                }

                // ✅ 백그라운드에서 다른 찬송가로 변경되었으면 화면 업데이트
                if (trackHymnId !== hymnId) {
                    console.log(`[FOREGROUND] 🔄 백그라운드에서 ${trackHymnId}장으로 변경됨 - 화면 동기화`);

                    // ✅ 네비게이션 플래그 설정
                    isNavigatingRef.current = true;

                    // ✅ 화면 이동
                    navigation.replace('HymnDetailScreen', { hymnId: trackHymnId });
                    return;
                }

                const state = await TrackPlayer.getState();
                const position = await TrackPlayer.getPosition();
                const duration = await TrackPlayer.getDuration();

                console.log(`[FOREGROUND] 플레이어 상태: ${state}`);
                console.log(`[FOREGROUND] 재생 위치: ${position.toFixed(2)}s / ${duration.toFixed(2)}s`);

                // ✅ 자동재생 플래그 확인
                const shouldAutoPlay = defaultStorage.getBoolean('hymn_was_playing') ?? false;
                console.log(`[FOREGROUND] 자동재생 플래그: ${shouldAutoPlay ? 'ON' : 'OFF'}`);

                if (state === State.Playing) {
                    console.log('[FOREGROUND] ✅ 백그라운드에서 재생 중 - 재생 위치 동기화 완료');
                } else if (state === State.Paused && shouldAutoPlay) {
                    console.log('[FOREGROUND] ▶ 일시정지 상태지만 자동재생 ON - 재생 재개');

                    setTimeout(async () => {
                        try {
                            const currentPosition = await TrackPlayer.getPosition();
                            console.log(`[FOREGROUND] ${currentPosition.toFixed(2)}s 위치에서 재생 재개`);

                            await TrackPlayer.play();
                            console.log('[FOREGROUND] ✅ 재생 재개 성공');
                        } catch (error) {
                            console.error('[FOREGROUND] ❌ 재생 재개 실패:', error);
                        }
                    }, 500);
                } else if (state === State.Ready && shouldAutoPlay) {
                    console.log('[FOREGROUND] ▶ 준비 상태 - 자동재생 ON - 재생 시작');

                    setTimeout(async () => {
                        try {
                            await TrackPlayer.play();
                            console.log('[FOREGROUND] ✅ 재생 시작 성공');
                        } catch (error) {
                            console.error('[FOREGROUND] ❌ 재생 시작 실패:', error);
                        }
                    }, 300);
                } else if (state === State.Buffering || state === State.Loading) {
                    console.log('[FOREGROUND] ⏳ 버퍼링/로딩 중 - 완료 후 재생');

                    if (shouldAutoPlay) {
                        const waitForReady = setInterval(async () => {
                            try {
                                const newState = await TrackPlayer.getState();
                                if (newState === State.Ready || newState === State.Paused) {
                                    clearInterval(waitForReady);
                                    console.log('[FOREGROUND] ✅ 버퍼링 완료 - 재생 시작');
                                    await TrackPlayer.play();
                                }
                            } catch (e) {
                                clearInterval(waitForReady);
                            }
                        }, 500);

                        setTimeout(() => clearInterval(waitForReady), 10000);
                    }
                }
            } catch (error) {
                console.error('[FOREGROUND] 상태 확인 실패:', error);
            }
        } else if (nextAppState === 'background') {
            console.log('📱 백그라운드 전환');

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

            // ✅ 자동재생 플래그 확인
            const wasPlaying = defaultStorage.getBoolean('hymn_was_playing') ?? false;
            console.log(`[STOP] 자동재생 플래그: ${wasPlaying ? 'ON' : 'OFF'}`);

            // ✅ 자동재생 플래그가 켜져있으면 플레이어 정지하지 않음
            if (wasPlaying) {
                console.log('[STOP] ⚠️ 자동재생 플래그 ON - 플레이어 유지');
                return;
            }

            try {
                const state = await TrackPlayer.getState();
                console.log(`[STOP] 현재 플레이어 상태: ${state}`);

                if (state === State.Playing || state === State.Paused || state === State.Ready || state === State.Buffering) {
                    await TrackPlayer.pause();
                    console.log('[STOP] ⏸ 일시정지 완료');

                    await TrackPlayer.stop();
                    console.log('[STOP] ⏹ 정지 완료');
                }
            } catch (stateError) {
                console.log('[STOP] 플레이어 상태 확인 불가 (이미 정지됨)');
            }

            await TrackPlayer.reset();
            console.log('[STOP] 🔄 큐 리셋 완료');

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

        const savedAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? true;
        const savedRandomPlay = defaultStorage.getBoolean("hymn_random_play_enabled") ?? false;
        const savedIsAccompany = defaultStorage.getBoolean("hymn_is_accompany") ?? false;

        console.log(`📥 저장된 설정 불러오기:`);
        console.log(`  - 자동재생: ${savedAutoPlay ? 'ON' : 'OFF'}`);
        console.log(`  - 랜덤재생: ${savedRandomPlay ? 'ON' : 'OFF'}`);
        console.log(`  - 반주모드: ${savedIsAccompany ? 'ON' : 'OFF'}`);

        setAutoPlay(savedAutoPlay);
        setRandomPlay(savedRandomPlay);
        setIsAccompany(savedIsAccompany);
    }, []);

    useEffect(() => {
        if (hymnData && playerReady) {
            console.log(`[EFFECT] hymnId 변경됨: ${hymnId}장 - 동기화 시작`);

            // ✅ 약간의 딜레이 후 동기화 (로드 완료 보장)
            const timer = setTimeout(() => {
                checkAndSyncTrack();
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [hymnData, playerReady, hymnId]);

    // ✅ 자동 다음곡 재생 - 포그라운드 전용
    useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackState], async (event) => {
        console.log(`[HYMN_EVENT] 이벤트: ${event.type}, 앱 상태: ${AppState.currentState}`);

        if (AppState.currentState !== 'active') {
            console.log('[HYMN_EVENT] 백그라운드 - PlaybackService가 처리');
            return;
        }

        // ✅ PlaybackQueueEnded 이벤트 처리
        if (event.type === Event.PlaybackQueueEnded) {
            console.log('🎯 [포그라운드] PlaybackQueueEnded 이벤트');

            // ✅ 이미 처리 중이면 스킵
            if (isProcessingAutoNext.current) {
                console.log('⏭️ 이미 자동 다음곡 처리 중 - 이벤트 무시');
                return;
            }

            const currentAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;

            if (currentAutoPlay) {
                console.log(`✅ 자동 다음곡 실행 (QueueEnded)`);
                isProcessingAutoNext.current = true;
                defaultStorage.set('hymn_was_playing', true);

                setTimeout(() => {
                    handleNext();
                    setTimeout(() => {
                        isProcessingAutoNext.current = false;
                    }, 1000);
                }, 300);
            }
        }

        // ✅ PlaybackState 변경 이벤트 처리
        else if (event.type === Event.PlaybackState) {
            const state = event.state;
            console.log(`🎯 [포그라운드] 상태 변경: ${state}`);

            // ✅ 이미 처리 중이면 모든 상태 변경 무시
            if (isProcessingAutoNext.current) {
                console.log('⏭️ 이미 자동 다음곡 처리 중 - 상태 변경 무시');
                return;
            }

            // ✅ Ended 상태 처리
            if (state === State.Ended) {
                console.log('🎯 [포그라운드] State.Ended 감지');

                const currentAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;

                if (currentAutoPlay) {
                    console.log(`✅ 자동 다음곡 실행 (Ended)`);
                    isProcessingAutoNext.current = true;
                    defaultStorage.set('hymn_was_playing', true);

                    setTimeout(() => {
                        handleNext();
                        setTimeout(() => {
                            isProcessingAutoNext.current = false;
                        }, 1000);
                    }, 300);
                }
            }

            // ✅ Stopped 상태 처리 (재생 완료 시 stopped로 변경되는 경우)
            else if (state === State.Stopped) {
                console.log('🎯 [포그라운드] State.Stopped 감지');

                // ✅ 재생 위치 확인 (완료된 것인지 수동 정지인지 구분)
                try {
                    const position = await TrackPlayer.getPosition();
                    const duration = await TrackPlayer.getDuration();

                    console.log(`🔍 재생 위치: ${position.toFixed(2)}s / ${duration.toFixed(2)}s`);

                    // ✅ 재생이 거의 끝까지 진행되었으면 완료로 간주 (마지막 1초 이내)
                    if (duration > 0 && (duration - position) < 1) {
                        console.log('🎯 [포그라운드] 재생 완료 감지 (Stopped at end)');

                        const currentAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;

                        if (currentAutoPlay) {
                            console.log(`✅ 자동 다음곡 실행 (Stopped)`);
                            isProcessingAutoNext.current = true;
                            defaultStorage.set('hymn_was_playing', true);

                            setTimeout(() => {
                                handleNext();
                                setTimeout(() => {
                                    isProcessingAutoNext.current = false;
                                }, 1000);
                            }, 300);
                        }
                    } else {
                        console.log('⏹ 수동 정지 또는 재생 중간 - 자동 다음곡 안 함');
                    }
                } catch (error) {
                    console.error('❌ 재생 위치 확인 실패:', error);
                }
            }
        }
    });

    useEffect(() => {
        if (lastHymnId.current !== hymnId) {
            hasAutoPlayed.current = false;
            isProcessingAutoNext.current = false; // ✅ 추가
            lastHymnId.current = hymnId;
            console.log(`📌 찬송가 변경: ${hymnId}장, 플래그 리셋`);
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
    // const lastProgressRef = useRef({ position: 0, duration: 0 });

    // useEffect(() => {
    //     // ✅ 재생이 진행 중일 때만 체크
    //     if (isPlaying && progress.duration > 0) {
    //         lastProgressRef.current = {
    //             position: progress.position,
    //             duration: progress.duration,
    //         };
    //
    //         // ✅ 재생이 끝에 가까워지면 (마지막 2초 이내)
    //         const remaining = progress.duration - progress.position;
    //         if (remaining > 0 && remaining < 2) {
    //             console.log(`⏱️ 재생 거의 완료: ${remaining.toFixed(2)}초 남음`);
    //         }
    //     }
    // }, [progress.position, progress.duration, isPlaying]);

    // useEffect(() => {
    //     const checkPlaybackCompletion = async () => {
    //         // ✅ 이미 처리 중이면 스킵
    //         if (isProcessingAutoNext.current) {
    //             console.log('[PLAYBACK_CHECK] ⏭️ 이미 자동 다음곡 처리 중 - 스킵');
    //             return;
    //         }
    //
    //         if (!isPlaying && lastProgressRef.current.duration > 0) {
    //             const { position, duration } = lastProgressRef.current;
    //             const remaining = duration - position;
    //
    //             console.log(`[PLAYBACK_CHECK] 재생 정지됨`);
    //             console.log(`[PLAYBACK_CHECK] 마지막 위치: ${position.toFixed(2)}s / ${duration.toFixed(2)}s`);
    //             console.log(`[PLAYBACK_CHECK] 남은 시간: ${remaining.toFixed(2)}s`);
    //
    //             // ✅ 재생이 거의 완료되었고 (2초 이내), 자동재생이 켜져있으면
    //             if (remaining < 2) {
    //                 const currentAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;
    //
    //                 console.log(`[PLAYBACK_CHECK] 자동재생: ${currentAutoPlay ? 'ON' : 'OFF'}`);
    //
    //                 if (currentAutoPlay) {
    //                     console.log(`✅ [PLAYBACK_CHECK] 재생 완료 감지 - 다음 곡 실행`);
    //                     isProcessingAutoNext.current = true;
    //                     defaultStorage.set('hymn_was_playing', true);
    //
    //                     setTimeout(() => {
    //                         handleNext();
    //                         setTimeout(() => {
    //                             isProcessingAutoNext.current = false;
    //                         }, 1000);
    //                     }, 300);
    //                 }
    //             }
    //         }
    //     };
    //
    //     checkPlaybackCompletion();
    // }, [isPlaying, handleNext]);

    const checkAndSyncTrack = async () => {
        if (isSyncingTrack.current) {
            console.log('[SYNC] ⚠️ 이미 동기화 중 - 스킵');
            return;
        }

        if (isProcessingAutoNext.current) {
            console.log('[SYNC] ⏭️ 자동 다음곡 처리 중 - 동기화 스킵');
            return;
        }

        if (isAutoNextingRef.current) {
            console.log('[SYNC] ⏭️ 자동 다음곡 이동 중 - 동기화 스킵');
            return;
        }

        isSyncingTrack.current = true;

        try {
            const queue = await TrackPlayer.getQueue();
            console.log(`[SYNC] 큐 길이: ${queue.length}`);

            // ✅ 큐가 비어있으면 새로 시작
            if (queue.length === 0) {
                console.log('[SYNC] 🆕 큐가 비어있음 - 새로 시작');
                await updateTrack();
                isSyncingTrack.current = false;
                return;
            }

            const currentTrack = await TrackPlayer.getActiveTrack();

            // ✅ 활성 트랙이 없으면 새로 시작
            if (!currentTrack) {
                console.log('[SYNC] 🆕 활성 트랙 없음 - 새로 시작');
                await updateTrack();
                isSyncingTrack.current = false;
                return;
            }

            console.log(`[SYNC] 현재 트랙 ID: ${currentTrack.id}, 타입: ${currentTrack.artist}`);

            const trackId = currentTrack.id;
            if (trackId?.startsWith('hymn-')) {
                const parts = trackId.split('-');
                const backgroundHymnId = parseInt(parts[1]);

                console.log(`[SYNC] 트랙 찬송가: ${backgroundHymnId}장, 화면 찬송가: ${hymnId}장`);

                // ✅ 트랙과 화면이 일치하는 경우
                if (backgroundHymnId === hymnId) {
                    const shouldAutoPlay = defaultStorage.getBoolean('hymn_was_playing') ?? false;
                    const trackIsAccompany = currentTrack.artist === '반주';

                    console.log(`🔍 자동재생 플래그: ${shouldAutoPlay ? 'ON' : 'OFF'}`);
                    console.log(`🔍 트랙 반주모드: ${trackIsAccompany ? '반주' : '찬양'}, 화면 반주모드: ${isAccompany ? '반주' : '찬양'}`);

                    const state = await TrackPlayer.getState();
                    console.log(`🔍 현재 플레이어 상태: ${state}`);

                    // ❌ ended 상태 처리 제거 - useTrackPlayerEvents에서 처리

                    if (shouldAutoPlay) {
                        if (state === State.Ready) {
                            console.log('[SYNC] ▶️ Ready 상태 - 즉시 재생');
                            setTimeout(async () => {
                                try {
                                    await TrackPlayer.play();
                                    console.log(`[SYNC] ✅ 자동 재생 실행 (${trackIsAccompany ? '반주' : '찬양'} 모드)`);
                                } catch (error) {
                                    console.error('[SYNC] ❌ 재생 실패:', error);
                                }
                            }, 500);
                        } else if (state === State.None || state === State.Stopped) {
                            console.log('[SYNC] 🔄 트랙 재로드 필요');
                            await updateTrack();
                        }
                    }
                    isSyncingTrack.current = false;
                    return;
                }
                // ✅ 트랙과 화면이 다른 경우 - 화면에 맞게 새로 로드
                else {
                    console.log('[SYNC] ⚠️ 트랙과 화면 불일치 - 화면에 맞게 트랙 업데이트');
                    await updateTrack();
                    isSyncingTrack.current = false;
                    return;
                }
            }

            console.log('[SYNC] 트랙 ID 형식 불일치 - 트랙 업데이트');
            await updateTrack();
        } catch (error) {
            console.error('❌ 트랙 동기화 실패:', error);
        } finally {
            isSyncingTrack.current = false;
        }
    };

    const updateTrack = async () => {
        if (isUpdatingTrack.current) {
            console.log('[UPDATE] ⚠️ 이미 업데이트 중 - 스킵');
            return;
        }

        if (!hymnData || (!hymnData.audio && !hymnData.mraudio)) {
            console.warn('⚠️ 음악 파일 URL이 없습니다.');
            return;
        }

        isUpdatingTrack.current = true;

        try {
            const wasPlaying = isPlaying;
            const shouldAutoPlay = wasPlaying || (defaultStorage.getBoolean('hymn_was_playing') ?? false);

            console.log(`🔄 트랙 업데이트: ${hymnId}장, wasPlaying=${wasPlaying}, shouldAutoPlay=${shouldAutoPlay}`);

            if (wasPlaying) {
                await TrackPlayer.pause();
            }

            await TrackPlayer.reset();

            let trackUrl: string | null = null;
            let trackType: string = '';

            if (isAccompany) {
                trackUrl = hymnData.mraudio;
                trackType = '반주';
                console.log('🎹 반주 모드 활성화');
                if (!trackUrl) {
                    Alert.alert('알림', '반주 파일이 없습니다.');
                    isUpdatingTrack.current = false;
                    return;
                }
            } else {
                trackUrl = hymnData.audio;
                trackType = '찬양';
                console.log('🎤 찬양 모드 활성화');
                if (!trackUrl) {
                    Alert.alert('알림', '찬양 파일이 없습니다.');
                    isUpdatingTrack.current = false;
                    return;
                }
            }

            console.log('🎵 트랙 추가:', {
                id: hymnData.id,
                num: hymnData.num,
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

            if (shouldAutoPlay) {
                setTimeout(async () => {
                    try {
                        await TrackPlayer.play();
                        console.log(`▶ 자동 재생 시작 (${trackType} 모드)`);
                    } catch (error) {
                        console.error('❌ 자동 재생 실패:', error);
                    }
                }, 800);
            }
        } catch (error) {
            console.error('❌ 트랙 추가 실패:', error);
            Alert.alert('재생 실패', '음악 파일을 로드하는데 실패했습니다.');
        } finally {
            isUpdatingTrack.current = false;
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

            let prevId: number;

            if (randomPlay) {
                prevId = Math.floor(Math.random() * 647) + 1;
                console.log(`🎲 랜덤: ${prevId}장`);
            } else if (hymnId > 1) {
                prevId = hymnId - 1;
                console.log(`⬅️ 이전: ${prevId}장`);
            } else {
                console.log('🏁 첫 번째 찬송가');
                setIsProcessingAction(false);
                isNavigatingRef.current = false;
                return;
            }

            // ✅ 반주 모드 상태 유지
            const currentIsAccompany = defaultStorage.getBoolean('hymn_is_accompany') ?? false;
            console.log(`📝 이전 곡 설정: ${prevId}장, 반주모드: ${currentIsAccompany ? '반주' : '찬양'}`);

            navigation.replace('HymnDetailScreen', { hymnId: prevId });
        } catch (error) {
            console.error('❌ 이전 곡 이동 실패:', error);
            isNavigatingRef.current = false;
        } finally {
            setTimeout(() => {
                setIsProcessingAction(false);
            }, 500);
        }
    }, [randomPlay, hymnId, navigation, isProcessingAction]);

    // ✅ 다음곡 핸들러 - 자동재생 상태 유지
    const handleNext = useCallback(async () => {
        if (isProcessingAction) {
            console.log('[NEXT] 이미 처리 중');
            return;
        }

        try {
            setIsProcessingAction(true);
            isNavigatingRef.current = true; // ✅ 네비게이션 시작
            isAutoNextingRef.current = true; // ✅ 자동 다음곡 플래그 설정

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
                isAutoNextingRef.current = false;
                return;
            }

            // ✅ 자동재생 플래그 설정
            defaultStorage.set('hymn_was_playing', true);
            defaultStorage.set('current_hymn_id', nextId);

            // ✅ 반주 모드 상태 유지 (이미 저장되어 있음)
            const currentIsAccompany = defaultStorage.getBoolean('hymn_is_accompany') ?? false;
            console.log(`📝 다음 곡 설정: ${nextId}장, 자동재생 플래그: ON, 반주모드: ${currentIsAccompany ? '반주' : '찬양'}`);

            navigation.replace('HymnDetailScreen', { hymnId: nextId });
        } catch (error) {
            console.error('❌ 다음 곡 이동 실패:', error);
            isNavigatingRef.current = false;
            isAutoNextingRef.current = false;
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

            // ✅ 반주 모드 변경 전 현재 상태 저장
            const wasPlaying = isPlaying;
            const currentPosition = wasPlaying ? await TrackPlayer.getPosition() : 0;

            console.log(`[MODE] 반주모드 변경: ${isAccompany ? '찬양' : '반주'} → ${isAccompanyMode ? '반주' : '찬양'}`);
            console.log(`[MODE] 재생 중: ${wasPlaying}, 위치: ${currentPosition.toFixed(2)}s`);

            setIsAccompany(isAccompanyMode);
            defaultStorage.set("hymn_is_accompany", isAccompanyMode);

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
                    setIsAccompany(false);
                    defaultStorage.set("hymn_is_accompany", false);
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

            console.log(`[MODE] 트랙 추가: ${trackType} - ${trackUrl}`);

            await TrackPlayer.add({
                id: `hymn-${hymnData.id}`,
                url: trackUrl,
                title: `${hymnData.num}장 ${hymnData.title}`,
                artist: trackType,
                artwork: hymnData.image,
            });

            // ✅ 재생 위치 복원
            if (currentPosition > 0) {
                try {
                    await TrackPlayer.seekTo(currentPosition);
                    console.log(`[MODE] 재생 위치 복원: ${currentPosition.toFixed(2)}s`);
                } catch (error) {
                    console.error('[MODE] 재생 위치 복원 실패:', error);
                }
            }

            if (wasPlaying) {
                setTimeout(async () => {
                    try {
                        await TrackPlayer.play();
                        // ✅ 자동재생 플래그 유지
                        defaultStorage.set('hymn_was_playing', true);
                        console.log(`[MODE] ${trackType} 모드로 재생 재개`);
                    } catch (error) {
                        console.error('[MODE] 재생 재개 실패:', error);
                    }
                }, 500);
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
    // ... (스타일은 이전과 동일)
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
        marginTop: -10
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
        marginLeft: -30,
    },
    controlButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
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