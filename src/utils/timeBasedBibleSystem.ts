// src/utils/timeBasedBibleSystem.ts
// 🔥 완전한 시간 기반 성경 읽기 시스템 - 음성파일 길이 기반

import { BibleStep } from './define';
import { calculateTotalPsalmsTime, optimizePsalmsFor25Days } from './psalmsCalculationFix';
// === 타입 정의 ===
export interface TimeBasedBiblePlan {
    planType: string;
    planName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    calculatedMinutesPerDay: number;  // 시작일~종료일 기간 기반 자동 계산된 하루 시간
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
}

export interface ReadChapterStatus {
    book: number;
    chapter: number;
    bookName: string;
    date: string;
    isRead: boolean;
    estimatedMinutes: number;  // 해당 장의 예상 읽기 시간
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
}

export interface DailyReading {
    day: number;
    date: string;
    chapters: ReadChapterStatus[];
    totalMinutes: number;
    isCompleted: boolean;
}

// === 음성 파일 시간 데이터 관리 ===
let chapterTimeMap: Map<string, number> = new Map();

/**
 * 음성파일길이.csv 데이터로 장별 시간 초기화
 */
export const initializePeriodBasedBibleSystem = async (): Promise<boolean> => {
    try {
        // CSV 파일 읽기 시도
        const fileContent = await window.fs.readFile('음성파일길이.csv', { encoding: 'utf8' });

        // 제공된 음성파일 데이터 파싱
        const lines = fileContent.split('\n').filter(line => line.trim());

        // CSV 파싱이 아닌 제공된 형식 파싱
        const audioData = parseProvidedAudioData(fileContent);

        chapterTimeMap.clear();

        // 성경 약자 매핑
        const bookMapping: { [key: string]: number } = {
            'Gen': 1, 'Exo': 2, 'Lev': 3, 'Num': 4, 'Deu': 5, 'Jos': 6, 'Jdg': 7, 'Rut': 8,
            '1Sa': 9, '2Sa': 10, '1Ki': 11, '2Ki': 12, '1Ch': 13, '2Ch': 14, 'Ezr': 15, 'Neh': 16,
            'Est': 17, 'Job': 18, 'Psa': 19, 'Pro': 20, 'Ecc': 21, 'Son': 22, 'Isa': 23, 'Jer': 24,
            'Lam': 25, 'Eze': 26, 'Dan': 27, 'Hos': 28, 'Joe': 29, 'Amo': 30, 'Oba': 31, 'Jon': 32,
            'Mic': 33, 'Nah': 34, 'Hab': 35, 'Zep': 36, 'Hag': 37, 'Zec': 38, 'Mal': 39,
            'Mat': 40, 'Mar': 41, 'Luk': 42, 'Joh': 43, 'Act': 44, 'Rom': 45, '1Co': 46, '2Co': 47,
            'Gal': 48, 'Eph': 49, 'Phi': 50, 'Col': 51, '1Th': 52, '2Th': 53, '1Ti': 54, '2Ti': 55,
            'Tit': 56, 'Phm': 57, 'Heb': 58, 'Jam': 59, '1Pe': 60, '2Pe': 61, '1Jo': 62, '2Jo': 63,
            '3Jo': 64, 'Jud': 65, 'Rev': 66
        };

        // 제공된 데이터로 시간 맵 구성
        audioData.forEach(({ book, chapter, minutes }: any) => {
            const key = `${book}_${chapter}`;
            chapterTimeMap.set(key, minutes);
        });

        console.log(`✅ 음성파일 기반 장별 시간 데이터 로드 완료: ${chapterTimeMap.size}개`);
        return true;

    } catch (error) {
        console.warn('⚠️ 음성 데이터 로드 실패, 기본 추정치 사용:', error);
        initializeDefaultTimes();
        return false;
    }
};

/**
 * 제공된 음성파일 데이터 형식 파싱
 */
const parseProvidedAudioData = (data: string) => {
    const audioData: any[] = [];

    // 제공된 예시 데이터 형식으로 파싱
    // "Gen창세기Exo출애굽기..." 형식과 시간 정보 파싱

    // 예시: "Gen001 (4:31), Gen002 (3:22)" 형식으로 가정
    const chapterPattern = /([A-Za-z0-9]+)(\d{3})\s*\((\d+):(\d+)\)/g;
    let match;

    while ((match = chapterPattern.exec(data)) !== null) {
        const [, bookCode, chapterStr, minutes, seconds] = match;
        const chapterNum = parseInt(chapterStr, 10);
        const totalMinutes = parseInt(minutes) + parseInt(seconds) / 60;

        // 북코드를 북번호로 변환
        const bookMapping: { [key: string]: number } = {
            'Gen': 1, 'Exo': 2, 'Lev': 3, 'Num': 4, 'Deu': 5, 'Jos': 6, 'Jdg': 7, 'Rut': 8,
            '1Sa': 9, '2Sa': 10, '1Ki': 11, '2Ki': 12, '1Ch': 13, '2Ch': 14, 'Ezr': 15, 'Neh': 16,
            'Est': 17, 'Job': 18, 'Psa': 19, 'Pro': 20, 'Ecc': 21, 'Son': 22, 'Isa': 23, 'Jer': 24,
            'Lam': 25, 'Eze': 26, 'Dan': 27, 'Hos': 28, 'Joe': 29, 'Amo': 30, 'Oba': 31, 'Jon': 32,
            'Mic': 33, 'Nah': 34, 'Hab': 35, 'Zep': 36, 'Hag': 37, 'Zec': 38, 'Mal': 39,
            'Mat': 40, 'Mar': 41, 'Luk': 42, 'Joh': 43, 'Act': 44, 'Rom': 45, '1Co': 46, '2Co': 47,
            'Gal': 48, 'Eph': 49, 'Phi': 50, 'Col': 51, '1Th': 52, '2Th': 53, '1Ti': 54, '2Ti': 55,
            'Tit': 56, 'Phm': 57, 'Heb': 58, 'Jam': 59, '1Pe': 60, '2Pe': 61, '1Jo': 62, '2Jo': 63,
            '3Jo': 64, 'Jud': 65, 'Rev': 66
        };

        const bookNumber = bookMapping[bookCode];
        if (bookNumber) {
            audioData.push({
                book: bookNumber,
                chapter: chapterNum,
                minutes: totalMinutes
            });
        }
    }

    return audioData;
};

/**
 * 기본 추정 시간으로 초기화
 */
const initializeDefaultTimes = () => {
    chapterTimeMap.clear();

    BibleStep.forEach(book => {
        for (let chapter = 1; chapter <= book.count; chapter++) {
            const key = `${book.index}_${chapter}`;
            let estimatedTime = 4.0; // 기본 4분

            // 성경별 시간 추정
            if (book.index === 19) estimatedTime = 2.5;      // 시편
            else if (book.index === 20) estimatedTime = 3.5; // 잠언
            else if (book.index <= 39) estimatedTime = 4.0;  // 구약
            else estimatedTime = 4.2;                        // 신약

            chapterTimeMap.set(key, estimatedTime);
        }
    });
};

/**
 * 특정 장의 예상 읽기 시간 반환 (분)
 */
export const getChapterReadingTime = (book: number, chapter: number): number => {
    const key = `${book}_${chapter}`;
    return chapterTimeMap.get(key) || 4.0;
};

/**
 * 계획별 성경 범위 반환
 */
export const getBookRangeForPlan = (planType: string): { start: number, end: number } => {
    switch (planType) {
        case 'full_bible': return { start: 1, end: 66 };
        case 'old_testament': return { start: 1, end: 39 };
        case 'new_testament': return { start: 40, end: 66 };
        case 'pentateuch': return { start: 1, end: 5 };
        case 'psalms': return { start: 19, end: 19 };
        default: return { start: 1, end: 66 };
    }
};

/**
 * 🔥 핵심 함수: 시간 기반으로 장을 나누되 종료일까지의 기간으로 하루 시간 자동 계산
 */
export const divideChaptersByPeriod = (
    planType: string,
    startDate: string,
    endDate: string
): TimeBasedBiblePlan => {
    console.log(`📊 시간 기반 계획 생성: ${planType}, ${startDate} ~ ${endDate}`);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 🔥 시편 전용 처리
    if (planType === 'psalms') {
        const totalTime = calculateTotalPsalmsTime(); // 375분
        const calculatedMinutesPerDay = Math.round((totalTime / totalDays) * 10) / 10;

        // 25일 계획의 경우 최적화 적용
        if (totalDays === 25) {
            const optimized = optimizePsalmsFor25Days();
            return {
                planType,
                planName: '시편',
                startDate,
                endDate,
                totalDays,
                calculatedMinutesPerDay: optimized.recommendedTimePerDay, // 정확한 15분
                totalMinutes: Math.round(totalTime),
                totalChapters: 150,
                isTimeBasedCalculation: true,
                currentDay: 1,
                readChapters: [],
                dailyReadingSchedule: optimized.dailySchedule,
                createdAt: new Date().toISOString(),
                version: '2.1_psalms_optimized'
            };
        }

        // 다른 기간의 시편 계획
        return {
            planType,
            planName: '시편',
            startDate,
            endDate,
            totalDays,
            calculatedMinutesPerDay,
            totalMinutes: Math.round(totalTime),
            totalChapters: 150,
            isTimeBasedCalculation: true,
            currentDay: 1,
            readChapters: [],
            dailyReadingSchedule: [],
            createdAt: new Date().toISOString(),
            version: '2.1_psalms_optimized'
        };
    }

    // 기존 로직 유지 (다른 계획들)
    const bookRange = getBookRangeForPlan(planType);
    let totalMinutes = 0;
    let totalChapters = 0;

    for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            totalMinutes += getChapterReadingTime(book, chapter);
            totalChapters++;
        }
    }

    const calculatedMinutesPerDay = Math.round((totalMinutes / totalDays) * 10) / 10;
    const dailyReadingSchedule = createDailyScheduleByTime(
        bookRange,
        calculatedMinutesPerDay,
        totalDays,
        startDate
    );

    const planNames: { [key: string]: string } = {
        'full_bible': '성경',
        'old_testament': '구약',
        'new_testament': '신약',
        'pentateuch': '모세오경',
        'psalms': '시편'
    };

    return {
        planType,
        planName: planNames[planType] || '성경',
        startDate,
        endDate,
        totalDays,
        calculatedMinutesPerDay,
        totalMinutes: Math.round(totalMinutes),
        totalChapters,
        isTimeBasedCalculation: true,
        currentDay: 1,
        readChapters: [],
        dailyReadingSchedule,
        createdAt: new Date().toISOString(),
        version: '2.1'
    };
};

/**
 * 🔥 시간 기준으로 매일 읽을 장 나누기
 */
const createDailyScheduleByTime = (
    bookRange: { start: number, end: number },
    targetMinutesPerDay: number,
    totalDays: number,
    startDate: string
): DailyReadingSchedule[] => {
    const schedule: DailyReadingSchedule[] = [];
    let currentBook = bookRange.start;
    let currentChapter = 1;

    for (let day = 1; day <= totalDays; day++) {
        const daySchedule: DailyReadingSchedule = {
            day,
            date: new Date(new Date(startDate).getTime() + (day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            chapters: [],
            totalMinutes: 0
        };

        // 하루 목표 시간까지 장을 추가
        while (daySchedule.totalMinutes < targetMinutesPerDay && currentBook <= bookRange.end) {
            const bookInfo = BibleStep.find(step => step.index === currentBook);
            if (!bookInfo) {
                currentBook++;
                currentChapter = 1;
                continue;
            }

            if (currentChapter > bookInfo.count) {
                currentBook++;
                currentChapter = 1;
                continue;
            }

            const chapterTime = getChapterReadingTime(currentBook, currentChapter);

            // 장의 총 합이 목표 시간을 넘어가도 해당 장까지는 하루에 포함
            daySchedule.chapters.push({
                book: currentBook,
                chapter: currentChapter,
                bookName: bookInfo.name,
                estimatedMinutes: chapterTime
            });
            daySchedule.totalMinutes += chapterTime;

            currentChapter++;
        }

        schedule.push(daySchedule);

        // 모든 장을 다 읽었으면 종료
        if (currentBook > bookRange.end) {
            break;
        }
    }

    return schedule;
};

/**
 * 현재 날짜 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
};

/**
 * 특정 날짜의 읽기 계획 반환
 */
export const getDailyReading = (planData: TimeBasedBiblePlan, day: number): DailyReading | null => {
    const schedule = planData.dailyReadingSchedule.find(s => s.day === day);
    if (!schedule) return null;

    const chapters: ReadChapterStatus[] = schedule.chapters.map(ch => {
        const readStatus = planData.readChapters.find(
            r => r.book === ch.book && r.chapter === ch.chapter
        );

        return {
            book: ch.book,
            chapter: ch.chapter,
            bookName: ch.bookName,
            date: schedule.date,
            isRead: readStatus?.isRead || false,
            estimatedMinutes: ch.estimatedMinutes
        };
    });

    return {
        day: schedule.day,
        date: schedule.date,
        chapters,
        totalMinutes: schedule.totalMinutes,
        isCompleted: chapters.every(ch => ch.isRead)
    };
};

/**
 * 오늘 읽어야 할 장들 반환
 */
export const getTodayChapters = (planData: TimeBasedBiblePlan): ReadChapterStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const todayReading = getDailyReading(planData, currentDay);
    return todayReading?.chapters || [];
};

/**
 * 진행률 계산
 */
export const calculatePeriodBasedProgress = (planData: TimeBasedBiblePlan) => {
    const currentDay = getCurrentDay(planData.startDate);
    const readChapters = planData.readChapters.filter(r => r.isRead);

    // 읽은 총 시간 계산
    const readMinutes = readChapters.reduce((sum, r) => sum + r.estimatedMinutes, 0);

    // 진행률 계산
    const progressPercentage = Math.min(100, (readMinutes / planData.totalMinutes) * 100);

    return {
        currentDay: Math.min(currentDay, planData.totalDays),
        totalDays: planData.totalDays,
        readChapters: readChapters.length,
        totalChapters: planData.totalChapters,
        readMinutes,
        totalMinutes: planData.totalMinutes,
        progressPercentage: Math.round(progressPercentage * 10) / 10,
        targetMinutesPerDay: planData.calculatedMinutesPerDay
    };
};

/**
 * 장을 읽음 처리
 */
export const markChapterAsRead = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): TimeBasedBiblePlan => {
    const estimatedMinutes = getChapterReadingTime(book, chapter);
    const bookInfo = BibleStep.find(step => step.index === book);

    const updatedReadChapters = [...planData.readChapters];
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === book && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString()
        };
    } else {
        updatedReadChapters.push({
            book,
            chapter,
            bookName: bookInfo?.name || '',
            date: new Date().toISOString(),
            isRead: true,
            estimatedMinutes
        });
    }

    return {
        ...planData,
        readChapters: updatedReadChapters,
        lastModified: new Date().toISOString()
    };
};

/**
 * 계획 검증
 */
export const validatePlanData = (planData: any): boolean => {
    return !!(
        planData &&
        planData.isTimeBasedCalculation &&
        planData.startDate &&
        planData.endDate &&
        planData.totalDays > 0 &&
        planData.calculatedMinutesPerDay > 0 &&
        planData.dailyReadingSchedule &&
        Array.isArray(planData.dailyReadingSchedule)
    );
};

/**
 * 유틸리티 함수들
 */
export const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes)}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export const getEstimatedCompletionDate = (startDate: string, totalDays: number): string => {
    const start = new Date(startDate);
    const completion = new Date(start.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);
    return completion.toISOString().split('T')[0];
};

export const getProgressIndicator = (progressPercentage: number): string => {
    if (progressPercentage >= 80) return '🔥 거의 완주!';
    if (progressPercentage >= 60) return '💪 순조하게 진행 중';
    if (progressPercentage >= 40) return '📖 꾸준히 읽고 있어요';
    if (progressPercentage >= 20) return '🌱 좋은 시작이에요';
    return '📚 이제 시작해볼까요?';
};