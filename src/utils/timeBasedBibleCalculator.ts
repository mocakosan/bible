// src/utils/timeBasedBibleCalculator.ts
// 🔥 시간 기반 성경 읽기 계획 계산 및 분배

import { AUDIO_CHAPTER_DATA, getChapterAudioLength, BOOK_ABBREVIATIONS } from './audioChapterData';

export interface TimeBasedDailyReading {
    day: number;
    date: string;
    chapters: ChapterReading[];
    totalMinutes: number;
    totalSeconds: number;
}

export interface ChapterReading {
    book: string;
    bookName: string;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isRead?: boolean;
}

export interface TimeBasedBiblePlan {
    planType: string;
    planName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    targetMinutesPerDay: number;
    actualMinutesPerDay: number;
    totalMinutes: number;
    totalChapters: number;
    isTimeBasedCalculation: true;
    currentDay: number;
    readChapters: ReadChapterStatus[];
    dailyReadingSchedule: TimeBasedDailyReading[];
    createdAt: string;
    version: string;
}

export interface ReadChapterStatus {
    book: string;
    chapter: number;
    date: string;
    isRead: boolean;
    estimatedMinutes: number;
    day?: number;
}

/**
 * 성경 계획 타입별 책 목록 정의
 */
const BIBLE_PLAN_BOOKS: { [key: string]: string[] } = {
    'whole': [
        'Gen', 'Exo', 'Lev', 'Num', 'Deu', 'Jos', 'Jdg', 'Rut', '1Sa', '2Sa',
        '1Ki', '2Ki', '1Ch', '2Ch', 'Ezr', 'Neh', 'Est', 'Job', 'Psa', 'Pro',
        'Ecc', 'Son', 'Isa', 'Jer', 'Lam', 'Eze', 'Dan', 'Hos', 'Joe', 'Amo',
        'Oba', 'Jon', 'Mic', 'Nah', 'Hab', 'Zep', 'Hag', 'Zec', 'Mal', 'Mat',
        'Mar', 'Luk', 'Joh', 'Act', 'Rom', '1Co', '2Co', 'Gal', 'Eph', 'Phi',
        'Col', '1Th', '2Th', '1Ti', '2Ti', 'Tit', 'Phm', 'Heb', 'Jam', '1Pe',
        '2Pe', '1Jo', '2Jo', '3Jo', 'Jud', 'Rev'
    ],
    'ot': [
        'Gen', 'Exo', 'Lev', 'Num', 'Deu', 'Jos', 'Jdg', 'Rut', '1Sa', '2Sa',
        '1Ki', '2Ki', '1Ch', '2Ch', 'Ezr', 'Neh', 'Est', 'Job', 'Psa', 'Pro',
        'Ecc', 'Son', 'Isa', 'Jer', 'Lam', 'Eze', 'Dan', 'Hos', 'Joe', 'Amo',
        'Oba', 'Jon', 'Mic', 'Nah', 'Hab', 'Zep', 'Hag', 'Zec', 'Mal'
    ],
    'nt': [
        'Mat', 'Mar', 'Luk', 'Joh', 'Act', 'Rom', '1Co', '2Co', 'Gal', 'Eph',
        'Phi', 'Col', '1Th', '2Th', '1Ti', '2Ti', 'Tit', 'Phm', 'Heb', 'Jam',
        '1Pe', '2Pe', '1Jo', '2Jo', '3Jo', 'Jud', 'Rev'
    ],
    'psalms': ['Psa'],
    'gospels': ['Mat', 'Mar', 'Luk', 'Joh'],
    'pentateuch': ['Gen', 'Exo', 'Lev', 'Num', 'Deu'],
    'wisdom': ['Job', 'Psa', 'Pro', 'Ecc', 'Son'],
    'prophets': [
        'Isa', 'Jer', 'Lam', 'Eze', 'Dan', 'Hos', 'Joe', 'Amo', 'Oba',
        'Jon', 'Mic', 'Nah', 'Hab', 'Zep', 'Hag', 'Zec', 'Mal'
    ],
    'pauline': [
        'Rom', '1Co', '2Co', 'Gal', 'Eph', 'Phi', 'Col', '1Th', '2Th',
        '1Ti', '2Ti', 'Tit', 'Phm'
    ]
};

/**
 * 🔥 핵심 함수: 시간 기준으로 장들을 날짜별로 분배
 */
export const divideChaptersByTime = (
    planType: string,
    startDate: string,
    endDate: string
): TimeBasedBiblePlan => {
    console.log(`🔥 시간 기반 계획 생성: ${planType}, ${startDate} ~ ${endDate}`);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
        throw new Error('유효하지 않은 날짜 범위입니다.');
    }

    // 1. 해당 계획의 모든 장들을 시간 순으로 수집
    const allChapters = collectAllChapters(planType);
    console.log(`📚 총 장 수: ${allChapters.length}`);

    // 2. 총 시간 계산
    const totalSeconds = allChapters.reduce((sum, ch) => sum + ch.totalSeconds, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const targetMinutesPerDay = Math.round(totalMinutes / totalDays);

    console.log(`⏰ 총 시간: ${totalMinutes}분, 하루 목표: ${targetMinutesPerDay}분`);

    // 3. 시간 기준으로 날짜별 분배
    const dailySchedule = distributeChaptersByTime(allChapters, totalDays, startDate);

    // 4. 실제 평균 시간 계산
    const actualMinutesPerDay = Math.round(
        dailySchedule.reduce((sum, day) => sum + day.totalMinutes, 0) / totalDays
    );

    const plan: TimeBasedBiblePlan = {
        planType,
        planName: getPlanName(planType),
        startDate,
        endDate,
        totalDays,
        targetMinutesPerDay,
        actualMinutesPerDay,
        totalMinutes,
        totalChapters: allChapters.length,
        isTimeBasedCalculation: true,
        currentDay: 1,
        readChapters: [],
        dailyReadingSchedule: dailySchedule,
        createdAt: new Date().toISOString(),
        version: '3.0_time_based'
    };

    console.log(`✅ 시간 기반 계획 생성 완료: 실제 평균 ${actualMinutesPerDay}분/일`);
    return plan;
};

/**
 * 계획 타입에 따른 모든 장 수집
 */
const collectAllChapters = (planType: string): ChapterReading[] => {
    const books = BIBLE_PLAN_BOOKS[planType] || BIBLE_PLAN_BOOKS['whole'];
    const chapters: ChapterReading[] = [];

    books.forEach(bookAbbr => {
        const bookData = AUDIO_CHAPTER_DATA[bookAbbr];
        if (bookData && bookData.length > 0) {
            // 실제 데이터가 있는 경우
            bookData.forEach(chapterData => {
                chapters.push({
                    book: bookAbbr,
                    bookName: BOOK_ABBREVIATIONS[bookAbbr] || bookAbbr,
                    chapter: chapterData.chapter,
                    minutes: chapterData.minutes,
                    seconds: chapterData.seconds,
                    totalSeconds: chapterData.totalSeconds,
                    isRead: false
                });
            });
        } else {
            // 데이터가 없는 경우 기본 장 수로 생성
            const defaultChapterCounts = getDefaultChapterCount(bookAbbr);
            for (let i = 1; i <= defaultChapterCounts; i++) {
                const estimatedSeconds = getChapterAudioLength(bookAbbr, i);
                chapters.push({
                    book: bookAbbr,
                    bookName: BOOK_ABBREVIATIONS[bookAbbr] || bookAbbr,
                    chapter: i,
                    minutes: Math.floor(estimatedSeconds / 60),
                    seconds: estimatedSeconds % 60,
                    totalSeconds: estimatedSeconds,
                    isRead: false
                });
            }
        }
    });

    return chapters;
};

/**
 * 책별 기본 장 수 반환
 */
const getDefaultChapterCount = (bookAbbr: string): number => {
    const chapterCounts: { [key: string]: number } = {
        'Gen': 50, 'Exo': 40, 'Lev': 27, 'Num': 36, 'Deu': 34,
        'Jos': 24, 'Jdg': 21, 'Rut': 4, '1Sa': 31, '2Sa': 24,
        '1Ki': 22, '2Ki': 25, '1Ch': 29, '2Ch': 36, 'Ezr': 10,
        'Neh': 13, 'Est': 10, 'Job': 42, 'Psa': 150, 'Pro': 31,
        'Ecc': 12, 'Son': 8, 'Isa': 66, 'Jer': 52, 'Lam': 5,
        'Eze': 48, 'Dan': 12, 'Hos': 14, 'Joe': 3, 'Amo': 9,
        'Oba': 1, 'Jon': 4, 'Mic': 7, 'Nah': 3, 'Hab': 3,
        'Zep': 3, 'Hag': 2, 'Zec': 14, 'Mal': 4, 'Mat': 28,
        'Mar': 16, 'Luk': 24, 'Joh': 21, 'Act': 28, 'Rom': 16,
        '1Co': 16, '2Co': 13, 'Gal': 6, 'Eph': 6, 'Phi': 4,
        'Col': 4, '1Th': 5, '2Th': 3, '1Ti': 6, '2Ti': 4,
        'Tit': 3, 'Phm': 1, 'Heb': 13, 'Jam': 5, '1Pe': 5,
        '2Pe': 3, '1Jo': 5, '2Jo': 1, '3Jo': 1, 'Jud': 1, 'Rev': 22
    };

    return chapterCounts[bookAbbr] || 1;
};

/**
 * 🔥 시간 기준으로 장들을 날짜별로 분배하는 핵심 알고리즘
 */
const distributeChaptersByTime = (
    chapters: ChapterReading[],
    totalDays: number,
    startDate: string
): TimeBasedDailyReading[] => {
    console.log(`📊 시간 기반 분배 시작: ${chapters.length}장을 ${totalDays}일에 분배`);

    const schedule: TimeBasedDailyReading[] = [];
    const totalSeconds = chapters.reduce((sum, ch) => sum + ch.totalSeconds, 0);
    const targetSecondsPerDay = Math.round(totalSeconds / totalDays);

    console.log(`⏱️ 하루 목표 시간: ${Math.round(targetSecondsPerDay / 60)}분`);

    let currentDayChapters: ChapterReading[] = [];
    let currentDaySeconds = 0;
    let chapterIndex = 0;

    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day - 1);

        // 하루치 장들 수집
        while (chapterIndex < chapters.length) {
            const chapter = chapters[chapterIndex];

            // 현재 장을 추가했을 때 목표 시간을 초과하는지 확인
            const wouldExceedTarget = currentDaySeconds + chapter.totalSeconds > targetSecondsPerDay;
            const hasChaptersAlready = currentDayChapters.length > 0;
            const isLastDay = day === totalDays;

            // 목표 시간 초과 조건
            if (wouldExceedTarget && hasChaptersAlready && !isLastDay) {
                // 다음 날로 넘김
                break;
            }

            // 장 추가
            currentDayChapters.push({ ...chapter });
            currentDaySeconds += chapter.totalSeconds;
            chapterIndex++;

            // 목표 시간에 도달했고 마지막 날이 아니면 다음 날로
            if (currentDaySeconds >= targetSecondsPerDay && !isLastDay) {
                break;
            }
        }

        // 최소 1장은 배정되도록 보장
        if (currentDayChapters.length === 0 && chapterIndex < chapters.length) {
            const chapter = chapters[chapterIndex];
            currentDayChapters.push({ ...chapter });
            currentDaySeconds += chapter.totalSeconds;
            chapterIndex++;
        }

        // 하루치 일정 생성
        const daySchedule: TimeBasedDailyReading = {
            day,
            date: currentDate.toISOString().split('T')[0],
            chapters: [...currentDayChapters],
            totalMinutes: Math.round(currentDaySeconds / 60),
            totalSeconds: currentDaySeconds
        };

        schedule.push(daySchedule);

        console.log(`📅 ${day}일차: ${currentDayChapters.length}장, ${Math.round(currentDaySeconds / 60)}분`);

        // 다음 날을 위해 초기화
        currentDayChapters = [];
        currentDaySeconds = 0;

        // 모든 장을 배정했으면 종료
        if (chapterIndex >= chapters.length) {
            console.log(`✅ 모든 장 배정 완료 (${day}일차에서 완료)`);
            break;
        }
    }

    console.log(`📊 분배 완료: ${schedule.length}일 일정 생성`);
    return schedule;
};

/**
 * 오늘 읽을 장들 가져오기
 */
export const getTodayChaptersFromPlan = (plan: TimeBasedBiblePlan): ChapterReading[] => {
    try {
        const currentDay = getCurrentDayFromPlan(plan);
        const todaySchedule = plan.dailyReadingSchedule.find(schedule => schedule.day === currentDay);

        if (!todaySchedule) {
            console.log(`📅 ${currentDay}일차 일정 없음`);
            return [];
        }

        // 읽기 상태 업데이트
        const chaptersWithReadStatus = todaySchedule.chapters.map(chapter => ({
            ...chapter,
            isRead: isChapterRead(plan, chapter.book, chapter.chapter)
        }));

        console.log(`📖 오늘(${currentDay}일차) 읽을 장: ${chaptersWithReadStatus.length}개`);
        return chaptersWithReadStatus;

    } catch (error) {
        console.error('오늘 읽을 장 가져오기 오류:', error);
        return [];
    }
};

/**
 * 현재 날짜 계산
 */
export const getCurrentDayFromPlan = (plan: TimeBasedBiblePlan): number => {
    try {
        const today = new Date();
        const startDate = new Date(plan.startDate);

        // 시간 차이를 일 단위로 계산
        const timeDiff = today.getTime() - startDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        // 1일차부터 시작, 총 일수를 넘지 않도록 제한
        const currentDay = Math.max(1, Math.min(daysDiff + 1, plan.totalDays));

        console.log(`📅 현재 날짜: ${currentDay}일차 (총 ${plan.totalDays}일)`);
        return currentDay;

    } catch (error) {
        console.error('현재 날짜 계산 오류:', error);
        return 1;
    }
};

/**
 * 장 읽기 상태 확인
 */
export const isChapterRead = (plan: TimeBasedBiblePlan, book: string, chapter: number): boolean => {
    return plan.readChapters.some(
        read => read.book === book && read.chapter === chapter && read.isRead
    );
};

/**
 * 장 읽음 처리
 */
export const markChapterAsReadInPlan = (
    plan: TimeBasedBiblePlan,
    book: string,
    chapter: number
): TimeBasedBiblePlan => {
    try {
        const chapterSeconds = getChapterAudioLength(book, chapter);
        const estimatedMinutes = Math.round(chapterSeconds / 60);

        const updatedReadChapters = [...plan.readChapters];
        const existingIndex = updatedReadChapters.findIndex(
            r => r.book === book && r.chapter === chapter
        );

        if (existingIndex >= 0) {
            // 기존 기록 업데이트
            updatedReadChapters[existingIndex] = {
                ...updatedReadChapters[existingIndex],
                isRead: true,
                date: new Date().toISOString(),
                estimatedMinutes
            };
        } else {
            // 새 기록 추가
            updatedReadChapters.push({
                book,
                chapter,
                date: new Date().toISOString(),
                isRead: true,
                estimatedMinutes,
                day: getCurrentDayFromPlan(plan)
            });
        }

        console.log(`✅ 장 읽음 처리: ${book} ${chapter}장 (${estimatedMinutes}분)`);

        return {
            ...plan,
            readChapters: updatedReadChapters
        };

    } catch (error) {
        console.error('장 읽음 처리 오류:', error);
        return plan;
    }
};

/**
 * 진행률 계산
 */
export const calculateTimeBasedProgress = (plan: TimeBasedBiblePlan) => {
    try {
        const totalChapters = plan.totalChapters;
        const readChaptersCount = plan.readChapters.filter(r => r.isRead).length;
        const progressPercentage = totalChapters > 0 ? Math.round((readChaptersCount / totalChapters) * 100) : 0;

        const totalReadMinutes = plan.readChapters
            .filter(r => r.isRead)
            .reduce((sum, r) => sum + (r.estimatedMinutes || 0), 0);

        // 현재 날짜 기준 예상 진행률
        const currentDay = getCurrentDayFromPlan(plan);
        const expectedProgressPercentage = Math.round((currentDay / plan.totalDays) * 100);

        console.log(`📊 진행률: ${progressPercentage}% (${readChaptersCount}/${totalChapters}장)`);
        console.log(`📊 예상 진행률: ${expectedProgressPercentage}% (${currentDay}일차)`);

        return {
            progressPercentage,
            readChapters: readChaptersCount,
            totalChapters,
            totalReadMinutes,
            totalMinutes: plan.totalMinutes,
            expectedProgressPercentage,
            currentDay,
            totalDays: plan.totalDays,
            isAhead: progressPercentage > expectedProgressPercentage,
            isBehind: progressPercentage < expectedProgressPercentage - 5, // 5% 이상 뒤처진 경우
        };

    } catch (error) {
        console.error('진행률 계산 오류:', error);
        return {
            progressPercentage: 0,
            readChapters: 0,
            totalChapters: plan.totalChapters || 0,
            totalReadMinutes: 0,
            totalMinutes: plan.totalMinutes || 0,
            expectedProgressPercentage: 0,
            currentDay: 1,
            totalDays: plan.totalDays || 1,
            isAhead: false,
            isBehind: false,
        };
    }
};

/**
 * 장 상태 확인 (오늘/어제/놓친/미래/완료)
 */
export const getChapterStatusFromPlan = (
    plan: TimeBasedBiblePlan,
    book: string,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    try {
        // 읽기 완료 확인
        if (isChapterRead(plan, book, chapter)) {
            return 'completed';
        }

        const currentDay = getCurrentDayFromPlan(plan);

        // 해당 장이 몇 일차에 해당하는지 찾기
        let chapterDay = 0;
        for (const schedule of plan.dailyReadingSchedule) {
            const found = schedule.chapters.find(ch => ch.book === book && ch.chapter === chapter);
            if (found) {
                chapterDay = schedule.day;
                break;
            }
        }

        if (chapterDay === 0) return 'normal'; // 계획에 없는 장

        if (chapterDay === currentDay) return 'today';
        if (chapterDay === currentDay - 1) return 'yesterday';
        if (chapterDay < currentDay) return 'missed';
        if (chapterDay > currentDay) return 'future';

        return 'normal';

    } catch (error) {
        console.error('장 상태 확인 오류:', error);
        return 'normal';
    }
};

/**
 * 계획 이름 가져오기
 */
const getPlanName = (planType: string): string => {
    const names: { [key: string]: string } = {
        'whole': '성경 전체',
        'ot': '구약성경',
        'nt': '신약성경',
        'psalms': '시편',
        'gospels': '사복음서',
        'pentateuch': '모세오경',
        'wisdom': '지혜서',
        'prophets': '예언서',
        'pauline': '바울서신'
    };

    return names[planType] || '성경 읽기';
};

/**
 * 시간 포맷팅 유틸리티
 */
export const formatTime = (seconds: number): string => {
    try {
        if (seconds < 60) {
            return `${seconds}초`;
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (remainingSeconds === 0) {
            return `${minutes}분`;
        } else {
            return `${minutes}분 ${remainingSeconds}초`;
        }

    } catch (error) {
        console.error('시간 포맷팅 오류:', error);
        return '0초';
    }
};

/**
 * 날짜 포맷팅 유틸리티
 */
export const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const weekday = weekdays[date.getDay()];

        return `${month}월 ${day}일 (${weekday})`;

    } catch (error) {
        console.error('날짜 포맷팅 오류:', error);
        return dateString;
    }
};

/**
 * 계획 유효성 검증
 */
export const validateTimeBasedPlan = (plan: any): plan is TimeBasedBiblePlan => {
    try {
        return (
            plan &&
            typeof plan === 'object' &&
            plan.isTimeBasedCalculation === true &&
            typeof plan.planType === 'string' &&
            typeof plan.startDate === 'string' &&
            typeof plan.endDate === 'string' &&
            typeof plan.totalDays === 'number' &&
            Array.isArray(plan.dailyReadingSchedule) &&
            Array.isArray(plan.readChapters)
        );
    } catch (error) {
        console.error('계획 유효성 검증 오류:', error);
        return false;
    }
};

/**
 * 통계 정보 계산
 */
export const calculatePlanStatistics = (plan: TimeBasedBiblePlan) => {
    try {
        const progress = calculateTimeBasedProgress(plan);
        const currentDay = getCurrentDayFromPlan(plan);

        // 읽기 속도 계산 (장/일)
        const daysElapsed = Math.max(1, currentDay - 1);
        const readingVelocity = daysElapsed > 0 ? progress.readChapters / daysElapsed : 0;

        // 예상 완료일 계산
        const remainingChapters = plan.totalChapters - progress.readChapters;
        const estimatedDaysToComplete = readingVelocity > 0 ? Math.ceil(remainingChapters / readingVelocity) : 0;

        // 일정 준수율
        const adherenceRate = progress.expectedProgressPercentage > 0
            ? Math.round((progress.progressPercentage / progress.expectedProgressPercentage) * 100)
            : 100;

        return {
            ...progress,
            readingVelocity: Math.round(readingVelocity * 10) / 10, // 소수점 1자리
            estimatedDaysToComplete,
            adherenceRate: Math.min(100, adherenceRate), // 100% 초과 방지
            daysElapsed,
            remainingDays: Math.max(0, plan.totalDays - currentDay + 1)
        };

    } catch (error) {
        console.error('통계 계산 오류:', error);
        return calculateTimeBasedProgress(plan);
    }
};

/**
 * 일정 재조정 (늦어진 경우)
 */
export const adjustPlanSchedule = (plan: TimeBasedBiblePlan): TimeBasedBiblePlan => {
    try {
        const currentDay = getCurrentDayFromPlan(plan);
        const progress = calculateTimeBasedProgress(plan);

        // 5% 이상 뒤처진 경우에만 재조정
        if (!progress.isBehind) {
            return plan;
        }

        console.log('📈 일정 재조정 시작...');

        // 읽지 않은 장들 수집
        const unreadChapters: ChapterReading[] = [];

        plan.dailyReadingSchedule.forEach(daySchedule => {
            if (daySchedule.day >= currentDay) {
                daySchedule.chapters.forEach(chapter => {
                    if (!isChapterRead(plan, chapter.book, chapter.chapter)) {
                        unreadChapters.push(chapter);
                    }
                });
            }
        });

        // 남은 일수 계산
        const remainingDays = Math.max(1, plan.totalDays - currentDay + 1);

        // 새로운 일정 생성
        const adjustedSchedule = distributeChaptersByTime(
            unreadChapters,
            remainingDays,
            new Date().toISOString().split('T')[0]
        );

        // 기존 완료된 일정과 새 일정 합치기
        const finalSchedule = [...plan.dailyReadingSchedule];

        adjustedSchedule.forEach((newDay, index) => {
            const targetDayIndex = currentDay - 1 + index;
            if (targetDayIndex < finalSchedule.length) {
                finalSchedule[targetDayIndex] = {
                    ...newDay,
                    day: currentDay + index,
                    date: finalSchedule[targetDayIndex].date
                };
            }
        });

        console.log('✅ 일정 재조정 완료');

        return {
            ...plan,
            dailyReadingSchedule: finalSchedule,
            version: plan.version + '_adjusted'
        };

    } catch (error) {
        console.error('일정 재조정 오류:', error);
        return plan;
    }
};