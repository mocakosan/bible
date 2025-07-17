// src/components/page/reading/_side/new.tsx
// 최종 수정 버전

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
    // 🔥 강화된 안전장치
    const baseStyleResult = useBaseStyle();
    const color = baseStyleResult?.color || {
        white: '#FFFFFF',
        black: '#000000',
        gray: '#808080',
        gray2: '#E0E0E0',
        primary: '#37C4B9',
        status: '#F0F0F0',
        bible: '#37C4B9'
    };

    const { navigation } = useNativeNavigation();

    // 🔥 useBibleReading 훅 안전장치 적용
    const bibleReadingHook = useBibleReading(readState);
    const {
        planData = null,
        isChapterReadSync = null,
        getChapterStatus = null,
        getChapterStyleWithExclamation = null,
        loadPlan = () => {},
        loadAllReadingTableData = () => {},
        refreshKey = 0,
        forceRefresh = () => {},
        readingTableData = {},
        getTodayProgress = null,
        getYesterdayProgress = null
    } = bibleReadingHook || {};

    const [visibleChapters, setVisibleChapters] = useState<Set<string>>(new Set());

    // 🔥 표시할 장들 업데이트 - 안전장치 강화
    const updateVisibleChapters = useCallback(() => {
        if (!planData) {
            setVisibleChapters(new Set());
            return;
        }

        try {
            const chaptersToShow = new Set<string>();

            // 오늘 읽을 장들 추가
            if (getTodayProgress) {
                try {
                    const todayProgress = getTodayProgress();
                    if (todayProgress && todayProgress.remainingChapters) {
                        todayProgress.remainingChapters.forEach(chapter => {
                            if (chapter.bookIndex >= 40 && chapter.bookIndex <= 66) { // 신약만
                                chaptersToShow.add(`${chapter.bookIndex}_${chapter.chapter}`);
                            }
                        });
                    }
                } catch (error) {
                    console.warn('getTodayProgress 호출 중 오류:', error);
                }
            }

            // 어제 못 읽은 장들 추가
            if (getYesterdayProgress) {
                try {
                    const yesterdayProgress = getYesterdayProgress();
                    if (yesterdayProgress && yesterdayProgress.missedChapters) {
                        yesterdayProgress.missedChapters.forEach(chapter => {
                            if (chapter.bookIndex >= 40 && chapter.bookIndex <= 66) { // 신약만
                                chaptersToShow.add(`${chapter.bookIndex}_${chapter.chapter}`);
                            }
                        });
                    }
                } catch (error) {
                    console.warn('getYesterdayProgress 호출 중 오류:', error);
                }
            }

            setVisibleChapters(chaptersToShow);
            console.log('NewTestament - 표시할 장들 업데이트:', chaptersToShow.size, '개');
        } catch (error) {
            console.error('표시할 장 업데이트 오류:', error);
            setVisibleChapters(new Set());
        }
    }, [planData, getTodayProgress, getYesterdayProgress]);

    // 🔥 useEffect들 - 안전장치 적용
    useEffect(() => {
        if (!navigation?.addListener) return;

        const unsubscribe = navigation.addListener('focus', () => {
            console.log('=== NewTestament 포커스 이벤트 ===');
            if (forceRefresh && typeof forceRefresh === 'function') {
                forceRefresh();
            }
            setTimeout(() => {
                updateVisibleChapters();
            }, 300);
        });

        return unsubscribe;
    }, [navigation, forceRefresh, updateVisibleChapters]);

    useEffect(() => {
        console.log('=== NewTestament readState 변경 감지 ===', readState?.length || 0);
        updateVisibleChapters();
    }, [readState, updateVisibleChapters]);

    useEffect(() => {
        console.log('=== NewTestament planData 변경 감지 ===', planData ? planData.planName : '없음');
        updateVisibleChapters();
    }, [planData, updateVisibleChapters]);

    useEffect(() => {
        console.log('=== NewTestament refreshKey 변경 감지 ===', refreshKey);
        updateVisibleChapters();
    }, [refreshKey, updateVisibleChapters]);

    useEffect(() => {
        console.log('=== NewTestament readingTableData 변경 감지 ===', Object.keys(readingTableData || {}).length, '개 항목');
    }, [readingTableData]);

    // 🔥 스타일 함수 - 완전한 안전장치
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
            // 읽기 상태 확인
            const isRead = isChapterReadSync ? isChapterReadSync(book, chapter) : false;

            if (book === 40 && chapter === 1) {
                console.log(`New: ${book}권 ${chapter}장 읽기 상태: ${isRead}, planData: ${planData ? 'exists' : 'null'}`);
            }

            // 읽은 장은 항상 초록색
            if (isRead) {
                return {
                    ...baseStyle,
                    color: '#4CAF50',
                    showExclamation: false
                };
            }

            // 일독 계획이 없는 경우
            if (!planData) {
                return {
                    ...baseStyle,
                    color: "#000000",
                    showExclamation: false
                };
            }

            // 상태 확인
            let status = 'normal';
            if (getChapterStatus && typeof getChapterStatus === 'function') {
                try {
                    status = getChapterStatus(planData, book, chapter);
                } catch (error) {
                    console.warn('getChapterStatus 호출 중 오류:', error);
                    status = 'normal';
                }
            }

            // 상태별 스타일 반환
            switch (status) {
                case 'today':
                    return {
                        ...baseStyle,
                        color: '#F44336',
                        showExclamation: false
                    };
                case 'yesterday':
                    return {
                        ...baseStyle,
                        color: '#2196F3',
                        showExclamation: true
                    };
                case 'missed':
                    return {
                        ...baseStyle,
                        color: '#333333',
                        showExclamation: true
                    };
                case 'future':
                    return {
                        ...baseStyle,
                        color: '#000000',
                        showExclamation: false
                    };
                default:
                    return {
                        ...baseStyle,
                        color: '#000000',
                        showExclamation: false
                    };
            }
        } catch (error) {
            console.error(`장 스타일 계산 오류 (${book}:${chapter}):`, error);
            return {
                ...baseStyle,
                color: '#000000',
                showExclamation: false
            };
        }
    }, [isChapterReadSync, planData, getChapterStatus]);

    // 🔥 렌더링 함수 - 안전장치 강화
    const renderItem = useCallback(({ item }: { item: any }) => {
        if (!item) {
            return <Box key="empty" />;
        }

        return (
            <Box mb={5} key={`new-${item.index}`}>
                <Text fontSize={20} fontWeight="600" color={color?.black || '#000000'} mb={3}>
                    {item.name || ''}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {Array.from({ length: item.count || 0 }, (_, chapterIndex) => {
                        const chapter = chapterIndex + 1;

                        let chapterStyle;
                        try {
                            chapterStyle = getChapterStyleLegacy(item.index, chapter);
                        } catch (error) {
                            console.error('스타일 계산 오류:', error);
                            chapterStyle = {
                                borderRadius: 17.5,
                                width: 35,
                                height: 35,
                                justifyContent: 'center' as const,
                                alignItems: 'center' as const,
                                borderWidth: 1,
                                borderColor: "#E0E0E0",
                                backgroundColor: 'transparent',
                                color: '#000000',
                                showExclamation: false
                            };
                        }

                        const isVisible = visibleChapters.has(`${item.index}_${chapter}`);

                        return (
                            <TouchableOpacity
                                key={chapter}
                                onPress={() => {
                                    try {
                                        defaultStorage.set("bible_book", item.index);
                                        defaultStorage.set("bible_jang", chapter);
                                        navigation.navigate("BibleConectionScreen");
                                    } catch (error) {
                                        console.error('네비게이션 오류:', error);
                                    }
                                }}
                                style={{
                                    ...chapterStyle,
                                    margin: 3,
                                    position: 'relative'
                                }}
                            >
                                <Text
                                    style={{
                                        color: chapterStyle.color || '#000000',
                                        fontSize: 14,
                                        fontWeight: isVisible ? 'bold' : 'normal'
                                    }}
                                >
                                    {chapter}
                                </Text>

                                {/* 느낌표 아이콘 */}
                                {chapterStyle.showExclamation && isVisible && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: -3,
                                            right: -3,
                                            backgroundColor: '#F44336',
                                            borderRadius: 8,
                                            width: 16,
                                            height: 16,
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Icon name="priority-high" size={10} color={color?.white || '#FFFFFF'} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Box>
        );
    }, [getChapterStyleLegacy, visibleChapters, navigation, color]);

    // 🔥 메모이제이션된 데이터 - 안전장치
    const memoizedData = useMemo(() => {
        return Array.isArray(NewBibleStep) ? NewBibleStep : [];
    }, []);

    // 로딩 상태
    if (isEmpty(memoizedData)) {
        return (
            <Center flex={1} bg={color?.white || '#FFFFFF'}>
                <Text color={color?.black || '#000000'}>신약 데이터를 불러오는 중...</Text>
            </Center>
        );
    }

    return (
        <Box flex={1} bg={color?.white || '#FFFFFF'} px={4} py={4}>
            <FlashList
                data={memoizedData}
                renderItem={renderItem}
                estimatedItemSize={200}
                keyExtractor={(item) => `new-testament-${item?.index || Math.random()}`}
                extraData={`${refreshKey}-${readState?.length || 0}-${visibleChapters.size}`}
                showsVerticalScrollIndicator={false}
                onError={(error) => {
                    console.error('FlashList 오류:', error);
                }}
            />
        </Box>
    );
}

export default memo(NewTestament);