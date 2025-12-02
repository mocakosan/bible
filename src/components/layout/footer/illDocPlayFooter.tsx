import { Box, Button, Slider, Text, VStack } from "native-base"
import { useBaseStyle, useNativeNavigation } from "../../../hooks"
import FontAwesomeIcons from "react-native-vector-icons/FontAwesome"
import {forwardRef, memo, useEffect, useImperativeHandle, useRef, useState, useCallback} from "react"
import { BibleStep } from "../../../utils/define"
import {Alert, AppState, BackHandler, Platform, TouchableOpacity} from "react-native"
import { defaultStorage } from "../../../utils/mmkv"
import { useIsFocused, useFocusEffect } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import TrackPlayer, {
    Capability,
    Event,
    State,
    RepeatMode,
    AppKilledPlaybackBehavior,
    useProgress,
    useTrackPlayerEvents,
} from "react-native-track-player"
import { useDispatch, useSelector } from "react-redux"
import { illdocSelectSlice, bibleSelectSlice } from "../../../provider/redux/slice"

export const bibleAudioList = [
    "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut", "1Sa", "2Sa",
    "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh", "Est", "Job", "Psa", "Pro",
    "Ecc", "Son", "Isa", "Jer", "Lam", "Eze", "Dan", "Hos", "Joe", "Amo",
    "Oba", "Jon", "Mic", "Nah", "Hab", "Zep", "Hag", "Zec", "Mal", "Mat",
    "Mar", "Luk", "Joh", "Act", "Rom", "1Co", "2Co", "Gal", "Eph", "Phi",
    "Col", "1Th", "2Th", "1Ti", "2Ti", "Tit", "Phm", "Heb", "Jam", "1Pe",
    "2Pe", "1Jo", "2Jo", "3Jo", "Jud", "Rev"
]

interface IllDocPlayFooterHandlers {
    playCurrentPageAudio: () => Promise<void>;
}

interface Props {
    onTrigger: () => void;
    openSound: boolean;
}

let isPlayerGloballyInitialized = false;

// 플레이어 설정 초기화 함수
const setupPlayer = async () => {
    try {
        if (isPlayerGloballyInitialized) {
            console.log("Player already globally initialized, skipping setup");
            return true;
        }

        let isSetup = false;
        try {
            isSetup = await TrackPlayer.isServiceRunning();
        } catch (error) {
            isSetup = false;
        }

        if (!isSetup) {
            await TrackPlayer.setupPlayer({
                autoHandleInterruptions: false,
                waitForBuffer: true,
            });

            await TrackPlayer.updateOptions({
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.Stop,
                    Capability.SeekTo,
                ],
                compactCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                ],
                repeatMode: RepeatMode.Off,
                android: {
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                    alwaysPauseOnInterruption: true,
                    stoppingAppPausesPlayback: true,
                },
                notification: {
                    channel: {
                        id: 'bible-audio',
                        name: '성경 오디오',
                        importance: 'high',
                    },
                    stopWithApp: true,
                }
            });

            await TrackPlayer.setRepeatMode(RepeatMode.Off);
        }

        isPlayerGloballyInitialized = true;
        defaultStorage.set("is_illdoc_player", true);

        console.log("TrackPlayer initialized successfully and set globally");
        return true;
    } catch (error) {
        console.error("Failed to setup player:", error);
        return false;
    }
};

const IllDocPlayFooterLayout = forwardRef<IllDocPlayFooterHandlers, Props>(
    ({ onTrigger, openSound }, ref) => {
        const { color } = useBaseStyle();
        const dispatch = useDispatch();
        const insets = useSafeAreaInsets();

        const BOOK = defaultStorage.getNumber("bible_book_connec") ??
            defaultStorage.getNumber("bible_book") ?? 1;
        const JANG = defaultStorage.getNumber("bible_jang_connec") ??
            defaultStorage.getNumber("bible_jang") ?? 1;

        const [isPlaying, setIsPlaying] = useState(false);
        const [isPlayerReady, setIsPlayerReady] = useState(false);
        const [soundSpeed, setSoundSpeed] = useState(1);
        const [autoPlay, setAutoPlay] = useState<boolean>(false);
        const [isProcessingAction, setIsProcessingAction] = useState(false);

        const isMountedRef = useRef(true);
        const timerRefs = useRef<Set<NodeJS.Timeout>>(new Set());

        const prevBookRef = useRef(BOOK);
        const prevJangRef = useRef(JANG);
        const savedTrackInfoRef = useRef(null);
        const trackPositionRef = useRef(0);

        const { navigation } = useNativeNavigation();
        const isFocused = useIsFocused();
        const progress = useProgress();
        const appStateRef = useRef(AppState.currentState);

        const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
            if (!isMountedRef.current) {
                console.log("Component is unmounted, skipping timer");
                return null;
            }

            const timer = setTimeout(() => {
                if (isMountedRef.current) {
                    callback();
                }
                timerRefs.current.delete(timer);
            }, delay);

            timerRefs.current.add(timer);
            return timer;
        }, []);

        const clearAllTimers = useCallback(() => {
            timerRefs.current.forEach(timer => {
                clearTimeout(timer);
            });
            timerRefs.current.clear();
        }, []);

        const syncBibleState = useCallback((book, jang) => {
            if (!isMountedRef.current) return;

            console.log(`[ILLDOC_SYNC] 상태 동기화: ${book}권 ${jang}장`);

            // ⭐ 성경일독은 _connec 키를 우선적으로 설정
            defaultStorage.set("bible_book_connec", book);
            defaultStorage.set("bible_jang_connec", jang);
            defaultStorage.set("bible_book", book);
            defaultStorage.set("bible_jang", jang);
            defaultStorage.set("last_audio_book", book);
            defaultStorage.set("last_audio_jang", jang);
            defaultStorage.set("is_illdoc_player", true);

            console.log(`[ILLDOC_SYNC] 저장소 확인:`, {
                bible_book_connec: defaultStorage.getNumber("bible_book_connec"),
                bible_jang_connec: defaultStorage.getNumber("bible_jang_connec"),
                is_illdoc_player: defaultStorage.getBoolean("is_illdoc_player")
            });

            try {
                dispatch(
                    bibleSelectSlice.actions.changePage({
                        book: book,
                        jang: jang,
                    })
                );

                dispatch(
                    illdocSelectSlice.actions.changePage({
                        book: book,
                        jang: jang,
                    })
                );
            } catch (error) {
                console.error("Redux 상태 업데이트 오류:", error);
            }

            prevBookRef.current = book;
            prevJangRef.current = jang;
        }, [dispatch]);

        const soundUrl = useCallback((book: number, jang: number) => {
            const baseUrl = process.env.AUDIO_BASE_URL || 'https://your-audio-url.com/';
            const url = `${baseUrl}${
                bibleAudioList[book - 1]
            }${String(jang).padStart(3, "0")}.mp3`;
            console.log("Audio URL:", url);
            return url;
        }, []);

        useImperativeHandle(ref, () => ({
            playCurrentPageAudio: async () => {
                if (!isMountedRef.current) {
                    console.log("컴포넌트가 언마운트된 상태입니다");
                    return;
                }

                if (!isPlayerReady || !openSound) {
                    console.log("오디오 플레이어가 준비되지 않았거나 소리가 꺼져 있습니다");
                    return;
                }

                if (isProcessingAction) {
                    console.log("이미 다른 오디오 작업 처리 중입니다");
                    return;
                }

                try {
                    setIsProcessingAction(true);

                    const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    console.log(`현재 페이지 오디오 재생: ${currentBook}권 ${currentJang}장`);

                    defaultStorage.set("last_playing_audio", true);
                    defaultStorage.set("last_audio_book", currentBook);
                    defaultStorage.set("last_audio_jang", currentJang);
                    defaultStorage.set("last_audio_speed", soundSpeed);
                    defaultStorage.set("is_illdoc_player", true);

                    await TrackPlayer.reset();

                    const newTrack = {
                        id: "bible",
                        url: soundUrl(currentBook, currentJang),
                        title: `${BibleStep[currentBook - 1]?.name || ''} ${currentJang}장`,
                        artist: "성경",
                        artwork: require('../../../assets/img/bibile25.png'),
                    };

                    await TrackPlayer.add([newTrack]);

                    savedTrackInfoRef.current = newTrack;
                    trackPositionRef.current = 0;

                    if (soundSpeed !== 1) {
                        await TrackPlayer.setRate(soundSpeed);
                    }

                    await TrackPlayer.setRepeatMode(RepeatMode.Off);
                    await TrackPlayer.play();

                    if (isMountedRef.current) {
                        setIsPlaying(true);
                        syncBibleState(currentBook, currentJang);
                    }

                    return true;
                } catch (error) {
                    console.error("재생 실패:", error);
                    return false;
                } finally {
                    safeSetTimeout(() => {
                        if (isMountedRef.current) {
                            setIsProcessingAction(false);
                        }
                    }, 1000);
                }
            }
        }), [isPlayerReady, openSound, isProcessingAction, BOOK, JANG, soundSpeed, soundUrl, syncBibleState, safeSetTimeout]);

        useTrackPlayerEvents([
            Event.PlaybackQueueEnded,
            Event.PlaybackState,
        ], async (event) => {
            if (!isMountedRef.current) return;

            console.log("[ILLDOC_EVENT] TrackPlayer Event:", event.type);

            if (event.type === Event.PlaybackQueueEnded) {
                if (AppState.currentState !== "active") {
                    console.log("[ILLDOC_EVENT] ℹ️ 백그라운드 상태 - PlaybackService에서 처리");
                    // ⭐ 백그라운드에서 큐가 끝났을 때 is_illdoc_player 플래그 재확인
                    defaultStorage.set("is_illdoc_player", true);
                    return;
                }
                console.log("[ILLDOC_EVENT] Playback queue ended in foreground");
                if (isMountedRef.current) {
                    setIsPlaying(false);
                }

            } else if (event.type === Event.PlaybackState) {
                const state = event.state;
                console.log("[ILLDOC_EVENT] Playback state changed:", state);

                if (state === State.Playing) {
                    if (isMountedRef.current) {
                        setIsPlaying(true);
                    }
                    try {
                        const queue = await TrackPlayer.getQueue();
                        if (queue.length > 0) {
                            savedTrackInfoRef.current = queue[0];
                            trackPositionRef.current = await TrackPlayer.getPosition();
                            console.log('[ILLDOC_EVENT] Saved track info at position:', trackPositionRef.current);
                        }
                        await TrackPlayer.setRepeatMode(RepeatMode.Off);
                    } catch (error) {
                        console.error('[ILLDOC_EVENT] Error saving track info:', error);
                    }
                } else if (state === State.Paused || state === State.Stopped) {
                    if (isMountedRef.current) {
                        setIsPlaying(false);
                    }
                }
            }
        });

        useFocusEffect(
            useCallback(() => {
                if (!isMountedRef.current) return;

                console.log("[ILLDOC_FOCUS] Screen focused");

                // ⭐ 화면 포커스 시 항상 is_illdoc_player 플래그 설정
                defaultStorage.set("is_illdoc_player", true);

                if (isPlayerReady) {
                    const storedBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const storedJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    if (storedBook !== BOOK || storedJang !== JANG) {
                        console.log(`[ILLDOC_FOCUS] 상태 불일치: ${BOOK}:${JANG} → ${storedBook}:${storedJang}`);
                        syncBibleState(storedBook, storedJang);
                    }
                }

                return () => {
                    const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    defaultStorage.set("bible_book", currentBook);
                    defaultStorage.set("bible_jang", currentJang);
                    defaultStorage.set("bible_book_connec", currentBook);
                    defaultStorage.set("bible_jang_connec", currentJang);
                };
            }, [BOOK, JANG, isPlayerReady, syncBibleState])
        );

        useEffect(() => {
            isMountedRef.current = true;

            const initializePlayer = async () => {
                try {
                    const isSetup = await setupPlayer();

                    if (isMountedRef.current && isSetup) {
                        setIsPlayerReady(true);

                        if (!isPlayerGloballyInitialized) {
                            await TrackPlayer.setRepeatMode(RepeatMode.Off);
                        }

                        const savedSpeed = defaultStorage.getNumber("last_audio_speed") ?? 1;
                        if (savedSpeed !== 1) {
                            setSoundSpeed(savedSpeed);
                            await TrackPlayer.setRate(savedSpeed);
                        }

                        // ⭐ 초기화 시 is_illdoc_player 플래그 설정
                        defaultStorage.set("is_illdoc_player", true);

                        console.log("[ILLDOC_INIT] Player is ready");

                        const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                            defaultStorage.getNumber("bible_book") ?? BOOK;
                        const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                            defaultStorage.getNumber("bible_jang") ?? JANG;

                        prevBookRef.current = currentBook;
                        prevJangRef.current = currentJang;
                    }
                } catch (error) {
                    console.error("[ILLDOC_INIT] Error initializing player:", error);
                }
            };

            initializePlayer();

            return () => {
                isMountedRef.current = false;
                clearAllTimers();
                TrackPlayer.pause().catch(error => {
                    console.error("Error pausing on unmount:", error);
                });
            };
        }, [navigation, BOOK, JANG, clearAllTimers]);

        // ⭐⭐⭐ 앱 상태 변경 감지 - 백그라운드 진입 시 상태 강화 ⭐⭐⭐
        useEffect(() => {
            const subscription = AppState.addEventListener("change", async (nextAppState) => {
                if (!isMountedRef.current) return;

                console.log(`[ILLDOC_APP_STATE] App state: ${appStateRef.current} → ${nextAppState}`);

                if (appStateRef.current === 'active' &&
                    (nextAppState === 'background' || nextAppState === 'inactive')) {
                    console.log('[ILLDOC_APP_STATE] ⬇️ App moved to background');

                    try {
                        // ⭐ 백그라운드 진입 시 현재 재생 중인 트랙 정보 저장
                        const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                            defaultStorage.getNumber("bible_book") ?? BOOK;
                        const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                            defaultStorage.getNumber("bible_jang") ?? JANG;

                        console.log(`[ILLDOC_APP_STATE] 현재 재생 중: ${currentBook}권 ${currentJang}장`);

                        // ⭐ 백그라운드 진입 시 명확하게 플래그 설정
                        defaultStorage.set("is_illdoc_player", true);
                        defaultStorage.set("bible_book_connec", currentBook);
                        defaultStorage.set("bible_jang_connec", currentJang);
                        defaultStorage.set("bible_book", currentBook);
                        defaultStorage.set("bible_jang", currentJang);

                        // 재생 위치 저장
                        const currentPosition = await TrackPlayer.getPosition();
                        const playerState = await TrackPlayer.getState();

                        console.log(`[ILLDOC_APP_STATE] 재생 위치: ${currentPosition}s, 상태: ${playerState}`);

                        defaultStorage.set("last_illdoc_audio_position", currentPosition);
                        defaultStorage.set("illdoc_was_playing_before_background", playerState === State.Playing);

                        await TrackPlayer.setRepeatMode(RepeatMode.Off);
                        await TrackPlayer.updateOptions({
                            android: {
                                appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                            },
                            notification: {
                                stopWithApp: true,
                            }
                        });

                        console.log("[ILLDOC_APP_STATE] ✅ 백그라운드 설정 완료");

                        // ⭐ 백그라운드 진입 후 플래그 재확인 (약간의 지연 후)
                        setTimeout(() => {
                            const isStillIlldoc = defaultStorage.getBoolean("is_illdoc_player");
                            console.log(`[ILLDOC_APP_STATE] 플래그 재확인: is_illdoc_player = ${isStillIlldoc}`);
                            if (!isStillIlldoc) {
                                console.warn("[ILLDOC_APP_STATE] ⚠️ 플래그가 변경됨! 재설정");
                                defaultStorage.set("is_illdoc_player", true);
                            }
                        }, 500);

                    } catch (error) {
                        console.error("[ILLDOC_APP_STATE] Error on background:", error);
                    }
                }

                if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                    console.log("[ILLDOC_APP_STATE] ⬆️ App returned to foreground");

                    try {
                        // ⭐ 포그라운드 복귀 시에도 플래그 재설정
                        defaultStorage.set("is_illdoc_player", true);

                        const wasPlaying = defaultStorage.getBoolean("illdoc_was_playing_before_background") ?? false;
                        const lastPosition = defaultStorage.getNumber("last_illdoc_audio_position") ?? 0;

                        console.log(`[ILLDOC_APP_STATE] 복귀 - 이전 재생: ${wasPlaying}, 위치: ${lastPosition}s`);

                        if (wasPlaying && isPlayerReady) {
                            const currentPosition = await TrackPlayer.getPosition();
                            const currentState = await TrackPlayer.getState();

                            console.log(`[ILLDOC_APP_STATE] 현재 위치: ${currentPosition}s, 상태: ${currentState}`);

                            if (currentState === State.Playing) {
                                console.log("[ILLDOC_APP_STATE] 백그라운드에서 계속 재생 중 - UI 동기화");
                                if (isMountedRef.current) {
                                    setIsPlaying(true);
                                }
                            } else if (currentState === State.Paused) {
                                if (lastPosition > 0) {
                                    console.log(`[ILLDOC_APP_STATE] 위치 복원: ${lastPosition}s`);
                                    await TrackPlayer.seekTo(lastPosition);
                                }
                                if (isMountedRef.current) {
                                    setIsPlaying(false);
                                }
                            }
                        }

                        defaultStorage.delete("illdoc_was_playing_before_background");

                    } catch (error) {
                        console.error("[ILLDOC_APP_STATE] Error on foreground:", error);
                    }
                }

                appStateRef.current = nextAppState;
            });

            return () => {
                subscription.remove();
            };
        }, [isPlayerReady, BOOK, JANG]);

        useEffect(() => {
            if (!isPlayerReady || !isMountedRef.current) return;

            if (BOOK !== prevBookRef.current || JANG !== prevJangRef.current) {
                console.log(`[ILLDOC_CHANGE] Book/Chapter changed: ${prevBookRef.current}:${prevJangRef.current} → ${BOOK}:${JANG}`);

                prevBookRef.current = BOOK;
                prevJangRef.current = JANG;
                setAutoPlay(true);
            }
        }, [BOOK, JANG, isPlayerReady]);

        useEffect(() => {
            if (!isPlayerReady || !autoPlay || !openSound || !isMountedRef.current) {
                return;
            }

            const loadAndPlayTrack = async () => {
                if (isProcessingAction || !isMountedRef.current) {
                    setAutoPlay(false);
                    return;
                }

                try {
                    console.log("[ILLDOC_AUTO_PLAY] === 자동 재생 시작 ===");
                    setIsProcessingAction(true);

                    const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    console.log(`[ILLDOC_AUTO_PLAY] 재생 대상: ${currentBook}권 ${currentJang}장`);

                    defaultStorage.set("last_playing_audio", true);
                    defaultStorage.set("last_audio_book", currentBook);
                    defaultStorage.set("last_audio_jang", currentJang);
                    defaultStorage.set("last_audio_speed", soundSpeed);
                    defaultStorage.set("is_illdoc_player", true);

                    await TrackPlayer.reset();

                    const newTrack = {
                        id: "bible",
                        url: soundUrl(currentBook, currentJang),
                        title: `${BibleStep[currentBook - 1]?.name || ''} ${currentJang}장`,
                        artist: "성경",
                        artwork: require('../../../assets/img/bibile25.png'),
                    };

                    await TrackPlayer.add([newTrack]);

                    savedTrackInfoRef.current = newTrack;
                    trackPositionRef.current = 0;

                    if (soundSpeed !== 1) {
                        await TrackPlayer.setRate(soundSpeed);
                    }

                    await TrackPlayer.setRepeatMode(RepeatMode.Off);
                    await TrackPlayer.play();

                    if (isMountedRef.current) {
                        setIsPlaying(true);
                        syncBibleState(currentBook, currentJang);
                    }

                    console.log("[ILLDOC_AUTO_PLAY] ✅ 자동 재생 완료");
                } catch (error) {
                    console.error("[ILLDOC_AUTO_PLAY] ❌ 자동 재생 실패:", error);
                } finally {
                    setAutoPlay(false);
                    safeSetTimeout(() => {
                        if (isMountedRef.current) {
                            setIsProcessingAction(false);
                        }
                    }, 1500);
                }
            };

            loadAndPlayTrack();
        }, [BOOK, JANG, autoPlay, isPlayerReady, soundSpeed, openSound, soundUrl, syncBibleState, isProcessingAction, safeSetTimeout]);

        const changeBasuk = useCallback(async (baesok: number) => {
            if (!isMountedRef.current) return;

            let newSpeed = 1;
            if (baesok === 1) {
                newSpeed = 1.2;
            } else if (baesok === 1.2) {
                newSpeed = 1.5;
            } else if (baesok === 1.5) {
                newSpeed = 1;
            }

            try {
                await TrackPlayer.setRate(newSpeed);
                if (isMountedRef.current) {
                    setSoundSpeed(newSpeed);
                }
                defaultStorage.set("last_audio_speed", newSpeed);
            } catch (error) {
                console.error("Failed to set playback rate:", error);
            }
        }, []);

        const getBaeSokName = useCallback((): string => {
            switch (soundSpeed) {
                case 1: return "1";
                case 1.2: return "2";
                case 1.5: return "4";
                default: return "1";
            }
        }, [soundSpeed]);

        const onPressforward = useCallback(async (jang: number) => {
            if (isProcessingAction || !isMountedRef.current) {
                return;
            }

            try {
                setIsProcessingAction(true);

                const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                    defaultStorage.getNumber("bible_book") ?? BOOK;
                const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                    defaultStorage.getNumber("bible_jang") ?? JANG;

                const curJang = jang - 1;

                let nextBook = currentBook;
                let nextJang = curJang;

                if (curJang === 0) {
                    if (currentBook > 1) {
                        nextBook = currentBook - 1;
                        nextJang = BibleStep[nextBook - 1]?.count || 1;
                    } else {
                        safeSetTimeout(() => {
                            if (isMountedRef.current) {
                                setIsProcessingAction(false);
                            }
                        }, 500);
                        return;
                    }
                }

                console.log(`[ILLDOC_NAV] 이전 장: ${nextBook}권 ${nextJang}장`);

                defaultStorage.set("is_illdoc_player", true);
                syncBibleState(nextBook, nextJang);
                onTrigger();
                if (isMountedRef.current) {
                    setAutoPlay(true);
                    setIsPlaying(false);
                }
            } catch (error) {
                console.error("이전 장 이동 오류:", error);
            } finally {
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 1000);
            }
        }, [BOOK, JANG, syncBibleState, onTrigger, safeSetTimeout, isProcessingAction]);

        const onPressNext = useCallback((jang: number) => {
            if (isProcessingAction || !isMountedRef.current) {
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 2000);
                return;
            }

            try {
                setIsProcessingAction(true);

                const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                    defaultStorage.getNumber("bible_book") ?? BOOK;
                const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                    defaultStorage.getNumber("bible_jang") ?? JANG;

                const curJang = jang + 1;
                const totalJang = BibleStep[currentBook - 1]?.count || 1;

                let nextBook = currentBook;
                let nextJang = curJang;

                if (curJang > totalJang) {
                    if (currentBook === 66) {
                        setIsProcessingAction(false);
                        return;
                    } else {
                        nextBook = currentBook + 1;
                        nextJang = 1;
                    }
                }

                console.log(`[ILLDOC_NAV] 다음 장: ${nextBook}권 ${nextJang}장`);

                defaultStorage.set("is_illdoc_player", true);
                syncBibleState(nextBook, nextJang);
                onTrigger();

                if (isMountedRef.current) {
                    setAutoPlay(true);
                    setIsPlaying(false);
                }

                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 100);

            } catch (error) {
                console.error("다음 장 이동 오류:", error);
                if (isMountedRef.current) {
                    setIsProcessingAction(false);
                }
            }
        }, [BOOK, JANG, syncBibleState, onTrigger, isProcessingAction, safeSetTimeout]);

        const onSliderValueChanged = useCallback(async (value: any) => {
            if (!isMountedRef.current) return;

            try {
                await TrackPlayer.seekTo(value);
            } catch (error) {
                console.error("Failed to seek:", error);
            }
        }, []);

        const onPlaySwitch = useCallback(async () => {
            if (!isPlayerReady || !isMountedRef.current) {
                return;
            }

            if (isProcessingAction) {
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 500);
                return;
            }

            try {
                setIsProcessingAction(true);

                const playerState = await TrackPlayer.getState();
                const isCurrentlyPlaying = playerState === State.Playing;

                if (isCurrentlyPlaying) {
                    await TrackPlayer.pause();
                    setIsProcessingAction(false);
                    return;
                } else {
                    const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    defaultStorage.set("is_illdoc_player", true);

                    const queue = await TrackPlayer.getQueue();

                    const needNewTrack = queue.length === 0 ||
                        (queue.length > 0 &&
                            queue[0].url !== soundUrl(currentBook, currentJang));

                    if (needNewTrack) {
                        await TrackPlayer.reset();

                        await TrackPlayer.add({
                            id: "bible",
                            url: soundUrl(currentBook, currentJang),
                            title: `${BibleStep[currentBook - 1]?.name || ''} ${currentJang}장`,
                            artist: "성경",
                            artwork: require('../../../assets/img/bibile25.png'),
                        });

                        if (soundSpeed !== 1) {
                            await TrackPlayer.setRate(soundSpeed);
                        }

                        await TrackPlayer.setRepeatMode(RepeatMode.Off);
                    }

                    await TrackPlayer.play();

                    if (isMountedRef.current) {
                        syncBibleState(currentBook, currentJang);
                        setIsPlaying(true);
                    }
                }
            } catch (error) {
                console.error("Play switch error:", error);
                Alert.alert(
                    '재생 오류',
                    '오디오를 재생하는 동안 문제가 발생했습니다. 다시 시도해주세요.'
                );
            } finally {
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 300);
            }
        }, [isPlayerReady, isPlaying, soundSpeed, syncBibleState, BOOK, JANG, soundUrl, isProcessingAction, safeSetTimeout]);

        const containerPaddingBottom = Platform.select({
            ios: insets.bottom,
            android: insets.bottom > 0 ? insets.bottom : 0,
            default: 0,
        });

        return (
            <>
                <Box
                    bg={"white"}
                    width="100%"
                    height={85 + containerPaddingBottom}
                    paddingBottom={`${containerPaddingBottom}px`}
                    alignSelf="center"
                    display={openSound ? "flex" : "none"}
                >
                    <VStack>
                        <Slider
                            w="100%"
                            value={progress?.position}
                            minValue={0}
                            maxValue={progress?.buffered || progress?.duration || 0}
                            accessibilityLabel="sound"
                            onChange={onSliderValueChanged}
                            step={1}
                        >
                            <Slider.Track>
                                <Slider.FilledTrack bg={color.bible} />
                            </Slider.Track>
                        </Slider>
                        <Box
                            flexDirection={"row"}
                            justifyContent={"space-around"}
                            w={"100%"}
                        >
                            <Button
                                variant={"bibleoutlined"}
                                padding={1.4}
                                marginTop={2}
                                width={"50"}
                                textAlign={"center"}
                                height={7}
                                onPress={() => changeBasuk(soundSpeed)}
                            >
                                <Text
                                    color={color.bible}
                                    fontSize={12}
                                    fontWeight={700}
                                >
                                    {getBaeSokName()} 배속
                                </Text>
                            </Button>

                            <TouchableOpacity
                                style={{ marginTop: 10 }}
                                onPress={() => onPressforward(JANG)}
                            >
                                <FontAwesomeIcons
                                    name="step-backward"
                                    size={30}
                                    color={color.bible}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onPlaySwitch}>
                                <FontAwesomeIcons
                                    name={
                                        isPlaying ? "pause-circle" : "play-circle"
                                    }
                                    style={{ marginTop: 5 }}
                                    size={40}
                                    color={color.bible}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ marginTop: 10 }}
                                onPress={() => onPressNext(JANG)}
                            >
                                <FontAwesomeIcons
                                    name="step-forward"
                                    size={30}
                                    color={color.bible}
                                />
                            </TouchableOpacity>

                            <Box width={"50"} height={8} marginTop={2} />
                        </Box>
                    </VStack>
                </Box>
            </>
        )
    }
);

export default memo(IllDocPlayFooterLayout);