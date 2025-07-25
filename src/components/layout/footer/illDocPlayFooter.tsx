import { Box, Button, Slider, Text, VStack } from "native-base"
import { useBaseStyle, useNativeNavigation } from "../../../hooks"
import FontAwesomeIcons from "react-native-vector-icons/FontAwesome"
import {forwardRef, memo, useEffect, useImperativeHandle, useRef, useState, useCallback} from "react"
import { BibleStep } from "../../../utils/define"
import {Alert, AppState, BackHandler, Platform, TouchableOpacity} from "react-native"
import { defaultStorage } from "../../../utils/mmkv"
import { useIsFocused, useFocusEffect } from "@react-navigation/native"
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

        const BOOK = defaultStorage.getNumber("bible_book_connec") ??
            defaultStorage.getNumber("bible_book") ?? 1;
        const JANG = defaultStorage.getNumber("bible_jang_connec") ??
            defaultStorage.getNumber("bible_jang") ?? 1;

        const [isPlaying, setIsPlaying] = useState(false);
        const [isPlayerReady, setIsPlayerReady] = useState(false);
        const [soundSpeed, setSoundSpeed] = useState(1);
        const [autoPlay, setAutoPlay] = useState<boolean>(false);
        const [isProcessingAction, setIsProcessingAction] = useState(false);

        // 컴포넌트 마운트 여부를 추적하는 ref 추가
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

        // 안전한 타이머 설정 함수
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

        // 모든 타이머 정리 함수
        const clearAllTimers = useCallback(() => {
            timerRefs.current.forEach(timer => {
                clearTimeout(timer);
            });
            timerRefs.current.clear();
        }, []);

        // 통합 상태 동기화 함수
        const syncBibleState = useCallback((book, jang) => {
            if (!isMountedRef.current) return;

            console.log(`syncBibleState: ${book}권 ${jang}장으로 상태 동기화`);

            defaultStorage.set("bible_book", book);
            defaultStorage.set("bible_jang", jang);
            defaultStorage.set("bible_book_connec", book);
            defaultStorage.set("bible_jang_connec", jang);
            defaultStorage.set("last_audio_book", book);
            defaultStorage.set("last_audio_jang", jang);
            defaultStorage.set("is_illdoc_player", true);

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

        // 음원 URL 생성 함수
        const soundUrl = useCallback((book: number, jang: number) => {
            const baseUrl = process.env.AUDIO_BASE_URL || 'https://your-audio-url.com/';
            const url = `${baseUrl}${
                bibleAudioList[book - 1]
            }${String(jang).padStart(3, "0")}.mp3`;
            console.log("Audio URL:", url);
            return url;
        }, []);

        // 외부에서 접근 가능한 함수들 정의 - 안전성 검사 추가
        useImperativeHandle(ref, () => ({
            playCurrentPageAudio: async () => {
                // 컴포넌트 마운트 상태 확인
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

        // TrackPlayer 이벤트 리스너 - 자동 진행은 항상 활성화
        useTrackPlayerEvents([
            Event.PlaybackQueueEnded,
            Event.PlaybackState,
        ], async (event) => {
            if (!isMountedRef.current) return;

            console.log("IllDoc TrackPlayer Event:", event.type);

            if (event.type === Event.PlaybackQueueEnded) {
                console.log("IllDoc: Playback queue ended - auto progress always enabled");
                if (isMountedRef.current) {
                    setIsPlaying(false);
                }
                console.log("IllDoc: Auto progress will be handled by parent component");

            } else if (event.type === Event.PlaybackState) {
                const state = event.state;
                console.log("IllDoc: Playback state changed:", state);

                if (state === State.Playing) {
                    if (isMountedRef.current) {
                        setIsPlaying(true);
                    }
                    try {
                        const queue = await TrackPlayer.getQueue();
                        if (queue.length > 0) {
                            savedTrackInfoRef.current = queue[0];
                            trackPositionRef.current = await TrackPlayer.getPosition();
                            console.log('IllDoc: Saved current track info at position:', trackPositionRef.current);
                        }
                        await TrackPlayer.setRepeatMode(RepeatMode.Off);
                    } catch (error) {
                        console.error('IllDoc: Error saving track info:', error);
                    }
                } else if (state === State.Paused || state === State.Stopped) {
                    if (isMountedRef.current) {
                        setIsPlaying(false);
                    }
                    if (state === State.Stopped && !isProcessingAction && savedTrackInfoRef.current) {
                        console.log('IllDoc: Detected stopped state - saving position:', trackPositionRef.current);
                    }
                } else if (state === 'ended') {
                    console.log("IllDoc: Playback ended detected");
                    if (isMountedRef.current) {
                        setIsPlaying(false);
                    }
                }
            }
        });

        // 화면 포커스 변경 감지 및 상태 동기화
        useFocusEffect(
            useCallback(() => {
                if (!isMountedRef.current) return;

                console.log("Screen focused:", isFocused);

                defaultStorage.set("is_illdoc_player", true);

                if (isPlayerReady) {
                    const storedBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const storedJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    if (storedBook !== BOOK || storedJang !== JANG) {
                        console.log(`화면 포커스 시 상태 불일치 감지: ${BOOK}:${JANG} → ${storedBook}:${storedJang}`);
                        syncBibleState(storedBook, storedJang);
                    }
                }

                return () => {
                    console.log("Screen unfocused, pausing player");

                    TrackPlayer.pause().catch(error => {
                        console.error("Error pausing on unfocus:", error);
                    });

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

        // 컴포넌트 마운트 시 TrackPlayer 설정
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

                        defaultStorage.set("is_illdoc_player", true);

                        console.log("Player is ready");

                        const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                            defaultStorage.getNumber("bible_book") ?? BOOK;
                        const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                            defaultStorage.getNumber("bible_jang") ?? JANG;

                        prevBookRef.current = currentBook;
                        prevJangRef.current = currentJang;
                    }
                } catch (error) {
                    console.error("Error initializing player:", error);
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

        // 앱 상태 변경 감지
        useEffect(() => {
            const subscription = AppState.addEventListener("change", async (nextAppState) => {
                if (!isMountedRef.current) return;

                console.log("App state changed from", appStateRef.current, "to", nextAppState);

                if (appStateRef.current === 'active' &&
                    (nextAppState === 'background' || nextAppState === 'inactive')) {
                    console.log('App moved to background');

                    try {
                        defaultStorage.set("is_illdoc_player", true);
                        await TrackPlayer.setRepeatMode(RepeatMode.Off);
                        await TrackPlayer.updateOptions({
                            android: {
                                appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                            },
                            notification: {
                                stopWithApp: true,
                            }
                        });
                        console.log("Kill behavior set on background transition");
                    } catch (error) {
                        console.error("Error setting options on background:", error);
                    }
                }

                if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                    console.log("App returned to foreground");
                    defaultStorage.set("is_illdoc_player", true);
                }

                appStateRef.current = nextAppState;
            });

            return () => {
                subscription.remove();
            };
        }, []);

        // 책/장 변경 감지 및 자동 재생 처리
        useEffect(() => {
            if (!isPlayerReady || !isMountedRef.current) return;

            if (BOOK !== prevBookRef.current || JANG !== prevJangRef.current) {
                console.log(`Book or chapter changed: ${prevBookRef.current}:${prevJangRef.current} → ${BOOK}:${JANG}`);

                prevBookRef.current = BOOK;
                prevJangRef.current = JANG;
                setAutoPlay(true);
            }
        }, [BOOK, JANG, isPlayerReady]);

        // 자동 재생 처리
        useEffect(() => {
            if (!isPlayerReady || !autoPlay || !openSound || !isMountedRef.current) {
                console.log("🚫 Auto play skipped - Ready:", isPlayerReady, "AutoPlay:", autoPlay, "Sound:", openSound, "Mounted:", isMountedRef.current);
                return;
            }

            const loadAndPlayTrack = async () => {
                if (isProcessingAction || !isMountedRef.current) {
                    console.log("⚠️ Auto play skipped - already processing or unmounted");
                    setAutoPlay(false);
                    return;
                }

                try {
                    console.log("🎵 === AUTO PLAY STARTING ===");
                    setIsProcessingAction(true);

                    const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    console.log(`🎶 Auto play for: ${currentBook}권 ${currentJang}장`);

                    defaultStorage.set("last_playing_audio", true);
                    defaultStorage.set("last_audio_book", currentBook);
                    defaultStorage.set("last_audio_jang", currentJang);
                    defaultStorage.set("last_audio_speed", soundSpeed);
                    defaultStorage.set("is_illdoc_player", true);

                    console.log("🔄 Resetting track player queue");
                    await TrackPlayer.reset();

                    const newTrack = {
                        id: "bible",
                        url: soundUrl(currentBook, currentJang),
                        title: `${BibleStep[currentBook - 1]?.name || ''} ${currentJang}장`,
                        artist: "성경",
                        artwork: require('../../../assets/img/bibile25.png'),
                    };

                    console.log("🎵 Adding new track:", newTrack.title, newTrack.url);
                    await TrackPlayer.add([newTrack]);

                    savedTrackInfoRef.current = newTrack;
                    trackPositionRef.current = 0;

                    if (soundSpeed !== 1) {
                        console.log("⚡ Setting playback rate to:", soundSpeed);
                        await TrackPlayer.setRate(soundSpeed);
                    }

                    await TrackPlayer.setRepeatMode(RepeatMode.Off);

                    console.log("▶️ Starting playback");
                    await TrackPlayer.play();

                    if (isMountedRef.current) {
                        setIsPlaying(true);
                        console.log("🔄 Syncing state after auto play");
                        syncBibleState(currentBook, currentJang);
                    }

                    console.log("✅ Auto play completed successfully");
                } catch (error) {
                    console.error("❌ 자동 재생 실패:", error);
                } finally {
                    setAutoPlay(false);
                    safeSetTimeout(() => {
                        if (isMountedRef.current) {
                            console.log("🏁 Resetting processing flag after auto play");
                            setIsProcessingAction(false);
                        }
                    }, 1500);
                }
            };

            loadAndPlayTrack();
        }, [BOOK, JANG, autoPlay, isPlayerReady, soundSpeed, openSound, soundUrl, syncBibleState, isProcessingAction, safeSetTimeout]);

        // 재생 속도 변경
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

        // 속도 표시 이름 가져오기
        const getBaeSokName = useCallback((): string => {
            switch (soundSpeed) {
                case 1: return "1";
                case 1.2: return "2";
                case 1.5: return "4";
                default: return "1";
            }
        }, [soundSpeed]);

        // 이전 장으로 이동
        const onPressforward = useCallback(async (jang: number) => {
            if (isProcessingAction || !isMountedRef.current) {
                console.log("이미 처리 중인 작업이 있거나 컴포넌트가 언마운트됨");
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

                console.log(`이전 장으로 이동: ${nextBook}권 ${nextJang}장`);

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
        }, [BOOK, JANG, syncBibleState, onTrigger, safeSetTimeout]);

        // 다음 장으로 이동
        const onPressNext = useCallback((jang: number) => {
            console.log("🎯 === IllDoc onPressNext CALLED ===");
            console.log("IllDoc Input jang:", jang, "Current BOOK:", BOOK, "Current JANG:", JANG);
            console.log("IllDoc Is processing:", isProcessingAction, "Is mounted:", isMountedRef.current);

            if (isProcessingAction || !isMountedRef.current) {
                console.log("⚠️ IllDoc: Already processing or unmounted, forcing reset after 2 seconds");
                safeSetTimeout(() => {
                    console.log("🔓 IllDoc: Force resetting processing flag");
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 2000);
                return;
            }

            try {
                setIsProcessingAction(true);
                console.log("🔄 IllDoc: Set processing flag to true");

                const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                    defaultStorage.getNumber("bible_book") ?? BOOK;
                const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                    defaultStorage.getNumber("bible_jang") ?? JANG;

                console.log("📚 IllDoc: Current from storage - Book:", currentBook, "Chapter:", currentJang);

                const curJang = jang + 1;
                const totalJang = BibleStep[currentBook - 1]?.count || 1;

                console.log("📊 IllDoc: Next chapter would be:", curJang, "Total chapters in book:", totalJang);

                let nextBook = currentBook;
                let nextJang = curJang;

                if (curJang > totalJang) {
                    if (currentBook === 66) {
                        console.log("📖 IllDoc: Reached end of Bible, stopping");
                        setIsProcessingAction(false);
                        return;
                    } else {
                        nextBook = currentBook + 1;
                        nextJang = 1;
                        console.log("📚 IllDoc: Moving to next book:", nextBook, "chapter:", nextJang);
                    }
                }

                console.log(`⏭️ IllDoc: Moving to: ${nextBook}권 ${nextJang}장`);

                defaultStorage.set("is_illdoc_player", true);

                console.log("🔄 IllDoc: Calling syncBibleState");
                syncBibleState(nextBook, nextJang);

                console.log("🔄 IllDoc: Calling onTrigger");
                onTrigger();

                if (isMountedRef.current) {
                    console.log("🎵 IllDoc: Setting autoPlay to true");
                    setAutoPlay(true);

                    console.log("⏸️ IllDoc: Setting isPlaying to false");
                    setIsPlaying(false);
                }

                console.log("✅ IllDoc: onPressNext completed successfully");

                safeSetTimeout(() => {
                    console.log("🏁 IllDoc: Quick reset processing flag after onPressNext");
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 100);

            } catch (error) {
                console.error("❌ IllDoc: 다음 장 이동 오류:", error);
                if (isMountedRef.current) {
                    setIsProcessingAction(false);
                }
            }
        }, [BOOK, JANG, syncBibleState, onTrigger, isProcessingAction, safeSetTimeout]);

        // 슬라이더 값 변경 처리
        const onSliderValueChanged = useCallback(async (value: any) => {
            if (!isMountedRef.current) return;

            try {
                await TrackPlayer.seekTo(value);
            } catch (error) {
                console.error("Failed to seek:", error);
            }
        }, []);

        // 재생/일시정지 전환
        const onPlaySwitch = useCallback(async () => {
            if (!isPlayerReady || !isMountedRef.current) {
                console.log("Player is not ready yet or component unmounted");
                return;
            }

            if (isProcessingAction) {
                console.log("이미 처리 중인 작업이 있습니다");
                safeSetTimeout(() => {
                    console.log("강제로 처리 상태 초기화");
                    if (isMountedRef.current) {
                        setIsProcessingAction(false);
                    }
                }, 500);
                return;
            }

            try {
                setIsProcessingAction(true);
                console.log("Play button pressed, isPlaying:", isPlaying);

                const playerState = await TrackPlayer.getState();
                const isCurrentlyPlaying = playerState === State.Playing;

                if (isCurrentlyPlaying) {
                    await TrackPlayer.pause();
                    console.log("Paused playback");
                    setIsProcessingAction(false);
                    return;
                } else {
                    const currentBook = defaultStorage.getNumber("bible_book_connec") ??
                        defaultStorage.getNumber("bible_book") ?? BOOK;
                    const currentJang = defaultStorage.getNumber("bible_jang_connec") ??
                        defaultStorage.getNumber("bible_jang") ?? JANG;

                    defaultStorage.set("is_illdoc_player", true);

                    const queue = await TrackPlayer.getQueue();
                    console.log("Current queue before play:", queue.length);

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
                    console.log("Started playback");

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

        return (
            <>
                <Box
                    bg={"white"}
                    width="100%"
                    height={85}
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
                            {/* 배속 버튼 */}
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

                            {/* 이전 장 버튼 */}
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

                            {/* 재생/일시정지 버튼 */}
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

                            {/* 다음 장 버튼 */}
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

                            {/* 빈 공간 (기존 자동 진행 버튼 자리) */}
                            <Box width={"50"} height={8} marginTop={2} />
                        </Box>
                    </VStack>
                </Box>
            </>
        )
    }
);

export default memo(IllDocPlayFooterLayout);