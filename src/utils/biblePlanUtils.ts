// src/utils/biblePlanUtils.ts
// 기존 장 기반 계산과 새로운 시간 기반 계산을 통합한 유틸리티

import { defaultStorage } from './mmkv';
import { BibleStep } from './define';
import {
    createTimeBasedReadingPlan,
    calculateReadingEstimate,
    calculateProgressInfo,
    getChapterStatus as getTimeBasedChapterStatus,
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
    startDate: string;
    endDate: string;
    targetDate?: string;  // endDate 대신 사용될 수도 있음
    totalDays: number;
    totalChapters: number;
    chaptersPerDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;

    // 시간 기반 계산 필드
    isTimeBasedCalculation?: boolean;
    targetMinutesPerDay?: number;
    minutesPerDay?: number;
    dailyPlan?: DailyReadingPlan[];
    averageTimePerDay?: string;
    todayEstimatedSeconds?: number;
    selectedBooks?: [number, number];
}

/**
 * 일독 계획 데이터 로드
 */
export const loadBiblePlanData = (): BiblePlanData | null => {
    const savedPlan = defaultStorage.getString('bible_reading_plan');
    return savedPlan ? JSON.parse(savedPlan) : null;
};

/**
 * 일독 계획 데이터 저장
 */
export const saveBiblePlanData = (planData: BiblePlanData): void => {
    defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
};

/**
 * 일독 계획 삭제
 */
export const deleteBiblePlanData = (): void => {
    defaultStorage.delete('bible_reading_plan');
};

/**
 * 현재 날짜 기준으로 읽어야 할 일차 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * 오늘 읽어야 할 장들 가져오기 - 통합 버전
 */
export const getTodayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    if (!planData) return [];

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation && planData.dailyPlan) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayPlan = planData.dailyPlan.find(day => {
            const planDate = new Date(day.date);
            planDate.setHours(0, 0, 0, 0);
            return planDate.getTime() === today.getTime();
        });

        if (!todayPlan) return [];

        return todayPlan.chapters.map(ch => ({
            book: ch.book,
            chapter: ch.chapter,
            isRead: planData.readChapters.some(
                r => r.book === ch.book && r.chapter === ch.chapter && r.isRead
            ),
            bookName: ch.bookName,
            estimatedMinutes: ch.minutes + (ch.seconds / 60)
        }));
    }

    // 기존 장 기반 로직
    return getLegacyTodayChapters(planData);
};

/**
 * 장 상태 확인 - 통합 버전
 */
export const getChapterStatus = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    // 읽기 완료 확인 (공통)
    const isRead = planData.readChapters?.some(
        r => r.book === book && r.chapter === chapter && r.isRead
    );

    if (isRead) return 'completed';

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation && planData.dailyPlan) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 오늘의 장들 찾기
        const todayPlan = planData.dailyPlan.find(day => {
            const planDate = new Date(day.date);
            planDate.setHours(0, 0, 0, 0);
            return planDate.getTime() === today.getTime();
        });

        if (todayPlan?.chapters.some(ch => ch.book === book && ch.chapter === chapter)) {
            return 'today';
        }

        // 어제 장들 찾기
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const yesterdayPlan = planData.dailyPlan.find(day => {
            const planDate = new Date(day.date);
            planDate.setHours(0, 0, 0, 0);
            return planDate.getTime() === yesterday.getTime();
        });

        if (yesterdayPlan?.chapters.some(ch => ch.book === book && ch.chapter === chapter)) {
            return 'yesterday';
        }

        // 과거 놓친 장들
        const missedPlan = planData.dailyPlan.find(day => {
            const planDate = new Date(day.date);
            planDate.setHours(0, 0, 0, 0);
            return planDate.getTime() < today.getTime() &&
                day.chapters.some(ch => ch.book === book && ch.chapter === chapter);
        });

        if (missedPlan) return 'missed';

        // 미래 장들
        const futurePlan = planData.dailyPlan.find(day =>
            day.chapters.some(ch => ch.book === book && ch.chapter === chapter)
        );

        if (futurePlan) return 'future';

        return 'normal';
    }

    // 기존 장 기반 로직
    return getLegacyChapterStatus(planData, book, chapter);
};

/**
 * 진행률 계산 - 통합 버전
 */
export const calculateProgress = (planData: BiblePlanData) => {
    if (!planData) {
        return {
            progressPercentage: 0,
            readChapters: 0,
            totalChapters: 0,
            isOnTrack: false,
            todayProgress: 0,
            estimatedTimeToday: '',
            remainingDays: 0
        };
    }

    const readChaptersCount = planData.readChapters?.filter(r => r.isRead).length || 0;
    const totalChapters = planData.totalChapters || 1189;
    const progressPercentage = (readChaptersCount / totalChapters) * 100;

    // 현재 날짜 계산
    const currentDay = getCurrentDay(planData.startDate);
    const scheduledChapters = Math.min(currentDay * planData.chaptersPerDay, planData.totalChapters);
    const isOnTrack = readChaptersCount >= scheduledChapters;

    // 오늘 진도율 계산
    const todayChapters = getTodayChapters(planData);
    const todayReadCount = todayChapters.filter(ch => ch.isRead).length;
    const todayProgress = todayChapters.length > 0 ? (todayReadCount / todayChapters.length) * 100 : 0;

    // 예상 시간 계산
    let estimatedTimeToday = '';
    if (planData.isTimeBasedCalculation && planData.minutesPerDay) {
        estimatedTimeToday = formatTime(planData.minutesPerDay);
    } else if (todayChapters.length > 0) {
        const totalMinutes = todayChapters.reduce((sum, ch) => sum + (ch.estimatedMinutes || 4.5), 0);
        estimatedTimeToday = formatTime(totalMinutes);
    } else {
        estimatedTimeToday = `약 ${planData.chaptersPerDay * 4.5}분`;
    }

    // 남은 일수 계산
    const remainingDays = planData.totalDays - currentDay + 1;

    return {
        progressPercentage: Math.round(progressPercentage),
        readChapters: readChaptersCount,
        totalChapters: totalChapters,
        isOnTrack,
        todayProgress,
        estimatedTimeToday,
        remainingDays: Math.max(0, remainingDays)
    };
};

/**
 * 놓친 장 개수 계산 - 통합 버전
 */
export const calculateMissedChapters = (planData: BiblePlanData): number => {
    if (!planData) return 0;

    if (planData.isTimeBasedCalculation && planData.dailyPlan) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let missedCount = 0;

        planData.dailyPlan.forEach(day => {
            const planDate = new Date(day.date);
            planDate.setHours(0, 0, 0, 0);

            // 오늘 이전의 계획들
            if (planDate.getTime() < today.getTime()) {
                day.chapters.forEach(ch => {
                    const isRead = planData.readChapters.some(
                        r => r.book === ch.book && r.chapter === ch.chapter && r.isRead
                    );
                    if (!isRead) missedCount++;
                });
            }
        });

        return missedCount;
    }

    // 기존 장 기반 로직
    return calculateLegacyMissedChapters(planData);
};

/**
 * 장을 읽음으로 표시
 */
export const markChapterAsRead = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): BiblePlanData => {
    if (!planData) return planData;

    const updatedReadChapters = [...(planData.readChapters || [])];
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === book && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString()
        };
    } else {
        updatedReadChapters.push({
            book,
            chapter,
            isRead: true,
            date: new Date().toISOString()
        });
    }

    const updatedPlanData = {
        ...planData,
        readChapters: updatedReadChapters
    };

    saveBiblePlanData(updatedPlanData);
    return updatedPlanData;
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}년${String(d.getMonth() + 1).padStart(2, '0')}월${String(d.getDate()).padStart(2, '0')}일`;
};

/**
 * 시간 포맷팅 (분 단위)
 */
export const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours > 0) {
        return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
};

/**
 * 하루 목표 시간 표시 포맷 (분 단위)
 */
export const formatDailyTarget = (minutes: number): string => {
    if (!minutes || minutes <= 0) {
        return '0분';
    }

    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${minutes}분`;
};

// ===== 기존 장 기반 로직 (Legacy) =====

const getLegacyTodayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const startIndex = (currentDay - 1) * planData.chaptersPerDay;
    const endIndex = Math.min(startIndex + planData.chaptersPerDay, planData.totalChapters);

    const todayChapters: ReadingStatus[] = [];
    let globalChapterIndex = startIndex;

    for (let i = 0; i < planData.chaptersPerDay && globalChapterIndex < planData.totalChapters; i++) {
        const { book, chapter } = getBookAndChapterFromGlobalIndex(globalChapterIndex, planData.planType);

        const isRead = planData.readChapters.some(
            r => r.book === book && r.chapter === chapter && r.isRead
        );

        todayChapters.push({
            book,
            chapter,
            isRead,
            bookName: BibleStep.find(b => b.index === book)?.name || ''
        });

        globalChapterIndex++;
    }

    return todayChapters;
};

const getLegacyChapterStatus = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    const currentDay = getCurrentDay(planData.startDate);
    const chapterDay = findChapterDayInPlan(book, chapter, planData);

    if (chapterDay === -1) return 'normal';

    if (chapterDay < currentDay - 1) {
        return 'missed';
    } else if (chapterDay === currentDay - 1) {
        return 'yesterday';
    } else if (chapterDay === currentDay) {
        return 'today';
    } else {
        return 'future';
    }
};

const calculateLegacyMissedChapters = (planData: BiblePlanData): number => {
    const currentDay = getCurrentDay(planData.startDate);
    const shouldHaveRead = Math.min(currentDay * planData.chaptersPerDay, planData.totalChapters);
    const actuallyRead = planData.readChapters.filter(r => r.isRead).length;

    return Math.max(0, shouldHaveRead - actuallyRead);
};

// 헬퍼 함수들
const findChapterDayInPlan = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    // 계획 타입에 따른 시작 책 결정
    let startBook = 1;
    let endBook = 66;

    switch (planData.planType) {
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

    // 해당 책이 계획 범위에 포함되는지 확인
    if (book < startBook || book > endBook) {
        return -1;
    }

    // 글로벌 인덱스 계산
    let globalIndex = 0;
    for (const bibleBook of BibleStep) {
        if (bibleBook.index < startBook) continue;
        if (bibleBook.index > endBook) break;

        if (bibleBook.index === book) {
            globalIndex += chapter - 1;
            break;
        }
        if (bibleBook.index < book) {
            globalIndex += bibleBook.count;
        }
    }

    const day = Math.floor(globalIndex / planData.chaptersPerDay) + 1;
    return day <= planData.totalDays ? day : -1;
};

const getBookAndChapterFromGlobalIndex = (
    globalIndex: number,
    planType: string
): { book: number; chapter: number } => {
    let currentIndex = 0;
    let startBook = 1;
    let endBook = 66;

    // 계획 타입에 따른 범위 설정
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

    for (const bibleBook of BibleStep) {
        if (bibleBook.index < startBook) continue;
        if (bibleBook.index > endBook) break;

        if (currentIndex + bibleBook.count > globalIndex) {
            return {
                book: bibleBook.index,
                chapter: globalIndex - currentIndex + 1
            };
        }
        currentIndex += bibleBook.count;
    }

    return { book: startBook, chapter: 1 };
};