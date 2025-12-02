// src/utils/csvDataLoader.ts
// 🔥 CSV 파일에서 실제 음성 시간 데이터를 로드하고 관리하는 시스템
// 전체 1189장 데이터 포함 버전

import { BibleStep } from './define';

interface ChapterTimeData {
    bookCode: string;
    bookIndex: number;
    book: number;
    bookName: string;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

// 전역 저장소
let chapterTimeData: Map<string, ChapterTimeData> = new Map();
let chapterTimeDataCache: ChapterTimeData[] = [];
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
 * 전체 1189장의 하드코딩된 시간 데이터 생성
 */
const generateCompleteChapterData = (): ChapterTimeData[] => {
    const completeData: ChapterTimeData[] = [];

    // 각 책의 장수 (전체 1189장)
    const BIBLE_CHAPTERS = [
        { index: 1, name: '창세기', count: 50 },
        { index: 2, name: '출애굽기', count: 40 },
        { index: 3, name: '레위기', count: 27 },
        { index: 4, name: '민수기', count: 36 },
        { index: 5, name: '신명기', count: 34 },
        { index: 6, name: '여호수아', count: 24 },
        { index: 7, name: '사사기', count: 21 },
        { index: 8, name: '룻기', count: 4 },
        { index: 9, name: '사무엘상', count: 31 },
        { index: 10, name: '사무엘하', count: 24 },
        { index: 11, name: '열왕기상', count: 22 },
        { index: 12, name: '열왕기하', count: 25 },
        { index: 13, name: '역대상', count: 29 },
        { index: 14, name: '역대하', count: 36 },
        { index: 15, name: '에스라', count: 10 },
        { index: 16, name: '느헤미야', count: 13 },
        { index: 17, name: '에스더', count: 10 },
        { index: 18, name: '욥기', count: 42 },
        { index: 19, name: '시편', count: 150 },
        { index: 20, name: '잠언', count: 31 },
        { index: 21, name: '전도서', count: 12 },
        { index: 22, name: '아가', count: 8 },
        { index: 23, name: '이사야', count: 66 },
        { index: 24, name: '예레미야', count: 52 },
        { index: 25, name: '예레미야애가', count: 5 },
        { index: 26, name: '에스겔', count: 48 },
        { index: 27, name: '다니엘', count: 12 },
        { index: 28, name: '호세아', count: 14 },
        { index: 29, name: '요엘', count: 3 },
        { index: 30, name: '아모스', count: 9 },
        { index: 31, name: '오바댜', count: 1 },
        { index: 32, name: '요나', count: 4 },
        { index: 33, name: '미가', count: 7 },
        { index: 34, name: '나훔', count: 3 },
        { index: 35, name: '하박국', count: 3 },
        { index: 36, name: '스바냐', count: 3 },
        { index: 37, name: '학개', count: 2 },
        { index: 38, name: '스가랴', count: 14 },
        { index: 39, name: '말라기', count: 4 },
        { index: 40, name: '마태복음', count: 28 },
        { index: 41, name: '마가복음', count: 16 },
        { index: 42, name: '누가복음', count: 24 },
        { index: 43, name: '요한복음', count: 21 },
        { index: 44, name: '사도행전', count: 28 },
        { index: 45, name: '로마서', count: 16 },
        { index: 46, name: '고린도전서', count: 16 },
        { index: 47, name: '고린도후서', count: 13 },
        { index: 48, name: '갈라디아서', count: 6 },
        { index: 49, name: '에베소서', count: 6 },
        { index: 50, name: '빌립보서', count: 4 },
        { index: 51, name: '골로새서', count: 4 },
        { index: 52, name: '데살로니가전서', count: 5 },
        { index: 53, name: '데살로니가후서', count: 3 },
        { index: 54, name: '디모데전서', count: 6 },
        { index: 55, name: '디모데후서', count: 4 },
        { index: 56, name: '디도서', count: 3 },
        { index: 57, name: '빌레몬서', count: 1 },
        { index: 58, name: '히브리서', count: 13 },
        { index: 59, name: '야고보서', count: 5 },
        { index: 60, name: '베드로전서', count: 5 },
        { index: 61, name: '베드로후서', count: 3 },
        { index: 62, name: '요한일서', count: 5 },
        { index: 63, name: '요한이서', count: 1 },
        { index: 64, name: '요한삼서', count: 1 },
        { index: 65, name: '유다서', count: 1 },
        { index: 66, name: '요한계시록', count: 22 }
    ];

    // 각 책별로 장 데이터 생성
    for (const book of BIBLE_CHAPTERS) {
        const bookCode = getBookCodeByIndex(book.index);

        for (let chapter = 1; chapter <= book.count; chapter++) {
            // 기본 추정 시간 (초 단위)
            let totalSeconds = 240; // 기본 4분

            // 책별 특성에 따른 시간 조정
            if (book.index === 19) { // 시편
                // 시편은 장별로 길이가 다양함
                if (chapter === 119) totalSeconds = 1200; // 119편은 20분
                else if (chapter === 78 || chapter === 89) totalSeconds = 600; // 긴 시편
                else if ([1,2,3,4,5,6,7,8,9,10].includes(chapter)) totalSeconds = 120; // 짧은 시편
                else totalSeconds = 150; // 평균 2.5분
            } else if (book.index === 20) { // 잠언
                totalSeconds = 210; // 3.5분
            } else if (book.index <= 39) { // 구약
                totalSeconds = 240; // 4분
            } else { // 신약
                totalSeconds = 252; // 4.2분
            }

            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            completeData.push({
                bookCode,
                bookIndex: book.index,
                book: book.index,
                bookName: book.name,
                chapter,
                minutes,
                seconds,
                totalSeconds
            });
        }
    }

    return completeData;
};

/**
 * CSV 데이터 로드 메인 함수
 */
export const loadChapterTimeDataFromCSV = async (): Promise<boolean> => {
    try {
        console.log('🔄 CSV 시간 데이터 로드 시작...');

        // 기존 샘플 데이터와 전체 데이터 병합
        const csvData = getFullCsvData();
        const completeData = generateCompleteChapterData();

        chapterTimeData.clear();
        chapterTimeDataCache = [];

        // 먼저 전체 기본 데이터 로드
        const dataMap = new Map<string, ChapterTimeData>();

        // 기본 데이터 먼저 설정
        for (const data of completeData) {
            const key = `${data.bookIndex}_${data.chapter}`;
            dataMap.set(key, data);
        }

        // CSV 데이터로 덮어쓰기 (실제 데이터가 있는 경우)
        csvData.forEach(row => {
            const bookAbbr = row.filename.replace(/\d+$/, '');
            const chapter = parseInt(row.filename.match(/\d+$/)?.[0] || '0');
            const bookIndex = BOOK_ABBR_TO_INDEX[bookAbbr];

            if (bookIndex && chapter > 0) {
                const totalSeconds = row.duration;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const bookInfo = BibleStep.find(b => b.index === bookIndex);

                const timeData: ChapterTimeData = {
                    bookCode: bookAbbr,
                    bookIndex,
                    book: bookIndex,
                    bookName: bookInfo?.name || row.book_and_chapter.split(' ')[0],
                    chapter,
                    minutes,
                    seconds,
                    totalSeconds
                };

                const key = `${bookIndex}_${chapter}`;
                dataMap.set(key, timeData);
            }
        });

        // Map을 chapterTimeData와 cache에 저장
        dataMap.forEach((value, key) => {
            chapterTimeData.set(key, value);
            chapterTimeDataCache.push(value);
        });

        // 책과 장 순서로 정렬
        chapterTimeDataCache.sort((a, b) => {
            if (a.bookIndex !== b.bookIndex) {
                return a.bookIndex - b.bookIndex;
            }
            return a.chapter - b.chapter;
        });

        isDataLoaded = true;

        // 통계 계산
        const stats = getLoadedDataStats();

        // 각 계획별 장수 확인
        const fullBibleCount = chapterTimeDataCache.filter(
            ch => ch.book >= 1 && ch.book <= 66
        ).length;
        const oldTestamentCount = chapterTimeDataCache.filter(
            ch => ch.book >= 1 && ch.book <= 39
        ).length;
        const newTestamentCount = chapterTimeDataCache.filter(
            ch => ch.book >= 40 && ch.book <= 66
        ).length;
        const pentateuchCount = chapterTimeDataCache.filter(
            ch => ch.book >= 1 && ch.book <= 5
        ).length;
        const psalmsCount = chapterTimeDataCache.filter(
            ch => ch.book === 19
        ).length;

        console.log(`✅ CSV 데이터 로드 완료: ${chapterTimeDataCache.length}개 장`);
        console.log(`📊 성경 전체: ${fullBibleCount}장 (예상: 1189장)`);
        console.log(`📊 구약: ${oldTestamentCount}장 (예상: 921장)`);
        console.log(`📊 신약: ${newTestamentCount}장 (예상: 268장)`);
        console.log(`📊 모세오경: ${pentateuchCount}장 (예상: 187장)`);
        console.log(`📊 시편: ${psalmsCount}장 (예상: 150장)`);
        console.log(`📊 총 ${stats.totalHours}시간 ${stats.totalMinutes % 60}분`);

        return true;

    } catch (error) {
        console.error('❌ CSV 데이터 로드 실패:', error);
        return initializeWithDefaultTimes();
    }
};

/**
 * 특정 장의 실제 음성 시간 반환 (분 단위)
 */
export const getChapterTime = (bookIndex: number, chapter: number): number => {
    const key = `${bookIndex}_${chapter}`;
    const data = chapterTimeData.get(key);

    if (data) {
        return parseFloat((data.totalSeconds / 60).toFixed(1));
    }

    return getDefaultChapterTime(bookIndex);
};

/**
 * 특정 장의 실제 음성 시간 반환 (초 단위)
 */
export const getChapterTimeInSeconds = (bookIndex: number, chapter: number): number => {
    const key = `${bookIndex}_${chapter}`;
    const data = chapterTimeData.get(key);

    return data ? data.totalSeconds : getDefaultChapterTime(bookIndex) * 60;
};

/**
 * 특정 장의 상세 시간 정보 반환
 */
export const getChapterTimeData = (bookIndex: number, chapter: number): ChapterTimeData | null => {
    const key = `${bookIndex}_${chapter}`;
    return chapterTimeData.get(key) || null;
};

/**
 * 성경 전체 또는 특정 범위의 시간 데이터 반환
 */
export const getAllChapterTimeData = (startBook: number = 1, endBook: number = 66): ChapterTimeData[] => {
    const result: ChapterTimeData[] = [];

    chapterTimeData.forEach((data) => {
        if (data.bookIndex >= startBook && data.bookIndex <= endBook) {
            result.push(data);
        }
    });

    return result.sort((a, b) => {
        if (a.bookIndex !== b.bookIndex) {
            return a.bookIndex - b.bookIndex;
        }
        return a.chapter - b.chapter;
    });
};

/**
 * 특정 책의 전체 읽기 시간 계산
 */
export const getBookTotalTime = (bookIndex: number): { minutes: number; seconds: number; totalSeconds: number } => {
    let totalSeconds = 0;

    chapterTimeData.forEach((data) => {
        if (data.bookIndex === bookIndex) {
            totalSeconds += data.totalSeconds;
        }
    });

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return { minutes, seconds, totalSeconds };
};

/**
 * 기본 추정치로 초기화 (CSV 로드 실패 시)
 */
const initializeWithDefaultTimes = (): boolean => {
    console.log('⚠️ 기본 추정치로 초기화 중...');

    try {
        const completeData = generateCompleteChapterData();

        chapterTimeData.clear();
        chapterTimeDataCache = [];

        completeData.forEach(data => {
            const key = `${data.bookIndex}_${data.chapter}`;
            chapterTimeData.set(key, data);
            chapterTimeDataCache.push(data);
        });

        isDataLoaded = true;
        console.log(`✅ 기본 추정치 초기화 완료: ${chapterTimeDataCache.length}장`);
        return true;
    } catch (error) {
        console.error('❌ 기본 추정치 초기화 실패:', error);
        return false;
    }
};

/**
 * 기본 장 읽기 시간 추정치
 */
const getDefaultChapterTime = (bookIndex: number): number => {
    if (bookIndex === 19) return 2.5; // 시편
    if (bookIndex === 20) return 3.5; // 잠언
    if (bookIndex <= 39) return 4.0; // 구약
    return 4.2; // 신약
};

/**
 * 로드된 데이터 통계
 */
const getLoadedDataStats = (): {
    totalChapters: number;
    totalHours: number;
    totalMinutes: number;
    totalSeconds: number;
} => {
    let totalSeconds = 0;
    let totalChapters = 0;

    chapterTimeData.forEach((data) => {
        totalSeconds += data.totalSeconds;
        totalChapters++;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor(totalSeconds / 60);

    return {
        totalChapters,
        totalHours,
        totalMinutes,
        totalSeconds
    };
};

/**
 * 데이터 로드 상태 확인
 */
export const isChapterTimeDataLoaded = (): boolean => {
    return isDataLoaded && chapterTimeData.size > 0;
};

/**
 * 실제 CSV 데이터 (샘플 - 실제 데이터 있는 부분)
 */
const getFullCsvData = (): Array<{ filename: string; book_and_chapter: string; duration: number }> => {
    return BIBLE_AUDIO_DATA_IN_SECONDS;
};

/**
 * 성경 음성 데이터 샘플 (실제 측정된 데이터)
 */
const BIBLE_AUDIO_DATA_IN_SECONDS = [
    // 역대상 29장
    {filename: "1Ch001", book_and_chapter: "역대상 1장", duration: 299},
    {filename: "1Ch002", book_and_chapter: "역대상 2장", duration: 352},
    {filename: "1Ch003", book_and_chapter: "역대상 3장", duration: 163},
    {filename: "1Ch004", book_and_chapter: "역대상 4장", duration: 337},
    {filename: "1Ch005", book_and_chapter: "역대상 5장", duration: 241},
    {filename: "1Ch006", book_and_chapter: "역대상 6장", duration: 516},
    {filename: "1Ch007", book_and_chapter: "역대상 7장", duration: 323},
    {filename: "1Ch008", book_and_chapter: "역대상 8장", duration: 210},
    {filename: "1Ch009", book_and_chapter: "역대상 9장", duration: 351},
    {filename: "1Ch010", book_and_chapter: "역대상 10장", duration: 134},
    {filename: "1Ch011", book_and_chapter: "역대상 11장", duration: 360},
    {filename: "1Ch012", book_and_chapter: "역대상 12장", duration: 368},
    {filename: "1Ch013", book_and_chapter: "역대상 13장", duration: 138},
    {filename: "1Ch014", book_and_chapter: "역대상 14장", duration: 144},
    {filename: "1Ch015", book_and_chapter: "역대상 15장", duration: 255},
    {filename: "1Ch016", book_and_chapter: "역대상 16장", duration: 333},
    {filename: "1Ch017", book_and_chapter: "역대상 17장", duration: 288},
    {filename: "1Ch018", book_and_chapter: "역대상 18장", duration: 157},
    {filename: "1Ch019", book_and_chapter: "역대상 19장", duration: 211},
    {filename: "1Ch020", book_and_chapter: "역대상 20장", duration: 92},
    {filename: "1Ch021", book_and_chapter: "역대상 21장", duration: 338},
    {filename: "1Ch022", book_and_chapter: "역대상 22장", duration: 225},
    {filename: "1Ch023", book_and_chapter: "역대상 23장", duration: 231},
    {filename: "1Ch024", book_and_chapter: "역대상 24장", duration: 210},
    {filename: "1Ch025", book_and_chapter: "역대상 25장", duration: 226},
    {filename: "1Ch026", book_and_chapter: "역대상 26장", duration: 270},
    {filename: "1Ch027", book_and_chapter: "역대상 27장", duration: 276},
    {filename: "1Ch028", book_and_chapter: "역대상 28장", duration: 279},
    {filename: "1Ch029", book_and_chapter: "역대상 29장", duration: 337},

    // 역대하 36장
    {filename: "2Ch001", book_and_chapter: "역대하 1장", duration: 182},
    {filename: "2Ch002", book_and_chapter: "역대하 2장", duration: 232},
    {filename: "2Ch003", book_and_chapter: "역대하 3장", duration: 148},
    {filename: "2Ch004", book_and_chapter: "역대하 4장", duration: 191},
    {filename: "2Ch005", book_and_chapter: "역대하 5장", duration: 151},
    {filename: "2Ch006", book_and_chapter: "역대하 6장", duration: 482},
    {filename: "2Ch007", book_and_chapter: "역대하 7장", duration: 253},
    {filename: "2Ch008", book_and_chapter: "역대하 8장", duration: 181},
    {filename: "2Ch009", book_and_chapter: "역대하 9장", duration: 300},
    {filename: "2Ch010", book_and_chapter: "역대하 10장", duration: 215},
    {filename: "2Ch011", book_and_chapter: "역대하 11장", duration: 201},
    {filename: "2Ch012", book_and_chapter: "역대하 12장", duration: 174},
    {filename: "2Ch013", book_and_chapter: "역대하 13장", duration: 231},
    {filename: "2Ch014", book_and_chapter: "역대하 14장", duration: 170},
    {filename: "2Ch015", book_and_chapter: "역대하 15장", duration: 185},
    {filename: "2Ch016", book_and_chapter: "역대하 16장", duration: 157},
    {filename: "2Ch017", book_and_chapter: "역대하 17장", duration: 175},
    {filename: "2Ch018", book_and_chapter: "역대하 18장", duration: 398},
    {filename: "2Ch019", book_and_chapter: "역대하 19장", duration: 142},
    {filename: "2Ch020", book_and_chapter: "역대하 20장", duration: 423},
    {filename: "2Ch021", book_and_chapter: "역대하 21장", duration: 219},
    {filename: "2Ch022", book_and_chapter: "역대하 22장", duration: 164},
    {filename: "2Ch023", book_and_chapter: "역대하 23장", duration: 245},
    {filename: "2Ch024", book_and_chapter: "역대하 24장", duration: 313},
    {filename: "2Ch025", book_and_chapter: "역대하 25장", duration: 321},
    {filename: "2Ch026", book_and_chapter: "역대하 26장", duration: 240},
    {filename: "2Ch027", book_and_chapter: "역대하 27장", duration: 84},
    {filename: "2Ch028", book_and_chapter: "역대하 28장", duration: 290},
    {filename: "2Ch029", book_and_chapter: "역대하 29장", duration: 374},
    {filename: "2Ch030", book_and_chapter: "역대하 30장", duration: 322},
    {filename: "2Ch031", book_and_chapter: "역대하 31장", duration: 258},
    {filename: "2Ch032", book_and_chapter: "역대하 32장", duration: 379},
    {filename: "2Ch033", book_and_chapter: "역대하 33장", duration: 252},
    {filename: "2Ch034", book_and_chapter: "역대하 34장", duration: 401},
    {filename: "2Ch035", book_and_chapter: "역대하 35장", duration: 324},
    {filename: "2Ch036", book_and_chapter: "역대하 36장", duration: 257},

    // 창세기 50장
    {filename: "Gen001", book_and_chapter: "창세기 1장", duration: 271},
    {filename: "Gen002", book_and_chapter: "창세기 2장", duration: 202},
    {filename: "Gen003", book_and_chapter: "창세기 3장", duration: 238},
    {filename: "Gen004", book_and_chapter: "창세기 4장", duration: 238},
    {filename: "Gen005", book_and_chapter: "창세기 5장", duration: 150},
    {filename: "Gen006", book_and_chapter: "창세기 6장", duration: 193},
    {filename: "Gen007", book_and_chapter: "창세기 7장", duration: 173},
    {filename: "Gen008", book_and_chapter: "창세기 8장", duration: 175},
    {filename: "Gen009", book_and_chapter: "창세기 9장", duration: 225},
    {filename: "Gen010", book_and_chapter: "창세기 10장", duration: 201},
    {filename: "Gen011", book_and_chapter: "창세기 11장", duration: 199},
    {filename: "Gen012", book_and_chapter: "창세기 12장", duration: 184},
    {filename: "Gen013", book_and_chapter: "창세기 13장", duration: 151},
    {filename: "Gen014", book_and_chapter: "창세기 14장", duration: 228},
    {filename: "Gen015", book_and_chapter: "창세기 15장", duration: 177},
    {filename: "Gen016", book_and_chapter: "창세기 16장", duration: 164},
    {filename: "Gen017", book_and_chapter: "창세기 17장", duration: 242},
    {filename: "Gen018", book_and_chapter: "창세기 18장", duration: 306},
    {filename: "Gen019", book_and_chapter: "창세기 19장", duration: 351},
    {filename: "Gen020", book_and_chapter: "창세기 20장", duration: 180},
    {filename: "Gen021", book_and_chapter: "창세기 21장", duration: 267},
    {filename: "Gen022", book_and_chapter: "창세기 22장", duration: 228},
    {filename: "Gen023", book_and_chapter: "창세기 23장", duration: 186},
    {filename: "Gen024", book_and_chapter: "창세기 24장", duration: 615},
    {filename: "Gen025", book_and_chapter: "창세기 25장", duration: 267},
    {filename: "Gen026", book_and_chapter: "창세기 26장", duration: 312},
    {filename: "Gen027", book_and_chapter: "창세기 27장", duration: 451},
    {filename: "Gen028", book_and_chapter: "창세기 28장", duration: 221},
    {filename: "Gen029", book_and_chapter: "창세기 29장", duration: 301},
    {filename: "Gen030", book_and_chapter: "창세기 30장", duration: 392},
    {filename: "Gen031", book_and_chapter: "창세기 31장", duration: 540},
    {filename: "Gen032", book_and_chapter: "창세기 32장", duration: 299},
    {filename: "Gen033", book_and_chapter: "창세기 33장", duration: 178},
    {filename: "Gen034", book_and_chapter: "창세기 34장", duration: 281},
    {filename: "Gen035", book_and_chapter: "창세기 35장", duration: 257},
    {filename: "Gen036", book_and_chapter: "창세기 36장", duration: 330},
    {filename: "Gen037", book_and_chapter: "창세기 37장", duration: 326},
    {filename: "Gen038", book_and_chapter: "창세기 38장", duration: 283},
    {filename: "Gen039", book_and_chapter: "창세기 39장", duration: 212},
    {filename: "Gen040", book_and_chapter: "창세기 40장", duration: 189},
    {filename: "Gen041", book_and_chapter: "창세기 41장", duration: 445},
    {filename: "Gen042", book_and_chapter: "창세기 42장", duration: 368},
    {filename: "Gen043", book_and_chapter: "창세기 43장", duration: 334},
    {filename: "Gen044", book_and_chapter: "창세기 44장", duration: 313},
    {filename: "Gen045", book_and_chapter: "창세기 45장", duration: 263},
    {filename: "Gen046", book_and_chapter: "창세기 46장", duration: 279},
    {filename: "Gen047", book_and_chapter: "창세기 47장", duration: 324},
    {filename: "Gen048", book_and_chapter: "창세기 48장", duration: 241},
    {filename: "Gen049", book_and_chapter: "창세기 49장", duration: 298},
    {filename: "Gen050", book_and_chapter: "창세기 50장", duration: 248},

    // 출애굽기 40장
    {filename: "Exo001", book_and_chapter: "출애굽기 1장", duration: 165},
    {filename: "Exo002", book_and_chapter: "출애굽기 2장", duration: 230},
    {filename: "Exo003", book_and_chapter: "출애굽기 3장", duration: 281},
    {filename: "Exo004", book_and_chapter: "출애굽기 4장", duration: 305},
    {filename: "Exo005", book_and_chapter: "출애굽기 5장", duration: 222},
    {filename: "Exo006", book_and_chapter: "출애굽기 6장", duration: 270},
    {filename: "Exo007", book_and_chapter: "출애굽기 7장", duration: 244},
    {filename: "Exo008", book_and_chapter: "출애굽기 8장", duration: 346},
    {filename: "Exo009", book_and_chapter: "출애굽기 9장", duration: 350},
    {filename: "Exo010", book_and_chapter: "출애굽기 10장", duration: 323},
    {filename: "Exo011", book_and_chapter: "출애굽기 11장", duration: 113},
    {filename: "Exo012", book_and_chapter: "출애굽기 12장", duration: 463},
    {filename: "Exo013", book_and_chapter: "출애굽기 13장", duration: 240},
    {filename: "Exo014", book_and_chapter: "출애굽기 14장", duration: 323},
    {filename: "Exo015", book_and_chapter: "출애굽기 15장", duration: 286},
    {filename: "Exo016", book_and_chapter: "출애굽기 16장", duration: 379},
    {filename: "Exo017", book_and_chapter: "출애굽기 17장", duration: 173},
    {filename: "Exo018", book_and_chapter: "출애굽기 18장", duration: 274},
    {filename: "Exo019", book_and_chapter: "출애굽기 19장", duration: 259},
    {filename: "Exo020", book_and_chapter: "출애굽기 20장", duration: 222},
    {filename: "Exo021", book_and_chapter: "출애굽기 21장", duration: 305},
    {filename: "Exo022", book_and_chapter: "출애굽기 22장", duration: 272},
    {filename: "Exo023", book_and_chapter: "출애굽기 23장", duration: 314},
    {filename: "Exo024", book_and_chapter: "출애굽기 24장", duration: 163},
    {filename: "Exo025", book_and_chapter: "출애굽기 25장", duration: 269},
    {filename: "Exo026", book_and_chapter: "출애굽기 26장", duration: 278},
    {filename: "Exo027", book_and_chapter: "출애굽기 27장", duration: 174},
    {filename: "Exo028", book_and_chapter: "출애굽기 28장", duration: 372},
    {filename: "Exo029", book_and_chapter: "출애굽기 29장", duration: 405},
    {filename: "Exo030", book_and_chapter: "출애굽기 30장", duration: 304},
    {filename: "Exo031", book_and_chapter: "출애굽기 31장", duration: 154},
    {filename: "Exo032", book_and_chapter: "출애굽기 32장", duration: 387},
    {filename: "Exo033", book_and_chapter: "출애굽기 33장", duration: 258},
    {filename: "Exo034", book_and_chapter: "출애굽기 34장", duration: 389},
    {filename: "Exo035", book_and_chapter: "출애굽기 35장", duration: 292},
    {filename: "Exo036", book_and_chapter: "출애굽기 36장", duration: 321},
    {filename: "Exo037", book_and_chapter: "출애굽기 37장", duration: 235},
    {filename: "Exo038", book_and_chapter: "출애굽기 38장", duration: 274},
    {filename: "Exo039", book_and_chapter: "출애굽기 39장", duration: 358},
    {filename: "Exo040", book_and_chapter: "출애굽기 40장", duration: 269}

    // 나머지 성경 데이터는 generateCompleteChapterData 함수에서 자동 생성
];

/**
 * UI 컴포넌트를 위한 헬퍼 함수
 */
export const formatChapterTime = (bookIndex: number, chapter: number): string => {
    const data = getChapterTimeData(bookIndex, chapter);
    if (!data) return '알 수 없음';

    if (data.minutes === 0) {
        return `${data.seconds}초`;
    }
    return `${data.minutes}분 ${data.seconds}초`;
};

/**
 * 시간 기반 성경 읽기 계획을 위한 데이터 변환
 */
export const getChapterTimeDataForPlan = (
    startBook: number = 1,
    endBook: number = 66
): Array<{
    book: number;
    chapter: number;
    bookName: string;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}> => {
    if (!isDataLoaded) {
        console.warn('⚠️ 시간 데이터가 아직 로드되지 않았습니다. 초기화 중...');
        initializeWithDefaultTimes();
    }

    const result = chapterTimeDataCache.filter(
        item => item.bookIndex >= startBook && item.bookIndex <= endBook
    );

    console.log(`📊 ${startBook}~${endBook}권 범위: ${result.length}장`);

    return result.map(item => ({
        book: item.bookIndex,
        chapter: item.chapter,
        bookName: item.bookName,
        minutes: item.minutes,
        seconds: item.seconds,
        totalSeconds: item.totalSeconds
    }));
};

// 앱 시작 시 자동으로 데이터 로드
if (!isDataLoaded) {
    loadChapterTimeDataFromCSV().then(success => {
        if (success) {
            console.log('✅ CSV 시간 데이터 자동 로드 완료');
        }
    });
}