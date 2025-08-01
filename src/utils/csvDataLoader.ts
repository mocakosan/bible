// src/utils/csvDataLoader.ts
// 🔥 CSV 파일에서 실제 음성 시간 데이터를 로드하고 관리하는 시스템

import { BibleStep } from './define';

interface ChapterTimeData {
    bookCode: string;
    bookIndex: number;
    bookName: string;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

// 전역 저장소 - CSV에서 로드한 실제 시간 데이터
let chapterTimeData: Map<string, ChapterTimeData> = new Map();
let isDataLoaded = false;

// CSV 파일명과 북 인덱스 매핑
const BOOK_ABBR_TO_INDEX: { [key: string]: number } = {
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

// 북 인덱스로 북 코드 반환
const getBookCodeByIndex = (index: number): string => {
    const mapping = Object.entries(BOOK_ABBR_TO_INDEX).find(([_, idx]) => idx === index);
    return mapping ? mapping[0] : 'Unknown';
};

/**
 * 🔥 CSV 데이터 로드 (React Native 환경)
 * 실제 앱에서는 bundler를 통해 CSV를 import하거나 API로 로드해야 함
 * 여기서는 실제 CSV 데이터를 하드코딩으로 포함
 */
export const loadChapterTimeDataFromCSV = async (): Promise<boolean> => {
    try {
        console.log('🔄 CSV 시간 데이터 로드 시작...');

        // CSV 데이터 배열 (Bible_Chapter_Mapping.csv 전체 데이터)
        // 실제 운영에서는 이 부분을 CSV 파일 읽기로 대체
        const csvData = getFullCsvData();

        chapterTimeData.clear();
        let successCount = 0;

        csvData.forEach(row => {
            const bookAbbr = row.filename.replace(/\d+$/, '');
            const chapter = parseInt(row.filename.match(/\d+$/)?.[0] || '0');
            const bookIndex = BOOK_ABBR_TO_INDEX[bookAbbr];

            if (bookIndex && chapter > 0) {
                const [minutes, seconds] = row.duration.split(':').map(Number);
                const totalSeconds = minutes * 60 + seconds;

                const bookInfo = BibleStep.find(b => b.index === bookIndex);

                const timeData: ChapterTimeData = {
                    bookCode: bookAbbr,
                    bookIndex,
                    bookName: bookInfo?.name || row.book_and_chapter.split(' ')[0],
                    chapter,
                    minutes,
                    seconds,
                    totalSeconds
                };

                const key = `${bookIndex}_${chapter}`;
                chapterTimeData.set(key, timeData);
                successCount++;
            }
        });

        isDataLoaded = true;
        console.log(`✅ CSV 데이터 로드 완료: ${successCount}개 장`);

        // 통계 출력
        const stats = getLoadedDataStats();
        console.log(`📊 총 ${stats.totalChapters}장, ${stats.totalHours}시간 ${stats.totalMinutes % 60}분`);

        return true;

    } catch (error) {
        console.error('❌ CSV 데이터 로드 실패:', error);
        // 실패 시 기본 추정치로 초기화
        return initializeWithDefaultTimes();
    }
};

/**
 * 🔥 특정 장의 실제 음성 시간 반환 (분 단위)
 */
export const getChapterTime = (bookIndex: number, chapter: number): number => {
    const key = `${bookIndex}_${chapter}`;
    const data = chapterTimeData.get(key);

    if (data) {
        return parseFloat((data.totalSeconds / 60).toFixed(1));
    }

    // 데이터가 없으면 기본 추정치 반환
    return getDefaultChapterTime(bookIndex);
};

/**
 * 🔥 특정 장의 실제 음성 시간 반환 (초 단위)
 */
export const getChapterTimeInSeconds = (bookIndex: number, chapter: number): number => {
    const key = `${bookIndex}_${chapter}`;
    const data = chapterTimeData.get(key);

    return data ? data.totalSeconds : Math.floor(getDefaultChapterTime(bookIndex) * 60);
};

/**
 * 🔥 특정 장의 상세 시간 정보 반환
 */
export const getChapterTimeDetail = (bookIndex: number, chapter: number): {
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isActualData: boolean;
} => {
    const key = `${bookIndex}_${chapter}`;
    const data = chapterTimeData.get(key);

    if (data) {
        return {
            minutes: data.minutes,
            seconds: data.seconds,
            totalSeconds: data.totalSeconds,
            isActualData: true
        };
    }

    // 기본 추정치
    const estimatedMinutes = getDefaultChapterTime(bookIndex);
    const totalSeconds = Math.floor(estimatedMinutes * 60);

    return {
        minutes: Math.floor(estimatedMinutes),
        seconds: Math.floor((estimatedMinutes % 1) * 60),
        totalSeconds,
        isActualData: false
    };
};

/**
 * 🔥 계획별 총 시간 계산 (실제 CSV 데이터 기반)
 */
export const calculatePlanTotalTime = (planType: string): {
    totalMinutes: number;
    totalChapters: number;
} => {
    const bookRange = getBookRangeForPlan(planType);
    let totalSeconds = 0;
    let totalChapters = 0;

    for (let bookIndex = bookRange.start; bookIndex <= bookRange.end; bookIndex++) {
        const bookInfo = BibleStep.find(step => step.index === bookIndex);
        if (bookInfo) {
            for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                totalSeconds += getChapterTimeInSeconds(bookIndex, chapter);
                totalChapters++;
            }
        }
    }

    // 정확한 분과 초 반환
    const totalMinutes = totalSeconds / 60;

    return {
        totalMinutes: Math.round(totalMinutes * 10) / 10,
        totalChapters
    };
};

/**
 * 계획별 성경 범위 반환
 */
export const getBookRangeForPlan = (planType: string): { start: number; end: number } => {
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
 * 성경별 기본 추정 시간 (CSV 데이터가 없을 때 사용)
 */
const getDefaultChapterTime = (bookIndex: number): number => {
    if (bookIndex === 19) {
        return 2.2; // 시편 평균
    } else if (bookIndex === 20) {
        return 3.5; // 잠언
    } else if (bookIndex <= 39) {
        return 4.0; // 구약
    } else {
        return 4.2; // 신약
    }
};

/**
 * 기본 추정치로 초기화 (fallback)
 */
const initializeWithDefaultTimes = (): boolean => {
    try {
        console.log('⚠️ 기본 추정치로 초기화 중...');

        chapterTimeData.clear();

        BibleStep.forEach(book => {
            for (let chapter = 1; chapter <= book.count; chapter++) {
                const estimatedMinutes = getDefaultChapterTime(book.index);
                const totalSeconds = Math.floor(estimatedMinutes * 60);

                const timeData: ChapterTimeData = {
                    bookCode: getBookCodeByIndex(book.index),
                    bookIndex: book.index,
                    bookName: book.name,
                    chapter,
                    minutes: Math.floor(estimatedMinutes),
                    seconds: Math.floor((estimatedMinutes % 1) * 60),
                    totalSeconds
                };

                const key = `${book.index}_${chapter}`;
                chapterTimeData.set(key, timeData);
            }
        });

        isDataLoaded = true;
        console.log('✅ 기본 추정치 초기화 완료');
        return true;

    } catch (error) {
        console.error('❌ 기본 추정치 초기화 실패:', error);
        return false;
    }
};

/**
 * 🔥 데이터 로드 상태 확인
 */
export const isChapterTimeDataLoaded = (): boolean => {
    return isDataLoaded;
};

/**
 * 🔥 로드된 데이터 통계 반환
 */
export const getLoadedDataStats = (): {
    totalChapters: number;
    totalMinutes: number;
    totalHours: number;
    isLoaded: boolean;
} => {
    if (!isDataLoaded) {
        return {
            totalChapters: 0,
            totalMinutes: 0,
            totalHours: 0,
            isLoaded: false
        };
    }

    const totalSeconds = Array.from(chapterTimeData.values())
        .reduce((sum, data) => sum + data.totalSeconds, 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);

    return {
        totalChapters: chapterTimeData.size,
        totalMinutes,
        totalHours,
        isLoaded: true
    };
};

/**
 * 전체 CSV 데이터 반환 함수
 * 실제 운영에서는 CSV 파일을 읽어서 반환하도록 수정 필요
 */
function getFullCsvData(): Array<{filename: string; book_and_chapter: string; duration: string}> {
    // React Native에서는 import로 JSON 데이터를 가져오는 것이 일반적
    // 실제 구현: import { BIBLE_AUDIO_DATA } from '../data/bibleAudioData';
    // return BIBLE_AUDIO_DATA;

    // 임시로 일부 데이터만 포함 (실제로는 bibleAudioData.ts의 전체 데이터 사용)
    return [
        // 창세기 50장 전체
        {filename: "Gen001", book_and_chapter: "창세기 1장", duration: "4:31"},
        {filename: "Gen002", book_and_chapter: "창세기 2장", duration: "3:22"},
        {filename: "Gen003", book_and_chapter: "창세기 3장", duration: "3:58"},
        {filename: "Gen004", book_and_chapter: "창세기 4장", duration: "3:58"},
        {filename: "Gen005", book_and_chapter: "창세기 5장", duration: "2:30"},
        {filename: "Gen006", book_and_chapter: "창세기 6장", duration: "3:14"},
        {filename: "Gen007", book_and_chapter: "창세기 7장", duration: "3:29"},
        {filename: "Gen008", book_and_chapter: "창세기 8장", duration: "3:06"},
        {filename: "Gen009", book_and_chapter: "창세기 9장", duration: "3:23"},
        {filename: "Gen010", book_and_chapter: "창세기 10장", duration: "3:00"},
        // ... 창세기 11-50장

        // 출애굽기 40장
        {filename: "Exo001", book_and_chapter: "출애굽기 1장", duration: "3:21"},
        {filename: "Exo002", book_and_chapter: "출애굽기 2장", duration: "3:45"},
        // ... 출애굽기 3-40장

        // 시편 일부
        {filename: "Psa001", book_and_chapter: "시편 1장", duration: "1:02"},
        {filename: "Psa023", book_and_chapter: "시편 23장", duration: "1:02"},
        {filename: "Psa117", book_and_chapter: "시편 117장", duration: "0:23"},
        {filename: "Psa119", book_and_chapter: "시편 119장", duration: "17:48"},

        // 마태복음
        {filename: "Mat001", book_and_chapter: "마태복음 1장", duration: "3:52"},
        {filename: "Mat002", book_and_chapter: "마태복음 2장", duration: "3:23"},
        // ... 나머지 데이터

        // 요한계시록
        {filename: "Rev022", book_and_chapter: "요한계시록 22장", duration: "2:56"}
    ];
}

// csvDataLoader.ts의 맨 위에 추가할 import 문
// import { BIBLE_AUDIO_DATA } from '../data/bibleAudioData';