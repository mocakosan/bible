// utils/timeBasedBibleSystem.ts
// 오디오 시간 기반 성경일독 시스템 - 기존 코드와 완전 호환

import { BibleStep } from './define';
import { defaultStorage } from './mmkv';
import Papa from 'papaparse';

// ==================== 타입 정의 ====================
export interface AudioChapterInfo {
    book: number;
    chapter: number;
    bookCode: string;
    bookName: string;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

export interface TimeBasedReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    estimatedMinutes?: number; // 시간 기반 추가 정보
}

export interface TimeBasedBiblePlan {
    // 기존 필드 유지
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;
    chaptersPerDay: number; // UI 표시용
    totalChapters: number;
    currentDay: number;
    readChapters: TimeBasedReadingStatus[];
    createdAt: string;

    // 시간 기반 추가 필드
    isTimeBasedCalculation?: boolean;
    targetMinutesPerDay?: number;
    totalMinutes?: number;
    minutesPerDay?: number; // 실제 하루 목표 시간
    dailyReadingPlan?: DailyReading[]; // 일별 읽기 계획
}

export interface DailyReading {
    day: number;
    date: string;
    chapters: ChapterInfo[];
    totalMinutes: number;
    isCompleted?: boolean;
}

export interface ChapterInfo {
    book: number;
    chapter: number;
    bookName: string;
    minutes: number;
}

// ==================== 전역 데이터 저장소 ====================
let audioDataMap: Map<string, AudioChapterInfo> = new Map();
let isAudioDataInitialized = false;

// 책 코드와 번호 매핑
const BOOK_CODE_TO_NUMBER: { [key: string]: number } = {
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

// ==================== CSV 데이터 초기화 ====================
export const initializeAudioData = async (csvContent?: string): Promise<boolean> => {
    try {
        if (!csvContent) {
            // 저장된 데이터에서 로드 시도
            const savedData = defaultStorage.getString('bible_audio_data_map');
            if (savedData) {
                const parsedMap = JSON.parse(savedData);
                audioDataMap = new Map(Object.entries(parsedMap));
                isAudioDataInitialized = true;
                console.log('✅ 저장된 오디오 데이터 로드 완료:', audioDataMap.size, '개 항목');
                return true;
            }
            return false;
        }

        // CSV 파싱
        const parsed = Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length > 0) {
            console.error('CSV 파싱 오류:', parsed.errors);
            return false;
        }

        audioDataMap.clear();

        parsed.data.forEach((row: any) => {
            const filename = row.filename;
            const duration = row.duration;
            const bookAndChapter = row.book_and_chapter;

            if (filename && duration && bookAndChapter) {
                const match = filename.match(/^([A-Za-z0-9]+)(\d{3})$/);
                if (match) {
                    const bookCode = match[1];
                    const chapter = parseInt(match[2], 10);
                    const bookNumber = BOOK_CODE_TO_NUMBER[bookCode];

                    if (bookNumber) {
                        const [minutes, seconds] = duration.split(':').map(Number);
                        const totalSeconds = minutes * 60 + seconds;
                        const bookName = bookAndChapter.split(' ')[0];

                        const key = `${bookNumber}_${chapter}`;
                        audioDataMap.set(key, {
                            book: bookNumber,
                            chapter,
                            bookCode,
                            bookName,
                            minutes,
                            seconds,
                            totalSeconds
                        });
                    }
                }
            }
        });

        // 데이터 저장
        const mapObject: { [key: string]: AudioChapterInfo } = {};
        audioDataMap.forEach((value, key) => {
            mapObject[key] = value;
        });
        defaultStorage.set('bible_audio_data_map', JSON.stringify(mapObject));

        isAudioDataInitialized = true;
        console.log('✅ 오디오 데이터 초기화 완료:', audioDataMap.size, '개 항목');
        return true;
    } catch (error) {
        console.error('오디오 데이터 초기화 실패:', error);
        return false;
    }
};

// ==================== 시간 계산 함수 ====================
export const getChapterAudioMinutes = (book: number, chapter: number): number => {
    const key = `${book}_${chapter}`;
    const data = audioDataMap.get(key);

    if (data) {
        return data.minutes + (data.seconds / 60);
    }

    // 기본값: 장당 평균 4분
    return 4;
};

export const calculateTotalMinutes = (planType: string): number => {
    const range = getBookRangeForPlan(planType);
    let totalMinutes = 0;

    for (let book = range.start; book <= range.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (bookInfo) {
            for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                totalMinutes += getChapterAudioMinutes(book, chapter);
            }
        }
    }

    return Math.round(totalMinutes);
};

// ==================== 일독 계획 생성 (시간 기반) ====================
export const createTimeBasedPlan = (
    planType: string,
    planName: string,
    startDate: string,
    targetDate: string
): TimeBasedBiblePlan => {
    const start = new Date(startDate);
    const end = new Date(targetDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 전체 시간 계산
    const totalMinutes = calculateTotalMinutes(planType);
    const targetMinutesPerDay = Math.ceil(totalMinutes / totalDays);

    // 전체 장수 계산
    const range = getBookRangeForPlan(planType);
    let totalChapters = 0;
    for (let book = range.start; book <= range.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (bookInfo) {
            totalChapters += bookInfo.count;
        }
    }

    // UI 표시용 평균 장수
    const avgMinutesPerChapter = totalMinutes / totalChapters;
    const chaptersPerDay = Math.round(targetMinutesPerDay / avgMinutesPerChapter);

    // 일별 읽기 계획 생성
    const dailyReadingPlan = generateDailyReadingPlan(
        planType,
        startDate,
        totalDays,
        targetMinutesPerDay
    );

    return {
        planType,
        planName,
        startDate,
        targetDate,
        totalDays,
        chaptersPerDay,
        totalChapters,
        currentDay: 1,
        readChapters: [],
        createdAt: new Date().toISOString(),
        isTimeBasedCalculation: true,
        targetMinutesPerDay,
        totalMinutes,
        minutesPerDay: targetMinutesPerDay,
        dailyReadingPlan
    };
};

// ==================== 일별 읽기 계획 생성 ====================
const generateDailyReadingPlan = (
    planType: string,
    startDate: string,
    totalDays: number,
    targetMinutesPerDay: number
): DailyReading[] => {
    const range = getBookRangeForPlan(planType);
    const dailyPlan: DailyReading[] = [];

    let currentBook = range.start;
    let currentChapter = 1;

    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day - 1);

        const chapters: ChapterInfo[] = [];
        let dayMinutes = 0;

        // 목표 시간에 도달할 때까지 장 추가
        while (dayMinutes < targetMinutesPerDay && currentBook <= range.end) {
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

            const chapterMinutes = getChapterAudioMinutes(currentBook, currentChapter);

            // 첫 장이거나 시간이 여유있으면 추가
            if (chapters.length === 0 || dayMinutes + chapterMinutes <= targetMinutesPerDay * 1.2) {
                chapters.push({
                    book: currentBook,
                    chapter: currentChapter,
                    bookName: bookInfo.name,
                    minutes: Math.round(chapterMinutes)
                });
                dayMinutes += chapterMinutes;
                currentChapter++;
            } else {
                break;
            }
        }

        dailyPlan.push({
            day,
            date: date.toISOString().split('T')[0],
            chapters,
            totalMinutes: Math.round(dayMinutes)
        });

        if (currentBook > range.end) break;
    }

    return dailyPlan;
};

// ==================== 오늘 읽을 장 계산 ====================
export const getTodayChapters = (planData: TimeBasedBiblePlan): TimeBasedReadingStatus[] => {
    // 데이터 검증
    if (!planData) return [];
    if (!planData.readChapters) planData.readChapters = [];

    if (!planData.isTimeBasedCalculation) {
        // 기존 로직 사용
        return getTodayChaptersLegacy(planData);
    }

    const currentDay = getCurrentDay(planData.startDate);

    // 일별 계획이 있는 경우
    if (planData.dailyReadingPlan && planData.dailyReadingPlan[currentDay - 1]) {
        const todayPlan = planData.dailyReadingPlan[currentDay - 1];
        return todayPlan.chapters.map(ch => ({
            book: ch.book,
            chapter: ch.chapter,
            date: new Date().toISOString(),
            isRead: isChapterRead(planData, ch.book, ch.chapter),
            estimatedMinutes: ch.minutes
        }));
    }

    // 동적 계산 (fallback)
    return calculateTodayChaptersDynamic(planData);
};

// 동적으로 오늘 읽을 장 계산
const calculateTodayChaptersDynamic = (planData: TimeBasedBiblePlan): TimeBasedReadingStatus[] => {
    const targetMinutes = planData.targetMinutesPerDay || planData.minutesPerDay || 30;
    const range = getBookRangeForPlan(planData.planType);

    // 이미 읽은 장들 제외
    const readKeys = new Set(
        (planData.readChapters || [])
            .filter(r => r && r.isRead)
            .map(r => `${r.book}_${r.chapter}`)
    );

    const todayChapters: TimeBasedReadingStatus[] = [];
    let accumulatedMinutes = 0;

    for (let book = range.start; book <= range.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            const key = `${book}_${chapter}`;
            if (readKeys.has(key)) continue;

            const minutes = getChapterAudioMinutes(book, chapter);

            if (todayChapters.length === 0 || accumulatedMinutes + minutes <= targetMinutes * 1.1) {
                todayChapters.push({
                    book,
                    chapter,
                    date: new Date().toISOString(),
                    isRead: false,
                    estimatedMinutes: Math.round(minutes)
                });
                accumulatedMinutes += minutes;

                if (accumulatedMinutes >= targetMinutes * 0.9) {
                    return todayChapters;
                }
            }
        }
    }

    return todayChapters;
};

// ==================== 장 상태 확인 ====================
export const getChapterStatus = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    // 데이터 검증
    if (!planData) return 'normal';
    if (!planData.readChapters) planData.readChapters = [];

    // 읽기 완료 확인
    if (isChapterRead(planData, book, chapter)) {
        return 'completed';
    }

    // 계획 범위 확인
    const range = getBookRangeForPlan(planData.planType);
    if (book < range.start || book > range.end) {
        return 'normal';
    }

    const currentDay = getCurrentDay(planData.startDate);

    // 시간 기반 계산
    if (planData.isTimeBasedCalculation && planData.dailyReadingPlan) {
        // 오늘 읽을 장
        const todayPlan = planData.dailyReadingPlan[currentDay - 1];
        if (todayPlan?.chapters?.some(ch => ch.book === book && ch.chapter === chapter)) {
            return 'today';
        }

        // 어제 읽어야 했던 장
        if (currentDay > 1) {
            const yesterdayPlan = planData.dailyReadingPlan[currentDay - 2];
            if (yesterdayPlan?.chapters?.some(ch => ch.book === book && ch.chapter === chapter)) {
                return 'yesterday';
            }
        }

        // 과거에 읽어야 했던 장
        for (let day = 0; day < currentDay - 2; day++) {
            const dayPlan = planData.dailyReadingPlan[day];
            if (dayPlan?.chapters?.some(ch => ch.book === book && ch.chapter === chapter)) {
                return 'missed';
            }
        }

        return 'future';
    }

    // 기존 장 기반 로직
    return getChapterStatusLegacy(planData, book, chapter);
};

// ==================== 진행률 계산 ====================
export const calculateProgress = (planData: TimeBasedBiblePlan) => {
    // 데이터 검증
    if (!planData) {
        return {
            chaptersPerDay: 0,
            totalChapters: 0,
            readChapters: 0,
            completedChapters: 0,
            progressPercentage: 0,
            daysProgress: {
                current: 0,
                total: 0,
                percentage: 0
            }
        };
    }
    if (!planData.readChapters) planData.readChapters = [];

    const readChapters = (planData.readChapters || []).filter(r => r && r.isRead);
    const currentDay = getCurrentDay(planData.startDate);

    // 시간 기반 계산
    if (planData.isTimeBasedCalculation) {
        const readMinutes = readChapters.reduce((sum, ch) => {
            return sum + getChapterAudioMinutes(ch.book, ch.chapter);
        }, 0);

        const timeProgressPercentage = planData.totalMinutes
            ? (readMinutes / planData.totalMinutes) * 100
            : 0;

        return {
            chaptersPerDay: planData.chaptersPerDay,
            totalChapters: planData.totalChapters,
            readChapters: readChapters.length,
            completedChapters: readChapters.length,
            progressPercentage: (readChapters.length / planData.totalChapters) * 100,
            readMinutes: Math.round(readMinutes),
            totalMinutes: planData.totalMinutes,
            timeProgressPercentage,
            targetMinutesPerDay: planData.targetMinutesPerDay,
            minutesPerDay: planData.minutesPerDay || planData.targetMinutesPerDay,
            daysProgress: {
                current: currentDay,
                total: planData.totalDays,
                percentage: (currentDay / planData.totalDays) * 100
            }
        };
    }

    // 기존 로직
    return {
        chaptersPerDay: planData.chaptersPerDay,
        totalChapters: planData.totalChapters,
        readChapters: readChapters.length,
        completedChapters: readChapters.length,
        progressPercentage: (readChapters.length / planData.totalChapters) * 100,
        daysProgress: {
            current: currentDay,
            total: planData.totalDays,
            percentage: (currentDay / planData.totalDays) * 100
        }
    };
};

// ==================== 놓친 장 계산 ====================
export const calculateMissedChapters = (planData: TimeBasedBiblePlan): number => {
    // 데이터 검증
    if (!planData) return 0;
    if (!planData.readChapters) planData.readChapters = [];

    const currentDay = getCurrentDay(planData.startDate);
    let missedCount = 0;

    if (planData.isTimeBasedCalculation && planData.dailyReadingPlan) {
        // 오늘 이전까지의 모든 장 확인
        for (let day = 0; day < currentDay - 1 && day < planData.dailyReadingPlan.length; day++) {
            const dayPlan = planData.dailyReadingPlan[day];
            if (dayPlan?.chapters) {
                dayPlan.chapters.forEach(ch => {
                    if (!isChapterRead(planData, ch.book, ch.chapter)) {
                        missedCount++;
                    }
                });
            }
        }
    } else {
        // 기존 로직
        const shouldHaveRead = Math.min((currentDay - 1) * planData.chaptersPerDay, planData.totalChapters);
        const actuallyRead = (planData.readChapters || []).filter(r => r && r.isRead).length;
        missedCount = Math.max(0, shouldHaveRead - actuallyRead);
    }

    return missedCount;
};

// ==================== 읽기 상태 업데이트 ====================
export const markChapterAsRead = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): TimeBasedBiblePlan => {
    // 데이터 검증
    if (!planData.readChapters) planData.readChapters = [];

    const updatedReadChapters = [...planData.readChapters];
    const existingIndex = updatedReadChapters.findIndex(
        r => r && r.book === book && r.chapter === chapter
    );

    const estimatedMinutes = getChapterAudioMinutes(book, chapter);

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex] = {
            ...updatedReadChapters[existingIndex],
            isRead: true,
            date: new Date().toISOString(),
            estimatedMinutes
        };
    } else {
        updatedReadChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: true,
            estimatedMinutes
        });
    }

    const updatedPlan = {
        ...planData,
        readChapters: updatedReadChapters
    };

    saveBiblePlanData(updatedPlan);
    return updatedPlan;
};

export const markChapterAsUnread = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): TimeBasedBiblePlan => {
    // 데이터 검증
    if (!planData.readChapters) planData.readChapters = [];

    const updatedReadChapters = planData.readChapters.filter(
        r => !(r && r.book === book && r.chapter === chapter)
    );

    const updatedPlan = {
        ...planData,
        readChapters: updatedReadChapters
    };

    saveBiblePlanData(updatedPlan);
    return updatedPlan;
};

// ==================== 유틸리티 함수 ====================
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

export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const isChapterRead = (planData: TimeBasedBiblePlan, book: number, chapter: number): boolean => {
    // 방어적 코딩: readChapters가 없거나 배열이 아닌 경우
    if (!planData || !planData.readChapters || !Array.isArray(planData.readChapters)) {
        return false;
    }

    return planData.readChapters.some(
        r => r && r.book === book && r.chapter === chapter && r.isRead === true
    );
};

// ==================== 레거시 함수들 (호환성) ====================
const getTodayChaptersLegacy = (planData: TimeBasedBiblePlan): TimeBasedReadingStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const startIndex = (currentDay - 1) * planData.chaptersPerDay;
    const endIndex = Math.min(startIndex + planData.chaptersPerDay, planData.totalChapters);

    const todayChapters: TimeBasedReadingStatus[] = [];
    let globalIndex = 0;

    const range = getBookRangeForPlan(planData.planType);

    for (let book = range.start; book <= range.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            if (globalIndex >= startIndex && globalIndex < endIndex) {
                todayChapters.push({
                    book,
                    chapter,
                    date: new Date().toISOString(),
                    isRead: isChapterRead(planData, book, chapter)
                });
            }
            globalIndex++;
        }
    }

    return todayChapters;
};

const getChapterStatusLegacy = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (isChapterRead(planData, book, chapter)) {
        return 'completed';
    }

    const currentDay = getCurrentDay(planData.startDate);
    const chapterDay = findChapterDayInPlan(book, chapter, planData);

    if (chapterDay === -1) return 'normal';
    if (chapterDay === currentDay) return 'today';
    if (chapterDay === currentDay - 1) return 'yesterday';
    if (chapterDay < currentDay) return 'missed';
    return 'future';
};

const findChapterDayInPlan = (
    book: number,
    chapter: number,
    planData: TimeBasedBiblePlan
): number => {
    const range = getBookRangeForPlan(planData.planType);
    let globalIndex = 0;

    for (let b = range.start; b <= range.end; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (!bookInfo) continue;

        if (b === book) {
            globalIndex += chapter;
            return Math.ceil(globalIndex / planData.chaptersPerDay);
        }

        globalIndex += bookInfo.count;
    }

    return -1;
};

// ==================== 데이터 저장/로드 ====================
export const saveBiblePlanData = (planData: TimeBasedBiblePlan): void => {
    defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
};

export const loadBiblePlanData = (): TimeBasedBiblePlan | null => {
    try {
        const savedPlan = defaultStorage.getString('bible_reading_plan');
        if (!savedPlan) return null;

        const planData = JSON.parse(savedPlan);

        // 데이터 무결성 검사
        if (!planData.readChapters) {
            planData.readChapters = [];
        }

        return planData;
    } catch (error) {
        console.error('계획 데이터 로드 실패:', error);
        return null;
    }
};

export const deleteBiblePlanData = (): void => {
    defaultStorage.delete('bible_reading_plan');
};

// ==================== 날짜 포맷팅 ====================
export const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
};

export const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
};