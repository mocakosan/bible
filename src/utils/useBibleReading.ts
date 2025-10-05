// src/utils/useBibleReading.ts (1/2)
import { useState, useEffect, useCallback, useRef } from 'react';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { AppState } from 'react-native';
import {
    BiblePlanData,
    calculateMissedChapters,
    loadBiblePlanData,
    saveBiblePlanData,
    deleteBiblePlanData,
    calculateProgress,
    getTodayChapters,
    getTodayProgressInfo,
    getCurrentDay
} from "./biblePlanUtils";
import {
    ChapterReading,
    DailyReading,
    DETAILED_BIBLE_PLAN_TYPES,
    estimateCompletionDate,
    getDailyReading
} from "./biblePlanCalculator";
import { bibleSetting, defineSQL, fetchSql } from "./index";
import { defaultStorage } from "./mmkv";
import { BibleStep } from "./define";

interface ReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    type: 'today' | 'yesterday' | 'missed' | 'completed' | 'future';
}

// 성경 전체 장 순서를 계산하는 헬퍼 함수
const getGlobalChapterIndex = (book: number, chapter: number): number => {
    let totalChapters = 0;

    // 해당 책 이전까지의 모든 장 수를 더함
    for (let i = 0; i < book - 1; i++) {
        totalChapters += BibleStep[i].count;
    }

    // 현재 책의 장 번호를 더함
    return totalChapters + chapter;
};

// 전역 장 인덱스로부터 책과 장을 계산하는 함수
const getBookAndChapterFromGlobalIndex = (globalIndex: number): { book: number, chapter: number } => {
    let remainingChapters = globalIndex;

    for (let i = 0; i < BibleStep.length; i++) {
        if (remainingChapters <= BibleStep[i].count) {
            return {
                book: i + 1,
                chapter: remainingChapters
            };
        }
        remainingChapters -= BibleStep[i].count;
    }

    // 마지막 장
    return {
        book: 66,
        chapter: BibleStep[65].count
    };
};

// 🔥 readState를 매개변수로 받도록 수정
export const useBibleReading = (readState?: any) => {
    const [planData, setPlanData] = useState<BiblePlanData | null>(null);
    const [missedCount, setMissedCount] = useState(0);
    const [todayReading, setTodayReading] = useState<DailyReading | null>(null);
    const [yesterdayReading, setYesterdayReading] = useState<DailyReading | null>(null);
    const [progressInfo, setProgressInfo] = useState<any>(null);
    const [readingTableData, setReadingTableData] = useState<{ [key: string]: boolean }>({});
    const [refreshKey, setRefreshKey] = useState(0);
    const appStateRef = useRef(AppState.currentState);

    // 🆕 전역 새로고침 콜백 상태 추가
    const [globalRefreshCallback, setGlobalRefreshCallback] = useState<(() => void) | null>(null);

    useEffect(() => {
        loadPlan();

        // 앱 상태 변경 리스너 등록
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, []);

    useEffect(() => {
        if (planData) {
            updateTodayReading();
            updateYesterdayReading();
            updateProgressInfo();
            updateMissedCountAndBadge();
        } else {
            // planData가 없을 때 모든 상태 초기화
            setTodayReading(null);
            setYesterdayReading(null);
            setProgressInfo(null);
            setMissedCount(0);
            updateAppBadge(0);
        }
    }, [planData]);

    useEffect(() => {
        const initializeData = async () => {
            // 일독 계획 로드
            loadPlan();

            // 🆕 reading_table 전체 데이터 자동 로드
            await loadAllReadingTableData();
        };

        initializeData();
    }, []);

    useEffect(() => {
        if (planData && readingTableData) {
            updateProgressInfo();
        }
    }, [planData, readingTableData, refreshKey]);

    // 앱 상태 변경 핸들러
    const handleAppStateChange = useCallback((nextAppState: string) => {
        if (
            appStateRef.current.match(/inactive|background/) &&
            nextAppState === 'active'
        ) {
            console.log('앱이 다시 활성화됨 - 데이터 새로고침');
            refreshData();
        }
        appStateRef.current = nextAppState;
    }, []);

    // 수동 새로고침 함수
    const refreshData = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        loadPlan();
        loadAllReadingTableData();
    }, []);

    // 앱 뱃지 업데이트 함수
    const updateAppBadge = useCallback((count: number) => {
        try {
            // React Native에서 앱 뱃지 설정
            console.log(`앱 뱃지 업데이트: ${count}`);
        } catch (error) {
            console.error('앱 뱃지 업데이트 오류:', error);
        }
    }, []);

    // 오늘 읽을 내용 업데이트
    const updateTodayReading = useCallback(() => {
        if (!planData) return;

        try {
            const today = new Date();
            const todayData = getDailyReading(planData.planType, new Date(planData.startDate), today);
            setTodayReading(todayData);
        } catch (error) {
            console.error('오늘 읽을 내용 업데이트 오류:', error);
        }
    }, [planData]);

    // 어제 읽을 내용 업데이트
    const updateYesterdayReading = useCallback(() => {
        if (!planData) return;

        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayData = getDailyReading(planData.planType, new Date(planData.startDate), yesterday);
            setYesterdayReading(yesterdayData);
        } catch (error) {
            console.error('어제 읽을 내용 업데이트 오류:', error);
        }
    }, [planData]);

    // 🔥 진행률 정보 업데이트
    const updateProgressInfo = useCallback(() => {
        if (!planData) {
            setProgressInfo(null);
            return;
        }

        try {
            // calculateProgress는 이제 biblePlanUtils에서 가져온 함수 사용
            const progress = calculateProgress(planData);

            // 예상 완료일 계산
            const currentDate = new Date();
            const startDate = new Date(planData.startDate);
            const totalDays = planData.totalDays;
            const daysElapsed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const remainingDays = Math.max(0, totalDays - daysElapsed);

            // 현재 진행 속도로 예상 완료일 계산
            const readingRate = progress.readChapters / daysElapsed;
            const remainingChapters = progress.totalChapters - progress.readChapters;
            const estimatedDaysToComplete = readingRate > 0
                ? Math.ceil(remainingChapters / readingRate)
                : remainingDays;

            const estimatedCompletion = new Date();
            estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDaysToComplete);

            setProgressInfo({
                progressPercentage: progress.progressPercentage,
                schedulePercentage: (daysElapsed / totalDays) * 100,
                readChapters: progress.readChapters,
                totalChapters: progress.totalChapters,
                isOnTrack: progress.progressPercentage >= ((daysElapsed / totalDays) * 100 - 5), // 5% 여유
                estimatedCompletion: estimatedCompletion.toISOString(),
                currentDay: daysElapsed,
                totalDays: totalDays,
                remainingDays: remainingDays,

                // 시간 기반 추가 정보
                todayProgress: progress.todayProgress || 0,
                estimatedTimeToday: progress.estimatedTimeToday || '0분',
                totalReadMinutes: progress.totalReadMinutes || 0,
                expectedProgressPercentage: (daysElapsed / totalDays) * 100,
                isAhead: progress.progressPercentage > ((daysElapsed / totalDays) * 100 + 5),
                isBehind: progress.progressPercentage < ((daysElapsed / totalDays) * 100 - 5)
            });

        } catch (error) {
            console.error('진행률 정보 업데이트 오류:', error);
            setProgressInfo(null);
        }
    }, [planData]);

    // 놓친 장수 계산 및 뱃지 업데이트
    const updateMissedCountAndBadge = useCallback(() => {
        if (!planData) {
            setMissedCount(0);
            updateAppBadge(0);
            return;
        }

        const newMissedCount = calculateMissedChapters(planData);
        setMissedCount(newMissedCount);
        updateAppBadge(newMissedCount);
    }, [planData, updateAppBadge]);

    const loadPlan = useCallback(() => {
        try {
            const existingPlan = loadBiblePlanData();
            if (existingPlan) {
                console.log('기존 일독 계획 로드됨:', existingPlan.planName);
                setPlanData(existingPlan);
            } else {
                console.log('일독 계획 없음 - 상태 초기화');
                setPlanData(null);
                setMissedCount(0);
                updateAppBadge(0);
            }
        } catch (error) {
            console.error('일독 계획 로드 오류:', error);
            setPlanData(null);
            setMissedCount(0);
            updateAppBadge(0);
        }
    }, [updateAppBadge]);

    // 전체 reading_table 데이터를 한 번에 로드하는 함수
    const loadAllReadingTableData = useCallback(async () => {
        try {
            console.log('reading_table 전체 데이터 로드 시작');
            const selectAllSql = `SELECT book, jang, read FROM reading_table`;
            const results = await fetchSql(bibleSetting, selectAllSql, []);

            console.log('SQLite 조회 결과:', results);

            const readingData: { [key: string]: boolean } = {};

            if (Array.isArray(results)) {
                results.forEach((result: any) => {
                    const key = `${result.book}_${result.jang}`;
                    readingData[key] = result.read ? JSON.parse(result.read) : false;
                });
            } else if (results) {
                // 단일 결과인 경우
                const key = `${results.book}_${results.jang}`;
                readingData[key] = results.read ? JSON.parse(results.read) : false;
            }

            console.log('reading_table 데이터 로드 완료:', Object.keys(readingData).length, '개 항목');
            setReadingTableData(readingData);

        } catch (error) {
            console.error('reading_table 데이터 로드 오류:', error);
            setReadingTableData({});
        }
    }, []);

    // 🆕 동기적 장 읽기 상태 확인 함수 (성능 최적화)
    const isChapterReadSync = useCallback((book: number, chapter: number): boolean => {
        try {
            const key = `${book}_${chapter}`;

            // 🆕 1. readState에서 먼저 확인 (최우선)
            const foundInReadState = readState && Array.isArray(readState)
                ? readState.some(item => item.book === book && item.jang === chapter)
                : false;

            if (foundInReadState) return true; // 읽었다면 바로 반환

            // 🆕 2. readingTableData에서 확인 (두 번째 우선순위)
            if (readingTableData && Object.keys(readingTableData).length > 0) {
                const foundInReadingTable = readingTableData[key];

                // readState가 비어있지 않다면 readState에서 찾지 못한 것은 읽지 않은 것
                if (readState && readState.length > 0 && !foundInReadState) {
                    return false; // readState에서 명시적으로 찾을 수 없으면 읽지 않은 것으로 처리
                }

                // readState가 비어있거나 없다면 readingTableData 결과 사용
                if (!readState || readState.length === 0) {
                    return foundInReadingTable || false;
                }

                return false;
            }

            // 🆕 3. 일독 계획이 있는 경우에만 일독 계획 데이터 확인
            if (planData) {
                const planRead = planData.readChapters.some(
                    r => r.book === book && r.chapter === chapter && r.isRead
                );
                if (planRead) return true;
            }

            // 4. 모든 곳에서 읽지 않았다면 false
            return false;

        } catch (error) {
            console.error('isChapterReadSync 오류:', error);
            return false;
        }
    }, [planData, readingTableData, refreshKey, readState]);

    const markChapterAsRead = useCallback(async (book: number, chapter: number) => {
        if (!planData) return false;

        try {
            const updatedReadChapters = [...planData.readChapters];
            const existingIndex = updatedReadChapters.findIndex(
                r => r.book === book && r.chapter === chapter
            );

            const readEntry: ReadingStatus = {
                book,
                chapter,
                date: new Date().toISOString(),
                isRead: true,
                type: 'completed'
            };

            if (existingIndex >= 0) {
                updatedReadChapters[existingIndex] = readEntry;
            } else {
                updatedReadChapters.push(readEntry);
            }

            const updatedPlanData = {
                ...planData,
                readChapters: updatedReadChapters
            };

            setPlanData(updatedPlanData);
            saveBiblePlanData(updatedPlanData);

            // 🆕 전역 새로고침 트리거
            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (markChapterAsRead)');
                globalRefreshCallback();
            }

            // 놓친 장수 재계산 및 뱃지 업데이트
            const newMissedCount = calculateMissedChapters(updatedPlanData);
            setMissedCount(newMissedCount);
            updateAppBadge(newMissedCount);

            return true;
        } catch (error) {
            console.log('장 읽기 표시 오류:', error);
            return false;
        }
    }, [planData, updateAppBadge, globalRefreshCallback]);

    const markChapterAsUnread = useCallback(async (book: number, chapter: number) => {
        if (!planData) return false;

        try {
            const updatedReadChapters = planData.readChapters.filter(
                r => !(r.book === book && r.chapter === chapter)
            );

            const updatedPlanData = {
                ...planData,
                readChapters: updatedReadChapters
            };

            setPlanData(updatedPlanData);
            saveBiblePlanData(updatedPlanData);

            // 🆕 전역 새로고침 트리거
            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (markChapterAsUnread)');
                globalRefreshCallback();
            }

            // 놓친 장수 재계산 및 뱃지 업데이트
            const newMissedCount = calculateMissedChapters(updatedPlanData);
            setMissedCount(newMissedCount);
            updateAppBadge(newMissedCount);

            return true;
        } catch (error) {
            console.log('장 읽기 취소 오류:', error);
            return false;
        }
    }, [planData, updateAppBadge, globalRefreshCallback]);

    // 🔥 수정: 시간 기반 계획과 통합된 장 상태 확인 함수
    const getChapterStatus = useCallback((book: number, chapter: number): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
        if (!planData) return 'normal';

        try {
            // 먼저 읽은 장인지 확인 (최우선)
            const isRead = isChapterReadSync(book, chapter);
            if (isRead) return 'completed';

            // 시간 기반 계획이고 dailyPlan이 있는 경우
            if (planData.isTimeBasedCalculation && planData.dailyPlan && planData.dailyPlan.length > 0) {
                const currentDay = getCurrentDay(planData.startDate);

                // 오늘의 계획 찾기
                const todayPlan = planData.dailyPlan.find((day: any) => day.day === currentDay);
                if (todayPlan?.chapters?.some((ch: any) => ch.book === book && ch.chapter === chapter)) {
                    return 'today';
                }

                // 어제의 계획 찾기
                const yesterdayPlan = planData.dailyPlan.find((day: any) => day.day === currentDay - 1);
                if (yesterdayPlan?.chapters?.some((ch: any) => ch.book === book && ch.chapter === chapter)) {
                    return 'yesterday';
                }

                // 과거 놓친 장들
                const missedPlan = planData.dailyPlan.find((day: any) =>
                    day.day < currentDay &&
                    day.chapters?.some((ch: any) => ch.book === book && ch.chapter === chapter)
                );
                if (missedPlan) return 'missed';

                // 미래 장들
                const futurePlan = planData.dailyPlan.find((day: any) =>
                    day.day > currentDay &&
                    day.chapters?.some((ch: any) => ch.book === book && ch.chapter === chapter)
                );
                if (futurePlan) return 'future';

                return 'normal';
            }

            // 기존 장 기반 로직 (시간 기반이 아닌 경우)
            const startDate = new Date(planData.startDate);
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);

            // 경과 일수 계산
            const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            // 계획 타입별로 다른 인덱스 계산 방식 사용
            let chapterIndex = 0;
            let isValidChapter = false;

            switch (planData.planType) {
                case 'psalms':
                    if (book === 19) {
                        chapterIndex = chapter - 1;
                        isValidChapter = true;
                    }
                    break;

                case 'pentateuch':
                    if (book >= 1 && book <= 5) {
                        let totalChapters = 0;
                        for (let b = 1; b < book; b++) {
                            const bookInfo = BibleStep.find(step => step.index === b);
                            if (bookInfo) {
                                totalChapters += bookInfo.count;
                            }
                        }
                        chapterIndex = totalChapters + chapter - 1;
                        isValidChapter = true;
                    }
                    break;

                case 'old_testament':
                    if (book >= 1 && book <= 39) {
                        let totalChapters = 0;
                        for (let b = 1; b < book; b++) {
                            const bookInfo = BibleStep.find(step => step.index === b);
                            if (bookInfo) {
                                totalChapters += bookInfo.count;
                            }
                        }
                        chapterIndex = totalChapters + chapter - 1;
                        isValidChapter = true;
                    }
                    break;

                case 'new_testament':
                    if (book >= 40 && book <= 66) {
                        let totalChapters = 0;
                        for (let b = 40; b < book; b++) {
                            const bookInfo = BibleStep.find(step => step.index === b);
                            if (bookInfo) {
                                totalChapters += bookInfo.count;
                            }
                        }
                        chapterIndex = totalChapters + chapter - 1;
                        isValidChapter = true;
                    }
                    break;

                case 'full_bible':
                default:
                    chapterIndex = getGlobalChapterIndex(book, chapter) - 1;
                    isValidChapter = true;
                    break;
            }

            if (!isValidChapter) {
                return 'normal';
            }

            const chaptersPerDay = planData.chaptersPerDay;
            const chapterDay = Math.floor(chapterIndex / chaptersPerDay);

            if (chapterDay === daysPassed) {
                return 'today';
            } else if (chapterDay === daysPassed - 1) {
                return 'yesterday';
            } else if (chapterDay < daysPassed) {
                return 'missed';
            } else {
                return 'future';
            }

        } catch (error) {
            console.error('장 상태 확인 오류:', error);
            return 'normal';
        }
    }, [planData, isChapterReadSync]);

    // 🆕 향상된 장 스타일 계산 함수 (느낌표 포함)
    const getChapterStyleWithExclamation = useCallback((book: number, chapter: number) => {
        try {
            const isRead = isChapterReadSync(book, chapter);
            const status = planData ? getChapterStatus(book, chapter) : 'normal';

            const baseStyle = {
                borderRadius: 17.5,
                width: 35,
                height: 35,
                justifyContent: 'center' as const,
                alignItems: 'center' as const,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                backgroundColor: 'transparent'
            };

            // 읽은 상태가 최우선
            if (isRead) {
                return {
                    style: { ...baseStyle, color: '#4CAF50' },
                    showExclamation: false
                };
            }

            // 상태별 처리
            switch (status) {
                case 'today':
                    return {
                        style: { ...baseStyle, color: '#F44336' },
                        showExclamation: false
                    };
                case 'yesterday':
                    return {
                        style: { ...baseStyle, color: '#2196F3' },
                        showExclamation: true
                    };
                case 'missed':
                    return {
                        style: { ...baseStyle, color: '#000000' },
                        showExclamation: true
                    };
                default:
                    return {
                        style: { ...baseStyle, color: '#000000' },
                        showExclamation: false
                    };
            }
        } catch (error) {
            console.error('장 스타일 계산 오류:', error);
            return {
                style: {
                    borderRadius: 17.5,
                    width: 35,
                    height: 35,
                    justifyContent: 'center' as const,
                    alignItems: 'center' as const,
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                    backgroundColor: 'transparent',
                    color: '#000000'
                },
                showExclamation: false
            };
        }
    }, [planData, isChapterReadSync, getChapterStatus]);

    // 🔥 수정: 오늘 진도 계산 함수 (통합 버전 사용)
    const getTodayProgress = useCallback(() => {
        if (!planData) {
            return {
                totalChapters: 0,
                completedChapters: 0,
                remainingChapters: [],
                allChapters: [],
                percentage: 0
            };
        }

        try {
            // biblePlanUtils의 getTodayProgressInfo 사용
            const todayInfo = getTodayProgressInfo(planData);

            if (todayInfo) {
                return {
                    totalChapters: todayInfo.totalChapters,
                    completedChapters: todayInfo.readChapters,
                    remainingChapters: todayInfo.remainingChapters,
                    allChapters: todayInfo.allChapters,
                    percentage: todayInfo.progress
                };
            }

            return {
                totalChapters: 0,
                completedChapters: 0,
                remainingChapters: [],
                allChapters: [],
                percentage: 0
            };
        } catch (error) {
            console.error('오늘 진도 계산 오류:', error);
            return {
                totalChapters: 0,
                completedChapters: 0,
                remainingChapters: [],
                allChapters: [],
                percentage: 0
            };
        }
    }, [planData]);

    // 🔥 수정: 어제 진도 계산 함수
    const getYesterdayProgress = useCallback(() => {
        if (!planData) {
            return {
                totalChapters: 0,
                completedChapters: 0,
                percentage: 0,
                missedChapters: []
            };
        }

        try {
            // 시간 기반 계획인 경우
            if (planData.isTimeBasedCalculation && planData.dailyPlan && planData.dailyPlan.length > 0) {
                const currentDay = getCurrentDay(planData.startDate);
                const yesterdayPlan = planData.dailyPlan.find((day: any) => day.day === currentDay - 1);

                if (yesterdayPlan && yesterdayPlan.chapters) {
                    const completedCount = yesterdayPlan.chapters.filter((ch: any) =>
                        isChapterReadSync(ch.book, ch.chapter)
                    ).length;

                    const missedChapters = yesterdayPlan.chapters
                        .filter((ch: any) => !isChapterReadSync(ch.book, ch.chapter))
                        .map((ch: any) => ({
                            bookIndex: ch.book,
                            bookName: ch.bookName,
                            chapter: ch.chapter
                        }));

                    return {
                        totalChapters: yesterdayPlan.chapters.length,
                        completedChapters: completedCount,
                        percentage: yesterdayPlan.chapters.length > 0
                            ? (completedCount / yesterdayPlan.chapters.length) * 100
                            : 0,
                        missedChapters
                    };
                }
            }

            // 기존 로직 (yesterdayReading 사용)
            if (!yesterdayReading) {
                return {
                    totalChapters: 0,
                    completedChapters: 0,
                    percentage: 0,
                    missedChapters: []
                };
            }

            const completedChapters = yesterdayReading.chapters.filter(ch =>
                isChapterReadSync(ch.bookIndex, ch.chapter)
            ).length;

            const missedChapters = yesterdayReading.chapters.filter(ch =>
                !isChapterReadSync(ch.bookIndex, ch.chapter)
            );

            return {
                totalChapters: yesterdayReading.chapters.length,
                completedChapters,
                percentage: yesterdayReading.chapters.length > 0
                    ? (completedChapters / yesterdayReading.chapters.length) * 100
                    : 0,
                missedChapters
            };
        } catch (error) {
            console.error('어제 진도 계산 오류:', error);
            return {
                totalChapters: 0,
                completedChapters: 0,
                percentage: 0,
                missedChapters: []
            };
        }
    }, [planData, yesterdayReading, isChapterReadSync]);

    // 🆕 전역 새로고침 콜백 등록/해제 함수들
    const registerGlobalRefreshCallback = useCallback((callback: () => void) => {
        console.log('🔄 전역 새로고침 콜백 등록됨');
        setGlobalRefreshCallback(() => callback);
    }, []);

    const unregisterGlobalRefreshCallback = useCallback(() => {
        console.log('🔄 전역 새로고침 콜백 해제됨');
        setGlobalRefreshCallback(null);
    }, []);

    const deletePlan = useCallback(() => {
        try {
            deleteBiblePlanData();
            setPlanData(null);
            setTodayReading(null);
            setYesterdayReading(null);
            setProgressInfo(null);
            setMissedCount(0);
            updateAppBadge(0);

            Toast.show({
                type: 'success',
                text1: '일독 계획이 삭제되었습니다.',
                position: 'bottom'
            });
        } catch (error) {
            console.error('일독 계획 삭제 오류:', error);
            Toast.show({
                type: 'error',
                text1: '일독 계획 삭제 중 오류가 발생했습니다.',
                position: 'bottom'
            });
        }
    }, [updateAppBadge]);

    // 🆕 완전 초기화 함수 개선
    const resetAllData = useCallback(async () => {
        try {
            console.log('=== useBibleReading 완전 초기화 시작 ===');

            // 1. 로컬 상태 모두 초기화
            setPlanData(null);
            setMissedCount(0);
            setTodayReading(null);
            setYesterdayReading(null);
            setProgressInfo(null);
            setReadingTableData({});

            // 2. 일독 계획 데이터 삭제
            deleteBiblePlanData();

            // 3. SQLite reading_table 완전 삭제
            try {
                const deleteSql = `DELETE FROM reading_table`;
                await fetchSql(bibleSetting, deleteSql, []);
                console.log('SQLite reading_table 데이터 삭제 완료');
            } catch (sqlError) {
                console.error('SQLite 삭제 오류:', sqlError);
            }

            // 4. MMKV에서 성경 관련 데이터 삭제
            try {
                const allKeys = defaultStorage.getAllKeys();
                allKeys.forEach(key => {
                    if (key.startsWith('bible_') ||
                        key.startsWith('reading_') ||
                        key.includes('plan') ||
                        key === 'calender') {
                        defaultStorage.delete(key);
                        console.log('MMKV 키 삭제:', key);
                    }
                });
            } catch (mmkvError) {
                console.error('MMKV 삭제 오류:', mmkvError);
            }

            // 5. 앱 뱃지 초기화
            updateAppBadge(0);

            // 6. refreshKey 업데이트
            setRefreshKey(prev => prev + 1);

            // 7. 전역 새로고침 트리거
            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (resetAllData)');
                globalRefreshCallback();
                setTimeout(() => globalRefreshCallback(), 200);
                setTimeout(() => globalRefreshCallback(), 500);
            }

            // 8. 데이터 다시 로드
            setTimeout(async () => {
                await loadPlan();
                await loadAllReadingTableData();
                console.log('초기화 후 데이터 재로드 완료');
            }, 100);

            return true;
        } catch (error) {
            console.error('useBibleReading 초기화 오류:', error);
            return false;
        }
    }, [updateAppBadge, loadPlan, loadAllReadingTableData, globalRefreshCallback]);

    // 🆕 강제 새로고침 함수 추가
    const forceRefresh = useCallback(async () => {
        try {
            console.log('useBibleReading 강제 새로고침 시작');

            await loadPlan();
            await loadAllReadingTableData();
            setRefreshKey(prev => prev + 1);

            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (forceRefresh)');
                globalRefreshCallback();
            }

            console.log('useBibleReading 강제 새로고침 완료');
        } catch (error) {
            console.error('강제 새로고침 오류:', error);
        }
    }, [loadPlan, loadAllReadingTableData, globalRefreshCallback]);

    // reading_table에서 읽기 상태 확인 (개별 조회)
    const loadReadingTableData = useCallback(async (book: number, chapter: number): Promise<boolean> => {
        try {
            const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
                WHERE: {BOOK: '?', JANG: '?'}
            })}`;

            const result = await fetchSql(bibleSetting, settingSelectSql, [book, chapter], 0);
            const isRead = result ? JSON.parse(result.read) : false;

            // 캐시에 저장
            setReadingTableData(prev => ({
                ...prev,
                [`${book}_${chapter}`]: isRead
            }));

            return isRead;
        } catch (error) {
            console.log('reading_table 조회 오류:', error);
            return false;
        }
    }, []);

    // reading_table 상태 업데이트 함수
    const updateReadingTableCache = useCallback((book: number, chapter: number, isRead: boolean) => {
        const key = `${book}_${chapter}`;
        setReadingTableData(prev => ({
            ...prev,
            [key]: isRead
        }));

        if (globalRefreshCallback) {
            console.log('🔄 전역 새로고침 콜백 호출 (updateReadingTableCache)');
            setTimeout(() => {
                globalRefreshCallback();
            }, 100);
        }
    }, [globalRefreshCallback]);

    return {
        // 상태
        planData,
        missedCount,
        todayReading,
        yesterdayReading,
        progressInfo,
        readingTableData,
        refreshKey,

        // 함수들
        loadPlan,
        deletePlan,
        isChapterReadSync,
        markChapterAsRead,
        markChapterAsUnread,
        getChapterStatus,
        getChapterStyleWithExclamation,
        getTodayProgress,
        getYesterdayProgress,
        refreshData,
        updateProgressInfo,
        resetAllData,

        // 전역 새로고침 관련
        registerGlobalRefreshCallback,
        unregisterGlobalRefreshCallback,

        // 데이터 로드 함수
        loadAllReadingTableData,
        loadReadingTableData,
        updateReadingTableCache,
        forceRefresh
    };
};