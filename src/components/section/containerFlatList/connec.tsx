import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    FlatList,
    FlatListProps,
    Platform,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
    AppState,
    AppStateStatus,
} from "react-native";
import TrackPlayer, {
    Event,
    State,
    useTrackPlayerEvents,
    usePlaybackState,
    useProgress
} from 'react-native-track-player';
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { defaultStorage } from "../../../utils/mmkv";
import ConectionPageBar from "../pagebar/connec";
import BannerAdMain from "../../../adforus/BannerAdMain";
import {
    bibleSetting,
    defineSQL,
    fetchSql,
} from '../../../utils';
import { useBibleReading } from '../../../utils/useBibleReading';
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props extends FlatListProps<any> {
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    onRefresh?: () => Promise<any>;
    onPressforward: any;
    onPressNext: any;
    isPlaying: any;
    setIsPlaying: any;
    autoPlay: any;
    setAutoPlay: any;
    onReadStatusChange?: (book: number, chapter: number, isRead: boolean) => void;
    isAutoProgressEnabled?: boolean;
    sound?: boolean;
    onSyncToChapter?: (book: number, chapter: number) => void;
}

const ConectionContainerFlatList = ({
                                        style,
                                        contentContainerStyle,
                                        onRefresh,
                                        onPressforward,
                                        onPressNext,
                                        isPlaying,
                                        setIsPlaying,
                                        autoPlay,
                                        setAutoPlay,
                                        onReadStatusChange,
                                        isAutoProgressEnabled = true,
                                        sound = false,
                                        onSyncToChapter,
                                        ...rest
                                    }: Props) => {
    const scrollRef = useRef<FlatList>(null);
    const [adKey, setAdKey] = useState(0);
    const BOOK = defaultStorage.getNumber("bible_book_connec") ?? 1;
    const JANG = defaultStorage.getNumber("bible_jang_connec") ?? 1;
    const insets = useSafeAreaInsets();

    // 핵심 수정: 현재 BOOK/JANG을 추적하는 ref
    const currentBookRef = useRef(BOOK);
    const currentJangRef = useRef(JANG);

    // 읽기 상태 관리를 위한 hook
    const {
        isChapterReadSync,
        markChapterAsRead,
        planData,
        updateReadingTableCache,
        updateProgressInfo  // 🔥 진도탭 연동을 위한 함수 추가
    } = useBibleReading();

    // TrackPlayer 상태
    const playbackState = usePlaybackState();
    const progress = useProgress();

    // 자동 진행 처리 중 상태
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const autoProcessingRef = useRef(false);
    const lastProcessedChapterRef = useRef<string>('');

    // AppState 관리 (백그라운드/포그라운드)
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const [wasInBackground, setWasInBackground] = useState(false);

    // 현재 재생 중인 트랙 정보 저장
    const currentTrackInfoRef = useRef<{
        book: number;
        chapter: number;
        trackIndex: number;
    } | null>(null);

    //핵심: BOOK/JANG 변경 시 ref 업데이트 + 상태 초기화
    useEffect(() => {
        // ref 업데이트
        currentBookRef.current = BOOK;
        currentJangRef.current = JANG;

        console.log(`[SYNC] Page changed to ${BOOK}:${JANG}`);

        // 스크롤 초기화
        scrollRef.current?.scrollToOffset({ offset: 0, animated: false });

        // 자동 진행 상태 초기화
        setIsAutoProcessing(false);
        autoProcessingRef.current = false;

        // 현재 트랙 정보 업데이트
        updateCurrentTrackInfo();
    }, [BOOK, JANG]);

    // 현재 트랙 정보 업데이트
    const updateCurrentTrackInfo = useCallback(async () => {
        try {
            const currentTrack = await TrackPlayer.getActiveTrack();
            const currentIndex = await TrackPlayer.getActiveTrackIndex();

            if (currentTrack && currentIndex !== undefined) {
                currentTrackInfoRef.current = {
                    book: currentBookRef.current,
                    chapter: currentJangRef.current,
                    trackIndex: currentIndex
                };
                console.log(`[SYNC] Current track: ${currentBookRef.current}:${currentJangRef.current}, index: ${currentIndex}`);
            }
        } catch (error) {
            console.log('[SYNC] Failed to get current track info:', error);
        }
    }, []);

    // AppState 변경 감지 (백그라운드 ↔ 포그라운드)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            const previousState = appStateRef.current;

            console.log(`[SYNC] AppState: ${previousState} → ${nextAppState}`);

            // 백그라운드에서 포그라운드로 돌아올 때
            if (
                (previousState === 'background' || previousState === 'inactive') &&
                nextAppState === 'active'
            ) {
                console.log('[SYNC] Returned from background - syncing...');
                setWasInBackground(true);
                await syncScreenWithTrack();
            }

            // 포그라운드에서 백그라운드로 갈 때
            if (
                previousState === 'active' &&
                (nextAppState === 'background' || nextAppState === 'inactive')
            ) {
                console.log('[SYNC] Going to background - saving state...');
                await saveCurrentPlaybackState();
            }

            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    // 현재 재생 상태 저장 (백그라운드로 갈 때)
    const saveCurrentPlaybackState = useCallback(async () => {
        try {
            const currentTrack = await TrackPlayer.getActiveTrack();
            const currentIndex = await TrackPlayer.getActiveTrackIndex();
            const state = await TrackPlayer.getPlaybackState();
            const position = await TrackPlayer.getProgress();

            if (currentTrack) {
                const playbackInfo = {
                    book: currentBookRef.current,
                    chapter: currentJangRef.current,
                    trackIndex: currentIndex,
                    position: position.position,
                    isPlaying: state.state === State.Playing,
                    timestamp: Date.now()
                };

                defaultStorage.set('playback_state', JSON.stringify(playbackInfo));
                console.log('[SYNC] Saved playback state:', playbackInfo);
            }
        } catch (error) {
            console.error('[SYNC] Failed to save playback state:', error);
        }
    }, []);

    // 화면과 트랙 동기화 (포그라운드 복귀 시)
    const syncScreenWithTrack = useCallback(async () => {
        try {
            console.log('[SYNC] Starting screen-track sync...');

            const savedStateStr = defaultStorage.getString('playback_state');
            const savedState = savedStateStr ? JSON.parse(savedStateStr) : null;

            const currentTrack = await TrackPlayer.getActiveTrack();
            const queue = await TrackPlayer.getQueue();
            const currentIndex = await TrackPlayer.getActiveTrackIndex();
            const playbackStateResult = await TrackPlayer.getPlaybackState();

            const screenBook = currentBookRef.current;
            const screenChapter = currentJangRef.current;

            console.log(`[SYNC] Screen: ${screenBook}:${screenChapter}`);
            console.log(`[SYNC] TrackPlayer: index ${currentIndex}, queue length ${queue.length}`);

            let trackBook = screenBook;
            let trackChapter = screenChapter;

            if (currentTrack) {
                if (currentTrack.id) {
                    const parts = currentTrack.id.toString().split('_');
                    if (parts.length >= 2) {
                        trackBook = parseInt(parts[0]) || screenBook;
                        trackChapter = parseInt(parts[1]) || screenChapter;
                    }
                }

                if (currentTrack.description) {
                    try {
                        const desc = JSON.parse(currentTrack.description);
                        trackBook = desc.book || trackBook;
                        trackChapter = desc.chapter || trackChapter;
                    } catch (e) {}
                }
            }

            console.log(`[SYNC] Track info: ${trackBook}:${trackChapter}`);

            if (trackBook !== screenBook || trackChapter !== screenChapter) {
                console.log(`[SYNC] Screen and track differ - syncing screen to track`);

                defaultStorage.set('bible_book_connec', trackBook);
                defaultStorage.set('bible_jang_connec', trackChapter);

                if (onSyncToChapter) {
                    onSyncToChapter(trackBook, trackChapter);
                }

                Toast.show({
                    type: 'info',
                    text1: '화면 동기화',
                    text2: `재생 중인 ${getBookName(trackBook)} ${trackChapter}장으로 이동했습니다.`,
                    visibilityTime: 2000,
                    position: 'bottom'
                });
            }

            if (playbackStateResult.state === State.Playing) {
                setIsPlaying(true);
                console.log('[SYNC] Playback is running');
            } else if (playbackStateResult.state === State.Paused) {
                setIsPlaying(false);
                console.log('[SYNC] Playback is paused');
            }

            await processCompletedChaptersInBackground(savedState);

            setWasInBackground(false);
            console.log('[SYNC] Sync completed');

        } catch (error) {
            console.error('[SYNC] Sync error:', error);
            setWasInBackground(false);
        }
    }, [setIsPlaying, onSyncToChapter]);

    // 백그라운드에서 완료된 장들 읽었음 처리
    const processCompletedChaptersInBackground = useCallback(async (savedState: any) => {
        if (!savedState) return;

        try {
            const savedBook = savedState.book;
            const savedChapter = savedState.chapter;
            const currentBook = currentBookRef.current;
            const currentChapter = currentJangRef.current;

            if (savedBook === currentBook && savedChapter < currentChapter) {
                console.log(`[SYNC] Background progress: ${savedChapter} → ${currentChapter}`);

                for (let ch = savedChapter; ch < currentChapter; ch++) {
                    const isAlreadyRead = isChapterReadSync(savedBook, ch);
                    if (!isAlreadyRead) {
                        await upsertReadingStatus(savedBook, ch, true);
                        updateReadingTableCache(savedBook, ch, true);

                        if (planData) {
                            await markChapterAsRead(savedBook, ch);
                        }

                        console.log(`[SYNC] Marked ${savedBook}:${ch} as read (background)`);
                    }
                }

                if (onReadStatusChange) {
                    onReadStatusChange(currentBook, currentChapter - 1, true);
                }
            }
        } catch (error) {
            console.error('[SYNC] Background processing error:', error);
        }
    }, [planData, markChapterAsRead, updateReadingTableCache, onReadStatusChange, isChapterReadSync]);

    //핵심 수정: 현재 장 읽었음 처리 (BOOK/JANG을 인자로 받음)
    const markChapterAsReadWithRef = useCallback(async (bookToMark: number, jangToMark: number) => {
        try {
            console.log(`[AUTO] Marking ${bookToMark}:${jangToMark} as read`);

            // DB 업데이트
            const settingSelectSql = `SELECT read FROM reading_table WHERE book = ? AND jang = ?`;
            const result = await fetchSql(bibleSetting, settingSelectSql, [bookToMark, jangToMark], 0);

            if (result) {
                const updateSql = `UPDATE reading_table SET read = ?, time = ? WHERE book = ? AND jang = ?`;
                await fetchSql(bibleSetting, updateSql, [
                    'true',
                    String(new Date()),
                    bookToMark,
                    jangToMark
                ]);
                console.log('[AUTO] Updated existing record');
            } else {
                const insertSql = `INSERT INTO reading_table (book, jang, read, time) VALUES (?, ?, ?, ?)`;
                await fetchSql(bibleSetting, insertSql, [
                    bookToMark,
                    jangToMark,
                    'true',
                    String(new Date())
                ]);
                console.log('[AUTO] Created new record');
            }

            // 캐시 업데이트
            updateReadingTableCache(bookToMark, jangToMark, true);

            // 일독 계획 업데이트
            if (planData) {
                await markChapterAsRead(bookToMark, jangToMark);
            }

            // 상위 컴포넌트 알림
            if (onReadStatusChange) {
                onReadStatusChange(bookToMark, jangToMark, true);
            }

            //진도탭 연동: 진행률 정보 업데이트
            if (updateProgressInfo) {
                updateProgressInfo();
                console.log('✅ [AUTO] Updated progress info for 진도탭');
            }

            console.log(`✅ [AUTO] Marked ${bookToMark}:${jangToMark} as read`);
        } catch (error) {
            console.error('❌ [AUTO] Mark as read error:', error);
            throw error;
        }
    }, [updateReadingTableCache, planData, markChapterAsRead, onReadStatusChange, updateProgressInfo]);

    // 기존 markCurrentChapterAsRead
    const markCurrentChapterAsRead = useCallback(async () => {
        const bookToMark = currentBookRef.current;
        const jangToMark = currentJangRef.current;
        await markChapterAsReadWithRef(bookToMark, jangToMark);
    }, [markChapterAsReadWithRef]);

    // 자동 다음 장 이동 (ref 사용)
    const handleAutoNextWithRef = useCallback((jang: number) => {
        const book = currentBookRef.current;
        console.log(`⏭️ [AUTO] Moving to next chapter from ${book}:${jang}`);
        setAdKey(prev => prev + 1);
        onPressNext(jang);
    }, [onPressNext]);

    //핵심 수정: 자동 진행 로직 (ref에서 현재 값 읽기)
    const handleAutoProgress = useCallback(async () => {
        //ref에서 현재 BOOK/JANG 읽기
        const currentBook = currentBookRef.current;
        const currentJang = currentJangRef.current;
        const currentChapterKey = `${currentBook}_${currentJang}`;

        if (lastProcessedChapterRef.current === currentChapterKey) {
            console.log('[AUTO] Already processed this chapter');
            return;
        }

        if (isAutoProcessing || autoProcessingRef.current) {
            console.log('[AUTO] Already in progress');
            return;
        }

        console.log(`[AUTO] Auto progress for ${currentBook}:${currentJang}`);

        setIsAutoProcessing(true);
        autoProcessingRef.current = true;
        lastProcessedChapterRef.current = currentChapterKey;

        try {
            //짧은 대기
            await new Promise(resolve => setTimeout(resolve, 300));

            //대기 중 페이지 변경 확인
            const latestBook = currentBookRef.current;
            const latestJang = currentJangRef.current;

            if (latestBook !== currentBook || latestJang !== currentJang) {
                console.log(`[AUTO] Page changed during wait (${currentBook}:${currentJang} → ${latestBook}:${latestJang}), aborting`);
                return;
            }

            //현재 장 읽었음 체크
            await markChapterAsReadWithRef(latestBook, latestJang);

            //추가 대기
            await new Promise(resolve => setTimeout(resolve, 200));

            //다시 확인
            const finalBook = currentBookRef.current;
            const finalJang = currentJangRef.current;

            if (finalBook !== latestBook || finalJang !== latestJang) {
                console.log(`[AUTO] Page changed during marking, aborting navigation`);
                return;
            }

            //다음 장으로 이동
            console.log(`⏭️ [AUTO] Moving to next chapter from ${finalBook}:${finalJang}`);
            handleAutoNextWithRef(finalJang);

            //다음 장 자동 재생
            setTimeout(async () => {
                try {
                    await TrackPlayer.play();
                    console.log('[AUTO] Started next chapter playback');
                } catch (playError) {
                    console.log('[AUTO] Auto play error:', playError);
                }
            }, 1000);

            console.log('[AUTO] Auto progress completed');

        } catch (error) {
            console.error('[AUTO] Auto progress error:', error);
        } finally {
            setTimeout(() => {
                setIsAutoProcessing(false);
                autoProcessingRef.current = false;
            }, 500);
        }
    }, [isAutoProcessing, markChapterAsReadWithRef, handleAutoNextWithRef]);

    // TrackPlayer 이벤트 리스너
    useTrackPlayerEvents([
        Event.PlaybackState,
        Event.PlaybackQueueEnded,
        Event.PlaybackActiveTrackChanged
    ], async (event) => {
        // 자동 진행이 비활성화되거나 소리가 꺼져있으면 무시
        if (!isAutoProgressEnabled || !sound) {
            return;
        }

        // 이미 처리 중이면 무시
        if (isAutoProcessing || autoProcessingRef.current) {
            return;
        }

        //현재 ref 값으로 로깅
        console.log(`[AUTO] Event: ${event.type}, Current: ${currentBookRef.current}:${currentJangRef.current}`);

        // 오디오 재생 완료 감지
        if (event.type === Event.PlaybackQueueEnded) {
            console.log(`[AUTO] Queue ended at ${currentBookRef.current}:${currentJangRef.current}`);
            await handleAutoProgress();
            return;
        }

        if (event.type === Event.PlaybackState && event.state === State.Ended) {
            console.log(`[AUTO] Playback ended at ${currentBookRef.current}:${currentJangRef.current}`);
            await handleAutoProgress();
            return;
        }

        // 트랙 변경 시 화면 동기화
        if (event.type === Event.PlaybackActiveTrackChanged) {
            console.log('[SYNC] Track changed:', event);

            await updateCurrentTrackInfo();

            const queue = await TrackPlayer.getQueue();
            const currentIndex = await TrackPlayer.getActiveTrackIndex();

            if (currentIndex === undefined || currentIndex === null || currentIndex >= queue.length) {
                console.log(`🎵 [AUTO] Last track completed at ${currentBookRef.current}:${currentJangRef.current}`);
                await handleAutoProgress();
            }
        }
    });

    // 일반 버튼 핸들러
    const handlePressNext = (...args: any[]) => {
        setAdKey(prev => prev + 1);
        onPressNext(...args);
    };

    const handlePressForward = (...args: any[]) => {
        setAdKey(prev => prev + 1);
        onPressforward(...args);
    };

    return (
        <View style={[styles.container, style]}>
            {Platform.OS === "android" && (
                <View style={{ marginTop: 20 }}>
                    <BannerAdMain key={adKey} />
                </View>
            )}

            <FlatList
                contentInsetAdjustmentBehavior="always"
                ref={scrollRef}
                contentContainerStyle={[
                    styles.flexGrow,
                    contentContainerStyle,
                    { paddingTop: 30, paddingBottom: 30 + insets.bottom },
                ]}
                scrollEventThrottle={200}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                {...rest}
            />

            <ConectionPageBar
                onPressforward={handlePressForward}
                onPressNext={handlePressNext}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                autoPlay={autoPlay}
                setAutoPlay={setAutoPlay}
                onReadStatusChange={onReadStatusChange}
            />
        </View>
    );
};

// DB 업데이트 헬퍼 함수
const upsertReadingStatus = async (book: number, jang: number, isRead: boolean) => {
    try {
        const selectSql = `SELECT read FROM reading_table WHERE book = ? AND jang = ?`;
        const result = await fetchSql(bibleSetting, selectSql, [book, jang], 0);

        if (result) {
            const updateSql = `UPDATE reading_table SET read = ?, time = ? WHERE book = ? AND jang = ?`;
            await fetchSql(bibleSetting, updateSql, [
                String(isRead),
                String(new Date()),
                book,
                jang
            ]);
        } else {
            const insertSql = `INSERT INTO reading_table (book, jang, read, time) VALUES (?, ?, ?, ?)`;
            await fetchSql(bibleSetting, insertSql, [
                book,
                jang,
                String(isRead),
                String(new Date())
            ]);
        }
    } catch (error) {
        console.error('upsertReadingStatus error:', error);
        throw error;
    }
};

// 책 이름 가져오기 헬퍼 함수
const getBookName = (bookIndex: number): string => {
    const bookNames: { [key: number]: string } = {
        1: '창세기', 2: '출애굽기', 3: '레위기', 4: '민수기', 5: '신명기',
        6: '여호수아', 7: '사사기', 8: '룻기', 9: '사무엘상', 10: '사무엘하',
        11: '열왕기상', 12: '열왕기하', 13: '역대상', 14: '역대하', 15: '에스라',
        16: '느헤미야', 17: '에스더', 18: '욥기', 19: '시편', 20: '잠언',
        21: '전도서', 22: '아가', 23: '이사야', 24: '예레미야', 25: '예레미야애가',
        26: '에스겔', 27: '다니엘', 28: '호세아', 29: '요엘', 30: '아모스',
        31: '오바댜', 32: '요나', 33: '미가', 34: '나훔', 35: '하박국',
        36: '스바냐', 37: '학개', 38: '스가랴', 39: '말라기',
        40: '마태복음', 41: '마가복음', 42: '누가복음', 43: '요한복음', 44: '사도행전',
        45: '로마서', 46: '고린도전서', 47: '고린도후서', 48: '갈라디아서', 49: '에베소서',
        50: '빌립보서', 51: '골로새서', 52: '데살로니가전서', 53: '데살로니가후서',
        54: '디모데전서', 55: '디모데후서', 56: '디도서', 57: '빌레몬서', 58: '히브리서',
        59: '야고보서', 60: '베드로전서', 61: '베드로후서', 62: '요한일서',
        63: '요한이서', 64: '요한삼서', 65: '유다서', 66: '요한계시록'
    };
    return bookNames[bookIndex] || `책 ${bookIndex}`;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
        position: "relative",
    },
    flexGrow: {
        flexGrow: 1,
    },
    flex: {
        flex: 1,
    },
});

export default ConectionContainerFlatList;