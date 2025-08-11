// src/utils/biblePlanUtils.ts
// 성경 일독 계획 유틸리티 - getTodayChapters 오류 수정 버전

import { defaultStorage } from './mmkv';
import { BibleStep } from './define';
import {
    createTimeBasedReadingPlan,
    calculateReadingEstimate,
    calculateProgressInfo,
    DailyReadingPlan
} from './timeBasedBibleReading';
import { loadChapterTimeDataFromCSV, getChapterTimeDataForPlan } from './csvDataLoader';

// 타입 정의
export interface ReadingStatus {
    book: number;
    chapter: number;
    isRead: boolean;
    bookName?: string;
    estimatedMinutes?: number;
    date?: string;
}

export interface BiblePlanData {
    planType: string;
    planName?: string;
    startDate: string;
    endDate: string;
    targetDate?: string;
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;

    // 시간 기반 필드
    isTimeBasedCalculation?: boolean;
    targetMinutesPerDay?: number;
    dailyPlan?: DailyReadingPlan[];
    averageTimePerDay?: string;
    totalReadingTime?: string;
    selectedBooks?: [number, number];
}

/**
 * 일독 계획 데이터 로드
 */
export const loadBiblePlanData = (): BiblePlanData | null => {
    try {
        const savedPlan = defaultStorage.getString('bible_reading_plan');
        if (!savedPlan) return null;

        const planData = JSON.parse(savedPlan);

        // 날짜 문자열을 Date 객체로 변환이 필요한 경우 처리
        if (planData.dailyPlan && Array.isArray(planData.dailyPlan)) {
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
 * 🔥 오늘 읽어야 할 장들 가져오기 - 오류 수정 버전
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
                const planDate = typeof day.date === 'string' ? new Date(day.date) : day.date;
                const pd = new Date(planDate);
                pd.setHours(0, 0, 0, 0);
                return pd.getTime() === today.getTime();
            });

            if (!todayPlan || !todayPlan.chapters) {
                console.log('오늘 계획이 없음');
                return [];
            }

            // chapters 배열을 ReadingStatus 형식으로 변환
            return todayPlan.chapters.map(ch => ({
                book: ch.book,
                chapter: ch.chapter,
                isRead: planData.readChapters?.some(
                    r => r.book === ch.book && r.chapter === ch.chapter && r.isRead
                ) || false,
                bookName: ch.bookName,
                estimatedMinutes: ch.minutes + (ch.seconds / 60)
            }));
        }

        // 기존 장 기반 로직 (fallback)
        return getLegacyTodayChapters(planData);

    } catch (error) {
        console.error('getTodayChapters 오류:', error);
        return getLegacyTodayChapters(planData);
    }
};

/**
 * 🔥 어제 읽어야 했던 장들 가져오기
 */
export const getYesterdayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    if (!planData) return [];

    try {
        // 시간 기반 계획인 경우
        if (planData.isTimeBasedCalculation && planData.dailyPlan && planData.dailyPlan.length > 0) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const yesterdayPlan = planData.dailyPlan.find(day => {
                const planDate = typeof day.date === 'string' ? new Date(day.date) : day.date;
                const pd = new Date(planDate);
                pd.setHours(0, 0, 0, 0);
                return pd.getTime() === yesterday.getTime();
            });

            if (!yesterdayPlan || !yesterdayPlan.chapters) {
                return [];
            }

            return yesterdayPlan.chapters.map(ch => ({
                book: ch.book,
                chapter: ch.chapter,
                isRead: planData.readChapters?.some(
                    r => r.book === ch.book && r.chapter === ch.chapter && r.isRead
                ) || false,
                bookName: ch.bookName,
                estimatedMinutes: ch.minutes + (ch.seconds / 60)
            }));
        }

        // 기존 장 기반 로직
        return getLegacyYesterdayChapters(planData);

    } catch (error) {
        console.error('getYesterdayChapters 오류:', error);
        return [];
    }
};

/**
 * 🔥 진도 계산 - 오류 수정 버전
 */
export const calculateProgress = (planData: BiblePlanData): {
    readChapters: number;
    totalChapters: number;
    progressPercentage: number;
    todayProgress?: number;
    isOnTrack?: boolean;
} => {
    if (!planData) {
        return { readChapters: 0, totalChapters: 0, progressPercentage: 0 };
    }

    try {
        const readChapters = planData.readChapters?.filter(r => r.isRead).length || 0;
        const totalChapters = planData.totalChapters || 0;
        const progressPercentage = totalChapters > 0 ? (readChapters / totalChapters) * 100 : 0;

        // 시간 기반 추가 정보
        if (planData.isTimeBasedCalculation && planData.dailyPlan) {
            const todayChapters = getTodayChapters(planData);
            const todayReadChapters = todayChapters.filter(ch =>
                planData.readChapters?.some(r =>
                    r.book === ch.book && r.chapter === ch.chapter && r.isRead
                )
            ).length;

            const todayProgress = todayChapters.length > 0
                ? (todayReadChapters / todayChapters.length) * 100
                : 0;

            const currentDay = getCurrentDay(planData.startDate);
            const expectedProgress = (currentDay / planData.totalDays) * 100;
            const isOnTrack = progressPercentage >= expectedProgress - 5; // 5% 여유

            return {
                readChapters,
                totalChapters,
                progressPercentage,
                todayProgress,
                isOnTrack
            };
        }

        return { readChapters, totalChapters, progressPercentage };

    } catch (error) {
        console.error('calculateProgress 오류:', error);
        return { readChapters: 0, totalChapters: 0, progressPercentage: 0 };
    }
};

/**
 * 🔥 놓친 장들 계산 - 오류 수정 버전
 */
export const calculateMissedChapters = (planData: BiblePlanData): number => {
    if (!planData) return 0;

    try {
        if (planData.isTimeBasedCalculation && planData.dailyPlan) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let missedCount = 0;

            for (const day of planData.dailyPlan) {
                const dayDate = typeof day.date === 'string' ? new Date(day.date) : day.date;
                const dd = new Date(dayDate);
                dd.setHours(0, 0, 0, 0);

                // 오늘 이전의 날짜들만 체크
                if (dd.getTime() < today.getTime()) {
                    if (day.chapters && Array.isArray(day.chapters)) {
                        for (const chapter of day.chapters) {
                            const isRead = planData.readChapters?.some(
                                r => r.book === chapter.book &&
                                    r.chapter === chapter.chapter &&
                                    r.isRead
                            ) || false;
                            if (!isRead) missedCount++;
                        }
                    }
                }
            }

            return missedCount;
        }

        // 기존 로직 (fallback)
        return getLegacyMissedChapters(planData);

    } catch (error) {
        console.error('calculateMissedChapters 오류:', error);
        return 0;
    }
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
};

// === Legacy 함수들 (하위 호환성) ===

function getLegacyTodayChapters(planData: BiblePlanData): ReadingStatus[] {
    try {
        const currentDay = getCurrentDay(planData.startDate);
        const startChapterIndex = (currentDay - 1) * planData.chaptersPerDay;
        const endChapterIndex = Math.min(
            startChapterIndex + planData.chaptersPerDay,
            planData.totalChapters
        );

        const chapters: ReadingStatus[] = [];
        let chapterCount = 0;

        for (let book = 1; book <= 66 && chapterCount < endChapterIndex; book++) {
            const bookInfo = BibleStep.find(b => b.index === book);
            if (!bookInfo) continue;

            for (let chapter = 1; chapter <= bookInfo.count && chapterCount < endChapterIndex; chapter++) {
                if (chapterCount >= startChapterIndex) {
                    chapters.push({
                        book,
                        chapter,
                        isRead: planData.readChapters?.some(
                            r => r.book === book && r.chapter === chapter && r.isRead
                        ) || false,
                        bookName: bookInfo.name
                    });
                }
                chapterCount++;
            }
        }

        return chapters;
    } catch (error) {
        console.error('getLegacyTodayChapters 오류:', error);
        return [];
    }
}

function getLegacyYesterdayChapters(planData: BiblePlanData): ReadingStatus[] {
    try {
        const currentDay = getCurrentDay(planData.startDate);
        if (currentDay <= 1) return [];

        const yesterdayDay = currentDay - 1;
        const startChapterIndex = (yesterdayDay - 1) * planData.chaptersPerDay;
        const endChapterIndex = Math.min(
            startChapterIndex + planData.chaptersPerDay,
            planData.totalChapters
        );

        const chapters: ReadingStatus[] = [];
        let chapterCount = 0;

        for (let book = 1; book <= 66 && chapterCount < endChapterIndex; book++) {
            const bookInfo = BibleStep.find(b => b.index === book);
            if (!bookInfo) continue;

            for (let chapter = 1; chapter <= bookInfo.count && chapterCount < endChapterIndex; chapter++) {
                if (chapterCount >= startChapterIndex) {
                    chapters.push({
                        book,
                        chapter,
                        isRead: planData.readChapters?.some(
                            r => r.book === book && r.chapter === chapter && r.isRead
                        ) || false,
                        bookName: bookInfo.name
                    });
                }
                chapterCount++;
            }
        }

        return chapters;
    } catch (error) {
        console.error('getLegacyYesterdayChapters 오류:', error);
        return [];
    }
}

function getLegacyMissedChapters(planData: BiblePlanData): number {
    try {
        const currentDay = getCurrentDay(planData.startDate);
        const shouldHaveRead = Math.min(
            currentDay * planData.chaptersPerDay,
            planData.totalChapters
        );
        const actuallyRead = planData.readChapters?.filter(r => r.isRead).length || 0;
        return Math.max(0, shouldHaveRead - actuallyRead);
    } catch (error) {
        console.error('getLegacyMissedChapters 오류:', error);
        return 0;
    }
}