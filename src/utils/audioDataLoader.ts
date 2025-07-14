// src/utils/audioDataLoader.ts
// 🔥 음성파일 길이 데이터 로더

/**
 * 제공해주신 음성파일 길이 데이터를 파싱하여 사용할 수 있는 형태로 변환
 * 실제 프로젝트에서는 이 데이터를 JSON 파일이나 API에서 가져올 수 있습니다
 */

interface AudioChapterData {
    book: number;
    chapter: number;
    minutes: number;
    bookName: string;
}

// 🔥 실제 음성파일 길이 데이터 (예시)
// 제공해주신 형식에 맞춰 실제 데이터로 교체하세요
export const AUDIO_DATA: AudioChapterData[] = [
    // 창세기 예시 (제공해주신 데이터 기반)
    { book: 1, chapter: 1, minutes: 4.52, bookName: '창세기' }, // 4분 31초
    { book: 1, chapter: 2, minutes: 3.37, bookName: '창세기' }, // 3분 22초
    { book: 1, chapter: 3, minutes: 3.97, bookName: '창세기' }, // 3분 58초
    { book: 1, chapter: 4, minutes: 3.97, bookName: '창세기' }, // 3분 58초
    { book: 1, chapter: 5, minutes: 2.5, bookName: '창세기' },  // 2분 30초
    { book: 1, chapter: 6, minutes: 3.22, bookName: '창세기' }, // 3분 13초
    { book: 1, chapter: 7, minutes: 2.88, bookName: '창세기' }, // 2분 53초
    { book: 1, chapter: 8, minutes: 2.92, bookName: '창세기' }, // 2분 55초
    { book: 1, chapter: 9, minutes: 3.75, bookName: '창세기' }, // 3분 45초

    // 🔥 여기에 실제 음성파일 데이터를 모두 추가하세요
    // 형식: { book: 북번호, chapter: 장번호, minutes: 분.초를_소수로, bookName: '성경책이름' }

    // 예시: 마태복음
    { book: 40, chapter: 1, minutes: 4.2, bookName: '마태복음' },
    { book: 40, chapter: 2, minutes: 3.8, bookName: '마태복음' },
    // ... 계속 추가
];

/**
 * 성경 약자를 북 번호로 변환하는 매핑
 */
export const BOOK_CODE_MAPPING: { [key: string]: number } = {
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

/**
 * 문자열 형태의 음성파일 데이터를 파싱
 */
export const parseAudioDataString = (dataString: string): AudioChapterData[] => {
    const result: AudioChapterData[] = [];

    try {
        // 예시 형식: "Gen001 (4:31), Gen002 (3:22)" 등을 파싱
        const chapterPattern = /([A-Za-z0-9]+)(\d{3})\s*\((\d+):(\d+)\)/g;
        let match;

        while ((match = chapterPattern.exec(dataString)) !== null) {
            const [, bookCode, chapterStr, minutes, seconds] = match;
            const chapterNum = parseInt(chapterStr, 10);
            const totalMinutes = parseInt(minutes) + parseInt(seconds) / 60;

            const bookNumber = BOOK_CODE_MAPPING[bookCode];
            if (bookNumber && chapterNum > 0) {
                result.push({
                    book: bookNumber,
                    chapter: chapterNum,
                    minutes: totalMinutes,
                    bookName: getBookName(bookNumber)
                });
            }
        }
    } catch (error) {
        console.error('음성파일 데이터 파싱 오류:', error);
    }

    return result;
};

/**
 * 북 번호로 성경책 이름 반환
 */
const getBookName = (bookNumber: number): string => {
    const bookNames = [
        '', '창세기', '출애굽기', '레위기', '민수기', '신명기', '여호수아', '사사기', '룻기',
        '사무엘상', '사무엘하', '열왕기상', '열왕기하', '역대기상', '역대기하', '에스라', '느헤미야',
        '에스더', '욥기', '시편', '잠언', '전도서', '아가', '이사야', '예레미야', '예레미야 애가',
        '에스겔', '다니엘', '호세아', '요엘', '아모스', '오바댜', '요나', '미가', '나훔', '하박국',
        '스바냐', '학개', '스가랴', '말라기', '마태복음', '마가복음', '누가복음', '요한복음',
        '사도행전', '로마서', '고린도전서', '고린도후서', '갈라디아서', '에베소서', '빌립보서',
        '골로새서', '데살로니가전서', '데살로니가후서', '디모데전서', '디모데후서', '디도서',
        '빌레몬서', '히브리서', '야고보서', '베드로전서', '베드로후서', '요한일서', '요한이서',
        '요한삼서', '유다서', '요한계시록'
    ];

    return bookNames[bookNumber] || '';
};

/**
 * 특정 장의 음성 시간 반환
 */
export const getChapterAudioTime = (book: number, chapter: number): number => {
    const audioData = AUDIO_DATA.find(data => data.book === book && data.chapter === chapter);
    return audioData?.minutes || getDefaultTime(book);
};

/**
 * 기본 예상 시간 반환 (음성 데이터가 없는 경우)
 */
const getDefaultTime = (book: number): number => {
    if (book === 19) return 2.5;      // 시편
    if (book === 20) return 3.5;      // 잠언
    if (book <= 39) return 4.0;       // 구약
    return 4.2;                       // 신약
};

/**
 * 전체 음성 데이터를 Map 형태로 반환
 */
export const createAudioTimeMap = (): Map<string, number> => {
    const timeMap = new Map<string, number>();

    // 실제 음성 데이터 추가
    AUDIO_DATA.forEach(data => {
        const key = `${data.book}_${data.chapter}`;
        timeMap.set(key, data.minutes);
    });

    console.log(`✅ 음성 시간 데이터 ${timeMap.size}개 로드 완료`);
    return timeMap;
};