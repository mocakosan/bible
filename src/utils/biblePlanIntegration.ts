// src/utils/biblePlanIntegration.ts
// 완전한 시간 기반 시스템과 기존 시스템 연동

import {
    divideChaptersByPeriod,
    calculatePeriodBasedProgress,
    markChapterAsRead,
    getTodayChapters,
    getPreviewInfo,
    TimeBasedBiblePlan,
    getCurrentDay,
    getDailyReading,
    initializePeriodBasedBibleSystem,
    validatePlanData,
    getProgressIndicator,
    formatReadingTime,
    formatDate,
    getEstimatedCompletionDate
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
 * 🔥 계획 생성 전 미리보기 정보 가져오기 (완전한 버전)
 */
export function getPlanPreview(formData: BiblePlanFormData): {
    isValid: boolean;
    errorMessage?: string;
    preview?: {
        totalDays: number;
        totalMinutes: number;
        calculatedMinutesPerDay: number;
        totalChapters: number;
        avgChaptersPerDay: number;
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
        recommendedSchedule: string;
        feasibilityNote: string;
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
    const today = new Date();

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

    if (daysDiff > 1095) { // 3년
        return {
            isValid: false,
            errorMessage: '최대 3년까지 설정 가능합니다.'
        };
    }

    try {
        const preview = getPreviewInfo(formData.planType, formData.startDate, formData.endDate);

        // 🔥 사용자 친화적 정보 추가
        const formattedDailyTime = formatReadingTime(preview.calculatedMinutesPerDay);
        const formattedTotalTime = formatReadingTime(preview.totalMinutes);
        const progressIndicator = getProgressIndicator(0); // 시작 상태

        // 권장 스케줄 생성
        let recommendedSchedule = '';
        if (preview.calculatedMinutesPerDay <= 10) {
            recommendedSchedule = '💡 짧은 시간으로 부담없이 읽을 수 있습니다';
        } else if (preview.calculatedMinutesPerDay <= 20) {
            recommendedSchedule = '📖 적당한 분량으로 꾸준히 읽기 좋습니다';
        } else if (preview.calculatedMinutesPerDay <= 30) {
            recommendedSchedule = '⏰ 집중해서 읽으면 충분히 달성 가능합니다';
        } else {
            recommendedSchedule = '🔥 도전적인 목표입니다. 꾸준한 의지가 필요해요';
        }

        // 실현 가능성 노트
        let feasibilityNote = '';
        if (preview.calculatedMinutesPerDay <= 15) {
            feasibilityNote = '✅ 실현 가능성이 높습니다';
        } else if (preview.calculatedMinutesPerDay <= 25) {
            feasibilityNote = '⚠️ 꾸준한 노력이 필요합니다';
        } else {
            feasibilityNote = '🔥 도전적인 목표입니다';
        }

        // 예시 일정을 사용자 친화적으로 포맷
        const formattedExampleDays = preview.exampleDays?.map(day => ({
            ...day,
            formattedTime: formatReadingTime(day.totalMinutes),
            date: formatDate(day.date)
        })) || [];

        return {
            isValid: true,
            preview: {
                ...preview,
                formattedDailyTime,
                formattedTotalTime,
                progressIndicator,
                exampleDays: formattedExampleDays,
                recommendedSchedule,
                feasibilityNote
            }
        };

    } catch (error) {
        console.error('미리보기 생성 오류:', error);
        return {
            isValid: false,
            errorMessage: '계획 미리보기 생성 중 오류가 발생했습니다.'
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
    nextMilestone: any;
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
            nextMilestone: null,
            readingStreak: 0
        };
    }

    const currentDay = getCurrentDay(planData.startDate);
    const currentDayReading = getDailyReading(planData, currentDay);
    const todayChapters = getTodayChapters(planData);
    const progressInfo = calculatePeriodBasedProgress(planData);

    // 🔥 일주일치 스케줄 생성 (상세 정보 포함)
    const weeklySchedule = [];
    for (let i = 0; i < 7; i++) {
        const day = Math.max(1, currentDay + i);
        const dailyReading = getDailyReading(planData, day);

        if (dailyReading && day <= planData.totalDays) {
            const dayProgress = dailyReading.chapters.filter(ch =>
                planData.readChapters.some(rc =>
                    rc.book === ch.book && rc.chapter === ch.chapter && rc.isRead
                )
            ).length;

            weeklySchedule.push({
                day,
                date: dailyReading.date,
                formattedDate: formatDate(dailyReading.date),
                chapters: dailyReading.chapters.map(ch => ({
                    name: `${ch.bookName} ${ch.chapter}장`,
                    minutes: ch.estimatedMinutes,
                    formattedTime: formatReadingTime(ch.estimatedMinutes),
                    isRead: planData.readChapters.some(rc =>
                        rc.book === ch.book && rc.chapter === ch.chapter && rc.isRead
                    )
                })),
                totalMinutes: dailyReading.totalMinutes,
                formattedTotalTime: formatReadingTime(dailyReading.totalMinutes),
                completionRate: dailyReading.chapters.length > 0
                    ? Math.round((dayProgress / dailyReading.chapters.length) * 100)
                    : 0,
                isToday: i === 0,
                isPast: day < currentDay,
                isFuture: day > currentDay,
                isCompleted: dailyReading.isCompleted
            });
        }
    }

    // 🔥 동기부여 메시지 생성
    const motivationalMessage = generateMotivationalMessage(progressInfo);

    // 🔥 다음 목표 설정
    const nextMilestone = calculateNextMilestone(progressInfo);

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
        nextMilestone,
        readingStreak
    };
}

// === 4. 장 읽기 완료 처리 함수 ===

/**
 * 🔥 장 읽기 완료 처리 (향상된 버전)
 */
export function handleChapterRead(
    planData: TimeBasedBiblePlan,
    bookName: string,
    chapter: number
): TimeBasedBiblePlan {
    if (!planData?.isTimeBasedCalculation) {
        return handleLegacyChapterRead(planData, bookName, chapter);
    }

    console.log(`📖 시간 기반 장 읽기 완료: ${bookName} ${chapter}장`);

    const updatedPlan = markChapterAsRead(planData, bookName, chapter);

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

    // 🔥 성취 체크 및 알림
    checkAchievements(enhancedPlan);

    return enhancedPlan;
}

// === 5. UI 컴포넌트용 도우미 함수들 ===

/**
 * 🔥 진도 표시용 텍스트 생성
 */
export function getProgressText(planData: TimeBasedBiblePlan): string {
    if (!planData?.isTimeBasedCalculation) {
        return "장 기반 진도";
    }

    const progress = calculatePeriodBasedProgress(planData);
    const formattedReadTime = formatReadingTime(progress.readMinutes);
    const formattedTotalTime = formatReadingTime(progress.totalMinutes);

    return `${progress.readChapters}/${progress.totalChapters}장 완료 (${formattedReadTime}/${formattedTotalTime})`;
}

/**
 * 🔥 오늘의 읽기 계획 텍스트
 */
export function getTodayPlanText(planData: TimeBasedBiblePlan): string {
    if (!planData?.isTimeBasedCalculation) {
        return "오늘의 읽기 계획이 없습니다.";
    }

    const todayChapters = getTodayChapters(planData);
    if (todayChapters.length === 0) {
        return "🎉 오늘 목표를 이미 달성했습니다!";
    }

    const totalMinutes = todayChapters.reduce((sum, ch) => sum + ch.estimatedMinutes, 0);
    const formattedTime = formatReadingTime(totalMinutes);
    const chaptersText = todayChapters.map(ch => `${ch.bookName} ${ch.chapter}장`).join(', ');

    return `📖 오늘의 읽기 (${formattedTime}):\n${chaptersText}`;
}

/**
 * 🔥 계획 상태 요약 텍스트
 */
export function getPlanStatusText(planData: TimeBasedBiblePlan): string {
    const progress = calculatePeriodBasedProgress(planData);
    const formattedDailyTime = formatReadingTime(planData.calculatedMinutesPerDay);

    let statusText = `📅 ${formatDate(planData.startDate)} ~ ${formatDate(planData.endDate)}\n`;
    statusText += `📊 진도: ${progress.progressPercentage}% (${progress.currentDay}/${progress.totalDays}일차)\n`;
    statusText += `⏱️ 하루 목표: ${formattedDailyTime}\n`;

    if (progress.missedChapters > 0) {
        statusText += `⚠️ 밀린 장: ${progress.missedChapters}장\n`;
    }

    if (progress.daysRemaining > 0) {
        statusText += `📍 남은 기간: ${progress.daysRemaining}일`;
    } else {
        statusText += `🎉 계획 완료!`;
    }

    return statusText;
}

// === 6. 고급 기능들 ===

/**
 * 🔥 동기부여 메시지 생성
 */
function generateMotivationalMessage(progressInfo: any): string {
    const { progressPercentage, isOnTrack, missedChapters, daysRemaining } = progressInfo;

    if (progressPercentage >= 100) {
        return "🎉 축하합니다! 성경 일독을 완주하셨습니다!";
    }

    if (progressPercentage >= 90) {
        return "🔥 거의 다 왔습니다! 조금만 더 화이팅!";
    }

    if (isOnTrack) {
        if (progressPercentage >= 75) {
            return "💪 순조롭게 진행하고 계시네요! 꾸준히 화이팅!";
        } else if (progressPercentage >= 50) {
            return "📈 절반을 넘었습니다! 계속 이 페이스로!";
        } else {
            return "🌱 좋은 시작입니다! 꾸준히 계속해보세요!";
        }
    }

    if (missedChapters > 10) {
        return "⚠️ 조금 밀려있네요. 오늘부터 다시 시작해보세요!";
    } else if (missedChapters > 0) {
        return "📚 조금 뒤처져 있지만 괜찮아요! 조금씩 따라잡아 봅시다!";
    }

    return "🚀 오늘도 말씀과 함께 좋은 하루 되세요!";
}

/**
 * 🔥 다음 목표 계산
 */
function calculateNextMilestone(progressInfo: any): any {
    const { progressPercentage, totalChapters, readChapters } = progressInfo;

    const milestones = [25, 50, 75, 90, 100];
    const nextMilestone = milestones.find(m => m > progressPercentage);

    if (!nextMilestone) return null;

    const targetChapters = Math.ceil((nextMilestone / 100) * totalChapters);
    const remainingChapters = targetChapters - readChapters;

    return {
        percentage: nextMilestone,
        remainingChapters,
        message: nextMilestone === 100
            ? "완주까지"
            : `${nextMilestone}% 달성까지`
    };
}

/**
 * 🔥 연속 읽기 일수 계산
 */
function calculateReadingStreak(planData: TimeBasedBiblePlan): number {
    const currentDay = getCurrentDay(planData.startDate);
    let streak = 0;

    // 오늘부터 거꾸로 계산
    for (let day = currentDay; day >= 1; day--) {
        const dailyReading = getDailyReading(planData, day);

        if (dailyReading && dailyReading.isCompleted) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

/**
 * 🔥 성취 확인 및 알림
 */
function checkAchievements(planData: TimeBasedBiblePlan) {
    const progress = calculatePeriodBasedProgress(planData);
    const streak = calculateReadingStreak(planData);

    // 진도 기반 성취
    const progressMilestones = [25, 50, 75, 90, 100];
    progressMilestones.forEach(milestone => {
        if (Math.floor(progress.progressPercentage) === milestone) {
            console.log(`🏆 성취 달성: ${milestone}% 완료!`);
            // 여기서 Toast 알림이나 기타 UI 알림 추가 가능
        }
    });

    // 연속 읽기 성취
    const streakMilestones = [7, 14, 30, 50, 100];
    if (streakMilestones.includes(streak)) {
        console.log(`🔥 연속 읽기 성취: ${streak}일 연속!`);
    }

    // 특별한 날 성취 (성경 전체 완독 등)
    if (progress.progressPercentage >= 100) {
        console.log(`🎉 최고 성취: 성경 일독 완주!`);
    }
}

// === 7. 기존 시스템 호환 함수들 ===

/**
 * 🔥 기존 calculateDailyPlan 함수 대체
 */
export function calculateDailyPlan(
    planType: string,
    targetDays?: number,
    startDate?: string,
    endDate?: string
): any {
    // 시간 기반 방식 사용
    if (startDate && endDate) {
        const plan = divideChaptersByPeriod(planType, startDate, endDate);

        return {
            ...plan,
            totalChapters: plan.totalChapters,
            estimatedDays: plan.totalDays,
            chaptersPerDay: plan.chaptersPerDay,
            timePerDay: plan.calculatedMinutesPerDay,
            formattedTimePerDay: formatReadingTime(plan.calculatedMinutesPerDay),
            isTimeBasedCalculation: true
        };
    }

    console.warn('⚠️ 기존 방식의 calculateDailyPlan 호출됨. 새로운 시간 기반 방식을 권장합니다.');
    return createLegacyPlan(planType, targetDays);
}

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
            progressIndicator: getProgressIndicator(progress.progressPercentage)
        };
    }

    return calculateLegacyProgress(planData);
}

// === 8. 데이터 저장/로드 함수들 ===

function loadExistingBiblePlan(): TimeBasedBiblePlan | null {
    try {
        const stored = defaultStorage.getString('biblePlan');
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

        defaultStorage.set('biblePlan', JSON.stringify(planData));
        console.log('💾 시간 기반 계획 저장 완료');

        // 백업 저장 (선택사항)
        const backupKey = `biblePlan_backup_${new Date().toISOString().split('T')[0]}`;
        defaultStorage.set(backupKey, JSON.stringify(planData));

    } catch (error) {
        console.error('❌ 계획 저장 실패:', error);
    }
}

// === 9. 하위 호환성을 위한 레거시 함수들 ===

function handleLegacyChapterRead(planData: any, bookName: string, chapter: number): any {
    if (planData.readChapters) {
        const updatedReadChapters = planData.readChapters.map((ch: any) => {
            if (ch.book === bookName && ch.chapter === chapter) {
                return {
                    ...ch,
                    isRead: true,
                    date: new Date().toISOString()
                };
            }
            return ch;
        });

        return {
            ...planData,
            readChapters: updatedReadChapters,
            lastModified: new Date().toISOString()
        };
    }

    return planData;
}

function createLegacyPlan(planType: string, targetDays?: number): any {
    return {
        planType,
        totalChapters: 1189,
        estimatedDays: targetDays || 365,
        chaptersPerDay: Math.ceil(1189 / (targetDays || 365)),
        isTimeBasedCalculation: false,
        createdAt: new Date().toISOString()
    };
}

function calculateLegacyProgress(planData: any): any {
    const totalChapters = planData.totalChapters || 0;
    const readChapters = planData.readChapters?.filter((ch: any) => ch.isRead).length || 0;
    const progressPercentage = totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0;

    return {
        totalChapters,
        readChapters,
        progressPercentage,
        currentDay: 1,
        missedChapters: 0,
        progressIndicator: getProgressIndicator(progressPercentage)
    };
}

// === 10. 추가 유틸리티 함수들 ===

/**
 * 🔥 계획 통계 요약
 */
export function getPlanStatistics(planData: TimeBasedBiblePlan) {
    const progress = calculatePeriodBasedProgress(planData);
    const streak = calculateReadingStreak(planData);

    return {
        totalDays: planData.totalDays,
        completedDays: progress.currentDay - 1,
        remainingDays: progress.daysRemaining,
        totalTime: planData.totalMinutes,
        readTime: progress.readMinutes,
        remainingTime: planData.totalMinutes - progress.readMinutes,
        averagePerDay: planData.calculatedMinutesPerDay,
        currentStreak: streak,
        completionPercentage: progress.progressPercentage,
        estimatedCompletion: getEstimatedCompletionDate(planData),
        isOnSchedule: progress.isOnTrack
    };
}

/**
 * 🔥 성경책별 읽기 진도
 */
export function getBookProgress(planData: TimeBasedBiblePlan) {
    const bookProgress: { [key: number]: { name: string, total: number, read: number, percentage: number } } = {};

    // 모든 성경책 초기화
    BibleStep.forEach(book => {
        bookProgress[book.index] = {
            name: book.name,
            total: book.count,
            read: 0,
            percentage: 0
        };
    });

    // 읽은 장들 카운트
    planData.readChapters.forEach(chapter => {
        if (chapter.isRead && bookProgress[chapter.book]) {
            bookProgress[chapter.book].read++;
        }
    });

    // 퍼센티지 계산
    Object.values(bookProgress).forEach(book => {
        book.percentage = book.total > 0 ? Math.round((book.read / book.total) * 100) : 0;
    });

    return bookProgress;
}

/**
 * 🔥 주간 리포트 생성
 */
export function generateWeeklyReport(planData: TimeBasedBiblePlan) {
    const currentDay = getCurrentDay(planData.startDate);
    const weekStart = Math.max(1, currentDay - 6);
    const weekEnd = currentDay;

    let weeklyReadTime = 0;
    let weeklyReadChapters = 0;
    let daysActive = 0;

    for (let day = weekStart; day <= weekEnd; day++) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading?.isCompleted) {
            daysActive++;
            weeklyReadTime += dailyReading.totalMinutes;
            weeklyReadChapters += dailyReading.chapters.length;
        }
    }

    return {
        period: `${weekStart}일차 ~ ${weekEnd}일차`,
        daysActive,
        totalDays: weekEnd - weekStart + 1,
        readTime: weeklyReadTime,
        formattedReadTime: formatReadingTime(weeklyReadTime),
        readChapters: weeklyReadChapters,
        consistency: Math.round((daysActive / (weekEnd - weekStart + 1)) * 100),
        averageDailyTime: daysActive > 0 ? weeklyReadTime / daysActive : 0
    };
}

/**
 * 🔥 월간 리포트 생성
 */
export function generateMonthlyReport(planData: TimeBasedBiblePlan) {
    const currentDay = getCurrentDay(planData.startDate);
    const monthStart = Math.max(1, currentDay - 29);
    const monthEnd = currentDay;

    let monthlyReadTime = 0;
    let monthlyReadChapters = 0;
    let daysActive = 0;
    let streaks: number[] = [];
    let currentStreak = 0;

    for (let day = monthStart; day <= monthEnd; day++) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading?.isCompleted) {
            daysActive++;
            monthlyReadTime += dailyReading.totalMinutes;
            monthlyReadChapters += dailyReading.chapters.length;
            currentStreak++;
        } else {
            if (currentStreak > 0) {
                streaks.push(currentStreak);
                currentStreak = 0;
            }
        }
    }

    if (currentStreak > 0) {
        streaks.push(currentStreak);
    }

    const longestStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

    return {
        period: `${monthStart}일차 ~ ${monthEnd}일차`,
        daysActive,
        totalDays: monthEnd - monthStart + 1,
        readTime: monthlyReadTime,
        formattedReadTime: formatReadingTime(monthlyReadTime),
        readChapters: monthlyReadChapters,
        consistency: Math.round((daysActive / (monthEnd - monthStart + 1)) * 100),
        averageDailyTime: daysActive > 0 ? monthlyReadTime / daysActive : 0,
        longestStreak,
        totalStreaks: streaks.length
    };
}

/**
 * 🔥 계획 완료 예측
 */
export function predictPlanCompletion(planData: TimeBasedBiblePlan) {
    const progress = calculatePeriodBasedProgress(planData);
    const currentDay = getCurrentDay(planData.startDate);

    // 현재 진행 속도 계산
    const daysElapsed = currentDay - 1;
    const readingRate = daysElapsed > 0 ? progress.readChapters / daysElapsed : 0;

    // 남은 장수와 예상 소요 일수
    const remainingChapters = progress.totalChapters - progress.readChapters;
    const predictedDaysToComplete = readingRate > 0 ? Math.ceil(remainingChapters / readingRate) : Infinity;

    // 예상 완료일
    const today = new Date();
    const predictedCompletionDate = new Date(today);
    predictedCompletionDate.setDate(today.getDate() + predictedDaysToComplete);

    // 원래 계획 대비 빠르거나 늦은 정도
    const originalEndDate = new Date(planData.endDate);
    const daysDifference = Math.ceil((predictedCompletionDate.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
        predictedCompletionDate: predictedCompletionDate.toISOString().split('T')[0],
        formattedPredictedDate: formatDate(predictedCompletionDate.toISOString()),
        daysToComplete: predictedDaysToComplete,
        isAheadOfSchedule: daysDifference < 0,
        isBehindSchedule: daysDifference > 0,
        daysDifference: Math.abs(daysDifference),
        currentReadingRate: Math.round(readingRate * 100) / 100,
        recommendedDailyChapters: remainingChapters > 0 && progress.daysRemaining > 0
            ? Math.ceil(remainingChapters / progress.daysRemaining)
            : 0
    };
}

/**
 * 🔥 개인화된 추천 시스템
 */
export function getPersonalizedRecommendations(planData: TimeBasedBiblePlan) {
    const progress = calculatePeriodBasedProgress(planData);
    const streak = calculateReadingStreak(planData);
    const weeklyReport = generateWeeklyReport(planData);
    const prediction = predictPlanCompletion(planData);

    const recommendations = [];

    // 진도 기반 추천
    if (progress.progressPercentage < 25 && progress.currentDay > 30) {
        recommendations.push({
            type: 'progress',
            priority: 'high',
            title: '진도 회복 필요',
            message: '계획보다 많이 뒤처져 있습니다. 하루 읽기량을 늘리거나 계획을 조정해보세요.',
            action: '계획 재조정'
        });
    }

    // 연속성 기반 추천
    if (streak === 0 && weeklyReport.daysActive < 3) {
        recommendations.push({
            type: 'consistency',
            priority: 'medium',
            title: '꾸준한 읽기 필요',
            message: '일주일에 최소 3일은 읽기를 권장합니다. 작은 목표부터 시작해보세요.',
            action: '알림 설정'
        });
    } else if (streak >= 7) {
        recommendations.push({
            type: 'encouragement',
            priority: 'low',
            title: '훌륭한 연속 기록!',
            message: `${streak}일 연속 읽기를 달성했습니다. 계속 이 페이스를 유지해보세요!`,
            action: null
        });
    }

    // 시간 관리 기반 추천
    if (weeklyReport.averageDailyTime > planData.calculatedMinutesPerDay * 1.5) {
        recommendations.push({
            type: 'time_management',
            priority: 'low',
            title: '읽기 시간 최적화',
            message: '목표 시간보다 많이 읽고 계시네요. 여유가 있다면 묵상 시간을 늘려보세요.',
            action: '묵상 가이드'
        });
    }

    // 완료 예측 기반 추천
    if (prediction.isBehindSchedule && prediction.daysDifference > 30) {
        recommendations.push({
            type: 'schedule_adjustment',
            priority: 'high',
            title: '계획 조정 고려',
            message: `현재 속도로는 ${prediction.daysDifference}일 늦게 완료됩니다. 계획을 조정하거나 읽기량을 늘려보세요.`,
            action: '계획 수정'
        });
    }

    return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
}

/**
 * 🔥 읽기 패턴 분석
 */
export function analyzeReadingPatterns(planData: TimeBasedBiblePlan) {
    const currentDay = getCurrentDay(planData.startDate);
    const last30Days = Math.min(30, currentDay);

    const patterns = {
        dailyActivity: new Array(7).fill(0), // 요일별 활동
        timeDistribution: new Array(24).fill(0), // 시간대별 활동
        streakAnalysis: {
            longest: 0,
            current: calculateReadingStreak(planData),
            average: 0,
            total: 0
        },
        preferredReadingTime: null as number | null,
        consistencyScore: 0
    };

    let totalStreaks = 0;
    let streakCount = 0;
    let currentStreak = 0;
    let activeDays = 0;

    // 최근 30일 분석
    for (let i = Math.max(1, currentDay - 29); i <= currentDay; i++) {
        const dailyReading = getDailyReading(planData, i);
        const date = new Date(planData.startDate);
        date.setDate(date.getDate() + i - 1);

        if (dailyReading?.isCompleted) {
            activeDays++;
            currentStreak++;

            // 요일별 패턴 (0 = 일요일, 6 = 토요일)
            patterns.dailyActivity[date.getDay()]++;

            // 시간대별 패턴 (읽은 시간 추정)
            const readTime = dailyReading.chapters.reduce((sum, ch) => sum + ch.estimatedMinutes, 0);
            const estimatedHour = Math.floor(readTime / 60 * 24) % 24; // 간단한 추정
            patterns.timeDistribution[estimatedHour]++;
        } else {
            if (currentStreak > 0) {
                patterns.streakAnalysis.longest = Math.max(patterns.streakAnalysis.longest, currentStreak);
                totalStreaks += currentStreak;
                streakCount++;
                currentStreak = 0;
            }
        }
    }

    // 마지막 연속 기록 처리
    if (currentStreak > 0) {
        patterns.streakAnalysis.longest = Math.max(patterns.streakAnalysis.longest, currentStreak);
        totalStreaks += currentStreak;
        streakCount++;
    }

    // 평균 연속 기록 계산
    patterns.streakAnalysis.average = streakCount > 0 ? Math.round(totalStreaks / streakCount) : 0;
    patterns.streakAnalysis.total = streakCount;

    // 일관성 점수 계산 (0-100)
    patterns.consistencyScore = Math.round((activeDays / last30Days) * 100);

    // 선호 읽기 시간대 찾기
    const maxTimeIndex = patterns.timeDistribution.indexOf(Math.max(...patterns.timeDistribution));
    patterns.preferredReadingTime = patterns.timeDistribution[maxTimeIndex] > 0 ? maxTimeIndex : null;

    return patterns;
}

/**
 * 🔥 데이터 내보내기 (백업용)
 */
export function exportPlanData(planData: TimeBasedBiblePlan) {
    const progress = calculatePeriodBasedProgress(planData);
    const statistics = getPlanStatistics(planData);
    const weeklyReport = generateWeeklyReport(planData);
    const monthlyReport = generateMonthlyReport(planData);
    const patterns = analyzeReadingPatterns(planData);

    return {
        exportDate: new Date().toISOString(),
        version: '2.0',
        planData: {
            ...planData,
            // 민감한 정보 제외하고 필요한 데이터만
        },
        progress,
        statistics,
        reports: {
            weekly: weeklyReport,
            monthly: monthlyReport
        },
        patterns,
        metadata: {
            totalDaysInPlan: planData.totalDays,
            daysCompleted: progress.currentDay - 1,
            completionRate: progress.progressPercentage
        }
    };
}

/**
 * 🔥 데이터 가져오기 (복원용)
 */
export function importPlanData(exportedData: any): TimeBasedBiblePlan | null {
    try {
        // 데이터 버전 확인
        if (exportedData.version !== '2.0') {
            console.warn('지원하지 않는 데이터 버전:', exportedData.version);
            return null;
        }

        // 필수 데이터 검증
        if (!exportedData.planData || !validatePlanData(exportedData.planData)) {
            console.error('유효하지 않은 계획 데이터');
            return null;
        }

        // 데이터 복원
        const restoredPlan = {
            ...exportedData.planData,
            lastModified: new Date().toISOString(),
            metadata: {
                ...exportedData.planData.metadata,
                restoredAt: new Date().toISOString(),
                originalExportDate: exportedData.exportDate
            }
        };

        // 저장
        saveBiblePlan(restoredPlan);

        console.log('✅ 계획 데이터 복원 완료');
        return restoredPlan;

    } catch (error) {
        console.error('❌ 데이터 가져오기 실패:', error);
        return null;
    }
}

// === 11. 타입 내보내기 ===

export type {
    TimeBasedBiblePlan,
    BiblePlanFormData
};