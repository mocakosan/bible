// src/utils/biblePlanUtils.ts
// 🔥 통합된 성경 일독 계획 관리 - 시간 기반 시스템

import {
    TimeBasedBiblePlan,
    divideChaptersByPeriod,
    calculatePeriodBasedProgress,
    getTodayChapters as getTimeBasedTodayChapters,
    getDailyReading,
    getCurrentDay,
    markChapterAsRead as timeBasedMarkChapterAsRead,
    validatePlanData,
    ReadChapterStatus
} from './timeBasedBibleSystem';
import { defaultStorage } from './mmkv';
import {getPsalmReadingTime} from "./psalmsCalculationFix";

// === 타입 정의 ===
export interface BiblePlanData {
    planType: string;
    startDate: string;
    targetDate: string;
    totalDays: number;
    chaptersPerDay: number;
    totalChapters: number;
    currentDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;
}

export interface ReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    type?: 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal';
    estimatedMinutes?: number;
}

/**
 * 🔥 통합된 계획 데이터 로드
 */
export const loadBiblePlanData = (): TimeBasedBiblePlan | BiblePlanData | null => {
    try {
        // 새로운 시간 기반 계획 우선 확인
        const timeBasedPlan = defaultStorage.getString('bible_reading_plan');
        if (timeBasedPlan) {
            const parsed = JSON.parse(timeBasedPlan);
            if (validatePlanData(parsed)) {
                console.log('✅ 시간 기반 계획 로드됨');
                return parsed as TimeBasedBiblePlan;
            }
        }

        // 기존 계획 확인 (호환성)
        const legacyPlan = defaultStorage.getString('bible_plan');
        if (legacyPlan) {
            const parsed = JSON.parse(legacyPlan);
            console.log('✅ 기존 방식 계획 로드됨');
            return parsed as BiblePlanData;
        }

        return null;
    } catch (error) {
        console.error('계획 로드 오류:', error);
        return null;
    }
};

/**
 * 🔥 통합된 계획 데이터 저장
 */
export const saveBiblePlanData = (planData: TimeBasedBiblePlan | BiblePlanData): void => {
    try {
        if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
            // 새로운 시간 기반 계획
            defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
            console.log('💾 시간 기반 계획 저장됨');
        } else {
            // 기존 계획 (호환성)
            defaultStorage.set('bible_plan', JSON.stringify(planData));
            console.log('💾 기존 방식 계획 저장됨');
        }
    } catch (error) {
        console.error('계획 저장 오류:', error);
    }
};

/**
 * 🔥 통합된 계획 삭제
 */
export const deleteBiblePlanData = (): void => {
    try {
        defaultStorage.delete('bible_reading_plan'); // 새로운 시간 기반
        defaultStorage.delete('bible_plan'); // 기존 방식
        console.log('🗑️ 모든 계획 데이터 삭제됨');
    } catch (error) {
        console.error('계획 삭제 오류:', error);
    }
};

/**
 * 🔥 시간 기반 계획 생성
 */
export const createTimeBasedPlan = (
    planType: string,
    startDate: string,
    endDate: string
): TimeBasedBiblePlan => {
    return divideChaptersByPeriod(planType, startDate, endDate);
};

/**
 * 🔥 통합된 진행률 계산
 */
export const calculateProgress = (planData: any) => {
    if (!planData) {
        return { progressPercentage: 0 };
    }

    if (planData.isTimeBasedCalculation) {
        return calculateTimeBasedProgress(planData);
    }

    return calculateLegacyProgress(planData);
};

const calculateTimeBasedProgress = (planData: any) => {
    const currentDay = getCurrentDay(planData.startDate);
    const targetTime = planData.calculatedMinutesPerDay || planData.targetMinutesPerDay || 15;

    // 🔥 시편의 경우 정확한 시간 계산 사용
    const totalReadTime = planData.readChapters
        ?.filter((r: any) => r.isRead)
        ?.reduce((sum: number, r: any) => {
            if (r.book === 19) {
                // 시편의 경우 정확한 시간 사용
                return sum + getPsalmReadingTime(r.chapter);
            }
            return sum + (r.estimatedMinutes || 0);
        }, 0) || 0;

    const totalTargetTime = planData.totalDays * targetTime;
    const currentTargetTime = currentDay * targetTime;

    const progressPercentage = Math.min(100, (totalReadTime / totalTargetTime) * 100);
    const schedulePercentage = Math.min(100, (totalReadTime / currentTargetTime) * 100);

    return {
        progressPercentage,
        schedulePercentage,
        readMinutes: totalReadTime,
        targetMinutes: currentTargetTime,
        behindSchedule: totalReadTime < currentTargetTime
    };
};

/**
 * 🔥 통합된 오늘 읽을 장 조회
 */
export const getTodayChapters = (planData: BiblePlanData | TimeBasedBiblePlan | null): ReadingStatus[] => {
    if (!planData) return [];

    // 시간 기반 계획
    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        const chapters = getTimeBasedTodayChapters(planData as TimeBasedBiblePlan);
        return chapters.map(ch => ({
            book: ch.book,
            chapter: ch.chapter,
            date: ch.date,
            isRead: ch.isRead,
            type: 'today' as const,
            estimatedMinutes: ch.estimatedMinutes
        }));
    }

    // 기존 장 기반 로직
    return getLegacyTodayChapters(planData as BiblePlanData);
};

/**
 * 🔥 통합된 장 읽음 처리
 */
export const markChapterAsRead = (
    planData: BiblePlanData | TimeBasedBiblePlan | null,
    book: number,
    chapter: number
): BiblePlanData | TimeBasedBiblePlan | null => {
    if (!planData) return null;

    // 시간 기반 계획
    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        return timeBasedMarkChapterAsRead(planData as TimeBasedBiblePlan, book, chapter);
    }

    // 기존 장 기반 로직
    return markLegacyChapterAsRead(planData as BiblePlanData, book, chapter);
};

/**
 * 🔥 통합된 장 상태 확인
 */
export const getChapterStatus = (
    planData: BiblePlanData | TimeBasedBiblePlan | null,
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
    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        return getTimeBasedChapterStatus(planData as TimeBasedBiblePlan, book, chapter);
    }

    // 기존 장 기반 로직
    return getLegacyChapterStatus(planData as BiblePlanData, book, chapter);
};

/**
 * 놓친 장수 계산
 */
export const calculateMissedChapters = (planData: BiblePlanData | TimeBasedBiblePlan | null): number => {
    if (!planData) return 0;

    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        return calculateTimeBasedMissedChapters(planData as TimeBasedBiblePlan);
    }

    return calculateLegacyMissedChapters(planData as BiblePlanData);
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

/**
 * 시간 포맷팅
 */
export const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes)}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
};

// === 내부 헬퍼 함수들 ===

/**
 * 시간 기반 놓친 장수 계산
 */
function calculateTimeBasedMissedChapters(planData: TimeBasedBiblePlan): number {
    const currentDay = getCurrentDay(planData.startDate);
    const progress = calculatePeriodBasedProgress(planData);

    // 현재까지 읽어야 할 시간 기준으로 놓친 정도 계산
    const shouldReadMinutes = Math.min(currentDay, planData.totalDays) * planData.calculatedMinutesPerDay;
    const actualReadMinutes = progress.readMinutes;

    if (shouldReadMinutes <= actualReadMinutes) return 0;

    // 놓친 시간을 대략적인 장수로 변환 (평균 4분/장 기준)
    const missedMinutes = shouldReadMinutes - actualReadMinutes;
    return Math.round(missedMinutes / 4);
}

/**
 * 시간 기반 장 상태 확인
 */
function getTimeBasedChapterStatus(
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' {
    const currentDay = getCurrentDay(planData.startDate);

    // 오늘 읽어야 할 장들 확인
    const todayChapters = getTimeBasedTodayChapters(planData);
    const isToday = todayChapters.some(ch => ch.book === book && ch.chapter === chapter);
    if (isToday) return 'today';

    // 어제 읽어야 했던 장들 확인
    if (currentDay > 1) {
        const yesterdayReading = getDailyReading(planData, currentDay - 1);
        const isYesterday = yesterdayReading?.chapters.some(ch => ch.book === book && ch.chapter === chapter);
        if (isYesterday) return 'yesterday';
    }

    // 과거에 읽어야 했던 장인지 확인 (missed)
    for (let day = 1; day < currentDay - 1; day++) {
        const pastReading = getDailyReading(planData, day);
        const isPast = pastReading?.chapters.some(ch => ch.book === book && ch.chapter === chapter);
        if (isPast) return 'missed';
    }

    // 미래에 읽을 장
    return 'future';
}

/**
 * 기존 방식 오늘 읽을 장 (호환성)
 */
function getLegacyTodayChapters(planData: BiblePlanData): ReadingStatus[] {
    // 기존 로직 구현
    const currentDay = Math.min(planData.currentDay || 1, planData.totalDays);
    const startChapter = (currentDay - 1) * planData.chaptersPerDay + 1;
    const endChapter = Math.min(startChapter + planData.chaptersPerDay - 1, planData.totalChapters);

    const chapters: ReadingStatus[] = [];
    for (let i = startChapter; i <= endChapter; i++) {
        // 간단한 장 매핑 (실제 구현에서는 더 복잡할 수 있음)
        chapters.push({
            book: Math.ceil(i / 30), // 임시 계산
            chapter: i % 30 || 30,
            date: new Date().toISOString(),
            isRead: false,
            type: 'today'
        });
    }

    return chapters;
}

/**
 * 기존 방식 진행률 계산 (호환성)
 */
function calculateLegacyProgress(planData: BiblePlanData) {
    const readChapters = planData.readChapters?.filter(r => r.isRead)?.length || 0;
    const progressPercentage = (readChapters / planData.totalChapters) * 100;

    return {
        currentDay: planData.currentDay || 1,
        totalDays: planData.totalDays,
        readChapters,
        totalChapters: planData.totalChapters,
        progressPercentage: Math.round(progressPercentage * 10) / 10,
        missedChapters: calculateLegacyMissedChapters(planData)
    };
}

/**
 * 기존 방식 놓친 장수 계산 (호환성)
 */
function calculateLegacyMissedChapters(planData: BiblePlanData): number {
    const currentDay = planData.currentDay || 1;
    const shouldReadChapters = Math.min(currentDay * planData.chaptersPerDay, planData.totalChapters);
    const actualReadChapters = planData.readChapters?.filter(r => r.isRead)?.length || 0;

    return Math.max(0, shouldReadChapters - actualReadChapters);
}

/**
 * 기존 방식 장 상태 확인 (호환성)
 */
function getLegacyChapterStatus(
    planData: BiblePlanData,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' {
    // 기존 로직 구현 (간단 버전)
    const currentDay = planData.currentDay || 1;
    const chapterIndex = (book - 1) * 50 + chapter; // 임시 계산
    const todayStart = (currentDay - 1) * planData.chaptersPerDay + 1;
    const todayEnd = todayStart + planData.chaptersPerDay - 1;

    if (chapterIndex >= todayStart && chapterIndex <= todayEnd) {
        return 'today';
    } else if (chapterIndex < todayStart) {
        return currentDay > 1 ? 'missed' : 'normal';
    } else {
        return 'future';
    }
}

/**
 * 기존 방식 장 읽음 처리 (호환성)
 */
function markLegacyChapterAsRead(planData: BiblePlanData, book: number, chapter: number): BiblePlanData {
    const updatedReadChapters = [...(planData.readChapters || [])];
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === book && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString()
        };
    } else {
        updatedReadChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: true
        });
    }

    return {
        ...planData,
        readChapters: updatedReadChapters
    };
}