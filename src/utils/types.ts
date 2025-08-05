// src/utils/types.ts
// 성경 일독 관련 타입 정의

import { DailyReadingPlan } from './timeBasedBibleReading';

// 읽기 상태
export interface ReadingStatus {
    book: number;
    chapter: number;
    isRead: boolean;
    date?: string;
    bookName?: string;
    estimatedMinutes?: number;
}

// 성경 일독 계획 데이터
export interface BiblePlanData {
    // 기본 필드
    planType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;

    // 시간 기반 계산 필드
    isTimeBasedCalculation?: boolean;
    targetMinutesPerDay?: number;
    dailyPlan?: DailyReadingPlan[];
    averageTimePerDay?: string;
    todayEstimatedSeconds?: number;
    selectedBooks?: [number, number];
}

// 일일 읽기 계획 (timeBasedBibleReading.ts에서 import)
export type { DailyReadingPlan };

// 진도 정보
export interface ProgressInfo {
    progressPercentage: number;
    schedulePercentage: number;
    readChapters: number;
    totalChapters: number;
    isOnTrack: boolean;
    todayProgress: number;
    estimatedTimeToday: string;
    remainingDays: number;
}

// 장 시간 데이터
export interface ChapterTimeData {
    book: number;
    chapter: number;
    bookName: string;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

// 성경 계획 타입
export interface BiblePlanType {
    id: string;
    name: string;
    description: string;
    totalChapters: number;
    estimatedDays: number;
    books: number[];
    bookRange?: [number, number];
}