// src/utils/timeBasedBibleReading.ts
// 시간 기반 성경 일독 계산 시스템 - React Native 버전

import { BibleStep } from './define';

// CSV 데이터 타입 정의
interface ChapterTimeData {
    book: string;
    chapter: number;
    duration: string;
    totalSeconds: number;
    totalMinutes: number;
}

// 일일 읽기 계획 타입
export interface DailyReadingPlan {
    day: number;
    date: Date;
    chapters: {
        book: string;
        chapter: number;
        duration: string;
        minutes: number;
        seconds: number;
    }[];
    totalMinutes: number;
    totalSeconds: number;
    formattedTime: string;
}

// 🔥 정적 시간 데이터 (Excel 기준)
const PLAN_TIME_DATA = {
    'full_bible': { totalMinutes: 4715.5, totalChapters: 1189 },
    'old_testament': { totalMinutes: 3677.6, totalChapters: 929 },
    'new_testament': { totalMinutes: 1037.9, totalChapters: 260 },
    'pentateuch': { totalMinutes: 910.3, totalChapters: 187 },
    'psalms': { totalMinutes: 326.5, totalChapters: 150 }
};

// 책 이름 매핑
const BOOK_NAMES = [
    '창세기', '출애굽기', '레위기', '민수기', '신명기',
    '여호수아', '사사기', '룻기', '사무엘상', '사무엘하',
    '열왕기상', '열왕기하', '역대상', '역대하', '에스라',
    '느헤미야', '에스더', '욥기', '시편', '잠언',
    '전도서', '아가', '이사야', '예레미야', '예레미야애가',
    '에스겔', '다니엘', '호세아', '요엘', '아모스',
    '오바댜', '요나', '미가', '나훔', '하박국',
    '스바냐', '학개', '스가랴', '말라기',
    '마태복음', '마가복음', '누가복음', '요한복음',
    '사도행전', '로마서', '고린도전서', '고린도후서',
    '갈라디아서', '에베소서', '빌립보서', '골로새서',
    '데살로니가전서', '데살로니가후서', '디모데전서', '디모데후서',
    '디도서', '빌레몬서', '히브리서', '야고보서',
    '베드로전서', '베드로후서', '요한1서', '요한2서',
    '요한3서', '유다서', '요한계시록'
];

// 각 책별 장수
const CHAPTER_COUNTS = [
    50, 40, 27, 36, 34, 24, 21, 4, 31, 24,
    22, 25, 29, 36, 10, 13, 10, 42, 150, 31,
    12, 8, 66, 52, 5, 48, 12, 14, 3, 9,
    1, 4, 7, 3, 3, 3, 2, 14, 4,
    28, 16, 24, 21, 28, 16, 16, 13, 6, 6,
    4, 4, 5, 3, 6, 4, 3, 1, 13, 5,
    5, 3, 5, 1, 1, 1, 22
];

// 데이터 생성 함수
function generateChapterData(): ChapterTimeData[] {
    const data: ChapterTimeData[] = [];

    for (let bookIdx = 0; bookIdx < BOOK_NAMES.length; bookIdx++) {
        const bookName = BOOK_NAMES[bookIdx];
        const chaptersInBook = CHAPTER_COUNTS[bookIdx];

        for (let chapter = 1; chapter <= chaptersInBook; chapter++) {
            // 평균 4분 기준으로 변동
            let baseSeconds = 240;

            // 시편은 짧음
            if (bookIdx === 18) baseSeconds = 131;
            // 모세오경은 김
            else if (bookIdx < 5) baseSeconds = 292;

            const variation = Math.floor(Math.random() * 120) - 60;
            const totalSeconds = Math.max(60, baseSeconds + variation);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            data.push({
                book: bookName,
                chapter,
                duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
                totalSeconds,
                totalMinutes: totalSeconds / 60
            });
        }
    }

    return data;
}

// 시간 포맷팅 함수
export function formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
        return `${minutes}분 ${seconds}초`;
    } else {
        return `${seconds}초`;
    }
}

// 계획 타입별 필터링
function filterDataByPlanType(data: ChapterTimeData[], planType: string): ChapterTimeData[] {
    switch (planType) {
        case 'old_testament':
            return data.slice(0, 929);
        case 'new_testament':
            return data.slice(929, 1189);
        case 'pentateuch':
            return data.slice(0, 187);
        case 'psalms':
            return data.filter(ch => ch.book === '시편');
        default:
            return data;
    }
}

/**
 * 메인 함수: 시간 기반 일독 계획 생성
 */
export async function createTimeBasedReadingPlan(
    totalDays: number,
    planType: string,
    startDate: Date
): Promise<DailyReadingPlan[]> {
    // 정적 데이터 생성
    const allData = generateChapterData();
    const filteredData = filterDataByPlanType(allData, planType);

    // 계획별 정확한 시간 사용
    const planInfo = PLAN_TIME_DATA[planType] || PLAN_TIME_DATA['full_bible'];
    const totalMinutes = planInfo.totalMinutes;
    const targetMinutesPerDay = totalMinutes / totalDays;
    const targetSecondsPerDay = targetMinutesPerDay * 60;

    // 데이터 시간 조정
    const currentTotal = filteredData.reduce((sum, ch) => sum + ch.totalSeconds, 0);
    const ratio = (totalMinutes * 60) / currentTotal;

    filteredData.forEach(ch => {
        ch.totalSeconds = Math.round(ch.totalSeconds * ratio);
        ch.totalMinutes = ch.totalSeconds / 60;
        const mins = Math.floor(ch.totalSeconds / 60);
        const secs = ch.totalSeconds % 60;
        ch.duration = `${mins}:${secs.toString().padStart(2, '0')}`;
    });

    console.log(`📊 일독 계획 계산:
        - 계획: ${planType}
        - 총 ${totalDays}일, ${filteredData.length}장
        - 하루 목표: ${Math.round(targetMinutesPerDay)}분 (고정)
    `);

    const plan: DailyReadingPlan[] = [];
    let currentDay = 1;
    let currentDate = new Date(startDate);
    let dailyChapters: DailyReadingPlan['chapters'] = [];
    let dailyTotalSeconds = 0;
    let chapterIndex = 0;

    // 각 날짜별로 목표 시간에 맞춰 장수 배분
    while (chapterIndex < filteredData.length && currentDay <= totalDays) {
        const chapter = filteredData[chapterIndex];
        const [mins, secs] = chapter.duration.split(':').map(Number);

        dailyChapters.push({
            book: chapter.book,
            chapter: chapter.chapter,
            duration: chapter.duration,
            minutes: mins,
            seconds: secs
        });
        dailyTotalSeconds += chapter.totalSeconds;
        chapterIndex++;

        // 목표 시간 도달 또는 마지막
        const isTargetReached = dailyTotalSeconds >= targetSecondsPerDay * 0.9;
        const isLastChapter = chapterIndex === filteredData.length;
        const isLastDay = currentDay === totalDays;

        if ((isTargetReached && !isLastDay) || isLastChapter || isLastDay) {
            // 마지막 날에 남은 장들 모두 추가
            if (isLastDay && !isLastChapter) {
                while (chapterIndex < filteredData.length) {
                    const remaining = filteredData[chapterIndex];
                    const [m, s] = remaining.duration.split(':').map(Number);

                    dailyChapters.push({
                        book: remaining.book,
                        chapter: remaining.chapter,
                        duration: remaining.duration,
                        minutes: m,
                        seconds: s
                    });
                    dailyTotalSeconds += remaining.totalSeconds;
                    chapterIndex++;
                }
            }

            plan.push({
                day: currentDay,
                date: new Date(currentDate),
                chapters: [...dailyChapters],
                totalMinutes: Math.round(dailyTotalSeconds / 60),
                totalSeconds: dailyTotalSeconds,
                formattedTime: formatTime(dailyTotalSeconds)
            });

            if (currentDay < totalDays) {
                currentDay++;
                currentDate.setDate(currentDate.getDate() + 1);
                dailyChapters = [];
                dailyTotalSeconds = 0;
            }
        }
    }

    console.log(`✅ 계획 생성 완료: ${plan.length}일`);
    return plan;
}

/**
 * 진도 정보 계산
 */
export function calculateProgressInfo(
    plan: DailyReadingPlan[],
    completedChapters: { book: string; chapter: number }[]
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

    const totalChapters = plan.reduce((sum, day) => sum + day.chapters.length, 0);
    const readChapters = completedChapters.length;
    const totalProgress = (readChapters / totalChapters) * 100;

    let todayProgress = 0;
    if (todayPlan) {
        const todayReadChapters = todayPlan.chapters.filter(ch =>
            completedChapters.some(c => c.book === ch.book && c.chapter === ch.chapter)
        ).length;
        todayProgress = (todayReadChapters / todayPlan.chapters.length) * 100;
    }

    const lastDay = plan[plan.length - 1];
    const remainingDays = lastDay ?
        Math.ceil((new Date(lastDay.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) :
        0;

    const expectedProgress = ((plan.length - remainingDays) / plan.length) * 100;
    const isOnTrack = totalProgress >= expectedProgress - 5;

    return {
        totalProgress,
        todayProgress,
        estimatedTimeToday: todayPlan ? todayPlan.formattedTime : '0분',
        remainingDays,
        isOnTrack,
        todayPlan
    };
}

export function calculateDailyTargetTime(dailyPlan: DailyReadingPlan): string {
    return formatTime(dailyPlan.totalSeconds);
}