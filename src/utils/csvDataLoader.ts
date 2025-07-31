// src/utils/csvDataLoader.ts
// 🔥 CSV 파일에서 실제 음성 시간 데이터 로드 및 관리

interface ChapterTimeData {
    bookCode: string;
    bookIndex: number;
    bookName: string;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

// 성경 책 매핑
const BOOK_MAPPING: { [key: string]: { index: number; name: string } } = {
    '1Ch': { index: 13, name: '역대기상' },
    '2Ch': { index: 14, name: '역대기하' },
    '1Co': { index: 46, name: '고린도전서' },
    '2Co': { index: 47, name: '고린도후서' },
    '1Jo': { index: 62, name: '요한일서' },
    '2Jo': { index: 63, name: '요한이서' },
    '3Jo': { index: 64, name: '요한삼서' },
    '1Ki': { index: 11, name: '열왕기상' },
    '2Ki': { index: 12, name: '열왕기하' },
    '1Pe': { index: 60, name: '베드로전서' },
    '2Pe': { index: 61, name: '베드로후서' },
    '1Sa': { index: 9, name: '사무엘상' },
    '2Sa': { index: 10, name: '사무엘하' },
    '1Th': { index: 52, name: '데살로니가전서' },
    '2Th': { index: 53, name: '데살로니가후서' },
    '1Ti': { index: 54, name: '디모데전서' },
    '2Ti': { index: 55, name: '디모데후서' },
    'Act': { index: 44, name: '사도행전' },
    'Amo': { index: 30, name: '아모스' },
    'Col': { index: 51, name: '골로새서' },
    'Dan': { index: 27, name: '다니엘' },
    'Deu': { index: 5, name: '신명기' },
    'Ecc': { index: 21, name: '전도서' },
    'Eph': { index: 49, name: '에베소서' },
    'Est': { index: 17, name: '에스더' },
    'Exo': { index: 2, name: '출애굽기' },
    'Eze': { index: 26, name: '에스겔' },
    'Ezr': { index: 15, name: '에스라' },
    'Gal': { index: 48, name: '갈라디아서' },
    'Gen': { index: 1, name: '창세기' },
    'Hab': { index: 35, name: '하박국' },
    'Hag': { index: 37, name: '학개' },
    'Heb': { index: 58, name: '히브리서' },
    'Hos': { index: 28, name: '호세아' },
    'Isa': { index: 23, name: '이사야' },
    'Jam': { index: 59, name: '야고보서' },
    'Jdg': { index: 7, name: '사사기' },
    'Jer': { index: 24, name: '예레미야' },
    'Job': { index: 18, name: '욥기' },
    'Joe': { index: 29, name: '요엘' },
    'Joh': { index: 43, name: '요한복음' },
    'Jon': { index: 32, name: '요나' },
    'Jos': { index: 6, name: '여호수아' },
    'Jud': { index: 65, name: '유다서' },
    'Lam': { index: 25, name: '예레미야 애가' },
    'Lev': { index: 3, name: '레위기' },
    'Luk': { index: 42, name: '누가복음' },
    'Mal': { index: 39, name: '말라기' },
    'Mar': { index: 41, name: '마가복음' },
    'Mat': { index: 40, name: '마태복음' },
    'Mic': { index: 33, name: '미가' },
    'Nah': { index: 34, name: '나훔' },
    'Neh': { index: 16, name: '느헤미야' },
    'Num': { index: 4, name: '민수기' },
    'Oba': { index: 31, name: '오바댜' },
    'Phi': { index: 50, name: '빌립보서' },
    'Phm': { index: 57, name: '빌레몬서' },
    'Pro': { index: 20, name: '잠언' },
    'Psa': { index: 19, name: '시편' },
    'Rev': { index: 66, name: '요한계시록' },
    'Rom': { index: 45, name: '로마서' },
    'Rut': { index: 8, name: '룻기' },
    'Son': { index: 22, name: '아가' },
    'Tit': { index: 56, name: '디도서' },
    'Zec': { index: 38, name: '스가랴' },
    'Zep': { index: 36, name: '스바냐' }
};

// 전역 저장소
let chapterTimeData: Map<string, ChapterTimeData> = new Map();
let isDataLoaded = false;

/**
 * 🔥 CSV 파일에서 실제 음성 시간 데이터 로드 (React Native 호환)
 */
export const loadChapterTimeDataFromCSV = async (): Promise<boolean> => {
    try {
        console.log('🔄 실제 음성 시간 데이터 로드 시작...');

        // React Native에서는 파일 시스템 접근이 제한적이므로
        // 실제 데이터를 하드코딩으로 포함 (임시 방편)
        // 실제 운영에서는 bundler를 통해 CSV를 import하거나 API로 로드해야 함

        chapterTimeData.clear();
        let successCount = 0;

        // 🔥 실제 CSV 데이터 샘플 (전체 데이터로 확장 필요)
        const sampleData = [
            // 창세기
            { bookCode: 'Gen', bookIndex: 1, bookName: '창세기', chapter: 1, minutes: 4, seconds: 31, totalSeconds: 271 },
            { bookCode: 'Gen', bookIndex: 1, bookName: '창세기', chapter: 2, minutes: 3, seconds: 22, totalSeconds: 202 },
            { bookCode: 'Gen', bookIndex: 1, bookName: '창세기', chapter: 3, minutes: 3, seconds: 58, totalSeconds: 238 },
            { bookCode: 'Gen', bookIndex: 1, bookName: '창세기', chapter: 4, minutes: 3, seconds: 58, totalSeconds: 238 },
            { bookCode: 'Gen', bookIndex: 1, bookName: '창세기', chapter: 5, minutes: 2, seconds: 30, totalSeconds: 150 },

            // 시편 (일부)
            { bookCode: 'Psa', bookIndex: 19, bookName: '시편', chapter: 1, minutes: 1, seconds: 30, totalSeconds: 90 },
            { bookCode: 'Psa', bookIndex: 19, bookName: '시편', chapter: 23, minutes: 2, seconds: 0, totalSeconds: 120 },
            { bookCode: 'Psa', bookIndex: 19, bookName: '시편', chapter: 117, minutes: 0, seconds: 30, totalSeconds: 30 },
            { bookCode: 'Psa', bookIndex: 19, bookName: '시편', chapter: 119, minutes: 8, seconds: 30, totalSeconds: 510 },

            // 마태복음 (일부)
            { bookCode: 'Mat', bookIndex: 40, bookName: '마태복음', chapter: 1, minutes: 4, seconds: 12, totalSeconds: 252 },
            { bookCode: 'Mat', bookIndex: 40, bookName: '마태복음', chapter: 2, minutes: 3, seconds: 48, totalSeconds: 228 }
        ];

        // 데이터 로드
        sampleData.forEach(item => {
            const key = `${item.bookIndex}_${item.chapter}`;
            chapterTimeData.set(key, item);
            successCount++;
        });

        // 🔥 나머지 장들은 기본 추정치로 채우기
        const BibleStep = getBibleStepData();
        BibleStep.forEach(book => {
            for (let chapter = 1; chapter <= book.count; chapter++) {
                const key = `${book.index}_${chapter}`;

                // 이미 실제 데이터가 있으면 스킵
                if (chapterTimeData.has(key)) {
                    return;
                }

                // 기본 추정치로 생성
                let estimatedTime = 4.0; // 기본 4분
                let totalSeconds = 240;

                // 성경별 시간 추정
                if (book.index === 19) {
                    // 시편 장별 특별 처리
                    if (chapter === 119) { estimatedTime = 8.5; totalSeconds = 510; }
                    else if (chapter === 117) { estimatedTime = 0.5; totalSeconds = 30; }
                    else if ([23, 1, 8, 100].includes(chapter)) { estimatedTime = 1.5; totalSeconds = 90; }
                    else { estimatedTime = 2.5; totalSeconds = 150; }
                } else if (book.index === 20) {
                    estimatedTime = 3.5; totalSeconds = 210; // 잠언
                } else if (book.index <= 39) {
                    estimatedTime = 4.0; totalSeconds = 240; // 구약
                } else {
                    estimatedTime = 4.2; totalSeconds = 252; // 신약
                }

                const estimatedData = {
                    bookCode: getBookCodeByIndex(book.index),
                    bookIndex: book.index,
                    bookName: book.name,
                    chapter,
                    minutes: Math.floor(estimatedTime),
                    seconds: Math.round((estimatedTime % 1) * 60),
                    totalSeconds
                };

                chapterTimeData.set(key, estimatedData);
                successCount++;
            }
        });

        isDataLoaded = successCount > 0;
        console.log(`✅ 음성 데이터 로드 완료: ${successCount}개 장 (실제 ${sampleData.length}개 + 추정 ${successCount - sampleData.length}개)`);

        // 전체 시간 계산
        const totalSeconds = Array.from(chapterTimeData.values())
            .reduce((sum, data) => sum + data.totalSeconds, 0);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);

        console.log(`📊 성경 전체: ${totalHours}시간 ${totalMinutes % 60}분 (${successCount}장)`);

        return isDataLoaded;

    } catch (error) {
        console.error('❌ 음성 데이터 로드 실패:', error);
        isDataLoaded = false;

        // 실패 시에도 기본 추정치로라도 초기화
        try {
            initializeWithDefaultTimes();
            return true;
        } catch (fallbackError) {
            console.error('❌ 기본 추정치 초기화도 실패:', fallbackError);
            return false;
        }
    }
};

/**
 * 🔥 기본 추정치로 초기화 (fallback)
 */
const initializeWithDefaultTimes = () => {
    chapterTimeData.clear();
    let successCount = 0;

    const BibleStep = getBibleStepData();
    BibleStep.forEach(book => {
        for (let chapter = 1; chapter <= book.count; chapter++) {
            let estimatedTime = 4.0; // 기본 4분
            let totalSeconds = 240;

            // 성경별 시간 추정
            if (book.index === 19) {
                // 시편 장별 특별 처리
                if (chapter === 119) { estimatedTime = 8.5; totalSeconds = 510; }
                else if (chapter === 117) { estimatedTime = 0.5; totalSeconds = 30; }
                else if ([23, 1, 8, 100].includes(chapter)) { estimatedTime = 1.5; totalSeconds = 90; }
                else { estimatedTime = 2.5; totalSeconds = 150; }
            } else if (book.index === 20) {
                estimatedTime = 3.5; totalSeconds = 210; // 잠언
            } else if (book.index <= 39) {
                estimatedTime = 4.0; totalSeconds = 240; // 구약
            } else {
                estimatedTime = 4.2; totalSeconds = 252; // 신약
            }

            const estimatedData = {
                bookCode: getBookCodeByIndex(book.index),
                bookIndex: book.index,
                bookName: book.name,
                chapter,
                minutes: Math.floor(estimatedTime),
                seconds: Math.round((estimatedTime % 1) * 60),
                totalSeconds
            };

            const key = `${book.index}_${chapter}`;
            chapterTimeData.set(key, estimatedData);
            successCount++;
        }
    });

    isDataLoaded = true;
    console.log(`✅ 기본 추정치로 초기화 완료: ${successCount}개 장`);
};

/**
 * 북 인덱스로 북 코드 반환
 */
const getBookCodeByIndex = (index: number): string => {
    const mapping: { [key: number]: string } = {
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
    return mapping[index] || 'Unknown';
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

    // 기본 추정치 반환
    return getDefaultChapterTime(bookIndex);
};

/**
 * 🔥 특정 장의 실제 음성 시간 반환 (초 단위)
 */
export const getChapterTimeInSeconds = (bookIndex: number, chapter: number): number => {
    const key = `${bookIndex}_${chapter}`;
    const data = chapterTimeData.get(key);

    if (data) {
        return data.totalSeconds;
    }

    // 기본 추정치 반환 (분을 초로 변환)
    return Math.floor(getDefaultChapterTime(bookIndex) * 60);
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
 * 성경별 기본 추정 시간 (분 단위)
 */
const getDefaultChapterTime = (bookIndex: number): number => {
    if (bookIndex === 19) {
        // 시편 - 평균적으로 짧음
        return 2.2;
    } else if (bookIndex === 20) {
        // 잠언
        return 3.5;
    } else if (bookIndex <= 39) {
        // 구약
        return 4.0;
    } else {
        // 신약
        return 4.2;
    }
};

/**
 * 🔥 계획별 총 시간 계산
 */
export const calculatePlanTotalTime = (planType: string): {
    totalMinutes: number;
    totalChapters: number;
    bookRange: { start: number; end: number };
} => {
    const bookRange = getBookRangeForPlan(planType);
    let totalMinutes = 0;
    let totalChapters = 0;

    // BibleStep 정보 가져오기 (외부에서 import 필요)
    const BibleStep = getBibleStepData();

    for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find((step: any) => step.index === book);
        if (bookInfo) {
            for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                totalMinutes += getChapterTime(book, chapter);
                totalChapters++;
            }
        }
    }

    return {
        totalMinutes: Math.round(totalMinutes * 10) / 10,
        totalChapters,
        bookRange
    };
};

/**
 * 계획별 성경 범위 반환
 */
const getBookRangeForPlan = (planType: string): { start: number; end: number } => {
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
 * BibleStep 데이터 반환 (외부 모듈에서 가져오기)
 */
const getBibleStepData = () => {
    // 이 부분은 실제 BibleStep import로 대체
    return [
        { count: 50, index: 1, name: '창세기' },
        { count: 40, index: 2, name: '출애굽기' },
        { count: 27, index: 3, name: '레위기' },
        { count: 36, index: 4, name: '민수기' },
        { count: 34, index: 5, name: '신명기' },
        { count: 24, index: 6, name: '여호수아' },
        { count: 21, index: 7, name: '사사기' },
        { count: 4, index: 8, name: '룻기' },
        { count: 31, index: 9, name: '사무엘상' },
        { count: 24, index: 10, name: '사무엘하' },
        { count: 22, index: 11, name: '열왕기상' },
        { count: 25, index: 12, name: '열왕기하' },
        { count: 29, index: 13, name: '역대기상' },
        { count: 36, index: 14, name: '역대기하' },
        { count: 10, index: 15, name: '에스라' },
        { count: 13, index: 16, name: '느헤미야' },
        { count: 10, index: 17, name: '에스더' },
        { count: 42, index: 18, name: '욥기' },
        { count: 150, index: 19, name: '시편' },
        { count: 31, index: 20, name: '잠언' },
        { count: 12, index: 21, name: '전도서' },
        { count: 8, index: 22, name: '아가' },
        { count: 66, index: 23, name: '이사야' },
        { count: 52, index: 24, name: '예레미야' },
        { count: 5, index: 25, name: '예레미야 애가' },
        { count: 48, index: 26, name: '에스겔' },
        { count: 12, index: 27, name: '다니엘' },
        { count: 14, index: 28, name: '호세아' },
        { count: 3, index: 29, name: '요엘' },
        { count: 9, index: 30, name: '아모스' },
        { count: 1, index: 31, name: '오바댜' },
        { count: 4, index: 32, name: '요나' },
        { count: 7, index: 33, name: '미가' },
        { count: 3, index: 34, name: '나훔' },
        { count: 3, index: 35, name: '하박국' },
        { count: 3, index: 36, name: '스바냐' },
        { count: 2, index: 37, name: '학개' },
        { count: 14, index: 38, name: '스가랴' },
        { count: 4, index: 39, name: '말라기' },
        { count: 28, index: 40, name: '마태복음' },
        { count: 16, index: 41, name: '마가복음' },
        { count: 24, index: 42, name: '누가복음' },
        { count: 21, index: 43, name: '요한복음' },
        { count: 28, index: 44, name: '사도행전' },
        { count: 16, index: 45, name: '로마서' },
        { count: 16, index: 46, name: '고린도전서' },
        { count: 13, index: 47, name: '고린도후서' },
        { count: 6, index: 48, name: '갈라디아서' },
        { count: 6, index: 49, name: '에베소서' },
        { count: 4, index: 50, name: '빌립보서' },
        { count: 4, index: 51, name: '골로새서' },
        { count: 5, index: 52, name: '데살로니가전서' },
        { count: 3, index: 53, name: '데살로니가후서' },
        { count: 6, index: 54, name: '디모데전서' },
        { count: 4, index: 55, name: '디모데후서' },
        { count: 3, index: 56, name: '디도서' },
        { count: 1, index: 57, name: '빌레몬서' },
        { count: 13, index: 58, name: '히브리서' },
        { count: 5, index: 59, name: '야고보서' },
        { count: 5, index: 60, name: '베드로전서' },
        { count: 3, index: 61, name: '베드로후서' },
        { count: 5, index: 62, name: '요한일서' },
        { count: 1, index: 63, name: '요한이서' },
        { count: 1, index: 64, name: '요한삼서' },
        { count: 1, index: 65, name: '유다서' },
        { count: 22, index: 66, name: '요한계시록' }
    ];
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