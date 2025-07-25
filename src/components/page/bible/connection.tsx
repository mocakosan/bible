// BibleConectionScreen 안전성 개선 버전

import Clipboard from "@react-native-clipboard/clipboard";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useRef, useState, useEffect } from "react";
import { Platform, Share, View } from "react-native";
import { FloatingAction } from "react-native-floating-action";
import { Toast } from "react-native-toast-message/lib/src/Toast";
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
    const [sound, setSound] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [autoPlay, setAutoPlay] = useState<boolean>(false);
    const { navigation } = useNativeNavigation();
    const book = defaultStorage.getNumber("bible_book_connec") ?? 1;
    const jang = defaultStorage.getNumber("bible_jang_connec") ?? 1;
    const audioPlayerRef = useRef(null);
    const { loadPlan, markChapterAsRead, isChapterReadSync } = useBibleReading();

    // 자동 진행 관련 상태 추가
    const [isAutoProgressEnabled, setIsAutoProgressEnabled] = useState(false);
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const autoProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 🆕 추가: 컴포넌트 마운트 상태 추적 및 타이머 관리
    const isMountedRef = useRef(true);
    const timerRefs = useRef<Set<NodeJS.Timeout>>(new Set());

    const {
        markChapterAsRead: markChapterAsReadHook,
        isChapterReadSync: isChapterReadSyncHook,
        planData,
        updateReadingTableCache,
        forceRefresh,  // 기존
        registerGlobalRefreshCallback,  // 🆕 추가
        unregisterGlobalRefreshCallback
    } = useBibleReading();

    // 🆕 안전한 타이머 설정 함수
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

    // 🆕 모든 타이머 정리 함수
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

    // 🆕 안전한 오디오 재생 함수
    const safePlayCurrentPageAudio = useCallback(async () => {
        try {
            // 컴포넌트 마운트 상태 확인
            if (!isMountedRef.current) {
                console.log("Component is unmounted, skipping audio play");
                return;
            }

            // ref가 null인지 확인
            if (!audioPlayerRef.current) {
                console.log("AudioPlayer ref is null, skipping audio play");
                return;
            }

            // playCurrentPageAudio 메서드가 존재하는지 확인
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

    const handleGlobalRefresh = useCallback(() => {
        if (!isMountedRef.current) return;

        console.log('🔄 BibleConectionScreen 전역 새로고침 실행');

        // 현재 페이지 데이터 새로고침
        handleUpdateData();

        // 추가적인 상태 업데이트가 필요하다면 여기에 추가
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

    // TrackPlayer 이벤트 리스너 - 오디오 재생 완료 감지
    useTrackPlayerEvents([
        Event.PlaybackQueueEnded,
        Event.PlaybackState,
        Event.PlaybackTrackChanged
    ], async (event) => {
        if (!isMountedRef.current) return;

        console.log('🎵 TrackPlayer Event:', event.type, 'AutoProgress:', isAutoProgressEnabled);

        // 자동 진행이 비활성화되어 있거나 이미 처리 중이면 리턴
        if (!isAutoProgressEnabled || isAutoProcessing || !sound) {
            console.log('❌ Auto progress skipped:', {
                enabled: isAutoProgressEnabled,
                processing: isAutoProcessing,
                sound: sound
            });
            return;
        }

        // 재생 완료 이벤트 처리
        if (event.type === Event.PlaybackQueueEnded) {
            console.log('🏁 Audio playback completed - starting auto progress');
            await handleAutoProgress();
        }

        // 재생 상태가 종료로 변경된 경우도 처리
        else if (event.type === Event.PlaybackState && event.state === State.Ended) {
            console.log('🎯 Audio state ended - starting auto progress');
            // 약간의 지연을 두고 실행 (중복 호출 방지)
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
            }
            autoProgressTimeoutRef.current = safeSetTimeout(async () => {
                await handleAutoProgress();
            }, 500);
        }
    });

    // 자동 진행 메인 로직
    const handleAutoProgress = useCallback(async () => {
        // 중복 실행 방지
        if (isAutoProcessing || !isMountedRef.current) {
            console.log('⚠️ Connection: Auto progress already in progress or unmounted, skipping');
            return;
        }

        console.log(`🚀 Connection: Starting auto progress for ${BOOK}:${JANG}`);
        setIsAutoProcessing(true);

        try {
            // 1. 재생 완료 알림 (즉시 표시)

            // 2. 짧은 대기 (사용자가 메시지를 확인할 수 있도록)
            await new Promise(resolve => safeSetTimeout(resolve, 800));

            // 3. 현재 장을 읽었음으로 자동 체크
            console.log(`📖 Connection: Marking chapter ${BOOK}:${JANG} as read`);
            await markCurrentChapterAsRead();

            // 4. 🆕 추가 대기 및 상태 재확인 (동기화 보장)
            await new Promise(resolve => safeSetTimeout(resolve, 200));

            // 캐시 재업데이트 (확실한 동기화)
            if (isMountedRef.current) {
                updateReadingTableCache(BOOK, JANG, true);
                console.log('🔄 Connection: Re-updated cache for safety');
            }

            // 6. 추가 대기 후 다음 장으로 이동
            await new Promise(resolve => safeSetTimeout(resolve, 1000));

            if (isMountedRef.current) {
                console.log(`⏭️ Connection: Moving to next chapter from ${BOOK}:${JANG}`);
                onPressNext(JANG);
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
            });
        } finally {
            // 처리 상태 초기화
            if (isMountedRef.current) {
                setIsAutoProcessing(false);
            }
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
                autoProgressTimeoutRef.current = null;
            }
        }
    }, [BOOK, JANG, isAutoProcessing, markCurrentChapterAsRead, onPressNext, updateReadingTableCache, safeSetTimeout]);

    // 현재 장을 읽었음으로 표시하는 함수
    const markCurrentChapterAsRead = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            console.log(`📝 Connection: Marking chapter ${BOOK}:${JANG} as read`);

            // reading_table SQL 쿼리 정의
            const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
                WHERE: { BOOK: '?', JANG: '?' }
            })}`;

            const settingInsertSql = `${defineSQL(
                ['book', 'jang', 'read', 'time'],
                'INSERT',
                'reading_table',
                {}
            )}`;

            const settingUpdateSql = `${defineSQL(
                ['read', 'time'],
                'UPDATE',
                'reading_table',
                {
                    WHERE: { BOOK, JANG }
                }
            )}`;

            // 기존 데이터 확인
            const result = await fetchSql(bibleSetting, settingSelectSql, [BOOK, JANG], 0);

            // reading_table 업데이트 또는 삽입
            if (result) {
                await fetchSql(bibleSetting, settingUpdateSql, [
                    'true',
                    String(new Date())
                ]);
                console.log('✅ Connection: Updated existing reading record');
            } else {
                await fetchSql(bibleSetting, settingInsertSql, [
                    BOOK,
                    JANG,
                    'true',
                    String(new Date())
                ]);
                console.log('✅ Connection: Created new reading record');
            }

            // 🆕 중요: 캐시 업데이트 (이것이 리스트 표시에 중요!)
            if (isMountedRef.current) {
                updateReadingTableCache(BOOK, JANG, true);
                console.log('✅ Connection: Updated reading table cache');
            }

            // 일독 계획 데이터도 업데이트 (있는 경우)
            if (planData && isMountedRef.current) {
                await markChapterAsReadHook(BOOK, JANG);
                console.log('✅ Connection: Updated plan data');
            }

            // 🔥 핵심: updateReadingTableCache 호출 시 자동으로 전역 새로고침이 트리거됨
            // 추가적인 동기화를 위해 여러 번 호출
            safeSetTimeout(() => {
                if (isMountedRef.current) {
                    updateReadingTableCache(BOOK, JANG, true);
                    console.log('🔄 Connection: Additional cache update for sync');
                }
            }, 100);

            safeSetTimeout(() => {
                if (isMountedRef.current) {
                    updateReadingTableCache(BOOK, JANG, true);
                    console.log('🔄 Connection: Final cache update for sync');
                }
            }, 300);

            // 상위 컴포넌트에 읽기 상태 변경 알림
            if (handleReadStatusChange && isMountedRef.current) {
                handleReadStatusChange(BOOK, JANG, true);
                console.log('✅ Connection: Notified parent component');
            }

            console.log(`✅ Connection: Successfully marked chapter ${BOOK}:${JANG} as read`);

        } catch (error) {
            console.error('❌ Connection: Error marking chapter as read:', error);
            throw error;
        }
    }, [BOOK, JANG, planData, markChapterAsReadHook, updateReadingTableCache, handleReadStatusChange, safeSetTimeout]);

    const onPressforward = useCallback(
        async (jang: number) => {
            if (!isMountedRef.current) return;

            const curJang = jang - 1;

            if (curJang === 0) {
                if (BOOK > 1) {
                    defaultStorage.set("bible_book_connec", BOOK - 1);
                    defaultStorage.set("bible_jang_connec", BibleStep[BOOK - 2].count);
                    dispatch(
                        illdocSelectSlice.actions.changePage({
                            book: BOOK - 1,
                            jang: BibleStep[BOOK - 2].count,
                        })
                    );
                }
            } else {
                defaultStorage.set("bible_jang_connec", curJang);
                dispatch(
                    illdocSelectSlice.actions.changePage({
                        book: BOOK,
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
        [sound, BOOK, JANG]
    );

    const onPressNext = useCallback(
        (jang: number) => {
            if (!isMountedRef.current) return;

            const curJang = jang + 1;
            const totalJang = BibleStep[BOOK - 1].count;

            if (curJang > totalJang) {
                if (BOOK === 66) {
                    Toast.show({
                        type: "success",
                        text1: "🎉 성경 전체 완독을 축하합니다!",
                        text2: "설정 화면으로 이동합니다.",
                        visibilityTime: 3000,
                    });
                    navigation.navigate("IllDocSettingScreen", {});
                    return;
                } else {
                    defaultStorage.set("bible_book_connec", BOOK + 1);
                    defaultStorage.set("bible_jang_connec", 1);
                    dispatch(
                        illdocSelectSlice.actions.changePage({
                            book: BOOK + 1,
                            jang: 1,
                        })
                    );
                }
            } else {
                defaultStorage.set("bible_jang_connec", curJang);
                dispatch(
                    illdocSelectSlice.actions.changePage({
                        book: BOOK,
                        jang: curJang,
                    })
                );
            }

            handleUpdateData();
            dispatch(bibleTextSlice.actions.reset());

            // 🆕 핵심 개선: 안전한 오디오 재생 호출
            if (sound && isMountedRef.current) {
                console.log("🎵 Scheduling safe audio play after page change");
                safeSetTimeout(() => {
                    console.log("🎵 Executing delayed audio play");
                    safePlayCurrentPageAudio();
                }, 500);
            }
        },
        [sound, BOOK, JANG, handleUpdateData, navigation, safeSetTimeout, safePlayCurrentPageAudio]
    );

    dispatch(illdocSelectSlice.actions.changePage({ book, jang }));
    const BOOK = useSelector(
        (state: any) => state.illDoc.book,
        (left, right) => left.book !== right.book
    );
    const JANG = useSelector(
        (state: any) => state.illDoc.jang,
        (left, right) => left.jang !== right.jang
    );

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
            <IllDocBibleHeaderLayout
                {...{
                    open: sound,
                    setOpen: setSound,
                    name: bibleName,
                    darkmode: false,
                }}
            />

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
                    <IllDocPlayFooterLayout
                        ref={audioPlayerRef}
                        onTrigger={handleUpdateData}
                        openSound={sound}
                    />
                </>
            ) : (
                <>
                    <OtherPage uri={MenusRenderIndex()} />
                    <FooterLayout />
                </>
            )}
            <FloatingActionContainer
                BOOK={BOOK}
                JANG={JANG}
                handleUpdateData={handleUpdateData}
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

// FloatingActionContainer와 나머지 함수들은 기존과 동일하지만 안전성 검사 추가
const FloatingActionContainer = ({ BOOK, JANG, handleUpdateData }: any) => {
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
                    distanceToEdge={{ vertical: 140, horizontal: 10 }}
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