// src/utils/timeBasedBibleSystem.ts
// 🔥 완전한 시간 기반 성경 읽기 시스템 - CSV 데이터 기반, 시간 단위로 장 분배

import { BibleStep } from './define';
import {
    loadChapterTimeDataFromCSV,
    getChapterTime,
    getChapterTimeInSeconds,
    getChapterTimeDetail,
    calculatePlanTotalTime,
    isChapterTimeDataLoaded
} from './csvDataLoader';
import { defaultStorage } from './mmkv';

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
    day: number; // 몇 일차에 해당하는지
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

// === CSV 데이터 초기화 ===

/**
 * 🔥 시간 기반 시스템 초기화 - CSV 데이터 로드
 */
export const initializeTimeBasedBibleSystem = async (): Promise<boolean> => {
    try {
        console.log('🔄 시간 기반 성경 시스템 초기화 시작');

        const success = await loadChapterTimeDataFromCSV();

        if (success) {
            console.log('✅ CSV 데이터 기반 초기화 완료');
        } else {
            console.log('⚠️ CSV 로드 실패, 기본 추정치 사용');
        }

        return success;

    } catch (error) {
        console.warn('⚠️ 시간 기반 시스템 초기화 실패:', error);
        return false;
    }
};

// === 계획 생성 ===

/**
 * 🔥 핵심 함수: 시간 기반으로 장을 나누되 시작일~종료일 기간으로 하루 시간 자동 계산
 */
export const createTimeBasedBiblePlan = (
    planType: string,
    startDate: string,
    endDate: string
): TimeBasedBiblePlan => {
    console.log(`📊 시간 기반 계획 생성: ${planType}, ${startDate} ~ ${endDate}`);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 🔥 계획별 총 시간 및 장 수 계산 (실제 CSV 데이터 기반)
    const { totalMinutes, totalChapters } = calculatePlanTotalTime(planType);

    // 🔥 하루 평균 시간 자동 계산 (시작일~종료일 기간 기반)
    const calculatedMinutesPerDay = Math.round((totalMinutes / totalDays) * 10) / 10;

    console.log(`📊 계획 정보: 총 ${totalMinutes}분, ${totalDays}일 → 하루 평균 ${calculatedMinutesPerDay}분`);

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
        totalMinutes: Math.round(totalMinutes),
        totalChapters,
        isTimeBasedCalculation: true,
        currentDay: 1,
        readChapters: [],
        dailyReadingSchedule: schedule,
        createdAt: new Date().toISOString(),
        version: '2.0_time_based_csv',
        metadata: {
            creationMethod: 'time_based_csv',
            audioDataUsed: isChapterTimeDataLoaded(),
            estimatedCompletionDate: endDate
        }
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

            const chapterTime = getChapterTime(currentBook, currentChapter);

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
                daySchedule.totalMinutes = Math.round(daySchedule.totalMinutes * 10) / 10;
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
 * 계획별 성경 범위 반환
 */
const getBookRangeForPlan = (planType: string): { start: number; end: number } => {
    switch (planType) {
        case 'full_bible': return { start: 1, end: 66 };
        case 'old_testament': return { start: 1, end: 39 };
        case 'new_testament': return { start: 40, end: 66 };
        case 'pentateuch': return { start: 1, end: 5 };
        case 'psalms': return { start: 19, end: 19 };
        default: return { start: 1, end: 66 };
    }
};

// === 읽기 진행 관리 ===

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
            estimatedMinutes: ch.estimatedMinutes,
            day: day
        };
    });

    const isCompleted = chapters.length > 0 && chapters.every(ch => ch.isRead);

    return {
        day,
        date: schedule.date,
        chapters,
        totalMinutes: schedule.totalMinutes,
        targetMinutes: schedule.targetMinutes,
        isCompleted
    };
};

/**
 * 🔥 장 읽기 완료 처리
 */
export const markChapterAsRead = (
    planData: TimeBasedBiblePlan,
    bookIndex: number,
    chapter: number
): TimeBasedBiblePlan => {
    const updatedReadChapters = [...planData.readChapters];

    // 이미 읽은 기록이 있는지 확인
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === bookIndex && r.chapter === chapter
    );

    const bookInfo = BibleStep.find(step => step.index === bookIndex);
    const estimatedMinutes = getChapterTime(bookIndex, chapter);

    if (existingIndex >= 0) {
        // 기존 기록 업데이트
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString(),
            estimatedMinutes
        };
    } else {
        // 새 기록 추가
        updatedReadChapters.push({
            book: bookIndex,
            chapter,
            bookName: bookInfo?.name || '',
            date: new Date().toISOString(),
            isRead: true,
            estimatedMinutes,
            day: getCurrentDay(planData)
        });
    }

    return {
        ...planData,
        readChapters: updatedReadChapters,
        lastModified: new Date().toISOString()
    };
};

/**
 * 🔥 장 읽기 취소 처리
 */
export const markChapterAsUnread = (
    planData: TimeBasedBiblePlan,
    bookIndex: number,
    chapter: number
): TimeBasedBiblePlan => {
    const updatedReadChapters = planData.readChapters.filter(
        r => !(r.book === bookIndex && r.chapter === chapter)
    );

    return {
        ...planData,
        readChapters: updatedReadChapters,
        lastModified: new Date().toISOString()
    };
};

// === 진행률 및 통계 ===

/**
 * 🔥 시간 기반 진행률 계산
 */
export const calculateTimeBasedProgress = (planData: TimeBasedBiblePlan): {
    progressPercentage: number;
    readTime: number;
    totalTime: number;
    readChapters: number;
    totalChapters: number;
    currentDayProgress: number;
} => {
    const readTime = planData.readChapters
        .filter(r => r.isRead)
        .reduce((sum, r) => sum + r.estimatedMinutes, 0);

    const progressPercentage = Math.round((readTime / planData.totalMinutes) * 1000) / 10;

    // 오늘까지의 목표 시간 기준 진행률
    const currentDay = getCurrentDay(planData);
    const targetTimeToday = currentDay * planData.calculatedMinutesPerDay;
    const currentDayProgress = Math.min(100, Math.round((readTime / targetTimeToday) * 1000) / 10);

    const readChapters = planData.readChapters.filter(r => r.isRead).length;

    return {
        progressPercentage,
        readTime: Math.round(readTime * 10) / 10,
        totalTime: planData.totalMinutes,
        readChapters,
        totalChapters: planData.totalChapters,
        currentDayProgress
    };
};

/**
 * 🔥 놓친 장 수 계산
 */
export const calculateMissedChapters = (planData: TimeBasedBiblePlan): number => {
    const currentDay = getCurrentDay(planData);
    let missedCount = 0;

    for (let day = 1; day < currentDay; day++) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading && !dailyReading.isCompleted) {
            const unreadChapters = dailyReading.chapters.filter(ch => !ch.isRead);
            missedCount += unreadChapters.length;
        }
    }

    return missedCount;
};

/**
 * 🔥 주간 읽기 스케줄 가져오기 (7일)
 */
export const getWeeklySchedule = (planData: TimeBasedBiblePlan, startDay?: number): DailyReading[] => {
    const currentDay = startDay || getCurrentDay(planData);
    const weeklySchedule: DailyReading[] = [];

    for (let day = currentDay; day < currentDay + 7 && day <= planData.totalDays; day++) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading) {
            weeklySchedule.push(dailyReading);
        }
    }

    return weeklySchedule;
};

/**
 * 🔥 장 상태 확인 (오늘/과거/미래/완료)
 */
export const getChapterStatus = (
    planData: TimeBasedBiblePlan,
    bookIndex: number,
    chapter: number
): 'today' | 'past' | 'future' | 'completed' | 'missed' => {
    const currentDay = getCurrentDay(planData);

    // 읽기 완료 여부 확인
    const isRead = planData.readChapters.some(
        r => r.book === bookIndex && r.chapter === chapter && r.isRead
    );

    if (isRead) {
        return 'completed';
    }

    // 어느 날에 해당하는지 찾기
    for (let day = 1; day <= planData.totalDays; day++) {
        const schedule = planData.dailyReadingSchedule.find(s => s.day === day);
        if (schedule && schedule.chapters.some(ch => ch.book === bookIndex && ch.chapter === chapter)) {
            if (day === currentDay) {
                return 'today';
            } else if (day < currentDay) {
                return 'missed';
            } else {
                return 'future';
            }
        }
    }

    return 'future';
};

// === 저장/로드 ===

/**
 * 🔥 시간 기반 계획 저장
 */
export const saveTimeBasedBiblePlan = (planData: TimeBasedBiblePlan): void => {
    try {
        defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
        console.log('✅ 시간 기반 성경일독 계획 저장 완료');
    } catch (error) {
        console.error('❌ 계획 저장 실패:', error);
    }
};

/**
 * 🔥 시간 기반 계획 로드
 */
export const loadTimeBasedBiblePlan = (): TimeBasedBiblePlan | null => {
    try {
        const savedPlan = defaultStorage.getString('bible_reading_plan');
        if (savedPlan) {
            const planData = JSON.parse(savedPlan);

            // 시간 기반 계획인지 확인
            if (planData.isTimeBasedCalculation) {
                console.log('✅ 시간 기반 계획 로드 완료');
                return planData as TimeBasedBiblePlan;
            }
        }
        return null;
    } catch (error) {
        console.error('❌ 계획 로드 실패:', error);
        return null;
    }
};

/**
 * 🔥 계획 삭제
 */
export const deleteTimeBasedBiblePlan = (): void => {
    try {
        defaultStorage.delete('bible_reading_plan');
        console.log('✅ 성경일독 계획 삭제 완료');
    } catch (error) {
        console.error('❌ 계획 삭제 실패:', error);
    }
};

// === 유틸리티 함수들 ===

/**
 * 🔥 계획 유효성 검증
 */
export const validateTimeBasedPlan = (planData: any): boolean => {
    if (!planData || typeof planData !== 'object') {
        return false;
    }

    const required = [
        'planType', 'startDate', 'endDate', 'totalDays',
        'calculatedMinutesPerDay', 'totalMinutes', 'totalChapters',
        'isTimeBasedCalculation', 'dailyReadingSchedule'
    ];

    return required.every(field => planData.hasOwnProperty(field)) &&
        planData.isTimeBasedCalculation === true &&
        Array.isArray(planData.dailyReadingSchedule) &&
        planData.dailyReadingSchedule.length > 0;
};

/**
 * 🔥 읽기 시간 포맷팅
 */
export const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes * 10) / 10}분`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round((minutes % 60) * 10) / 10;
        return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
    }
};

/**
 * 🔥 날짜 포맷팅
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];

    return `${month}월 ${day}일 (${weekday})`;
};

/**
 * 🔥 진행률 표시기 생성
 */
export const getProgressIndicator = (percentage: number): string => {
    if (percentage >= 90) return "🎉 거의 완주!";
    if (percentage >= 75) return "🔥 훌륭해요!";
    if (percentage >= 50) return "💪 절반 통과!";
    if (percentage >= 25) return "🌱 꾸준히 성장!";
    return "📖 시작이 반!";
};

/**
 * 🔥 예상 완료일 계산
 */
export const getEstimatedCompletionDate = (planData: TimeBasedBiblePlan): string => {
    const progress = calculateTimeBasedProgress(planData);
    const currentDay = getCurrentDay(planData);

    if (progress.readTime === 0) {
        return planData.endDate;
    }

    // 현재 진행 속도 기준 예상 완료일 계산
    const dailyAverageTime = progress.readTime / currentDay;
    const remainingTime = planData.totalMinutes - progress.readTime;
    const estimatedDaysRemaining = Math.ceil(remainingTime / dailyAverageTime);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDaysRemaining);

    return estimatedDate.toISOString().split('T')[0];
};

/**
 * 🔥 동기부여 메시지 생성
 */
export const getMotivationalMessage = (planData: TimeBasedBiblePlan): string => {
    const progress = calculateTimeBasedProgress(planData);
    const currentDay = getCurrentDay(planData);
    const targetTimeToday = currentDay * planData.calculatedMinutesPerDay;

    const isAhead = progress.readTime > targetTimeToday;
    const isBehind = progress.readTime < targetTimeToday * 0.8;

    if (isAhead) {
        return "🌟 계획보다 앞서 가고 있어요! 정말 멋져요!";
    } else if (isBehind) {
        return "🌱 천천히라도 꾸준히 하는 것이 중요해요!";
    } else {
        return "📖 꾸준한 말씀 읽기, 응원해요!";
    }
};

/**
 * 🔥 연속 읽기 일수 계산
 */
export const calculateReadingStreak = (planData: TimeBasedBiblePlan): number => {
    const currentDay = getCurrentDay(planData);
    let streak = 0;

    // 어제부터 거꾸로 확인하여 연속 일수 계산
    for (let day = currentDay - 1; day >= 1; day--) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading?.isCompleted) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
};

// === 예제 데이터 생성 함수 (테스트용) ===

/**
 * 🔥 계획 미리보기 생성
 */
export const generatePlanPreview = (
    planType: string,
    startDate: string,
    endDate: string
): {
    isValid: boolean;
    errorMessage?: string;
    preview?: {
        totalDays: number;
        totalMinutes: number;
        calculatedMinutesPerDay: number;
        totalChapters: number;
        formattedDailyTime: string;
        formattedTotalTime: string;
        progressIndicator: string;
        exampleDays: {
            day: number;
            date: string;
            chapters: string[];
            totalMinutes: number;
            formattedTime: string;
        }[];
    };
} => {
    // 입력 검증
    if (!startDate || !endDate || !planType) {
        return {
            isValid: false,
            errorMessage: '모든 필드를 입력해주세요.'
        };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
        return {
            isValid: false,
            errorMessage: '종료일은 시작일보다 나중이어야 합니다.'
        };
    }

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays < 7) {
        return {
            isValid: false,
            errorMessage: '최소 7일 이상의 기간을 설정해주세요.'
        };
    }

    // 계획 생성
    const tempPlan = createTimeBasedBiblePlan(planType, startDate, endDate);

    // 예제 일정 3일 생성
    const exampleDays = tempPlan.dailyReadingSchedule.slice(0, 3).map(schedule => ({
        day: schedule.day,
        date: formatDate(schedule.date),
        chapters: schedule.chapters.map(ch => `${ch.bookName} ${ch.chapter}장`),
        totalMinutes: schedule.totalMinutes,
        formattedTime: formatReadingTime(schedule.totalMinutes)
    }));

    return {
        isValid: true,
        preview: {
            totalDays: tempPlan.totalDays,
            totalMinutes: tempPlan.totalMinutes,
            calculatedMinutesPerDay: tempPlan.calculatedMinutesPerDay,
            totalChapters: tempPlan.totalChapters,
            formattedDailyTime: formatReadingTime(tempPlan.calculatedMinutesPerDay),
            formattedTotalTime: formatReadingTime(tempPlan.totalMinutes),
            progressIndicator: getProgressIndicator(0),
            exampleDays
        }
    };
};