import Clipboard from "@react-native-clipboard/clipboard";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useRef, useState, useEffect } from "react";
import { Platform, Share, View } from "react-native";
import { FloatingAction } from "react-native-floating-action";
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import useSWR from "swr";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from 'react-native-track-player';
import { bFloating, gFloating } from "../../../constant/global";
import { useNativeNavigation } from "../../../hooks";
import useWebview from "../../../hooks/webview/useWebview";
import {
    bibleSelectSlice,
    bibleTextSlice,
    illdocSelectSlice,
} from "../../../provider/redux/slice";
import { BibleNewDB, bibleSetting, color, fetchSql, defineSQL } from "../../../utils";
import { BibleStep } from "../../../utils/define";
import { defaultStorage } from "../../../utils/mmkv";
import { useBibleReading } from "../../../utils/useBibleReading";
import FooterLayout from "../../layout/footer/footer";
import IllDocPlayFooterLayout from "../../layout/footer/illDocPlayFooter";
import IllDocBibleHeaderLayout from "../../layout/header/illDocBibleHeader";
import BookLightModal from "../../modal/bookLightModal";
import BookMarkModal from "../../modal/bookMarkModal";
import { MalsumNoteModal } from "../../modal/note";
import BibleList from "../../section/bibleList";
import BibleConectionSubPage from "./_side/bible_conec";
import OtherPage from "./_side/other";
import React from "react";
import BibleReadingList from "../../section/bibleReadingList";

export default function BibleConectionScreen() {
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const [sound, setSound] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [autoPlay, setAutoPlay] = useState<boolean>(false);
    const { navigation } = useNativeNavigation();
    const book = defaultStorage.getNumber("bible_book_connec") ?? 1;
    const jang = defaultStorage.getNumber("bible_jang_connec") ?? 1;
    const audioPlayerRef = useRef(null);
    const { loadPlan, markChapterAsRead, isChapterReadSync } = useBibleReading();

    // 자동 진행 관련 상태
    const [isAutoProgressEnabled, setIsAutoProgressEnabled] = useState(false);
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const autoProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 컴포넌트 마운트 상태 추적 및 타이머 관리
    const isMountedRef = useRef(true);
    const timerRefs = useRef<Set<NodeJS.Timeout>>(new Set());

    //핵심 수정: 현재 BOOK/JANG을 추적하는 ref (클로저 문제 해결)
    const currentBookRef = useRef(book);
    const currentJangRef = useRef(jang);

    const {
        markChapterAsRead: markChapterAsReadHook,
        isChapterReadSync: isChapterReadSyncHook,
        planData,
        updateReadingTableCache,
        forceRefresh,
        registerGlobalRefreshCallback,
        unregisterGlobalRefreshCallback,
        updateProgressInfo  //진도탭 연동을 위한 함수 추가
    } = useBibleReading();

    // Redux에서 BOOK, JANG 가져오기
    dispatch(illdocSelectSlice.actions.changePage({ book, jang }));
    const BOOK = useSelector(
        (state: any) => state.illDoc.book,
        (left, right) => left.book !== right.book
    );
    const JANG = useSelector(
        (state: any) => state.illDoc.jang,
        (left, right) => left.jang !== right.jang
    );

    //핵심: BOOK/JANG 변경 시 ref 업데이트 + 자동 진행 상태 초기화
    useEffect(() => {
        currentBookRef.current = BOOK;
        currentJangRef.current = JANG;
        console.log(`📍 [REF UPDATE] BOOK=${BOOK}, JANG=${JANG}`);

        // 페이지 변경 시 자동 진행 상태 초기화
        setIsAutoProcessing(false);
        if (autoProgressTimeoutRef.current) {
            clearTimeout(autoProgressTimeoutRef.current);
            autoProgressTimeoutRef.current = null;
        }
    }, [BOOK, JANG]);

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

        if (autoProgressTimeoutRef.current) {
            clearTimeout(autoProgressTimeoutRef.current);
            autoProgressTimeoutRef.current = null;
        }
    }, []);

    // 안전한 오디오 재생 함수
    const safePlayCurrentPageAudio = useCallback(async () => {
        try {
            if (!isMountedRef.current) {
                console.log("Component is unmounted, skipping audio play");
                return;
            }

            if (!audioPlayerRef.current) {
                console.log("AudioPlayer ref is null, skipping audio play");
                return;
            }

            if (typeof audioPlayerRef.current.playCurrentPageAudio !== 'function') {
                console.log("playCurrentPageAudio method not available");
                return;
            }

            console.log("Calling playCurrentPageAudio safely");
            await audioPlayerRef.current.playCurrentPageAudio();
        } catch (error) {
            console.error("Error calling playCurrentPageAudio:", error);
        }
    }, []);

    const selectSql = `SELECT type, color, jul FROM 'bible_setting'
                       WHERE book = ${BOOK} and jang = ${JANG}`;

    const bibleName = `${BibleStep?.[BOOK - 1]?.name} ${JANG}장` ?? "";

    const fetcher = async (url: string) => {
        const data = await fetchSql(bibleSetting, url, []);
        return data;
    };

    const { data: markData, mutate } = useSWR(selectSql, fetcher);

    const handleUpdateData = useCallback(async () => {
        if (!isMountedRef.current) return;

        const data = await fetchSql(bibleSetting, selectSql, []);
        return mutate(selectSql, data);
    }, [BOOK, JANG]);

    const handleGlobalRefresh = useCallback(() => {
        if (!isMountedRef.current) return;

        console.log('🔄 BibleConectionScreen 전역 새로고침 실행');
        handleUpdateData();
    }, [handleUpdateData]);

    useEffect(() => {
        console.log('🔄 BibleConectionScreen 전역 새로고침 콜백 등록');
        registerGlobalRefreshCallback(handleGlobalRefresh);

        return () => {
            console.log('🔄 BibleConectionScreen 전역 새로고침 콜백 해제');
            unregisterGlobalRefreshCallback();
        };
    }, [registerGlobalRefreshCallback, unregisterGlobalRefreshCallback, handleGlobalRefresh]);

    // 컴포넌트 마운트 시 자동 진행 기능 기본 활성화
    useEffect(() => {
        isMountedRef.current = true;
        setIsAutoProgressEnabled(true);
        saveAutoProgressSetting(true);

        return () => {
            console.log("BibleConectionScreen unmounting, cleaning up");
            isMountedRef.current = false;
            clearAllTimers();
        };
    }, [clearAllTimers]);

    //핵심 수정: 현재 장을 읽었음으로 표시 (BOOK/JANG을 인자로 받음)
    const markChapterAsReadWithRef = useCallback(async (bookToMark: number, jangToMark: number) => {
        if (!isMountedRef.current) return;

        try {
            console.log(`📝 Marking chapter ${bookToMark}:${jangToMark} as read`);

            const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
                WHERE: { BOOK: '?', JANG: '?' }
            })}`;

            const result = await fetchSql(bibleSetting, settingSelectSql, [bookToMark, jangToMark], 0);

            if (result) {
                const settingUpdateSql = `${defineSQL(
                    ['read', 'time'],
                    'UPDATE',
                    'reading_table',
                    { WHERE: { BOOK: bookToMark, JANG: jangToMark } }
                )}`;
                await fetchSql(bibleSetting, settingUpdateSql, [
                    'true',
                    String(new Date())
                ]);
                console.log('✅ Connection: Updated existing reading record');
            } else {
                const settingInsertSql = `${defineSQL(
                    ['book', 'jang', 'read', 'time'],
                    'INSERT',
                    'reading_table',
                    {}
                )}`;
                await fetchSql(bibleSetting, settingInsertSql, [
                    bookToMark,
                    jangToMark,
                    'true',
                    String(new Date())
                ]);
                console.log('✅ Connection: Created new reading record');
            }

            // 캐시 업데이트
            if (isMountedRef.current) {
                updateReadingTableCache(bookToMark, jangToMark, true);
                console.log(`✅ Connection: Updated cache for ${bookToMark}:${jangToMark}`);
            }

            // 일독 계획 업데이트
            if (planData && isMountedRef.current) {
                await markChapterAsReadHook(bookToMark, jangToMark);
                console.log('✅ Connection: Updated plan data');
            }

            //진도탭 연동: 진행률 정보 업데이트
            if (isMountedRef.current && updateProgressInfo) {
                updateProgressInfo();
                console.log('✅ Connection: Updated progress info for 진도탭');
            }

            console.log(`✅ Successfully marked ${bookToMark}:${jangToMark} as read`);

        } catch (error) {
            console.error('❌ Mark chapter as read error:', error);
        }
    }, [planData, updateReadingTableCache, markChapterAsReadHook, updateProgressInfo]);

    // 기존 markCurrentChapterAsRead (현재 BOOK/JANG 사용)
    const markCurrentChapterAsRead = useCallback(async () => {
        const bookToMark = currentBookRef.current;
        const jangToMark = currentJangRef.current;
        await markChapterAsReadWithRef(bookToMark, jangToMark);
    }, [markChapterAsReadWithRef]);

    //ref를 사용하는 onPressNext
    const onPressNextWithRef = useCallback(
        (jang: number) => {
            if (!isMountedRef.current) return;

            const currentBook = currentBookRef.current;
            const curJang = jang + 1;
            const totalJang = BibleStep[currentBook - 1].count;

            if (curJang > totalJang) {
                if (currentBook === 66) {
                    Toast.show({
                        type: "success",
                        text1: "🎉 성경 전체 완독을 축하합니다!",
                        text2: "설정 화면으로 이동합니다.",
                        visibilityTime: 3000,
                        topOffset: insets.top + 10,
                    });
                    navigation.navigate("IllDocSettingScreen", {});
                    return;
                } else {
                    defaultStorage.set("bible_book_connec", currentBook + 1);
                    defaultStorage.set("bible_jang_connec", 1);
                    dispatch(
                        illdocSelectSlice.actions.changePage({
                            book: currentBook + 1,
                            jang: 1,
                        })
                    );
                }
            } else {
                defaultStorage.set("bible_jang_connec", curJang);
                dispatch(
                    illdocSelectSlice.actions.changePage({
                        book: currentBook,
                        jang: curJang,
                    })
                );
            }

            handleUpdateData();
            dispatch(bibleTextSlice.actions.reset());

            if (sound && isMountedRef.current) {
                console.log("🎵 Scheduling safe audio play after page change");
                safeSetTimeout(() => {
                    console.log("🎵 Executing delayed audio play");
                    safePlayCurrentPageAudio();
                }, 500);
            }
        },
        [sound, handleUpdateData, navigation, safeSetTimeout, safePlayCurrentPageAudio, insets, dispatch]
    );

    //핵심 수정: 자동 진행 메인 로직 (ref에서 현재 값 읽기)
    const handleAutoProgress = useCallback(async () => {
        // 중복 실행 방지
        if (isAutoProcessing || !isMountedRef.current) {
            console.log('⚠️ Connection: Auto progress already in progress or unmounted, skipping');
            return;
        }

        //ref에서 현재 BOOK/JANG 읽기 (클로저 문제 해결!)
        const currentBook = currentBookRef.current;
        const currentJang = currentJangRef.current;

        console.log(`🚀 Connection: Starting auto progress for ${currentBook}:${currentJang}`);
        setIsAutoProcessing(true);

        try {
            //짧은 대기
            await new Promise(resolve => safeSetTimeout(resolve, 500));

            //대기 중 페이지 변경 확인
            const latestBook = currentBookRef.current;
            const latestJang = currentJangRef.current;

            if (latestBook !== currentBook || latestJang !== currentJang) {
                console.log(`⚠️ Connection: Page changed during wait (${currentBook}:${currentJang} → ${latestBook}:${latestJang}), aborting`);
                return;
            }

            //현재 장을 읽었음으로 자동 체크
            console.log(`📖 Connection: Marking chapter ${latestBook}:${latestJang} as read`);
            await markChapterAsReadWithRef(latestBook, latestJang);

            //추가 대기
            await new Promise(resolve => safeSetTimeout(resolve, 200));

            //다시 확인
            const finalBook = currentBookRef.current;
            const finalJang = currentJangRef.current;

            if (finalBook !== latestBook || finalJang !== latestJang) {
                console.log(`⚠️ Connection: Page changed during marking, aborting navigation`);
                return;
            }

            // 캐시 재업데이트
            if (isMountedRef.current) {
                updateReadingTableCache(finalBook, finalJang, true);
                console.log(`🔄 Connection: Cache updated for ${finalBook}:${finalJang}`);
            }

            //다음 장으로 이동 전 추가 대기
            await new Promise(resolve => safeSetTimeout(resolve, 500));

            // 최종 확인 후 이동
            if (isMountedRef.current &&
                currentBookRef.current === finalBook &&
                currentJangRef.current === finalJang) {
                console.log(`⏭️ Connection: Moving to next chapter from ${finalBook}:${finalJang}`);
                onPressNextWithRef(finalJang);
            } else {
                console.log(`⚠️ Connection: Page changed, skipping navigation`);
            }

            console.log('✅ Connection: Auto progress completed successfully');

        } catch (error) {
            console.error('❌ Connection: Auto progress error:', error);
            Toast.show({
                type: "error",
                text1: "자동 진행 오류",
                text2: "수동으로 읽었음 체크 후 다음 장으로 이동해주세요.",
                visibilityTime: 3000,
                position: "top",
                topOffset: insets.top + 10,
            });
        } finally {
            if (isMountedRef.current) {
                setIsAutoProcessing(false);
            }
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
                autoProgressTimeoutRef.current = null;
            }
        }
    }, [isAutoProcessing, markChapterAsReadWithRef, onPressNextWithRef, updateReadingTableCache, safeSetTimeout, insets]);
    //주의: 의존성에서 BOOK, JANG 제거!

    // TrackPlayer 이벤트 리스너
    useTrackPlayerEvents([
        Event.PlaybackQueueEnded,
        Event.PlaybackState,
        Event.PlaybackTrackChanged
    ], async (event) => {
        if (!isMountedRef.current) return;

        //현재 ref 값으로 로깅
        console.log(`🎵 TrackPlayer Event: ${event.type}, Current: ${currentBookRef.current}:${currentJangRef.current}, AutoProgress: ${isAutoProgressEnabled}`);

        if (!isAutoProgressEnabled || isAutoProcessing || !sound) {
            console.log('❌ Auto progress skipped:', {
                enabled: isAutoProgressEnabled,
                processing: isAutoProcessing,
                sound: sound
            });
            return;
        }

        if (event.type === Event.PlaybackQueueEnded) {
            console.log(`🏁 Audio completed at ${currentBookRef.current}:${currentJangRef.current}`);
            await handleAutoProgress();
        }
        else if (event.type === Event.PlaybackState && event.state === State.Ended) {
            console.log(`🎯 Audio ended at ${currentBookRef.current}:${currentJangRef.current}`);
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
            }
            autoProgressTimeoutRef.current = safeSetTimeout(async () => {
                await handleAutoProgress();
            }, 500);
        }
    });

    const onPressforward = useCallback(
        async (jang: number) => {
            if (!isMountedRef.current) return;

            const currentBook = currentBookRef.current;
            const curJang = jang - 1;

            if (curJang === 0) {
                if (currentBook > 1) {
                    defaultStorage.set("bible_book_connec", currentBook - 1);
                    defaultStorage.set("bible_jang_connec", BibleStep[currentBook - 2].count);
                    dispatch(
                        illdocSelectSlice.actions.changePage({
                            book: currentBook - 1,
                            jang: BibleStep[currentBook - 2].count,
                        })
                    );
                }
            } else {
                defaultStorage.set("bible_jang_connec", curJang);
                dispatch(
                    illdocSelectSlice.actions.changePage({
                        book: currentBook,
                        jang: curJang,
                    })
                );
            }

            if (sound && isMountedRef.current) {
                handleUpdateData();
                setAutoPlay(true);
                setIsPlaying(false);
            }

            dispatch(bibleTextSlice.actions.reset());
        },
        [sound, handleUpdateData, dispatch]
    );

    // 기존 onPressNext (BOOK/JANG 사용) - 버튼에서 사용
    const onPressNext = useCallback(
        (jang: number) => {
            onPressNextWithRef(jang);
        },
        [onPressNextWithRef]
    );

    const handleReadStatusChange = useCallback((book: number, chapter: number, isRead: boolean) => {
        if (!isMountedRef.current) return;

        handleUpdateData();
        loadPlan();
    }, [handleUpdateData, loadPlan]);

    const [menuIndex, setMenuIndex] = useState<number>(0);
    const onMenuPress = useCallback(
        (index: number) => {
            if (!isMountedRef.current) return;
            setMenuIndex(index);
        },
        [menuIndex]
    );

    const MenusRenderIndex = useCallback(() => {
        switch (menuIndex) {
            case 1:
                return `${process.env.WEB_WIEW_BASE_URL}/bible/study?book=${BOOK}&jang=${JANG}`;
            case 2:
                return `${process.env.WEB_WIEW_BASE_URL}/bible/note?book=${BOOK}&jang=${JANG}`;
            case 3:
                return `${process.env.WEB_WIEW_BASE_URL}/bible/mook?book=${BOOK}&jang=${JANG}`;
            case 4:
                return `${process.env.WEB_WIEW_BASE_URL}/bible/qa?book=${BOOK}&jang=${JANG}`;
            case 5:
                return `${process.env.WEB_WIEW_BASE_URL}/bible/photo?book=${BOOK}&jang=${JANG}`;
            default:
                return "";
        }
    }, [menuIndex, BOOK, JANG]);

    useLayoutEffect(() => {
        if (isFocused && isMountedRef.current) {
            handleUpdateData();
        }
    }, [isFocused]);

    const { WebView, isNetWork } = useWebview({
        uri: "https://bible25frontend.givemeprice.co.kr/bible",
    });

    return (
        <>
            <View style={{ paddingTop: insets.top }}>
                <IllDocBibleHeaderLayout
                    {...{
                        open: sound,
                        setOpen: setSound,
                        name: bibleName,
                        darkmode: false,
                    }}
                />
            </View>

            {menuIndex === 0 ? (
                <>
                    <BibleConectionSubPage
                        {...{
                            BOOK,
                            JANG,
                            markData,
                            onPressforward,
                            onPressNext,
                            isPlaying,
                            setIsPlaying,
                            autoPlay,
                            setAutoPlay,
                            onReadStatusChange: handleReadStatusChange,
                            isAutoProgressEnabled,
                            sound,
                        }}
                    />
                    {!sound && <BibleReadingList vector={false} menuIndex={menuIndex} onPress={onMenuPress} />}
                    <View style={{ paddingBottom: insets.bottom }}>
                        <IllDocPlayFooterLayout
                            ref={audioPlayerRef}
                            onTrigger={handleUpdateData}
                            openSound={sound}
                        />
                    </View>
                </>
            ) : (
                <>
                    <OtherPage uri={MenusRenderIndex()} />
                    <View style={{ paddingBottom: insets.bottom }}>
                        <FooterLayout />
                    </View>
                </>
            )}
            <FloatingActionContainer
                BOOK={BOOK}
                JANG={JANG}
                handleUpdateData={handleUpdateData}
                insets={insets}
            />
            <View style={{ width: 0, display: "none" }}>{WebView}</View>
        </>
    );
}

// 설정 저장/로드 유틸 함수들
const saveAutoProgressSetting = (enabled: boolean) => {
    defaultStorage.set('auto_progress_enabled', enabled);
};

const getAutoProgressSetting = (): boolean => {
    return defaultStorage.getBoolean('auto_progress_enabled') ?? false;
};

// FloatingActionContainer
const FloatingActionContainer = ({ BOOK, JANG, handleUpdateData, insets }: any) => {
    const fontStyle = JSON.parse(defaultStorage.getString("fontStyle") ?? "");
    const dispatch = useDispatch();
    const [open, setOpen] = useState(0);
    const isFloating = useSelector(
        (state: any) => state.bibleMenu.firstRead,
        (left, right) => left.firstRead !== right.firstRead
    );
    const totaljul = useSelector(
        (state: any) => state.bibleMenu.jul,
        (left, right) => left.jul !== right.jul
    );

    return (
        <>
            <MalsumNoteModal
                open={open}
                close={() => setOpen(0)}
                BOOK={BOOK}
                JANG={JANG}
            />
            <BookMarkModal
                BOOK={BOOK}
                JANG={JANG}
                markData={totaljul}
                isOpen={open}
                onClose={() => setOpen(0)}
                onTrigger={() => handleUpdateData()}
            />
            <BookLightModal
                BOOK={BOOK}
                JANG={JANG}
                markData={totaljul}
                isOpen={open}
                onClose={() => setOpen(0)}
                onTrigger={() => handleUpdateData()}
            />
            {isFloating && (
                <FloatingAction
                    position="right"
                    distanceToEdge={{
                        vertical: 140 + insets.bottom,
                        horizontal: 10
                    }}
                    showBackground={false}
                    color={
                        fontStyle.julColor === color.bible
                            ? "rgba(42,193,188,0.8)"
                            : "rgba(100,100,100,0.6)"
                    }
                    buttonSize={45}
                    actions={fontStyle.julColor === color.bible ? gFloating : bFloating}
                    onPressItem={(text) => {
                        usebibleFloating(
                            text as string,
                            BOOK,
                            JANG,
                            totaljul,
                            dispatch,
                            setOpen
                        );
                    }}
                />
            )}
        </>
    );
};

const usebibleFloating = (
    text: string,
    book: any,
    jang: any,
    totaljul: any,
    dispatch: any,
    setOpen: any
) => {
    switch (text) {
        case "복사":
            onCopy(getBibleSettingData(book, jang, totaljul));
            return dispatch(bibleSelectSlice.actions.reset());
        case "공유":
            onShare(getBibleSettingData(book, jang, totaljul));
            return dispatch(bibleSelectSlice.actions.reset());
        case "북마크":
            return setOpen(1);
        case "형광펜":
            return setOpen(2);
        case "말씀노트":
            return setOpen(3);
        default:
            break;
    }
};

const getBibleSettingData = async (
    book: number,
    jang: number,
    totaljul: number[]
) => {
    let sqlQuery;

    const mmkv = defaultStorage.getString("bibleNames");

    if (mmkv) {
        sqlQuery = `SELECT jul, content FROM bible_${book} WHERE  type in(${JSON.parse(
                mmkv
        )
                .map((val: string) => (val = "'" + val + "'"))
                .join(",")}) and jang = ${jang} and jul in (${totaljul.join(
                ","
        )}) order by jul;`;
    } else {
        sqlQuery = `SELECT jul, content FROM bible_${book} WHERE  type = "nkrv" and jang = ${jang} and jul in (${totaljul.join(
                ","
        )}) order by jul;`;
    }

    try {
        const result = await fetchSql(BibleNewDB, sqlQuery, []);
        return String(result.map(({ jul, content }: any) => `${jul} ${content}`));
    } catch (err) {
        return console.log(err);
    }
};

const onCopy = async (txt: string | any) => {
    try {
        Clipboard.setString(`${await txt}`);
        return Toast.show({
            type: "success",
            text1: "복사했습니다.",
        });
    } catch (error) {
        return Toast.show({
            type: "error",
            text1: "실패했습니다.",
        });
    }
};

const onShare = async (txt: string | any) => {
    Share.share({
        message:
            Platform.OS === "ios"
                ? `${await txt}
      https://apps.apple.com/kr/app/바이블25/id814929019`
                : `${await txt}
      https://play.google.com/store/search?q=바이블25&c=apps&hl=ko-KR
      `,
    });
};