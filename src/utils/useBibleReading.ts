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
    getMissedChapters,
    getYesterdayChapters
} from './biblePlanUtils';
import {
    TimeBasedBiblePlan,
    formatTime,
    getCurrentDayFromPlan
} from './timeBasedBibleCalculator';

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
 * 🔥 통합된 성경 읽기 관리 훅
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
     * 🔥 계획 데이터 로드
     */
    const loadPlanData = useCallback(async (): Promise<UnifiedBiblePlan | null> => {
        try {
            setIsLoading(true);
            console.log('📂 계획 데이터 로드 시작...');

            const currentPlan = loadBiblePlanData();

            if (currentPlan) {
                setPlanData(currentPlan);
                console.log('✅ 계획 데이터 로드 완료:', {
                    planName: currentPlan.planName,
                    isTimeBased: currentPlan.isTimeBasedCalculation,
                    totalDays: currentPlan.totalDays
                });
            } else {
                setPlanData(null);
                console.log('📭 저장된 계획이 없음');
            }

            return currentPlan;

        } catch (error) {
            console.error('❌ 계획 데이터 로드 오류:', error);
            setPlanData(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 🔥 오늘 읽을 장들 로드 (시간 기반 계획 지원)
     */
    const loadTodayReading = useCallback(async () => {
        try {
            console.log('📖 오늘 읽을 장 로드 시작...');

            if (!planData) {
                console.log('📖 계획 데이터 없음');
                setTodayReading([]);
                return;
            }

            // 🔥 통합된 오늘 읽을 장 계산
            const todayChapters = getUnifiedTodayChapters(planData);

            console.log(`📖 오늘 읽을 장: ${todayChapters.length}개`);
            setTodayReading(todayChapters);

            // 시간 기반 계획인 경우 추가 정보 로그
            if (planData.isTimeBasedCalculation && todayChapters.length > 0) {
                const totalTime = todayChapters.reduce((sum, ch) => sum + (ch.totalSeconds || 180), 0);
                console.log(`⏰ 오늘 예상 읽기 시간: ${formatTime(totalTime)}`);
            }

            // 앱 배지 업데이트
            const unreadCount = todayChapters.filter(ch => !ch.isRead).length;
            updateAppBadge(unreadCount);

        } catch (error) {
            console.error('❌ 오늘 읽을 장 로드 오류:', error);
            setTodayReading([]);
        }
    }, [planData]);

    /**
     * 🔥 어제/놓친 장들 로드
     */
    const loadAdditionalReadings = useCallback(async () => {
        try {
            if (!planData) {
                setYesterdayReading([]);
                setMissedReading([]);
                return;
            }

            // 어제 읽을 장들
            const yesterdayChapters = getYesterdayChapters(planData);
            setYesterdayReading(yesterdayChapters);

            // 놓친 장들
            const missedChapters = getMissedChapters(planData);
            setMissedReading(missedChapters);

            console.log(`📅 어제 장: ${yesterdayChapters.length}개, 놓친 장: ${missedChapters.length}개`);

        } catch (error) {
            console.error('추가 읽기 데이터 로드 오류:', error);
            setYesterdayReading([]);
            setMissedReading([]);
        }
    }, [planData]);

    /**
     * 🔥 진행률 계산 (시간 기반 계획 지원)
     */
    const calculateProgress = useCallback((plan: UnifiedBiblePlan | null) => {
        if (!plan) {
            return {
                progressPercentage: 0,
                readChapters: 0,
                totalChapters: 0,
                totalReadMinutes: 0,
                totalMinutes: 0
            };
        }

        try {
            // 🔥 통합된 진행률 계산
            const progress = calculateUnifiedProgress(plan);
            console.log(`📊 진행률 계산 완료: ${progress.progressPercentage}%`);
            return progress;

        } catch (error) {
            console.error('❌ 진행률 계산 오류:', error);
            return {
                progressPercentage: 0,
                readChapters: 0,
                totalChapters: plan.totalChapters || 0,
                totalReadMinutes: 0,
                totalMinutes: plan.totalMinutes || 0
            };
        }
    }, []);

    /**
     * 🔥 장 읽음 처리 (시간 기반 계획 지원)
     */
    const markChapterAsRead = useCallback(async (book: string | number, chapter: number): Promise<boolean> => {
        try {
            console.log(`📚 장 읽음 처리 시작: ${book} ${chapter}장`);

            if (!planData) {
                Toast.show({
                    type: 'error',
                    text1: '계획 데이터가 없습니다',
                    text2: '계획을 먼저 설정해주세요'
                });
                return false;
            }

            // 이미 읽은 장인지 확인
            const isAlreadyRead = isUnifiedChapterRead(planData, book, chapter);
            if (isAlreadyRead) {
                Toast.show({
                    type: 'info',
                    text1: '이미 읽은 장입니다',
                    text2: '다른 장을 선택해주세요'
                });
                return true;
            }

            // 🔥 통합된 장 읽음 처리
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

            // 읽기 데이터 다시 로드
            await loadAllReadingData(updatedPlan);

            // 🔥 성공 메시지 (시간 기반 계획용)
            if (updatedPlan.isTimeBasedCalculation) {
                const chapterInfo = todayReading.find(
                    ch => {
                        const chBook = typeof ch.book === 'string' ? ch.book : convertBookNumberToAbbr(ch.book);
                        const targetBook = typeof book === 'string' ? book : convertBookNumberToAbbr(book);
                        return chBook === targetBook && ch.chapter === chapter;
                    }
                );

                const readingTime = chapterInfo ? formatTime(chapterInfo.totalSeconds || 180) : '약 3분';

                Toast.show({
                    type: 'success',
                    text1: '읽기 완료! 🎉',
                    text2: `${readingTime} 분량을 읽으셨습니다.`
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
    }, [planData, todayReading, calculateProgress]);

    /**
     * 🔥 모든 읽기 데이터 로드
     */
    const loadAllReadingData = useCallback(async (currentPlan?: UnifiedBiblePlan | null) => {
        try {
            const plan = currentPlan || planData;
            if (!plan) return;

            // 병렬로 모든 읽기 데이터 로드
            await Promise.all([
                loadTodayReading(),
                loadAdditionalReadings()
            ]);

        } catch (error) {
            console.error('전체 읽기 데이터 로드 오류:', error);
        }
    }, [planData, loadTodayReading, loadAdditionalReadings]);

    /**
     * 🔥 장 읽기 상태 확인 (동기화)
     */
    const isChapterReadSync = useCallback((book: string | number, chapter: number): boolean => {
        if (!planData) return false;

        try {
            return isUnifiedChapterRead(planData, book, chapter);
        } catch (error) {
            console.error('장 읽기 상태 확인 오류:', error);
            return false;
        }
    }, [planData]);

    /**
     * 🔥 장 스타일 계산 (읽기 상태 + 일정 상태)
     */
    const getChapterStyleInfo = useCallback((book: string | number, chapter: number) => {
        try {
            const isRead = isChapterReadSync(book, chapter);

            if (!planData) {
                return {
                    isRead: false,
                    status: 'normal' as const,
                    backgroundColor: '#f5f5f5',
                    textColor: '#333',
                    borderColor: '#ddd'
                };
            }

            // 🔥 통합된 장 상태 확인
            let status = getUnifiedChapterStatus(planData, book, chapter);

            if (isRead) {
                status = 'completed';
            }

            // 스타일 매핑
            const styleMap = {
                'today': { backgroundColor: '#e3f2fd', textColor: '#1976d2', borderColor: '#2196f3' },
                'yesterday': { backgroundColor: '#fff3e0', textColor: '#f57c00', borderColor: '#ff9800' },
                'missed': { backgroundColor: '#ffebee', textColor: '#d32f2f', borderColor: '#f44336' },
                'completed': { backgroundColor: '#e8f5e8', textColor: '#2e7d32', borderColor: '#4caf50' },
                'future': { backgroundColor: '#f5f5f5', textColor: '#666', borderColor: '#ddd' },
                'normal': { backgroundColor: '#f5f5f5', textColor: '#333', borderColor: '#ddd' }
            };

            return {
                isRead,
                status,
                ...styleMap[status]
            };

        } catch (error) {
            console.error('장 스타일 정보 계산 오류:', error);
            return {
                isRead: false,
                status: 'normal' as const,
                backgroundColor: '#f5f5f5',
                textColor: '#333',
                borderColor: '#ddd'
            };
        }
    }, [planData, isChapterReadSync]);

    /**
     * 🔥 전체 상태 새로고침
     */
    const refreshAll = useCallback(async () => {
        try {
            console.log('🔄 전체 상태 새로고침 시작...');
            setIsLoading(true);

            // 1. 계획 데이터 다시 로드
            const currentPlan = await loadPlanData();

            if (currentPlan) {
                // 2. 진행률 계산
                const progress = calculateProgress(currentPlan);
                setProgressInfo(progress);

                // 3. 모든 읽기 데이터 로드
                await loadAllReadingData(currentPlan);
            }

            console.log('✅ 전체 상태 새로고침 완료');

        } catch (error) {
            console.error('❌ 전체 상태 새로고침 오류:', error);
        } finally {
            setIsLoading(false);
        }
    }, [loadPlanData, calculateProgress, loadAllReadingData]);

    /**
     * 🔥 앱 배지 업데이트
     */
    const updateAppBadge = useCallback((count: number) => {
        try {
            // React Native의 배지 업데이트 로직
            // 실제 구현은 플랫폼에 따라 다름
            console.log(`🔢 앱 배지 업데이트: ${count}`);

            // iOS용 배지 업데이트 (예시)
            // import { PushNotificationIOS } from '@react-native-community/push-notification-ios';
            // PushNotificationIOS.setApplicationIconBadgeNumber(count);

            // Android용 배지 업데이트는 별도 라이브러리 필요

        } catch (error) {
            console.error('앱 배지 업데이트 오류:', error);
        }
    }, []);

    /**
     * 초기화 (컴포넌트 마운트 시)
     */
    useEffect(() => {
        console.log('🎯 useBibleReading 초기화...');

        const initializeHook = async () => {
            try {
                // 계획 데이터 로드
                const currentPlan = await loadPlanData();

                if (currentPlan) {
                    // 진행률 계산
                    const progress = calculateProgress(currentPlan);
                    setProgressInfo(progress);

                    // 읽기 데이터 로드
                    await loadAllReadingData(currentPlan);
                }

                console.log('✅ useBibleReading 초기화 완료');

            } catch (error) {
                console.error('❌ useBibleReading 초기화 오류:', error);
            }
        };

        initializeHook();
    }, []);

    /**
     * planData 변경 시 자동 업데이트
     */
    useEffect(() => {
        if (planData) {
            console.log('📊 계획 데이터 변경 감지 - 진행률 재계산');
            const progress = calculateProgress(planData);
            setProgressInfo(progress);
        }
    }, [planData, calculateProgress]);

    // 🔥 반환값
    return {
        // 상태
        planData,
        todayReading,
        yesterdayReading,
        missedReading,
        progressInfo,
        isLoading,

        // 액션
        loadPlanData,
        loadTodayReading,
        loadAdditionalReadings,
        markChapterAsRead,
        refreshAll,

        // 유틸리티
        isChapterReadSync,
        getChapterStyleInfo,
        calculateProgress,

        // 전역 콜백 관리
        registerGlobalRefreshCallback,
        unregisterGlobalRefreshCallback
    };
};

// === 헬퍼 함수들 ===

/**
 * 책 번호를 약자로 변환하는 헬퍼 함수
 */
const convertBookNumberToAbbr = (bookNumber: number): string => {
    const bookMapping: { [key: number]: string } = {
        1: 'Gen', 2: 'Exo', 3: 'Lev', 4: 'Num', 5: 'Deu',
        6: 'Jos', 7: 'Jdg', 8: 'Rut', 9: '1Sa', 10: '2Sa',
        11: '1Ki', 12: '2Ki', 13: '1Ch', 14: '2Ch', 15: 'Ezr',
        16: 'Neh', 17: 'Est', 18: 'Job', 19: 'Psa', 20: 'Pro',
        21: 'Ecc', 22: 'Son', 23: 'Isa', 24: 'Jer', 25: 'Lam',
        26: 'Eze', 27: 'Dan', 28: 'Hos', 29: 'Joe', 30: 'Amo',
        31: 'Oba', 32: 'Jon', 33: 'Mic', 34: 'Nah', 35: 'Hab',
        36: 'Zep', 37: 'Hag', 38: 'Zec', 39: 'Mal', 40: 'Mat',
        41: 'Mar', 42: 'Luk', 43: 'Joh', 44: 'Act', 45: 'Rom',
        46: '1Co', 47: '2Co', 48: 'Gal', 49: 'Eph', 50: 'Phi',
        51: 'Col', 52: '1Th', 53: '2Th', 54: '1Ti', 55: '2Ti',
        56: 'Tit', 57: 'Phm', 58: 'Heb', 59: 'Jam', 60: '1Pe',
        61: '2Pe', 62: '1Jo', 63: '2Jo', 64: '3Jo', 65: 'Jud', 66: 'Rev'
    };

    return bookMapping[bookNumber] || 'Gen';
};

/**
 * 🔥 단독 사용 가능한 유틸리티 함수들
 */

/**
 * 현재 계획의 기본 정보 가져오기
 */
export const getCurrentPlanInfo = () => {
    try {
        const planData = loadBiblePlanData();
        if (!planData) return null;

        return {
            exists: true,
            planName: planData.planName || '성경 읽기',
            planType: planData.planType,
            isTimeBasedCalculation: planData.isTimeBasedCalculation || false,
            startDate: planData.startDate,
            endDate: planData.endDate || planData.targetDate,
            totalDays: planData.totalDays,
            totalChapters: planData.totalChapters,
            totalMinutes: planData.totalMinutes,
            actualMinutesPerDay: planData.actualMinutesPerDay
        };

    } catch (error) {
        console.error('현재 계획 정보 가져오기 오류:', error);
        return null;
    }
};

/**
 * 간단한 진행률 확인
 */
export const getSimpleProgress = () => {
    try {
        const planData = loadBiblePlanData();
        if (!planData) return { progressPercentage: 0, hasData: false };

        const progress = calculateUnifiedProgress(planData);
        return {
            ...progress,
            hasData: true
        };

    } catch (error) {
        console.error('간단한 진행률 확인 오류:', error);
        return { progressPercentage: 0, hasData: false };
    }
};

/**
 * 오늘 읽을 장 개수만 확인
 */
export const getTodayChapterCount = () => {
    try {
        const planData = loadBiblePlanData();
        if (!planData) return 0;

        const todayChapters = getUnifiedTodayChapters(planData);
        const unreadCount = todayChapters.filter(ch => !ch.isRead).length;

        return unreadCount;

    } catch (error) {
        console.error('오늘 읽을 장 개수 확인 오류:', error);
        return 0;
    }
};

/**
 * 계획 존재 여부만 확인
 */
export const hasBiblePlan = (): boolean => {
    try {
        const planData = loadBiblePlanData();
        return planData !== null;
    } catch (error) {
        console.error('계획 존재 여부 확인 오류:', error);
        return false;
    }
};

/**
 * 🔥 시간 기반 계획 여부 확인
 */
export const isTimeBasedPlan = (): boolean => {
    try {
        const planData = loadBiblePlanData();
        return planData?.isTimeBasedCalculation === true;
    } catch (error) {
        console.error('시간 기반 계획 여부 확인 오류:', error);
        return false;
    }
};

/**
 * 🔥 오늘 예상 읽기 시간 가져오기 (시간 기반 계획용)
 */
export const getTodayExpectedReadingTime = (): { minutes: number; seconds: number; formatted: string } => {
    try {
        const planData = loadBiblePlanData();
        if (!planData || !planData.isTimeBasedCalculation) {
            return { minutes: 0, seconds: 0, formatted: '0분' };
        }

        const todayChapters = getUnifiedTodayChapters(planData);
        const totalSeconds = todayChapters.reduce((sum, ch) => sum + (ch.totalSeconds || 180), 0);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return {
            minutes,
            seconds,
            formatted: formatTime(totalSeconds)
        };

    } catch (error) {
        console.error('오늘 예상 읽기 시간 확인 오류:', error);
        return { minutes: 0, seconds: 0, formatted: '0분' };
    }
};

/**
 * 🔥 계획별 통계 정보 (대시보드용)
 */
export const getPlanDashboardStats = () => {
    try {
        const planData = loadBiblePlanData();
        if (!planData) return null;

        const progress = calculateUnifiedProgress(planData);
        const todayChapters = getUnifiedTodayChapters(planData);
        const missedChapters = getMissedChapters(planData);

        const stats = {
            // 기본 정보
            planName: planData.planName || '성경 읽기',
            isTimeBasedCalculation: planData.isTimeBasedCalculation || false,

            // 진행률 정보
            progressPercentage: progress.progressPercentage,
            readChapters: progress.readChapters,
            totalChapters: progress.totalChapters,

            // 오늘 정보
            todayTotal: todayChapters.length,
            todayCompleted: todayChapters.filter(ch => ch.isRead).length,
            todayRemaining: todayChapters.filter(ch => !ch.isRead).length,

            // 놓친 장 정보
            missedTotal: missedChapters.length,

            // 시간 정보 (시간 기반 계획만)
            ...(planData.isTimeBasedCalculation && {
                totalMinutes: planData.totalMinutes,
                actualMinutesPerDay: planData.actualMinutesPerDay,
                totalReadMinutes: progress.totalReadMinutes,
                todayExpectedTime: getTodayExpectedReadingTime(),
                currentDay: getCurrentDayFromPlan(planData as TimeBasedBiblePlan),
                totalDays: planData.totalDays
            })
        };

        return stats;

    } catch (error) {
        console.error('대시보드 통계 생성 오류:', error);
        return null;
    }
};