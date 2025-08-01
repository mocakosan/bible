// src/utils/timeBasedBibleSystem.ts
// 🔥 완전한 시간 기반 성경 읽기 시스템 - CSV 데이터 기반, 시간 단위로 장 분배

import { BibleStep } from './define';
import {
    loadChapterTimeDataFromCSV,
    getChapterTime,
    getChapterTimeInSeconds,
    getChapterTimeDetail,
    calculatePlanTotalTime,
    isChapterTimeDataLoaded,
    getBookRangeForPlan
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

    // 기존 UI 호환을 위한 필드
    chaptersPerDay?: number;  // UI 표시용
    targetDate?: string;      // 레거시 호환
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

    // 기존 UI 호환을 위한 평균 장수 계산
    const avgChaptersPerDay = Math.ceil(totalChapters / totalDays);

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
        version: '3.0_time_based_csv',
        metadata: {
            creationMethod: 'time_based_csv',
            audioDataUsed: isChapterTimeDataLoaded(),
            estimatedCompletionDate: endDate
        },
        // UI 호환 필드
        chaptersPerDay: avgChaptersPerDay,
        targetDate: endDate
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
            if (daySchedule.totalMinutes < targetMinutesPerDay || daySchedule.chapters.length === 0) {
                daySchedule.chapters.push({
                    book: currentBook,
                    chapter: currentChapter,
                    bookName: bookInfo.name,
                    estimatedMinutes: chapterTime
                });
                daySchedule.totalMinutes += chapterTime;

                currentChapter++;

                // 목표 시간을 넘었으면 다음 날로
                if (daySchedule.totalMinutes >= targetMinutesPerDay) {
                    break;
                }
            } else {
                break;
            }
        }

        schedule.push(daySchedule);

        // 모든 장을 다 읽었으면 종료
        if (currentBook > bookRange.end) {
            break;
        }
    }

    // 남은 장들이 있다면 마지막 날에 추가
    if (currentBook <= bookRange.end) {
        const lastDay = schedule[schedule.length - 1];

        while (currentBook <= bookRange.end) {
            const bookInfo = BibleStep.find(step => step.index === currentBook);
            if (!bookInfo || currentChapter > bookInfo.count) {
                currentBook++;
                currentChapter = 1;
                continue;
            }

            const chapterTime = getChapterTime(currentBook, currentChapter);
            lastDay.chapters.push({
                book: currentBook,
                chapter: currentChapter,
                bookName: bookInfo.name,
                estimatedMinutes: chapterTime
            });
            lastDay.totalMinutes += chapterTime;

            currentChapter++;
        }
    }

    return schedule;
};

// === 진행 상황 관리 ===

/**
 * 🔥 장 읽기 완료 처리
 */
export const markChapterAsRead = (
    planData: TimeBasedBiblePlan,
    bookIndex: number,
    chapter: number
): TimeBasedBiblePlan => {
    const updatedReadChapters = [...planData.readChapters];

    // 이미 읽은 장인지 확인
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === bookIndex && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        // 이미 읽은 경우 상태만 업데이트
        updatedReadChapters[existingIndex].isRead = true;
    } else {
        // 새로 추가
        const bookInfo = BibleStep.find(b => b.index === bookIndex);
        const chapterTime = getChapterTime(bookIndex, chapter);

        // 어느 날짜에 해당하는지 찾기
        let scheduledDay = 1;
        let scheduledDate = planData.startDate;

        for (const schedule of planData.dailyReadingSchedule) {
            if (schedule.chapters.some(ch => ch.book === bookIndex && ch.chapter === chapter)) {
                scheduledDay = schedule.day;
                scheduledDate = schedule.date;
                break;
            }
        }

        updatedReadChapters.push({
            book: bookIndex,
            chapter,
            bookName: bookInfo?.name || '',
            date: new Date().toISOString().split('T')[0],
            isRead: true,
            estimatedMinutes: chapterTime,
            day: scheduledDay
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
    const updatedReadChapters = planData.readChapters.map(r => {
        if (r.book === bookIndex && r.chapter === chapter) {
            return { ...r, isRead: false };
        }
        return r;
    });

    return {
        ...planData,
        readChapters: updatedReadChapters,
        lastModified: new Date().toISOString()
    };
};

// === 현재 상태 조회 ===

/**
 * 🔥 현재 일차 계산
 */
export const getCurrentDay = (planData: TimeBasedBiblePlan): number => {
    const start = new Date(planData.startDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return Math.max(1, Math.min(daysDiff, planData.totalDays));
};

/**
 * 🔥 오늘 읽어야 할 장들 가져오기
 */
export const getTodayChapters = (planData: TimeBasedBiblePlan): ReadChapterStatus[] => {
    const currentDay = getCurrentDay(planData);
    const todaySchedule = planData.dailyReadingSchedule.find(s => s.day === currentDay);

    if (!todaySchedule) {
        return [];
    }

    return todaySchedule.chapters.map(ch => {
        const isRead = planData.readChapters.some(
            r => r.book === ch.book && r.chapter === ch.chapter && r.isRead
        );

        return {
            book: ch.book,
            chapter: ch.chapter,
            bookName: ch.bookName,
            date: todaySchedule.date,
            isRead,
            estimatedMinutes: ch.estimatedMinutes,
            day: currentDay
        };
    });
};

/**
 * 🔥 특정 일차의 읽기 정보 가져오기
 */
export const getDailyReading = (planData: TimeBasedBiblePlan, day: number): DailyReading | null => {
    const schedule = planData.dailyReadingSchedule.find(s => s.day === day);

    if (!schedule) {
        return null;
    }

    const chapters = schedule.chapters.map(ch => {
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
            day
        };
    });

    const isCompleted = chapters.every(ch => ch.isRead);

    return {
        day,
        date: schedule.date,
        chapters,
        totalMinutes: schedule.totalMinutes,
        targetMinutes: schedule.targetMinutes,
        isCompleted
    };
};

// === 진행률 및 통계 ===

/**
 * 🔥 시간 기반 진행률 계산
 */
export const calculateTimeBasedProgress = (planData: TimeBasedBiblePlan): {
    readChapters: number;
    totalChapters: number;
    readMinutes: number;
    totalMinutes: number;
    progressPercentage: number;
    timeProgressPercentage: number;
    daysProgress: {
        current: number;
        total: number;
        percentage: number;
    };
} => {
    const readChapters = planData.readChapters.filter(r => r.isRead);
    const readMinutes = readChapters.reduce((sum, ch) => sum + ch.estimatedMinutes, 0);

    const currentDay = getCurrentDay(planData);
    const daysPercentage = (currentDay / planData.totalDays) * 100;

    return {
        readChapters: readChapters.length,
        totalChapters: planData.totalChapters,
        readMinutes: Math.round(readMinutes),
        totalMinutes: Math.round(planData.totalMinutes),
        progressPercentage: (readChapters.length / planData.totalChapters) * 100,
        timeProgressPercentage: (readMinutes / planData.totalMinutes) * 100,
        daysProgress: {
            current: currentDay,
            total: planData.totalDays,
            percentage: daysPercentage
        }
    };
};

/**
 * 🔥 놓친 장 계산
 */
export const calculateTimeBasedMissedChapters = (planData: TimeBasedBiblePlan): number => {
    const currentDay = getCurrentDay(planData);
    let missedCount = 0;

    for (let day = 1; day < currentDay; day++) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading) {
            missedCount += dailyReading.chapters.filter(ch => !ch.isRead).length;
        }
    }

    return missedCount;
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

// === 유틸리티 함수 ===

/**
 * 🔥 주간 일정 가져오기
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

/**
 * 🔥 계획 유효성 검증
 */
export const validateTimeBasedPlan = (planData: any): planData is TimeBasedBiblePlan => {
    return (
        planData &&
        planData.isTimeBasedCalculation === true &&
        planData.dailyReadingSchedule &&
        Array.isArray(planData.dailyReadingSchedule) &&
        planData.calculatedMinutesPerDay !== undefined
    );
};

// === 포맷팅 함수 ===

/**
 * 🔥 시간 포맷팅 (분 → "X시간 Y분" 또는 "Y분")
 */
export const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes)}분`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (mins === 0) {
        return `${hours}시간`;
    }

    return `${hours}시간 ${mins}분`;
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

    return `${month}월 ${day}일(${weekday})`;
};

// === 추가 유틸리티 ===

/**
 * 🔥 진행률 표시 문자열 생성
 */
export const getProgressIndicator = (planData: TimeBasedBiblePlan): string => {
    const progress = calculateTimeBasedProgress(planData);
    const missedChapters = calculateTimeBasedMissedChapters(planData);

    let indicator = `📖 ${progress.readChapters}/${progress.totalChapters}장 완료`;
    indicator += ` (${progress.progressPercentage.toFixed(1)}%)`;

    if (missedChapters > 0) {
        indicator += ` | ⚠️ ${missedChapters}장 놓침`;
    }

    indicator += `\n⏱️ ${formatReadingTime(progress.readMinutes)} / ${formatReadingTime(progress.totalMinutes)} 읽음`;
    indicator += ` (${progress.timeProgressPercentage.toFixed(1)}%)`;

    return indicator;
};

/**
 * 🔥 예상 완료일 계산
 */
export const getEstimatedCompletionDate = (planData: TimeBasedBiblePlan): string => {
    const progress = calculateTimeBasedProgress(planData);

    if (progress.readChapters === 0) {
        return planData.endDate;
    }

    // 현재 진행 속도로 계산
    const currentDay = getCurrentDay(planData);
    const chaptersPerDay = progress.readChapters / currentDay;
    const remainingChapters = planData.totalChapters - progress.readChapters;
    const remainingDays = Math.ceil(remainingChapters / chaptersPerDay);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + remainingDays);

    return estimatedDate.toISOString().split('T')[0];
};

/**
 * 🔥 동기부여 메시지 생성
 */
export const getMotivationalMessage = (planData: TimeBasedBiblePlan): string => {
    const progress = calculateTimeBasedProgress(planData);
    const missedChapters = calculateTimeBasedMissedChapters(planData);

    if (progress.progressPercentage === 0) {
        return "🌟 성경일독을 시작해보세요! 오늘이 가장 좋은 날입니다.";
    } else if (progress.progressPercentage === 100) {
        return "🎉 축하합니다! 성경일독을 완료하셨습니다!";
    } else if (missedChapters > 10) {
        return "💪 조금 밀렸지만 괜찮아요! 오늘부터 다시 시작해봐요.";
    } else if (progress.daysProgress.percentage > progress.progressPercentage) {
        return "⏰ 조금 서둘러야 해요! 하지만 충분히 할 수 있습니다.";
    } else {
        return "✨ 잘하고 있어요! 꾸준히 계속해봐요.";
    }
};

/**
 * 🔥 읽기 연속 일수 계산
 */
export const calculateReadingStreak = (planData: TimeBasedBiblePlan): number => {
    const currentDay = getCurrentDay(planData);
    let streak = 0;

    for (let day = currentDay; day >= 1; day--) {
        const dailyReading = getDailyReading(planData, day);
        if (dailyReading && dailyReading.isCompleted) {
            streak++;
        } else if (day < currentDay) {
            // 과거 날짜에서 미완료면 연속 끊김
            break;
        }
    }

    return streak;
};

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
    preview?: any;
} => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end < start) {
            return {
                isValid: false,
                errorMessage: "종료일이 시작일보다 빠릅니다."
            };
        }

        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const { totalMinutes, totalChapters } = calculatePlanTotalTime(planType);
        const calculatedMinutesPerDay = totalMinutes / totalDays;

        // 샘플 일정 생성 (처음 3일)
        const tempPlan = createTimeBasedBiblePlan(planType, startDate, endDate);
        const exampleDays = [];

        for (let day = 1; day <= Math.min(3, totalDays); day++) {
            const dailyReading = getDailyReading(tempPlan, day);
            if (dailyReading) {
                exampleDays.push({
                    day,
                    date: dailyReading.date,
                    chapters: dailyReading.chapters.map(ch => `${ch.bookName} ${ch.chapter}장`),
                    totalMinutes: dailyReading.totalMinutes,
                    formattedTime: formatReadingTime(dailyReading.totalMinutes)
                });
            }
        }

        return {
            isValid: true,
            preview: {
                totalDays,
                totalMinutes,
                calculatedMinutesPerDay,
                totalChapters,
                formattedDailyTime: formatReadingTime(calculatedMinutesPerDay),
                formattedTotalTime: formatReadingTime(totalMinutes),
                progressIndicator: `하루 평균 ${formatReadingTime(calculatedMinutesPerDay)}씩 ${totalDays}일간`,
                exampleDays
            }
        };

    } catch (error) {
        return {
            isValid: false,
            errorMessage: "계획 미리보기 생성 중 오류가 발생했습니다."
        };
    }
};