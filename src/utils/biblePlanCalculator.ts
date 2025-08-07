// src/utils/biblePlanCalculator.ts
// 성경 일독 계획 계산 로직 - 수정된 버전

import { BibleStep } from './define';
import { calculateReadingEstimate, createTimeBasedReadingPlan } from './timeBasedBibleReading';
import { loadChapterTimeDataFromCSV, getChapterTimeDataForPlan } from './csvDataLoader';

// 타입 정의
export interface BibleReadingPlanCalculation {
    planType: string;
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    chaptersPerDayExact: number;  // 정확한 소수점 값 추가
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
 * 성경 일독 계획 계산 - 수정된 버전
 */
export function calculateReadingPlan(
    planType: string,
    startDate: Date,
    endDate: Date,
    targetMinutesPerDay?: number
): BibleReadingPlanCalculation {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
    }

    // 총 일수 계산 (시작일과 종료일 모두 포함)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 정확한 하루 평균 장수 계산
    const chaptersPerDayExact = plan.totalChapters / totalDays;
    const chaptersPerDay = Math.ceil(chaptersPerDayExact);  // 올림 처리

    const result: BibleReadingPlanCalculation = {
        planType,
        totalDays,
        totalChapters: plan.totalChapters,
        chaptersPerDay,
        chaptersPerDayExact,
        estimatedEndDate: endDate,
        isTimeBasedCalculation: false
    };

    // 시간 기반 계산이 있는 경우
    if (targetMinutesPerDay) {
        const avgMinutesPerChapter = getAverageMinutesPerChapter(planType);
        const estimatedMinutesPerDay = chaptersPerDayExact * avgMinutesPerChapter;
        const totalMinutes = plan.totalChapters * avgMinutesPerChapter;

        result.targetMinutesPerDay = targetMinutesPerDay;
        result.isTimeBasedCalculation = true;
        result.averageTimePerDay = formatMinutes(estimatedMinutesPerDay);
        result.totalReadingTime = formatMinutes(totalMinutes);
    }

    return result;
}

/**
 * 시간 기반 계산 (명확한 분리)
 */
export function calculateTimeBasedReadingPlan(
    planType: string,
    startDate: Date,
    endDate: Date,
    targetMinutesPerDay: number
): BibleReadingPlanCalculation {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
    }

    // 총 일수 계산
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 평균 장당 시간 가져오기
    const avgMinutesPerChapter = getAverageMinutesPerChapter(planType);

    // 목표 시간으로 읽을 수 있는 장수 계산
    const chaptersBasedOnTime = targetMinutesPerDay / avgMinutesPerChapter;
    const chaptersPerDay = Math.ceil(chaptersBasedOnTime);  // 올림 처리

    // 실제 필요한 일수 계산
    const actualDaysNeeded = Math.ceil(plan.totalChapters / chaptersPerDay);
    const actualEndDate = new Date(startDate);
    actualEndDate.setDate(actualEndDate.getDate() + actualDaysNeeded - 1);

    return {
        planType,
        totalDays,
        totalChapters: plan.totalChapters,
        chaptersPerDay,
        chaptersPerDayExact: chaptersBasedOnTime,
        estimatedEndDate: actualEndDate,
        targetMinutesPerDay,
        isTimeBasedCalculation: true,
        averageTimePerDay: formatMinutes(targetMinutesPerDay),
        totalReadingTime: formatMinutes(plan.totalChapters * avgMinutesPerChapter)
    };
}

/**
 * 분을 시간:분 형식으로 변환
 */
function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours > 0) {
        return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${mins}분`;
}

/**
 * 계획별 평균 분/장 계산
 */
function getAverageMinutesPerChapter(planType: string): number {
    switch (planType) {
        case 'psalms':
            return 2.5; // 시편은 짧음
        case 'pentateuch':
            return 5.0; // 모세오경은 김
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
 * 특정 날짜의 읽기 계획 가져오기 - 수정된 버전
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

    // 종료일 계산 (임시로 1년으로 설정)
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // 전체 일독 계획 일수 계산
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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