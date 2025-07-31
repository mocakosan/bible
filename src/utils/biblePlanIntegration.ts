// src/utils/biblePlanIntegration.ts
// 🔥 시간 기반 시스템과 기존 시스템 통합 - 완전한 구현

import {
    createTimeBasedBiblePlan,
    loadTimeBasedBiblePlan,
    saveTimeBasedBiblePlan,
    deleteTimeBasedBiblePlan,
    markChapterAsRead,
    markChapterAsUnread,
    getTodayChapters,
    getCurrentDay,
    getDailyReading,
    calculateTimeBasedProgress,
    calculateTimeBasedMissedChapters,
    getWeeklySchedule,
    getChapterStatus,
    validateTimeBasedPlan,
    formatReadingTime,
    formatDate,
    getProgressIndicator,
    getEstimatedCompletionDate,
    getMotivationalMessage,
    calculateReadingStreak,
    generatePlanPreview,
    initializeTimeBasedBibleSystem,
    TimeBasedBiblePlan,
    ReadChapterStatus,
    DailyReading
} from './timeBasedBibleSystem';
import { loadChapterTimeDataFromCSV } from './csvDataLoader';
import { defaultStorage } from './mmkv';

// === 1. 앱 초기화 함수 ===

/**
 * App.tsx에서 호출할 초기화 함수
 */
export async function initializeBibleApp(): Promise<void> {
    console.log('📱 성경 앱 초기화 시작...');

    try {
        // 🔥 시간 기반 시스템 초기화 (CSV 데이터 로드)
        const success = await initializeTimeBasedBibleSystem();

        if (success) {
            console.log('✅ CSV 데이터 기반 초기화 성공');
        } else {
            console.log('⚠️ 기본 추정치로 초기화됨');
        }

        // 기존 저장된 계획이 있다면 검증
        const existingPlan = loadExistingBiblePlan();
        if (existingPlan) {
            if (validateTimeBasedPlan(existingPlan)) {
                console.log('✅ 기존 시간 기반 계획 검증 완료');
            } else {
                console.log('⚠️ 기존 계획이 유효하지 않음. 새 계획 생성을 권장합니다.');
            }
        }

        console.log('✅ 성경 앱 초기화 완료');
    } catch (error) {
        console.error('❌ 앱 초기화 실패:', error);
    }
}

// === 2. 계획 생성 관련 타입 및 함수 ===

export interface BiblePlanFormData {
    planType: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

/**
 * 🔥 계획 생성 전 미리보기 정보 가져오기
 */
export function getPlanPreview(formData: BiblePlanFormData): {
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
} {
    return generatePlanPreview(formData.planType, formData.startDate, formData.endDate);
}

/**
 * 🔥 새로운 시간 기반 계획 생성 및 저장
 */
export function createAndSaveBiblePlan(formData: BiblePlanFormData): {
    success: boolean;
    errorMessage?: string;
    planData?: TimeBasedBiblePlan;
} {
    try {
        // 입력 검증
        const preview = getPlanPreview(formData);
        if (!preview.isValid) {
            return {
                success: false,
                errorMessage: preview.errorMessage
            };
        }

        // 시간 기반 계획 생성
        const planData = createTimeBasedBiblePlan(
            formData.planType,
            formData.startDate,
            formData.endDate
        );

        // 저장
        saveTimeBasedBiblePlan(planData);

        console.log('✅ 새로운 시간 기반 성경일독 계획 생성 완료');

        return {
            success: true,
            planData
        };

    } catch (error) {
        console.error('❌ 계획 생성 실패:', error);
        return {
            success: false,
            errorMessage: '계획 생성 중 오류가 발생했습니다.'
        };
    }
}

// === 3. 대시보드 데이터 제공 함수 ===

/**
 * 🔥 메인 대시보드 데이터 제공 - 시간 기반
 */
export function getBibleReadingDashboard(): {
    hasPlan: boolean;
    planData?: TimeBasedBiblePlan;
    currentDayReading?: DailyReading;
    todayChapters: ReadChapterStatus[];
    progressInfo: {
        progressPercentage: number;
        readTime: number;
        totalTime: number;
        readChapters: number;
        totalChapters: number;
        currentDayProgress: number;
    };
    weeklySchedule: DailyReading[];
    planSummary: {
        planName: string;
        totalDays: number;
        currentDay: number;
        dailyTargetTime: number;
        estimatedCompletionDate: string;
        formattedDailyTime: string;
        formattedTotalTime: string;
    };
    motivationalMessage: string;
    readingStreak: number;
    missedChapters: number;
} {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return {
            hasPlan: false,
            todayChapters: [],
            progressInfo: {
                progressPercentage: 0,
                readTime: 0,
                totalTime: 0,
                readChapters: 0,
                totalChapters: 0,
                currentDayProgress: 0
            },
            weeklySchedule: [],
            planSummary: {
                planName: '',
                totalDays: 0,
                currentDay: 0,
                dailyTargetTime: 0,
                estimatedCompletionDate: '',
                formattedDailyTime: '',
                formattedTotalTime: ''
            },
            motivationalMessage: "새로운 시간 기반 성경일독 계획을 시작해보세요!",
            readingStreak: 0,
            missedChapters: 0
        };
    }

    const currentDay = getCurrentDay(planData);
    const currentDayReading = getDailyReading(planData, currentDay);
    const todayChapters = getTodayChapters(planData);
    const progressInfo = calculateTimeBasedProgress(planData);
    const weeklySchedule = getWeeklySchedule(planData);
    const missedChapters = calculateTimeBasedMissedChapters(planData);
    const readingStreak = calculateReadingStreak(planData);

    return {
        hasPlan: true,
        planData,
        currentDayReading,
        todayChapters,
        progressInfo,
        weeklySchedule,
        planSummary: {
            planName: planData.planName,
            totalDays: planData.totalDays,
            currentDay,
            dailyTargetTime: planData.calculatedMinutesPerDay,
            estimatedCompletionDate: getEstimatedCompletionDate(planData),
            formattedDailyTime: formatReadingTime(planData.calculatedMinutesPerDay),
            formattedTotalTime: formatReadingTime(planData.totalMinutes)
        },
        motivationalMessage: getMotivationalMessage(planData),
        readingStreak,
        missedChapters
    };
}

// === 4. 읽기 완료/취소 처리 함수 ===

/**
 * 🔥 장 읽기 완료 처리
 */
export function markBibleChapterAsRead(bookIndex: number, chapter: number): {
    success: boolean;
    errorMessage?: string;
    updatedPlan?: TimeBasedBiblePlan;
} {
    try {
        const planData = loadExistingBiblePlan();

        if (!planData || !validateTimeBasedPlan(planData)) {
            return {
                success: false,
                errorMessage: '유효한 성경일독 계획이 없습니다.'
            };
        }

        const updatedPlan = markChapterAsRead(planData, bookIndex, chapter);
        saveTimeBasedBiblePlan(updatedPlan);

        console.log(`✅ ${bookIndex}권 ${chapter}장 읽기 완료 처리`);

        return {
            success: true,
            updatedPlan
        };

    } catch (error) {
        console.error('❌ 장 읽기 완료 처리 실패:', error);
        return {
            success: false,
            errorMessage: '읽기 완료 처리 중 오류가 발생했습니다.'
        };
    }
}

/**
 * 🔥 장 읽기 취소 처리
 */
export function markBibleChapterAsUnread(bookIndex: number, chapter: number): {
    success: boolean;
    errorMessage?: string;
    updatedPlan?: TimeBasedBiblePlan;
} {
    try {
        const planData = loadExistingBiblePlan();

        if (!planData || !validateTimeBasedPlan(planData)) {
            return {
                success: false,
                errorMessage: '유효한 성경일독 계획이 없습니다.'
            };
        }

        const updatedPlan = markChapterAsUnread(planData, bookIndex, chapter);
        saveTimeBasedBiblePlan(updatedPlan);

        console.log(`✅ ${bookIndex}권 ${chapter}장 읽기 취소 처리`);

        return {
            success: true,
            updatedPlan
        };

    } catch (error) {
        console.error('❌ 장 읽기 취소 처리 실패:', error);
        return {
            success: false,
            errorMessage: '읽기 취소 처리 중 오류가 발생했습니다.'
        };
    }
}

// === 5. 장 상태 확인 함수 ===

/**
 * 🔥 특정 장의 읽기 상태 확인
 */
export function getBibleChapterStatus(bookIndex: number, chapter: number): {
    status: 'today' | 'past' | 'future' | 'completed' | 'missed';
    isRead: boolean;
    scheduledDay?: number;
    scheduledDate?: string;
    estimatedMinutes?: number;
} {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return {
            status: 'future',
            isRead: false
        };
    }

    const status = getChapterStatus(planData, bookIndex, chapter);
    const isRead = planData.readChapters.some(
        r => r.book === bookIndex && r.chapter === chapter && r.isRead
    );

    // 스케줄된 날짜 찾기
    let scheduledDay: number | undefined;
    let scheduledDate: string | undefined;
    let estimatedMinutes: number | undefined;

    for (const schedule of planData.dailyReadingSchedule) {
        const chapterInSchedule = schedule.chapters.find(
            ch => ch.book === bookIndex && ch.chapter === chapter
        );
        if (chapterInSchedule) {
            scheduledDay = schedule.day;
            scheduledDate = schedule.date;
            estimatedMinutes = chapterInSchedule.estimatedMinutes;
            break;
        }
    }

    return {
        status,
        isRead,
        scheduledDay,
        scheduledDate,
        estimatedMinutes
    };
}

// === 6. 계획 관리 함수 ===

/**
 * 🔥 기존 계획 로드
 */
export function loadExistingBiblePlan(): TimeBasedBiblePlan | null {
    return loadTimeBasedBiblePlan();
}

/**
 * 🔥 계획 삭제
 */
export function deleteBiblePlan(): {
    success: boolean;
    errorMessage?: string;
} {
    try {
        deleteTimeBasedBiblePlan();
        console.log('✅ 성경일독 계획 삭제 완료');

        return {
            success: true
        };

    } catch (error) {
        console.error('❌ 계획 삭제 실패:', error);
        return {
            success: false,
            errorMessage: '계획 삭제 중 오류가 발생했습니다.'
        };
    }
}

/**
 * 🔥 계획 재설정 (기존 계획 삭제 후 새 계획 생성)
 */
export function resetBiblePlan(formData: BiblePlanFormData): {
    success: boolean;
    errorMessage?: string;
    planData?: TimeBasedBiblePlan;
} {
    try {
        // 기존 계획 삭제
        deleteTimeBasedBiblePlan();

        // 새 계획 생성
        return createAndSaveBiblePlan(formData);

    } catch (error) {
        console.error('❌ 계획 재설정 실패:', error);
        return {
            success: false,
            errorMessage: '계획 재설정 중 오류가 발생했습니다.'
        };
    }
}

// === 7. 특정 날짜/기간 읽기 데이터 함수 ===

/**
 * 🔥 특정 날짜의 읽기 데이터 가져오기
 */
export function getDayReading(day: number): DailyReading | null {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return null;
    }

    return getDailyReading(planData, day);
}

/**
 * 🔥 지난 7일간의 읽기 통계
 */
export function getWeeklyStats(): {
    daysCompleted: number;
    totalDays: number;
    completionRate: number;
    totalReadTime: number;
    averageDailyTime: number;
    streak: number;
} {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return {
            daysCompleted: 0,
            totalDays: 7,
            completionRate: 0,
            totalReadTime: 0,
            averageDailyTime: 0,
            streak: 0
        };
    }

    const currentDay = getCurrentDay(planData);
    const weeklySchedule = getWeeklySchedule(planData, Math.max(1, currentDay - 6));

    const daysCompleted = weeklySchedule.filter(day => day.isCompleted).length;
    const totalReadTime = weeklySchedule.reduce((sum, day) => {
        const dayReadTime = day.chapters
            .filter(ch => ch.isRead)
            .reduce((chSum, ch) => chSum + ch.estimatedMinutes, 0);
        return sum + dayReadTime;
    }, 0);

    return {
        daysCompleted,
        totalDays: weeklySchedule.length,
        completionRate: Math.round((daysCompleted / weeklySchedule.length) * 100),
        totalReadTime: Math.round(totalReadTime * 10) / 10,
        averageDailyTime: Math.round((totalReadTime / weeklySchedule.length) * 10) / 10,
        streak: calculateReadingStreak(planData)
    };
}

// === 8. 레거시 시스템 호환 함수들 ===

/**
 * 🔥 기존 biblePlanUtils.ts 호환 함수들
 */

// 기존 loadBiblePlanData 대체
export const loadBiblePlanData = (): any => {
    const planData = loadExistingBiblePlan();

    if (!planData) {
        return null;
    }

    // 기존 형식으로 변환 (하위 호환성)
    return {
        ...planData,
        chaptersPerDay: 0, // 시간 기반에서는 의미없음
        minutesPerDay: planData.calculatedMinutesPerDay,
        targetDate: planData.endDate,
        // 기존 시스템에서 사용하던 필드들 유지
        planName: planData.planName,
        currentDay: getCurrentDay(planData),
        readChapters: planData.readChapters
    };
};

// 기존 saveBiblePlanData 대체
export const saveBiblePlanData = (planData: any): void => {
    if (validateTimeBasedPlan(planData)) {
        saveTimeBasedBiblePlan(planData as TimeBasedBiblePlan);
    } else {
        console.warn('⚠️ 유효하지 않은 계획 데이터, 저장하지 않음');
    }
};

// 기존 deleteBiblePlanData 대체
export const deleteBiblePlanData = (): void => {
    deleteTimeBasedBiblePlan();
};

// 기존 calculateProgress 대체
export const calculateProgress = (planData?: any): {
    progressPercentage: number;
    readChapters: number;
    totalChapters: number;
} => {
    const plan = planData || loadExistingBiblePlan();

    if (!plan || !validateTimeBasedPlan(plan)) {
        return {
            progressPercentage: 0,
            readChapters: 0,
            totalChapters: 0
        };
    }

    const progress = calculateTimeBasedProgress(plan);
    return {
        progressPercentage: progress.progressPercentage,
        readChapters: progress.readChapters,
        totalChapters: progress.totalChapters
    };
};

// 기존 calculateMissedChapters 함수 대체 (호환성)
export const calculateMissedChapters = (planData?: any): number => {
    const plan = planData || loadExistingBiblePlan();

    if (!plan || !validateTimeBasedPlan(plan)) {
        return 0;
    }

    return calculateTimeBasedMissedChapters(plan);
};

// 기존 formatDate 그대로 사용
export { formatDate } from './timeBasedBibleSystem';

// === 9. UI 컴포넌트용 헬퍼 함수들 ===

/**
 * 🔥 읽기 화면에서 사용할 장 목록 생성
 */
export function getChapterListForReading(planType: string): {
    bookIndex: number;
    bookName: string;
    chapters: {
        chapter: number;
        status: 'today' | 'past' | 'future' | 'completed' | 'missed';
        isRead: boolean;
        estimatedMinutes: number;
        scheduledDate?: string;
        displayTime: string;
    }[];
}[] {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return [];
    }

    const result: any[] = [];
    const bookRange = getBookRangeForPlan(planType);

    // BibleStep에서 책 정보 가져오기
    const BibleStep = getBibleStepData();

    for (let bookIndex = bookRange.start; bookIndex <= bookRange.end; bookIndex++) {
        const bookInfo = BibleStep.find(step => step.index === bookIndex);
        if (!bookInfo) continue;

        const chapters: any[] = [];

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            const chapterStatus = getBibleChapterStatus(bookIndex, chapter);

            chapters.push({
                chapter,
                status: chapterStatus.status,
                isRead: chapterStatus.isRead,
                estimatedMinutes: chapterStatus.estimatedMinutes || 0,
                scheduledDate: chapterStatus.scheduledDate,
                displayTime: formatReadingTime(chapterStatus.estimatedMinutes || 0)
            });
        }

        result.push({
            bookIndex,
            bookName: bookInfo.name,
            chapters
        });
    }

    return result;
}

/**
 * 🔥 설정 화면에서 사용할 계획 요약 정보
 */
export function getPlanSummaryForSettings(): {
    hasPlan: boolean;
    planName?: string;
    startDate?: string;
    endDate?: string;
    totalDays?: number;
    currentDay?: number;
    dailyTargetTime?: number;
    progressPercentage?: number;
    formattedDailyTime?: string;
    formattedProgress?: string;
    daysRemaining?: number;
} {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return {
            hasPlan: false
        };
    }

    const currentDay = getCurrentDay(planData);
    const progress = calculateTimeBasedProgress(planData);
    const daysRemaining = Math.max(0, planData.totalDays - currentDay + 1);

    return {
        hasPlan: true,
        planName: planData.planName,
        startDate: planData.startDate,
        endDate: planData.endDate,
        totalDays: planData.totalDays,
        currentDay,
        dailyTargetTime: planData.calculatedMinutesPerDay,
        progressPercentage: progress.progressPercentage,
        formattedDailyTime: formatReadingTime(planData.calculatedMinutesPerDay),
        formattedProgress: `${progress.readChapters}/${progress.totalChapters}장 (${formatReadingTime(progress.readTime)}/${formatReadingTime(progress.totalTime)})`,
        daysRemaining
    };
}

/**
 * 🔥 오늘의 읽기 현황 요약
 */
export function getTodayReadingSummary(): {
    hasSchedule: boolean;
    totalChapters?: number;
    completedChapters?: number;
    remainingChapters?: number;
    totalTime?: number;
    completedTime?: number;
    remainingTime?: number;
    progressPercentage?: number;
    chapters?: {
        bookName: string;
        chapter: number;
        isRead: boolean;
        estimatedMinutes: number;
        displayText: string;
    }[];
    motivationalMessage?: string;
} {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return {
            hasSchedule: false
        };
    }

    const currentDay = getCurrentDay(planData);
    const dailyReading = getDailyReading(planData, currentDay);

    if (!dailyReading) {
        return {
            hasSchedule: false
        };
    }

    const completedChapters = dailyReading.chapters.filter(ch => ch.isRead).length;
    const completedTime = dailyReading.chapters
        .filter(ch => ch.isRead)
        .reduce((sum, ch) => sum + ch.estimatedMinutes, 0);

    const progressPercentage = dailyReading.chapters.length > 0
        ? Math.round((completedChapters / dailyReading.chapters.length) * 100)
        : 0;

    return {
        hasSchedule: true,
        totalChapters: dailyReading.chapters.length,
        completedChapters,
        remainingChapters: dailyReading.chapters.length - completedChapters,
        totalTime: dailyReading.totalMinutes,
        completedTime: Math.round(completedTime * 10) / 10,
        remainingTime: Math.round((dailyReading.totalMinutes - completedTime) * 10) / 10,
        progressPercentage,
        chapters: dailyReading.chapters.map(ch => ({
            bookName: ch.bookName,
            chapter: ch.chapter,
            isRead: ch.isRead,
            estimatedMinutes: ch.estimatedMinutes,
            displayText: `${ch.bookName} ${ch.chapter}장 (${formatReadingTime(ch.estimatedMinutes)})`
        })),
        motivationalMessage: getMotivationalMessage(planData)
    };
}

// === 10. 내부 헬퍼 함수들 ===

/**
 * 계획별 성경 범위 반환
 */
function getBookRangeForPlan(planType: string): { start: number; end: number } {
    switch (planType) {
        case 'full_bible': return { start: 1, end: 66 };
        case 'old_testament': return { start: 1, end: 39 };
        case 'new_testament': return { start: 40, end: 66 };
        case 'pentateuch': return { start: 1, end: 5 };
        case 'psalms': return { start: 19, end: 19 };
        default: return { start: 1, end: 66 };
    }
}

/**
 * BibleStep 데이터 (실제 구현에서는 define.ts에서 import)
 */
function getBibleStepData() {
    return [
        { count: 50, index: 1, name: '창세기' },
        { count: 40, index: 2, name: '출애굽기' },
        { count: 27, index: 3, name: '레위기' },
        { count: 36, index: 4, name: '민수기' },
        { count: 34, index: 5, name: '신명기' },
        { count: 24, index: 6, name: '여호수아' },
        { count: 21, index: 7, name: '사사기' },
        { count: 4, index: 8, name: '룻기' },
        { count: 31, index: 9, name: '사무엘상' },
        { count: 24, index: 10, name: '사무엘하' },
        { count: 22, index: 11, name: '열왕기상' },
        { count: 25, index: 12, name: '열왕기하' },
        { count: 29, index: 13, name: '역대기상' },
        { count: 36, index: 14, name: '역대기하' },
        { count: 10, index: 15, name: '에스라' },
        { count: 13, index: 16, name: '느헤미야' },
        { count: 10, index: 17, name: '에스더' },
        { count: 42, index: 18, name: '욥기' },
        { count: 150, index: 19, name: '시편' },
        { count: 31, index: 20, name: '잠언' },
        { count: 12, index: 21, name: '전도서' },
        { count: 8, index: 22, name: '아가' },
        { count: 66, index: 23, name: '이사야' },
        { count: 52, index: 24, name: '예레미야' },
        { count: 5, index: 25, name: '예레미야 애가' },
        { count: 48, index: 26, name: '에스겔' },
        { count: 12, index: 27, name: '다니엘' },
        { count: 14, index: 28, name: '호세아' },
        { count: 3, index: 29, name: '요엘' },
        { count: 9, index: 30, name: '아모스' },
        { count: 1, index: 31, name: '오바댜' },
        { count: 4, index: 32, name: '요나' },
        { count: 7, index: 33, name: '미가' },
        { count: 3, index: 34, name: '나훔' },
        { count: 3, index: 35, name: '하박국' },
        { count: 3, index: 36, name: '스바냐' },
        { count: 2, index: 37, name: '학개' },
        { count: 14, index: 38, name: '스가랴' },
        { count: 4, index: 39, name: '말라기' },
        { count: 28, index: 40, name: '마태복음' },
        { count: 16, index: 41, name: '마가복음' },
        { count: 24, index: 42, name: '누가복음' },
        { count: 21, index: 43, name: '요한복음' },
        { count: 28, index: 44, name: '사도행전' },
        { count: 16, index: 45, name: '로마서' },
        { count: 16, index: 46, name: '고린도전서' },
        { count: 13, index: 47, name: '고린도후서' },
        { count: 6, index: 48, name: '갈라디아서' },
        { count: 6, index: 49, name: '에베소서' },
        { count: 4, index: 50, name: '빌립보서' },
        { count: 4, index: 51, name: '골로새서' },
        { count: 5, index: 52, name: '데살로니가전서' },
        { count: 3, index: 53, name: '데살로니가후서' },
        { count: 6, index: 54, name: '디모데전서' },
        { count: 4, index: 55, name: '디모데후서' },
        { count: 3, index: 56, name: '디도서' },
        { count: 1, index: 57, name: '빌레몬서' },
        { count: 13, index: 58, name: '히브리서' },
        { count: 5, index: 59, name: '야고보서' },
        { count: 5, index: 60, name: '베드로전서' },
        { count: 3, index: 61, name: '베드로후서' },
        { count: 5, index: 62, name: '요한일서' },
        { count: 1, index: 63, name: '요한이서' },
        { count: 1, index: 64, name: '요한삼서' },
        { count: 1, index: 65, name: '유다서' }
    ];
}