import { FlashList } from '@shopify/flash-list';
import { isEmpty } from 'lodash';
import { Center, Text, Box } from 'native-base';
import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useBaseStyle, useNativeNavigation } from '../../../../hooks';
import { NewBibleStep } from '../../../../utils/define';
import { defaultStorage } from '../../../../utils/mmkv';
import { useBibleReading } from "../../../../utils/useBibleReading";
import FastImage from "react-native-fast-image";

interface Props {
    readState: any;
    menuIndex: number;
}

function NewTestament({ readState, menuIndex }: Props) {
    const { color } = useBaseStyle();
    const { navigation } = useNativeNavigation();

    const {
        planData,
        isChapterReadSync,
        getChapterStatus,
        getChapterStyleWithExclamation,
        loadPlan,
        loadAllReadingTableData,
        refreshKey,
        forceRefresh,
        readingTableData,
        getTodayProgress,
        getYesterdayProgress
    } = useBibleReading(readState);

    const [visibleChapters, setVisibleChapters] = useState<Set<string>>(new Set());

    const updateVisibleChapters = useCallback(() => {
        if (!planData) {
            setVisibleChapters(new Set());
            return;
        }

        try {
            const chaptersToShow = new Set<string>();

            // 오늘 읽을 장들 추가
            const todayProgress = getTodayProgress();
            if (todayProgress && todayProgress.remainingChapters) {
                todayProgress.remainingChapters.forEach(chapter => {
                    chaptersToShow.add(`${chapter.bookIndex}_${chapter.chapter}`);
                });
            }

            // 어제 못 읽은 장들 추가
            const yesterdayProgress = getYesterdayProgress();
            if (yesterdayProgress && yesterdayProgress.missedChapters) {
                yesterdayProgress.missedChapters.forEach(chapter => {
                    chaptersToShow.add(`${chapter.bookIndex}_${chapter.chapter}`);
                });
            }

            setVisibleChapters(chaptersToShow);
            console.log('NewTestament - 표시할 장들 업데이트:', chaptersToShow.size, '개');
        } catch (error) {
            console.error('표시할 장 업데이트 오류:', error);
            setVisibleChapters(new Set());
        }
    }, [planData, getTodayProgress, getYesterdayProgress]);

    // 컴포넌트가 포커스될 때마다 데이터 새로고침
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('=== NewTestament 포커스 이벤트 ===');
            if (forceRefresh) {
                forceRefresh();
            }
            setTimeout(() => {
                updateVisibleChapters();
            }, 300);
        });

        return unsubscribe;
    }, [navigation, forceRefresh, updateVisibleChapters]);

    // readState가 변경될 때마다 즉시 새로고침
    useEffect(() => {
        console.log('=== NewTestament readState 변경 감지 ===', readState?.length || 0);
        updateVisibleChapters();
    }, [readState, updateVisibleChapters]);

    // planData가 변경될 때마다 즉시 새로고침
    useEffect(() => {
        console.log('=== NewTestament planData 변경 감지 ===', planData ? planData.planName : '없음');
        updateVisibleChapters();
    }, [planData, updateVisibleChapters]);

    // refreshKey 변경 감지
    useEffect(() => {
        console.log('=== NewTestament refreshKey 변경 감지 ===', refreshKey);
        updateVisibleChapters();
    }, [refreshKey, updateVisibleChapters]);

    // readingTableData 변경 감지 추가
    useEffect(() => {
        console.log('=== NewTestament readingTableData 변경 감지 ===', Object.keys(readingTableData || {}).length, '개 항목');
    }, [readingTableData]);

    const getChapterStyleLegacy = useCallback((book: number, chapter: number) => {
        const baseStyle = {
            borderRadius: 17.5,
            width: 35,
            height: 35,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            borderWidth: 1,
            borderColor: "#E0E0E0",
            backgroundColor: 'transparent',
        };

        try {
            // 먼저 읽기 상태부터 확인 (최우선)
            const isRead = isChapterReadSync ? isChapterReadSync(book, chapter) : false;

            // 디버깅용 로그 (마태복음 1장만)
            if (book === 40 && chapter === 1) {
                console.log(`New: 마태복음 1장 읽기 상태 확인: ${isRead}`);
            }

            // 읽은 장은 항상 초록색
            if (isRead) {
                return {
                    ...baseStyle,
                    color: '#4CAF50', // 초록색
                    showExclamation: false
                };
            }

            // 일독 계획이 없는 경우 - 읽지 않은 장은 검정색
            if (!planData) {
                return {
                    ...baseStyle,
                    color: "#000000",
                    showExclamation: false
                };
            }

            // 일독 계획이 있는 경우 - 읽지 않은 장의 상태별 색상
            const status = getChapterStatus ? getChapterStatus(book, chapter) : 'normal';

            switch (status) {
                case 'today':
                    return {
                        ...baseStyle,
                        color: '#F44336', // 빨간색 (오늘 읽을 장)
                        showExclamation: false
                    };
                case 'yesterday':
                    return {
                        ...baseStyle,
                        color: '#2196F3', // 파란색 (어제 읽어야 했던 장)
                        showExclamation: true // 🔥 어제 놓친 장에 느낌표 표시
                    };
                case 'missed':
                    return {
                        ...baseStyle,
                        color: '#000000', // 검정색 (놓친 장)
                        showExclamation: true // 🔥 놓친 장에 느낌표 표시
                    };
                default:
                    return {
                        ...baseStyle,
                        color: "#000000", // 검정색 (미래 장 등)
                        showExclamation: false
                    };
            }
        } catch (error) {
            console.error('장 스타일 계산 오류:', error);
            return {
                ...baseStyle,
                color: "#000000",
                showExclamation: false
            };
        }
    }, [planData, isChapterReadSync, getChapterStatus, refreshKey]);

    const onNavigate = useCallback((book: number, chapter: number) => {
        try {
            defaultStorage.set('bible_book_connec', book);
            defaultStorage.set('bible_jang_connec', chapter);

            navigation.navigate(
                'BibleConectionScreen',
                menuIndex === 1 ? { sound: true } : { show: true }
            );
        } catch (error) {
            console.error('화면 이동 오류:', error);
        }
    }, [navigation, menuIndex]);

    const RenderItems = useCallback(
        ({ book, title, length }: { book: number; title: string; length: number }) => {
            return (
                <View key={`${book}-${refreshKey}`}>
                    <Center>
                        <Text
                            fontSize={'18px'}
                            fontWeight={'bold'}
                            marginTop={5}
                            marginBottom={5}
                        >
                            {title}
                        </Text>
                    </Center>
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            width: '100%',
                            padding: 12,
                            justifyContent: 'center'
                        }}
                    >
                        {Array.from({ length }).map((_, index) => {
                            const chapter = index + 1;
                            const { style: chapterStyle, showExclamation } = getChapterStyleWithExclamation
                                ? getChapterStyleWithExclamation(book, chapter)
                                : getChapterStyleLegacy(book, chapter); // 호환성 유지

                            // 읽기 상태 및 장 상태 확인
                            const isRead = isChapterReadSync ? isChapterReadSync(book, chapter) : false;
                            const status = planData && getChapterStatus ? getChapterStatus(book, chapter) : 'normal';

                            // 디버깅용 로그 (마태복음 1장만)
                            if (book === 40 && chapter === 1) {
                                console.log(`New RenderItems: 마태복음 1장 - isRead: ${isRead}, status: ${status}, showExclamation: ${showExclamation || false}`);
                            }

                            return (
                                <TouchableOpacity
                                    key={`${book}-${chapter}-${refreshKey}-${readState?.length || 0}-${isRead ? 'read' : 'unread'}`}
                                    activeOpacity={0.7}
                                    style={{
                                        width: '13%',
                                        margin: 2,
                                        position: 'relative'
                                    }}
                                    onPress={() => onNavigate(book, chapter)}
                                >
                                    {/* 장 번호 버튼 */}
                                    <View style={chapterStyle}>
                                        <Text
                                            style={{
                                                color: chapterStyle.color,
                                                fontSize: 14,
                                                fontWeight: status === 'today' ? 'bold' : 'normal',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {chapter}
                                        </Text>
                                    </View>
                                    {showExclamation && (
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: -4,
                                                right: -4,
                                                width: 20,
                                                height: 20,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <FastImage
                                                source={require('../../../../assets/img/noRead.png')}
                                                style={{
                                                    width: 16,
                                                    height: 16,
                                                }}
                                                resizeMode={FastImage.resizeMode.contain}/>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            );
        },
        [getChapterStyleWithExclamation, getChapterStyleLegacy, isChapterReadSync, getChapterStatus, planData, onNavigate, refreshKey, readState]
    );

    // 데이터 메모이제이션
    const memoizedData = useMemo(() => NewBibleStep, []);

    return (
        <FlashList
            renderItem={({ item }) => {
                return (
                    <RenderItems
                        book={item.index}
                        length={item.count}
                        title={item.name}
                    />
                );
            }}
            showsHorizontalScrollIndicator={true}
            estimatedItemSize={66}
            data={memoizedData}
            extraData={`${refreshKey}-${planData?.id || 'no-plan'}-${readState?.length || 0}-${visibleChapters.size}-${Object.keys(readingTableData || {}).length}`}
            keyExtractor={(item, index) => `${item.index}-${refreshKey}-${readState?.length || 0}-${index}`}
        />
    );
}

export default memo(NewTestament);