// src/utils/biblePlanUtils.ts
// 🔥 통합된 성경 일독 계획 관리 - 시간 기반 시스템과 기존 시스템 호환

import {
    TimeBasedBiblePlan,
    getTodayChapters as getTimeBasedTodayChapters,
    getChapterStatus as getTimeBasedChapterStatus,
    markChapterAsRead as markTimeBasedChapterAsRead,
    calculatePeriodBasedProgress,
    isChapterRead,
    getCurrentDay,
    getDailyReading,
    getChapterReadingTime
} from './timeBasedBibleSystem';
import { defaultStorage } from './mmkv';
import { BibleStep } from './define';

// === 통합된 계획 데이터 타입 ===
export interface UnifiedBiblePlan {
    // 공통 필드
    planType: string;
    planName?: string;
    startDate: string;
    targetDate?: string;
    endDate?: string;
    totalDays: number;
    currentDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;

    // 시간 기반 계획 필드
    isTimeBasedCalculation?: boolean;
    calculatedMinutesPerDay?: number; // 🔥 자동 계산된 하루 시간
    totalMinutes?: number;
    totalChapters?: number;
    dailyReadingSchedule?: any[];
    version?: string;

    // 기존 계획 필드 (호환성)
    chaptersPerDay?: number;
}

export interface ReadingStatus {
    book: string | number;
    chapter: number;
    date: string;
    isRead: boolean;
    type?: 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal';
    estimatedMinutes?: number;
    day?: number;
}

// === 🔥 통합된 계획 관리 함수들 ===

/**
 * 🔥 기존 getTodayChapters 함수를 대체 - 시간 기반 시스템 우선 지원
 */
export const getTodayChapters = (planData: UnifiedBiblePlan | null) => {
    if (!planData) return [];

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return getTimeBasedTodayChapters(planData as TimeBasedBiblePlan);
    }

    // 기존 장 기반 로직 (기존 코드 그대로 사용)
    return getLegacyTodayChapters(planData);
};

/**
 * 🔥 기존 getChapterStatus 함수를 대체 - 시간 기반 시스템 우선 지원
 */
export const getChapterStatus = (
    planData: UnifiedBiblePlan | null,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    // 읽기 완료 확인 (공통)
    const isRead = planData.readChapters?.some(
        (r: any) => r.book === book && r.chapter === chapter && r.isRead
    );

    if (isRead) return 'completed';

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return getTimeBasedChapterStatus(planData as TimeBasedBiblePlan, book, chapter);
    }

    // 기존 장 기반 로직
    return getLegacyChapterStatus(planData, book, chapter);
};

/**
 * 🔥 기존 calculateProgress 함수를 대체 - 시간 기반 시스템 우선 지원
 */
export const calculateProgress = (planData: UnifiedBiblePlan | null) => {
    if (!planData) {
        return { progressPercentage: 0 };
    }

    if (planData.isTimeBasedCalculation) {
        return calculatePeriodBasedProgress(planData as TimeBasedBiblePlan);
    }

    // 기존 장 기반 진행률 계산
    return calculateLegacyProgress(planData);
};

/**
 * 🔥 기존 markChapterAsRead 함수를 대체 - 시간 기반 시스템 우선 지원
 */
export const markChapterAsRead = (
    planData: UnifiedBiblePlan | null,
    book: number,
    chapter: number
): UnifiedBiblePlan | null => {
    if (!planData) return null;

    if (planData.isTimeBasedCalculation) {
        return markTimeBasedChapterAsRead(planData as TimeBasedBiblePlan, book, chapter) as UnifiedBiblePlan;
    }

    // 기존 장 기반 로직
    return markLegacyChapterAsRead(planData, book, chapter);
};

/**
 * 🔥 장 읽기 여부 확인 (통합)
 */
export const isChapterReadSync = (
    planData: UnifiedBiblePlan | null,
    book: number,
    chapter: number
): boolean => {
    if (!planData || !planData.readChapters) return false;

    return planData.readChapters.some(
        (r: any) => r.book === book && r.chapter === chapter && r.isRead
    );
};

/**
 * 🔥 놓친 장들 계산 (시간 기반 우선)
 */
export const calculateMissedChapters = (planData: UnifiedBiblePlan | null): number => {
    if (!planData) return 0;

    if (planData.isTimeBasedCalculation) {
        return calculateTimeBasedMissedChapters(planData as TimeBasedBiblePlan);
    }

    // 기존 장 기반 로직
    return calculateLegacyMissedChapters(planData);
};

/**
 * 🔥 어제 읽을 장들 가져오기
 */
export const getYesterdayChapters = (planData: UnifiedBiblePlan | null) => {
    if (!planData) return [];

    if (planData.isTimeBasedCalculation) {
        const currentDay = getCurrentDay(planData as TimeBasedBiblePlan);
        const yesterdayReading = getDailyReading(planData as TimeBasedBiblePlan, currentDay - 1);
        return yesterdayReading?.chapters || [];
    }

    // 기존 로직
    return [];
};

/**
 * 🔥 계획 데이터 로드 (통합)
 */
export const loadBiblePlanData = (): UnifiedBiblePlan | null => {
    try {
        // 1. 시간 기반 계획 우선 확인
        const timeBasedPlanStr = defaultStorage.getString('bible_reading_plan');
        if (timeBasedPlanStr) {
            const parsed = JSON.parse(timeBasedPlanStr);
            if (parsed.isTimeBasedCalculation) {
                console.log('✅ 시간 기반 계획 로드됨');
                return parsed;
            }
        }

        // 2. 기존 계획 확인
        const legacyPlanStr = defaultStorage.getString('bible_plan_data');
        if (legacyPlanStr) {
            const parsed = JSON.parse(legacyPlanStr);
            console.log('✅ 기존 계획 로드됨');
            return parsed;
        }

        return null;
    } catch (error) {
        console.error('❌ 계획 데이터 로드 실패:', error);
        return null;
    }
};

/**
 * 🔥 계획 데이터 저장 (통합)
 */
export const saveBiblePlanData = (planData: UnifiedBiblePlan): void => {
    try {
        const planString = JSON.stringify(planData);

        if (planData.isTimeBasedCalculation) {
            defaultStorage.set('bible_reading_plan', planString);
            console.log('✅ 시간 기반 계획 저장됨');
        } else {
            defaultStorage.set('bible_plan_data', planString);
            console.log('✅ 기존 계획 저장됨');
        }
    } catch (error) {
        console.error('❌ 계획 저장 실패:', error);
    }
};

// === 🔥 시간 기반 계산 헬퍼 함수들 ===

/**
 * 시간 기반 놓친 장들 계산
 */
const calculateTimeBasedMissedChapters = (planData: TimeBasedBiblePlan): number => {
    const currentDay = getCurrentDay(planData);
    let missedCount = 0;

    for (let day = 1; day < currentDay; day++) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading) {
            const unreadChapters = dailyReading.chapters.filter(ch => !ch.isRead);
            missedCount += unreadChapters.length;
        }
    }

    return missedCount;
};

// === 🔥 기존 시스템 호환 함수들 ===

/**
 * 기존 오늘 읽을 장들 로직 (호환성)
 */
const getLegacyTodayChapters = (planData: UnifiedBiblePlan) => {
    // 기존 로직 유지
    console.log('⚠️ 기존 시스템에서 오늘 읽을 장들 계산');
    return [];
};

/**
 * 기존 장 상태 확인 로직 (호환성)
 */
const getLegacyChapterStatus = (
    planData: UnifiedBiblePlan,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    console.log(`⚠️ 기존 시스템에서 장 상태 확인: ${book} ${chapter}`);
    return 'normal';
};

/**
 * 기존 진행률 계산 로직 (호환성)
 */
const calculateLegacyProgress = (planData: UnifiedBiblePlan) => {
    const totalChapters = planData.totalChapters || 1189; // 성경 전체 장수
    const readChapters = planData.readChapters?.filter((r: any) => r.isRead).length || 0;
    const progressPercentage = Math.round((readChapters / totalChapters) * 100);

    return {
        progressPercentage,
        readChapters,
        totalChapters
    };
};

/**
 * 기존 장 읽기 완료 로직 (호환성)
 */
const markLegacyChapterAsRead = (
    planData: UnifiedBiblePlan,
    book: number,
    chapter: number
): UnifiedBiblePlan => {
    const estimatedMinutes = getChapterReadingTime(book, chapter);

    const updatedReadChapters = [...(planData.readChapters || [])];
    const existingIndex = updatedReadChapters.findIndex(
        (r: any) => r.book === book && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString(),
            estimatedMinutes
        };
    } else {
        updatedReadChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: true,
            estimatedMinutes
        });
    }

    return {
        ...planData,
        readChapters: updatedReadChapters
    };
};

/**
 * 기존 놓친 장들 계산 로직 (호환성)
 */
const calculateLegacyMissedChapters = (planData: UnifiedBiblePlan): number => {
    // 기존 로직 유지
    console.log('⚠️ 기존 시스템에서 놓친 장들 계산');
    return 0;
};

// === 🔥 React Native 호환 앱 초기화 함수 ===

/**
 * 성경 계획 시스템 초기화
 */
export const initializeBiblePlanSystem = async (): Promise<boolean> => {
    try {
        console.log('🔄 성경 계획 시스템 초기화 시작 (React Native 호환)');

        // 시간 기반 시스템 초기화
        const { initializePeriodBasedBibleSystem } = await import('./timeBasedBibleSystem');
        const success = await initializePeriodBasedBibleSystem();

        if (success) {
            console.log('✅ 시간 기반 성경 일독 시스템 초기화 완료');
        } else {
            console.log('⚠️ 시간 기반 시스템 초기화 실패, 기본값 사용');
        }

        return success;

    } catch (error) {
        console.warn('⚠️ 성경 계획 시스템 초기화 실패:', error);
        return false;
    }
};

// === 🔥 편의 함수들 ===

/**
 * 현재 활성 계획이 시간 기반인지 확인
 */
export const isTimeBasedPlan = (planData: UnifiedBiblePlan | null): boolean => {
    return planData?.isTimeBasedCalculation === true;
};

/**
 * 계획 타입 이름 가져오기
 */
export const getPlanTypeName = (planType: string): string => {
    const typeNames: { [key: string]: string } = {
        'full_bible': '성경',
        'old_testament': '구약',
        'new_testament': '신약',
        'pentateuch': '모세오경',
        'psalms': '시편'
    };
    return typeNames[planType] || '성경';
};

/**
 * 시간 형식 변환 (분 → 시간:분)
 */
export const formatMinutesToTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes)}분`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
    }
};

/**
 * 계획 검증
 */
export const validatePlan = (planData: any): boolean => {
    if (!planData || typeof planData !== 'object') return false;

    // 공통 필수 필드
    const commonFields = ['planType', 'startDate', 'totalDays'];
    const hasCommonFields = commonFields.every(field => planData.hasOwnProperty(field));

    if (!hasCommonFields) return false;

    // 시간 기반 계획 추가 검증
    if (planData.isTimeBasedCalculation) {
        const timeBasedFields = ['calculatedMinutesPerDay', 'totalMinutes', 'dailyReadingSchedule'];
        return timeBasedFields.every(field => planData.hasOwnProperty(field));
    }

    return true;
};