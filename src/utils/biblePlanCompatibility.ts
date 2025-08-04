// utils/biblePlanCompatibility.ts
// 기존 biblePlanUtils.ts와의 호환성을 유지하면서 시간 기반 계산을 지원하는 래퍼

import {
    getTodayChaptersTimeBase,
    getChapterStatusTimeBase,
    calculateProgressTimeBase,
    calculateMissedChaptersTimeBase,
    createTimeBasedPlan,
    initializeAudioData,
    TimeBasedPlanData
} from './timeBasedBibleCalculator';

import {
    getTodayChapters as getTodayChaptersLegacy,
    getChapterStatus as getChapterStatusLegacy,
    calculateProgress as calculateProgressLegacy,
    calculateMissedChapters as calculateMissedChaptersLegacy,
    getCurrentDay,
    formatDate,
    formatTime,
    saveBiblePlanData,
    loadBiblePlanData,
    deleteBiblePlanData,
    BiblePlanData
} from './biblePlanUtils';
import {defaultStorage} from "./mmkv";

/**
 * 기존 getTodayChapters 함수를 대체하는 호환 함수
 * 시간 기반 계획과 장 기반 계획을 모두 지원
 */
export const getTodayChapters = (planData: any) => {
    if (!planData) return [];

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return getTodayChaptersTimeBase(planData as TimeBasedPlanData);
    }

    // 기존 장 기반 로직
    return getTodayChaptersLegacy(planData as BiblePlanData);
};

/**
 * 기존 getChapterStatus 함수를 대체하는 호환 함수
 */
export const getChapterStatus = (
    planData: any,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return getChapterStatusTimeBase(planData as TimeBasedPlanData, book, chapter);
    }

    // 기존 장 기반 로직
    return getChapterStatusLegacy(planData as BiblePlanData, book, chapter);
};

/**
 * 기존 calculateProgress 함수를 대체하는 호환 함수
 */
export const calculateProgress = (planData: any) => {
    if (!planData) {
        return {
            chaptersPerDay: 0,
            totalChapters: 0,
            readChapters: 0,
            progressPercentage: 0,
            daysProgress: {
                current: 0,
                total: 0,
                percentage: 0
            }
        };
    }

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return calculateProgressTimeBase(planData as TimeBasedPlanData);
    }

    // 기존 장 기반 로직
    return calculateProgressLegacy(planData as BiblePlanData);
};

/**
 * 기존 calculateMissedChapters 함수를 대체하는 호환 함수
 */
export const calculateMissedChapters = (planData: any): number => {
    if (!planData) return 0;

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return calculateMissedChaptersTimeBase(planData as TimeBasedPlanData);
    }

    // 기존 장 기반 로직
    return calculateMissedChaptersLegacy(planData as BiblePlanData);
};

/**
 * 장을 읽음으로 표시하는 함수 (시간 기반 확장)
 */
export const markChapterAsRead = (
    planData: any,
    book: number,
    chapter: number
): any => {
    const updatedReadChapters = [...(planData.readChapters || [])];
    const existingIndex = updatedReadChapters.findIndex(
        (r: any) => r.book === book && r.chapter === chapter
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
        const newItem: any = {
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: true
        };

        // 시간 기반 계획인 경우 예상 시간 추가
        if (planData.isTimeBasedCalculation) {
            const { getChapterAudioMinutes } = require('./timeBasedBibleCalculator');
            newItem.estimatedMinutes = Math.round(getChapterAudioMinutes(book, chapter));
        }

        updatedReadChapters.push(newItem);
    }

    return {
        ...planData,
        readChapters: updatedReadChapters
    };
};

/**
 * 새로운 일독 계획 생성 (시간 기반 옵션 추가)
 */
export const createBiblePlan = (
    planType: string,
    planName: string,
    startDate: string,
    targetDate: string,
    useTimeBasedCalculation: boolean = true // 기본값: 시간 기반 사용
): any => {
    if (useTimeBasedCalculation) {
        // CSV 데이터가 로드되어 있는지 확인
        const csvData = loadCSVDataFromStorage();
        if (csvData) {
            initializeAudioData(csvData);
        }

        return createTimeBasedPlan(planType, planName, startDate, targetDate);
    }

    // 기존 장 기반 계획 생성 로직
    // (기존 코드 사용)
    return createLegacyBiblePlan(planType, planName, startDate, targetDate);
};

/**
 * CSV 데이터를 스토리지에서 로드
 */
const loadCSVDataFromStorage = (): any[] | null => {
    try {
        const savedData = defaultStorage.getString('bible_audio_data');
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (error) {
        console.error('CSV 데이터 로드 실패:', error);
    }
    return null;
};

/**
 * CSV 데이터를 스토리지에 저장
 */
export const saveCSVDataToStorage = (csvData: any[]): void => {
    try {
        defaultStorage.set('bible_audio_data', JSON.stringify(csvData));
        console.log('CSV 데이터 저장 완료');
    } catch (error) {
        console.error('CSV 데이터 저장 실패:', error);
    }
};

/**
 * 기존 장 기반 계획 생성 함수 (레거시)
 */
const createLegacyBiblePlan = (
    planType: string,
    planName: string,
    startDate: string,
    targetDate: string
): {
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;
    chaptersPerDay: number;
    totalChapters: number;
    currentDay: number;
    readChapters: any[];
    createdAt: string
} => {
    // 기존 로직 유지
    const start = new Date(startDate);
    const end = new Date(targetDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let totalChapters = 0;
    switch (planType) {
        case 'full_bible':
            totalChapters = 1189;
            break;
        case 'old_testament':
            totalChapters = 929;
            break;
        case 'new_testament':
            totalChapters = 260;
            break;
        case 'pentateuch':
            totalChapters = 187;
            break;
        case 'psalms':
            totalChapters = 150;
            break;
        default:
            totalChapters = 1189;
    }

    const chaptersPerDay = Math.ceil(totalChapters / totalDays);

    return {
        planType,
        planName,
        startDate,
        targetDate,
        totalDays,
        chaptersPerDay,
        totalChapters,
        currentDay: 1,
        readChapters: [],
        createdAt: new Date().toISOString()
    };
};

// 기존 함수들 재내보내기 (변경 없이 사용)
export {
    getCurrentDay,
    formatDate,
    formatTime,
    saveBiblePlanData,
    loadBiblePlanData,
    deleteBiblePlanData
} from './biblePlanUtils';