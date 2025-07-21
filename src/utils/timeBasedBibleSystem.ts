// src/utils/timeBasedBibleSystem.ts
// 🔥 완전한 시간 기반 성경 읽기 시스템 - 시작일~종료일 기간 기반 자동 계산

import { BibleStep } from './define';
import { calculateTotalPsalmsTime, optimizePsalmsFor25Days } from './psalmsCalculationFix';
import { getChapterAudioTime, getChapterAudioTimeInSeconds, initializeAudioData } from './audioDataLoader';

// === 타입 정의 ===
export interface TimeBasedBiblePlan {
    planType: string;
    planName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    calculatedMinutesPerDay: number;  // 🔥 시작일~종료일 기간 기반 자동 계산된 하루 시간
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
    estimatedMinutes: number;
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
    targetMinutes: number; // 🔥 목표 시간 (calculatedMinutesPerDay)
}

export interface DailyReading {
    day: number;
    date: string;
    chapters: ReadChapterStatus[];
    totalMinutes: number;
    targetMinutes: number;
    isCompleted: boolean;
}

// === 음성 파일 시간 데이터 관리 ===
let chapterTimeMap: Map<string, number> = new Map();

/**
 * 🔥 React Native 호환 초기화 함수 - 실제 음성 데이터 로드
 */
export const initializePeriodBasedBibleSystem = async (): Promise<boolean> => {
    try {
        console.log('🔄 시간 기반 성경 시스템 초기화 시작');

        // 실제 음성 데이터 초기화
        const audioSuccess = initializeAudioData();

        if (audioSuccess) {
            // 실제 음성 데이터로 시간 맵 구성
            initializeWithAudioData();
            console.log('✅ 실제 음성 데이터 기반 초기화 완료');
        } else {
            // 기본 추정치로 초기화
            initializeDefaultTimes();
            console.log('⚠️ 기본 추정치로 초기화됨');
        }

        return audioSuccess;

    } catch (error) {
        console.warn('⚠️ 시간 기반 시스템 초기화 실패, 기본값 사용:', error);
        initializeDefaultTimes();
        return false;
    }
};

/**
 * 🔥 실제 음성 데이터로 시간 맵 초기화
 */
const initializeWithAudioData = () => {
    chapterTimeMap.clear();

    BibleStep.forEach(book => {
        for (let chapter = 1; chapter <= book.count; chapter++) {
            const key = `${book.index}_${chapter}`;
            const audioTime = getChapterAudioTime(book.index, chapter);
            chapterTimeMap.set(key, audioTime);
        }
    });

    console.log(`✅ 실제 음성 데이터 시간 맵 초기화 완료: ${chapterTimeMap.size}개`);
};

/**
 * 기본 추정 시간으로 초기화 (음성 데이터가 없는 경우)
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
 * 🔥 특정 장의 예상 읽기 시간 반환 (분 단위)
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
 * 🔥 핵심 함수: 시간 기반으로 장을 나누되 시작일~종료일 기간으로 하루 시간 자동 계산
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
        const totalTime = calculateTotalPsalmsTime(); // 약 375분
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
        const schedule = createTimeBasedSchedule(planType, startDate, totalDays, calculatedMinutesPerDay);
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

    // 🔥 하루 평균 시간 자동 계산 (시작일~종료일 기간 기반)
    const calculatedMinutesPerDay = Math.round((totalTime / totalDays) * 10) / 10;

    console.log(`📊 계획 정보: 총 ${totalTime}분, ${totalDays}일 → 하루 평균 ${calculatedMinutesPerDay}분`);

    const schedule = createTimeBasedSchedule(planType, startDate, totalDays, calculatedMinutesPerDay);

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
        calculatedMinutesPerDay, // 🔥 자동 계산된 하루 시간
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
 * 🔥 시간 기반 일일 스케줄 생성
 * 목표 시간에 맞춰 장들을 배분 (시간이 넘어가는 장까지 포함)
 */
const createTimeBasedSchedule = (
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
            totalMinutes: 0,
            targetMinutes: targetMinutesPerDay
        };

        // 🔥 시간 기준으로 장들을 배분 (목표 시간을 넘어가는 장까지 포함)
        while (currentBook <= bookRange.end) {
            const bookInfo = BibleStep.find(step => step.index === currentBook);
            if (!bookInfo || currentChapter > bookInfo.count) {
                currentBook++;
                currentChapter = 1;
                continue;
            }

            const chapterTime = getChapterReadingTime(currentBook, currentChapter);

            // 🔥 핵심 로직: 현재 시간 + 다음 장 시간이 목표를 넘어가더라도
            // 아직 목표에 도달하지 않았다면 추가
            if (daySchedule.totalMinutes < targetMinutesPerDay) {
                daySchedule.chapters.push({
                    book: currentBook,
                    chapter: currentChapter,
                    bookName: bookInfo.name,
                    estimatedMinutes: chapterTime
                });

                daySchedule.totalMinutes += chapterTime;
                currentChapter++;
            } else {
                // 이미 목표 시간에 도달했으면 다음 날로
                break;
            }
        }

        schedule.push(daySchedule);

        // 모든 장을 다 읽었으면 종료
        if (currentBook > bookRange.end) {
            break;
        }
    }

    console.log(`✅ 시간 기반 스케줄 생성 완료: ${schedule.length}일`);
    return schedule;
};

/**
 * 🔥 오늘 읽을 장들 가져오기
 */
export const getTodayChapters = (planData: TimeBasedBiblePlan): ReadChapterStatus[] => {
    const currentDay = getCurrentDay(planData);
    const dailyReading = getDailyReading(planData, currentDay);

    return dailyReading?.chapters || [];
};

/**
 * 🔥 현재 날짜 계산
 */
export const getCurrentDay = (planData: TimeBasedBiblePlan): number => {
    const startDate = new Date(planData.startDate);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(1, Math.min(diffDays, planData.totalDays));
};

/**
 * 🔥 특정 날의 읽기 일정 가져오기
 */
export const getDailyReading = (planData: TimeBasedBiblePlan, day: number): DailyReading | null => {
    const schedule = planData.dailyReadingSchedule.find(s => s.day === day);
    if (!schedule) return null;

    const chapters: ReadChapterStatus[] = schedule.chapters.map(ch => ({
        book: ch.book,
        chapter: ch.chapter,
        bookName: ch.bookName,
        date: schedule.date,
        isRead: isChapterRead(planData, ch.book, ch.chapter),
        estimatedMinutes: ch.estimatedMinutes
    }));

    return {
        day: schedule.day,
        date: schedule.date,
        chapters,
        totalMinutes: schedule.totalMinutes,
        targetMinutes: schedule.targetMinutes,
        isCompleted: chapters.every(ch => ch.isRead)
    };
};

/**
 * 🔥 장 읽기 완료 여부 확인
 */
export const isChapterRead = (planData: TimeBasedBiblePlan, book: number, chapter: number): boolean => {
    return planData.readChapters.some(r => r.book === book && r.chapter === chapter && r.isRead);
};

/**
 * 🔥 장 읽기 완료 표시
 */
export const markChapterAsRead = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): TimeBasedBiblePlan => {
    const existingIndex = planData.readChapters.findIndex(r => r.book === book && r.chapter === chapter);
    const estimatedMinutes = getChapterReadingTime(book, chapter);
    const bookInfo = BibleStep.find(step => step.index === book);

    const readChapter: ReadChapterStatus = {
        book,
        chapter,
        bookName: bookInfo?.name || '',
        date: new Date().toISOString(),
        isRead: true,
        estimatedMinutes
    };

    let updatedReadChapters;
    if (existingIndex >= 0) {
        updatedReadChapters = [...planData.readChapters];
        updatedReadChapters[existingIndex] = readChapter;
    } else {
        updatedReadChapters = [...planData.readChapters, readChapter];
    }

    return {
        ...planData,
        readChapters: updatedReadChapters,
        lastModified: new Date().toISOString()
    };
};

/**
 * 🔥 진행률 계산
 */
export const calculatePeriodBasedProgress = (planData: TimeBasedBiblePlan) => {
    const totalChapters = planData.totalChapters;
    const readChapters = planData.readChapters.filter(r => r.isRead).length;
    const progressPercentage = totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0;

    // 읽은 시간 계산
    const readMinutes = planData.readChapters
        .filter(r => r.isRead)
        .reduce((sum, r) => sum + r.estimatedMinutes, 0);

    // 현재 날짜 기준 예상 진행률
    const currentDay = getCurrentDay(planData);
    const expectedProgressPercentage = Math.round((currentDay / planData.totalDays) * 100);

    return {
        progressPercentage,
        readChapters,
        totalChapters,
        readMinutes: Math.round(readMinutes),
        totalMinutes: planData.totalMinutes,
        expectedProgressPercentage,
        currentDay,
        totalDays: planData.totalDays,
        isAhead: progressPercentage > expectedProgressPercentage,
        isBehind: progressPercentage < expectedProgressPercentage
    };
};

/**
 * 🔥 장 상태 확인 (오늘/어제/놓친/완료/미래/일반)
 */
export const getChapterStatus = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    // 읽기 완료 확인
    if (isChapterRead(planData, book, chapter)) {
        return 'completed';
    }

    const currentDay = getCurrentDay(planData);

    // 해당 장이 어느 날에 배정되었는지 찾기
    const scheduleDay = planData.dailyReadingSchedule.find(schedule =>
        schedule.chapters.some(ch => ch.book === book && ch.chapter === chapter)
    );

    if (!scheduleDay) return 'normal';

    const scheduleDayNumber = scheduleDay.day;

    if (scheduleDayNumber === currentDay) return 'today';
    if (scheduleDayNumber === currentDay - 1) return 'yesterday';
    if (scheduleDayNumber < currentDay) return 'missed';
    if (scheduleDayNumber > currentDay) return 'future';

    return 'normal';
};

/**
 * 🔥 계획 데이터 검증
 */
export const validatePlanData = (planData: any): boolean => {
    if (!planData || typeof planData !== 'object') return false;

    const requiredFields = [
        'planType', 'startDate', 'endDate', 'totalDays',
        'calculatedMinutesPerDay', 'totalMinutes', 'totalChapters',
        'isTimeBasedCalculation', 'dailyReadingSchedule'
    ];

    return requiredFields.every(field => planData.hasOwnProperty(field));
};

/**
 * 🔥 유틸리티 함수들
 */
export const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes)}분`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
    }
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
};

export const getProgressIndicator = (percentage: number): string => {
    if (percentage >= 90) return '🎉';
    if (percentage >= 75) return '🔥';
    if (percentage >= 50) return '💪';
    if (percentage >= 25) return '📖';
    return '🌱';
};

export const getEstimatedCompletionDate = (planData: TimeBasedBiblePlan): string => {
    return formatDate(planData.endDate);
};