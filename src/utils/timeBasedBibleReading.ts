// utils/timeBasedBibleReading.ts
// 시간 기반 성경 일독 계산 시스템 - 개선된 버전

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
 * 시간 기반으로 성경 일독 계획 생성
 * @param targetMinutesPerDay 하루 목표 읽기 시간 (분)
 * @param chapterTimeData 장별 시간 데이터
 * @param startDate 시작 날짜
 * @param selectedBooks 선택된 성경 범위 (예: [1, 66] 전체)
 */
export function createTimeBasedReadingPlan(
    targetMinutesPerDay: number,
    chapterTimeData: ChapterTimeData[],
    startDate: Date,
    selectedBooks: [number, number] = [1, 66]
): DailyReadingPlan[] {
    const plan: DailyReadingPlan[] = [];
    const targetSecondsPerDay = targetMinutesPerDay * 60;

    let currentDay = 1;
    let currentDate = new Date(startDate);
    let dailyChapters: DailyReadingPlan['chapters'] = [];
    let dailyTotalSeconds = 0;

    // 선택된 범위의 책들을 순회
    for (let bookNum = selectedBooks[0]; bookNum <= selectedBooks[1]; bookNum++) {
        const bookInfo = BibleStep.find(step => step.index === bookNum);
        if (!bookInfo) continue;

        // 각 책의 장들을 순회
        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            // 해당 장의 시간 데이터 찾기
            const timeData = chapterTimeData.find(
                data => data.book === bookNum && data.chapter === chapter
            );

            if (!timeData) continue;

            // 현재 장을 추가했을 때 목표 시간을 크게 초과하는지 확인
            // 14분을 초과한 상태에서 새로운 장을 추가하려고 할 때
            if (dailyTotalSeconds > 14 * 60 && timeData.totalSeconds > 0) {
                // 현재까지의 일일 계획 저장
                plan.push({
                    day: currentDay,
                    date: new Date(currentDate),
                    chapters: [...dailyChapters],
                    totalMinutes: Math.floor(dailyTotalSeconds / 60),
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
        }
    }

    // 마지막 날 데이터 저장
    if (dailyChapters.length > 0) {
        plan.push({
            day: currentDay,
            date: new Date(currentDate),
            chapters: [...dailyChapters],
            totalMinutes: Math.floor(dailyTotalSeconds / 60),
            totalSeconds: dailyTotalSeconds,
            formattedTime: formatTime(dailyTotalSeconds)
        });
    }

    return plan;
}

/**
 * 성경 일독 설정 화면용 예상 계산 (하루 목표 시간 정확히 계산)
 */
export function calculateReadingEstimate(
    targetMinutesPerDay: number,
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
    const plan = createTimeBasedReadingPlan(
        targetMinutesPerDay,
        chapterTimeData,
        startDate,
        selectedBooks
    );

    const totalDays = plan.length;
    const endDate = totalDays > 0 ? plan[plan.length - 1].date : startDate;

    // 전체 읽기 시간 계산
    const totalSeconds = plan.reduce((sum, day) => sum + day.totalSeconds, 0);

    // 평균 일일 읽기 시간 (실제 계획된 시간)
    const avgSecondsPerDay = totalDays > 0 ? Math.round(totalSeconds / totalDays) : 0;
    const avgMinutesPerDay = Math.round(avgSecondsPerDay / 60);

    return {
        totalDays,
        endDate,
        averageTimePerDay: formatTime(avgSecondsPerDay),
        totalReadingTime: formatTime(totalSeconds),
        dailyTimeMinutes: avgMinutesPerDay
    };
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

    // 오늘의 계획 찾기
    const todayPlan = plan.find(day => {
        const planDate = new Date(day.date);
        planDate.setHours(0, 0, 0, 0);
        return planDate.getTime() === today.getTime();
    });

    if (!todayPlan) {
        return {
            totalProgress: 0,
            todayProgress: 0,
            estimatedTimeToday: '0분',
            remainingDays: plan.length,
            isOnTrack: false
        };
    }

    // 전체 진도율 계산
    const totalChapters = plan.reduce((sum, day) => sum + day.chapters.length, 0);
    const totalProgress = (completedChapters.length / totalChapters) * 100;

    // 오늘 진도율 계산
    const todayCompletedCount = todayPlan.chapters.filter(ch =>
        completedChapters.some(c => c.book === ch.book && c.chapter === ch.chapter)
    ).length;
    const todayProgress = (todayCompletedCount / todayPlan.chapters.length) * 100;

    // 남은 일수 계산
    const remainingDays = plan.filter(day => {
        const planDate = new Date(day.date);
        planDate.setHours(0, 0, 0, 0);
        return planDate.getTime() >= today.getTime();
    }).length;

    // 진도 상태 확인
    const expectedProgress = ((todayPlan.day - 1) / plan.length) * 100;
    const isOnTrack = totalProgress >= expectedProgress - 5; // 5% 여유

    return {
        totalProgress: Math.round(totalProgress),
        todayProgress: Math.round(todayProgress),
        estimatedTimeToday: todayPlan.formattedTime,
        remainingDays,
        isOnTrack,
        todayPlan
    };
}

/**
 * 예시: 창세기 데이터로 15분 계획 생성
 */
export function generateExamplePlan(): void {
    // 창세기 1-9장 데이터 (실제 CSV 데이터 기반)
    const genesisData: ChapterTimeData[] = [
        { book: 1, chapter: 1, bookName: '창세기', minutes: 4, seconds: 31, totalSeconds: 271 },
        { book: 1, chapter: 2, bookName: '창세기', minutes: 3, seconds: 22, totalSeconds: 202 },
        { book: 1, chapter: 3, bookName: '창세기', minutes: 3, seconds: 58, totalSeconds: 238 },
        { book: 1, chapter: 4, bookName: '창세기', minutes: 3, seconds: 58, totalSeconds: 238 },
        { book: 1, chapter: 5, bookName: '창세기', minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: 1, chapter: 6, bookName: '창세기', minutes: 3, seconds: 13, totalSeconds: 193 },
        { book: 1, chapter: 7, bookName: '창세기', minutes: 2, seconds: 53, totalSeconds: 173 },
        { book: 1, chapter: 8, bookName: '창세기', minutes: 2, seconds: 55, totalSeconds: 175 },
        { book: 1, chapter: 9, bookName: '창세기', minutes: 3, seconds: 45, totalSeconds: 225 },
    ];

    const plan = createTimeBasedReadingPlan(15, genesisData, new Date(), [1, 1]);

    console.log('15분 목표 성경 읽기 계획:');
    plan.forEach(day => {
        console.log(`\n${day.day}일차 (${day.formattedTime}):`);
        day.chapters.forEach(ch => {
            console.log(`  ${ch.bookName} ${ch.chapter}장 (${ch.minutes}분 ${ch.seconds}초)`);
        });
    });
}

// UI 컴포넌트용 헬퍼 함수들

/**
 * 하루 목표 시간 표시 포맷
 */
export function formatDailyTarget(minutes: number): string {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${minutes}분`;
}

/**
 * 성경 리스트 화면에서 하루 목표 시간 계산
 */
export function calculateDailyTargetTime(dailyPlan: DailyReadingPlan): string {
    return formatTime(dailyPlan.totalSeconds);
}

/**
 * 성경 일독 설정 바텀시트 모달창에서 예상 계산 결과 표시
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
    const dailyTargetSeconds = Math.ceil(totalSeconds / totalDays);

    return {
        dailyTargetTime: formatTime(dailyTargetSeconds),
        totalDays,
        estimatedEndDate: endDate
    };
}