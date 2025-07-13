// src/utils/biblePlanIntegration.ts
// 🔥 시간 기반 시스템과 기존 시스템 통합

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
    getChapterReadingTime
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

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
        return {
            isValid: false,
            errorMessage: '최소 7일 이상의 기간을 설정해주세요.'
        };
    }

    try {
        // 🔥 시간 기반 계획 생성해서 미리보기 정보 계산
        const previewPlan = divideChaptersByPeriod(formData.planType, formData.startDate, formData.endDate);

        // 예시 며칠치 데이터 생성
        const exampleDays = [];
        for (let day = 1; day <= Math.min(3, previewPlan.totalDays); day++) {
            const dailyReading = getDailyReading(previewPlan, day);
            if (dailyReading) {
                const planDate = new Date(formData.startDate);
                planDate.setDate(planDate.getDate() + (day - 1));

                exampleDays.push({
                    day,
                    date: formatDate(planDate.toISOString()),
                    chapters: dailyReading.chapters.map(ch => `${ch.bookName} ${ch.chapter}장`),
                    totalMinutes: dailyReading.totalMinutes,
                    formattedTime: formatReadingTime(dailyReading.totalMinutes)
                });
            }
        }

        return {
            isValid: true,
            preview: {
                totalDays: previewPlan.totalDays,
                totalMinutes: previewPlan.totalMinutes,
                calculatedMinutesPerDay: previewPlan.calculatedMinutesPerDay,
                totalChapters: previewPlan.totalChapters,
                formattedDailyTime: formatReadingTime(previewPlan.calculatedMinutesPerDay),
                formattedTotalTime: formatReadingTime(previewPlan.totalMinutes),
                progressIndicator: '🌱 시작이 반!',
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
            creationMethod: 'time_based',
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

// === 3. 기존 reading/index.tsx 연동 함수 ===

/**
 * 🔥 메뉴 리스트 업데이트 함수
 */
export function updateMenuForPeriodBasedPlan(planData: TimeBasedBiblePlan): string[] {
    if (!planData?.isTimeBasedCalculation) {
        return ["구약", "신약", "설정"];
    }

    let menuList: string[] = [];

    switch (planData.planType) {
        case 'full_bible':
            menuList = ["성경", "진도"];
            break;
        case 'old_testament':
            menuList = ["구약", "진도"];
            break;
        case 'new_testament':
            menuList = ["신약", "진도"];
            break;
        case 'pentateuch':
            menuList = ["모세오경", "진도"];
            break;
        case 'psalms':
            menuList = ["시편", "진도"];
            break;
        default:
            menuList = ["성경", "진도"];
    }

    return menuList;
}

/**
 * 🔥 진도 탭 컴포넌트에서 사용할 완전한 데이터
 */
export function getProgressTabData(planData: TimeBasedBiblePlan): {
    currentDayReading: any;
    todayChapters: any[];
    progressInfo: any;
    weeklySchedule: any[];
    planSummary: any;
    motivationalMessage: string;
    readingStreak: number;
} {
    if (!planData?.isTimeBasedCalculation) {
        return {
            currentDayReading: null,
            todayChapters: [],
            progressInfo: {},
            weeklySchedule: [],
            planSummary: {},
            motivationalMessage: '',
            readingStreak: 0
        };
    }

    const currentDay = getCurrentDay(planData.startDate);
    const currentDayReading = getDailyReading(planData, currentDay);
    const todayChapters = getTodayChapters(planData);
    const progressInfo = calculatePeriodBasedProgress(planData);

    // 🔥 일주일치 스케줄 생성
    const weeklySchedule = [];
    for (let i = 0; i < 7; i++) {
        const day = Math.max(1, currentDay + i);
        const dailyReading = getDailyReading(planData, day);

        if (dailyReading && day <= planData.totalDays) {
            const dayProgress = dailyReading.chapters.filter(ch => ch.isRead).length;
            const planDate = new Date(planData.startDate);
            planDate.setDate(planDate.getDate() + (day - 1));

            weeklySchedule.push({
                day,
                date: formatDate(planDate.toISOString()),
                chapters: dailyReading.chapters.map(ch => `${ch.bookName} ${ch.chapter}장`),
                totalMinutes: dailyReading.totalMinutes,
                formattedTime: formatReadingTime(dailyReading.totalMinutes),
                completedChapters: dayProgress,
                totalChapters: dailyReading.chapters.length,
                progressPercentage: dailyReading.chapters.length > 0 ?
                    Math.round((dayProgress / dailyReading.chapters.length) * 100) : 0,
                isToday: i === 0,
                isPast: day < currentDay,
                isFuture: day > currentDay,
                isCompleted: dailyReading.isCompleted
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
        calculatedMinutesPerDay: planData.calculatedMinutesPerDay,
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

// === 5. 기존 시스템 호환 함수들 ===

/**
 * 🔥 기존 calculateProgress 함수 대체
 */
export function calculateProgress(planData: any): any {
    if (!planData) return {
        totalChapters: 0,
        readChapters: 0,
        progressPercentage: 0,
        currentDay: 1,
        missedChapters: 0
    };

    if (planData.isTimeBasedCalculation) {
        const progress = calculatePeriodBasedProgress(planData);
        return {
            ...progress,
            formattedReadTime: formatReadingTime(progress.readMinutes),
            formattedTotalTime: formatReadingTime(progress.totalMinutes),
            progressIndicator: getProgressIndicator(progress.progressPercentage),
            missedChapters: calculateMissedChapters(planData)
        };
    }

    return calculateLegacyProgress(planData);
}

/**
 * 🔥 기존 getTodayChapters 함수 대체
 */
export const getTodayChaptersCompat = (planData: any) => {
    if (!planData) return [];

    // 시간 기반 계획인지 확인
    if (planData.isTimeBasedCalculation) {
        return getTodayChapters(planData);
    }

    // 기존 장 기반 로직
    return getLegacyTodayChapters(planData);
};

/**
 * 🔥 기존 markChapterAsRead 함수 대체
 */
export const markChapterAsReadCompat = (
    planData: any,
    bookName: string,
    chapter: number
) => {
    if (!planData) return planData;

    if (planData.isTimeBasedCalculation) {
        return handleChapterRead(planData, bookName, chapter);
    }

    return handleLegacyChapterRead(planData, bookName, chapter);
};

// === 6. 데이터 저장/로드 함수들 ===

function loadExistingBiblePlan(): TimeBasedBiblePlan | null {
    try {
        const stored = defaultStorage.getString('bible_reading_plan');
        if (stored) {
            const plan = JSON.parse(stored);

            // 데이터 무결성 검증
            if (validatePlanData(plan)) {
                return plan;
            } else {
                console.warn('⚠️ 저장된 계획 데이터가 유효하지 않음');
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error('계획 로드 오류:', error);
        return null;
    }
}

function saveBiblePlan(planData: TimeBasedBiblePlan): void {
    try {
        if (!validatePlanData(planData)) {
            throw new Error('유효하지 않은 계획 데이터');
        }

        defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
        console.log('💾 시간 기반 계획 저장 완료');

        // 백업 저장 (선택사항)
        const backupKey = `biblePlan_backup_${new Date().toISOString().split('T')[0]}`;
        defaultStorage.set(backupKey, JSON.stringify(planData));

    } catch (error) {
        console.error('❌ 계획 저장 실패:', error);
    }
}

// === 7. 헬퍼 함수들 ===

function generateMotivationalMessage(progressInfo: any): string {
    const { progressPercentage, isOnTrack, daysRemaining } = progressInfo;

    if (progressPercentage >= 90) {
        return '🎉 거의 다 왔어요! 마지막까지 화이팅!';
    } else if (progressPercentage >= 75) {
        return '🔥 정말 잘하고 계세요! 꾸준히 이어가세요!';
    } else if (progressPercentage >= 50) {
        return '💪 중간 지점을 넘었어요! 계속 진행해주세요!';
    } else if (progressPercentage >= 25) {
        return '📚 좋은 시작이에요! 꾸준함이 핵심입니다!';
    } else if (isOnTrack) {
        return '🌱 계획대로 잘 진행되고 있어요!';
    } else {
        return '💙 천천히라도 꾸준히 하는 것이 중요해요!';
    }
}

function calculateReadingStreak(planData: TimeBasedBiblePlan): number {
    if (!planData.readChapters.length) return 0;

    // 최근 읽은 날짜들을 정렬
    const readDates = planData.readChapters
        .filter(r => r.isRead)
        .map(r => new Date(r.date).toDateString())
        .filter((date, index, array) => array.indexOf(date) === index) // 중복 제거
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // 최신순 정렬

    if (readDates.length === 0) return 0;

    let streak = 1;
    let currentDate = new Date(readDates[0]);

    for (let i = 1; i < readDates.length; i++) {
        const previousDate = new Date(readDates[i]);
        const diffTime = currentDate.getTime() - previousDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
            currentDate = previousDate;
        } else {
            break;
        }
    }

    return streak;
}

function calculateMissedChapters(planData: TimeBasedBiblePlan): number {
    const currentDay = getCurrentDay(planData.startDate);
    const progress = calculatePeriodBasedProgress(planData);

    // 현재까지 읽어야 할 시간 기준으로 놓친 정도 계산
    const shouldReadMinutes = Math.min(currentDay, planData.totalDays) * planData.calculatedMinutesPerDay;
    const actualReadMinutes = progress.readMinutes;

    if (shouldReadMinutes <= actualReadMinutes) return 0;

    // 놓친 시간을 대략적인 장수로 변환 (평균 4분/장 기준)
    const missedMinutes = shouldReadMinutes - actualReadMinutes;
    return Math.round(missedMinutes / 4);
}

// === 8. 기존 시스템 호환을 위한 더미 함수들 ===

function handleLegacyChapterRead(planData: any, bookName: string, chapter: number): any {
    console.warn('⚠️ 기존 방식의 장 읽기 완료 처리');
    return planData;
}

function calculateLegacyProgress(planData: any): any {
    console.warn('⚠️ 기존 방식의 진행률 계산');
    return {
        totalChapters: 0,
        readChapters: 0,
        progressPercentage: 0,
        currentDay: 1,
        missedChapters: 0
    };
}

function getLegacyTodayChapters(planData: any): any[] {
    console.warn('⚠️ 기존 방식의 오늘 읽을 장 조회');
    return [];
}

// === 9. 타입 내보내기 ===

export type {
    TimeBasedBiblePlan,
    BiblePlanFormData
};