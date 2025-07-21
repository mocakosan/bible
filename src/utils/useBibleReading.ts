// src/utils/useBibleReading.ts
// 🔥 통합된 성경 읽기 관리 훅 - 시간 기반 시스템 지원

import { useState, useCallback, useEffect } from 'react';
import { Toast } from 'react-native-toast-message';
import {
    loadBiblePlanData,
    saveBiblePlanData,
    UnifiedBiblePlan,
    getTodayChapters as getUnifiedTodayChapters,
    calculateProgress as calculateUnifiedProgress,
    markChapterAsRead as markChapterAsReadUtil,
    getChapterStatus as getUnifiedChapterStatus,
    isChapterReadSync as isUnifiedChapterRead,
    calculateMissedChapters,
    getYesterdayChapters,
    isTimeBasedPlan,
    formatMinutesToTime
} from './biblePlanUtils';
import {
    TimeBasedBiblePlan,
    getCurrentDay,
    getDailyReading,
    formatReadingTime
} from './timeBasedBibleSystem';
import { BibleStep } from './define';

// 전역 새로고침 콜백 관리
let globalRefreshCallback: (() => void) | null = null;

export const registerGlobalRefreshCallback = (callback: () => void) => {
    globalRefreshCallback = callback;
    console.log('🔄 전역 새로고침 콜백 등록됨');
};

export const unregisterGlobalRefreshCallback = () => {
    globalRefreshCallback = null;
    console.log('🔄 전역 새로고침 콜백 해제됨');
};

/**
 * 🔥 통합된 성경 읽기 관리 훅 - 시간 기반 시스템 우선 지원
 */
export const useBibleReading = () => {
    // 상태 관리
    const [planData, setPlanData] = useState<UnifiedBiblePlan | null>(null);
    const [todayReading, setTodayReading] = useState<any[]>([]);
    const [yesterdayReading, setYesterdayReading] = useState<any[]>([]);
    const [missedReading, setMissedReading] = useState<any[]>([]);
    const [progressInfo, setProgressInfo] = useState<{
        progressPercentage: number;
        readChapters?: number;
        totalChapters?: number;
        totalReadMinutes?: number;
        totalMinutes?: number;
        expectedProgressPercentage?: number;
        currentDay?: number;
        totalDays?: number;
        isAhead?: boolean;
        isBehind?: boolean;
    }>({ progressPercentage: 0 });
    const [isLoading, setIsLoading] = useState(false);

    /**
     * 🔥 계획 데이터 로드 및 상태 업데이트
     */
    const loadPlanData = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('📚 계획 데이터 로드 시작');

            const loadedPlan = loadBiblePlanData();
            setPlanData(loadedPlan);

            if (loadedPlan) {
                console.log(`📚 계획 로드 완료: ${loadedPlan.planType} (시간 기반: ${isTimeBasedPlan(loadedPlan)})`);

                // 🔥 시간 기반 계획인 경우
                if (isTimeBasedPlan(loadedPlan)) {
                    await updateTimeBasedReadingState(loadedPlan as TimeBasedBiblePlan);
                } else {
                    // 기존 계획 처리
                    await updateLegacyReadingState(loadedPlan);
                }
            } else {
                console.log('📚 저장된 계획 없음');
                resetReadingState();
            }

        } catch (error) {
            console.error('❌ 계획 데이터 로드 실패:', error);
            resetReadingState();
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 🔥 시간 기반 계획 읽기 상태 업데이트
     */
    const updateTimeBasedReadingState = useCallback(async (timeBasedPlan: TimeBasedBiblePlan) => {
        try {
            console.log('📊 시간 기반 읽기 상태 업데이트');

            // 오늘 읽을 장들
            const todayChapters = getUnifiedTodayChapters(timeBasedPlan);
            setTodayReading(todayChapters.map(ch => ({
                ...ch,
                status: getUnifiedChapterStatus(timeBasedPlan, ch.book, ch.chapter),
                formattedTime: formatReadingTime(ch.estimatedMinutes),
                isRead: isUnifiedChapterRead(timeBasedPlan, ch.book, ch.chapter)
            })));

            // 어제 읽을 장들
            const yesterdayChapters = getYesterdayChapters(timeBasedPlan);
            setYesterdayReading(yesterdayChapters.map(ch => ({
                ...ch,
                status: getUnifiedChapterStatus(timeBasedPlan, ch.book, ch.chapter),
                formattedTime: formatReadingTime(ch.estimatedMinutes),
                isRead: isUnifiedChapterRead(timeBasedPlan, ch.book, ch.chapter)
            })));

            // 놓친 장들 계산
            const missedCount = calculateMissedChapters(timeBasedPlan);
            setMissedReading([{ count: missedCount }]);

            // 진행률 정보
            const progress = calculateUnifiedProgress(timeBasedPlan);
            setProgressInfo({
                ...progress,
                formattedReadTime: formatReadingTime(progress.readMinutes || 0),
                formattedTotalTime: formatReadingTime(progress.totalMinutes || 0)
            });

            console.log(`📊 시간 기반 상태 업데이트 완료: 오늘 ${todayChapters.length}장, 진행률 ${progress.progressPercentage}%`);

        } catch (error) {
            console.error('❌ 시간 기반 읽기 상태 업데이트 실패:', error);
        }
    }, []);

    /**
     * 기존 계획 읽기 상태 업데이트 (호환성)
     */
    const updateLegacyReadingState = useCallback(async (legacyPlan: UnifiedBiblePlan) => {
        try {
            console.log('⚠️ 기존 시스템 읽기 상태 업데이트');

            // 기존 로직 유지
            const progress = calculateUnifiedProgress(legacyPlan);
            setProgressInfo(progress);

            // 기본값 설정
            setTodayReading([]);
            setYesterdayReading([]);
            setMissedReading([]);

        } catch (error) {
            console.error('❌ 기존 읽기 상태 업데이트 실패:', error);
        }
    }, []);

    /**
     * 읽기 상태 초기화
     */
    const resetReadingState = useCallback(() => {
        setTodayReading([]);
        setYesterdayReading([]);
        setMissedReading([]);
        setProgressInfo({ progressPercentage: 0 });
    }, []);

    /**
     * 🔥 장 읽기 완료 처리 (bookName 기반)
     */
    const markChapterAsRead = useCallback(async (bookName: string, chapter: number) => {
        if (!planData) {
            Toast.show({
                type: 'error',
                text1: '활성화된 계획이 없습니다'
            });
            return false;
        }

        try {
            console.log(`📖 장 읽기 완료 처리: ${bookName} ${chapter}장`);

            // bookName을 book 인덱스로 변환
            const bookInfo = BibleStep.find(step => step.name === bookName);
            if (!bookInfo) {
                console.error(`❌ 알 수 없는 성경: ${bookName}`);
                Toast.show({
                    type: 'error',
                    text1: '알 수 없는 성경책입니다'
                });
                return false;
            }

            // 장 읽기 완료 처리
            const updatedPlan = markChapterAsReadUtil(planData, bookInfo.index, chapter);
            if (updatedPlan) {
                setPlanData(updatedPlan);
                saveBiblePlanData(updatedPlan);

                // 🔥 읽기 상태 즉시 업데이트
                if (isTimeBasedPlan(updatedPlan)) {
                    await updateTimeBasedReadingState(updatedPlan as TimeBasedBiblePlan);
                } else {
                    await updateLegacyReadingState(updatedPlan);
                }

                // 전역 새로고침 트리거
                if (globalRefreshCallback) {
                    globalRefreshCallback();
                }

                Toast.show({
                    type: 'success',
                    text1: '읽기 완료!',
                    text2: `${bookName} ${chapter}장을 완료했습니다`
                });

                console.log(`✅ 장 읽기 완료: ${bookName} ${chapter}장`);
                return true;
            }

        } catch (error) {
            console.error('❌ 장 읽기 완료 처리 실패:', error);
            Toast.show({
                type: 'error',
                text1: '읽기 완료 처리 실패'
            });
        }

        return false;
    }, [planData, updateTimeBasedReadingState, updateLegacyReadingState]);

    /**
     * 🔥 장 상태 확인
     */
    const getChapterStatus = useCallback((bookName: string, chapter: number) => {
        if (!planData) return 'normal';

        // bookName을 book 인덱스로 변환
        const bookInfo = BibleStep.find(step => step.name === bookName);
        if (!bookInfo) return 'normal';

        return getUnifiedChapterStatus(planData, bookInfo.index, chapter);
    }, [planData]);

    /**
     * 🔥 장 읽기 여부 확인
     */
    const isChapterRead = useCallback((bookName: string, chapter: number) => {
        if (!planData) return false;

        // bookName을 book 인덱스로 변환
        const bookInfo = BibleStep.find(step => step.name === bookName);
        if (!bookInfo) return false;

        return isUnifiedChapterRead(planData, bookInfo.index, chapter);
    }, [planData]);

    /**
     * 🔥 계획 새로고침
     */
    const refreshPlan = useCallback(async () => {
        console.log('🔄 계획 새로고침');
        await loadPlanData();
    }, [loadPlanData]);

    /**
     * 🔥 대시보드 정보 가져오기
     */
    const getDashboardInfo = useCallback(() => {
        if (!planData) return null;

        if (isTimeBasedPlan(planData)) {
            const timeBasedPlan = planData as TimeBasedBiblePlan;
            const currentDay = getCurrentDay(timeBasedPlan);
            const currentDayReading = getDailyReading(timeBasedPlan, currentDay);

            return {
                planType: planData.planType,
                planName: planData.planName,
                isTimeBasedPlan: true,
                currentDay,
                totalDays: planData.totalDays,
                calculatedMinutesPerDay: timeBasedPlan.calculatedMinutesPerDay, // 🔥 자동 계산된 시간
                formattedDailyTime: formatReadingTime(timeBasedPlan.calculatedMinutesPerDay),
                totalMinutes: planData.totalMinutes,
                formattedTotalTime: formatReadingTime(planData.totalMinutes || 0),
                currentDayReading,
                todayChapters: todayReading,
                progressInfo
            };
        } else {
            // 기존 계획 정보
            return {
                planType: planData.planType,
                planName: planData.planName,
                isTimeBasedPlan: false,
                progressInfo
            };
        }
    }, [planData, todayReading, progressInfo]);

    // 🔥 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        loadPlanData();
    }, [loadPlanData]);

    // 🔥 전역 새로고침 콜백 등록
    useEffect(() => {
        registerGlobalRefreshCallback(refreshPlan);
        return () => unregisterGlobalRefreshCallback();
    }, [refreshPlan]);

    return {
        // 상태
        planData,
        todayReading,
        yesterdayReading,
        missedReading,
        progressInfo,
        isLoading,

        // 액션
        markChapterAsRead,
        getChapterStatus,
        isChapterRead,
        refreshPlan,
        loadPlanData,

        // 정보
        getDashboardInfo,

        // 유틸리티
        isTimeBasedPlan: planData ? isTimeBasedPlan(planData) : false,
        formatTime: formatReadingTime
    };
};