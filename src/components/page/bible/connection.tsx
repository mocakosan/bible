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

    const {
        markChapterAsRead: markChapterAsReadHook,
        isChapterReadSync: isChapterReadSyncHook,
        planData,
        updateReadingTableCache,
        forceRefresh,  // 기존
        registerGlobalRefreshCallback,  // 🆕 추가
        unregisterGlobalRefreshCallback
    } = useBibleReading();

    const handleGlobalRefresh = useCallback(() => {
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
        setIsAutoProgressEnabled(true);
        saveAutoProgressSetting(true);
    }, []);

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
        const data = await fetchSql(bibleSetting, selectSql, []);
        return mutate(selectSql, data);
    }, [BOOK, JANG]);

    const handleReadStatusChange = useCallback((book: number, chapter: number, isRead: boolean) => {
        handleUpdateData();
        loadPlan();
    }, [handleUpdateData, loadPlan]);

    // 🔥 안전한 markCurrentChapterAsRead 함수로 교체
    const markCurrentChapterAsRead = useCallback(async () => {
        try {
            console.log(`📝 Connection: Marking chapter ${BOOK}:${JANG} as read`);

            // 🔥 가장 안전한 방법: 직접 SQLite 업데이트
            const settingUpdateSql = `UPDATE reading_table SET read = ?, time = ? WHERE book = ? AND jang = ?`;
            const settingInsertSql = `INSERT OR REPLACE INTO reading_table (book, jang, read, time) VALUES (?, ?, ?, ?)`;

            try {
                // 기존 데이터 확인
                const checkSql = `SELECT read FROM reading_table WHERE book = ? AND jang = ?`;
                const result = await fetchSql(bibleSetting, checkSql, [BOOK, JANG]);

                const currentTime = new Date().toISOString();

                if (result && result.length > 0) {
                    // 기존 데이터 업데이트
                    await fetchSql(bibleSetting, settingUpdateSql, ['TRUE', currentTime, BOOK, JANG]);
                    console.log('✅ Connection: Updated existing reading record');
                } else {
                    // 새 데이터 삽입
                    await fetchSql(bibleSetting, settingInsertSql, [BOOK, JANG, 'TRUE', currentTime]);
                    console.log('✅ Connection: Created new reading record');
                }

            } catch (sqlError) {
                console.error('SQLite 오류, 대체 방법 시도:', sqlError);

                // 🔥 fallback: 더 간단한 방법
                const simpleSql = `INSERT OR REPLACE INTO reading_table (book, jang, read, time) VALUES (${BOOK}, ${JANG}, 'TRUE', '${new Date().toISOString()}')`;
                await fetchSql(bibleSetting, simpleSql, []);
                console.log('✅ Connection: Fallback insert completed');
            }

            // 🔥 2. 캐시 업데이트 (안전하게)
            try {
                if (typeof updateReadingTableCache === 'function') {
                    updateReadingTableCache(BOOK, JANG, true);
                    console.log('✅ Connection: Updated reading table cache');
                }
            } catch (cacheError) {
                console.warn('캐시 업데이트 실패 (무시 가능):', cacheError);
            }

            // 🔥 3. 일독 계획 데이터 업데이트 (안전하게)
            try {
                if (planData && typeof markChapterAsReadHook === 'function') {
                    await markChapterAsReadHook(BOOK, JANG);
                    console.log('✅ Connection: Updated plan data');
                }
            } catch (planError) {
                console.warn('계획 데이터 업데이트 실패 (무시 가능):', planError);
            }

            // 🔥 4. 추가 동기화 (안전하게)
            try {
                // 추가적인 캐시 업데이트로 확실한 동기화
                setTimeout(() => {
                    if (typeof updateReadingTableCache === 'function') {
                        updateReadingTableCache(BOOK, JANG, true);
                        console.log('🔄 Connection: Additional cache update for sync');
                    }
                }, 100);

                setTimeout(() => {
                    if (typeof updateReadingTableCache === 'function') {
                        updateReadingTableCache(BOOK, JANG, true);
                        console.log('🔄 Connection: Final cache update for sync');
                    }
                }, 300);

                // 상위 컴포넌트 알림
                if (typeof handleReadStatusChange === 'function') {
                    handleReadStatusChange(BOOK, JANG, true);
                    console.log('✅ Connection: Notified parent component');
                }
            } catch (syncError) {
                console.warn('동기화 작업 일부 실패 (무시 가능):', syncError);
            }

            console.log(`✅ Connection: Successfully marked chapter ${BOOK}:${JANG} as read`);
            return true;

        } catch (error) {
            console.error('❌ Connection: Error marking chapter as read:', error);

            // 🔥 최후의 수단: 가장 간단한 방법
            try {
                console.log('🔄 Connection: Attempting final fallback method');
                const fallbackSql = `UPDATE reading_table SET read = 'TRUE' WHERE book = ${BOOK} AND jang = ${JANG}`;
                await fetchSql(bibleSetting, fallbackSql, []);
                console.log('✅ Connection: Fallback method succeeded');
                return true;
            } catch (fallbackError) {
                console.error('❌ Connection: All methods failed:', fallbackError);
                throw error;
            }
        }
    }, [BOOK, JANG, planData, markChapterAsReadHook, updateReadingTableCache, handleReadStatusChange]);

    // 🔥 자동 진행 함수 개선
    const handleAutoProgress = useCallback(async () => {
        // 중복 실행 방지
        if (isAutoProcessing) {
            console.log('⚠️ Connection: Auto progress already in progress, skipping');
            return;
        }

        console.log(`🚀 Connection: Starting auto progress for ${BOOK}:${JANG}`);
        setIsAutoProcessing(true);

        try {
            // 1. 재생 완료 알림 (즉시 표시)
            // 여기에 기존 알림 코드가 있다면 유지

            // 2. 짧은 대기 (사용자가 메시지를 확인할 수 있도록)
            await new Promise(resolve => setTimeout(resolve, 800));

            // 3. 현재 장을 읽었음으로 자동 체크 (안전한 함수 사용)
            console.log(`📖 Connection: Marking chapter ${BOOK}:${JANG} as read`);

            const success = await markCurrentChapterAsRead();

            if (!success) {
                throw new Error('Failed to mark chapter as read');
            }

            // 4. 추가 대기 및 상태 재확인 (동기화 보장)
            await new Promise(resolve => setTimeout(resolve, 200));

            // 5. 추가 대기 후 다음 장으로 이동
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log(`⏭️ Connection: Moving to next chapter from ${BOOK}:${JANG}`);
            onPressNext(JANG);

            console.log('✅ Connection: Auto progress completed successfully');

        } catch (error) {
            console.error('❌ Connection: Auto progress error:', error);

            // 🔥 사용자 친화적인 오류 메시지로 변경
            Toast.show({
                type: "info",
                text1: "자동 진행 일시 중단",
                text2: "수동으로 읽기 완료를 체크해주세요.",
                visibilityTime: 2500,
                position: "top",
            });
        } finally {
            // 처리 상태 초기화
            setIsAutoProcessing(false);
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
                autoProgressTimeoutRef.current = null;
            }
            console.log('🔄 Connection: Resetting auto progress states');
        }
    }, [BOOK, JANG, isAutoProcessing, markCurrentChapterAsRead, onPressNext]);

    // 🔥 추가 안전 장치
    const safeHandleAutoProgress = useCallback(async () => {
        try {
            await handleAutoProgress();
        } catch (error) {
            console.error('❌ ConectionContainer: Auto progress error:', error);
            console.log('🔄 ConectionContainer: Resetting auto progress states');

            // 상태 초기화
            setIsAutoProcessing(false);
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
                autoProgressTimeoutRef.current = null;
            }
        }
    }, [handleAutoProgress]);

    // TrackPlayer 이벤트 리스너 - 오디오 재생 완료 감지
    useTrackPlayerEvents([
        Event.PlaybackQueueEnded,
        Event.PlaybackState,
        Event.PlaybackTrackChanged
    ], async (event) => {
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
            await safeHandleAutoProgress(); // 🔥 안전한 함수 사용
        }

        // 재생 상태가 종료로 변경된 경우도 처리
        else if (event.type === Event.PlaybackState && event.state === State.Ended) {
            console.log('🎯 Audio state ended - starting auto progress');
            // 약간의 지연을 두고 실행 (중복 호출 방지)
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
            }
            autoProgressTimeoutRef.current = setTimeout(async () => {
                await safeHandleAutoProgress(); // 🔥 안전한 함수 사용
            }, 500);
        }
    });

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (autoProgressTimeoutRef.current) {
                clearTimeout(autoProgressTimeoutRef.current);
            }
        };
    }, []);

    const onPressforward = useCallback(
        async (jang: number) => {
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

            if (sound) {
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

            if (sound && audioPlayerRef.current) {
                setTimeout(() => {
                    audioPlayerRef.current.playCurrentPageAudio();
                }, 500);
            }
        },
        [sound, BOOK, JANG, handleUpdateData, navigation]
    );

    const [menuIndex, setMenuIndex] = useState<number>(0);
    const onMenuPress = useCallback(
        (index: number) => {
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
        if (isFocused) {
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

// FloatingActionContainer와 나머지 함수들은 기존과 동일
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