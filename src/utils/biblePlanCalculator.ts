

// 성경일독 타입별 상세 데이터
import {NewBibleStep, OldBibleStep} from "./define";

export interface BiblePlanTypeDetail {
    id: string;
    name: string;
    description: string;
    totalChapters: number;
    totalMinutes: number;
    totalSeconds: number;
    books: Array<{
        index: number;
        name: string;
        chapters: number;
        estimatedMinutes: number;
    }>;
}

// 실제 성경 데이터를 기반으로 한 정확한 계산
export const DETAILED_BIBLE_PLAN_TYPES: BiblePlanTypeDetail[] = [
    {
        id: 'full_bible',
        name: '성경',
        description: '창세기 1장 ~ 요한계시록 22장',
        totalChapters: calculateTotalChapters([...OldBibleStep, ...NewBibleStep]),
        totalMinutes: 4715,
        totalSeconds: 29,
        books: [...OldBibleStep, ...NewBibleStep].map(book => ({
            index: book.index,
            name: book.name,
            chapters: book.count,
            estimatedMinutes: estimateBookMinutes(book.count, book.index <= 39)
        }))
    },
    {
        id: 'old_testament',
        name: '구약',
        description: '창세기 1장 ~ 말라기 4장',
        totalChapters: calculateTotalChapters(OldBibleStep),
        totalMinutes: 3677,
        totalSeconds: 25,
        books: OldBibleStep.map(book => ({
            index: book.index,
            name: book.name,
            chapters: book.count,
            estimatedMinutes: estimateBookMinutes(book.count, true)
        }))
    },
    {
        id: 'new_testament',
        name: '신약',
        description: '마태복음 1장 ~ 요한계시록 22장',
        totalChapters: calculateTotalChapters(NewBibleStep),
        totalMinutes: 1038,
        totalSeconds: 4,
        books: NewBibleStep.map(book => ({
            index: book.index,
            name: book.name,
            chapters: book.count,
            estimatedMinutes: estimateBookMinutes(book.count, false)
        }))
    },
    {
        id: 'pentateuch',
        name: '모세오경',
        description: '창세기 1장 ~ 신명기 34장',
        totalChapters: calculateTotalChapters(OldBibleStep.slice(0, 5)),
        totalMinutes: 910,
        totalSeconds: 17,
        books: OldBibleStep.slice(0, 5).map(book => ({
            index: book.index,
            name: book.name,
            chapters: book.count,
            estimatedMinutes: estimateBookMinutes(book.count, true)
        }))
    },
    {
        id: 'psalms',
        name: '시편',
        description: '시편 1장 ~ 시편 150장',
        totalChapters: 150,
        totalMinutes: 326,
        totalSeconds: 29,
        books: [{
            index: 19, // 시편의 인덱스
            name: '시편',
            chapters: 150,
            estimatedMinutes: 326
        }]
    }
];

// 총 장수 계산
function calculateTotalChapters(books: Array<{ count: number }>): number {
    return books.reduce((total, book) => total + book.count, 0);
}

// 책별 예상 읽기 시간 계산 (구약/신약에 따라 다름)
function estimateBookMinutes(chapters: number, isOldTestament: boolean): number {
    // 구약은 평균 4분/장, 신약은 평균 4.2분/장
    const avgMinutesPerChapter = isOldTestament ? 4.0 : 4.2;
    return Math.round(chapters * avgMinutesPerChapter);
}

// 일독 계획 계산 결과
export interface ReadingPlanCalculation {
    totalDays: number;
    chaptersPerDay: number;
    minutesPerDay: number;
    dailySchedule: DailyReading[];
    weeklyBreakdown: WeeklyBreakdown[];
}

export interface DailyReading {
    day: number;
    date: string;
    chapters: ChapterReading[];
    totalChapters: number;
    estimatedMinutes: number;
}

export interface ChapterReading {
    bookIndex: number;
    bookName: string;
    chapter: number;
    estimatedMinutes: number;
}

export interface WeeklyBreakdown {
    week: number;
    startDate: string;
    endDate: string;
    totalChapters: number;
    estimatedHours: number;
}

/**
 * 성경일독 계획을 계산하는 메인 함수
 */
export function calculateReadingPlan(
    planTypeId: string,
    startDate: Date,
    endDate: Date
): ReadingPlanCalculation {
    const planType = DETAILED_BIBLE_PLAN_TYPES.find(type => type.id === planTypeId);
    if (!planType) {
        throw new Error(`Invalid plan type: ${planTypeId}`);
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
        throw new Error('End date must be after start date');
    }

    // 기본 계산
    const chaptersPerDay = Math.ceil(planType.totalChapters / totalDays);
    const totalMinutes = planType.totalMinutes + (planType.totalSeconds / 60);
    const minutesPerDay = Math.ceil(totalMinutes / totalDays);

    // 상세 일정 생성
    const dailySchedule = generateDailySchedule(planType, startDate, totalDays, chaptersPerDay);
    const weeklyBreakdown = generateWeeklyBreakdown(dailySchedule);

    return {
        totalDays,
        chaptersPerDay,
        minutesPerDay,
        dailySchedule,
        weeklyBreakdown
    };
}

/**
 * 일별 상세 일정 생성
 */
function generateDailySchedule(
    planType: BiblePlanTypeDetail,
    startDate: Date,
    totalDays: number,
    chaptersPerDay: number
): DailyReading[] {
    const dailySchedule: DailyReading[] = [];
    let currentChapterIndex = 0;

    // 모든 장을 순서대로 배열 생성
    const allChapters: ChapterReading[] = [];
    for (const book of planType.books) {
        const minutesPerChapter = book.estimatedMinutes / book.chapters;
        for (let chapter = 1; chapter <= book.chapters; chapter++) {
            allChapters.push({
                bookIndex: book.index,
                bookName: book.name,
                chapter,
                estimatedMinutes: Math.round(minutesPerChapter)
            });
        }
    }

    // 일별로 장 배분
    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day - 1);

        const dayChapters: ChapterReading[] = [];
        let remainingChapters = Math.min(chaptersPerDay, allChapters.length - currentChapterIndex);

        // 마지막 날에는 남은 모든 장을 배정
        if (day === totalDays) {
            remainingChapters = allChapters.length - currentChapterIndex;
        }

        for (let i = 0; i < remainingChapters && currentChapterIndex < allChapters.length; i++) {
            dayChapters.push(allChapters[currentChapterIndex]);
            currentChapterIndex++;
        }

        const totalMinutes = dayChapters.reduce((sum, chapter) => sum + chapter.estimatedMinutes, 0);

        dailySchedule.push({
            day,
            date: currentDate.toISOString().split('T')[0],
            chapters: dayChapters,
            totalChapters: dayChapters.length,
            estimatedMinutes: totalMinutes
        });

        // 모든 장을 배정했으면 중단
        if (currentChapterIndex >= allChapters.length) {
            break;
        }
    }

    return dailySchedule;
}

/**
 * 주별 요약 생성
 */
function generateWeeklyBreakdown(dailySchedule: DailyReading[]): WeeklyBreakdown[] {
    const weeklyBreakdown: WeeklyBreakdown[] = [];

    for (let i = 0; i < dailySchedule.length; i += 7) {
        const weekDays = dailySchedule.slice(i, i + 7);
        const week = Math.floor(i / 7) + 1;

        const totalChapters = weekDays.reduce((sum, day) => sum + day.totalChapters, 0);
        const totalMinutes = weekDays.reduce((sum, day) => sum + day.estimatedMinutes, 0);

        weeklyBreakdown.push({
            week,
            startDate: weekDays[0].date,
            endDate: weekDays[weekDays.length - 1].date,
            totalChapters,
            estimatedHours: Math.round(totalMinutes / 60 * 10) / 10
        });
    }

    return weeklyBreakdown;
}

/**
 * 특정 날짜의 읽기 계획 조회
 */
export function getDailyReading(
    planType: string,
    startDate: Date,
    currentDate: Date,
    chaptersPerDay: number
): DailyReading | null {
    const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) return null;

    const plan = calculateReadingPlan(planType, startDate, currentDate);
    return plan.dailySchedule[daysDiff] || null;
}

/**
 * 읽기 진도율 계산
 */
export function calculateProgress(
    planType: string,
    startDate: Date,
    currentDate: Date,
    readChapters: Array<{ book: number; chapter: number; isRead: boolean }>
): {
    scheduledProgress: number;
    actualProgress: number;
    isAhead: boolean;
    daysBehind: number;
} {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(type => type.id === planType);
    if (!plan) throw new Error(`Invalid plan type: ${planType}`);

    const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const calculation = calculateReadingPlan(planType, startDate, currentDate);

    // 예정된 진도
    const scheduledChapters = Math.min(
        daysPassed * calculation.chaptersPerDay,
        plan.totalChapters
    );
    const scheduledProgress = (scheduledChapters / plan.totalChapters) * 100;

    // 실제 진도
    const completedChapters = readChapters.filter(ch => ch.isRead).length;
    const actualProgress = (completedChapters / plan.totalChapters) * 100;

    // 진도 비교
    const isAhead = completedChapters >= scheduledChapters;
    const chaptersBehind = Math.max(0, scheduledChapters - completedChapters);
    const daysBehind = Math.ceil(chaptersBehind / calculation.chaptersPerDay);

    return {
        scheduledProgress,
        actualProgress,
        isAhead,
        daysBehind
    };
}

/**
 * 예상 완료일 계산
 */
export function estimateCompletionDate(
    planType: string,
    startDate: Date,
    currentDate: Date,
    readChapters: Array<{ book: number; chapter: number; isRead: boolean }>
): Date {
    const plan = DETAILED_BIBLE_PLAN_TYPES.find(type => type.id === planType);
    if (!plan) throw new Error(`Invalid plan type: ${planType}`);

    const completedChapters = readChapters.filter(ch => ch.isRead).length;
    const remainingChapters = plan.totalChapters - completedChapters;

    if (remainingChapters <= 0) return currentDate;

    // 최근 7일간의 평균 읽기 속도 계산
    const recentReadings = readChapters.filter(ch => {
        const readDate = new Date(ch.isRead ? new Date() : startDate); // 실제로는 읽은 날짜 정보가 필요
        const daysDiff = (currentDate.getTime() - readDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7 && ch.isRead;
    });

    const avgChaptersPerDay = recentReadings.length > 0 ? recentReadings.length / 7 : 1;
    const estimatedDaysToComplete = Math.ceil(remainingChapters / Math.max(avgChaptersPerDay, 1));

    const completionDate = new Date(currentDate);
    completionDate.setDate(completionDate.getDate() + estimatedDaysToComplete);

    return completionDate;
}