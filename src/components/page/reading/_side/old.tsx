// src/components/page/reading/_side/old.tsx
// 최종 수정 버전

import { FlashList } from '@shopify/flash-list';
import { isEmpty } from 'lodash';
import { Center, Text } from 'native-base';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useBaseStyle, useNativeNavigation } from '../../../../hooks';
import { OldBibleStep } from '../../../../utils/define';
import { defaultStorage } from '../../../../utils/mmkv';
import { useBibleReading } from "../../../../utils/useBibleReading";
import FastImage from "react-native-fast-image";

interface Props {
    readState: any;
    menuIndex: number;
    filterBooks?: number[];
}

function OldTestament({ readState, menuIndex, filterBooks }: Props) {
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
        getTodayProgress = null,
        getYesterdayProgress = null,
        refreshKey = 0,
        forceRefresh = () => {},
        readingTableData = {}
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

            console.log(`=== ${planData.planType} 표시할 장 계산 시작 ===`);

            // 오늘 읽을 장들
            if (getTodayProgress && typeof getTodayProgress === 'function') {
                try {
                    const todayProgress = getTodayProgress();
                    if (todayProgress && todayProgress.remainingChapters) {
                        todayProgress.remainingChapters.forEach(chapter => {
                            if (!filterBooks || filterBooks.includes(chapter.bookIndex)) {
                                chaptersToShow.add(`${chapter.bookIndex}-${chapter.chapter}`);
                                console.log(`오늘 읽을 장 추가: ${chapter.bookIndex}권 ${chapter.chapter}장`);
                            }
                        });
                    }
                } catch (error) {
                    console.warn('getTodayProgress 호출 중 오류:', error);
                }
            }

            // 어제 못 읽은 장들
            if (getYesterdayProgress && typeof getYesterdayProgress === 'function') {
                try {
                    const yesterdayProgress = getYesterdayProgress();
                    if (yesterdayProgress && yesterdayProgress.missedChapters) {
                        yesterdayProgress.missedChapters.forEach(chapter => {
                            if (!filterBooks || filterBooks.includes(chapter.bookIndex)) {
                                chaptersToShow.add(`${chapter.bookIndex}-${chapter.chapter}`);
                                console.log(`어제 못 읽은 장 추가: ${chapter.bookIndex}권 ${chapter.chapter}장`);
                            }
                        });
                    }
                } catch (error) {
                    console.warn('getYesterdayProgress 호출 중 오류:', error);
                }
            }

            setVisibleChapters(chaptersToShow);
            console.log(`OldTestament - 표시할 장들 업데이트: ${chaptersToShow.size}개`);
        } catch (error) {
            console.error('표시할 장 업데이트 오류:', error);
            setVisibleChapters(new Set());
        }
    }, [planData, getTodayProgress, getYesterdayProgress, filterBooks]);

    // 🔥 useEffect들 - 안전장치 적용
    useEffect(() => {
        if (!navigation?.addListener) return;

        const unsubscribe = navigation.addListener('focus', () => {
            console.log('=== OldTestament 포커스 이벤트 ===');
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
        console.log('=== OldTestament readState 변경 감지 ===', readState?.length || 0);
        updateVisibleChapters();
    }, [readState, updateVisibleChapters]);

    useEffect(() => {
        console.log('=== OldTestament planData 변경 감지 ===', planData ? planData.planName : '없음');
        updateVisibleChapters();
    }, [planData, updateVisibleChapters]);

    useEffect(() => {
        console.log('=== OldTestament refreshKey 변경 감지 ===', refreshKey);
        updateVisibleChapters();
    }, [refreshKey, updateVisibleChapters]);

    useEffect(() => {
        console.log('=== OldTestament readingTableData 변경 감지 ===', Object.keys(readingTableData || {}).length, '개 항목');
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

            if ((book === 1 && chapter === 1) || (book === 19 && chapter === 1)) {
                console.log(`Old: ${book}권 ${chapter}장 읽기 상태: ${isRead}, planData: ${planData ? planData.planType : 'null'}`);
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

            // 상태 확인 - 계획 타입별 처리
            let status = 'normal';

            if (getChapterStatus && typeof getChapterStatus === 'function') {
                try {
                    // 계획 타입에 따른 범위 확인
                    let shouldCheckStatus = false;

                    if (planData.planType === 'psalms' && book === 19) {
                        shouldCheckStatus = true;
                    } else if (planData.planType === 'pentateuch' && book >= 1 && book <= 5) {
                        shouldCheckStatus = true;
                    } else if (planData.planType === 'old_testament' && book >= 1 && book <= 39) {
                        shouldCheckStatus = true;
                    } else if (planData.planType === 'full_bible') {
                        shouldCheckStatus = true;
                    }

                    if (shouldCheckStatus) {
                        status = getChapterStatus(book, chapter);
                    }
                } catch (error) {
                    console.warn('getChapterStatus 호출 중 오류:', error);
                    status = 'normal';
                }
            }

            // 디버깅용 로그
            if ((book === 19 && chapter === 1 && planData.planType === 'psalms') ||
                (book === 1 && chapter === 1 && planData.planType === 'pentateuch')) {
                console.log(`🔍 Debug - ${book}권 ${chapter}장: planType=${planData.planType}, status=${status}`);
            }

            // 상태별 색상 반환
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
                default:
                    return {
                        ...baseStyle,
                        color: "#000000",
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

    // 🔥 네비게이션 함수 - 안전장치
    const onNavigate = useCallback((book: number, chapter: number) => {
        try {
            defaultStorage.set('bible_book_connec', book);
            defaultStorage.set('bible_jang_connec', chapter);

            const params = menuIndex === 1 ? { sound: true } : { show: true };
            navigation.navigate('BibleConectionScreen', params);
        } catch (error) {
            console.error('화면 이동 오류:', error);
        }
    }, [navigation, menuIndex]);

    // 🔥 렌더링 아이템 - 완전한 안전장치
    const RenderItems = useCallback(
        ({ book, title, length }: { book: number; title: string; length: number }) => {
            if (!book || !title || !length) {
                return <View key={`invalid-${Math.random()}`} />;
            }

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

                            // 스타일 계산 - 안전장치
                            let chapterStyle, showExclamation;

                            try {
                                if (getChapterStyleWithExclamation && typeof getChapterStyleWithExclamation === 'function') {
                                    const result = getChapterStyleWithExclamation(book, chapter);
                                    chapterStyle = result.style;
                                    showExclamation = result.showExclamation;
                                } else {
                                    const legacyResult = getChapterStyleLegacy(book, chapter);
                                    chapterStyle = legacyResult;
                                    showExclamation = legacyResult.showExclamation || false;
                                }
                            } catch (error) {
                                console.error('스타일 계산 중 오류:', error);
                                chapterStyle = {
                                    borderRadius: 17.5,
                                    width: 35,
                                    height: 35,
                                    justifyContent: 'center' as const,
                                    alignItems: 'center' as const,
                                    borderWidth: 1,
                                    borderColor: "#E0E0E0",
                                    backgroundColor: 'transparent',
                                    color: '#000000'
                                };
                                showExclamation = false;
                            }

                            // 읽기 상태 및 상태 확인
                            const isRead = isChapterReadSync ? isChapterReadSync(book, chapter) : false;
                            let status = 'normal';

                            if (planData && getChapterStatus && typeof getChapterStatus === 'function') {
                                try {
                                    status = getChapterStatus(book, chapter);
                                } catch (error) {
                                    console.warn('상태 확인 중 오류:', error);
                                }
                            }

                            // 디버깅용 로그
                            if (book === 1 && chapter === 1) {
                                console.log(`Old RenderItems: 창세기 1장 - isRead: ${isRead}, status: ${status}, showExclamation: ${showExclamation}`);
                            }

                            return (
                                <TouchableOpacity
                                    key={`${book}-${chapter}-${refreshKey}-${readState?.length || 0}-${isRead ? 'read' : 'unread'}`}
                                    activeOpacity={0.7}
                                    style={{
                                        margin: 2,
                                        position: 'relative'
                                    }}
                                    onPress={() => onNavigate(book, chapter)}
                                >
                                    {/* 장 번호 버튼 */}
                                    <View style={chapterStyle}>
                                        <Text
                                            textAlign={'center'}
                                            style={{
                                                color: chapterStyle?.color || '#000000',
                                                fontSize: 14,
                                                fontWeight: status === 'today' ? 'bold' : 'normal'
                                            }}
                                        >
                                            {chapter}
                                        </Text>
                                    </View>

                                    {/* 느낌표 아이콘 */}
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
                                                resizeMode={FastImage.resizeMode.contain}
                                                onError={(error) => {
                                                    console.warn('FastImage 로드 실패:', error);
                                                }}
                                            />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            );
        },
        [getChapterStyleLegacy, getChapterStyleWithExclamation, isChapterReadSync, getChapterStatus, planData, onNavigate, refreshKey, readState]
    );

    // 🔥 데이터 메모이제이션 - 안전장치
    const filteredData = useMemo(() => {
        try {
            const baseData = Array.isArray(OldBibleStep) ? OldBibleStep : [];
            return filterBooks
                ? baseData.filter(book => book && filterBooks.includes(book.index))
                : baseData;
        } catch (error) {
            console.error('데이터 필터링 오류:', error);
            return [];
        }
    }, [filterBooks]);

    // 로딩 상태
    if (isEmpty(filteredData)) {
        return (
            <Center flex={1} bg={color?.white || '#FFFFFF'}>
                <Text color={color?.black || '#000000'}>구약 데이터를 불러오는 중...</Text>
            </Center>
        );
    }

    return (
        <FlashList
            renderItem={({ item }) => {
                if (!item) {
                    return <View key={`empty-${Math.random()}`} />;
                }

                return (
                    <RenderItems
                        book={item.index || 0}
                        length={item.count || 0}
                        title={item.name || ''}
                    />
                );
            }}
            showsHorizontalScrollIndicator={true}
            estimatedItemSize={66}
            data={filteredData}
            extraData={`${refreshKey}-${planData?.id || 'no-plan'}-${readState?.length || 0}-${visibleChapters.size}-${Object.keys(readingTableData || {}).length}`}
            keyExtractor={(item, index) => `${item?.index || index}-${refreshKey}-${readState?.length || 0}-${index}`}
            onError={(error) => {
                console.error('FlashList 오류:', error);
            }}
        />
    );
}

export default memo(OldTestament);