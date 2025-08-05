// src/utils/biblePlanCalculator.ts
// 성경 일독 계획 계산 로직 - 시간 기반 계산 추가

import { BibleStep } from './define';
import { calculateReadingEstimate, createTimeBasedReadingPlan } from './timeBasedBibleReading';
import { loadChapterTimeDataFromCSV, getChapterTimeDataForPlan } from './csvDataLoader';

// 타입 정의
export interface BibleReadingPlanCalculation {
    planType: string;
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    estimatedEndDate?: Date;

    // 시간 기반 필드
    targetMinutesPerDay?: number;
    isTimeBasedCalculation?: boolean;
    averageTimePerDay?: string;
    totalReadingTime?: string;
}

export interface BiblePlanTypeDetail {
    id: string;
    name: string;
    description: string;
    totalChapters: number;
    estimatedDays: number;
    books: number[];
    bookRange?: [number, number];
}

// 추가 타입 정의
export interface ChapterReading {
    bookIndex: number;
    bookName: string;
    chapter: number;
    isCompleted?: boolean;
}

export interface DailyReading {
    date: Date;
    dayNumber: number;
    chapters: ChapterReading[];
    totalChapters: number;
    completedChapters?: number;
}

// 성경 일독 계획 타입 상세 정보
export const DETAILED_BIBLE_PLAN_TYPES: BiblePlanTypeDetail[] = [
    {
        id: 'full_bible',
        name: '성경 전체',
        description: '창세기부터 요한계시록까지',
        totalChapters: 1189,
        estimatedDays: 365,
        books: Array.from({ length: 66 }, (_, i) => i + 1),
        bookRange: [1, 66]
    },
    {
        id: 'old_testament',
        name: '구약',
        description: '창세기부터 말라기까지',
        totalChapters: 929,
        estimatedDays: 270,
        books: Array.from({ length: 39 }, (_, i) => i + 1),
        bookRange: [1, 39]
    },
    {
        id: 'new_testament',
        name: '신약',
        description: '마태복음부터 요한계시록까지',
        totalChapters: 260,
        estimatedDays: 90,
        books: Array.from({ length: 27 }, (_, i) => i + 40),
        bookRange: [40, 66]
    },
    {
        id: 'pentateuch',
        name: '모세오경',
        description: '창세기부터 신명기까지',
        totalChapters: 187,
        estimatedDays: 60,
        books: [1, 2, 3, 4, 5],
        bookRange: [1, 5]
    },
    {
        id: 'psalms',
        name: '시편',
        description: '시편 전체',
        totalChapters: 150,
        estimatedDays: 30,
        books: [19],
        bookRange: [19, 19]
    }
];

/**
 * 성경 일독 계획 계산 - 통합 버전
 */
export function calculateReadingPlan(
    planType: string,
    startDate: Date,
    endDate: Date,
    targetMinutesPerDay?: number
): {
    planType: string;
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    minutesPerDay: number;
    isTimeBasedCalculation: boolean
} {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const chaptersPerDay = Math.ceil(plan.totalChapters / totalDays);

    // 🔥 정확한 시간 계산을 위한 로직 추가
    let minutesPerDay = 0;

    try {
        // CSV 데이터에서 실제 시간 데이터 가져오기
        const timeData = getChapterTimeDataForPlan(plan.bookRange![0], plan.bookRange![1]);

        if (timeData && timeData.length > 0) {
            // 전체 읽기 시간 계산 (초 단위)
            const totalSeconds = timeData.reduce((sum, chapter) => sum + chapter.totalSeconds, 0);

            // 전체 분으로 변환
            const totalMinutes = totalSeconds / 60;

            // 하루 평균 시간 계산
            minutesPerDay = Math.round(totalMinutes / totalDays);

            console.log(`📊 ${planType} 계산 결과:
        - 총 ${timeData.length}장
        - 총 읽기 시간: ${Math.floor(totalMinutes / 60)}시간 ${Math.round(totalMinutes % 60)}분
        - 하루 평균: ${minutesPerDay}분
      `);
        } else {
            // CSV 데이터가 없는 경우 기본 추정치 사용
            // 성경별 평균 읽기 시간 (분/장)
            const estimatedMinutesPerChapter = getEstimatedMinutesPerChapter(planType);
            minutesPerDay = Math.round(chaptersPerDay * estimatedMinutesPerChapter);

            console.log(`⚠️ ${planType} 기본 추정치 사용: ${estimatedMinutesPerChapter}분/장`);
        }
    } catch (error) {
        console.error('시간 계산 오류:', error);
        // 오류 시 기본값 사용
        minutesPerDay = Math.round(chaptersPerDay * 4.5);
    }

    return {
        planType,
        totalDays,
        totalChapters: plan.totalChapters,
        chaptersPerDay,
        minutesPerDay, // 🔥 정확히 계산된 값
        isTimeBasedCalculation: false
    };
}

// 🔥 성경 타입별 예상 시간 (CSV 데이터가 없을 때 사용)
function getEstimatedMinutesPerChapter(planType: string): number {
    switch (planType) {
        case 'psalms':
            return 3.0; // 시편은 평균적으로 짧음
        case 'pentateuch':
            return 5.5; // 모세오경은 긴 장들이 많음
        case 'old_testament':
            return 4.8; // 구약은 평균적으로 김
        case 'new_testament':
            return 4.2; // 신약은 상대적으로 짧음
        case 'full_bible':
        default:
            return 4.5; // 전체 평균
    }
}

/**
 * 기존 장 기반 계산 (Legacy)
 */
function calculateLegacyReadingPlan(
    planType: string,
    startDate: Date,
    endDate: Date
): BibleReadingPlanCalculation {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const chaptersPerDay = Math.ceil(plan.totalChapters / totalDays);

    return {
        planType,
        totalDays,
        totalChapters: plan.totalChapters,
        chaptersPerDay,
        isTimeBasedCalculation: false
    };
}

/**
 * 계획별 성경 범위 반환
 */
export function getSelectedBooksForPlanType(planType: string): [number, number] {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    return plan?.bookRange || [1, 66];
}

/**
 * 계획별 총 장수 반환
 */
export function getTotalChaptersForPlanType(planType: string): number {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    return plan?.totalChapters || 1189;
}

/**
 * 특정 날짜의 읽기 계획 가져오기
 */
export function getDailyReading(
    planType: string,
    startDate: Date,
    targetDate: Date
): DailyReading {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
    }

    // 날짜 차이 계산
    const dayNumber = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 전체 일독 계획 일수 계산
    const totalDays = plan.estimatedDays;
    const chaptersPerDay = Math.ceil(plan.totalChapters / totalDays);

    // 해당 날짜의 시작 장과 끝 장 계산
    const startChapterIndex = (dayNumber - 1) * chaptersPerDay;
    const endChapterIndex = Math.min(startChapterIndex + chaptersPerDay, plan.totalChapters);

    const chapters: ChapterReading[] = [];
    let currentChapterIndex = 0;

    // 각 책별로 장 계산
    for (const book of plan.books) {
        const bookInfo = BibleStep.find(b => b.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            if (currentChapterIndex >= startChapterIndex && currentChapterIndex < endChapterIndex) {
                chapters.push({
                    bookIndex: book,
                    bookName: bookInfo.name,
                    chapter: chapter,
                    isCompleted: false
                });
            }
            currentChapterIndex++;
        }
    }

    return {
        date: targetDate,
        dayNumber,
        chapters,
        totalChapters: chapters.length,
        completedChapters: 0
    };
}

/**
 * 진도 계산 - 통합 버전
 */
export function calculateProgressWithPlanType(
    planType: string,
    startDate: Date,
    currentDate: Date,
    readChapters: Array<{ book: number; chapter: number; isRead: boolean }>,
    targetMinutesPerDay?: number
): {
    scheduledProgress: number;
    actualProgress: number;
    isAhead: boolean;
    daysBehind: number;
} {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(type => type.id === planType);
    if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
    }

    const completedChapters = readChapters.filter(ch => ch.isRead).length;
    const actualProgress = (completedChapters / plan.totalChapters) * 100;

    if (targetMinutesPerDay && targetMinutesPerDay > 0) {
        // 시간 기반 진도 계산
        const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const timeData = getChapterTimeDataForPlan(plan.bookRange![0], plan.bookRange![1]);
        const totalMinutes = timeData.reduce((sum, ch) => sum + (ch.totalSeconds / 60), 0);
        const minutesPerDay = totalMinutes / plan.estimatedDays;

        const expectedMinutes = daysPassed * targetMinutesPerDay;
        const actualMinutes = readChapters
            .filter(ch => ch.isRead)
            .reduce((sum, ch) => {
                const chapterData = timeData.find(t => t.book === ch.book && t.chapter === ch.chapter);
                return sum + (chapterData ? chapterData.totalSeconds / 60 : 4); // 기본 4분
            }, 0);

        const scheduledProgress = Math.min((expectedMinutes / totalMinutes) * 100, 100);
        const isAhead = actualMinutes >= expectedMinutes;
        const minutesBehind = Math.max(0, expectedMinutes - actualMinutes);
        const daysBehind = Math.ceil(minutesBehind / targetMinutesPerDay);

        return {
            scheduledProgress: Math.round(scheduledProgress),
            actualProgress: Math.round(actualProgress),
            isAhead,
            daysBehind
        };
    }

    // 기존 장 기반 진도 계산
    const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const chaptersPerDay = plan.totalChapters / plan.estimatedDays;
    const scheduledChapters = Math.min(daysPassed * chaptersPerDay, plan.totalChapters);
    const scheduledProgress = (scheduledChapters / plan.totalChapters) * 100;

    const isAhead = completedChapters >= scheduledChapters;
    const chaptersBehind = Math.max(0, scheduledChapters - completedChapters);
    const daysBehind = Math.ceil(chaptersBehind / chaptersPerDay);

    return {
        scheduledProgress: Math.round(scheduledProgress),
        actualProgress: Math.round(actualProgress),
        isAhead,
        daysBehind
    };
}

/**
 * 예상 완료일 계산
 */
export function estimateCompletionDate(
    planType: string,
    startDate: Date,
    currentDate: Date,
    readChapters: Array<{ book: number; chapter: number; isRead: boolean }>,
    targetMinutesPerDay?: number
): Date {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(type => type.id === planType);
    if (!plan) throw new Error(`Invalid plan type: ${planType}`);

    const completedChapters = readChapters.filter(ch => ch.isRead).length;
    const remainingChapters = plan.totalChapters - completedChapters;

    if (remainingChapters <= 0) return currentDate;

    if (targetMinutesPerDay && targetMinutesPerDay > 0) {
        // 시간 기반 예상 완료일
        const timeData = getChapterTimeDataForPlan(plan.bookRange![0], plan.bookRange![1]);
        const remainingMinutes = readChapters
            .filter(ch => !ch.isRead)
            .reduce((sum, ch) => {
                const chapterData = timeData.find(t => t.book === ch.book && t.chapter === ch.chapter);
                return sum + (chapterData ? chapterData.totalSeconds / 60 : 4);
            }, 0);

        const daysToComplete = Math.ceil(remainingMinutes / targetMinutesPerDay);
        const completionDate = new Date(currentDate);
        completionDate.setDate(completionDate.getDate() + daysToComplete);

        return completionDate;
    }

    // 기존 장 기반 예상 완료일
    const recentReadings = readChapters.filter(ch => ch.isRead).length;
    const daysPassed = Math.max(1, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const avgChaptersPerDay = recentReadings / daysPassed;

    const estimatedDaysToComplete = Math.ceil(remainingChapters / Math.max(avgChaptersPerDay, 1));
    const completionDate = new Date(currentDate);
    completionDate.setDate(completionDate.getDate() + estimatedDaysToComplete);

    return completionDate;
}

/**
 * 진도 계산 - biblePlanCalculator 버전 (useBibleReading과의 호환성)
 */
export function calculateProgress(
    planType: string,
    startDate: Date,
    currentDate: Date,
    readChapters: Array<{ book: number; chapter: number; isRead: boolean }>
): {
    scheduledProgress: number;
    actualProgress: number;
    isAhead: boolean;
    daysBehind: number;
} {
    return calculateProgressWithPlanType(planType, startDate, currentDate, readChapters);
}