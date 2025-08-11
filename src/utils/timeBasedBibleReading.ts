// src/utils/timeBasedBibleReading.ts
// 시간 기반 성경 일독 계산 시스템 - 하루 목표 시간 고정 버전

import { BibleStep } from './define';

// CSV 데이터 타입 정의
interface ChapterTimeData {
    book: number;
    chapter: number;
    bookName: string;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

// 일일 읽기 계획 타입
export interface DailyReadingPlan {
    day: number;
    date: Date;
    chapters: {
        book: number;
        bookName: string;
        chapter: number;
        minutes: number;
        seconds: number;
    }[];
    totalMinutes: number;
    totalSeconds: number;
    formattedTime: string;
}

// 시간을 포맷팅하는 함수
function formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
        return `${minutes}분 ${seconds}초`;
    } else {
        return `${seconds}초`;
    }
}

/**
 * 🔥 새로운 메인 함수: 총 기간 기반 계획 생성
 * 총 기간과 성경 전체를 분 단위로 변환하여 하루 목표 시간을 고정
 *
 * @param totalDays 총 일독 기간 (일)
 * @param chapterTimeData 장별 시간 데이터
 * @param startDate 시작 날짜
 * @param selectedBooks 선택된 성경 범위 (예: [1, 66] 전체)
 */
export function createTimeBasedReadingPlan(
    totalDays: number,
    chapterTimeData: ChapterTimeData[],
    startDate: Date,
    selectedBooks: [number, number] = [1, 66]
): DailyReadingPlan[] {
    // 🔥 정확한 시간 데이터 사용 (CSV 데이터가 불완전한 경우 대비)
    const planTypeRanges: { [key: string]: { totalMinutes: number; totalChapters: number } } = {
        '1_66': { totalMinutes: 4756, totalChapters: 1189 },     // 성경 전체
        '1_39': { totalMinutes: 3680, totalChapters: 929 },      // 구약
        '40_66': { totalMinutes: 1076, totalChapters: 260 },     // 신약
        '1_5': { totalMinutes: 910, totalChapters: 187 },        // 모세오경
        '19_19': { totalMinutes: 330, totalChapters: 150 }       // 시편
    };

    const rangeKey = `${selectedBooks[0]}_${selectedBooks[1]}`;
    const correctData = planTypeRanges[rangeKey];

    // 1. 전체 성경을 분 단위로 계산
    const filteredChapterData = chapterTimeData.filter(
        data => data.book >= selectedBooks[0] && data.book <= selectedBooks[1]
    );

    let totalSecondsInBible = 0;
    let totalMinutesInBible = 0;

    // CSV 데이터가 불완전한 경우 정확한 데이터 사용
    if (correctData && filteredChapterData.length < correctData.totalChapters) {
        totalMinutesInBible = correctData.totalMinutes;
        totalSecondsInBible = correctData.totalMinutes * 60;
        console.log(`⚠️ CSV 데이터 불완전 (${filteredChapterData.length}장). 기본값 사용: ${correctData.totalMinutes}분`);
    } else {
        totalSecondsInBible = filteredChapterData.reduce(
            (sum, chapter) => sum + chapter.totalSeconds,
            0
        );
        totalMinutesInBible = totalSecondsInBible / 60;
    }

    // 2. 하루 목표 시간 계산 (분 단위) - 고정값
    const targetMinutesPerDay = Math.round(totalMinutesInBible / totalDays);
    const targetSecondsPerDay = targetMinutesPerDay * 60;

    // 🔥 정확한 장수 사용
    const actualChapters = correctData ? correctData.totalChapters : filteredChapterData.length;

    console.log(`📊 일독 계획 계산:
        - 총 기간: ${totalDays}일
        - 성경 범위: ${actualChapters}장
        - 전체 시간: ${Math.round(totalMinutesInBible)}분
        - 하루 목표: ${targetMinutesPerDay}분 (고정)
    `);

    const plan: DailyReadingPlan[] = [];
    let currentDay = 1;
    let currentDate = new Date(startDate);
    let dailyChapters: DailyReadingPlan['chapters'] = [];
    let dailyTotalSeconds = 0;
    let chapterIndex = 0;

    // 3. 각 날짜별로 목표 시간에 맞춰 장수 배분
    // CSV 데이터가 불완전한 경우 간단한 배분 사용
    if (filteredChapterData.length === 0 ||
        (correctData && filteredChapterData.length < correctData.totalChapters * 0.5)) {

        // 기본 배분: 장수를 균등하게 나눔
        const chaptersPerDay = Math.ceil(actualChapters / totalDays);

        for (let day = 1; day <= totalDays; day++) {
            const dayDate = new Date(currentDate);

            plan.push({
                day: day,
                date: dayDate,
                chapters: [],  // 실제 장 정보는 없지만 계획은 생성
                totalMinutes: targetMinutesPerDay,
                totalSeconds: targetSecondsPerDay,
                formattedTime: formatTime(targetSecondsPerDay)
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log(`✅ 기본 일독 계획 생성 완료: ${totalDays}일 계획`);
        return plan;
    }
    while (chapterIndex < filteredChapterData.length && currentDay <= totalDays) {
        const timeData = filteredChapterData[chapterIndex];

        // 현재 장을 추가해도 목표 시간을 크게 초과하지 않는지 확인
        const willExceedTarget = dailyTotalSeconds + timeData.totalSeconds > targetSecondsPerDay * 1.2; // 20% 허용 범위

        // 목표 시간에 근접했고 다음 장을 추가하면 크게 초과하는 경우
        if (dailyTotalSeconds >= targetSecondsPerDay * 0.8 && willExceedTarget && dailyChapters.length > 0) {
            // 현재까지의 일일 계획 저장
            plan.push({
                day: currentDay,
                date: new Date(currentDate),
                chapters: [...dailyChapters],
                totalMinutes: Math.round(dailyTotalSeconds / 60),
                totalSeconds: dailyTotalSeconds,
                formattedTime: formatTime(dailyTotalSeconds)
            });

            // 다음 날 준비
            currentDay++;
            currentDate.setDate(currentDate.getDate() + 1);
            dailyChapters = [];
            dailyTotalSeconds = 0;
        }

        // 현재 장 추가
        dailyChapters.push({
            book: timeData.book,
            bookName: timeData.bookName,
            chapter: timeData.chapter,
            minutes: timeData.minutes,
            seconds: timeData.seconds
        });
        dailyTotalSeconds += timeData.totalSeconds;
        chapterIndex++;

        // 마지막 장이거나 마지막 날인 경우
        if (chapterIndex === filteredChapterData.length || currentDay === totalDays) {
            // 남은 장들을 모두 포함
            if (currentDay === totalDays && chapterIndex < filteredChapterData.length) {
                // 마지막 날에 남은 모든 장 추가
                while (chapterIndex < filteredChapterData.length) {
                    const remainingData = filteredChapterData[chapterIndex];
                    dailyChapters.push({
                        book: remainingData.book,
                        bookName: remainingData.bookName,
                        chapter: remainingData.chapter,
                        minutes: remainingData.minutes,
                        seconds: remainingData.seconds
                    });
                    dailyTotalSeconds += remainingData.totalSeconds;
                    chapterIndex++;
                }
            }

            if (dailyChapters.length > 0) {
                plan.push({
                    day: currentDay,
                    date: new Date(currentDate),
                    chapters: [...dailyChapters],
                    totalMinutes: Math.round(dailyTotalSeconds / 60),
                    totalSeconds: dailyTotalSeconds,
                    formattedTime: formatTime(dailyTotalSeconds)
                });
                currentDay++;
                currentDate.setDate(currentDate.getDate() + 1);
                dailyChapters = [];
                dailyTotalSeconds = 0;
            }
        }
    }

    console.log(`✅ 일독 계획 생성 완료: ${plan.length}일 계획`);

    return plan;
}

/**
 * 🔥 기존 함수와의 호환성을 위한 래퍼 함수
 * targetMinutesPerDay를 받아서 총 일수를 역산
 */
export function createTimeBasedReadingPlanByMinutes(
    targetMinutesPerDay: number,
    chapterTimeData: ChapterTimeData[],
    startDate: Date,
    selectedBooks: [number, number] = [1, 66]
): DailyReadingPlan[] {
    // 전체 시간 계산
    const filteredChapterData = chapterTimeData.filter(
        data => data.book >= selectedBooks[0] && data.book <= selectedBooks[1]
    );

    const totalMinutes = filteredChapterData.reduce(
        (sum, chapter) => sum + chapter.totalSeconds / 60,
        0
    );

    // 목표 시간으로 총 일수 계산
    const totalDays = Math.ceil(totalMinutes / targetMinutesPerDay);

    return createTimeBasedReadingPlan(totalDays, chapterTimeData, startDate, selectedBooks);
}

/**
 * 🔥 수정된 예상 계산 함수 - 총 기간 기반
 */
export function calculateReadingEstimate(
    totalDays: number,
    chapterTimeData: ChapterTimeData[],
    selectedBooks: [number, number] = [1, 66]
): {
    totalDays: number;
    endDate: Date;
    averageTimePerDay: string;
    totalReadingTime: string;
    dailyTimeMinutes: number;
} {
    const startDate = new Date();

    // 전체 시간 계산
    const filteredChapterData = chapterTimeData.filter(
        data => data.book >= selectedBooks[0] && data.book <= selectedBooks[1]
    );

    const totalSeconds = filteredChapterData.reduce(
        (sum, chapter) => sum + chapter.totalSeconds,
        0
    );

    // 하루 평균 시간 (고정값)
    const avgSecondsPerDay = Math.round(totalSeconds / totalDays);
    const avgMinutesPerDay = Math.round(avgSecondsPerDay / 60);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + totalDays - 1);

    return {
        totalDays,
        endDate,
        averageTimePerDay: formatTime(avgSecondsPerDay),
        totalReadingTime: formatTime(totalSeconds),
        dailyTimeMinutes: avgMinutesPerDay
    };
}

/**
 * 🔥 수정된 설정 화면용 계산 함수
 */
export function getEstimatedPlanInfo(
    planType: string,
    startDate: Date,
    endDate: Date,
    chapterTimeData: ChapterTimeData[]
): {
    dailyTargetTime: string;
    totalDays: number;
    estimatedEndDate: Date;
} {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 전체 시간 계산
    const totalSeconds = chapterTimeData.reduce((sum, ch) => sum + ch.totalSeconds, 0);
    const dailyTargetSeconds = Math.round(totalSeconds / totalDays);

    return {
        dailyTargetTime: formatTime(dailyTargetSeconds),
        totalDays,
        estimatedEndDate: endDate
    };
}

// UI 컴포넌트용 헬퍼 함수들
export function formatDailyTarget(minutes: number): string {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${minutes}분`;
}

export function calculateDailyTargetTime(dailyPlan: DailyReadingPlan): string {
    return formatTime(dailyPlan.totalSeconds);
}

/**
 * 진도 탭용 정보 계산
 */
export function calculateProgressInfo(
    plan: DailyReadingPlan[],
    completedChapters: { book: number; chapter: number }[]
): {
    totalProgress: number;
    todayProgress: number;
    estimatedTimeToday: string;
    remainingDays: number;
    isOnTrack: boolean;
    todayPlan?: DailyReadingPlan;
} {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPlan = plan.find(day => {
        const planDate = new Date(day.date);
        planDate.setHours(0, 0, 0, 0);
        return planDate.getTime() === today.getTime();
    });

    // 전체 진도율 계산
    const totalChapters = plan.reduce((sum, day) => sum + day.chapters.length, 0);
    const readChapters = completedChapters.length;
    const totalProgress = (readChapters / totalChapters) * 100;

    // 오늘 진도율 계산
    let todayProgress = 0;
    if (todayPlan) {
        const todayReadChapters = todayPlan.chapters.filter(ch =>
            completedChapters.some(c => c.book === ch.book && c.chapter === ch.chapter)
        ).length;
        todayProgress = (todayReadChapters / todayPlan.chapters.length) * 100;
    }

    // 남은 일수 계산
    const lastDay = plan[plan.length - 1];
    const remainingDays = lastDay ?
        Math.ceil((new Date(lastDay.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) :
        0;

    // 진도 체크
    const expectedProgress = ((plan.length - remainingDays) / plan.length) * 100;
    const isOnTrack = totalProgress >= expectedProgress - 5; // 5% 여유

    return {
        totalProgress,
        todayProgress,
        estimatedTimeToday: todayPlan ? todayPlan.formattedTime : '0분',
        remainingDays,
        isOnTrack,
        todayPlan
    };
}