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
    getChapterAudioMinutes,
    markChapterAsRead as markChapterAsReadTimeBase,
    markChapterAsUnread as markChapterAsUnreadTimeBase
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
        totalChapters: 929,
        totalMinutes: 3677,
        totalSeconds: 25
    },
    {
        id: 'new_testament',
        name: '신약',
        description: '마태복음 1장 ~ 요한계시록 22장',
        totalChapters: 260,
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
    const planData = loadTimeBasedPlan();

    // 데이터 무결성 검사 및 수정
    if (planData) {
        // readChapters가 없으면 빈 배열로 초기화
        if (!planData.readChapters) {
            planData.readChapters = [];
        }

        // 기타 필수 필드 검증
        if (!planData.planType) planData.planType = 'full_bible';
        if (!planData.totalChapters) planData.totalChapters = 1189;
        if (!planData.totalDays || planData.totalDays <= 0) planData.totalDays = 365;
        if (!planData.chaptersPerDay || planData.chaptersPerDay <= 0) {
            planData.chaptersPerDay = Math.ceil(planData.totalChapters / planData.totalDays);
        }
    }

    return planData;
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
 * 🔥 오늘 읽을 장 가져오기 (시간 기반 통합)
 */
export const getTodayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    if (!planData) return [];

    // readChapters가 없으면 빈 배열로 초기화
    if (!planData.readChapters) {
        planData.readChapters = [];
    }

    // timeBasedBibleSystem의 getTodayChapters 사용
    return getTodayChaptersTimeBase(planData);
};

/**
 * 🔥 장 상태 확인 (시간 기반 통합)
 */
export const getChapterStatus = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    // readChapters가 없으면 빈 배열로 초기화
    if (!planData.readChapters) {
        planData.readChapters = [];
    }

    // timeBasedBibleSystem의 getChapterStatus 사용
    return getChapterStatusTimeBase(planData, book, chapter);
};

/**
 * 🎨 장 상태에 따른 스타일 정보 가져오기
 */
export interface ChapterStyleInfo {
    color: string;
    backgroundColor?: string;
    showExclamation: boolean;
    priority: number; // 색상 우선순위 (높을수록 우선)
    statusText: string;
}

export const getChapterStyleInfo = (
    planData: BiblePlanData | null,
    book: number,
    chapter: number,
    isRead: boolean,
    colorTheme: {
        black: string;      // 검정색 (안 읽은 장)
        bible: string;      // 초록색 (읽은 장)
        blue: string;       // 파란색 (어제 읽어야 했던 장)
        red: string;        // 빨간색 (오늘 읽을 장)
        gray?: string;      // 회색 (미래 장)
        white?: string;     // 흰색 (텍스트용)
    }
): ChapterStyleInfo => {
    // 기본값
    const defaultStyle: ChapterStyleInfo = {
        color: colorTheme.black,
        showExclamation: false,
        priority: 0,
        statusText: '읽지 않음'
    };

    // 읽은 장은 항상 초록색 (최우선)
    if (isRead) {
        return {
            color: colorTheme.bible, // #4CAF50
            showExclamation: false,
            priority: 1,
            statusText: '읽음'
        };
    }

    // 계획이 없으면 검정색
    if (!planData) {
        return defaultStyle;
    }

    const status = getChapterStatus(planData, book, chapter);

    // 상태별 스타일 정의 (기존 코드 기준)
    switch (status) {
        case 'today':
            // 오늘 읽을 장 - 빨간색 (#F44336)
            return {
                color: colorTheme.red,
                showExclamation: false,
                priority: 4,
                statusText: '오늘 읽을 장'
            };

        case 'yesterday':
            // 어제 읽어야 했던 장 - 파란색 (#2196F3) + 느낌표
            return {
                color: colorTheme.blue,
                showExclamation: true,
                priority: 3,
                statusText: '어제 읽어야 했던 장'
            };

        case 'missed':
            // 놓친 장 - 검정색 (#000000 or #333333) + 느낌표
            return {
                color: colorTheme.black,
                showExclamation: true,
                priority: 2,
                statusText: '놓친 장'
            };

        case 'completed':
            // 읽은 장 - 초록색 (이미 위에서 처리됨)
            return {
                color: colorTheme.bible,
                showExclamation: false,
                priority: 1,
                statusText: '읽음'
            };

        case 'future':
            // 미래 장 - 검정색
            return {
                color: colorTheme.black,
                showExclamation: false,
                priority: 0,
                statusText: '예정된 장'
            };

        case 'normal':
        default:
            // 계획에 포함되지 않은 장 - 검정색
            return defaultStyle;
    }
};

/**
 * 🔢 놓친 장들의 상세 정보 가져오기
 */
export interface MissedChapterInfo {
    book: number;
    chapter: number;
    bookName: string;
    missedDate: string;
    daysAgo: number;
}

export const getMissedChaptersDetail = (planData: BiblePlanData): MissedChapterInfo[] => {
    if (!planData || !planData.dailyReadingPlan) return [];

    const currentDay = getCurrentDay(planData.startDate);
    const missedChapters: MissedChapterInfo[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 시간 기반 계획의 경우
    if (planData.isTimeBasedCalculation && planData.dailyReadingPlan) {
        for (let day = 0; day < currentDay - 1 && day < planData.dailyReadingPlan.length; day++) {
            const dayPlan = planData.dailyReadingPlan[day];
            if (dayPlan?.chapters) {
                dayPlan.chapters.forEach(ch => {
                    if (!isChapterRead(planData, ch.book, ch.chapter)) {
                        const missedDate = new Date(dayPlan.date);
                        const daysAgo = Math.floor((today.getTime() - missedDate.getTime()) / (1000 * 60 * 60 * 24));

                        missedChapters.push({
                            book: ch.book,
                            chapter: ch.chapter,
                            bookName: ch.bookName,
                            missedDate: dayPlan.date,
                            daysAgo
                        });
                    }
                });
            }
        }
    } else {
        // 기존 장 기반 로직
        const range = getBookRangeForPlan(planData.planType);
        let globalIndex = 0;

        for (let book = range.start; book <= range.end; book++) {
            const bookInfo = BibleStep.find(step => step.index === book);
            if (!bookInfo) continue;

            for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                globalIndex++;
                const chapterDay = Math.ceil(globalIndex / planData.chaptersPerDay);

                if (chapterDay < currentDay && !isChapterRead(planData, book, chapter)) {
                    const missedDate = new Date(planData.startDate);
                    missedDate.setDate(missedDate.getDate() + chapterDay - 1);
                    const daysAgo = Math.floor((today.getTime() - missedDate.getTime()) / (1000 * 60 * 60 * 24));

                    missedChapters.push({
                        book,
                        chapter,
                        bookName: bookInfo.name,
                        missedDate: missedDate.toISOString().split('T')[0],
                        daysAgo
                    });
                }
            }
        }
    }

    // 날짜순으로 정렬 (오래된 것부터)
    return missedChapters.sort((a, b) => b.daysAgo - a.daysAgo);
};

/**
 * 🔴 앱 뱃지 카운트 가져오기 (놓친 장 개수)
 */
export const getAppBadgeCount = (planData: BiblePlanData | null): number => {
    if (!planData) return 0;
    return calculateMissedChapters(planData);
};

// 내부 헬퍼 함수 (기존 코드에서 필요한 경우)
const getBookRangeForPlan = (planType: string): { start: number; end: number } => {
    switch (planType) {
        case 'full_bible':
            return { start: 1, end: 66 };
        case 'old_testament':
            return { start: 1, end: 39 };
        case 'new_testament':
            return { start: 40, end: 66 };
        case 'pentateuch':
            return { start: 1, end: 5 };
        case 'psalms':
            return { start: 19, end: 19 };
        default:
            return { start: 1, end: 66 };
    }
};

/**
 * 🔥 진행률 계산 (시간 기반 통합)
 */
export const calculateProgress = (planData: BiblePlanData) => {
    if (!planData) {
        return {
            readChapters: 0,
            totalChapters: 0,
            progressPercentage: 0
        };
    }

    // readChapters가 없으면 빈 배열로 초기화
    if (!planData.readChapters) {
        planData.readChapters = [];
    }

    // timeBasedBibleSystem의 calculateProgress 사용
    return calculateProgressTimeBase(planData);
};

/**
 * 🔥 놓친 장 개수 계산 (시간 기반 통합)
 */
export const calculateMissedChapters = (planData: BiblePlanData): number => {
    if (!planData) return 0;

    // readChapters가 없으면 빈 배열로 초기화
    if (!planData.readChapters) {
        planData.readChapters = [];
    }

    // timeBasedBibleSystem의 calculateMissedChapters 사용
    return calculateMissedChaptersTimeBase(planData);
};

/**
 * 🔥 장 읽음 표시 (시간 기반 통합)
 */
export const markChapterAsRead = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): BiblePlanData => {
    try {
        // 데이터 검증
        if (!planData) {
            console.error('markChapterAsRead: planData가 없습니다');
            throw new Error('계획 데이터가 없습니다');
        }

        // book과 chapter 유효성 검증
        if (!book || !chapter || book < 1 || book > 66 || chapter < 1) {
            console.error('markChapterAsRead: 잘못된 book/chapter', { book, chapter });
            throw new Error('잘못된 성경 위치입니다');
        }

        console.log('markChapterAsRead 호출:', { book, chapter, planData: !!planData });

        const updatedPlan = markChapterAsReadTimeBase(planData, book, chapter);

        console.log('markChapterAsRead 완료:', {
            updatedReadChapters: updatedPlan.readChapters.length,
            isRead: updatedPlan.readChapters.some(r => r.book === book && r.chapter === chapter && r.isRead)
        });

        return updatedPlan;
    } catch (error) {
        console.error('markChapterAsRead 에러:', error);
        throw error;
    }
};

/**
 * 🔥 장 읽지 않음 표시 (시간 기반 통합)
 */
export const markChapterAsUnread = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): BiblePlanData => {
    try {
        // 데이터 검증
        if (!planData) {
            console.error('markChapterAsUnread: planData가 없습니다');
            throw new Error('계획 데이터가 없습니다');
        }

        // book과 chapter 유효성 검증
        if (!book || !chapter || book < 1 || book > 66 || chapter < 1) {
            console.error('markChapterAsUnread: 잘못된 book/chapter', { book, chapter });
            throw new Error('잘못된 성경 위치입니다');
        }

        console.log('markChapterAsUnread 호출:', { book, chapter, planData: !!planData });

        const updatedPlan = markChapterAsUnreadTimeBase(planData, book, chapter);

        console.log('markChapterAsUnread 완료:', {
            updatedReadChapters: updatedPlan.readChapters.length
        });

        return updatedPlan;
    } catch (error) {
        console.error('markChapterAsUnread 에러:', error);
        throw error;
    }
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (dateString: string): string => {
    return formatDateTimeBase(dateString);
};

/**
 * 시간 포맷팅
 */
export const formatTime = (minutes: number): string => {
    return formatTimeBase(minutes);
};

/**
 * 전체 장에서 특정 장의 인덱스 계산
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
 * 전체 인덱스에서 책과 장 번호 계산
 */
export const getBookAndChapterFromGlobalIndex = (globalIndex: number): { book: number; chapter: number } => {
    let remainingIndex = globalIndex;

    for (const bookInfo of BibleStep) {
        if (remainingIndex <= bookInfo.count) {
            return {
                book: bookInfo.index,
                chapter: remainingIndex
            };
        }
        remainingIndex -= bookInfo.count;
    }

    // 범위를 벗어난 경우 마지막 장 반환
    return {
        book: 66,
        chapter: 22
    };
};

/**
 * 연속 읽기 일수 계산
 */
export const calculateReadingStreak = (planData: BiblePlanData): number => {
    if (!planData || !planData.readChapters || planData.readChapters.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasReadOnDate = (planData.readChapters || []).some(r => {
            if (!r || !r.date) return false;
            const readDate = new Date(r.date);
            readDate.setHours(0, 0, 0, 0);
            return readDate.toISOString().split('T')[0] === dateStr && r.isRead;
        });

        if (hasReadOnDate) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

/**
 * 특정 날짜에 읽은 장들 가져오기
 */
export const getChaptersReadOnDate = (planData: BiblePlanData, date: string): ReadingStatus[] => {
    if (!planData || !planData.readChapters) return [];

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    return (planData.readChapters || []).filter(r => {
        if (!r || !r.date) return false;
        const readDate = new Date(r.date);
        readDate.setHours(0, 0, 0, 0);
        return readDate.toISOString().split('T')[0] === targetDateStr && r.isRead;
    });
};

/**
 * 예상 완료일 계산
 */
export const getEstimatedCompletionDate = (planData: BiblePlanData): string | null => {
    if (!planData) return null;

    const progress = calculateProgress(planData);
    const remainingChapters = planData.totalChapters - progress.readChapters;

    if (remainingChapters <= 0) return null;

    const avgChaptersPerDay = planData.chaptersPerDay || 5;
    const remainingDays = Math.ceil(remainingChapters / avgChaptersPerDay);

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + remainingDays);

    return completionDate.toISOString().split('T')[0];
};

/**
 * CSV 파일에서 오디오 데이터 로드 (앱 초기화시 사용)
 */
export const loadAudioDataFromCSV = async (csvContent: string): Promise<boolean> => {
    return await initializeAudioData(csvContent);
};

/**
 * 🔥 UI에서 안전하게 사용할 수 있는 계획 데이터 반환
 */
export const getSafePlanData = (planData: BiblePlanData | null): BiblePlanData | null => {
    if (!planData) return null;

    // 필수 필드 초기화
    return {
        ...planData,
        readChapters: planData.readChapters || [],
        planType: planData.planType || 'full_bible',
        planName: planData.planName || '성경일독',
        startDate: planData.startDate || new Date().toISOString().split('T')[0],
        targetDate: planData.targetDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        totalDays: planData.totalDays || 365,
        chaptersPerDay: planData.chaptersPerDay || 4,
        totalChapters: planData.totalChapters || 1189,
        currentDay: planData.currentDay || 1,
        createdAt: planData.createdAt || new Date().toISOString(),
        isTimeBasedCalculation: planData.isTimeBasedCalculation !== undefined ? planData.isTimeBasedCalculation : true,
        targetMinutesPerDay: planData.targetMinutesPerDay || 20,
        totalMinutes: planData.totalMinutes || 4715,
        minutesPerDay: planData.minutesPerDay || 20,
        dailyReadingPlan: planData.dailyReadingPlan || []
    };
};

/**
 * 🔥 장이 읽었는지 안전하게 확인
 */
export const isChapterRead = (planData: BiblePlanData | null, book: number, chapter: number): boolean => {
    if (!planData || !planData.readChapters) return false;

    return (planData.readChapters || []).some(r =>
        r && r.book === book && r.chapter === chapter && r.isRead === true
    );
};

/**
 * 🔥 특정 장의 읽기 정보 안전하게 가져오기
 */
export const getChapterReadingInfo = (planData: BiblePlanData | null, book: number, chapter: number): ReadingStatus | null => {
    if (!planData || !planData.readChapters) return null;

    return (planData.readChapters || []).find(r =>
        r && r.book === book && r.chapter === chapter
    ) || null;
};

/**
 * 디버깅용: 현재 계획 정보 출력
 */
export const debugPrintPlanInfo = (planData: BiblePlanData | null): void => {
    if (!planData) {
        console.log('📭 현재 설정된 성경일독 계획이 없습니다.');
        return;
    }

    const progress = calculateProgress(planData);
    const missedChapters = calculateMissedChapters(planData);
    const currentDay = getCurrentDay(planData.startDate);
    const todayChapters = getTodayChapters(planData);

    console.log('📋 현재 성경일독 계획:');
    console.log(`- 계획명: ${planData.planName}`);
    console.log(`- 유형: ${planData.planType}`);
    console.log(`- 기간: ${formatDate(planData.startDate)} ~ ${formatDate(planData.targetDate)}`);
    console.log(`- 진행: ${currentDay}/${planData.totalDays}일`);
    console.log(`- 하루 목표: ${formatTime(planData.targetMinutesPerDay || 0)}`);
    console.log(`- 오늘 읽을 장: ${todayChapters.length}장`);
    console.log(`- 진행률: ${progress.progressPercentage.toFixed(1)}% (${progress.readChapters}/${progress.totalChapters}장)`);
    if (progress.timeProgressPercentage !== undefined) {
        console.log(`- 시간 진행률: ${progress.timeProgressPercentage.toFixed(1)}% (${formatTime(progress.readMinutes || 0)}/${formatTime(progress.totalMinutes || 0)})`);
    }
    console.log(`- 놓친 장: ${missedChapters}장`);
};

/**
 * 🔥 UI에서 안전하게 읽기 상태 토글
 */
export const toggleChapterReadStatus = async (
    book: number,
    chapter: number,
    currentIsRead: boolean
): Promise<{ success: boolean; planData?: BiblePlanData; error?: string }> => {
    try {
        console.log('toggleChapterReadStatus 시작:', { book, chapter, currentIsRead });

        // 계획 데이터 로드
        const planData = loadBiblePlanData();
        if (!planData) {
            return {
                success: false,
                error: '성경일독 계획이 설정되지 않았습니다. 먼저 계획을 생성해주세요.'
            };
        }

        // 안전한 계획 데이터 가져오기
        const safePlanData = getSafePlanData(planData);
        if (!safePlanData) {
            return {
                success: false,
                error: '계획 데이터를 로드할 수 없습니다.'
            };
        }

        // 읽기 상태 업데이트
        let updatedPlan: BiblePlanData;
        if (currentIsRead) {
            updatedPlan = markChapterAsUnread(safePlanData, book, chapter);
        } else {
            updatedPlan = markChapterAsRead(safePlanData, book, chapter);
        }

        console.log('toggleChapterReadStatus 성공');
        return { success: true, planData: updatedPlan };

    } catch (error) {
        console.error('toggleChapterReadStatus 에러:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '읽기 상태 업데이트 중 오류가 발생했습니다.'
        };
    }
};