// utils/timeBasedBibleCalculator.ts
// 오디오 시간 기반 성경일독 계산 모듈 - 수정된 버전

import { BibleStep } from './define';
import { defaultStorage } from './mmkv';

// 타입 정의
export interface AudioChapterData {
    book: number;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

export interface TimeBasedReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    estimatedMinutes: number;
}

export interface TimeBasedPlanData {
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;

    // 시간 기반 데이터
    targetMinutesPerDay: number;
    totalMinutes: number;
    isTimeBasedCalculation: true;

    // 기존 UI 호환성을 위한 데이터
    chaptersPerDay: number;
    chaptersPerDayExact: number;  // 정확한 소수점 값
    totalChapters: number;

    readChapters: TimeBasedReadingStatus[];
    createdAt: string;
}

// 계획별 총 장수 상수
const PLAN_TOTAL_CHAPTERS = {
    'full_bible': 1189,
    'old_testament': 929,
    'new_testament': 260,
    'pentateuch': 187,
    'psalms': 150
};

// 계획별 평균 분/장
const AVERAGE_MINUTES_PER_CHAPTER = {
    'full_bible': 4.5,
    'old_testament': 4.8,
    'new_testament': 4.2,
    'pentateuch': 5.0,
    'psalms': 2.5
};

/**
 * 계획 범위 가져오기
 */
const getBookRangeForPlan = (planType: string): { start: number; end: number } => {
    switch (planType) {
        case 'old_testament':
            return { start: 1, end: 39 };
        case 'new_testament':
            return { start: 40, end: 66 };
        case 'pentateuch':
            return { start: 1, end: 5 };
        case 'psalms':
            return { start: 19, end: 19 };
        case 'full_bible':
        default:
            return { start: 1, end: 66 };
    }
};

/**
 * 전체 시간(분) 계산
 */
export const calculateTotalMinutes = (planType: string): number => {
    const totalChapters = PLAN_TOTAL_CHAPTERS[planType] || 1189;
    const avgMinutes = AVERAGE_MINUTES_PER_CHAPTER[planType] || 4.5;
    return totalChapters * avgMinutes;
};

/**
 * 현재 날짜 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
};

/**
 * 시간 기반 성경 일독 계획 생성 - 수정된 버전
 */
export const createTimeBasedBiblePlan = (
    planType: string,
    planName: string,
    startDate: string,
    targetDate: string
): TimeBasedPlanData => {
    const start = new Date(startDate);
    const end = new Date(targetDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 전체 오디오 시간 계산
    const totalMinutes = calculateTotalMinutes(planType);
    const targetMinutesPerDay = Math.ceil(totalMinutes / totalDays);

    // 전체 장수 계산
    const totalChapters = PLAN_TOTAL_CHAPTERS[planType] || 1189;

    // 정확한 하루 평균 장수 계산
    const chaptersPerDayExact = totalChapters / totalDays;
    const chaptersPerDay = Math.ceil(chaptersPerDayExact);  // 올림 처리

    return {
        planType,
        planName,
        startDate,
        targetDate,
        totalDays,
        targetMinutesPerDay,
        totalMinutes,
        isTimeBasedCalculation: true,
        chaptersPerDay,
        chaptersPerDayExact,
        totalChapters,
        readChapters: [],
        createdAt: new Date().toISOString()
    };
};

/**
 * 오늘 읽어야 할 장들 계산 (시간 기반) - 수정된 버전
 */
export const getTodayChaptersTimeBase = (planData: TimeBasedPlanData): TimeBasedReadingStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);

    // 이미 읽은 장들 제외하고 다음 장부터 시작
    const readChapterKeys = new Set(
        planData.readChapters
            .filter(r => r.isRead)
            .map(r => `${r.book}_${r.chapter}`)
    );

    const bookRange = getBookRangeForPlan(planData.planType);
    const todayChapters: TimeBasedReadingStatus[] = [];

    // 누적으로 읽어야 할 장수 계산
    const cumulativeChapters = Math.min(
        currentDay * planData.chaptersPerDay,
        planData.totalChapters
    );

    // 이미 읽은 장수
    const readChaptersCount = planData.readChapters.filter(r => r.isRead).length;

    // 오늘까지 읽어야 할 남은 장수
    const remainingChaptersForToday = cumulativeChapters - readChaptersCount;

    if (remainingChaptersForToday <= 0) {
        return [];  // 이미 목표 달성
    }

    // 읽지 않은 장들을 순서대로 선택
    let addedCount = 0;
    outerLoop: for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            const key = `${book}_${chapter}`;

            // 이미 읽은 장은 건너뛰기
            if (readChapterKeys.has(key)) continue;

            // 장 추가
            todayChapters.push({
                book,
                chapter,
                date: new Date().toISOString(),
                isRead: false,
                estimatedMinutes: AVERAGE_MINUTES_PER_CHAPTER[planData.planType] || 4.5
            });

            addedCount++;

            // 오늘 읽어야 할 장수만큼 추가했으면 종료
            if (addedCount >= Math.min(remainingChaptersForToday, planData.chaptersPerDay)) {
                break outerLoop;
            }
        }
    }

    return todayChapters;
};

/**
 * 진도율 계산 - 수정된 버전
 */
export const calculateProgress = (planData: TimeBasedPlanData): {
    progressPercentage: number;
    schedulePercentage: number;
    readChapters: number;
    totalChapters: number;
    behindSchedule: boolean;
    missedChapters: number;
} => {
    const readCount = planData.readChapters.filter(r => r.isRead).length;
    const progressPercentage = Math.min(100, (readCount / planData.totalChapters) * 100);

    const currentDay = getCurrentDay(planData.startDate);
    const expectedChapters = Math.min(
        currentDay * planData.chaptersPerDay,
        planData.totalChapters
    );

    const schedulePercentage = (readCount / expectedChapters) * 100;
    const behindSchedule = readCount < expectedChapters;
    const missedChapters = Math.max(0, expectedChapters - readCount);

    return {
        progressPercentage,
        schedulePercentage,
        readChapters: readCount,
        totalChapters: planData.totalChapters,
        behindSchedule,
        missedChapters
    };
};