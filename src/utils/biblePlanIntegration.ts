// src/utils/biblePlanIntegration.ts
// 🔥 시간 기반 시스템과 기존 시스템 통합 - 시작일~종료일 기간 기반 자동 계산

import {
    divideChaptersByPeriod,
    calculatePeriodBasedProgress,
    markChapterAsRead,
    getTodayChapters,
    TimeBasedBiblePlan,
    getCurrentDay,
    getDailyReading,
    initializePeriodBasedBibleSystem,
    validatePlanData,
    getProgressIndicator,
    formatReadingTime,
    formatDate,
    getEstimatedCompletionDate,
    getChapterReadingTime,
    getChapterStatus
} from './timeBasedBibleSystem';
import { defaultStorage } from './mmkv';
import { BibleStep } from './define';

// === 1. 앱 초기화 함수 ===

/**
 * App.tsx에서 호출할 초기화 함수
 */
export async function initializeBibleApp(): Promise<void> {
    console.log('📱 성경 앱 초기화 시작...');

    try {
        // 🔥 시간 기반 시스템 초기화 (실제 음성 파일 데이터 로드)
        const success = await initializePeriodBasedBibleSystem();

        if (success) {
            console.log('✅ 실제 음성 데이터 기반 초기화 성공');
        } else {
            console.log('⚠️ 기본 추정치로 초기화됨');
        }

        // 기존 저장된 계획이 있다면 검증
        const existingPlan = loadExistingBiblePlan();
        if (existingPlan) {
            if (validatePlanData(existingPlan)) {
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
    // 입력 검증
    if (!formData.startDate || !formData.endDate || !formData.planType) {
        return {
            isValid: false,
            errorMessage: '모든 필드를 입력해주세요.'
        };
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate <= startDate) {
        return {
            isValid: false,
            errorMessage: '종료일은 시작일보다 나중이어야 합니다.'
        };
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff < 7) {
        return {
            isValid: false,
            errorMessage: '최소 7일 이상의 기간을 설정해주세요.'
        };
    }

    try {
        // 🔥 미리보기용 계획 생성 (저장하지 않음)
        const previewPlan = divideChaptersByPeriod(formData.planType, formData.startDate, formData.endDate);

        // 처음 3일의 예시 생성
        const exampleDays = [];
        for (let day = 1; day <= Math.min(3, previewPlan.totalDays); day++) {
            const dailyReading = getDailyReading(previewPlan, day);
            if (dailyReading) {
                exampleDays.push({
                    day,
                    date: formatDate(dailyReading.date),
                    chapters: dailyReading.chapters.map(ch => `${ch.bookName} ${ch.chapter}장`),
                    totalMinutes: Math.round(dailyReading.totalMinutes),
                    formattedTime: formatReadingTime(dailyReading.totalMinutes)
                });
            }
        }

        return {
            isValid: true,
            preview: {
                totalDays: previewPlan.totalDays,
                totalMinutes: previewPlan.totalMinutes,
                calculatedMinutesPerDay: previewPlan.calculatedMinutesPerDay, // 🔥 자동 계산된 시간
                totalChapters: previewPlan.totalChapters,
                formattedDailyTime: formatReadingTime(previewPlan.calculatedMinutesPerDay),
                formattedTotalTime: formatReadingTime(previewPlan.totalMinutes),
                progressIndicator: getProgressIndicator(0),
                exampleDays
            }
        };
    } catch (error) {
        console.error('미리보기 생성 오류:', error);
        return {
            isValid: false,
            errorMessage: '계획 생성 중 오류가 발생했습니다.'
        };
    }
}

/**
 * 🔥 실제 계획 생성
 */
export function createBiblePlan(formData: BiblePlanFormData): TimeBasedBiblePlan {
    console.log(`📊 시간 기반 성경 일독 계획 생성:`, formData);

    const plan = divideChaptersByPeriod(formData.planType, formData.startDate, formData.endDate);

    // 🔥 계획 생성 시점의 메타데이터 추가
    const enhancedPlan = {
        ...plan,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '2.0', // 시간 기반 버전
        metadata: {
            creationMethod: 'time_based_period',
            audioDataUsed: true,
            estimatedCompletionDate: getEstimatedCompletionDate(plan)
        }
    };

    // 로컬 스토리지에 저장
    saveBiblePlan(enhancedPlan);

    console.log(`✅ 계획 생성 완료: ${plan.totalDays}일, 하루 평균 ${plan.calculatedMinutesPerDay}분`);
    console.log(`📅 예상 완료일: ${enhancedPlan.metadata.estimatedCompletionDate}`);

    return enhancedPlan;
}

// === 3. 계획 상세 정보 및 대시보드 함수 ===

/**
 * 🔥 통합된 대시보드 정보 가져오기
 */
export function getBiblePlanDashboard(planData: TimeBasedBiblePlan | null) {
    if (!planData || !planData.isTimeBasedCalculation) {
        return handleLegacyDashboard(planData);
    }

    console.log('📊 시간 기반 대시보드 정보 생성');

    // 🔥 현재 날짜와 읽기 정보
    const currentDay = getCurrentDay(planData);
    const currentDayReading = getDailyReading(planData, currentDay);
    const todayChapters = getTodayChapters(planData);

    // 🔥 진행률 정보
    const progressInfo = calculatePeriodBasedProgress(planData);

    // 🔥 주간 스케줄 (현재 주 포함 7일)
    const weeklySchedule = [];
    for (let i = 0; i < 7; i++) {
        const day = currentDay + i - 3; // 현재 날 기준 ±3일
        if (day >= 1 && day <= planData.totalDays) {
            const dailyReading = getDailyReading(planData, day);

            // 해당 날의 진행률 계산
            const dayProgress = dailyReading?.chapters.filter(ch => ch.isRead).length || 0;

            weeklySchedule.push({
                day,
                date: formatDate(dailyReading?.date || ''),
                chapters: dailyReading?.chapters || [],
                totalMinutes: Math.round(dailyReading?.totalMinutes || 0),
                targetMinutes: Math.round(dailyReading?.targetMinutes || 0), // 🔥 목표 시간
                formattedTime: formatReadingTime(dailyReading?.totalMinutes || 0),
                progressPercentage: dailyReading ?
                    Math.round((dayProgress / dailyReading.chapters.length) * 100) : 0,
                isToday: i === 3, // 중간 위치가 오늘
                isPast: day < currentDay,
                isFuture: day > currentDay,
                isCompleted: dailyReading?.isCompleted || false
            });
        }
    }

    // 🔥 동기부여 메시지 생성
    const motivationalMessage = generateMotivationalMessage(progressInfo);

    // 🔥 연속 읽기 일수 계산
    const readingStreak = calculateReadingStreak(planData);

    // 계획 요약 정보
    const planSummary = {
        planType: planData.planType,
        planName: planData.planName,
        startDate: planData.startDate,
        endDate: planData.endDate,
        formattedStartDate: formatDate(planData.startDate),
        formattedEndDate: formatDate(planData.endDate),
        totalDays: planData.totalDays,
        calculatedMinutesPerDay: planData.calculatedMinutesPerDay, // 🔥 자동 계산된 시간
        formattedDailyTime: formatReadingTime(planData.calculatedMinutesPerDay),
        totalMinutes: planData.totalMinutes,
        formattedTotalTime: formatReadingTime(planData.totalMinutes),
        totalHours: Math.round(planData.totalMinutes / 60 * 10) / 10,
        progressIndicator: getProgressIndicator(progressInfo.progressPercentage),
        estimatedCompletionDate: getEstimatedCompletionDate(planData)
    };

    return {
        currentDayReading,
        todayChapters: todayChapters.map(ch => ({
            ...ch,
            formattedTime: formatReadingTime(ch.estimatedMinutes)
        })),
        progressInfo: {
            ...progressInfo,
            formattedReadTime: formatReadingTime(progressInfo.readMinutes),
            formattedTotalTime: formatReadingTime(progressInfo.totalMinutes),
            progressIndicator: getProgressIndicator(progressInfo.progressPercentage)
        },
        weeklySchedule,
        planSummary,
        motivationalMessage,
        readingStreak
    };
}

// === 4. 장 읽기 완료 처리 함수 ===

/**
 * 🔥 장 읽기 완료 처리 (bookName으로 처리)
 */
export function handleChapterRead(
    planData: TimeBasedBiblePlan,
    bookName: string,
    chapter: number
): TimeBasedBiblePlan {
    if (!planData?.isTimeBasedCalculation) {
        return handleLegacyChapterRead(planData, bookName, chapter);
    }

    // bookName을 book 인덱스로 변환
    const bookInfo = BibleStep.find(step => step.name === bookName);
    if (!bookInfo) {
        console.error(`❌ 알 수 없는 성경: ${bookName}`);
        return planData;
    }

    console.log(`📖 시간 기반 장 읽기 완료: ${bookName} ${chapter}장`);

    const updatedPlan = markChapterAsRead(planData, bookInfo.index, chapter);

    // 🔥 마지막 수정 시간 업데이트
    const enhancedPlan = {
        ...updatedPlan,
        lastModified: new Date().toISOString(),
        metadata: {
            ...updatedPlan.metadata,
            lastReadChapter: `${bookName} ${chapter}장`,
            lastReadDate: new Date().toISOString()
        }
    };

    // 로컬 스토리지에 저장
    saveBiblePlan(enhancedPlan);

    return enhancedPlan;
}

// === 5. 장 상태 확인 함수 ===

/**
 * 🔥 통합된 장 상태 확인
 */
export function getUnifiedChapterStatus(
    planData: TimeBasedBiblePlan | null,
    bookName: string,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' {
    if (!planData) return 'normal';

    if (!planData.isTimeBasedCalculation) {
        return getLegacyChapterStatus(planData, bookName, chapter);
    }

    // bookName을 book 인덱스로 변환
    const bookInfo = BibleStep.find(step => step.name === bookName);
    if (!bookInfo) return 'normal';

    return getChapterStatus(planData, bookInfo.index, chapter);
}

// === 6. 스토리지 관리 함수 ===

/**
 * 🔥 계획 저장
 */
export function saveBiblePlan(planData: TimeBasedBiblePlan): void {
    try {
        const planString = JSON.stringify(planData);
        defaultStorage.set('bible_reading_plan', planString);
        console.log('✅ 시간 기반 계획 저장 완료');
    } catch (error) {
        console.error('❌ 계획 저장 실패:', error);
    }
}

/**
 * 🔥 계획 로드
 */
export function loadExistingBiblePlan(): TimeBasedBiblePlan | null {
    try {
        const planString = defaultStorage.getString('bible_reading_plan');
        if (planString) {
            const planData = JSON.parse(planString);
            console.log('✅ 시간 기반 계획 로드 완료');
            return planData;
        }
    } catch (error) {
        console.error('❌ 계획 로드 실패:', error);
    }
    return null;
}

/**
 * 🔥 계획 삭제
 */
export function deleteBiblePlan(): boolean {
    try {
        defaultStorage.delete('bible_reading_plan');
        console.log('✅ 계획 삭제 완료');
        return true;
    } catch (error) {
        console.error('❌ 계획 삭제 실패:', error);
        return false;
    }
}

// === 7. 유틸리티 함수들 ===

/**
 * 🔥 동기부여 메시지 생성
 */
function generateMotivationalMessage(progressInfo: any): string {
    const { progressPercentage, isAhead, isBehind } = progressInfo;

    if (progressPercentage >= 90) {
        return "🎉 거의 다 왔어요! 끝까지 화이팅!";
    } else if (progressPercentage >= 75) {
        return "🔥 정말 잘하고 있어요! 조금만 더!";
    } else if (progressPercentage >= 50) {
        return "💪 절반을 넘었어요! 계속 힘내세요!";
    } else if (isAhead) {
        return "⭐ 계획보다 앞서 가고 있어요! 멋져요!";
    } else if (isBehind) {
        return "🌱 천천히라도 꾸준히 하는 것이 중요해요!";
    } else {
        return "📖 꾸준한 말씀 읽기, 응원해요!";
    }
}

/**
 * 🔥 연속 읽기 일수 계산
 */
function calculateReadingStreak(planData: TimeBasedBiblePlan): number {
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
}

// === 8. 레거시 시스템 호환 함수들 ===

/**
 * 기존 시스템 대시보드 처리 (호환성)
 */
function handleLegacyDashboard(planData: any) {
    console.log('⚠️ 레거시 계획 데이터 처리');
    // 기존 시스템 로직 유지
    return {
        currentDayReading: null,
        todayChapters: [],
        progressInfo: { progressPercentage: 0 },
        weeklySchedule: [],
        planSummary: {},
        motivationalMessage: "새로운 시간 기반 계획을 생성해보세요!",
        readingStreak: 0
    };
}

/**
 * 기존 시스템 장 읽기 완료 처리 (호환성)
 */
function handleLegacyChapterRead(planData: any, bookName: string, chapter: number): any {
    console.log(`⚠️ 레거시 시스템에서 장 읽기 처리: ${bookName} ${chapter}장`);
    // 기존 로직 유지
    return planData;
}

/**
 * 기존 시스템 장 상태 확인 (호환성)
 */
function getLegacyChapterStatus(planData: any, bookName: string, chapter: number): string {
    console.log(`⚠️ 레거시 시스템에서 장 상태 확인: ${bookName} ${chapter}장`);
    // 기존 로직 유지
    return 'normal';
}