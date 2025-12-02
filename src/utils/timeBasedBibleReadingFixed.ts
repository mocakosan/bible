import { BibleStep } from './define';
import { getChapterReadingTime } from './completeBibleReadingTimes';

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
    actualChapterCount: number;
}

// 시간 기반 계획 생성 데이터
export interface TimeBasedPlanData {
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;
    totalChapters: number;
    targetMinutesPerDay: number;  // 고정된 일일 목표 시간
    totalMinutes: number;
    totalSeconds: number;
    dailyReadingSchedule: DailyReadingPlan[];
    averageChaptersPerDay: number;
}

// 시간을 포맷팅하는 함수
function formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return seconds > 0 ? `${hours}시간 ${minutes}분 ${seconds}초` : `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
        return seconds > 0 ? `${minutes}분 ${seconds}초` : `${minutes}분`;
    } else {
        return `${seconds}초`;
    }
}

/**
 * 시간 기반으로 성경 일독 계획 생성 (하루 목표 시간 고정)
 */
export function createFixedTimeBasedReadingPlan(
    totalDays: number,
    totalChapters: number,
    startDate: Date
): TimeBasedPlanData {
    // 1. 전체 성경 시간 계산
    let totalBibleSeconds = 0;

    for (let bookIndex = 1; bookIndex <= 66; bookIndex++) {
        const bookInfo = BibleStep.find(step => step.index === bookIndex);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            totalBibleSeconds += getChapterReadingTime(bookIndex, chapter);
        }
    }

    const totalBibleMinutes = totalBibleSeconds / 60;

    // 2. 하루 목표 시간 계산 (분 단위)
    const targetMinutesPerDay = Math.round(totalBibleMinutes / totalDays);
    const targetSecondsPerDay = targetMinutesPerDay * 60;

    // 3. 일별 읽기 계획 생성
    const dailyReadingSchedule: DailyReadingPlan[] = [];
    let currentDay = 1;
    let currentDate = new Date(startDate);
    let bookIndex = 1;
    let chapterIndex = 1;
    let carryOverSeconds = 0;  // 전날 초과 시간

    while (currentDay <= totalDays && bookIndex <= 66) {
        const dayChapters: DailyReadingPlan['chapters'] = [];
        let dayTotalSeconds = carryOverSeconds;

        // 목표 시간에 도달할 때까지 장 추가
        while (bookIndex <= 66) {
            const bookInfo = BibleStep.find(step => step.index === bookIndex);
            if (!bookInfo) {
                bookIndex++;
                chapterIndex = 1;
                continue;
            }

            if (chapterIndex > bookInfo.count) {
                bookIndex++;
                chapterIndex = 1;
                continue;
            }

            const chapterSeconds = getChapterReadingTime(bookIndex, chapterIndex);

            // 첫 장이거나 목표 시간의 80% 미만일 때만 추가
            if (dayChapters.length === 0 || dayTotalSeconds < targetSecondsPerDay * 0.8) {
                const chapterMinutes = Math.floor(chapterSeconds / 60);
                const chapterRemainSeconds = chapterSeconds % 60;

                dayChapters.push({
                    book: bookIndex,
                    bookName: bookInfo.name,
                    chapter: chapterIndex,
                    minutes: chapterMinutes,
                    seconds: chapterRemainSeconds
                });

                dayTotalSeconds += chapterSeconds;
                chapterIndex++;
            } else {
                break;
            }
        }

        if (dayChapters.length > 0) {
            dailyReadingSchedule.push({
                day: currentDay,
                date: new Date(currentDate),
                chapters: dayChapters,
                totalMinutes: Math.floor(dayTotalSeconds / 60),
                totalSeconds: dayTotalSeconds,
                formattedTime: formatTime(dayTotalSeconds),
                actualChapterCount: dayChapters.length
            });

            // 목표 시간과의 차이를 다음 날로 이월
            carryOverSeconds = Math.max(0, dayTotalSeconds - targetSecondsPerDay);

            currentDay++;
            currentDate.setDate(currentDate.getDate() + 1);
        } else {
            break;
        }
    }

    // 평균 장수 계산
    const totalScheduledChapters = dailyReadingSchedule.reduce(
        (sum, day) => sum + day.actualChapterCount, 0
    );
    const averageChaptersPerDay = totalScheduledChapters / dailyReadingSchedule.length;

    // 마지막 날짜 계산
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + dailyReadingSchedule.length - 1);

    return {
        planType: 'full_bible',
        planName: '성경 전체',
        startDate: startDate.toISOString(),
        targetDate: endDate.toISOString(),
        totalDays: dailyReadingSchedule.length,
        totalChapters: totalScheduledChapters,
        targetMinutesPerDay,
        totalMinutes: totalBibleMinutes,
        totalSeconds: totalBibleSeconds,
        dailyReadingSchedule,
        averageChaptersPerDay
    };
}