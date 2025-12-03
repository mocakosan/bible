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
    const { color } = useBaseStyle();
    const { navigation } = useNativeNavigation();
    const {
        planData,
        isChapterReadSync,
        getChapterStatus,
        getChapterStyleWithExclamation,
        loadPlan,
        loadAllReadingTableData,
        getTodayProgress,
        getYesterdayProgress,
        refreshKey,
        forceRefresh,
        readingTableData
    } = useBibleReading(readState);

    const [visibleChapters, setVisibleChapters] = useState<Set<string>>(new Set());

    // 표시할 장들 업데이트 (오늘 + 어제 못 읽은 장)
    const updateVisibleChapters = useCallback(() => {
        if (!planData) {
            setVisibleChapters(new Set());
            return;
        }

        try {
            const chaptersToShow = new Set<string>();

            console.log(`=== ${planData.planType} 표시할 장 계산 시작 ===`);

            // 오늘 읽을 장들 (remainingChapters 사용)
            if (getTodayProgress) {
                const todayProgress = getTodayProgress();
                if (todayProgress && todayProgress.remainingChapters) {
                    todayProgress.remainingChapters.forEach(chapter => {
                        // 필터링이 있는 경우 해당 범위 내의 장만 추가
                        if (!filterBooks || filterBooks.includes(chapter.bookIndex)) {
                            chaptersToShow.add(`${chapter.bookIndex}-${chapter.chapter}`);
                            console.log(`오늘 읽을 장 추가: ${chapter.bookIndex}권 ${chapter.chapter}장`);
                        }
                    });
                }
            }

            // 어제 못 읽은 장들 (missedChapters 사용)
            if (getYesterdayProgress) {
                const yesterdayProgress = getYesterdayProgress();
                if (yesterdayProgress && yesterdayProgress.missedChapters) {
                    yesterdayProgress.missedChapters.forEach(chapter => {
                        if (!filterBooks || filterBooks.includes(chapter.bookIndex)) {
                            chaptersToShow.add(`${chapter.bookIndex}-${chapter.chapter}`);
                            console.log(`어제 못 읽은 장 추가: ${chapter.bookIndex}권 ${chapter.chapter}장`);
                        }
                    });
                }
            }

            setVisibleChapters(chaptersToShow);
            console.log(`OldTestament - 표시할 장들 업데이트: ${chaptersToShow.size}개`);
        } catch (error) {
            console.error('표시할 장 업데이트 오류:', error);
            setVisibleChapters(new Set());
        }
    }, [planData, getTodayProgress, getYesterdayProgress, filterBooks]);

    // 컴포넌트가 포커스될 때마다 데이터 새로고침
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('=== OldTestament 포커스 이벤트 ===');
            forceRefresh();
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

    // 기존 스타일 함수 (호환성 유지)
    const getChapterStyleLegacy = useCallback((book: number, chapter: number) => {
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

            // 디버깅용 로그 (필요시 활성화)
            if ((book === 1 && chapter === 1) || (book === 19 && chapter === 1)) {
                console.log(`Old: ${book}권 ${chapter}장 읽기 상태: ${isRead}, planData: ${planData ? planData.planType : 'null'}`);
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

            //일독 계획이 있는 경우 - 계획 타입별로 상태 확인
            let status = 'normal';

            // 시편 일독의 경우
            if (planData.planType === 'psalms' && book === 19) {
                // 시편책(19번)에서만 getChapterStatus 사용
                status = getChapterStatus ? getChapterStatus(book, chapter) : 'normal';
            }
            // 모세오경 일독의 경우
            else if (planData.planType === 'pentateuch' && book >= 1 && book <= 5) {
                // 창세기(1) ~ 신명기(5)에서만 getChapterStatus 사용
                status = getChapterStatus ? getChapterStatus(book, chapter) : 'normal';
            }
            // 구약 일독의 경우
            else if (planData.planType === 'old_testament' && book >= 1 && book <= 39) {
                // 구약 범위에서 getChapterStatus 사용
                status = getChapterStatus ? getChapterStatus(book, chapter) : 'normal';
            }
            // 전체 성경 일독의 경우
            else if (planData.planType === 'full_bible') {
                // 모든 책에서 getChapterStatus 사용
                status = getChapterStatus ? getChapterStatus(book, chapter) : 'normal';
            }

            // 디버깅용 로그 (시편/모세오경 첫 장만)
            if ((book === 19 && chapter === 1 && planData.planType === 'psalms') ||
                (book === 1 && chapter === 1 && planData.planType === 'pentateuch')) {
                console.log(`🔍 Debug - ${book}권 ${chapter}장: planType=${planData.planType}, status=${status}`);
            }

            // 상태별 색상 반환
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
                        showExclamation: true // 어제 안 읽은 장에 느낌표 표시
                    };
                case 'missed':
                    return {
                        ...baseStyle,
                        color: '#333333', // 진한 회색 (놓친 장)
                        showExclamation: true // 놓친 장에 느낌표 표시
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

                            //느낌표 포함 스타일 함수 사용 (안전하게 처리)
                            let chapterStyle, showExclamation;

                            if (getChapterStyleWithExclamation) {
                                const result = getChapterStyleWithExclamation(book, chapter);
                                chapterStyle = result.style;
                                showExclamation = result.showExclamation;
                            } else {
                                // 호환성 유지
                                const legacyResult = getChapterStyleLegacy(book, chapter);
                                chapterStyle = legacyResult;
                                showExclamation = legacyResult.showExclamation || false;
                            }

                            //개선된 읽기 상태 확인
                            const isRead = isChapterReadSync ? isChapterReadSync(book, chapter) : false;
                            const status = planData && getChapterStatus ? getChapterStatus(book, chapter) : 'normal';

                            // 디버깅용 로그 (창세기 1장만)
                            if (book === 1 && chapter === 1) {
                                console.log(`Old RenderItems: 창세기 1장 - isRead: ${isRead}, status: ${status}, showExclamation: ${showExclamation}`);
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
                                            textAlign={'center'}
                                            style={{
                                                color: chapterStyle.color,
                                                fontSize: 14,
                                                fontWeight: status === 'today' ? 'bold' : 'normal'
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
        [getChapterStyleLegacy, getChapterStyleWithExclamation, isChapterReadSync, getChapterStatus, planData, onNavigate, refreshKey, readState]
    );

    // 데이터 메모이제이션
    const filteredData = useMemo(() => {
        return filterBooks
            ? OldBibleStep.filter(book => filterBooks.includes(book.index))
            : OldBibleStep;
    }, [filterBooks]);

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
            data={filteredData}
            extraData={`${refreshKey}-${planData?.id || 'no-plan'}-${readState?.length || 0}-${visibleChapters.size}-${Object.keys(readingTableData || {}).length}`}
            keyExtractor={(item, index) => `${item.index}-${refreshKey}-${readState?.length || 0}-${index}`}
        />
    );
}

export default memo(OldTestament);