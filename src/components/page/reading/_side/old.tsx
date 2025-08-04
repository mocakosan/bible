import { FlashList } from '@shopify/flash-list';
import { isEmpty } from 'lodash';
import { Center, Text } from 'native-base';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import FastImage from "react-native-fast-image";
import { useBaseStyle, useNativeNavigation } from '../../../../hooks';
import { OldBibleStep } from '../../../../utils/define';
import { defaultStorage } from '../../../../utils/mmkv';
import {
    loadBiblePlanData,
    getSafePlanData,
    isChapterRead,
    getChapterStatus,
    getChapterStyleInfo,
    getTodayChapters,
    calculateProgress,
    formatDate
} from '../../../../utils/biblePlanUtils';

interface Props {
    readState: any;
    menuIndex: number;
    filterBooks?: number[];
}

function OldTestament({ readState, menuIndex, filterBooks }: Props) {
    const { color } = useBaseStyle();
    const { navigation } = useNativeNavigation();

    // 상태 관리
    const [planData, setPlanData] = useState<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [todayChapters, setTodayChapters] = useState<any[]>([]);

    // 색상 테마 정의
    const colorTheme = {
        black: "#000000",
        bible: "#4CAF50", // 초록색
        blue: "#2196F3",
        red: "#F44336",
        gray: "#9E9E9E",
        white: "#FFFFFF"
    };

    // 계획 데이터 로드 및 오늘 읽을 장 계산
    const loadData = useCallback(() => {
        const rawPlanData = loadBiblePlanData();
        const safePlan = getSafePlanData(rawPlanData);
        setPlanData(safePlan);

        if (safePlan) {
            const today = getTodayChapters(safePlan);
            setTodayChapters(today);
            console.log(`OldTestament - 오늘 읽을 장: ${today.length}개`);
        }
    }, []);

    // 강제 새로고침
    const forceRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        loadData();
    }, [loadData]);

    // 컴포넌트 마운트 및 포커스 이벤트
    useEffect(() => {
        loadData();

        const unsubscribe = navigation.addListener('focus', () => {
            console.log('=== OldTestament 포커스 이벤트 ===');
            forceRefresh();
        });

        return unsubscribe;
    }, [navigation, forceRefresh, loadData]);

    // readState 변경 감지
    useEffect(() => {
        console.log('=== OldTestament readState 변경 감지 ===', readState?.length || 0);
        forceRefresh();
    }, [readState, forceRefresh]);

    // 장 스타일 가져오기
    const getChapterStyle = useCallback((book: number, chapter: number) => {
        // 기본 스타일
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
            const read = isChapterRead(planData, book, chapter);

            // 디버깅용 로그 (창세기 1장만)
            if (book === 1 && chapter === 1) {
                console.log(`Old: 창세기 1장 - read: ${read}, planData: ${planData ? planData.planType : 'null'}`);
            }

            // 읽은 장은 항상 초록색
            if (read) {
                return {
                    style: {
                        ...baseStyle,
                        borderColor: '#4CAF50',
                        backgroundColor: 'transparent',
                    },
                    color: '#4CAF50', // 초록색
                    showExclamation: false,
                    priority: 1,
                    statusText: '읽음'
                };
            }

            // 일독 계획이 없는 경우 - 읽지 않은 장은 검정색
            if (!planData) {
                return {
                    style: {
                        ...baseStyle,
                        borderColor: "#000000",
                        backgroundColor: 'transparent',
                    },
                    color: "#000000",
                    showExclamation: false,
                    priority: 0,
                    statusText: '읽지 않음'
                };
            }

            // 일독 계획이 있는 경우 - 계획 타입별로 상태 확인
            let status = 'normal';

            // 계획 타입에 따라 상태 확인
            if (planData.planType === 'psalms' && book === 19) {
                status = getChapterStatus(planData, book, chapter);
            } else if (planData.planType === 'pentateuch' && book >= 1 && book <= 5) {
                status = getChapterStatus(planData, book, chapter);
            } else if (planData.planType === 'old_testament' && book >= 1 && book <= 39) {
                status = getChapterStatus(planData, book, chapter);
            } else if (planData.planType === 'full_bible') {
                status = getChapterStatus(planData, book, chapter);
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
                        style: {
                            ...baseStyle,
                            borderColor: '#F44336',
                            backgroundColor: 'transparent',
                        },
                        color: '#F44336', // 빨간색 (오늘 읽을 장)
                        showExclamation: false,
                        priority: 4,
                        statusText: '오늘 읽을 장'
                    };
                case 'yesterday':
                    return {
                        style: {
                            ...baseStyle,
                            borderColor: '#2196F3',
                            backgroundColor: 'transparent',
                        },
                        color: '#2196F3', // 파란색 (어제 읽어야 했던 장)
                        showExclamation: true,
                        priority: 3,
                        statusText: '어제 읽어야 했던 장'
                    };
                case 'missed':
                    return {
                        style: {
                            ...baseStyle,
                            borderColor: '#333333',
                            backgroundColor: 'transparent',
                        },
                        color: '#333333', // 진한 회색 (놓친 장)
                        showExclamation: true,
                        priority: 2,
                        statusText: '놓친 장'
                    };
                default:
                    return {
                        style: {
                            ...baseStyle,
                            borderColor: "#000000",
                            backgroundColor: 'transparent',
                        },
                        color: "#000000", // 검정색 (미래 장 등)
                        showExclamation: false,
                        priority: 0,
                        statusText: '읽지 않음'
                    };
            }
        } catch (error) {
            console.error('장 스타일 계산 오류:', error);
            return {
                style: baseStyle,
                color: colorTheme.black,
                showExclamation: false,
                priority: 0,
                statusText: '읽지 않음'
            };
        }
    }, [planData, colorTheme]);

    // 네비게이션 처리
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

    // 렌더링 아이템 컴포넌트
    const RenderItems = useCallback(
        ({ book, title, length }: { book: number; title: string; length: number }) => {
            // 필터링 체크
            if (filterBooks && !filterBooks.includes(book)) {
                return null;
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
                            const chapterStyleInfo = getChapterStyle(book, chapter);
                            const isRead = isChapterRead(planData, book, chapter);
                            const status = getChapterStatus(planData, book, chapter);

                            return (
                                <TouchableOpacity
                                    key={`${book}-${chapter}-${refreshKey}-${isRead ? 'read' : 'unread'}`}
                                    activeOpacity={0.7}
                                    style={{
                                        margin: 2,
                                        position: 'relative'
                                    }}
                                    onPress={() => onNavigate(book, chapter)}
                                >
                                    {/* 장 번호 버튼 */}
                                    <View style={chapterStyleInfo.style}>
                                        <Text
                                            textAlign={'center'}
                                            style={{
                                                color: chapterStyleInfo.color,
                                                fontSize: 14,
                                                fontWeight: status === 'today' ? 'bold' : 'normal'
                                            }}
                                        >
                                            {chapter}
                                        </Text>
                                    </View>

                                    {/* 느낌표 아이콘 */}
                                    {chapterStyleInfo.showExclamation && (
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
        [getChapterStyle, planData, onNavigate, refreshKey, filterBooks]
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
            extraData={`${refreshKey}-${planData?.planName || 'no-plan'}-${readState?.length || 0}`}
            keyExtractor={(item) => `${item.index}-${refreshKey}`}
        />
    );
}

export default memo(OldTestament);