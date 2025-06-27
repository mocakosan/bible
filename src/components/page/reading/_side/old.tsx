import { FlashList } from '@shopify/flash-list';
import { isEmpty } from 'lodash';
import { Center, Text, Box } from 'native-base';
import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useBaseStyle, useNativeNavigation } from '../../../../hooks';
import { OldBibleStep } from '../../../../utils/define';
import { defaultStorage } from '../../../../utils/mmkv';
import { useBibleReading } from "../../../../utils/useBibleReading";
import { getChapterStatus } from "../../../../utils/biblePlanUtils";

interface Props {
    readState: any;
    menuIndex: number;
    filterBooks?: number[];
    bookRange?: { start: number; end: number };
}

function OldTestament({ readState, menuIndex, filterBooks, bookRange }: Props) {
    const { color } = useBaseStyle();
    const { navigation } = useNativeNavigation();

    // useBibleReading 훅에서 사용 가능한 함수들만 구조분해
    const {
        planData,
        isChapterReadSync,
        loadPlan,
        loadAllReadingTableData,
        refreshKey,
        forceRefresh,
        readingTableData
    } = useBibleReading(readState);

    const [visibleChapters, setVisibleChapters] = useState<Set<string>>(new Set());

    // 장 상태 확인 함수 (biblePlanUtils에서 가져온 함수 사용)
    const getChapterStatusLocal = useCallback((book: number, chapter: number) => {
        if (!planData) return 'normal';
        return getChapterStatus(planData, book, chapter);
    }, [planData]);

    // 표시할 장들 업데이트 (간단화)
    const updateVisibleChapters = useCallback(() => {
        try {
            // 일독 계획이 없으면 모든 장 표시
            if (!planData) {
                setVisibleChapters(new Set());
                return;
            }

            // 일독 계획이 있으면 오늘/어제 관련 장들만 강조 표시
            const chaptersToShow = new Set<string>();

            // 구약 모든 장에 대해 상태 확인 (bookRange가 있으면 해당 범위만)
            const booksToCheck = bookRange
                ? OldBibleStep.filter(book => book.index >= bookRange.start && book.index <= bookRange.end)
                : OldBibleStep;

            booksToCheck.forEach(book => {
                for (let chapter = 1; chapter <= book.count; chapter++) {
                    const status = getChapterStatusLocal(book.index, chapter);
                    // 오늘, 어제, 놓친 장들만 표시
                    if (status === 'today' || status === 'yesterday' || status === 'missed') {
                        chaptersToShow.add(`${book.index}_${chapter}`);
                    }
                }
            });

            setVisibleChapters(chaptersToShow);
            console.log('OldTestament - 표시할 장들 업데이트:', chaptersToShow.size, '개');
        } catch (error) {
            console.error('표시할 장 업데이트 오류:', error);
            setVisibleChapters(new Set());
        }
    }, [planData, getChapterStatusLocal, bookRange]);

    // 컴포넌트가 포커스될 때마다 데이터 새로고침
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('=== OldTestament 포커스 이벤트 ===');
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
        console.log('=== OldTestament readState 변경 감지 ===', readState?.length || 0);
        updateVisibleChapters();
    }, [readState, updateVisibleChapters]);

    // planData가 변경될 때마다 즉시 새로고침
    useEffect(() => {
        console.log('=== OldTestament planData 변경 감지 ===', planData ? planData.planName : '없음');
        updateVisibleChapters();
    }, [planData, updateVisibleChapters]);

    // refreshKey 변경 감지
    useEffect(() => {
        console.log('=== OldTestament refreshKey 변경 감지 ===', refreshKey);
        updateVisibleChapters();
    }, [refreshKey, updateVisibleChapters]);

    // readingTableData 변경 감지 추가
    useEffect(() => {
        console.log('=== OldTestament readingTableData 변경 감지 ===', Object.keys(readingTableData || {}).length, '개 항목');
    }, [readingTableData]);

    const getChapterStyle = useCallback((book: number, chapter: number) => {
        // 기본 스타일 (테두리만)
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

            // 디버깅용 로그 (창세기 1장만)
            if (book === 1 && chapter === 1) {
                console.log(`Old: 창세기 1장 읽기 상태 확인: ${isRead}`);
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
            const status = getChapterStatusLocal(book, chapter);

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
                        showExclamation: true // 어제 놓친 장에 느낌표 표시
                    };
                case 'missed':
                    return {
                        ...baseStyle,
                        color: '#000000', // 검정색 (놓친 장)
                        showExclamation: true
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
    }, [planData, isChapterReadSync, getChapterStatusLocal, refreshKey]);

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

    // 느낌표 아이콘 렌더링
    const renderExclamationIcon = useCallback((showExclamation: boolean) => {
        if (!showExclamation) return null;

        return (
            <Box
                position="absolute"
                top={-3}
                right={-3}
                backgroundColor="#F44336"
                borderRadius={8}
                width={16}
                height={16}
                justifyContent="center"
                alignItems="center"
            >
                <Text color="white" fontSize={10} fontWeight="bold">
                    !
                </Text>
            </Box>
        );
    }, []);

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
                            const isRead = isChapterReadSync ? isChapterReadSync(book, chapter) : false;
                            const status = planData ? getChapterStatusLocal(book, chapter) : 'normal';
                            const chapterStyle = getChapterStyle(book, chapter);
                            const isVisible = visibleChapters.has(`${book}_${chapter}`) || !planData;

                            return (
                                <View key={`${book}-${chapter}-${refreshKey}`} style={{ position: 'relative' }}>
                                    <TouchableOpacity
                                        activeOpacity={0.1}
                                        style={{
                                            ...chapterStyle,
                                            margin: 2
                                        }}
                                        onPress={() => onNavigate(book, chapter)}
                                    >
                                        <Text
                                            style={{
                                                color: chapterStyle.color,
                                                fontSize: 14,
                                                fontWeight: isVisible && status === 'today' ? 'bold' : 'normal'
                                            }}
                                        >
                                            {chapter}
                                        </Text>
                                    </TouchableOpacity>
                                    {renderExclamationIcon(chapterStyle.showExclamation && isVisible)}
                                </View>
                            );
                        })}
                    </View>
                </View>
            );
        },
        [getChapterStyle, isChapterReadSync, getChapterStatusLocal, planData, onNavigate, refreshKey, visibleChapters, renderExclamationIcon]
    );

    // 데이터 메모이제이션 (bookRange가 있으면 필터링)
    const memoizedData = useMemo(() => {
        if (bookRange) {
            return OldBibleStep.filter(book => book.index >= bookRange.start && book.index <= bookRange.end);
        }
        return filterBooks ? OldBibleStep.filter((_, index) => filterBooks.includes(index)) : OldBibleStep;
    }, [filterBooks, bookRange]);

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

export default memo(OldTestament);