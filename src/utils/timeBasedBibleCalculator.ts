// utils/timeBasedBibleCalculator.ts
// 오디오 시간 기반 성경일독 계산 모듈

import { BibleStep } from './define';
import { defaultStorage } from './mmkv';

// 타입 정의
export interface AudioChapterData {
    book: number;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

export interface TimeBasedReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    estimatedMinutes: number;
}

export interface TimeBasedPlanData {
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;

    // 시간 기반 데이터
    targetMinutesPerDay: number;
    totalMinutes: number;
    isTimeBasedCalculation: true;

    // 기존 UI 호환성을 위한 데이터
    chaptersPerDay: number;
    totalChapters: number;

    readChapters: TimeBasedReadingStatus[];
    createdAt: string;
}

// 오디오 데이터 저장소
let audioDataMap: Map<string, AudioChapterData> = new Map();

/**
 * CSV 데이터로부터 오디오 시간 데이터 초기화
 */
export const initializeAudioData = (csvData: any[]) => {
    audioDataMap.clear();

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

    csvData.forEach(row => {
        const filename = row.filename;
        const duration = row.duration;

        if (filename && duration) {
            const match = filename.match(/^([A-Za-z0-9]+)(\d{3})$/);
            if (match) {
                const bookCode = match[1];
                const chapter = parseInt(match[2], 10);
                const bookNumber = bookMapping[bookCode];

                if (bookNumber) {
                    const [minutes, seconds] = duration.split(':').map(Number);
                    const totalSeconds = minutes * 60 + seconds;

                    const key = `${bookNumber}_${chapter}`;
                    audioDataMap.set(key, {
                        book: bookNumber,
                        chapter: chapter,
                        minutes: minutes,
                        seconds: seconds,
                        totalSeconds: totalSeconds
                    });
                }
            }
        }
    });

    console.log(`✅ 오디오 데이터 ${audioDataMap.size}개 초기화 완료`);
};

/**
 * 특정 장의 오디오 재생 시간 가져오기 (분 단위)
 */
export const getChapterAudioMinutes = (book: number, chapter: number): number => {
    const key = `${book}_${chapter}`;
    const data = audioDataMap.get(key);

    if (data) {
        return data.minutes + (data.seconds / 60);
    }

    // 기본값: 평균 3분 30초
    return 3.5;
};

/**
 * 계획 범위의 전체 오디오 시간 계산
 */
export const calculateTotalMinutes = (planType: string): number => {
    const bookRange = getBookRangeForPlan(planType);
    let totalMinutes = 0;

    for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (bookInfo) {
            for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                totalMinutes += getChapterAudioMinutes(book, chapter);
            }
        }
    }

    return Math.round(totalMinutes);
};

/**
 * 계획 유형에 따른 성경 범위 가져오기
 */
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
 * 시간 기반 일독 계획 생성
 */
export const createTimeBasedPlan = (
    planType: string,
    planName: string,
    startDate: string,
    targetDate: string
): TimeBasedPlanData => {
    const start = new Date(startDate);
    const end = new Date(targetDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 전체 오디오 시간 계산
    const totalMinutes = calculateTotalMinutes(planType);
    const targetMinutesPerDay = Math.ceil(totalMinutes / totalDays);

    // 전체 장수 계산 (UI 표시용)
    const bookRange = getBookRangeForPlan(planType);
    let totalChapters = 0;
    for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (bookInfo) {
            totalChapters += bookInfo.count;
        }
    }

    // UI 표시용 평균 장수 계산
    const averageMinutesPerChapter = totalMinutes / totalChapters;
    const chaptersPerDay = Math.round(targetMinutesPerDay / averageMinutesPerChapter);

    return {
        planType,
        planName,
        startDate,
        targetDate,
        totalDays,
        targetMinutesPerDay,
        totalMinutes,
        isTimeBasedCalculation: true,
        chaptersPerDay,
        totalChapters,
        readChapters: [],
        createdAt: new Date().toISOString()
    };
};

/**
 * 오늘 읽어야 할 장들 계산 (시간 기반)
 */
export const getTodayChaptersTimeBase = (planData: TimeBasedPlanData): TimeBasedReadingStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const targetMinutes = planData.targetMinutesPerDay;

    // 이미 읽은 장들 제외하고 다음 장부터 시작
    const readChapterKeys = new Set(
        planData.readChapters
            .filter(r => r.isRead)
            .map(r => `${r.book}_${r.chapter}`)
    );

    const bookRange = getBookRangeForPlan(planData.planType);
    const todayChapters: TimeBasedReadingStatus[] = [];
    let accumulatedMinutes = 0;

    // 모든 장을 순회하면서 오늘 읽을 장 선택
    outerLoop: for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            const key = `${book}_${chapter}`;

            // 이미 읽은 장은 건너뛰기
            if (readChapterKeys.has(key)) continue;

            const chapterMinutes = getChapterAudioMinutes(book, chapter);

            // 첫 장이거나 시간이 여유있으면 추가
            if (todayChapters.length === 0 ||
                accumulatedMinutes + chapterMinutes <= targetMinutes * 1.1) { // 10% 여유

                todayChapters.push({
                    book,
                    chapter,
                    date: new Date().toISOString(),
                    isRead: false,
                    estimatedMinutes: Math.round(chapterMinutes)
                });

                accumulatedMinutes += chapterMinutes;

                // 목표 시간에 충분히 가까우면 종료
                if (accumulatedMinutes >= targetMinutes * 0.9) {
                    break outerLoop;
                }
            } else {
                // 목표 시간 초과하면 종료
                break outerLoop;
            }
        }
    }

    return todayChapters;
};

/**
 * 장 상태 확인 (시간 기반)
 */
export const getChapterStatusTimeBase = (
    planData: TimeBasedPlanData,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    // 읽기 완료 확인
    const isRead = planData.readChapters.some(
        r => r.book === book && r.chapter === chapter && r.isRead
    );
    if (isRead) return 'completed';

    // 오늘 읽을 장 확인
    const todayChapters = getTodayChaptersTimeBase(planData);
    const isToday = todayChapters.some(
        ch => ch.book === book && ch.chapter === chapter
    );
    if (isToday) return 'today';

    // 계획 범위 내인지 확인
    const bookRange = getBookRangeForPlan(planData.planType);
    if (book < bookRange.start || book > bookRange.end) return 'normal';

    // 읽어야 했던 장인지 확인 (시간 기준)
    const totalReadMinutes = planData.readChapters
        .filter(r => r.isRead)
        .reduce((sum, r) => sum + r.estimatedMinutes, 0);

    const currentDay = getCurrentDay(planData.startDate);
    const shouldHaveReadMinutes = Math.min(
        currentDay * planData.targetMinutesPerDay,
        planData.totalMinutes
    );

    // 이 장까지의 누적 시간 계산
    let cumulativeMinutes = 0;
    for (let b = bookRange.start; b <= book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (!bookInfo) continue;

        const maxChapter = (b === book) ? chapter : bookInfo.count;
        for (let c = 1; c <= maxChapter; c++) {
            cumulativeMinutes += getChapterAudioMinutes(b, c);
        }
    }

    // 읽어야 했던 시간 범위에 포함되는지 확인
    if (cumulativeMinutes <= shouldHaveReadMinutes) {
        return 'missed';
    }

    return 'future';
};

/**
 * 진행률 계산 (시간 기반)
 */
export const calculateProgressTimeBase = (planData: TimeBasedPlanData) => {
    const readChapters = planData.readChapters.filter(r => r.isRead);
    const readMinutes = readChapters.reduce((sum, r) => sum + r.estimatedMinutes, 0);

    const currentDay = getCurrentDay(planData.startDate);
    const daysPercentage = Math.min((currentDay / planData.totalDays) * 100, 100);

    return {
        // 기존 UI 호환성을 위한 데이터
        chaptersPerDay: planData.chaptersPerDay,
        totalChapters: planData.totalChapters,
        readChapters: readChapters.length,
        progressPercentage: (readChapters.length / planData.totalChapters) * 100,

        // 시간 기반 데이터
        readMinutes: Math.round(readMinutes),
        totalMinutes: Math.round(planData.totalMinutes),
        targetMinutesPerDay: planData.targetMinutesPerDay,
        timeProgressPercentage: (readMinutes / planData.totalMinutes) * 100,

        daysProgress: {
            current: currentDay,
            total: planData.totalDays,
            percentage: daysPercentage
        }
    };
};

/**
 * 현재 날짜 기준 일차 계산
 */
const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * 놓친 장 개수 계산 (시간 기반)
 */
export const calculateMissedChaptersTimeBase = (planData: TimeBasedPlanData): number => {
    let missedCount = 0;
    const bookRange = getBookRangeForPlan(planData.planType);

    // 읽은 장들 Set
    const readChapterKeys = new Set(
        planData.readChapters
            .filter(r => r.isRead)
            .map(r => `${r.book}_${r.chapter}`)
    );

    // 현재까지 읽어야 할 시간
    const currentDay = getCurrentDay(planData.startDate);
    const shouldHaveReadMinutes = Math.min(
        currentDay * planData.targetMinutesPerDay,
        planData.totalMinutes
    );

    // 순차적으로 장을 확인하면서 놓친 장 계산
    let accumulatedMinutes = 0;
    for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            const key = `${book}_${chapter}`;
            const chapterMinutes = getChapterAudioMinutes(book, chapter);

            if (accumulatedMinutes + chapterMinutes <= shouldHaveReadMinutes) {
                if (!readChapterKeys.has(key)) {
                    missedCount++;
                }
                accumulatedMinutes += chapterMinutes;
            } else {
                // 읽어야 할 시간을 초과하면 중단
                return missedCount;
            }
        }
    }

    return missedCount;
};