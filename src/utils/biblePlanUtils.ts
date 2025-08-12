// src/utils/biblePlanUtils.ts
// 성경 일독 계획 유틸리티 - 시간 기반 계산 통합 버전

import { defaultStorage } from './mmkv';
import { BibleStep } from './define';
import { DailyReadingPlan } from './timeBasedBibleReading';

// 타입 정의
export interface ReadingStatus {
    book: number;
    chapter: number;
    isRead: boolean;
    date?: string;
    bookName?: string;
    estimatedMinutes?: number;
}

// 통합 성경 일독 계획 데이터 타입
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
    totalMinutes?: number;
    totalTimeSeconds?: number;
}

// UnifiedBiblePlan 타입 추가 (호환성)
export type UnifiedBiblePlan = BiblePlanData;

// 진도 정보 타입
export interface ProgressInfo {
    progressPercentage: number;
    schedulePercentage: number;
    readChapters: number;
    totalChapters: number;
    isOnTrack: boolean;
    todayProgress: number;
    estimatedTimeToday: string;
    remainingDays: number;
    expectedProgressPercentage?: number;
}

/**
 * 일독 계획 데이터 로드
 */
export const loadBiblePlanData = (): BiblePlanData | null => {
    try {
        // 먼저 시간 기반 계획 확인
        const timeBasedPlan = defaultStorage.getString('time_based_bible_plan');
        if (timeBasedPlan) {
            const plan = JSON.parse(timeBasedPlan);

            // 호환성을 위한 변환
            return convertTimeBasedPlanToUnified(plan);
        }

        // 기존 계획 확인
        const savedPlan = defaultStorage.getString('bible_reading_plan');
        if (!savedPlan) return null;

        const planData = JSON.parse(savedPlan);

        // dailyPlan의 Date 객체를 다시 Date로 변환
        if (planData.dailyPlan) {
            planData.dailyPlan = planData.dailyPlan.map((day: any) => ({
                ...day,
                date: typeof day.date === 'string' ? new Date(day.date) : day.date
            }));
        }

        return planData;
    } catch (error) {
        console.error('일독 계획 로드 오류:', error);
        return null;
    }
};

/**
 * 시간 기반 계획을 통합 형식으로 변환
 */
function convertTimeBasedPlanToUnified(timeBasedPlan: any): BiblePlanData {
    const readChapters: ReadingStatus[] = [];
    const dailyPlan: DailyReadingPlan[] = [];

    // dailyReadingSchedule를 dailyPlan으로 변환
    timeBasedPlan.dailyReadingSchedule?.forEach((day: any) => {
        const chapters = day.chapters.map((ch: any) => ({
            book: ch.bookName,
            bookIndex: ch.book,
            chapter: ch.chapter,
            duration: ch.duration,
            minutes: Math.floor(ch.estimatedMinutes),
            seconds: Math.round((ch.estimatedMinutes % 1) * 60)
        }));

        dailyPlan.push({
            day: day.day,
            date: new Date(day.date),
            chapters,
            totalMinutes: day.totalMinutes,
            totalSeconds: day.totalMinutes * 60,
            formattedTime: formatTime(day.totalMinutes * 60)
        });

        // readChapters 구성
        day.chapters.forEach((ch: any) => {
            readChapters.push({
                book: ch.book,
                chapter: ch.chapter,
                isRead: ch.isRead,
                bookName: ch.bookName,
                estimatedMinutes: ch.estimatedMinutes
            });
        });
    });

    return {
        planType: timeBasedPlan.planType,
        startDate: timeBasedPlan.startDate,
        endDate: timeBasedPlan.endDate,
        totalDays: timeBasedPlan.totalDays,
        totalChapters: timeBasedPlan.totalChapters,
        chaptersPerDay: Math.ceil(timeBasedPlan.totalChapters / timeBasedPlan.totalDays),
        readChapters,
        createdAt: timeBasedPlan.createdAt,

        // 시간 기반 데이터
        isTimeBasedCalculation: true,
        targetMinutesPerDay: timeBasedPlan.targetMinutesPerDay,
        dailyPlan,
        averageTimePerDay: formatMinutes(timeBasedPlan.targetMinutesPerDay),
        todayEstimatedSeconds: timeBasedPlan.targetMinutesPerDay * 60,
        totalMinutes: timeBasedPlan.totalMinutes
    };
}

/**
 * 일독 계획 데이터 저장
 */
export const saveBiblePlanData = (planData: BiblePlanData): void => {
    try {
        // dailyPlan의 Date 객체를 문자열로 변환
        const dataToSave = {
            ...planData,
            dailyPlan: planData.dailyPlan?.map(day => ({
                ...day,
                date: day.date instanceof Date ? day.date.toISOString() : day.date
            }))
        };

        defaultStorage.set('bible_reading_plan', JSON.stringify(dataToSave));
        console.log('✅ 일독 계획 저장 완료');
    } catch (error) {
        console.error('일독 계획 저장 오류:', error);
    }
};

/**
 * 일독 계획 삭제
 */
export const deleteBiblePlanData = (): void => {
    defaultStorage.delete('bible_reading_plan');
    defaultStorage.delete('time_based_bible_plan');
    console.log('✅ 일독 계획 삭제 완료');
};

/**
 * 현재 날짜 기준 일차 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * 🔥 오늘 읽어야 할 장들 가져오기 - 시간 기반 지원
 */
export const getTodayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    if (!planData) return [];

    try {
        // 시간 기반 계획인 경우
        if (planData.isTimeBasedCalculation && planData.dailyPlan && planData.dailyPlan.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // dailyPlan에서 오늘 날짜 찾기
            const todayPlan = planData.dailyPlan.find(day => {
                const planDate = typeof day.date === 'string' ?
                    new Date(day.date) : day.date;
                planDate.setHours(0, 0, 0, 0);
                return planDate.getTime() === today.getTime();
            });

            if (todayPlan) {
                return todayPlan.chapters.map(ch => ({
                    book: typeof ch.book === 'string' ? getBookIndex(ch.book) : ch.book,
                    chapter: ch.chapter,
                    isRead: false,
                    bookName: typeof ch.book === 'string' ? ch.book : getBookName(ch.book),
                    estimatedMinutes: ch.minutes + (ch.seconds / 60)
                }));
            }
        }

        // 기존 방식 (장수 기반)
        const currentDay = getCurrentDay(planData.startDate);
        const startIndex = (currentDay - 1) * planData.chaptersPerDay;
        const endIndex = startIndex + planData.chaptersPerDay;

        return generateChapterList(planData.planType)
            .slice(startIndex, endIndex)
            .map(ch => ({
                ...ch,
                isRead: planData.readChapters.some(
                    r => r.book === ch.book && r.chapter === ch.chapter && r.isRead
                )
            }));

    } catch (error) {
        console.error('오늘 읽을 장 가져오기 오류:', error);
        return [];
    }
};

/**
 * 진도 계산
 */
export const calculateProgress = (planData: BiblePlanData): ProgressInfo => {
    if (!planData) {
        return {
            progressPercentage: 0,
            schedulePercentage: 0,
            readChapters: 0,
            totalChapters: 0,
            isOnTrack: false,
            todayProgress: 0,
            estimatedTimeToday: '0분',
            remainingDays: 0
        };
    }

    const readChapters = planData.readChapters.filter(ch => ch.isRead).length;
    const progressPercentage = (readChapters / planData.totalChapters) * 100;

    const currentDay = getCurrentDay(planData.startDate);
    const schedulePercentage = (currentDay / planData.totalDays) * 100;

    // 오늘 진도 계산
    const todayChapters = getTodayChapters(planData);
    const todayReadCount = todayChapters.filter(ch =>
        planData.readChapters.some(r =>
            r.book === ch.book && r.chapter === ch.chapter && r.isRead
        )
    ).length;
    const todayProgress = todayChapters.length > 0 ?
        (todayReadCount / todayChapters.length) * 100 : 0;

    // 예상 시간 계산
    let estimatedTimeToday = '0분';
    if (planData.isTimeBasedCalculation && planData.targetMinutesPerDay) {
        estimatedTimeToday = formatMinutes(planData.targetMinutesPerDay);
    } else if (todayChapters.length > 0) {
        const totalMinutes = todayChapters.reduce((sum, ch) =>
            sum + (ch.estimatedMinutes || 4.5), 0
        );
        estimatedTimeToday = formatMinutes(totalMinutes);
    }

    const remainingDays = Math.max(0, planData.totalDays - currentDay + 1);

    return {
        progressPercentage,
        schedulePercentage,
        readChapters,
        totalChapters: planData.totalChapters,
        isOnTrack: progressPercentage >= schedulePercentage - 5,
        todayProgress,
        estimatedTimeToday,
        remainingDays,
        expectedProgressPercentage: schedulePercentage
    };
};

/**
 * 놓친 장들 계산
 */
export const calculateMissedChapters = (planData: BiblePlanData): number => {
    if (!planData) return 0;

    const currentDay = getCurrentDay(planData.startDate);

    if (planData.isTimeBasedCalculation && planData.dailyPlan) {
        // 시간 기반 계획
        let missedCount = 0;

        for (let day = 1; day < currentDay; day++) {
            const dayPlan = planData.dailyPlan[day - 1];
            if (dayPlan) {
                dayPlan.chapters.forEach(ch => {
                    const bookIndex = typeof ch.book === 'string' ?
                        getBookIndex(ch.book) : ch.book;
                    const isRead = planData.readChapters.some(r =>
                        r.book === bookIndex && r.chapter === ch.chapter && r.isRead
                    );
                    if (!isRead) missedCount++;
                });
            }
        }

        return missedCount;
    }

    // 기존 방식
    const shouldHaveRead = Math.min(
        (currentDay - 1) * planData.chaptersPerDay,
        planData.totalChapters
    );
    const actuallyRead = planData.readChapters.filter(ch => ch.isRead).length;

    return Math.max(0, shouldHaveRead - actuallyRead);
};

/**
 * 놓친 장들 가져오기
 */
export const getMissedChapters = (planData: BiblePlanData): ReadingStatus[] => {
    if (!planData) return [];

    const currentDay = getCurrentDay(planData.startDate);
    const missedChapters: ReadingStatus[] = [];

    if (planData.isTimeBasedCalculation && planData.dailyPlan) {
        // 어제까지의 모든 장 확인
        for (let day = 1; day < currentDay; day++) {
            const dayPlan = planData.dailyPlan[day - 1];
            if (dayPlan) {
                dayPlan.chapters.forEach(ch => {
                    const bookIndex = typeof ch.book === 'string' ?
                        getBookIndex(ch.book) : ch.book;
                    const isRead = planData.readChapters.some(r =>
                        r.book === bookIndex && r.chapter === ch.chapter && r.isRead
                    );

                    if (!isRead) {
                        missedChapters.push({
                            book: bookIndex,
                            chapter: ch.chapter,
                            isRead: false,
                            bookName: typeof ch.book === 'string' ? ch.book : getBookName(bookIndex)
                        });
                    }
                });
            }
        }
    }

    return missedChapters;
};

/**
 * 어제 읽어야 했던 장들 가져오기
 */
export const getYesterdayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    if (!planData) return [];

    const currentDay = getCurrentDay(planData.startDate);
    if (currentDay <= 1) return [];

    if (planData.isTimeBasedCalculation && planData.dailyPlan) {
        const yesterdayPlan = planData.dailyPlan[currentDay - 2];
        if (yesterdayPlan) {
            return yesterdayPlan.chapters.map(ch => ({
                book: typeof ch.book === 'string' ? getBookIndex(ch.book) : ch.book,
                chapter: ch.chapter,
                isRead: false,
                bookName: typeof ch.book === 'string' ? ch.book : getBookName(ch.book)
            }));
        }
    }

    return [];
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
};

/**
 * 시간 포맷팅
 */
export const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
};

/**
 * 분 단위 포맷팅
 */
export const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours > 0) {
        return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
};

/**
 * 일일 목표 포맷팅
 */
export const formatDailyTarget = (planData: BiblePlanData): string => {
    if (!planData) return '';

    if (planData.isTimeBasedCalculation && planData.targetMinutesPerDay) {
        return `${planData.targetMinutesPerDay}분`;
    }

    return `${planData.chaptersPerDay}장`;
};

/**
 * 책 인덱스 가져오기
 */
function getBookIndex(bookName: string): number {
    const book = BibleStep.find(b => b.name === bookName);
    return book ? book.index : 1;
}

/**
 * 책 이름 가져오기
 */
function getBookName(bookIndex: number): string {
    const book = BibleStep.find(b => b.index === bookIndex);
    return book ? book.name : '';
}

/**
 * 계획 타입별 장 리스트 생성
 */
function generateChapterList(planType: string): ReadingStatus[] {
    const chapters: ReadingStatus[] = [];
    let startBook = 1;
    let endBook = 66;

    switch (planType) {
        case 'old_testament':
            endBook = 39;
            break;
        case 'new_testament':
            startBook = 40;
            break;
        case 'pentateuch':
            endBook = 5;
            break;
        case 'psalms':
            startBook = 19;
            endBook = 19;
            break;
    }

    for (let bookIndex = startBook; bookIndex <= endBook; bookIndex++) {
        const book = BibleStep.find(b => b.index === bookIndex);
        if (book) {
            for (let chapter = 1; chapter <= book.count; chapter++) {
                chapters.push({
                    book: bookIndex,
                    chapter,
                    isRead: false,
                    bookName: book.name
                });
            }
        }
    }

    return chapters;
}

/**
 * 현재 날짜 기준 진행일 계산 (시간 기반)
 */
export const getCurrentDayFromPlan = (planData: BiblePlanData): number => {
    if (!planData) return 0;
    return getCurrentDay(planData.startDate);
};

/**
 * 예상 완료일 계산
 */
export const getEstimatedCompletionDate = (planData: BiblePlanData): string => {
    if (!planData) return '';

    const progressInfo = calculateProgress(planData);
    if (progressInfo.readChapters === 0) {
        return formatDate(planData.endDate);
    }

    const averageChaptersPerDay = progressInfo.readChapters / getCurrentDay(planData.startDate);
    const remainingChapters = planData.totalChapters - progressInfo.readChapters;
    const estimatedDaysToComplete = Math.ceil(remainingChapters / averageChaptersPerDay);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDaysToComplete);

    return formatDate(estimatedDate);
};

// Export all types and functions
export type { DailyReadingPlan };
export { getCurrentDayFromPlan, getEstimatedCompletionDate };