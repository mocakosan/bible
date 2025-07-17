// src/utils/timeBasedBibleSystem.ts
// 🔥 완전한 시간 기반 성경 읽기 시스템 - 음성파일 길이 기반

import { BibleStep } from './define';
import { calculateTotalPsalmsTime, optimizePsalmsFor25Days } from './psalmsCalculationFix';

// === 타입 정의 ===
export interface TimeBasedBiblePlan {
    planType: string;
    planName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    calculatedMinutesPerDay: number;  // 시작일~종료일 기간 기반 자동 계산된 하루 시간
    totalMinutes: number;
    totalChapters: number;

    // 시간 기반 계산 표시
    isTimeBasedCalculation: true;

    // 진행 상태
    currentDay: number;
    readChapters: ReadChapterStatus[];
    dailyReadingSchedule: DailyReadingSchedule[]; // 전체 일정 저장

    // 메타데이터
    createdAt: string;
    lastModified?: string;
    version: string;
    metadata?: {
        creationMethod: string;
        audioDataUsed: boolean;
        estimatedCompletionDate: string;
    };
}

export interface ReadChapterStatus {
    book: number;
    chapter: number;
    bookName: string;
    date: string;
    isRead: boolean;
    estimatedMinutes: number;  // 해당 장의 예상 읽기 시간
}

export interface DailyReadingSchedule {
    day: number;
    date: string;
    chapters: {
        book: number;
        chapter: number;
        bookName: string;
        estimatedMinutes: number;
    }[];
    totalMinutes: number;
}

export interface DailyReading {
    day: number;
    date: string;
    chapters: ReadChapterStatus[];
    totalMinutes: number;
    isCompleted: boolean;
}

// === 음성 파일 시간 데이터 관리 ===
let chapterTimeMap: Map<string, number> = new Map();

/**
 * 🔥 React Native 호환 초기화 함수
 * CSV 파일 대신 정적 데이터 사용
 */
export const initializePeriodBasedBibleSystem = async (): Promise<boolean> => {
    try {
        console.log('🔄 시간 기반 성경 시스템 초기화 시작 (React Native 호환)');

        // 기본 추정치로 초기화
        initializeDefaultTimes();

        console.log('✅ 시간 기반 시스템 초기화 완료');
        return true;

    } catch (error) {
        console.warn('⚠️ 음성 데이터 로드 실패, 기본 추정치 사용:', error);
        initializeDefaultTimes();
        return false;
    }
};

/**
 * 기본 추정 시간으로 초기화
 */
const initializeDefaultTimes = () => {
    chapterTimeMap.clear();

    BibleStep.forEach(book => {
        for (let chapter = 1; chapter <= book.count; chapter++) {
            const key = `${book.index}_${chapter}`;
            let estimatedTime = 4.0; // 기본 4분

            // 성경별 시간 추정
            if (book.index === 19) {
                // 시편 장별 특별 처리
                if (chapter === 119) estimatedTime = 8.5;  // 가장 긴 시편
                else if (chapter === 117) estimatedTime = 0.5;  // 가장 짧은 시편
                else if ([23, 1, 8, 100].includes(chapter)) estimatedTime = 1.5; // 유명한 짧은 시편들
                else estimatedTime = 2.5; // 시편 평균
            } else if (book.index === 20) {
                estimatedTime = 3.5; // 잠언
            } else if (book.index <= 39) {
                estimatedTime = 4.0; // 구약
            } else {
                estimatedTime = 4.2; // 신약
            }

            chapterTimeMap.set(key, estimatedTime);
        }
    });

    console.log(`✅ 기본 추정 시간 데이터 초기화 완료: ${chapterTimeMap.size}개`);
};

/**
 * 특정 장의 예상 읽기 시간 반환 (분)
 */
export const getChapterReadingTime = (book: number, chapter: number): number => {
    const key = `${book}_${chapter}`;
    return chapterTimeMap.get(key) || 4.0;
};

/**
 * 계획별 성경 범위 반환
 */
export const getBookRangeForPlan = (planType: string): { start: number, end: number } => {
    switch (planType) {
        case 'full_bible': return { start: 1, end: 66 };
        case 'old_testament': return { start: 1, end: 39 };
        case 'new_testament': return { start: 40, end: 66 };
        case 'pentateuch': return { start: 1, end: 5 };
        case 'psalms': return { start: 19, end: 19 };
        default: return { start: 1, end: 66 };
    }
};

/**
 * 🔥 핵심 함수: 시간 기반으로 장을 나누되 종료일까지의 기간으로 하루 시간 자동 계산
 */
export const divideChaptersByPeriod = (
    planType: string,
    startDate: string,
    endDate: string
): TimeBasedBiblePlan => {
    console.log(`📊 시간 기반 계획 생성: ${planType}, ${startDate} ~ ${endDate}`);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 🔥 시편 전용 처리
    if (planType === 'psalms') {
        const totalTime = calculateTotalPsalmsTime(); // 375분
        const calculatedMinutesPerDay = Math.round((totalTime / totalDays) * 10) / 10;

        // 25일 계획의 경우 최적화 적용
        if (totalDays === 25) {
            const optimized = optimizePsalmsFor25Days();
            return {
                planType,
                planName: '시편',
                startDate,
                endDate,
                totalDays,
                calculatedMinutesPerDay: optimized.recommendedTimePerDay, // 정확한 15분
                totalMinutes: Math.round(totalTime),
                totalChapters: 150,
                isTimeBasedCalculation: true,
                currentDay: 1,
                readChapters: [],
                dailyReadingSchedule: optimized.dailySchedule,
                createdAt: new Date().toISOString(),
                version: '2.1_psalms_optimized'
            };
        }

        // 다른 기간의 시편 계획
        const schedule = createOptimizedSchedule(planType, startDate, totalDays, calculatedMinutesPerDay);
        return {
            planType,
            planName: '시편',
            startDate,
            endDate,
            totalDays,
            calculatedMinutesPerDay,
            totalMinutes: Math.round(totalTime),
            totalChapters: 150,
            isTimeBasedCalculation: true,
            currentDay: 1,
            readChapters: [],
            dailyReadingSchedule: schedule,
            createdAt: new Date().toISOString(),
            version: '2.0_time_based'
        };
    }

    // 🔥 다른 계획들 처리
    const bookRange = getBookRangeForPlan(planType);
    let totalTime = 0;
    let totalChapters = 0;

    // 총 시간과 장수 계산
    for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (bookInfo) {
            for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                totalTime += getChapterReadingTime(book, chapter);
                totalChapters++;
            }
        }
    }

    const calculatedMinutesPerDay = Math.round((totalTime / totalDays) * 10) / 10;
    const schedule = createOptimizedSchedule(planType, startDate, totalDays, calculatedMinutesPerDay);

    const planNames: { [key: string]: string } = {
        'full_bible': '성경',
        'old_testament': '구약',
        'new_testament': '신약',
        'pentateuch': '모세오경',
        'psalms': '시편'
    };

    return {
        planType,
        planName: planNames[planType] || '성경',
        startDate,
        endDate,
        totalDays,
        calculatedMinutesPerDay,
        totalMinutes: Math.round(totalTime),
        totalChapters,
        isTimeBasedCalculation: true,
        currentDay: 1,
        readChapters: [],
        dailyReadingSchedule: schedule,
        createdAt: new Date().toISOString(),
        version: '2.0_time_based'
    };
};

/**
 * 🔥 최적화된 일일 스케줄 생성
 * 목표 시간에 맞춰 장들을 배분
 */
const createOptimizedSchedule = (
    planType: string,
    startDate: string,
    totalDays: number,
    targetMinutesPerDay: number
): DailyReadingSchedule[] => {
    const schedule: DailyReadingSchedule[] = [];
    const bookRange = getBookRangeForPlan(planType);

    let currentBook = bookRange.start;
    let currentChapter = 1;

    for (let day = 1; day <= totalDays; day++) {
        const daySchedule: DailyReadingSchedule = {
            day,
            date: new Date(new Date(startDate).getTime() + (day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            chapters: [],
            totalMinutes: 0
        };

        // 하루 목표 시간까지 장을 추가
        while (daySchedule.totalMinutes < targetMinutesPerDay && currentBook <= bookRange.end) {
            const bookInfo = BibleStep.find(step => step.index === currentBook);
            if (!bookInfo) {
                currentBook++;
                currentChapter = 1;
                continue;
            }

            if (currentChapter > bookInfo.count) {
                currentBook++;
                currentChapter = 1;
                continue;
            }

            const chapterTime = getChapterReadingTime(currentBook, currentChapter);

            // 장의 총 합이 목표 시간을 넘어가도 해당 장까지는 하루에 포함
            daySchedule.chapters.push({
                book: currentBook,
                chapter: currentChapter,
                bookName: bookInfo.name,
                estimatedMinutes: chapterTime
            });
            daySchedule.totalMinutes += chapterTime;

            currentChapter++;
        }

        schedule.push(daySchedule);

        // 모든 장을 다 읽었으면 종료
        if (currentBook > bookRange.end) {
            break;
        }
    }

    return schedule;
};

/**
 * 현재 날짜 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
};

/**
 * 특정 날짜의 읽기 계획 반환
 */
export const getDailyReading = (planData: TimeBasedBiblePlan, day: number): DailyReading | null => {
    const schedule = planData.dailyReadingSchedule.find(s => s.day === day);
    if (!schedule) return null;

    const chapters: ReadChapterStatus[] = schedule.chapters.map(ch => {
        const readStatus = planData.readChapters.find(
            r => r.book === ch.book && r.chapter === ch.chapter
        );

        return {
            book: ch.book,
            chapter: ch.chapter,
            bookName: ch.bookName,
            date: schedule.date,
            isRead: readStatus?.isRead || false,
            estimatedMinutes: ch.estimatedMinutes
        };
    });

    return {
        day: schedule.day,
        date: schedule.date,
        chapters,
        totalMinutes: schedule.totalMinutes,
        isCompleted: chapters.every(ch => ch.isRead)
    };
};

/**
 * 오늘 읽어야 할 장들 반환
 */
export const getTodayChapters = (planData: TimeBasedBiblePlan): ReadChapterStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const todayReading = getDailyReading(planData, currentDay);
    return todayReading?.chapters || [];
};

/**
 * 진행률 계산
 */
export const calculatePeriodBasedProgress = (planData: TimeBasedBiblePlan) => {
    const currentDay = getCurrentDay(planData.startDate);
    const readChapters = planData.readChapters.filter(r => r.isRead);

    // 읽은 총 시간 계산
    const readMinutes = readChapters.reduce((sum, r) => sum + r.estimatedMinutes, 0);

    // 진행률 계산
    const progressPercentage = Math.min(100, (readMinutes / planData.totalMinutes) * 100);

    return {
        currentDay: Math.min(currentDay, planData.totalDays),
        totalDays: planData.totalDays,
        readChapters: readChapters.length,
        totalChapters: planData.totalChapters,
        readMinutes,
        totalMinutes: planData.totalMinutes,
        progressPercentage: Math.round(progressPercentage * 10) / 10,
        targetMinutesPerDay: planData.calculatedMinutesPerDay
    };
};

/**
 * 장을 읽음 처리
 */
export const markChapterAsRead = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): TimeBasedBiblePlan => {
    const estimatedMinutes = getChapterReadingTime(book, chapter);
    const bookInfo = BibleStep.find(step => step.index === book);

    const updatedReadChapters = [...planData.readChapters];
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
            bookName: bookInfo?.name || '',
            date: new Date().toISOString(),
            isRead: true,
            estimatedMinutes
        });
    }

    return {
        ...planData,
        readChapters: updatedReadChapters,
        lastModified: new Date().toISOString()
    };
};

/**
 * 계획 검증
 */
export const validatePlanData = (planData: any): boolean => {
    return !!(
        planData &&
        planData.isTimeBasedCalculation &&
        planData.startDate &&
        planData.endDate &&
        planData.totalDays > 0 &&
        planData.calculatedMinutesPerDay > 0 &&
        planData.dailyReadingSchedule &&
        Array.isArray(planData.dailyReadingSchedule)
    );
};

/**
 * 유틸리티 함수들
 */
export const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes)}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export const getEstimatedCompletionDate = (startDate: string, totalDays: number): string => {
    const start = new Date(startDate);
    const completion = new Date(start.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);
    return completion.toISOString().split('T')[0];
};

export const getProgressIndicator = (progressPercentage: number): string => {
    if (progressPercentage >= 80) return '🔥 거의 완주!';
    if (progressPercentage >= 60) return '💪 순조하게 진행 중';
    if (progressPercentage >= 40) return '📖 꾸준히 읽고 있어요';
    if (progressPercentage >= 20) return '🌱 좋은 시작이에요';
    return '📚 이제 시작해볼까요?';
};