// utils/biblePlanUtils.ts
// 시간 기반 계산이 통합된 성경일독 유틸리티

import { Platform, AppState } from 'react-native';
import { defaultStorage } from "./mmkv";
import { BibleStep } from "./define";
import {
    initializeAudioData,
    createTimeBasedPlan,
    getTodayChapters as getTodayChaptersTimeBase,
    getChapterStatus as getChapterStatusTimeBase,
    calculateProgress as calculateProgressTimeBase,
    calculateMissedChapters as calculateMissedChaptersTimeBase,
    TimeBasedBiblePlan,
    saveBiblePlanData as saveTimeBasedPlan,
    loadBiblePlanData as loadTimeBasedPlan,
    deleteBiblePlanData as deleteTimeBasedPlan,
    formatDate as formatDateTimeBase,
    formatTime as formatTimeBase,
    getChapterAudioMinutes
} from './timeBasedBibleSystem';

// 성경일독 타입 정의 (기존 인터페이스 확장)
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
    type?: 'today' | 'yesterday' | 'missed' | 'completed' | 'future';
    estimatedMinutes?: number; // 시간 기반 추가
}

export interface BiblePlanData extends TimeBasedBiblePlan {
    // TimeBasedBiblePlan의 모든 필드를 상속
}

// 성경일독 타입 상수
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
 * 🔥 오디오 데이터 초기화 확인
 */
const ensureAudioDataInitialized = async () => {
    try {
        // 이미 초기화되어 있는지 확인
        const isInitialized = await initializeAudioData();
        if (!isInitialized) {
            console.log('⚠️ 오디오 데이터가 초기화되지 않았습니다. CSV 파일 로드가 필요합니다.');
        }
    } catch (error) {
        console.error('오디오 데이터 초기화 확인 실패:', error);
    }
};

/**
 * 🔥 새로운 일독 계획 생성 (시간 기반)
 */
export const createBiblePlan = async (
    planType: string,
    planName: string,
    startDate: string,
    targetDate: string
): Promise<BiblePlanData> => {
    // 오디오 데이터 초기화 확인
    await ensureAudioDataInitialized();

    // 시간 기반 계획 생성
    return createTimeBasedPlan(planType, planName, startDate, targetDate);
};

/**
 * 현재 일독 계획 데이터 로드
 */
export const loadBiblePlanData = (): BiblePlanData | null => {
    return loadTimeBasedPlan();
};

/**
 * 일독 계획 데이터 저장
 */
export const saveBiblePlanData = (planData: BiblePlanData): void => {
    saveTimeBasedPlan(planData);
};

/**
 * 일독 계획 삭제
 */
export const deleteBiblePlanData = (): void => {
    deleteTimeBasedPlan();
};

/**
 * 현재 날짜 기준으로 읽어야 할 일차 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * 🔥 놓친 장 개수 계산 (시간 기반 통합)
 */
export const calculateMissedChapters = (planData: BiblePlanData): number => {
    if (planData.isTimeBasedCalculation) {
        return calculateMissedChaptersTimeBase(planData);
    }

    // 기존 로직
    const currentDay = getCurrentDay(planData.startDate);
    const shouldHaveRead = Math.min(currentDay * planData.chaptersPerDay, planData.totalChapters);
    const actuallyRead = planData.readChapters.filter(r => r.isRead).length;

    return Math.max(0, shouldHaveRead - actuallyRead);
};

/**
 * 🔥 오늘 읽어야 할 장들 가져오기 (시간 기반 통합)
 */
export const getTodayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    if (planData.isTimeBasedCalculation) {
        return getTodayChaptersTimeBase(planData);
    }

    // 기존 로직
    const currentDay = getCurrentDay(planData.startDate);
    const startIndex = (currentDay - 1) * planData.chaptersPerDay;
    const endIndex = Math.min(startIndex + planData.chaptersPerDay, planData.totalChapters);

    const todayChapters: ReadingStatus[] = [];
    let globalChapterIndex = startIndex;

    for (let i = 0; i < planData.chaptersPerDay && globalChapterIndex < planData.totalChapters; i++) {
        const { book, chapter } = getBookAndChapterFromGlobalIndex(globalChapterIndex + 1);

        todayChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: false
        });

        globalChapterIndex++;
    }

    return todayChapters;
};

/**
 * 전역 인덱스로부터 책과 장 계산
 */
export const getBookAndChapterFromGlobalIndex = (
    globalIndex: number
): { book: number; chapter: number } => {
    let remainingChapters = globalIndex;

    for (let i = 0; i < BibleStep.length; i++) {
        if (remainingChapters <= BibleStep[i].count) {
            return {
                book: i + 1,
                chapter: remainingChapters
            };
        }
        remainingChapters -= BibleStep[i].count;
    }

    // 범위를 벗어난 경우 마지막 장 반환
    return { book: 66, chapter: 22 };
};

/**
 * 글로벌 인덱스 계산 (책과 장으로부터)
 */
export const getGlobalChapterIndex = (book: number, chapter: number): number => {
    let index = 0;

    for (let i = 1; i < book; i++) {
        const bookInfo = BibleStep.find(step => step.index === i);
        if (bookInfo) {
            index += bookInfo.count;
        }
    }

    return index + chapter;
};

/**
 * 🔥 진행률 계산 (시간 기반 통합)
 */
export const calculateProgress = (planData: BiblePlanData) => {
    if (planData.isTimeBasedCalculation) {
        return calculateProgressTimeBase(planData);
    }

    // 기존 로직
    const readChapters = planData.readChapters.filter(r => r.isRead);
    const currentDay = getCurrentDay(planData.startDate);
    const daysPercentage = Math.min((currentDay / planData.totalDays) * 100, 100);

    return {
        chaptersPerDay: planData.chaptersPerDay,
        totalChapters: planData.totalChapters,
        readChapters: readChapters.length,
        completedChapters: readChapters.length,
        progressPercentage: (readChapters.length / planData.totalChapters) * 100,
        daysProgress: {
            current: currentDay,
            total: planData.totalDays,
            percentage: daysPercentage
        }
    };
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (date: string | Date): string => {
    return formatDateTimeBase(date);
};

/**
 * 시간 포맷팅 (분 -> 시간:분)
 */
export const formatTime = (minutes: number): string => {
    return formatTimeBase(minutes);
};

/**
 * 🔥 장 상태 확인 (시간 기반 통합)
 */
export const getChapterStatus = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (planData.isTimeBasedCalculation) {
        return getChapterStatusTimeBase(planData, book, chapter);
    }

    // 기존 로직
    if (!planData) return 'normal';

    const currentDay = getCurrentDay(planData.startDate);

    // 읽기 완료 여부 확인
    const isRead = planData.readChapters.some(
        r => r.book === book && r.chapter === chapter && r.isRead
    );

    if (isRead) return 'completed';

    // 이 장이 몇 일차에 해당하는지 계산
    const chapterDay = findChapterDayInPlan(book, chapter, planData);

    if (chapterDay === -1) return 'normal'; // 계획에 포함되지 않은 장

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

/**
 * 🔥 장을 읽음으로 표시
 */
export const markChapterAsRead = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): BiblePlanData => {
    const updatedReadChapters = [...planData.readChapters];
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === book && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        // 기존 항목 업데이트
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString()
        };
    } else {
        // 새 항목 추가
        const estimatedMinutes = planData.isTimeBasedCalculation
            ? Math.round(getChapterAudioMinutes(book, chapter))
            : undefined;

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

/**
 * 일독 계획에서 특정 장이 몇 일차에 해당하는지 찾기
 */
const findChapterDayInPlan = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    try {
        switch (planData.planType) {
            case 'full_bible':
                return findChapterDayInFullBible(book, chapter, planData);
            case 'new_testament':
                if (book >= 40 && book <= 66) {
                    return findChapterDayInNewTestament(book, chapter, planData);
                }
                break;
            case 'old_testament':
                if (book >= 1 && book <= 39) {
                    return findChapterDayInOldTestament(book, chapter, planData);
                }
                break;
            case 'pentateuch':
                if (book >= 1 && book <= 5) {
                    return findChapterDayInPentateuch(book, chapter, planData);
                }
                break;
            case 'psalms':
                if (book === 19) {
                    return findChapterDayInPsalms(chapter, planData);
                }
                break;
            default:
                return -1;
        }
        return -1;
    } catch (error) {
        console.error('장 일수 계산 오류:', error);
        return -1;
    }
};

// 신약 챕터 일수 찾기
const findChapterDayInNewTestament = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    let totalChapters = 0;

    // 신약 시작 전까지의 장수 계산
    for (let b = 40; b < book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (bookInfo) {
            totalChapters += bookInfo.count;
        }
    }

    // 현재 책의 챕터 추가
    totalChapters += chapter;

    // 하루에 읽을 장수로 나누어 몇 일째인지 계산
    return Math.ceil(totalChapters / planData.chaptersPerDay);
};

// 구약 챕터 일수 찾기
const findChapterDayInOldTestament = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    let totalChapters = 0;

    // 구약 시작 전까지의 장수 계산
    for (let b = 1; b < book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (bookInfo) {
            totalChapters += bookInfo.count;
        }
    }

    // 현재 책의 챕터 추가
    totalChapters += chapter;

    // 하루에 읽을 장수로 나누어 몇 일째인지 계산
    return Math.ceil(totalChapters / planData.chaptersPerDay);
};

// 모세오경 챕터 일수 찾기
const findChapterDayInPentateuch = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    let totalChapters = 0;

    // 모세오경 시작 전까지의 장수 계산
    for (let b = 1; b < book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (bookInfo && b <= 5) { // 모세오경 범위 내에서만
            totalChapters += bookInfo.count;
        }
    }

    // 현재 책의 챕터 추가
    totalChapters += chapter;

    // 하루에 읽을 장수로 나누어 몇 일째인지 계산
    return Math.ceil(totalChapters / planData.chaptersPerDay);
};

// 시편 챕터 일수 찾기
const findChapterDayInPsalms = (
    chapter: number,
    planData: BiblePlanData
): number => {
    // 시편은 장 번호가 곧 순서
    return Math.ceil(chapter / planData.chaptersPerDay);
};

// 전체 성경 챕터 일수 찾기
const findChapterDayInFullBible = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    const globalIndex = getGlobalChapterIndex(book, chapter);
    return Math.ceil(globalIndex / planData.chaptersPerDay);
};

/**
 * 알림 스케줄링 (푸시 알림)
 */
export const scheduleDailyReminder = (time: string = '07:00'): void => {
    // 여기서 푸시 알림 스케줄링 로직
    console.log(`일독 알림 설정: ${time}`);
};

// Re-export from timeBasedBibleSystem for convenience
export { getChapterAudioMinutes } from './timeBasedBibleSystem';