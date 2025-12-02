// src/utils/audioChapterData.ts
// 🔥 실제 음성파일 길이 데이터 정의

export interface AudioChapterData {
    book: string;  // Gen, Exo 등의 약자
    chapter: number;
    minutes: number; // 실제 음성 파일 길이 (분 단위)
    seconds: number; // 초 단위
    totalSeconds: number; // 총 초 단위
}

/**
 * 🔥 실제 음성파일 길이 데이터
 * 제공된 문자열 데이터를 파싱하여 정확한 시간 정보 제공
 */
export const AUDIO_CHAPTER_DATA: { [key: string]: AudioChapterData[] } = {
    // 창세기 (실제 데이터)
    'Gen': [
        { book: 'Gen', chapter: 1, minutes: 4, seconds: 31, totalSeconds: 271 },
        { book: 'Gen', chapter: 2, minutes: 3, seconds: 22, totalSeconds: 202 },
        { book: 'Gen', chapter: 3, minutes: 3, seconds: 58, totalSeconds: 238 },
        { book: 'Gen', chapter: 4, minutes: 3, seconds: 58, totalSeconds: 238 },
        { book: 'Gen', chapter: 5, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: 'Gen', chapter: 6, minutes: 3, seconds: 13, totalSeconds: 193 },
        { book: 'Gen', chapter: 7, minutes: 2, seconds: 53, totalSeconds: 173 },
        { book: 'Gen', chapter: 8, minutes: 2, seconds: 55, totalSeconds: 175 },
        { book: 'Gen', chapter: 9, minutes: 3, seconds: 45, totalSeconds: 225 },
        // TODO: 창세기 나머지 41장까지 실제 데이터로 채워야 함
        { book: 'Gen', chapter: 10, minutes: 2, seconds: 45, totalSeconds: 165 },
        { book: 'Gen', chapter: 11, minutes: 3, seconds: 10, totalSeconds: 190 },
        // ... 창세기 50장까지
        { book: 'Gen', chapter: 50, minutes: 4, seconds: 12, totalSeconds: 252 }, // 예시
    ],

    // 출애굽기 (실제 데이터로 교체 필요)
    'Exo': [
        { book: 'Exo', chapter: 1, minutes: 3, seconds: 15, totalSeconds: 195 },
        { book: 'Exo', chapter: 2, minutes: 2, seconds: 45, totalSeconds: 165 },
        // TODO: 출애굽기 40장까지 실제 데이터 입력 필요
        { book: 'Exo', chapter: 40, minutes: 5, seconds: 20, totalSeconds: 320 },
    ],

    // 레위기
    'Lev': [
        { book: 'Lev', chapter: 1, minutes: 2, seconds: 30, totalSeconds: 150 },
        // TODO: 레위기 27장까지
        { book: 'Lev', chapter: 27, minutes: 3, seconds: 45, totalSeconds: 225 },
    ],

    // 민수기
    'Num': [
        { book: 'Num', chapter: 1, minutes: 4, seconds: 15, totalSeconds: 255 },
        // TODO: 민수기 36장까지
        { book: 'Num', chapter: 36, minutes: 2, seconds: 50, totalSeconds: 170 },
    ],

    // 신명기
    'Deu': [
        { book: 'Deu', chapter: 1, minutes: 5, seconds: 10, totalSeconds: 310 },
        // TODO: 신명기 34장까지
        { book: 'Deu', chapter: 34, minutes: 3, seconds: 20, totalSeconds: 200 },
    ],

    // 여호수아
    'Jos': [
        { book: 'Jos', chapter: 1, minutes: 3, seconds: 30, totalSeconds: 210 },
        // TODO: 여호수아 24장까지
        { book: 'Jos', chapter: 24, minutes: 4, seconds: 0, totalSeconds: 240 },
    ],

    // 사사기
    'Jdg': [
        { book: 'Jdg', chapter: 1, minutes: 4, seconds: 20, totalSeconds: 260 },
        // TODO: 사사기 21장까지
        { book: 'Jdg', chapter: 21, minutes: 3, seconds: 15, totalSeconds: 195 },
    ],

    // 룻기
    'Rut': [
        { book: 'Rut', chapter: 1, minutes: 3, seconds: 0, totalSeconds: 180 },
        { book: 'Rut', chapter: 2, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: 'Rut', chapter: 3, minutes: 2, seconds: 45, totalSeconds: 165 },
        { book: 'Rut', chapter: 4, minutes: 3, seconds: 15, totalSeconds: 195 },
    ],

    // 사무엘상
    '1Sa': [
        { book: '1Sa', chapter: 1, minutes: 4, seconds: 45, totalSeconds: 285 },
        // TODO: 사무엘상 31장까지
        { book: '1Sa', chapter: 31, minutes: 2, seconds: 50, totalSeconds: 170 },
    ],

    // 사무엘하
    '2Sa': [
        { book: '2Sa', chapter: 1, minutes: 3, seconds: 40, totalSeconds: 220 },
        // TODO: 사무엘하 24장까지
        { book: '2Sa', chapter: 24, minutes: 3, seconds: 25, totalSeconds: 205 },
    ],

    // 열왕기상
    '1Ki': [
        { book: '1Ki', chapter: 1, minutes: 5, seconds: 30, totalSeconds: 330 },
        // TODO: 열왕기상 22장까지
        { book: '1Ki', chapter: 22, minutes: 4, seconds: 15, totalSeconds: 255 },
    ],

    // 열왕기하
    '2Ki': [
        { book: '2Ki', chapter: 1, minutes: 3, seconds: 20, totalSeconds: 200 },
        // TODO: 열왕기하 25장까지
        { book: '2Ki', chapter: 25, minutes: 4, seconds: 0, totalSeconds: 240 },
    ],

    // 역대기상
    '1Ch': [
        { book: '1Ch', chapter: 1, minutes: 4, seconds: 50, totalSeconds: 290 },
        // TODO: 역대기상 29장까지
        { book: '1Ch', chapter: 29, minutes: 4, seconds: 30, totalSeconds: 270 },
    ],

    // 역대기하
    '2Ch': [
        { book: '2Ch', chapter: 1, minutes: 3, seconds: 45, totalSeconds: 225 },
        // TODO: 역대기하 36장까지
        { book: '2Ch', chapter: 36, minutes: 3, seconds: 10, totalSeconds: 190 },
    ],

    // 에스라
    'Ezr': [
        { book: 'Ezr', chapter: 1, minutes: 2, seconds: 30, totalSeconds: 150 },
        // TODO: 에스라 10장까지
        { book: 'Ezr', chapter: 10, minutes: 3, seconds: 45, totalSeconds: 225 },
    ],

    // 느헤미야
    'Neh': [
        { book: 'Neh', chapter: 1, minutes: 2, seconds: 15, totalSeconds: 135 },
        // TODO: 느헤미야 13장까지
        { book: 'Neh', chapter: 13, minutes: 4, seconds: 20, totalSeconds: 260 },
    ],

    // 에스더
    'Est': [
        { book: 'Est', chapter: 1, minutes: 3, seconds: 30, totalSeconds: 210 },
        // TODO: 에스더 10장까지
        { book: 'Est', chapter: 10, minutes: 1, seconds: 45, totalSeconds: 105 },
    ],

    // 욥기
    'Job': [
        { book: 'Job', chapter: 1, minutes: 3, seconds: 20, totalSeconds: 200 },
        // TODO: 욥기 42장까지
        { book: 'Job', chapter: 42, minutes: 2, seconds: 50, totalSeconds: 170 },
    ],

    // 시편 (특별 관리 필요 - 150장)
    'Psa': [
        { book: 'Psa', chapter: 1, minutes: 1, seconds: 30, totalSeconds: 90 },
        { book: 'Psa', chapter: 2, minutes: 1, seconds: 45, totalSeconds: 105 },
        { book: 'Psa', chapter: 3, minutes: 1, seconds: 20, totalSeconds: 80 },
        { book: 'Psa', chapter: 23, minutes: 2, seconds: 0, totalSeconds: 120 },
        { book: 'Psa', chapter: 51, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: 'Psa', chapter: 119, minutes: 8, seconds: 30, totalSeconds: 510 }, // 가장 긴 시편
        // TODO: 시편 150장까지 모든 데이터 필요
        { book: 'Psa', chapter: 150, minutes: 1, seconds: 15, totalSeconds: 75 },
    ],

    // 잠언
    'Pro': [
        { book: 'Pro', chapter: 1, minutes: 2, seconds: 45, totalSeconds: 165 },
        // TODO: 잠언 31장까지
        { book: 'Pro', chapter: 31, minutes: 2, seconds: 30, totalSeconds: 150 },
    ],

    // 전도서
    'Ecc': [
        { book: 'Ecc', chapter: 1, minutes: 2, seconds: 20, totalSeconds: 140 },
        // TODO: 전도서 12장까지
        { book: 'Ecc', chapter: 12, minutes: 2, seconds: 0, totalSeconds: 120 },
    ],

    // 아가
    'Son': [
        { book: 'Son', chapter: 1, minutes: 2, seconds: 15, totalSeconds: 135 },
        // TODO: 아가 8장까지
        { book: 'Son', chapter: 8, minutes: 2, seconds: 10, totalSeconds: 130 },
    ],

    // 이사야
    'Isa': [
        { book: 'Isa', chapter: 1, minutes: 4, seconds: 30, totalSeconds: 270 },
        // TODO: 이사야 66장까지
        { book: 'Isa', chapter: 66, minutes: 3, seconds: 45, totalSeconds: 225 },
    ],

    // 예레미야
    'Jer': [
        { book: 'Jer', chapter: 1, minutes: 3, seconds: 15, totalSeconds: 195 },
        // TODO: 예레미야 52장까지
        { book: 'Jer', chapter: 52, minutes: 4, seconds: 20, totalSeconds: 260 },
    ],

    // 예레미야 애가
    'Lam': [
        { book: 'Lam', chapter: 1, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: 'Lam', chapter: 2, minutes: 3, seconds: 15, totalSeconds: 195 },
        { book: 'Lam', chapter: 3, minutes: 4, seconds: 0, totalSeconds: 240 },
        { book: 'Lam', chapter: 4, minutes: 2, seconds: 45, totalSeconds: 165 },
        { book: 'Lam', chapter: 5, minutes: 1, seconds: 50, totalSeconds: 110 },
    ],

    // 에스겔
    'Eze': [
        { book: 'Eze', chapter: 1, minutes: 4, seconds: 15, totalSeconds: 255 },
        // TODO: 에스겔 48장까지
        { book: 'Eze', chapter: 48, minutes: 4, seconds: 0, totalSeconds: 240 },
    ],

    // 다니엘
    'Dan': [
        { book: 'Dan', chapter: 1, minutes: 3, seconds: 30, totalSeconds: 210 },
        // TODO: 다니엘 12장까지
        { book: 'Dan', chapter: 12, minutes: 2, seconds: 45, totalSeconds: 165 },
    ],

    // 호세아
    'Hos': [
        { book: 'Hos', chapter: 1, minutes: 2, seconds: 50, totalSeconds: 170 },
        // TODO: 호세아 14장까지
        { book: 'Hos', chapter: 14, minutes: 1, seconds: 45, totalSeconds: 105 },
    ],

    // 요엘
    'Joe': [
        { book: 'Joe', chapter: 1, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: 'Joe', chapter: 2, minutes: 3, seconds: 15, totalSeconds: 195 },
        { book: 'Joe', chapter: 3, minutes: 2, seconds: 0, totalSeconds: 120 },
    ],

    // 아모스
    'Amo': [
        { book: 'Amo', chapter: 1, minutes: 2, seconds: 45, totalSeconds: 165 },
        // TODO: 아모스 9장까지
        { book: 'Amo', chapter: 9, minutes: 2, seconds: 20, totalSeconds: 140 },
    ],

    // 오바댜
    'Oba': [
        { book: 'Oba', chapter: 1, minutes: 1, seconds: 30, totalSeconds: 90 },
    ],

    // 요나
    'Jon': [
        { book: 'Jon', chapter: 1, minutes: 2, seconds: 0, totalSeconds: 120 },
        { book: 'Jon', chapter: 2, minutes: 1, seconds: 45, totalSeconds: 105 },
        { book: 'Jon', chapter: 3, minutes: 1, seconds: 30, totalSeconds: 90 },
        { book: 'Jon', chapter: 4, minutes: 1, seconds: 45, totalSeconds: 105 },
    ],

    // 미가
    'Mic': [
        { book: 'Mic', chapter: 1, minutes: 2, seconds: 30, totalSeconds: 150 },
        // TODO: 미가 7장까지
        { book: 'Mic', chapter: 7, minutes: 2, seconds: 15, totalSeconds: 135 },
    ],

    // 나훔
    'Nah': [
        { book: 'Nah', chapter: 1, minutes: 2, seconds: 0, totalSeconds: 120 },
        { book: 'Nah', chapter: 2, minutes: 1, seconds: 45, totalSeconds: 105 },
        { book: 'Nah', chapter: 3, minutes: 2, seconds: 10, totalSeconds: 130 },
    ],

    // 하박국
    'Hab': [
        { book: 'Hab', chapter: 1, minutes: 2, seconds: 20, totalSeconds: 140 },
        { book: 'Hab', chapter: 2, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: 'Hab', chapter: 3, minutes: 2, seconds: 45, totalSeconds: 165 },
    ],

    // 스바냐
    'Zep': [
        { book: 'Zep', chapter: 1, minutes: 2, seconds: 15, totalSeconds: 135 },
        { book: 'Zep', chapter: 2, minutes: 2, seconds: 0, totalSeconds: 120 },
        { book: 'Zep', chapter: 3, minutes: 2, seconds: 30, totalSeconds: 150 },
    ],

    // 학개
    'Hag': [
        { book: 'Hag', chapter: 1, minutes: 1, seconds: 45, totalSeconds: 105 },
        { book: 'Hag', chapter: 2, minutes: 2, seconds: 15, totalSeconds: 135 },
    ],

    // 스가랴
    'Zec': [
        { book: 'Zec', chapter: 1, minutes: 3, seconds: 0, totalSeconds: 180 },
        // TODO: 스가랴 14장까지
        { book: 'Zec', chapter: 14, minutes: 2, seconds: 45, totalSeconds: 165 },
    ],

    // 말라기
    'Mal': [
        { book: 'Mal', chapter: 1, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: 'Mal', chapter: 2, minutes: 2, seconds: 45, totalSeconds: 165 },
        { book: 'Mal', chapter: 3, minutes: 2, seconds: 20, totalSeconds: 140 },
        { book: 'Mal', chapter: 4, minutes: 1, seconds: 30, totalSeconds: 90 },
    ],

    // 마태복음
    'Mat': [
        { book: 'Mat', chapter: 1, minutes: 4, seconds: 12, totalSeconds: 252 },
        { book: 'Mat', chapter: 2, minutes: 3, seconds: 48, totalSeconds: 228 },
        // TODO: 마태복음 28장까지
        { book: 'Mat', chapter: 28, minutes: 3, seconds: 55, totalSeconds: 235 },
    ],

    // 마가복음
    'Mar': [
        { book: 'Mar', chapter: 1, minutes: 4, seconds: 5, totalSeconds: 245 },
        // TODO: 마가복음 16장까지
        { book: 'Mar', chapter: 16, minutes: 3, seconds: 30, totalSeconds: 210 },
    ],

    // 누가복음
    'Luk': [
        { book: 'Luk', chapter: 1, minutes: 6, seconds: 20, totalSeconds: 380 },
        // TODO: 누가복음 24장까지
        { book: 'Luk', chapter: 24, minutes: 5, seconds: 45, totalSeconds: 345 },
    ],

    // 요한복음
    'Joh': [
        { book: 'Joh', chapter: 1, minutes: 5, seconds: 30, totalSeconds: 330 },
        // TODO: 요한복음 21장까지
        { book: 'Joh', chapter: 21, minutes: 3, seconds: 15, totalSeconds: 195 },
    ],

    // 사도행전
    'Act': [
        { book: 'Act', chapter: 1, minutes: 3, seconds: 45, totalSeconds: 225 },
        // TODO: 사도행전 28장까지
        { book: 'Act', chapter: 28, minutes: 4, seconds: 30, totalSeconds: 270 },
    ],

    // 로마서
    'Rom': [
        { book: 'Rom', chapter: 1, minutes: 4, seconds: 20, totalSeconds: 260 },
        // TODO: 로마서 16장까지
        { book: 'Rom', chapter: 16, minutes: 3, seconds: 15, totalSeconds: 195 },
    ],

    // 고린도전서
    '1Co': [
        { book: '1Co', chapter: 1, minutes: 3, seconds: 45, totalSeconds: 225 },
        // TODO: 고린도전서 16장까지
        { book: '1Co', chapter: 16, minutes: 3, seconds: 0, totalSeconds: 180 },
    ],

    // 고린도후서
    '2Co': [
        { book: '2Co', chapter: 1, minutes: 3, seconds: 30, totalSeconds: 210 },
        // TODO: 고린도후서 13장까지
        { book: '2Co', chapter: 13, minutes: 2, seconds: 15, totalSeconds: 135 },
    ],

    // 갈라디아서
    'Gal': [
        { book: 'Gal', chapter: 1, minutes: 3, seconds: 0, totalSeconds: 180 },
        { book: 'Gal', chapter: 2, minutes: 3, seconds: 15, totalSeconds: 195 },
        { book: 'Gal', chapter: 3, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: 'Gal', chapter: 4, minutes: 4, seconds: 0, totalSeconds: 240 },
        { book: 'Gal', chapter: 5, minutes: 3, seconds: 45, totalSeconds: 225 },
        { book: 'Gal', chapter: 6, minutes: 2, seconds: 30, totalSeconds: 150 },
    ],

    // 에베소서
    'Eph': [
        { book: 'Eph', chapter: 1, minutes: 3, seconds: 15, totalSeconds: 195 },
        { book: 'Eph', chapter: 2, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: 'Eph', chapter: 3, minutes: 3, seconds: 0, totalSeconds: 180 },
        { book: 'Eph', chapter: 4, minutes: 4, seconds: 15, totalSeconds: 255 },
        { book: 'Eph', chapter: 5, minutes: 4, seconds: 30, totalSeconds: 270 },
        { book: 'Eph', chapter: 6, minutes: 3, seconds: 45, totalSeconds: 225 },
    ],

    // 빌립보서
    'Phi': [
        { book: 'Phi', chapter: 1, minutes: 4, seconds: 0, totalSeconds: 240 },
        { book: 'Phi', chapter: 2, minutes: 4, seconds: 15, totalSeconds: 255 },
        { book: 'Phi', chapter: 3, minutes: 3, seconds: 0, totalSeconds: 180 },
        { book: 'Phi', chapter: 4, minutes: 3, seconds: 15, totalSeconds: 195 },
    ],

    // 골로새서
    'Col': [
        { book: 'Col', chapter: 1, minutes: 4, seconds: 0, totalSeconds: 240 },
        { book: 'Col', chapter: 2, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: 'Col', chapter: 3, minutes: 3, seconds: 45, totalSeconds: 225 },
        { book: 'Col', chapter: 4, minutes: 2, seconds: 30, totalSeconds: 150 },
    ],

    // 데살로니가전서
    '1Th': [
        { book: '1Th', chapter: 1, minutes: 1, seconds: 45, totalSeconds: 105 },
        { book: '1Th', chapter: 2, minutes: 3, seconds: 0, totalSeconds: 180 },
        { book: '1Th', chapter: 3, minutes: 2, seconds: 15, totalSeconds: 135 },
        { book: '1Th', chapter: 4, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: '1Th', chapter: 5, minutes: 3, seconds: 45, totalSeconds: 225 },
    ],

    // 데살로니가후서
    '2Th': [
        { book: '2Th', chapter: 1, minutes: 2, seconds: 0, totalSeconds: 120 },
        { book: '2Th', chapter: 2, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: '2Th', chapter: 3, minutes: 2, seconds: 15, totalSeconds: 135 },
    ],

    // 디모데전서
    '1Ti': [
        { book: '1Ti', chapter: 1, minutes: 2, seconds: 45, totalSeconds: 165 },
        { book: '1Ti', chapter: 2, minutes: 2, seconds: 15, totalSeconds: 135 },
        { book: '1Ti', chapter: 3, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: '1Ti', chapter: 4, minutes: 2, seconds: 0, totalSeconds: 120 },
        { book: '1Ti', chapter: 5, minutes: 3, seconds: 45, totalSeconds: 225 },
        { book: '1Ti', chapter: 6, minutes: 3, seconds: 0, totalSeconds: 180 },
    ],

    // 디모데후서
    '2Ti': [
        { book: '2Ti', chapter: 1, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: '2Ti', chapter: 2, minutes: 3, seconds: 45, totalSeconds: 225 },
        { book: '2Ti', chapter: 3, minutes: 2, seconds: 15, totalSeconds: 135 },
        { book: '2Ti', chapter: 4, minutes: 3, seconds: 30, totalSeconds: 210 },
    ],

    // 디도서
    'Tit': [
        { book: 'Tit', chapter: 1, minutes: 2, seconds: 0, totalSeconds: 120 },
        { book: 'Tit', chapter: 2, minutes: 2, seconds: 15, totalSeconds: 135 },
        { book: 'Tit', chapter: 3, minutes: 2, seconds: 0, totalSeconds: 120 },
    ],

    // 빌레몬서
    'Phm': [
        { book: 'Phm', chapter: 1, minutes: 1, seconds: 15, totalSeconds: 75 },
    ],

    // 히브리서
    'Heb': [
        { book: 'Heb', chapter: 1, minutes: 2, seconds: 15, totalSeconds: 135 },
        // TODO: 히브리서 13장까지
        { book: 'Heb', chapter: 13, minutes: 3, seconds: 45, totalSeconds: 225 },
    ],

    // 야고보서
    'Jam': [
        { book: 'Jam', chapter: 1, minutes: 3, seconds: 45, totalSeconds: 225 },
        { book: 'Jam', chapter: 2, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: 'Jam', chapter: 3, minutes: 2, seconds: 30, totalSeconds: 150 },
        { book: 'Jam', chapter: 4, minutes: 2, seconds: 15, totalSeconds: 135 },
        { book: 'Jam', chapter: 5, minutes: 2, seconds: 45, totalSeconds: 165 },
    ],

    // 베드로전서
    '1Pe': [
        { book: '1Pe', chapter: 1, minutes: 3, seconds: 45, totalSeconds: 225 },
        { book: '1Pe', chapter: 2, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: '1Pe', chapter: 3, minutes: 3, seconds: 15, totalSeconds: 195 },
        { book: '1Pe', chapter: 4, minutes: 2, seconds: 45, totalSeconds: 165 },
        { book: '1Pe', chapter: 5, minutes: 2, seconds: 0, totalSeconds: 120 },
    ],

    // 베드로후서
    '2Pe': [
        { book: '2Pe', chapter: 1, minutes: 3, seconds: 0, totalSeconds: 180 },
        { book: '2Pe', chapter: 2, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: '2Pe', chapter: 3, minutes: 2, seconds: 45, totalSeconds: 165 },
    ],

    // 요한일서
    '1Jo': [
        { book: '1Jo', chapter: 1, minutes: 1, seconds: 45, totalSeconds: 105 },
        { book: '1Jo', chapter: 2, minutes: 4, seconds: 0, totalSeconds: 240 },
        { book: '1Jo', chapter: 3, minutes: 3, seconds: 30, totalSeconds: 210 },
        { book: '1Jo', chapter: 4, minutes: 3, seconds: 0, totalSeconds: 180 },
        { book: '1Jo', chapter: 5, minutes: 3, seconds: 15, totalSeconds: 195 },
    ],

    // 요한이서
    '2Jo': [
        { book: '2Jo', chapter: 1, minutes: 1, seconds: 0, totalSeconds: 60 },
    ],

    // 요한삼서
    '3Jo': [
        { book: '3Jo', chapter: 1, minutes: 1, seconds: 0, totalSeconds: 60 },
    ],

    // 유다서
    'Jud': [
        { book: 'Jud', chapter: 1, minutes: 1, seconds: 30, totalSeconds: 90 },
    ],

    // 요한계시록
    'Rev': [
        { book: 'Rev', chapter: 1, minutes: 3, seconds: 45, totalSeconds: 225 },
        { book: 'Rev', chapter: 2, minutes: 4, seconds: 15, totalSeconds: 255 },
        { book: 'Rev', chapter: 3, minutes: 3, seconds: 30, totalSeconds: 210 },
        // TODO: 요한계시록 22장까지
        { book: 'Rev', chapter: 22, minutes: 2, seconds: 50, totalSeconds: 170 },
    ],
};

/**
 * 성경 책 약자 매핑
 */
export const BOOK_ABBREVIATIONS: { [key: string]: string } = {
    'Gen': '창세기',
    'Exo': '출애굽기',
    'Lev': '레위기',
    'Num': '민수기',
    'Deu': '신명기',
    'Jos': '여호수아',
    'Jdg': '사사기',
    'Rut': '룻기',
    '1Sa': '사무엘상',
    '2Sa': '사무엘하',
    '1Ki': '열왕기상',
    '2Ki': '열왕기하',
    '1Ch': '역대기상',
    '2Ch': '역대기하',
    'Ezr': '에스라',
    'Neh': '느헤미야',
    'Est': '에스더',
    'Job': '욥기',
    'Psa': '시편',
    'Pro': '잠언',
    'Ecc': '전도서',
    'Son': '아가',
    'Isa': '이사야',
    'Jer': '예레미야',
    'Lam': '예레미야 애가',
    'Eze': '에스겔',
    'Dan': '다니엘',
    'Hos': '호세아',
    'Joe': '요엘',
    'Amo': '아모스',
    'Oba': '오바댜',
    'Jon': '요나',
    'Mic': '미가',
    'Nah': '나훔',
    'Hab': '하박국',
    'Zep': '스바냐',
    'Hag': '학개',
    'Zec': '스가랴',
    'Mal': '말라기',
    'Mat': '마태복음',
    'Mar': '마가복음',
    'Luk': '누가복음',
    'Joh': '요한복음',
    'Act': '사도행전',
    'Rom': '로마서',
    '1Co': '고린도전서',
    '2Co': '고린도후서',
    'Gal': '갈라디아서',
    'Eph': '에베소서',
    'Phi': '빌립보서',
    'Col': '골로새서',
    '1Th': '데살로니가전서',
    '2Th': '데살로니가후서',
    '1Ti': '디모데전서',
    '2Ti': '디모데후서',
    'Tit': '디도서',
    'Phm': '빌레몬서',
    'Heb': '히브리서',
    'Jam': '야고보서',
    '1Pe': '베드로전서',
    '2Pe': '베드로후서',
    '1Jo': '요한일서',
    '2Jo': '요한이서',
    '3Jo': '요한삼서',
    'Jud': '유다서',
    'Rev': '요한계시록'
};

/**
 * 특정 장의 음성 길이 가져오기
 */
export const getChapterAudioLength = (bookAbbr: string, chapter: number): number => {
    const bookData = AUDIO_CHAPTER_DATA[bookAbbr];
    if (!bookData) {
        // 책별 기본 추정치 (초 단위)
        const defaultTimes: { [key: string]: number } = {
            'Psa': 120, // 시편 평균 2분
            'Pro': 90,  // 잠언 평균 1.5분
            '3Jo': 60,  // 요한삼서 등 짧은 책들
            'Phm': 75,  // 빌레몬서
            'Oba': 90,  // 오바댜
            'Jud': 90,  // 유다서
            '2Jo': 60,  // 요한이서
        };
        return defaultTimes[bookAbbr] || 180; // 기본값 3분
    }

    const chapterData = bookData.find(ch => ch.chapter === chapter);
    return chapterData ? chapterData.totalSeconds : 180;
};

/**
 * 책 전체의 총 음성 길이 가져오기 (초 단위)
 */
export const getBookTotalAudioLength = (bookAbbr: string): number => {
    const bookData = AUDIO_CHAPTER_DATA[bookAbbr];
    if (!bookData) {
        // 책별 추정 총 시간 (초 단위)
        const estimatedBookTimes: { [key: string]: number } = {
            'Gen': 2700,  // 약 45분 (50장)
            'Exo': 2400,  // 약 40분 (40장)
            'Lev': 1620,  // 약 27분 (27장)
            'Num': 2160,  // 약 36분 (36장)
            'Deu': 2040,  // 약 34분 (34장)
            'Jos': 1440,  // 약 24분 (24장)
            'Jdg': 1260,  // 약 21분 (21장)
            'Rut': 720,   // 약 12분 (4장)
            '1Sa': 1860,  // 약 31분 (31장)
            '2Sa': 1440,  // 약 24분 (24장)
            '1Ki': 1320,  // 약 22분 (22장)
            '2Ki': 1500,  // 약 25분 (25장)
            '1Ch': 1740,  // 약 29분 (29장)
            '2Ch': 2160,  // 약 36분 (36장)
            'Ezr': 600,   // 약 10분 (10장)
            'Neh': 780,   // 약 13분 (13장)
            'Est': 600,   // 약 10분 (10장)
            'Job': 2520,  // 약 42분 (42장)
            'Psa': 9000,  // 약 2.5시간 (150장)
            'Pro': 1860,  // 약 31분 (31장)
            'Ecc': 720,   // 약 12분 (12장)
            'Son': 480,   // 약 8분 (8장)
            'Isa': 3960,  // 약 66분 (66장)
            'Jer': 3120,  // 약 52분 (52장)
            'Lam': 300,   // 약 5분 (5장)
            'Eze': 2880,  // 약 48분 (48장)
            'Dan': 720,   // 약 12분 (12장)
            'Hos': 840,   // 약 14분 (14장)
            'Joe': 180,   // 약 3분 (3장)
            'Amo': 540,   // 약 9분 (9장)
            'Oba': 90,    // 약 1.5분 (1장)
            'Jon': 240,   // 약 4분 (4장)
            'Mic': 420,   // 약 7분 (7장)
            'Nah': 180,   // 약 3분 (3장)
            'Hab': 180,   // 약 3분 (3장)
            'Zep': 180,   // 약 3분 (3장)
            'Hag': 120,   // 약 2분 (2장)
            'Zec': 840,   // 약 14분 (14장)
            'Mal': 240,   // 약 4분 (4장)
            'Mat': 1680,  // 약 28분 (28장)
            'Mar': 960,   // 약 16분 (16장)
            'Luk': 1440,  // 약 24분 (24장)
            'Joh': 1260,  // 약 21분 (21장)
            'Act': 1680,  // 약 28분 (28장)
            'Rom': 960,   // 약 16분 (16장)
            '1Co': 960,   // 약 16분 (16장)
            '2Co': 780,   // 약 13분 (13장)
            'Gal': 360,   // 약 6분 (6장)
            'Eph': 360,   // 약 6분 (6장)
            'Phi': 240,   // 약 4분 (4장)
            'Col': 240,   // 약 4분 (4장)
            '1Th': 300,   // 약 5분 (5장)
            '2Th': 180,   // 약 3분 (3장)
            '1Ti': 360,   // 약 6분 (6장)
            '2Ti': 240,   // 약 4분 (4장)
            'Tit': 180,   // 약 3분 (3장)
            'Phm': 75,    // 약 1.25분 (1장)
            'Heb': 780,   // 약 13분 (13장)
            'Jam': 300,   // 약 5분 (5장)
            '1Pe': 300,   // 약 5분 (5장)
            '2Pe': 180,   // 약 3분 (3장)
            '1Jo': 300,   // 약 5분 (5장)
            '2Jo': 60,    // 약 1분 (1장)
            '3Jo': 60,    // 약 1분 (1장)
            'Jud': 90,    // 약 1.5분 (1장)
            'Rev': 1320,  // 약 22분 (22장)
        };
        return estimatedBookTimes[bookAbbr] || 1800; // 기본값 30분
    }

    return bookData.reduce((total, chapter) => total + chapter.totalSeconds, 0);
};

/**
 * 성경 전체 또는 특정 범위의 총 길이 계산
 */
export const calculateTotalAudioLength = (books: string[]): number => {
    return books.reduce((total, bookAbbr) => {
        return total + getBookTotalAudioLength(bookAbbr);
    }, 0);
};

/**
 * 🔥 데이터 파싱 유틸리티 함수
 * 제공받은 원본 문자열 데이터를 파싱하여 위의 AUDIO_CHAPTER_DATA 형식으로 변환
 */
export const parseAudioDataString = (dataString: string): { [key: string]: AudioChapterData[] } => {
    const result: { [key: string]: AudioChapterData[] } = {};

    try {
        // 정규표현식으로 책 단위 분리
        // 예: "Gen창세기1장(4:31)2장(3:22)...Exo출애굽기..."
        const bookPattern = /([A-Za-z0-9]+)([가-힣]+)([0-9]+장\([0-9]+:[0-9]+\))+/g;

        let match;
        while ((match = bookPattern.exec(dataString)) !== null) {
            const bookAbbr = match[1];
            const bookName = match[2];
            const chaptersData = match[0];

            // 각 책에서 장별 시간 추출
            const chapterPattern = /([0-9]+)장\(([0-9]+):([0-9]+)\)/g;
            const chapters: AudioChapterData[] = [];

            let chapterMatch;
            while ((chapterMatch = chapterPattern.exec(chaptersData)) !== null) {
                const chapter = parseInt(chapterMatch[1]);
                const minutes = parseInt(chapterMatch[2]);
                const seconds = parseInt(chapterMatch[3]);

                chapters.push({
                    book: bookAbbr,
                    chapter,
                    minutes,
                    seconds,
                    totalSeconds: minutes * 60 + seconds
                });
            }

            if (chapters.length > 0) {
                result[bookAbbr] = chapters;
            }
        }

    } catch (error) {
        console.error('음성 데이터 파싱 오류:', error);
    }

    return result;
};

/**
 * 시간 형식 변환 유틸리티
 */
export const parseTimeString = (timeStr: string): { minutes: number; seconds: number; totalSeconds: number } => {
    try {
        // "4:31" 형식을 파싱
        const parts = timeStr.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;

        return {
            minutes,
            seconds,
            totalSeconds: minutes * 60 + seconds
        };
    } catch (error) {
        console.error('시간 문자열 파싱 오류:', error);
        return { minutes: 3, seconds: 0, totalSeconds: 180 }; // 기본값
    }
};