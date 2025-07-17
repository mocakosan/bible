// src/utils/audioDataLoader.ts
// 🔥 음성파일 길이 데이터 로더 - React Native 호환

interface AudioChapterData {
    book: number;
    chapter: number;
    minutes: number;
    bookName: string;
}

/**
 * 성경 책 이름 매핑
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
 * 🔥 실제 음성파일 길이 데이터 (정적으로 정의)
 * CSV 파일 대신 코드 내에 직접 정의하여 React Native 환경에서 안전하게 사용
 */
export const AUDIO_DATA: AudioChapterData[] = [
    // 창세기 (실제 데이터로 교체 필요)
    { book: 1, chapter: 1, minutes: 4.52, bookName: '창세기' },
    { book: 1, chapter: 2, minutes: 3.37, bookName: '창세기' },
    { book: 1, chapter: 3, minutes: 3.97, bookName: '창세기' },
    { book: 1, chapter: 4, minutes: 3.97, bookName: '창세기' },
    { book: 1, chapter: 5, minutes: 2.5, bookName: '창세기' },

    // 🔥 TODO: 여기에 모든 성경 장의 실제 음성 시간 데이터를 추가하세요
    // 형식: { book: 북번호, chapter: 장번호, minutes: 분.초를_소수로, bookName: '성경책이름' }

    // 시편 예시 (정확한 시간 데이터 필요)
    { book: 19, chapter: 1, minutes: 1.5, bookName: '시편' },
    { book: 19, chapter: 23, minutes: 2.0, bookName: '시편' }, // 주의 목자
    { book: 19, chapter: 119, minutes: 8.5, bookName: '시편' }, // 긴 시편

    // 마태복음 예시
    { book: 40, chapter: 1, minutes: 4.2, bookName: '마태복음' },
    { book: 40, chapter: 2, minutes: 3.8, bookName: '마태복음' },
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
 * 특정 장의 음성 시간 반환
 */
export const getChapterAudioTime = (book: number, chapter: number): number => {
    const audioData = AUDIO_DATA.find(data => data.book === book && data.chapter === chapter);
    return audioData?.minutes || getDefaultTime(book, chapter);
};

/**
 * 기본 예상 시간 반환 (음성 데이터가 없는 경우)
 */
const getDefaultTime = (book: number, chapter?: number): number => {
    // 시편의 경우 장별로 다른 시간 적용
    if (book === 19 && chapter) {
        // 시편 장별 특별 처리
        if (chapter === 119) return 8.5;  // 가장 긴 시편
        if (chapter === 117) return 0.5;  // 가장 짧은 시편
        if ([23, 1, 8, 100].includes(chapter)) return 1.5; // 유명한 짧은 시편들
        return 2.5; // 시편 평균
    }

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

    console.log(`✅ 음성 시간 데이터 ${timeMap.size}개 로드 완료 (정적 데이터)`);
    return timeMap;
};

/**
 * 🔥 React Native 호환 초기화 함수
 * CSV 파일 대신 정적 데이터 사용
 */
export const initializeAudioData = (): boolean => {
    try {
        const timeMap = createAudioTimeMap();
        console.log(`✅ 음성 데이터 초기화 완료: ${timeMap.size}개 항목`);
        return true;
    } catch (error) {
        console.error('음성 데이터 초기화 실패:', error);
        return false;
    }
};

/**
 * 문자열 형태의 음성파일 데이터를 파싱 (현재는 사용하지 않음)
 */
export const parseAudioDataString = (dataString: string): AudioChapterData[] => {
    console.log('⚠️ parseAudioDataString은 React Native에서 사용되지 않습니다.');
    return [];
};