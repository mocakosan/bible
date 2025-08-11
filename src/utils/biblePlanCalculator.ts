// src/utils/biblePlanCalculator.ts
// 성경 일독 계획 계산 로직 - 시간 고정 버전

import { BibleStep } from './define';
import { getChapterTimeDataForPlan } from './csvDataLoader';
import { createTimeBasedReadingPlan } from './timeBasedBibleReading';

// 타입 정의
export interface BibleReadingPlanCalculation {
    planType: string;
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    chaptersPerDayExact: number;
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
    dailyPlan?: any[];  // DailyReadingPlan[]
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
 * 🔥 수정된 메인 계산 함수 - 총 기간 기반
 */
export function calculateReadingPlan(
    planType: string,
    startDate: Date,
    endDate: Date
): BibleReadingPlanCalculation | null {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === planType);
    if (!plan) {
        console.error(`Invalid plan type: ${planType}`);
        return null;
    }

    // 총 일수 계산
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`\n📅 일독 계획 계산:
        - 계획: ${plan.name}
        - 기간: ${totalDays}일
        - 시작: ${startDate.toLocaleDateString()}
        - 종료: ${endDate.toLocaleDateString()}
    `);

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

        // 전체 시간 계산
        const totalSeconds = timeData.reduce((sum, chapter) => sum + chapter.totalSeconds, 0);
        const totalMinutes = totalSeconds / 60;

        // 하루 목표 시간 계산 (고정값)
        const minutesPerDay = totalMinutes / totalDays;
        const targetMinutesPerDay = Math.round(minutesPerDay);

        // 시간 기반 일독 계획 생성
        const dailyPlan = createTimeBasedReadingPlan(
            totalDays,
            timeData,
            startDate,
            plan.bookRange!
        );

        // 실제 장수
        const totalChapters = timeData.length;

        // 평균 장수 계산
        const avgChaptersPerDay = totalChapters / totalDays;

        const result: BibleReadingPlanCalculation = {
            planType,
            totalDays,
            totalChapters,
            chaptersPerDay: Math.ceil(avgChaptersPerDay),
            chaptersPerDayExact: avgChaptersPerDay,
            estimatedEndDate: endDate,

            // 시간 기반 데이터
            targetMinutesPerDay,
            minutesPerDay: targetMinutesPerDay,
            minutesPerDayExact: minutesPerDay,
            isTimeBasedCalculation: true,
            hasActualTimeData: true,
            averageTimePerDay: formatMinutes(targetMinutesPerDay),
            totalReadingTime: formatMinutes(totalMinutes),
            totalTimeMinutes: totalMinutes,
            totalTimeSeconds: totalSeconds,
            dailyPlan
        };

        console.log(`✅ 계산 완료:
            - 전체: ${totalChapters}장, ${Math.round(totalMinutes)}분
            - 하루: ${targetMinutesPerDay}분 (고정), 평균 ${avgChaptersPerDay.toFixed(1)}장
        `);

        return result;

    } catch (error) {
        console.error('❌ 계산 오류:', error);
        return null;
    }
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