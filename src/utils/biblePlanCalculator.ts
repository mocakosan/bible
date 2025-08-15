// src/utils/biblePlanCalculator.ts
// 성경 일독 계획 계산 로직 - CSV 데이터 전용 버전

import { BibleStep } from './define';
import { getChapterTimeDataForPlan } from './csvDataLoader';

// 타입 정의
export interface BibleReadingPlanCalculation {
    planType: string;
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    chaptersPerDayExact: number;  // 정확한 소수점 값
    estimatedEndDate?: Date;

    // 시간 기반 필드
    targetMinutesPerDay?: number;
    minutesPerDay?: number;
    minutesPerDayExact?: number;
    isTimeBasedCalculation?: boolean;
    averageTimePerDay?: string;
    totalReadingTime?: string;
    hasActualTimeData?: boolean;
    totalTimeSeconds?: number;
    totalTimeMinutes?: number;
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

// 성경 일독 계획 타입 상세 정보
export const DETAILED_BIBLE_PLAN_TYPES: BiblePlanTypeDetail[] = [
    {
        id: 'full_bible',
        name: '성경 전체',
        description: '창세기부터 요한계시록까지',
        totalChapters: 1189,  // 실제: 921(구약) + 268(신약) = 1,189
        estimatedDays: 365,
        books: Array.from({ length: 66 }, (_, i) => i + 1),
        bookRange: [1, 66]
    },
    {
        id: 'old_testament',
        name: '구약',
        description: '창세기부터 말라기까지',
        totalChapters: 921,  // 🔥 수정: 929 → 921
        estimatedDays: 270,
        books: Array.from({ length: 39 }, (_, i) => i + 1),
        bookRange: [1, 39]
    },
    {
        id: 'new_testament',
        name: '신약',
        description: '마태복음부터 요한계시록까지',
        totalChapters: 268,  // 🔥 수정: 260 → 268
        estimatedDays: 90,
        books: Array.from({ length: 27 }, (_, i) => i + 40),
        bookRange: [40, 66]
    },
    {
        id: 'pentateuch',
        name: '모세오경',
        description: '창세기부터 신명기까지',
        totalChapters: 187,  // 정확함
        estimatedDays: 60,
        books: [1, 2, 3, 4, 5],
        bookRange: [1, 5]
    },
    {
        id: 'psalms',
        name: '시편',
        description: '시편 전체',
        totalChapters: 150,  // 정확함
        estimatedDays: 30,
        books: [19],
        bookRange: [19, 19]
    }
];

/**
 * 🔥 CSV 데이터 기반 계산 - 메인 함수 (CSV 데이터 필수)
 */
export function calculateReadingPlan(
    planType: string,
    startDate: Date,
    endDate: Date,
    targetMinutesPerDay?: number
): BibleReadingPlanCalculation | null {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        console.error(`Invalid plan type: ${planType}`);
        return null;
    }

    // 총 일수 계산 (시작일과 종료일 모두 포함)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`\n📅 일독 계획 계산 시작:
        - 계획 유형: ${plan.name}
        - 시작일: ${startDate.toLocaleDateString()}
        - 종료일: ${endDate.toLocaleDateString()}
        - 총 일수: ${totalDays}일
    `);

    try {
        // CSV에서 실제 시간 데이터 가져오기 (필수)
        const timeData = getChapterTimeDataForPlan(
            plan.bookRange![0],
            plan.bookRange![1]
        );

        if (!timeData || timeData.length === 0) {
            console.error('❌ CSV 데이터를 찾을 수 없습니다. CSV 파일을 먼저 로드해주세요.');
            return null;
        }

        // 실제 총 시간 계산 (초 단위)
        const totalSeconds = timeData.reduce((sum, chapter) => sum + chapter.totalSeconds, 0);
        const totalMinutes = totalSeconds / 60;

        // 실제 장수 (CSV 데이터 기반)
        const totalChapters = timeData.length;

        // 정확한 하루 평균 계산
        const chaptersPerDayExact = totalChapters / totalDays;
        const chaptersPerDay = Math.ceil(chaptersPerDayExact);  // 올림 처리

        // 하루 평균 시간 계산 (반올림/반내림 없이 정확한 값)
        const minutesPerDayExact = totalMinutes / totalDays;
        const minutesPerDay = minutesPerDayExact;  // 🔥 수정: 올림 제거

        const result: BibleReadingPlanCalculation = {
            planType,
            totalDays,
            totalChapters,
            chaptersPerDay,
            chaptersPerDayExact,
            minutesPerDay,  // 🔥 정확한 값 사용
            minutesPerDayExact,
            totalTimeMinutes: totalMinutes,  // 🔥 반올림 제거
            totalTimeSeconds: totalSeconds,
            estimatedEndDate: endDate,
            isTimeBasedCalculation: true,
            hasActualTimeData: true,
            averageTimePerDay: formatMinutes(minutesPerDayExact),
            totalReadingTime: formatMinutes(totalMinutes)
        };

        // 시간 목표가 있는 경우 추가 처리
        if (targetMinutesPerDay) {
            result.targetMinutesPerDay = targetMinutesPerDay;

            // 목표 시간으로 읽을 수 있는 장수 재계산
            const avgMinutesPerChapter = totalMinutes / totalChapters;
            const chaptersBasedOnTime = targetMinutesPerDay / avgMinutesPerChapter;

            // 시간 기반으로 재계산된 일수
            const actualDaysNeeded = Math.ceil(totalChapters / chaptersBasedOnTime);
            const actualEndDate = new Date(startDate);
            actualEndDate.setDate(actualEndDate.getDate() + actualDaysNeeded - 1);

            result.estimatedEndDate = actualEndDate;
            result.chaptersPerDayExact = chaptersBasedOnTime;
            result.chaptersPerDay = Math.ceil(chaptersBasedOnTime);
        }

        console.log(`📊 CSV 기반 일독 계산 완료:
            - 계획: ${plan.name} (${totalChapters}장)
            - 총 기간: ${totalDays}일
            - 전체 시간: ${Math.round(totalMinutes)}분 (${Math.round(totalMinutes / 60)}시간 ${Math.round(totalMinutes % 60)}분)
            - 하루 평균: ${chaptersPerDayExact.toFixed(2)}장 → ${chaptersPerDay}장
            - 예상 시간: ${minutesPerDayExact.toFixed(1)}분 → ${minutesPerDay}분/일
        `);

        return result;

    } catch (error) {
        console.error('❌ CSV 데이터 처리 오류:', error);
        return null;
    }
}

/**
 * 분을 시간:분 형식으로 변환 (정확한 값 표시)
 */
function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;  // 🔥 수정: 반올림 제거

    // 소수점 처리
    const minsDisplay = mins % 1 === 0 ? mins.toString() : mins.toFixed(1);

    if (hours > 0) {
        return mins > 0 ? `${hours}시간 ${minsDisplay}분` : `${hours}시간`;
    }
    return `${minsDisplay}분`;
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
 * 오늘 읽어야 할 장수 계산 (누적 방식)
 */
export function calculateTodayTarget(
    planData: any,
    currentDay: number
): { chapters: number; minutes: number } | null {
    if (!planData || !planData.totalTimeMinutes) {
        console.error('❌ CSV 데이터가 없어 계산할 수 없습니다.');
        return null;
    }

    // 오늘까지의 누적 목표
    const cumulativeTarget = Math.min(
        currentDay * planData.chaptersPerDayExact,
        planData.totalChapters
    );

    // 이미 읽은 장수
    const readChapters = planData.readChapters?.filter((r: any) => r.isRead).length || 0;

    // 오늘 읽어야 할 장수
    const todayChapters = Math.max(0, Math.ceil(cumulativeTarget) - readChapters);

    // 예상 시간 (CSV 데이터 기반)
    const avgMinutesPerChapter = planData.totalTimeMinutes / planData.totalChapters;
    const todayMinutes = Math.ceil(todayChapters * avgMinutesPerChapter);

    return {
        chapters: todayChapters,
        minutes: todayMinutes
    };
}

/**
 * CSV 데이터 검증 함수
 */
export function validateCSVData(planType: string): boolean {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        return false;
    }

    try {
        const timeData = getChapterTimeDataForPlan(
            plan.bookRange![0],
            plan.bookRange![1]
        );

        if (!timeData || timeData.length === 0) {
            console.warn(`⚠️ ${plan.name}에 대한 CSV 데이터가 없습니다.`);
            return false;
        }

        console.log(`✅ ${plan.name} CSV 데이터 확인: ${timeData.length}장`);
        return true;

    } catch (error) {
        console.error('CSV 데이터 검증 실패:', error);
        return false;
    }
}

/**
 * 모든 계획의 CSV 데이터 상태 확인
 */
export function checkAllPlansCSVStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};

    DETAILED_BIBLE_PLAN_TYPES.forEach(plan => {
        status[plan.id] = validateCSVData(plan.id);
    });

    console.log('📋 CSV 데이터 상태:', status);
    return status;
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

/**
 * 특정 날짜의 읽기 계획 가져오기 - CSV 데이터 기반
 */
export function getDailyReading(
    planType: string,
    startDate: Date,
    targetDate: Date
): DailyReading | null {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        console.error(`Invalid plan type: ${planType}`);
        return null;
    }

    try {
        // CSV 데이터 가져오기
        const timeData = getChapterTimeDataForPlan(
            plan.bookRange![0],
            plan.bookRange![1]
        );

        if (!timeData || timeData.length === 0) {
            console.error('❌ CSV 데이터를 찾을 수 없습니다.');
            return null;
        }

        // 날짜 차이 계산
        const dayNumber = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // 전체 기간 계산 (임시로 365일로 설정, 실제로는 계획 데이터에서 가져와야 함)
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 364); // 365일 계획

        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const chaptersPerDay = Math.ceil(timeData.length / totalDays);

        // 해당 날짜의 시작 장과 끝 장 인덱스 계산
        const startChapterIndex = (dayNumber - 1) * chaptersPerDay;
        const endChapterIndex = Math.min(startChapterIndex + chaptersPerDay, timeData.length);

        const chapters: ChapterReading[] = [];

        // 해당 범위의 장들 추가
        for (let i = startChapterIndex; i < endChapterIndex; i++) {
            const chapterData = timeData[i];
            if (chapterData) {
                const bookInfo = BibleStep.find(b => b.index === chapterData.book);
                chapters.push({
                    bookIndex: chapterData.book,
                    bookName: bookInfo?.name || chapterData.bookName,
                    chapter: chapterData.chapter,
                    isCompleted: false
                });
            }
        }

        return {
            date: targetDate,
            dayNumber,
            chapters,
            totalChapters: chapters.length,
            completedChapters: 0
        };

    } catch (error) {
        console.error('getDailyReading 오류:', error);
        return null;
    }
}

/**
 * 예상 완료일 계산
 */
export function estimateCompletionDate(
    planData: any,
    progressPercentage: number
): Date | null {
    if (!planData || progressPercentage === 0) {
        return null;
    }

    const startDate = new Date(planData.startDate);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 현재 진행 속도 계산
    const dailyProgressRate = progressPercentage / daysElapsed;

    // 남은 진행률
    const remainingProgress = 100 - progressPercentage;

    // 예상 소요 일수
    const estimatedDaysRemaining = Math.ceil(remainingProgress / dailyProgressRate);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDaysRemaining);

    return estimatedDate;
}