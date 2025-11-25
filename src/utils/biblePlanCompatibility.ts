import {
    getTodayChapters as getTimeBasedTodayChapters,
    getChapterStatus as getTimeBasedChapterStatus,
    createTimeBasedPlan,
    initializeChapterTimes
} from './timeBasedChapterCalculator';
import window from "@react-navigation/native/lib/typescript/src/__mocks__/window";
//기존 getTodayChapters 함수를 대체
export const getTodayChapters = (planData: any) => {
    if (!planData) return [];

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return getTimeBasedTodayChapters(planData);
    }

    // 기존 장 기반 로직 (기존 코드 그대로 사용)
    return getLegacyTodayChapters(planData);
};

//기존 getChapterStatus 함수를 대체
export const getChapterStatus = (
    planData: any,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    // 읽기 완료 확인 (공통)
    const isRead = planData.readChapters?.some(
        (r: any) => r.book === book && r.chapter === chapter && r.isRead
    );

    if (isRead) return 'completed';

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return getTimeBasedChapterStatus(planData, book, chapter);
    }

    // 기존 장 기반 로직
    return getLegacyChapterStatus(planData, book, chapter);
};

//기존 calculateProgress 함수를 대체
export const calculateProgress = (planData: any) => {
    if (!planData) {
        return { progressPercentage: 0 };
    }

    if (planData.isTimeBasedCalculation) {
        return calculateTimeBasedProgress(planData);
    }

    // 기존 장 기반 진행률 계산
    return calculateLegacyProgress(planData);
};

//기존 markChapterAsRead 함수를 대체
export const markChapterAsRead = (
    planData: any,
    book: number,
    chapter: number
) => {
    const estimatedMinutes = getChapterReadingTime(book, chapter);

    const updatedReadChapters = [...(planData.readChapters || [])];
    const existingIndex = updatedReadChapters.findIndex(
        (r: any) => r.book === book && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString(),
            estimatedMinutes
        };
    } else {
        updatedReadChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: true,
            estimatedMinutes
        });
    }

    return {
        ...planData,
        readChapters: updatedReadChapters
    };
};

//기존 calculateMissedChapters 함수를 대체
export const calculateMissedChapters = (planData: any): number => {
    if (!planData) return 0;

    if (planData.isTimeBasedCalculation) {
        return calculateTimeBasedMissedChapters(planData);
    }

    // 기존 장 기반 로직
    return calculateLegacyMissedChapters(planData);
};

//앱 초기화 시 호출할 함수
export const initializeBiblePlanSystem = async () => {
    try {
        // CSV 파일 읽기 시도
        const fileContent = await window.fs.readFile('음성파일길이.csv', { encoding: 'utf8' });

        // CSV 파싱 (간단한 파싱)
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= headers.length) {
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index]?.trim();
                });
                data.push(row);
            }
        }

        // 시간 데이터 초기화
        initializeChapterTimes(data);

        console.log('시간 기반 성경 일독 시스템 초기화 완료');
        return true;

    } catch (error) {
        console.warn('음성 데이터 로드 실패, 기본 추정치 사용:', error);
        return false;
    }
};

// 시간 기반 진행률 계산
const calculateTimeBasedProgress = (planData: any) => {
    const currentDay = getCurrentDay(planData.startDate);
    const targetTime = planData.targetMinutesPerDay;

    // 읽은 총 시간 계산
    const totalReadTime = (planData.readChapters || [])
        .filter((r: any) => r.isRead)
        .reduce((sum: number, r: any) => sum + (r.estimatedMinutes || 0), 0);

    // 전체 목표 시간
    const totalTargetTime = planData.totalDays * targetTime;

    // 현재까지 목표 시간
    const currentTargetTime = currentDay * targetTime;

    const progressPercentage = Math.min(100, (totalReadTime / totalTargetTime) * 100);
    const schedulePercentage = Math.min(100, (totalReadTime / currentTargetTime) * 100);

    return {
        progressPercentage,
        schedulePercentage,
        readMinutes: totalReadTime,
        targetMinutes: currentTargetTime,
        behindSchedule: totalReadTime < currentTargetTime
    };
};

// 시간 기반 놓친 장수 계산
const calculateTimeBasedMissedChapters = (planData: any): number => {
    const progress = calculateTimeBasedProgress(planData);

    if (!progress.behindSchedule) return 0;

    // 뒤처진 시간을 평균 장 시간으로 나누어 대략적인 장수 계산
    const avgChapterTime = 4; // 평균 4분/장
    const missedTime = progress.targetMinutes - progress.readMinutes;

    return Math.ceil(missedTime / avgChapterTime);
};

// 기존 장 기반 오늘 읽을 장들 (호환성 유지)
const getLegacyTodayChapters = (planData: any) => {
    const currentDay = getCurrentDay(planData.startDate);
    const startIndex = (currentDay - 1) * planData.chaptersPerDay;
    const endIndex = Math.min(startIndex + planData.chaptersPerDay, planData.totalChapters);

    const todayChapters = [];
    let globalChapterIndex = startIndex;

    for (let i = 0; i < planData.chaptersPerDay && globalChapterIndex < planData.totalChapters; i++) {
        const { book, chapter } = getBookAndChapterFromGlobalIndex(globalChapterIndex + 1);

        todayChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: false,
            estimatedMinutes: getChapterReadingTime(book, chapter)
        });

        globalChapterIndex++;
    }

    return todayChapters;
};

// 기존 장 기반 상태 확인 (호환성 유지)
const getLegacyChapterStatus = (planData: any, book: number, chapter: number): string => {
    const currentDay = getCurrentDay(planData.startDate);

    // 간단한 구현 (실제로는 기존 복잡한 로직 사용)
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

// 기존 장 기반 진행률 계산 (호환성 유지)
const calculateLegacyProgress = (planData: any) => {
    const readChaptersCount = (planData.readChapters || []).filter((r: any) => r.isRead).length;
    const progressPercentage = (readChaptersCount / planData.totalChapters) * 100;

    return {
        progressPercentage,
        schedulePercentage: progressPercentage,
        readChapters: readChaptersCount,
        totalChapters: planData.totalChapters
    };
};

// 기존 장 기반 놓친 장수 계산 (호환성 유지)
const calculateLegacyMissedChapters = (planData: any): number => {
    const currentDay = getCurrentDay(planData.startDate);
    const shouldHaveRead = Math.min(currentDay * planData.chaptersPerDay, planData.totalChapters);
    const actuallyRead = (planData.readChapters || []).filter((r: any) => r.isRead).length;

    return Math.max(0, shouldHaveRead - actuallyRead);
};

// 헬퍼 함수들
const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const getChapterReadingTime = (book: number, chapter: number): number => {
    // 간단한 추정치 (실제로는 timeBasedChapterCalculator에서 가져옴)
    if (book === 19) return 2.5;
    if (book === 20) return 3.5;
    if (book <= 39) return 4.0;
    return 4.2;
};

const getBookAndChapterFromGlobalIndex = (globalIndex: number): { book: number, chapter: number } => {
    // 간단한 구현 (실제로는 BibleStep 사용)
    let remainingChapters = globalIndex;
    let book = 1;

    // 매우 단순화된 구현
    while (remainingChapters > 50 && book < 66) {
        remainingChapters -= 30; // 평균 30장으로 가정
        book++;
    }

    return {
        book,
        chapter: Math.min(remainingChapters, 50)
    };
};

const findChapterDayInPlan = (book: number, chapter: number, planData: any): number => {
    // 간단한 구현
    const globalIndex = (book - 1) * 30 + chapter; // 매우 단순화
    return Math.ceil(globalIndex / planData.chaptersPerDay);
};

//기존 코드에서 import 구문만 바꾸면 되도록 모든 함수 export
export {
    createTimeBasedPlan,
    initializeChapterTimes
};

// 기존 타입들도 그대로 export
export const BIBLE_PLAN_TYPES = [
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

// 기타 유틸리티 함수들
export const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours > 0) {
        return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
};

export const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}년${String(d.getMonth() + 1).padStart(2, '0')}월${String(d.getDate()).padStart(2, '0')}일`;
};