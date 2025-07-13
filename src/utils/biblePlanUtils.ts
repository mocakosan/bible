// src/utils/biblePlanUtils.ts
// 🔥 시간 기반 시스템과 통합된 성경일독 유틸리티

import { Platform, AppState } from 'react-native';
import { defaultStorage } from "./mmkv";
import { BibleStep } from "./define";
import {
    TimeBasedBiblePlan,
    initializePeriodBasedBibleSystem,
    divideChaptersByPeriod,
    calculatePeriodBasedProgress,
    getTodayChapters as getTimeBasedTodayChapters,
    markChapterAsRead as timeBasedMarkChapterAsRead,
    getCurrentDay,
    formatReadingTime,
    formatDate,
    getChapterReadingTime
} from './timeBasedBibleSystem';

// 성경일독 타입 정의 (기존 호환성 유지)
export interface BiblePlanType {
    id: string;
    name: string;
    description: string;
    totalChapters: number;
    totalMinutes: number;
    totalSeconds: number;
}

export interface ReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    type: 'today' | 'yesterday' | 'missed' | 'completed' | 'future';
    estimatedMinutes?: number; // 🔥 시간 정보 추가
}

export interface BiblePlanData {
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;
    chaptersPerDay: number;
    minutesPerDay: number;
    totalChapters: number;
    currentDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;

    // 🔥 시간 기반 확장 필드
    calculatedMinutesPerDay?: number;
    isTimeBasedCalculation?: boolean;
    endDate?: string;
    totalMinutes?: number;
}

// 성경일독 타입 상수 (시간 데이터 업데이트)
export const BIBLE_PLAN_TYPES: BiblePlanType[] = [
    {
        id: 'full_bible',
        name: '성경',
        description: '창세기 1장 ~ 요한계시록 22장',
        totalChapters: 1189,
        totalMinutes: 4715,
        totalSeconds: 29
    },
    {
        id: 'old_testament',
        name: '구약',
        description: '창세기 1장 ~ 말라기 4장',
        totalChapters: 939,
        totalMinutes: 3677,
        totalSeconds: 25
    },
    {
        id: 'new_testament',
        name: '신약',
        description: '마태복음 1장 ~ 요한계시록 22장',
        totalChapters: 250,
        totalMinutes: 1038,
        totalSeconds: 4
    },
    {
        id: 'pentateuch',
        name: '모세오경',
        description: '창세기 1장 ~ 신명기 34장',
        totalChapters: 187,
        totalMinutes: 910,
        totalSeconds: 17
    },
    {
        id: 'psalms',
        name: '시편',
        description: '시편 1장 ~ 시편 150장',
        totalChapters: 150,
        totalMinutes: 326,
        totalSeconds: 29
    }
];

/**
 * 🔥 통합된 현재 일독 계획 데이터 로드
 */
export const loadBiblePlanData = (): BiblePlanData | TimeBasedBiblePlan | null => {
    try {
        // 먼저 새로운 시간 기반 계획 시도
        const newPlan = defaultStorage.getString('bible_reading_plan');
        if (newPlan) {
            const parsed = JSON.parse(newPlan);
            if (parsed.isTimeBasedCalculation) {
                console.log('✅ 시간 기반 계획 로드됨');
                return parsed as TimeBasedBiblePlan;
            }
        }

        // 기존 계획 호환성 지원
        const oldPlan = defaultStorage.getString('bible_plan');
        if (oldPlan) {
            const parsed = JSON.parse(oldPlan);
            console.log('⚠️ 기존 방식 계획 로드됨 (호환 모드)');
            return parsed as BiblePlanData;
        }

        return null;
    } catch (error) {
        console.error('계획 로드 오류:', error);
        return null;
    }
};

/**
 * 🔥 통합된 계획 저장
 */
export const saveBiblePlanData = (planData: BiblePlanData | TimeBasedBiblePlan): void => {
    try {
        if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
            // 시간 기반 계획
            defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
            console.log('💾 시간 기반 계획 저장됨');
        } else {
            // 기존 계획 (호환성)
            defaultStorage.set('bible_plan', JSON.stringify(planData));
            console.log('💾 기존 방식 계획 저장됨');
        }
    } catch (error) {
        console.error('계획 저장 오류:', error);
    }
};

/**
 * 🔥 통합된 계획 삭제
 */
export const deleteBiblePlanData = (): void => {
    try {
        defaultStorage.delete('bible_reading_plan'); // 새로운 시간 기반
        defaultStorage.delete('bible_plan'); // 기존 방식
        console.log('🗑️ 모든 계획 데이터 삭제됨');
    } catch (error) {
        console.error('계획 삭제 오류:', error);
    }
};

/**
 * 🔥 통합된 진행률 계산
 */
export const calculateProgress = (planData: BiblePlanData | TimeBasedBiblePlan | null): any => {
    if (!planData) return {
        totalChapters: 0,
        readChapters: 0,
        progressPercentage: 0,
        currentDay: 1,
        missedChapters: 0
    };

    // 시간 기반 계획인지 확인
    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        const progress = calculatePeriodBasedProgress(planData as TimeBasedBiblePlan);
        return {
            ...progress,
            formattedReadTime: formatReadingTime(progress.readMinutes),
            formattedTotalTime: formatReadingTime(progress.totalMinutes),
            missedChapters: calculateMissedChapters(planData as TimeBasedBiblePlan)
        };
    }

    // 기존 장 기반 계산
    return calculateLegacyProgress(planData as BiblePlanData);
};

/**
 * 🔥 통합된 오늘 읽을 장 조회
 */
export const getTodayChapters = (planData: BiblePlanData | TimeBasedBiblePlan | null): ReadingStatus[] => {
    if (!planData) return [];

    // 시간 기반 계획
    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        const chapters = getTimeBasedTodayChapters(planData as TimeBasedBiblePlan);
        return chapters.map(ch => ({
            book: ch.book,
            chapter: ch.chapter,
            date: ch.date,
            isRead: ch.isRead,
            type: 'today' as const,
            estimatedMinutes: ch.estimatedMinutes
        }));
    }

    // 기존 장 기반 로직
    return getLegacyTodayChapters(planData as BiblePlanData);
};

/**
 * 🔥 통합된 장 읽기 완료 처리
 */
export const markChapterAsRead = (
    planData: BiblePlanData | TimeBasedBiblePlan | null,
    bookName: string,
    chapter: number
): BiblePlanData | TimeBasedBiblePlan | null => {
    if (!planData) return null;

    // 시간 기반 계획
    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        // bookName을 book 인덱스로 변환
        const bookInfo = BibleStep.find(step => step.name === bookName);
        if (!bookInfo) {
            console.error(`❌ 알 수 없는 성경: ${bookName}`);
            return planData;
        }

        return timeBasedMarkChapterAsRead(planData as TimeBasedBiblePlan, bookInfo.index, chapter);
    }

    // 기존 장 기반 처리
    return markLegacyChapterAsRead(planData as BiblePlanData, bookName, chapter);
};

/**
 * 🔥 통합된 놓친 장 수 계산
 */
export const calculateMissedChapters = (planData: BiblePlanData | TimeBasedBiblePlan | null): number => {
    if (!planData) return 0;

    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        return calculateTimeBasedMissedChapters(planData as TimeBasedBiblePlan);
    }

    return calculateLegacyMissedChapters(planData as BiblePlanData);
};

/**
 * 🔥 통합된 장 상태 확인
 */
export const getChapterStatus = (
    planData: BiblePlanData | TimeBasedBiblePlan | null,
    book: number,
    chapter: number
): string => {
    if (!planData) return 'normal';

    // 읽기 완료 확인 (공통)
    const isRead = planData.readChapters?.some(
        (r: any) => r.book === book && r.chapter === chapter && r.isRead
    );

    if (isRead) return 'completed';

    if ((planData as TimeBasedBiblePlan).isTimeBasedCalculation) {
        return getTimeBasedChapterStatus(planData as TimeBasedBiblePlan, book, chapter);
    }

    return getLegacyChapterStatus(planData as BiblePlanData, book, chapter);
};

/**
 * 날짜 포맷 유틸리티
 */
// export const formatDate = (dateString: string): string => {
//     try {
//         const date = new Date(dateString);
//         return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
//     } catch {
//         return dateString;
//     }
// };

/**
 * 🔥 시간 기반 계획 생성 헬퍼
 */
export const createTimeBasedPlan = (
    planType: string,
    startDate: string,
    endDate: string
): TimeBasedBiblePlan => {
    return divideChaptersByPeriod(planType, startDate, endDate);
};

// === 내부 헬퍼 함수들 ===

function calculateTimeBasedMissedChapters(planData: TimeBasedBiblePlan): number {
    const currentDay = getCurrentDay(planData.startDate);
    const progress = calculatePeriodBasedProgress(planData);

    // 현재까지 읽어야 할 시간 기준으로 놓친 정도 계산
    const shouldReadMinutes = Math.min(currentDay, planData.totalDays) * planData.calculatedMinutesPerDay;
    const actualReadMinutes = progress.readMinutes;

    if (shouldReadMinutes <= actualReadMinutes) return 0;

    // 놓친 시간을 대략적인 장수로 변환 (평균 4분/장 기준)
    const missedMinutes = shouldReadMinutes - actualReadMinutes;
    return Math.round(missedMinutes / 4);
}

function getTimeBasedChapterStatus(
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' {
    const currentDay = getCurrentDay(planData.startDate);

    // 오늘 읽어야 할 장들 확인
    const todayChapters = getTimeBasedTodayChapters(planData);
    const isToday = todayChapters.some(ch => ch.book === book && ch.chapter === chapter);
    if (isToday) return 'today';

    // 어제 읽어야 했던 장들 확인
    if (currentDay > 1) {
        const yesterdayReading = getDailyReading(planData, currentDay - 1);
        const isYesterday = yesterdayReading?.chapters.some(ch => ch.book === book && ch.chapter === chapter);
        if (isYesterday) return 'yesterday';
    }

    // 미래에 읽을 장인지 확인 (간단한 순서 기반 체크)
    const bookInfo = BibleStep.find(step => step.index === book);
    if (!bookInfo) return 'normal';

    // 현재 진행 상황 기준으로 미래/과거 판단
    const readChapters = planData.readChapters.filter(r => r.isRead).length;
    const bookRange = getBookRangeForPlan(planData.planType);

    let chapterIndex = 0;
    for (let b = bookRange.start; b <= book; b++) {
        const bInfo = BibleStep.find(step => step.index === b);
        if (!bInfo) continue;

        if (b === book) {
            chapterIndex += chapter;
            break;
        } else {
            chapterIndex += bInfo.count;
        }
    }

    if (chapterIndex > readChapters + 10) return 'future'; // 앞으로 읽을 장
    return 'missed'; // 놓친 장
}

// 기존 시스템 호환 함수들 (더미 구현)
function calculateLegacyProgress(planData: BiblePlanData): any {
    const readCount = planData.readChapters?.filter(r => r.isRead).length || 0;
    const totalChapters = planData.totalChapters || 1189;
    const progressPercentage = (readCount / totalChapters) * 100;

    return {
        totalChapters,
        readChapters: readCount,
        progressPercentage: Math.round(progressPercentage * 10) / 10,
        currentDay: planData.currentDay || 1,
        missedChapters: calculateLegacyMissedChapters(planData)
    };
}

function getLegacyTodayChapters(planData: BiblePlanData): ReadingStatus[] {
    // 기존 장 기반 로직 (간단한 구현)
    const currentDay = planData.currentDay || 1;
    const chaptersPerDay = planData.chaptersPerDay || 3;

    const startChapter = (currentDay - 1) * chaptersPerDay + 1;
    const endChapter = Math.min(startChapter + chaptersPerDay - 1, planData.totalChapters);

    const result: ReadingStatus[] = [];
    let globalChapterIndex = startChapter;

    for (const book of BibleStep) {
        if (globalChapterIndex > endChapter) break;

        for (let chapter = 1; chapter <= book.count; chapter++) {
            if (globalChapterIndex > endChapter) break;
            if (globalChapterIndex >= startChapter) {
                const isRead = planData.readChapters?.some(
                    r => r.book === book.index && r.chapter === chapter && r.isRead
                ) || false;

                result.push({
                    book: book.index,
                    chapter,
                    date: new Date().toISOString(),
                    isRead,
                    type: 'today',
                    estimatedMinutes: getChapterReadingTime(book.index, chapter)
                });
            }
            globalChapterIndex++;
        }
    }

    return result;
}

function markLegacyChapterAsRead(planData: BiblePlanData, bookName: string, chapter: number): BiblePlanData {
    const bookInfo = BibleStep.find(step => step.name === bookName);
    if (!bookInfo) return planData;

    const updatedReadChapters = [...(planData.readChapters || [])];
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === bookInfo.index && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString()
        };
    } else {
        updatedReadChapters.push({
            book: bookInfo.index,
            chapter,
            date: new Date().toISOString(),
            isRead: true,
            type: 'completed',
            estimatedMinutes: getChapterReadingTime(bookInfo.index, chapter)
        });
    }

    return {
        ...planData,
        readChapters: updatedReadChapters
    };
}

function calculateLegacyMissedChapters(planData: BiblePlanData): number {
    const currentDay = planData.currentDay || 1;
    const chaptersPerDay = planData.chaptersPerDay || 3;
    const shouldRead = currentDay * chaptersPerDay;
    const actualRead = planData.readChapters?.filter(r => r.isRead).length || 0;

    return Math.max(0, shouldRead - actualRead);
}

function getLegacyChapterStatus(planData: BiblePlanData, book: number, chapter: number): string {
    // 기존 로직 (간단한 구현)
    return 'normal';
}

// 필요한 함수들을 timeBasedBibleSystem에서 가져와서 사용
function getDailyReading(planData: TimeBasedBiblePlan, day: number) {
    // timeBasedBibleSystem의 getDailyReading 함수 호출
    try {
        const { getDailyReading } = require('./timeBasedBibleSystem');
        return getDailyReading(planData, day);
    } catch {
        return null;
    }
}

function getBookRangeForPlan(planType: string) {
    // timeBasedBibleSystem의 getBookRangeForPlan 함수 호출
    try {
        const { getBookRangeForPlan } = require('./timeBasedBibleSystem');
        return getBookRangeForPlan(planType);
    } catch {
        return { start: 1, end: 66 };
    }
}