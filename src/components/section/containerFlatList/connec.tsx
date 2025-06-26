import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    FlatList,
    FlatListProps,
    Platform,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from 'react-native-track-player';
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { defaultStorage } from "../../../utils/mmkv";
import ConectionPageBar from "../pagebar/connec";
import BannerAdMain from "../../../adforus/BannerAdMain";
import { bibleSetting, defineSQL, fetchSql } from '../../../utils';
import { useBibleReading } from '../../../utils/useBibleReading';

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
                                        ...rest
                                    }: Props) => {
    const scrollRef = useRef<FlatList>(null);
    const latlon = defaultStorage.getString("latlon")?.split("|");
    const latData = latlon?.[0] ?? 0;
    const lonData = latlon?.[1] ?? 0;
    const [adKey, setAdKey] = useState(0);
    const BOOK = defaultStorage.getNumber("bible_book_connec") ?? 1;
    const JANG = defaultStorage.getNumber("bible_jang_connec") ?? 1;

    // 읽기 상태 관리를 위한 hook
    const {
        isChapterReadSync,
        markChapterAsRead,
        markChapterAsUnread,
        planData,
        updateReadingTableCache,
        loadReadingTableData
    } = useBibleReading();

    // 자동 진행 처리 중 상태 및 이전 상태 추적
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const [previousState, setPreviousState] = useState<State | null>(null);
    const autoProcessingRef = useRef(false);

    useEffect(() => {
        scrollRef.current &&
        scrollRef.current.scrollToOffset({ offset: 0, animated: false });
    }, [BOOK, JANG]);

    // 컴포넌트 마운트 시 상태 초기화
    useEffect(() => {
        console.log(`📚 ConectionContainer Component mounted/changed: ${BOOK}:${JANG}`);
        console.log(`📊 ConectionContainer AutoProgress: ${isAutoProgressEnabled}, Sound: ${sound}`);

        setTimeout(() => {
            setIsAutoProcessing(false);
            autoProcessingRef.current = false;
            console.log('🔄 ConectionContainer: Force reset processing flags on page change');
        }, 100);
        setPreviousState(null);
    }, [BOOK, JANG, isAutoProgressEnabled, sound]);

    // TrackPlayer 이벤트 리스너
    useTrackPlayerEvents([
        Event.PlaybackState,
        Event.PlaybackQueueEnded,
        Event.PlaybackTrackChanged
    ], async (event) => {
        console.log(`🎵 ConectionContainer TrackPlayer Event: ${event.type}`, event);

        // 자동 진행이 비활성화되어 있거나 오디오가 꺼져있으면 리턴
        if (!isAutoProgressEnabled || !sound) {
            console.log(`❌ ConectionContainer: Auto progress disabled: autoProgress=${isAutoProgressEnabled}, sound=${sound}`);
            return;
        }

        // PlaybackQueueEnded는 최고 우선순위 이벤트로 처리
        if (event.type === Event.PlaybackQueueEnded) {
            console.log('🏁 ConectionContainer: PlaybackQueueEnded - forcing auto progress (HIGH PRIORITY)');

            if (isAutoProcessing || autoProcessingRef.current) {
                console.log('⚠️ ConectionContainer: Overriding existing processing for critical queue ended event');
                setIsAutoProcessing(false);
                autoProcessingRef.current = false;

                setTimeout(async () => {
                    await handleAutoProgress();
                }, 200);
            } else {
                await handleAutoProgress();
            }
            return;
        }

        // 다른 이벤트들은 처리 중이면 스킵
        if (isAutoProcessing || autoProcessingRef.current) {
            console.log(`⚠️ ConectionContainer: Skipping ${event.type} - processing in progress`);
            return;
        }

        switch (event.type) {
            case Event.PlaybackState:
                console.log(`🎵 ConectionContainer: Playback state: ${event.state}, Previous: ${previousState}`);
                setPreviousState(event.state);

                if (event.state === State.Ended) {
                    console.log('🎯 ConectionContainer: Audio playback ended - triggering auto progress');
                    await handleAutoProgress();
                }
                break;

            case Event.PlaybackTrackChanged:
                console.log('🔄 ConectionContainer: Track changed:', event);
                if (event.track === null && previousState === State.Ended) {
                    console.log('🎯 ConectionContainer: Track changed to null after completion - triggering auto progress');
                    setTimeout(async () => {
                        if (!isAutoProcessing && !autoProcessingRef.current) {
                            await handleAutoProgress();
                        }
                    }, 300);
                }
                break;
        }
    });

    // 자동 진행 로직
    const handleAutoProgress = useCallback(async () => {
        if (isAutoProcessing || autoProcessingRef.current) {
            console.log('⚠️ ConectionContainer: Auto progress already in progress, skipping...');
            return;
        }

        console.log(`🚀 ConectionContainer: Starting auto progress for ${BOOK}:${JANG}`);

        setIsAutoProcessing(true);
        autoProcessingRef.current = true;

        try {
            // 1. 토스트 메시지 표시 (즉시)
            Toast.show({
                type: "success",
                text1: "🎵 재생 완료",
                text2: "자동으로 읽었음 표시 후 다음 장으로 이동합니다.",
                visibilityTime: 2000,
                position: "top",
            });

            // 2. 짧은 대기 (사용자가 메시지를 볼 수 있도록)
            await new Promise(resolve => setTimeout(resolve, 800));

            // 3. 현재 장을 읽었음으로 자동 체크
            console.log('📖 ConectionContainer: Marking chapter as read...');
            await markCurrentChapterAsRead();

            // 4. 읽었음 체크 완료 알림
            Toast.show({
                type: "info",
                text1: "✅ 읽었음 체크 완료",
                text2: "다음 장으로 이동합니다.",
                visibilityTime: 1500,
                position: "top",
            });

            // 5. 잠시 대기 후 다음 장으로 이동
            await new Promise(resolve => setTimeout(resolve, 600));

            console.log('⏭️ ConectionContainer: Moving to next chapter...');
            handleAutoNext();

            console.log('✅ ConectionContainer: Auto progress completed successfully');

        } catch (error) {
            console.error('❌ ConectionContainer: Auto progress error:', error);
            Toast.show({
                type: "error",
                text1: "자동 진행 오류",
                text2: "수동으로 읽었음 체크 후 다음 장으로 이동해주세요.",
                visibilityTime: 3000,
                position: "top",
            });
        } finally {
            console.log('🔄 ConectionContainer: Resetting auto progress states');
            setIsAutoProcessing(false);
            autoProcessingRef.current = false;
            setPreviousState(null);
        }
    }, [BOOK, JANG]);

    // 현재 장을 읽었음으로 표시하는 함수
    const markCurrentChapterAsRead = useCallback(async () => {
        try {
            console.log(`📝 ConectionContainer: Marking chapter ${BOOK}:${JANG} as read`);

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

            const result = await fetchSql(bibleSetting, settingSelectSql, [BOOK, JANG], 0);

            if (result) {
                await fetchSql(bibleSetting, settingUpdateSql, [
                    'true',
                    String(new Date())
                ]);
                console.log('✅ ConectionContainer: Updated existing reading record');
            } else {
                await fetchSql(bibleSetting, settingInsertSql, [
                    BOOK,
                    JANG,
                    'true',
                    String(new Date())
                ]);
                console.log('✅ ConectionContainer: Created new reading record');
            }

            updateReadingTableCache(BOOK, JANG, true);

            if (planData) {
                await markChapterAsRead(BOOK, JANG);
                console.log('✅ ConectionContainer: Updated plan data');
            }

            if (onReadStatusChange) {
                onReadStatusChange(BOOK, JANG, true);
                console.log('✅ ConectionContainer: Notified parent component');
            }

            console.log(`✅ ConectionContainer: Successfully marked chapter ${BOOK}:${JANG} as read`);

        } catch (error) {
            console.error('❌ ConectionContainer: Error marking chapter as read:', error);
            throw error;
        }
    }, [BOOK, JANG, updateReadingTableCache, planData, markChapterAsRead, onReadStatusChange]);

    // 자동 다음 장 이동 함수
    const handleAutoNext = useCallback(() => {
        try {
            console.log(`⏭️ ConectionContainer: Auto-navigating to next chapter from ${BOOK}:${JANG}`);

            setAdKey((prev) => prev + 1);
            onPressNext(JANG);

            console.log('✅ ConectionContainer: Successfully initiated navigation to next chapter');

        } catch (error) {
            console.error('❌ ConectionContainer: Error auto-navigating to next chapter:', error);
        }
    }, [BOOK, JANG, onPressNext]);

    const handlePressNext = (...args: any[]) => {
        setAdKey((prev) => prev + 1);
        onPressNext(...args);
    };

    const handlePressForward = (...args: any[]) => {
        setAdKey((prev) => prev + 1);
        onPressforward(...args);
    };

    // 디버깅용 상태 로깅
    useEffect(() => {
        console.log(`📊 ConectionContainer Current state - Book: ${BOOK}, Chapter: ${JANG}, AutoProgress: ${isAutoProgressEnabled}, Sound: ${sound}, Processing: ${isAutoProcessing}`);
    }, [BOOK, JANG, isAutoProgressEnabled, sound, isAutoProcessing]);

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
                    { paddingTop: 30, paddingBottom: 30 },
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