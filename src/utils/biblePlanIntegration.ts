import {
    calculateReadingPlan,
    DETAILED_BIBLE_PLAN_TYPES,
    type BibleReadingPlanCalculation,
    type DailyReadingPlan,
    type ChapterReading
} from './biblePlanCalculator';
import { defaultStorage } from './mmkv';
import { initializeChapterTimeData } from './csvDataLoader';

// 타입 정의
export interface TimeBasedBiblePlan {
    planType: string;
    planName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    totalChapters: number;

    // 시간 기반 데이터
    isTimeBasedCalculation: boolean;
    targetMinutesPerDay: number;
    totalMinutes: number;
    dailyReadingSchedule: DailyReadingSchedule[];

    // 읽기 상태
    readChapters: ReadChapterStatus[];
    createdAt: string;
    lastUpdated: string;
}

export interface DailyReadingSchedule {
    day: number;
    date: string;
    chapters: ScheduledChapter[];
    totalMinutes: number;
    targetMinutes: number;
    isCompleted: boolean;
}

export interface ScheduledChapter {
    book: number;
    bookName: string;
    chapter: number;
    duration: string;
    estimatedMinutes: number;
    isRead: boolean;
}

export interface ReadChapterStatus {
    book: number;
    chapter: number;
    isRead: boolean;
    readDate?: string;
}

/**
 * 🔥 시간 기반 성경 일독 계획 생성
 */
export async function createTimeBasedBiblePlan(
    planType: string,
    startDate: string,
    endDate: string
): Promise<TimeBasedBiblePlan> {
    // CSV 데이터 초기화
    await initializeChapterTimeData();

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 계획 계산
    const calculation = await calculateReadingPlan(planType, start, end);

    if (!calculation) {
        throw new Error('일독 계획 생성 실패');
    }

    // 계획 타입 정보
    const planInfo = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);

    // 일별 스케줄 변환
    const dailyReadingSchedule = calculation.dailyPlan.map(day => ({
        day: day.day,
        date: day.date.toISOString(),
        chapters: day.chapters.map(ch => ({
            book: ch.bookIndex,
            bookName: ch.bookName,
            chapter: ch.chapter,
            duration: ch.duration,
            estimatedMinutes: ch.estimatedMinutes,
            isRead: false
        })),
        totalMinutes: day.totalMinutes,
        targetMinutes: calculation.targetMinutesPerDay,
        isCompleted: false
    }));

    // 읽기 상태 초기화
    const readChapters: ReadChapterStatus[] = [];
    calculation.dailyPlan.forEach(day => {
        day.chapters.forEach(ch => {
            readChapters.push({
                book: ch.bookIndex,
                chapter: ch.chapter,
                isRead: false
            });
        });
    });

    const plan: TimeBasedBiblePlan = {
        planType,
        planName: planInfo?.name || '성경 일독',
        startDate,
        endDate,
        totalDays: calculation.totalDays,
        totalChapters: calculation.totalChapters,

        // 시간 기반 데이터
        isTimeBasedCalculation: true,
        targetMinutesPerDay: calculation.targetMinutesPerDay,
        totalMinutes: calculation.totalTimeMinutes,
        dailyReadingSchedule,

        // 읽기 상태
        readChapters,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    console.log(`✅ 시간 기반 일독 계획 생성 완료:
        - 총 ${plan.totalDays}일
        - 하루 목표: ${plan.targetMinutesPerDay}분 (고정)
        - 총 ${plan.totalChapters}장
    `);

    return plan;
}

/**
 * 계획 저장
 */
export function saveTimeBasedBiblePlan(plan: TimeBasedBiblePlan): void {
    try {
        defaultStorage.set('time_based_bible_plan', JSON.stringify(plan));
        console.log('💾 시간 기반 일독 계획 저장 완료');
    } catch (error) {
        console.error('계획 저장 실패:', error);
        throw error;
    }
}

/**
 * 계획 로드
 */
export function loadTimeBasedBiblePlan(): TimeBasedBiblePlan | null {
    try {
        const savedPlan = defaultStorage.getString('time_based_bible_plan');
        if (!savedPlan) return null;

        const plan = JSON.parse(savedPlan);
        console.log('💾 시간 기반 일독 계획 로드 완료');
        return plan;
    } catch (error) {
        console.error('계획 로드 실패:', error);
        return null;
    }
}

/**
 * 계획 삭제
 */
export function deleteTimeBasedBiblePlan(): void {
    defaultStorage.delete('time_based_bible_plan');
    console.log('🗑️ 시간 기반 일독 계획 삭제 완료');
}

/**
 * 장 읽기 완료 표시
 */
export function markChapterAsRead(
    plan: TimeBasedBiblePlan,
    bookIndex: number,
    chapter: number
): TimeBasedBiblePlan {
    const updatedPlan = { ...plan };

    // readChapters 업데이트
    const readChapter = updatedPlan.readChapters.find(
        ch => ch.book === bookIndex && ch.chapter === chapter
    );

    if (readChapter) {
        readChapter.isRead = true;
        readChapter.readDate = new Date().toISOString();
    }

    // dailyReadingSchedule 업데이트
    updatedPlan.dailyReadingSchedule.forEach(day => {
        const chapterInSchedule = day.chapters.find(
            ch => ch.book === bookIndex && ch.chapter === chapter
        );

        if (chapterInSchedule) {
            chapterInSchedule.isRead = true;
        }

        // 해당 날짜 완료 여부 확인
        day.isCompleted = day.chapters.every(ch => ch.isRead);
    });

    updatedPlan.lastUpdated = new Date().toISOString();

    return updatedPlan;
}

/**
 * 오늘 읽을 장 가져오기
 */
export function getTodaySchedule(plan: TimeBasedBiblePlan): DailyReadingSchedule | null {
    const today = new Date();
    const startDate = new Date(plan.startDate);

    const daysPassed = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const currentDay = daysPassed + 1;

    return plan.dailyReadingSchedule.find(d => d.day === currentDay) || null;
}

/**
 * 진도 통계 계산
 */
export function calculateStatistics(plan: TimeBasedBiblePlan) {
    const totalRead = plan.readChapters.filter(ch => ch.isRead).length;
    const totalChapters = plan.readChapters.length;
    const progressPercentage = (totalRead / totalChapters) * 100;

    const today = new Date();
    const endDate = new Date(plan.endDate);
    const remainingDays = Math.max(
        0,
        Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
        totalRead,
        totalChapters,
        progressPercentage,
        remainingDays,
        targetMinutesPerDay: plan.targetMinutesPerDay,
        isOnTrack: progressPercentage >= ((plan.totalDays - remainingDays) / plan.totalDays) * 100
    };
}