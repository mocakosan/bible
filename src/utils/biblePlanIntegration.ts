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
import { DETAILED_BIBLE_PLAN_TYPES } from './biblePlanCalculator';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

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
        // 날짜 유효성 검증
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);

        if (end < start) {
            return {
                success: false,
                errorMessage: '종료일이 시작일보다 빠릅니다.'
            };
        }

        // 시간 기반 계획 생성
        const planData = createTimeBasedBiblePlan(
            formData.planType,
            formData.startDate,
            formData.endDate
        );

        // 계획 저장
        saveTimeBasedBiblePlan(planData);

        console.log('✅ 시간 기반 성경일독 계획 생성 및 저장 완료');

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

// === 3. 계획 조회 함수 ===

/**
 * 🔥 현재 계획 상태 및 오늘의 읽기 정보 가져오기
 */
export function getCurrentBiblePlanStatus(): {
    hasPlan: boolean;
    planData?: TimeBasedBiblePlan;
    currentDayReading?: DailyReading;
    todayChapters?: ReadChapterStatus[];
    progressInfo?: ReturnType<typeof calculateTimeBasedProgress>;
    weeklySchedule?: DailyReading[];
    planSummary?: {
        planName: string;
        totalDays: number;
        currentDay: number;
        dailyTargetTime: number;
        estimatedCompletionDate: string;
        formattedDailyTime: string;
        formattedTotalTime: string;
    };
    motivationalMessage?: string;
    readingStreak?: number;
    missedChapters?: number;
} {
    const planData = loadExistingBiblePlan();

    if (!planData || !validateTimeBasedPlan(planData)) {
        return {
            hasPlan: false
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

// === 7. 기존 UI와의 호환성 함수들 ===

/**
 * 🔥 기존 calculateReadingPlan 함수 대체
 */
export function calculateReadingPlan(
    planTypeId: string,
    startDate: Date,
    endDate: Date
): {
    totalDays: number;
    chaptersPerDay: number;
    minutesPerDay: number;
} | null {
    try {
        const preview = generatePlanPreview(
            planTypeId,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        if (!preview.isValid || !preview.preview) {
            return null;
        }

        const avgChaptersPerDay = Math.ceil(preview.preview.totalChapters / preview.preview.totalDays);

        return {
            totalDays: preview.preview.totalDays,
            chaptersPerDay: avgChaptersPerDay,
            minutesPerDay: Math.round(preview.preview.calculatedMinutesPerDay)
        };

    } catch (error) {
        console.error('❌ 계획 계산 실패:', error);
        return null;
    }
}

/**
 * 🔥 기존 calculateProgress 함수 대체
 */
export function calculateProgress(planData: any): {
    readChapters: number;
    totalChapters: number;
    progressPercentage: number;
} {
    if (validateTimeBasedPlan(planData)) {
        const progress = calculateTimeBasedProgress(planData);
        return {
            readChapters: progress.readChapters,
            totalChapters: progress.totalChapters,
            progressPercentage: progress.progressPercentage
        };
    }

    // 기존 방식 fallback
    const readChapters = planData.readChapters?.filter((r: any) => r.isRead).length || 0;
    const totalChapters = planData.totalChapters || 1189;

    return {
        readChapters,
        totalChapters,
        progressPercentage: (readChapters / totalChapters) * 100
    };
}

/**
 * 🔥 오늘 읽어야 할 장 수 계산 (UI 표시용)
 */
export function getTodayChapterCount(planData: TimeBasedBiblePlan): number {
    const todayChapters = getTodayChapters(planData);
    return todayChapters.length;
}

/**
 * 🔥 계획 요약 정보 가져오기 (기존 UI 호환)
 */
export function getPlanSummaryForUI(planData: TimeBasedBiblePlan): {
    planName: string;
    totalDays: number;
    currentDay: number;
    chaptersPerDay: number;
    minutesPerDay: number;
    progressPercentage: number;
    missedChapters: number;
} {
    const progress = calculateTimeBasedProgress(planData);
    const missedChapters = calculateTimeBasedMissedChapters(planData);
    const currentDay = getCurrentDay(planData);

    return {
        planName: planData.planName,
        totalDays: planData.totalDays,
        currentDay,
        chaptersPerDay: planData.chaptersPerDay || Math.ceil(planData.totalChapters / planData.totalDays),
        minutesPerDay: Math.round(planData.calculatedMinutesPerDay),
        progressPercentage: progress.progressPercentage,
        missedChapters
    };
}

// === 8. 디버깅 및 테스트 함수 ===

/**
 * 🔥 현재 계획 정보 출력 (디버깅용)
 */
export function debugPrintCurrentPlan(): void {
    const status = getCurrentBiblePlanStatus();

    if (!status.hasPlan) {
        console.log('📭 현재 설정된 성경일독 계획이 없습니다.');
        return;
    }

    console.log('📋 현재 성경일독 계획:');
    console.log(`- 계획: ${status.planSummary?.planName}`);
    console.log(`- 기간: ${status.planData?.startDate} ~ ${status.planData?.endDate}`);
    console.log(`- 진행: ${status.planSummary?.currentDay}/${status.planSummary?.totalDays}일`);
    console.log(`- 하루 목표: ${status.planSummary?.formattedDailyTime}`);
    console.log(`- 진행률: ${status.progressInfo?.progressPercentage.toFixed(1)}%`);
    console.log(`- 놓친 장: ${status.missedChapters}장`);
    console.log(`- 연속 읽기: ${status.readingStreak}일`);
    console.log(`- ${status.motivationalMessage}`);
}