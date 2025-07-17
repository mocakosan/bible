// src/utils/biblePlanUtils.ts
// 🔥 통합된 성경 일독 계획 관리 - 시간 기반 시스템과 기존 시스템 호환

import {
    TimeBasedBiblePlan,
    getTodayChaptersFromPlan,
    getCurrentDayFromPlan,
    markChapterAsReadInPlan,
    calculateTimeBasedProgress,
    isChapterRead,
    getChapterStatusFromPlan,
    validateTimeBasedPlan
} from './timeBasedBibleCalculator';
import { defaultStorage } from './mmkv';

// === 통합된 계획 데이터 타입 ===
export interface UnifiedBiblePlan {
    // 공통 필드
    planType: string;
    planName?: string;
    startDate: string;
    targetDate?: string;
    endDate?: string;
    totalDays: number;
    currentDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;

    // 시간 기반 계획 필드
    isTimeBasedCalculation?: boolean;
    targetMinutesPerDay?: number;
    actualMinutesPerDay?: number;
    totalMinutes?: number;
    totalChapters?: number;
    dailyReadingSchedule?: any[];
    version?: string;

    // 기존 계획 필드 (호환성)
    chaptersPerDay?: number;
}

export interface ReadingStatus {
    book: string | number;
    chapter: number;
    date: string;
    isRead: boolean;
    type?: 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal';
    estimatedMinutes?: number;
    day?: number;
}

/**
 * 🔥 통합된 계획 데이터 로드
 */
export const loadBiblePlanData = (): UnifiedBiblePlan | null => {
    try {
        console.log('📂 계획 데이터 로드 시작...');

        // 새로운 시간 기반 계획 우선 확인
        const timeBasedPlan = defaultStorage.getString('bible_reading_plan');
        if (timeBasedPlan) {
            const parsed = JSON.parse(timeBasedPlan);
            if (validateTimeBasedPlan(parsed)) {
                console.log('✅ 시간 기반 계획 로드됨:', parsed.planName);
                return parsed as TimeBasedBiblePlan;
            } else {
                console.log('⚠️ 시간 기반 계획 데이터 검증 실패');
                // 잘못된 데이터 삭제
                defaultStorage.delete('bible_reading_plan');
            }
        }

        // 기존 계획 확인 (호환성)
        const legacyPlan = defaultStorage.getString('bible_plan');
        if (legacyPlan) {
            const parsed = JSON.parse(legacyPlan);
            console.log('✅ 기존 방식 계획 로드됨 (호환 모드)');
            return parsed as UnifiedBiblePlan;
        }

        console.log('📭 저장된 계획이 없음');
        return null;

    } catch (error) {
        console.error('❌ 계획 로드 오류:', error);
        // 손상된 데이터 정리
        try {
            defaultStorage.delete('bible_reading_plan');
            defaultStorage.delete('bible_plan');
        } catch (cleanupError) {
            console.error('데이터 정리 실패:', cleanupError);
        }
        return null;
    }
};

/**
 * 🔥 통합된 계획 데이터 저장
 */
export const saveBiblePlanData = (planData: UnifiedBiblePlan): void => {
    try {
        if (planData.isTimeBasedCalculation) {
            // 새로운 시간 기반 계획
            defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
            console.log('💾 시간 기반 계획 저장됨:', planData.planName);

            // 기존 계획이 있다면 삭제 (중복 방지)
            if (defaultStorage.getString('bible_plan')) {
                defaultStorage.delete('bible_plan');
                console.log('🗑️ 기존 계획 데이터 정리됨');
            }
        } else {
            // 기존 계획 (호환성)
            defaultStorage.set('bible_plan', JSON.stringify(planData));
            console.log('💾 기존 방식 계획 저장됨');
        }
    } catch (error) {
        console.error('❌ 계획 저장 오류:', error);
        throw new Error('계획 저장에 실패했습니다.');
    }
};

/**
 * 🔥 통합된 계획 삭제
 */
export const deleteBiblePlanData = (): void => {
    try {
        console.log('🗑️ 모든 계획 데이터 삭제 시작...');

        // 모든 종류의 계획 데이터 삭제
        defaultStorage.delete('bible_reading_plan'); // 시간 기반 계획
        defaultStorage.delete('bible_plan'); // 기존 계획

        console.log('✅ 모든 계획 데이터 삭제 완료');
    } catch (error) {
        console.error('❌ 계획 삭제 오류:', error);
        throw new Error('계획 삭제에 실패했습니다.');
    }
};

/**
 * 🔥 오늘 읽을 장들 가져오기 (통합)
 */
export const getTodayChapters = (planData: UnifiedBiblePlan): any[] => {
    if (!planData) {
        console.log('📖 계획 데이터 없음');
        return [];
    }

    try {
        // 시간 기반 계획인지 확인
        if (planData.isTimeBasedCalculation) {
            console.log('📖 시간 기반 오늘 읽을 장 계산');
            return getTodayChaptersFromPlan(planData as TimeBasedBiblePlan);
        } else {
            console.log('📖 기존 방식 오늘 읽을 장 계산');
            return getLegacyTodayChapters(planData);
        }
    } catch (error) {
        console.error('❌ 오늘 읽을 장 계산 오류:', error);
        return [];
    }
};

/**
 * 🔥 진행률 계산 (통합)
 */
export const calculateProgress = (planData: UnifiedBiblePlan) => {
    if (!planData) {
        return {
            progressPercentage: 0,
            readChapters: 0,
            totalChapters: 0,
            totalReadMinutes: 0,
            totalMinutes: 0
        };
    }

    try {
        // 시간 기반 계획인지 확인
        if (planData.isTimeBasedCalculation) {
            console.log('📊 시간 기반 진행률 계산');
            return calculateTimeBasedProgress(planData as TimeBasedBiblePlan);
        } else {
            console.log('📊 기존 방식 진행률 계산');
            return calculateLegacyProgress(planData);
        }
    } catch (error) {
        console.error('❌ 진행률 계산 오류:', error);
        return {
            progressPercentage: 0,
            readChapters: 0,
            totalChapters: planData.totalChapters || 0,
            totalReadMinutes: 0,
            totalMinutes: planData.totalMinutes || 0
        };
    }
};

/**
 * 🔥 장 읽음 처리 (통합)
 */
export const markChapterAsRead = (
    planData: UnifiedBiblePlan,
    book: string | number,
    chapter: number
): UnifiedBiblePlan | null => {
    if (!planData) {
        console.error('❌ 계획 데이터가 없습니다');
        return null;
    }

    try {
        // 시간 기반 계획인지 확인
        if (planData.isTimeBasedCalculation) {
            console.log('📚 시간 기반 장 읽음 처리');
            const bookAbbr = typeof book === 'string' ? book : convertBookNumberToAbbr(book);
            return markChapterAsReadInPlan(planData as TimeBasedBiblePlan, bookAbbr, chapter);
        } else {
            console.log('📚 기존 방식 장 읽음 처리');
            return markChapterAsReadLegacy(planData, book, chapter);
        }
    } catch (error) {
        console.error('❌ 장 읽음 처리 오류:', error);
        return null;
    }
};

/**
 * 🔥 장 상태 확인 (통합)
 */
export const getChapterStatus = (
    planData: UnifiedBiblePlan,
    book: string | number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    try {
        // 읽기 완료 확인 (공통)
        const bookKey = typeof book === 'string' ? book : convertBookNumberToAbbr(book);
        const isRead = planData.readChapters?.some(
            (r: any) => {
                const rBook = typeof r.book === 'string' ? r.book : convertBookNumberToAbbr(r.book);
                return rBook === bookKey && r.chapter === chapter && r.isRead;
            }
        );

        if (isRead) return 'completed';

        // 시간 기반 계획인지 확인
        if (planData.isTimeBasedCalculation) {
            return getChapterStatusFromPlan(planData as TimeBasedBiblePlan, bookKey, chapter);
        } else {
            return getLegacyChapterStatus(planData, book, chapter);
        }
    } catch (error) {
        console.error('❌ 장 상태 확인 오류:', error);
        return 'normal';
    }
};

/**
 * 🔥 장 읽기 상태 확인 (통합)
 */
export const isChapterReadSync = (
    planData: UnifiedBiblePlan,
    book: string | number,
    chapter: number
): boolean => {
    if (!planData?.readChapters) return false;

    try {
        const bookKey = typeof book === 'string' ? book : convertBookNumberToAbbr(book);

        return planData.readChapters.some(
            (r: any) => {
                const rBook = typeof r.book === 'string' ? r.book : convertBookNumberToAbbr(r.book);
                return rBook === bookKey && r.chapter === chapter && r.isRead;
            }
        );
    } catch (error) {
        console.error('❌ 장 읽기 상태 확인 오류:', error);
        return false;
    }
};

/**
 * 🔥 계획 유효성 검증
 */
export const validatePlanData = (planData: any): boolean => {
    try {
        if (!planData || typeof planData !== 'object') {
            return false;
        }

        // 시간 기반 계획 검증
        if (planData.isTimeBasedCalculation) {
            return validateTimeBasedPlan(planData);
        }

        // 기존 계획 검증
        return (
            typeof planData.planType === 'string' &&
            typeof planData.startDate === 'string' &&
            typeof planData.totalDays === 'number' &&
            Array.isArray(planData.readChapters)
        );
    } catch (error) {
        console.error('계획 데이터 검증 오류:', error);
        return false;
    }
};

// === 헬퍼 함수들 ===

/**
 * 책 번호를 약자로 변환
 */
const convertBookNumberToAbbr = (bookNumber: number): string => {
    const bookMapping: { [key: number]: string } = {
        1: 'Gen', 2: 'Exo', 3: 'Lev', 4: 'Num', 5: 'Deu',
        6: 'Jos', 7: 'Jdg', 8: 'Rut', 9: '1Sa', 10: '2Sa',
        11: '1Ki', 12: '2Ki', 13: '1Ch', 14: '2Ch', 15: 'Ezr',
        16: 'Neh', 17: 'Est', 18: 'Job', 19: 'Psa', 20: 'Pro',
        21: 'Ecc', 22: 'Son', 23: 'Isa', 24: 'Jer', 25: 'Lam',
        26: 'Eze', 27: 'Dan', 28: 'Hos', 29: 'Joe', 30: 'Amo',
        31: 'Oba', 32: 'Jon', 33: 'Mic', 34: 'Nah', 35: 'Hab',
        36: 'Zep', 37: 'Hag', 38: 'Zec', 39: 'Mal', 40: 'Mat',
        41: 'Mar', 42: 'Luk', 43: 'Joh', 44: 'Act', 45: 'Rom',
        46: '1Co', 47: '2Co', 48: 'Gal', 49: 'Eph', 50: 'Phi',
        51: 'Col', 52: '1Th', 53: '2Th', 54: '1Ti', 55: '2Ti',
        56: 'Tit', 57: 'Phm', 58: 'Heb', 59: 'Jam', 60: '1Pe',
        61: '2Pe', 62: '1Jo', 63: '2Jo', 64: '3Jo', 65: 'Jud', 66: 'Rev'
    };

    return bookMapping[bookNumber] || 'Gen';
};

// === 기존 방식 호환 함수들 ===

/**
 * 기존 방식 오늘 읽을 장 계산 (호환성)
 */
const getLegacyTodayChapters = (planData: UnifiedBiblePlan): any[] => {
    try {
        console.log('📖 기존 방식 오늘 읽을 장 계산 시작');

        const currentDay = planData.currentDay || 1;
        const chaptersPerDay = planData.chaptersPerDay || 3;

        // 기본적인 장 기반 계산
        const startChapter = (currentDay - 1) * chaptersPerDay + 1;
        const endChapter = currentDay * chaptersPerDay;

        const todayChapters = [];
        for (let i = startChapter; i <= endChapter; i++) {
            const isRead = planData.readChapters?.some(
                (r: any) => r.chapter === i && r.isRead
            );

            todayChapters.push({
                book: 1, // 기본값 (창세기)
                bookName: '창세기',
                chapter: i,
                isRead: isRead || false,
                type: 'today',
                totalSeconds: 180, // 기본 3분
                minutes: 3,
                seconds: 0
            });
        }

        console.log(`📖 기존 방식 오늘 읽을 장: ${todayChapters.length}개`);
        return todayChapters;

    } catch (error) {
        console.error('❌ 기존 방식 오늘 읽을 장 계산 오류:', error);
        return [];
    }
};

/**
 * 기존 방식 진행률 계산 (호환성)
 */
const calculateLegacyProgress = (planData: UnifiedBiblePlan) => {
    try {
        console.log('📊 기존 방식 진행률 계산 시작');

        const totalChapters = planData.totalChapters || (planData.totalDays * (planData.chaptersPerDay || 3));
        const readChapters = planData.readChapters?.filter(r => r.isRead).length || 0;
        const progressPercentage = totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0;

        // 기본 시간 추정 (장당 3분)
        const totalReadMinutes = readChapters * 3;
        const totalMinutes = totalChapters * 3;

        console.log(`📊 기존 방식 진행률: ${progressPercentage}% (${readChapters}/${totalChapters}장)`);

        return {
            progressPercentage,
            readChapters,
            totalChapters,
            totalReadMinutes,
            totalMinutes
        };

    } catch (error) {
        console.error('❌ 기존 방식 진행률 계산 오류:', error);
        return {
            progressPercentage: 0,
            readChapters: 0,
            totalChapters: 0,
            totalReadMinutes: 0,
            totalMinutes: 0
        };
    }
};

/**
 * 기존 방식 장 읽음 처리 (호환성)
 */
const markChapterAsReadLegacy = (
    planData: UnifiedBiblePlan,
    book: string | number,
    chapter: number
): UnifiedBiblePlan => {
    try {
        console.log(`📚 기존 방식 장 읽음 처리: ${book} ${chapter}장`);

        const updatedReadChapters = [...(planData.readChapters || [])];
        const existingIndex = updatedReadChapters.findIndex(
            (r: any) => r.book === book && r.chapter === chapter
        );

        if (existingIndex >= 0) {
            // 기존 기록 업데이트
            updatedReadChapters[existingIndex] = {
                ...updatedReadChapters[existingIndex],
                isRead: true,
                date: new Date().toISOString(),
                estimatedMinutes: 3 // 기본값
            };
        } else {
            // 새 기록 추가
            updatedReadChapters.push({
                book,
                chapter,
                date: new Date().toISOString(),
                isRead: true,
                estimatedMinutes: 3
            });
        }

        return {
            ...planData,
            readChapters: updatedReadChapters
        };

    } catch (error) {
        console.error('❌ 기존 방식 장 읽음 처리 오류:', error);
        return planData;
    }
};

/**
 * 기존 방식 장 상태 확인 (호환성)
 */
const getLegacyChapterStatus = (
    planData: UnifiedBiblePlan,
    book: string | number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    try {
        const currentDay = planData.currentDay || 1;
        const chaptersPerDay = planData.chaptersPerDay || 3;

        const startToday = (currentDay - 1) * chaptersPerDay + 1;
        const endToday = currentDay * chaptersPerDay;

        const startYesterday = (currentDay - 2) * chaptersPerDay + 1;
        const endYesterday = (currentDay - 1) * chaptersPerDay;

        const chapterNum = typeof chapter === 'number' ? chapter : 1;

        if (chapterNum >= startToday && chapterNum <= endToday) {
            return 'today';
        } else if (chapterNum >= startYesterday && chapterNum <= endYesterday) {
            return 'yesterday';
        } else if (chapterNum < startToday) {
            return 'missed';
        } else {
            return 'future';
        }

    } catch (error) {
        console.error('❌ 기존 방식 장 상태 확인 오류:', error);
        return 'normal';
    }
};

// === 추가 유틸리티 함수들 ===

/**
 * 계획 요약 정보 가져오기
 */
export const getPlanSummary = (planData: UnifiedBiblePlan) => {
    if (!planData) return null;

    try {
        const progress = calculateProgress(planData);

        return {
            planName: planData.planName || '성경 읽기',
            planType: planData.planType,
            isTimeBasedCalculation: planData.isTimeBasedCalculation || false,
            startDate: planData.startDate,
            endDate: planData.endDate || planData.targetDate,
            totalDays: planData.totalDays,
            progressPercentage: progress.progressPercentage,
            readChapters: progress.readChapters,
            totalChapters: progress.totalChapters,
            totalMinutes: planData.totalMinutes,
            actualMinutesPerDay: planData.actualMinutesPerDay,
            createdAt: planData.createdAt
        };

    } catch (error) {
        console.error('계획 요약 정보 생성 오류:', error);
        return null;
    }
};

/**
 * 어제 읽을 장들 가져오기
 */
export const getYesterdayChapters = (planData: UnifiedBiblePlan): any[] => {
    if (!planData) return [];

    try {
        if (planData.isTimeBasedCalculation) {
            const timeBasedPlan = planData as TimeBasedBiblePlan;
            const currentDay = getCurrentDayFromPlan(timeBasedPlan);
            const yesterdaySchedule = timeBasedPlan.dailyReadingSchedule.find(
                schedule => schedule.day === currentDay - 1
            );

            if (!yesterdaySchedule) return [];

            return yesterdaySchedule.chapters.map(chapter => ({
                ...chapter,
                isRead: isChapterRead(timeBasedPlan, chapter.book, chapter.chapter),
                type: 'yesterday'
            }));
        } else {
            // 기존 방식은 간단히 어제 범위의 장들 반환
            const currentDay = planData.currentDay || 1;
            const chaptersPerDay = planData.chaptersPerDay || 3;

            if (currentDay <= 1) return [];

            const startChapter = (currentDay - 2) * chaptersPerDay + 1;
            const endChapter = (currentDay - 1) * chaptersPerDay;

            const yesterdayChapters = [];
            for (let i = startChapter; i <= endChapter; i++) {
                const isRead = planData.readChapters?.some(
                    (r: any) => r.chapter === i && r.isRead
                );

                yesterdayChapters.push({
                    book: 1,
                    bookName: '창세기',
                    chapter: i,
                    isRead: isRead || false,
                    type: 'yesterday',
                    totalSeconds: 180,
                    minutes: 3,
                    seconds: 0
                });
            }

            return yesterdayChapters;
        }

    } catch (error) {
        console.error('어제 읽을 장 계산 오류:', error);
        return [];
    }
};

/**
 * 놓친 장들 가져오기
 */
export const getMissedChapters = (planData: UnifiedBiblePlan): any[] => {
    if (!planData) return [];

    try {
        if (planData.isTimeBasedCalculation) {
            const timeBasedPlan = planData as TimeBasedBiblePlan;
            const currentDay = getCurrentDayFromPlan(timeBasedPlan);
            const missedChapters: any[] = [];

            // 현재 날짜 이전의 모든 일정에서 읽지 않은 장들 찾기
            timeBasedPlan.dailyReadingSchedule.forEach(daySchedule => {
                if (daySchedule.day < currentDay) {
                    daySchedule.chapters.forEach(chapter => {
                        if (!isChapterRead(timeBasedPlan, chapter.book, chapter.chapter)) {
                            missedChapters.push({
                                ...chapter,
                                isRead: false,
                                type: 'missed',
                                scheduledDay: daySchedule.day,
                                scheduledDate: daySchedule.date
                            });
                        }
                    });
                }
            });

            return missedChapters;
        } else {
            // 기존 방식에서는 어제까지의 모든 읽지 않은 장들
            const currentDay = planData.currentDay || 1;
            const chaptersPerDay = planData.chaptersPerDay || 3;
            const missedChapters = [];

            for (let day = 1; day < currentDay; day++) {
                const startChapter = (day - 1) * chaptersPerDay + 1;
                const endChapter = day * chaptersPerDay;

                for (let chapter = startChapter; chapter <= endChapter; chapter++) {
                    const isRead = planData.readChapters?.some(
                        (r: any) => r.chapter === chapter && r.isRead
                    );

                    if (!isRead) {
                        missedChapters.push({
                            book: 1,
                            bookName: '창세기',
                            chapter,
                            isRead: false,
                            type: 'missed',
                            scheduledDay: day,
                            totalSeconds: 180,
                            minutes: 3,
                            seconds: 0
                        });
                    }
                }
            }

            return missedChapters;
        }

    } catch (error) {
        console.error('놓친 장 계산 오류:', error);
        return [];
    }
};

/**
 * 계획 백업 생성
 */
export const backupPlanData = (planData: UnifiedBiblePlan): string => {
    try {
        const backupData = {
            ...planData,
            backupCreatedAt: new Date().toISOString(),
            backupVersion: '1.0'
        };

        return JSON.stringify(backupData, null, 2);

    } catch (error) {
        console.error('계획 백업 생성 오류:', error);
        throw new Error('백업 생성에 실패했습니다.');
    }
};

/**
 * 계획 복원
 */
export const restorePlanData = (backupString: string): UnifiedBiblePlan => {
    try {
        const backupData = JSON.parse(backupString);

        // 백업 데이터 검증
        if (!validatePlanData(backupData)) {
            throw new Error('유효하지 않은 백업 데이터입니다.');
        }

        // 백업 관련 필드 제거
        const { backupCreatedAt, backupVersion, ...planData } = backupData;

        return planData as UnifiedBiblePlan;

    } catch (error) {
        console.error('계획 복원 오류:', error);
        throw new Error('백업 복원에 실패했습니다.');
    }
};