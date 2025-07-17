// src/utils/useBibleReading.ts
// 🔥 시간 기반 성경 읽기 훅
import { BibleStep } from './define';
import { useCallback, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import {
    loadBiblePlanData,
    saveBiblePlanData,
    deleteBiblePlanData,
    getTodayChapters,
    getChapterStatus,
    calculateProgress,
    markChapterAsRead as markChapterAsReadUtil,
    formatDate,
    formatReadingTime
} from './biblePlanUtils';
import {
    TimeBasedBiblePlan,
    getDailyReading
} from './timeBasedBibleSystem';

// 앱 배지 업데이트 함수 (플랫폼별 구현 필요)
const updateAppBadge = (count: number) => {
    // React Native에서는 별도 라이브러리 필요
    console.log(`📱 앱 배지 업데이트: ${count}`);
};

const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
};

const getBookRangeForPlan = (planType: string) => {
    switch (planType) {
        case 'full_bible': return { start: 1, end: 66 };
        case 'old_testament': return { start: 1, end: 39 };
        case 'new_testament': return { start: 40, end: 66 };
        case 'pentateuch': return { start: 1, end: 5 };
        case 'psalms': return { start: 19, end: 19 };
        default: return { start: 1, end: 66 };
    }
};

export const useBibleReading = (mark?: any) => {
    // 상태 관리
    const [planData, setPlanData] = useState<any>(null);
    const [todayReading, setTodayReading] = useState<any>(null);
    const [yesterdayReading, setYesterdayReading] = useState<any>(null);
    const [progressInfo, setProgressInfo] = useState<any>(null);
    const [missedCount, setMissedCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [globalRefreshCallback, setGlobalRefreshCallback] = useState<(() => void) | null>(null);

    const appState = useRef(AppState.currentState);

    const getChapterStatus = useCallback((planData: any, book: number, chapter: number) => {
        if (!planData || !planData.isTimeBasedCalculation) {
            return 'normal';
        }

        try {
            // 읽기 완료 확인
            const isRead = planData.readChapters?.some(
                (r: any) => r.book === book && r.chapter === chapter && r.isRead
            );
            if (isRead) return 'completed';

            // 현재 날짜 계산
            const currentDay = getCurrentDay(planData.startDate);

            // 🔥 dailyReadingSchedule이 있는 경우 (정확한 계산)
            if (planData.dailyReadingSchedule && Array.isArray(planData.dailyReadingSchedule) && planData.dailyReadingSchedule.length > 0) {
                console.log(`📅 일정 기반 상태 확인: ${book}권 ${chapter}장, 현재일: ${currentDay}`);

                // 오늘 읽을 장들 확인
                const todaySchedule = planData.dailyReadingSchedule.find(schedule => schedule.day === currentDay);
                if (todaySchedule && todaySchedule.chapters) {
                    const isTodayChapter = todaySchedule.chapters.some(ch => ch.book === book && ch.chapter === chapter);
                    if (isTodayChapter) {
                        console.log(`✅ ${book}권 ${chapter}장은 오늘 읽을 장`);
                        return 'today';
                    }
                }

                // 어제 읽을 장들 확인
                if (currentDay > 1) {
                    const yesterdaySchedule = planData.dailyReadingSchedule.find(schedule => schedule.day === currentDay - 1);
                    if (yesterdaySchedule && yesterdaySchedule.chapters) {
                        const isYesterdayChapter = yesterdaySchedule.chapters.some(ch => ch.book === book && ch.chapter === chapter);
                        if (isYesterdayChapter) {
                            console.log(`📅 ${book}권 ${chapter}장은 어제 읽을 장`);
                            return 'yesterday';
                        }
                    }
                }

                // 과거에 읽어야 했던 장들 확인 (missed)
                for (let day = 1; day < currentDay - 1; day++) {
                    const pastSchedule = planData.dailyReadingSchedule.find(schedule => schedule.day === day);
                    if (pastSchedule && pastSchedule.chapters) {
                        const isPastChapter = pastSchedule.chapters.some(ch => ch.book === book && ch.chapter === chapter);
                        if (isPastChapter) {
                            console.log(`⚠️ ${book}권 ${chapter}장은 놓친 장 (${day}일)`);
                            return 'missed';
                        }
                    }
                }

                // 미래에 읽을 장들 확인
                for (let day = currentDay + 1; day <= planData.totalDays; day++) {
                    const futureSchedule = planData.dailyReadingSchedule.find(schedule => schedule.day === day);
                    if (futureSchedule && futureSchedule.chapters) {
                        const isFutureChapter = futureSchedule.chapters.some(ch => ch.book === book && ch.chapter === chapter);
                        if (isFutureChapter) {
                            return 'future';
                        }
                    }
                }
            } else {
                // 🔥 dailyReadingSchedule이 없는 경우 - 간단한 계산으로 대체
                console.warn(`⚠️ dailyReadingSchedule이 없음, 간단한 계산 사용 (${planData.planType})`);

                // 계획 범위 확인
                const bookRange = getBookRangeForPlan(planData.planType);
                if (book < bookRange.start || book > bookRange.end) {
                    return 'normal';
                }

                // 🔥 간단한 순차 진행 계산
                const chapterIndex = getChapterIndexInPlan(book, chapter, planData.planType);
                const chaptersPerDay = planData.chaptersPerDay || Math.ceil(planData.totalChapters / planData.totalDays);

                // 현재까지 읽어야 할 장 수
                const shouldReadByNow = (currentDay - 1) * chaptersPerDay;
                const shouldReadToday = currentDay * chaptersPerDay;

                if (chapterIndex <= shouldReadByNow) {
                    return 'missed'; // 이미 읽었어야 할 장
                } else if (chapterIndex <= shouldReadToday) {
                    console.log(`✅ ${book}권 ${chapter}장은 오늘 읽을 장 (간단 계산)`);
                    return 'today'; // 오늘 읽을 장
                } else {
                    return 'future'; // 미래에 읽을 장
                }
            }

            return 'normal';
        } catch (error) {
            console.error('getChapterStatus 오류:', error);
            return 'normal';
        }
    }, []);

    const getChapterIndexInPlan = (book: number, chapter: number, planType: string): number => {
        const range = getBookRangeForPlan(planType);
        let index = 0;

        // 해당 책 이전의 모든 장 수 계산
        for (let b = range.start; b < book; b++) {
            const bookInfo = BibleStep.find(step => step.index === b);
            if (bookInfo) {
                index += bookInfo.count;
            }
        }

        // 현재 책의 해당 장까지 추가
        return index + chapter;
    };

    // 🔥 계획 데이터 로드
    const loadPlanData = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('📚 계획 데이터 로드 시작');

            const plan = loadBiblePlanData();
            if (plan) {
                setPlanData(plan);
                console.log('✅ 계획 데이터 로드 완료:', plan.planType);

                // 오늘 읽을 장 계산
                const todayChapters = getTodayChapters(plan);
                setTodayReading(todayChapters);

                // 어제 읽을 장 계산 (시간 기반 계획만)
                if (plan.isTimeBasedCalculation) {
                    const currentDay = getCurrentDay(plan.startDate);
                    if (currentDay > 1) {
                        const yesterdayReading = getDailyReading(plan, currentDay - 1);
                        setYesterdayReading(yesterdayReading?.chapters || []);
                    }
                }

                // 진행률 계산
                const progress = calculateProgress(plan);
                setProgressInfo(progress);
                setMissedCount(progress.missedChapters || 0);

                // 앱 배지 업데이트 (오늘 읽을 장 중 안 읽은 것)
                const unreadTodayCount = todayChapters.filter(ch => !ch.isRead).length;
                updateAppBadge(unreadTodayCount);

            } else {
                console.log('📚 저장된 계획 없음');
                setPlanData(null);
                setTodayReading([]);
                setYesterdayReading([]);
                setProgressInfo(null);
                setMissedCount(0);
                updateAppBadge(0);
            }

        } catch (error) {
            console.error('❌ 계획 데이터 로드 오류:', error);
            setPlanData(null);
            setTodayReading([]);
            setProgressInfo(null);
            setMissedCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 🔥 장 읽음 처리
    const markChapterAsRead = useCallback(async (book: number, chapter: number) => {
        if (!planData) {
            console.warn('⚠️ 계획 데이터가 없어 읽기 처리 불가');
            return false;
        }

        try {
            console.log(`📖 장 읽음 처리: ${book}권 ${chapter}장`);

            // 이미 읽은 장인지 확인
            const isAlreadyRead = planData.readChapters?.some(
                (r: any) => r.book === book && r.chapter === chapter && r.isRead
            );

            if (isAlreadyRead) {
                console.log('이미 읽은 장입니다.');
                return true;
            }

            // 장 읽음 처리
            const updatedPlan = markChapterAsReadUtil(planData, book, chapter);
            if (!updatedPlan) {
                throw new Error('장 읽음 처리 실패');
            }

            // 상태 업데이트
            setPlanData(updatedPlan);
            saveBiblePlanData(updatedPlan);

            // 진행률 재계산
            const newProgress = calculateProgress(updatedPlan);
            setProgressInfo(newProgress);

            // 오늘 읽을 장 업데이트
            const updatedTodayChapters = getTodayChapters(updatedPlan);
            setTodayReading(updatedTodayChapters);

            // 앱 배지 업데이트
            const unreadTodayCount = updatedTodayChapters.filter(ch => !ch.isRead).length;
            updateAppBadge(unreadTodayCount);

            // 성공 메시지
            if (updatedPlan.isTimeBasedCalculation) {
                const chapterTime = updatedTodayChapters.find(
                    ch => ch.book === book && ch.chapter === chapter
                )?.estimatedMinutes || 0;

                Toast.show({
                    type: 'success',
                    text1: '읽기 완료! 🎉',
                    text2: `${formatReadingTime(chapterTime)} 분량을 읽으셨습니다.`
                });
            } else {
                Toast.show({
                    type: 'success',
                    text1: '읽기 완료! 🎉',
                    text2: '꾸준한 성경 읽기 습관을 만들어가고 있어요!'
                });
            }

            // 전역 새로고침 콜백 실행
            if (globalRefreshCallback) {
                globalRefreshCallback();
            }

            console.log('✅ 장 읽음 처리 완료');
            return true;

        } catch (error) {
            console.error('❌ 장 읽음 처리 오류:', error);
            Toast.show({
                type: 'error',
                text1: '읽기 처리 실패',
                text2: '다시 시도해주세요.'
            });
            return false;
        }
    }, [planData, globalRefreshCallback]);

    // 🔥 장 읽기 상태 확인 (동기화)
    const isChapterReadSync = useCallback((book: number, chapter: number): boolean => {
        if (!planData?.readChapters) return false;

        return planData.readChapters.some(
            (r: any) => r.book === book && r.chapter === chapter && r.isRead
        );
    }, [planData]);

    // 🔥 장 스타일 계산 (읽기 상태 + 일정 상태)
    const getChapterStyleInfo = useCallback((book: number, chapter: number) => {
        try {
            const isRead = isChapterReadSync(book, chapter);
            const status = planData ? getChapterStatus(planData, book, chapter) : 'normal';

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
                    style: { ...baseStyle, backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
                    textColor: '#FFFFFF',
                    showExclamation: false
                };
            }

            // 상태별 처리
            switch (status) {
                case 'today':
                    return {
                        style: { ...baseStyle, backgroundColor: '#F44336', borderColor: '#F44336' },
                        textColor: '#FFFFFF',
                        showExclamation: false
                    };
                case 'yesterday':
                    return {
                        style: { ...baseStyle, backgroundColor: '#2196F3', borderColor: '#2196F3' },
                        textColor: '#FFFFFF',
                        showExclamation: true // 🔥 어제 안 읽은 장에 느낌표 표시
                    };
                case 'missed':
                    return {
                        style: { ...baseStyle, backgroundColor: '#FF9800', borderColor: '#FF9800' },
                        textColor: '#FFFFFF',
                        showExclamation: true // 🔥 놓친 장에 느낌표 표시
                    };
                case 'future':
                    return {
                        style: { ...baseStyle, backgroundColor: 'transparent', borderColor: '#E0E0E0' },
                        textColor: '#999999',
                        showExclamation: false
                    };
                default:
                    return {
                        style: { ...baseStyle, backgroundColor: 'transparent', borderColor: '#E0E0E0' },
                        textColor: '#000000',
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
                    backgroundColor: 'transparent'
                },
                textColor: '#000000',
                showExclamation: false
            };
        }
    }, [planData, isChapterReadSync]);

    // 🔥 계획 삭제
    const deletePlan = useCallback(() => {
        try {
            deleteBiblePlanData();
            setPlanData(null);
            setTodayReading([]);
            setYesterdayReading([]);
            setProgressInfo(null);
            setMissedCount(0);
            updateAppBadge(0);

            Toast.show({
                type: 'success',
                text1: '일독 계획이 삭제되었습니다.',
                text2: '새로운 계획을 세워보세요!'
            });

            if (globalRefreshCallback) {
                globalRefreshCallback();
            }

        } catch (error) {
            console.error('계획 삭제 오류:', error);
            Toast.show({
                type: 'error',
                text1: '삭제 중 오류가 발생했습니다.',
                text2: '다시 시도해주세요.'
            });
        }
    }, [globalRefreshCallback]);

    // 🔥 전역 새로고침 콜백 등록/해제
    const registerGlobalRefreshCallback = useCallback((callback: () => void) => {
        console.log('🔄 전역 새로고침 콜백 등록됨');
        setGlobalRefreshCallback(() => callback);
    }, []);

    const unregisterGlobalRefreshCallback = useCallback(() => {
        console.log('🔄 전역 새로고침 콜백 해제됨');
        setGlobalRefreshCallback(null);
    }, []);

    // 🔥 수동 새로고침
    const refreshAllData = useCallback(async () => {
        console.log('🔄 수동 데이터 새로고침 시작');
        await loadPlanData();

        if (globalRefreshCallback) {
            globalRefreshCallback();
        }
    }, [loadPlanData, globalRefreshCallback]);

    // 🔥 앱 상태 변경 감지
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                console.log('📱 앱이 포그라운드로 복귀 - 데이터 새로고침');
                loadPlanData();
            }
            appState.current = nextAppState;
        });

        return () => subscription?.remove();
    }, [loadPlanData]);

    // 🔥 초기 데이터 로드
    useEffect(() => {
        loadPlanData();
    }, [loadPlanData]);

    // 🔥 mark 데이터 변경 감지 (외부 의존성)
    useEffect(() => {
        if (mark) {
            console.log('📋 Mark 데이터 변경 감지 - 새로고침');
            loadPlanData();
        }
    }, [mark, loadPlanData]);

    return {
        // 데이터
        planData,
        todayReading,
        yesterdayReading,
        progressInfo,
        missedCount,
        isLoading,
        getChapterStatus,
        // 함수
        markChapterAsRead,
        isChapterReadSync,
        getChapterStyleInfo,
        deletePlan,
        refreshAllData,

        // 콜백 관리
        registerGlobalRefreshCallback,
        unregisterGlobalRefreshCallback,

        // 유틸리티
        formatDate,
        formatReadingTime,
        /*getChapterStatus: (book: number, chapter: number) =>
            planData ? getChapterStatus(planData, book, chapter) : 'normal'*/
    };
};