import { defaultStorage } from './mmkv';
import {bibleSetting, fetchSql} from './sqlite';

import { BibleStep } from './define';
import {
    loadChapterTimeDataFromCSV,
    getChapterTimeDataForPlan,
    isChapterTimeDataLoaded,
    getChapterTimeData,
    formatChapterTime
} from './csvDataLoader';

export interface CompleteBibleReadingData {
    planInfo: {
        planType: string;
        planName: string;
        startDate: string;
        endDate: string;
        totalDays: number;
        totalChapters: number;
        createdAt: string;
    };
    timeBasedInfo?: {
        isTimeBasedCalculation: boolean;
        targetMinutesPerDay: number;
        totalMinutes: number;
        averageTimePerDay: string;
    };
    allDailySchedules: DailyScheduleData[];
    allChaptersList: ChapterData[];
    statistics: ReadingStatistics;
    currentProgress: CurrentProgress;
}

export interface DailyScheduleData {
    day: number;
    date: string;
    chapters: {
        book: number;
        bookName: string;
        chapter: number;
        duration?: string;
        estimatedMinutes?: number;
        isRead: boolean;
    }[];
    totalMinutes?: number;
    targetMinutes?: number;
    isCompleted: boolean;
    isMissed: boolean;
    isToday: boolean;
    isFuture: boolean;
}

export interface ChapterData {
    book: number;
    bookName: string;
    chapter: number;
    isRead: boolean;
    readDate?: string;
    estimatedMinutes?: number;
    scheduledDay?: number;
    status: 'completed' | 'today' | 'missed' | 'future' | 'normal';
}

export interface ReadingStatistics {
    totalChapters: number;
    readChapters: number;
    unreadChapters: number;
    missedChapters: number;
    completionPercentage: number;
    totalReadingTime?: string;
    averageReadingTimePerDay?: string;
    daysElapsed: number;
    daysRemaining: number;
    isOnTrack: boolean;
}

export interface CurrentProgress {
    currentDay: number;
    todayChapters: ChapterData[];
    todayTotalMinutes?: number;
    todayReadChapters: number;
    todayUnreadChapters: number;
    todayCompletionPercentage: number;
}

export async function loadAllBibleReadingData(): Promise<CompleteBibleReadingData | null> {
    try {
        console.log('📚 ===== 일독 데이터 통합 로딩 시작 =====');

        //MMKV에서 일독 계획 데이터 로드
        const planData = await loadPlanFromStorage();
        if (!planData) {
            console.log('❌ 저장된 일독 계획이 없습니다.');
            return null;
        }

        console.log('✅ 1. 일독 계획 로드 완료:', planData.planType);

        //SQLite에서 전체 읽기 상태 로드
        const readingStatusMap = await loadAllReadingStatusFromDB();
        console.log(`✅ 2. 읽기 상태 로드 완료: ${Object.keys(readingStatusMap).length}개 항목`);

        //CSV 시간 데이터 초기화 (이미 로드되지 않은 경우에만)
        if (!isChapterTimeDataLoaded()) {
            console.log('⏳ CSV 시간 데이터 로드 중...');
            await loadChapterTimeDataFromCSV();
        }
        console.log('✅ 3. 시간 데이터 준비 완료');

        //모든 일별 스케줄 생성
        const allDailySchedules = generateAllDailySchedules(planData, readingStatusMap);
        console.log(`✅ 4. 일별 스케줄 생성 완료: ${allDailySchedules.length}일`);

        //전체 장 리스트 생성
        const allChaptersList = generateAllChaptersList(planData, readingStatusMap, allDailySchedules);
        console.log(`✅ 5. 전체 장 리스트 생성 완료: ${allChaptersList.length}장`);

        //통계 계산
        const statistics = calculateStatistics(planData, allChaptersList, allDailySchedules);
        console.log('✅ 6. 통계 계산 완료');

        //현재 진행 상황 계산
        const currentProgress = calculateCurrentProgress(planData, allDailySchedules, allChaptersList);
        console.log('✅ 7. 현재 진행 상황 계산 완료');

        //통합 데이터 반환
        const completeData: CompleteBibleReadingData = {
            planInfo: {
                planType: planData.planType,
                planName: getPlanTypeName(planData.planType),
                startDate: planData.startDate,
                endDate: planData.endDate || planData.targetDate,
                totalDays: planData.totalDays,
                totalChapters: planData.totalChapters,
                createdAt: planData.createdAt
            },
            timeBasedInfo: planData.isTimeBasedCalculation ? {
                isTimeBasedCalculation: true,
                targetMinutesPerDay: planData.targetMinutesPerDay || 0,
                totalMinutes: planData.totalMinutes || 0,
                averageTimePerDay: planData.averageTimePerDay || '0분'
            } : undefined,
            allDailySchedules,
            allChaptersList,
            statistics,
            currentProgress
        };

        console.log('✅ ===== 일독 데이터 통합 로딩 완료 =====');
        console.log(`📊 요약:
- 총 ${completeData.planInfo.totalDays}일 계획
- 총 ${completeData.planInfo.totalChapters}장
- 읽은 장: ${completeData.statistics.readChapters}장 (${completeData.statistics.completionPercentage.toFixed(1)}%)
- 오늘: ${completeData.currentProgress.currentDay}일차
- 오늘 읽을 장: ${completeData.currentProgress.todayChapters.length}장
        `);

        return completeData;

    } catch (error) {
        console.error('❌ 일독 데이터 로딩 실패:', error);
        return null;
    }
}
async function loadPlanFromStorage(): Promise<any | null> {
    try {
        const timeBasedPlan = defaultStorage.getString('time_based_bible_plan');
        if (timeBasedPlan) {
            return JSON.parse(timeBasedPlan);
        }

        const normalPlan = defaultStorage.getString('bible_reading_plan');
        if (normalPlan) {
            return JSON.parse(normalPlan);
        }

        const legacyPlan = defaultStorage.getString('bible_plan_data');
        if (legacyPlan) {
            return JSON.parse(legacyPlan);
        }

        return null;
    } catch (error) {
        console.error('계획 로드 오류:', error);
        return null;
    }
}

async function loadAllReadingStatusFromDB(): Promise<{ [key: string]: { isRead: boolean; readDate?: string } }> {
    try {
        const selectAllSql = `SELECT book, jang, read, time FROM reading_table`;
        const results = await fetchSql(bibleSetting, selectAllSql, []);

        const statusMap: { [key: string]: { isRead: boolean; readDate?: string } } = {};

        if (Array.isArray(results)) {
            results.forEach((row: any) => {
                const key = `${row.book}_${row.jang}`;

                let isRead = false;
                if (row.read === true || row.read === 'true' || row.read === 'True' || row.read === '1' || row.read === 1) {
                    isRead = true;
                }

                statusMap[key] = {
                    isRead,
                    readDate: row.time || undefined
                };
            });
        }

        return statusMap;
    } catch (error) {
        console.error('읽기 상태 로드 오류:', error);
        return {};
    }
}

function generateAllDailySchedules(
    planData: any,
    readingStatusMap: { [key: string]: { isRead: boolean; readDate?: string } }
): DailyScheduleData[] {
    const schedules: DailyScheduleData[] = [];
    const currentDay = getCurrentDay(planData.startDate);

    if (planData.isTimeBasedCalculation && planData.dailyPlan) {
        planData.dailyPlan.forEach((dayPlan: any) => {
            const chapters = dayPlan.chapters.map((ch: any) => {
                const key = `${ch.book || ch.bookIndex}_${ch.chapter}`;
                const status = readingStatusMap[key];
                const timeData = getChapterTimeData(ch.book || ch.bookIndex, ch.chapter);
                const estimatedMinutes = timeData
                    ? parseFloat((timeData.totalSeconds / 60).toFixed(1))
                    : (ch.estimatedMinutes || ch.minutes || 4);

                return {
                    book: ch.book || ch.bookIndex,
                    bookName: ch.bookName,
                    chapter: ch.chapter,
                    duration: timeData ? formatChapterTime(ch.book || ch.bookIndex, ch.chapter) : ch.duration,
                    estimatedMinutes: estimatedMinutes,
                    isRead: status?.isRead || false
                };
            });

            const isCompleted = chapters.every((ch: any) => ch.isRead);
            const isMissed = dayPlan.day < currentDay && !isCompleted;
            const isToday = dayPlan.day === currentDay;
            const isFuture = dayPlan.day > currentDay;
            const actualTotalMinutes = chapters.reduce((sum: number, ch: any) =>
                sum + (ch.estimatedMinutes || 0), 0
            );

            schedules.push({
                day: dayPlan.day,
                date: dayPlan.date || new Date(planData.startDate).toISOString(),
                chapters,
                totalMinutes: Math.round(actualTotalMinutes),
                targetMinutes: planData.targetMinutesPerDay,
                isCompleted,
                isMissed,
                isToday,
                isFuture
            });
        });
    } else {
        const chaptersPerDay = planData.chaptersPerDay || Math.ceil(planData.totalChapters / planData.totalDays);
        const [startBook, endBook] = planData.selectedBooks || [1, 66];

        let chapterIndex = 0;
        let allChapters: any[] = [];

        for (let bookNum = startBook; bookNum <= endBook; bookNum++) {
            const bookInfo = BibleStep.find(step => step.index === bookNum);
            if (!bookInfo) continue;

            for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                const timeData = getChapterTimeData(bookNum, chapter);
                const estimatedMinutes = timeData
                    ? parseFloat((timeData.totalSeconds / 60).toFixed(1))
                    : 4;

                allChapters.push({
                    book: bookNum,
                    bookName: bookInfo.name,
                    chapter: chapter,
                    estimatedMinutes: estimatedMinutes
                });
            }
        }

        for (let day = 1; day <= planData.totalDays; day++) {
            const dayChapters = allChapters.slice(
                (day - 1) * chaptersPerDay,
                day * chaptersPerDay
            );

            const chapters = dayChapters.map((ch: any) => {
                const key = `${ch.book}_${ch.chapter}`;
                const status = readingStatusMap[key];

                return {
                    ...ch,
                    isRead: status?.isRead || false
                };
            });

            const isCompleted = chapters.every((ch: any) => ch.isRead);
            const isMissed = day < currentDay && !isCompleted;
            const isToday = day === currentDay;
            const isFuture = day > currentDay;
            const totalMinutes = chapters.reduce((sum: number, ch: any) =>
                sum + (ch.estimatedMinutes || 0), 0
            );

            const startDate = new Date(planData.startDate);
            startDate.setDate(startDate.getDate() + (day - 1));

            schedules.push({
                day,
                date: startDate.toISOString(),
                chapters,
                totalMinutes: Math.round(totalMinutes),
                targetMinutes: Math.round(totalMinutes),
                isCompleted,
                isMissed,
                isToday,
                isFuture
            });
        }
    }

    return schedules;
}

function generateAllChaptersList(
    planData: any,
    readingStatusMap: { [key: string]: { isRead: boolean; readDate?: string } },
    allDailySchedules: DailyScheduleData[]
): ChapterData[] {
    const chaptersList: ChapterData[] = [];
    const currentDay = getCurrentDay(planData.startDate);

    allDailySchedules.forEach(schedule => {
        schedule.chapters.forEach(ch => {
            const key = `${ch.book}_${ch.chapter}`;
            const status = readingStatusMap[key];
            let chapterStatus: ChapterData['status'] = 'normal';
            if (status?.isRead) {
                chapterStatus = 'completed';
            } else if (schedule.isToday) {
                chapterStatus = 'today';
            } else if (schedule.isMissed) {
                chapterStatus = 'missed';
            } else if (schedule.isFuture) {
                chapterStatus = 'future';
            }

            chaptersList.push({
                book: ch.book,
                bookName: ch.bookName,
                chapter: ch.chapter,
                isRead: status?.isRead || false,
                readDate: status?.readDate,
                estimatedMinutes: ch.estimatedMinutes,
                scheduledDay: schedule.day,
                status: chapterStatus
            });
        });
    });

    return chaptersList;
}

function calculateStatistics(
    planData: any,
    allChaptersList: ChapterData[],
    allDailySchedules: DailyScheduleData[]
): ReadingStatistics {
    const currentDay = getCurrentDay(planData.startDate);

    const totalChapters = allChaptersList.length;
    const readChapters = allChaptersList.filter(ch => ch.isRead).length;
    const unreadChapters = totalChapters - readChapters;
    const missedChapters = allChaptersList.filter(ch => ch.status === 'missed').length;
    const completionPercentage = totalChapters > 0 ? (readChapters / totalChapters) * 100 : 0;

    const startDate = new Date(planData.startDate);
    const currentDate = new Date();
    const endDate = new Date(planData.endDate || planData.targetDate);

    const daysElapsed = Math.max(0, currentDay - 1);
    const daysRemaining = Math.max(0, planData.totalDays - currentDay + 1);
    const expectedProgress = (daysElapsed / planData.totalDays) * 100;
    const isOnTrack = completionPercentage >= expectedProgress - 5;
    let totalReadingMinutes = 0;
    if (planData.isTimeBasedCalculation && planData.totalMinutes) {
        totalReadingMinutes = planData.totalMinutes;
    } else {
        allChaptersList.forEach(ch => {
            const timeData = getChapterTimeData(ch.book, ch.chapter);
            if (timeData) {
                totalReadingMinutes += timeData.totalSeconds / 60;
            } else {
                totalReadingMinutes += 4; // 기본값
            }
        });
    }

    return {
        totalChapters,
        readChapters,
        unreadChapters,
        missedChapters,
        completionPercentage,
        totalReadingTime: formatMinutes(Math.round(totalReadingMinutes)),
        averageReadingTimePerDay: planData.targetMinutesPerDay
            ? formatMinutes(planData.targetMinutesPerDay)
            : formatMinutes(Math.round(totalReadingMinutes / planData.totalDays)),
        daysElapsed,
        daysRemaining,
        isOnTrack
    };
}

function calculateCurrentProgress(
    planData: any,
    allDailySchedules: DailyScheduleData[],
    allChaptersList: ChapterData[]
): CurrentProgress {
    const currentDay = getCurrentDay(planData.startDate);

    const todaySchedule = allDailySchedules.find(s => s.day === currentDay);
    const todayChapters = allChaptersList.filter(ch => ch.status === 'today');

    const todayReadChapters = todayChapters.filter(ch => ch.isRead).length;
    const todayUnreadChapters = todayChapters.length - todayReadChapters;
    const todayCompletionPercentage = todayChapters.length > 0
        ? (todayReadChapters / todayChapters.length) * 100
        : 0;

    let todayTotalMinutes = 0;
    if (todaySchedule) {
        todayTotalMinutes = todaySchedule.totalMinutes || 0;
    } else {
        todayChapters.forEach(ch => {
            const timeData = getChapterTimeData(ch.book, ch.chapter);
            if (timeData) {
                todayTotalMinutes += timeData.totalSeconds / 60;
            } else {
                todayTotalMinutes += ch.estimatedMinutes || 4;
            }
        });
    }

    return {
        currentDay,
        todayChapters,
        todayTotalMinutes: Math.round(todayTotalMinutes),
        todayReadChapters,
        todayUnreadChapters,
        todayCompletionPercentage
    };
}

function getCurrentDay(startDate: string): number {
    const start = new Date(startDate);
    const current = new Date();

    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);

    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays + 1;
}

function getPlanTypeName(planType: string): string {
    const typeNames: { [key: string]: string } = {
        'full_bible': '성경 전체',
        'old_testament': '구약',
        'new_testament': '신약',
        'pentateuch': '모세오경',
        'psalms': '시편'
    };
    return typeNames[planType] || '성경 일독';
}

function formatMinutes(minutes: number): string {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${minutes}분`;
}

export async function getDailySchedule(day: number): Promise<DailyScheduleData | null> {
    const allData = await loadAllBibleReadingData();
    if (!allData) return null;

    return allData.allDailySchedules.find(s => s.day === day) || null;
}

export async function getChaptersInRange(
    startBook: number,
    startChapter: number,
    endBook: number,
    endChapter: number
): Promise<ChapterData[]> {
    const allData = await loadAllBibleReadingData();
    if (!allData) return [];

    return allData.allChaptersList.filter(ch => {
        if (ch.book < startBook || ch.book > endBook) return false;
        if (ch.book === startBook && ch.chapter < startChapter) return false;
        if (ch.book === endBook && ch.chapter > endChapter) return false;
        return true;
    });
}

export async function getUnreadChapters(): Promise<ChapterData[]> {
    const allData = await loadAllBibleReadingData();
    if (!allData) return [];

    return allData.allChaptersList.filter(ch => !ch.isRead);
}

export async function getMissedChapters(): Promise<ChapterData[]> {
    const allData = await loadAllBibleReadingData();
    if (!allData) return [];

    return allData.allChaptersList.filter(ch => ch.status === 'missed');
}

export async function refreshBibleReadingData(): Promise<CompleteBibleReadingData | null> {
    console.log('🔄 일독 데이터 새로고침...');
    return await loadAllBibleReadingData();
}

export default {
    loadAllBibleReadingData,
    getDailySchedule,
    getChaptersInRange,
    getUnreadChapters,
    getMissedChapters,
    refreshBibleReadingData
};