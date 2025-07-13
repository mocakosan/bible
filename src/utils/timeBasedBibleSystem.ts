// src/utils/timeBasedBibleSystem.ts
// 🔥 완전한 시간 기반 성경 읽기 시스템

import { BibleStep } from './define';

// === 타입 정의 ===
export interface TimeBasedBiblePlan {
    planType: string;
    planName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    calculatedMinutesPerDay: number;  // 시작일~종료일 기반 자동 계산된 하루 시간
    totalMinutes: number;
    totalChapters: number;

    // 시간 기반 계산 표시
    isTimeBasedCalculation: true;

    // 진행 상태
    currentDay: number;
    readChapters: ReadChapterStatus[];

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

        // CSV 파싱
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());

        // 헤더에서 필요한 컬럼 인덱스 찾기
        const filenameIndex = headers.findIndex(h =>
            h.includes('파일명') || h.includes('ÆÄÀÏ¸í') || h.toLowerCase().includes('filename')
        );
        const lengthIndex = headers.findIndex(h =>
            h.includes('Length') || h.includes('길이') || h.includes('시간')
        );

        if (filenameIndex === -1 || lengthIndex === -1) {
            console.warn('⚠️ CSV 파일에서 필수 컬럼을 찾을 수 없음');
            initializeDefaultTimes();
            return false;
        }

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

        // 데이터 파싱
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < Math.max(filenameIndex, lengthIndex) + 1) continue;

            const filename = values[filenameIndex] || '';
            const lengthStr = values[lengthIndex] || '0';

            // 시간을 초 단위로 변환
            let lengthSeconds = 0;
            if (lengthStr.includes(':')) {
                const parts = lengthStr.split(':');
                if (parts.length === 2) {
                    lengthSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                } else if (parts.length === 3) {
                    lengthSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                }
            } else {
                lengthSeconds = parseFloat(lengthStr) || 0;
            }

            // 파일명에서 성경 정보 추출 (예: Gen001, Mat028)
            const match = filename.match(/^([A-Za-z0-9]+)(\d{3})$/);
            if (match && lengthSeconds > 0) {
                const bookCode = match[1];
                const chapterNum = parseInt(match[2], 10);
                const bookNumber = bookMapping[bookCode];

                if (bookNumber && chapterNum > 0) {
                    const key = `${bookNumber}_${chapterNum}`;
                    // 오디오 시간을 읽기 시간으로 변환 (분 단위, 1.2배 느리게)
                    const readingTimeMinutes = (lengthSeconds / 60) * 1.2;
                    chapterTimeMap.set(key, Math.round(readingTimeMinutes * 10) / 10);
                }
            }
        }

        console.log(`✅ 장별 시간 데이터 로드 완료: ${chapterTimeMap.size}개`);
        return true;

    } catch (error) {
        console.warn('⚠️ 음성 데이터 로드 실패, 기본 추정치 사용:', error);
        initializeDefaultTimes();
        return false;
    }
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

    const bookRange = getBookRangeForPlan(planType);

    // 총 시간과 장수 계산
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

    // 🔥 하루 읽을 시간 자동 계산 (총 시간 ÷ 총 일수)
    const calculatedMinutesPerDay = Math.round((totalMinutes / totalDays) * 10) / 10;

    console.log(`📊 계산 결과: 총 ${totalDays}일, 하루 ${calculatedMinutesPerDay}분, 총 ${totalChapters}장`);

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
        createdAt: new Date().toISOString(),
        version: '2.0'
    };
};

/**
 * 현재 날짜 기준으로 몇 일차인지 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
};

/**
 * 🔥 특정 날짜에 읽어야 할 장들 계산 (시간 기반)
 */
export const getDailyReading = (planData: TimeBasedBiblePlan, day: number): DailyReading | null => {
    if (day < 1 || day > planData.totalDays) return null;

    const bookRange = getBookRangeForPlan(planData.planType);
    const targetTime = planData.calculatedMinutesPerDay;

    // day일차까지 읽어야 할 누적 시간
    const cumulativeTargetTime = day * targetTime;

    // (day-1)일차까지 읽어야 할 누적 시간
    const previousCumulativeTime = (day - 1) * targetTime;

    // 해당 일차에 읽어야 할 장들 찾기
    const chapters: ReadChapterStatus[] = [];
    let currentTime = 0;
    let bookIndex = bookRange.start;
    let chapterIndex = 1;

    // previousCumulativeTime까지 스킵
    while (currentTime < previousCumulativeTime && bookIndex <= bookRange.end) {
        const bookInfo = BibleStep.find(step => step.index === bookIndex);
        if (!bookInfo) {
            bookIndex++;
            continue;
        }

        if (chapterIndex <= bookInfo.count) {
            const chapterTime = getChapterReadingTime(bookIndex, chapterIndex);
            currentTime += chapterTime;
            chapterIndex++;
        } else {
            bookIndex++;
            chapterIndex = 1;
        }
    }

    // 해당 일차의 시작점 조정
    if (currentTime > previousCumulativeTime) {
        // 이전 장을 다시 포함해야 함
        chapterIndex--;
        if (chapterIndex < 1) {
            bookIndex--;
            const prevBookInfo = BibleStep.find(step => step.index === bookIndex);
            chapterIndex = prevBookInfo ? prevBookInfo.count : 1;
        }
        currentTime -= getChapterReadingTime(bookIndex, chapterIndex);
    }

    // 해당 일차에 읽을 장들 수집
    let dailyTime = 0;
    const startTime = currentTime;

    while (dailyTime < targetTime && bookIndex <= bookRange.end) {
        const bookInfo = BibleStep.find(step => step.index === bookIndex);
        if (!bookInfo) {
            bookIndex++;
            continue;
        }

        if (chapterIndex <= bookInfo.count) {
            const chapterTime = getChapterReadingTime(bookIndex, chapterIndex);

            // 시간 초과하지 않는 선에서 장 추가
            if (dailyTime + chapterTime <= targetTime * 1.1) { // 10% 여유
                const isRead = planData.readChapters.some(
                    r => r.book === bookIndex && r.chapter === chapterIndex && r.isRead
                );

                chapters.push({
                    book: bookIndex,
                    chapter: chapterIndex,
                    bookName: bookInfo.name,
                    date: new Date(new Date(planData.startDate).getTime() + (day - 1) * 24 * 60 * 60 * 1000).toISOString(),
                    isRead,
                    estimatedMinutes: Math.round(chapterTime * 10) / 10
                });

                dailyTime += chapterTime;
            }

            chapterIndex++;
        } else {
            bookIndex++;
            chapterIndex = 1;
        }

        // 무한 루프 방지
        if (chapters.length > 20) break;
    }

    const planDate = new Date(planData.startDate);
    planDate.setDate(planDate.getDate() + (day - 1));

    return {
        day,
        date: planDate.toISOString(),
        chapters,
        totalMinutes: Math.round(dailyTime * 10) / 10,
        isCompleted: chapters.every(ch => ch.isRead)
    };
};

/**
 * 오늘 읽어야 할 장들 반환
 */
export const getTodayChapters = (planData: TimeBasedBiblePlan): ReadChapterStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const dailyReading = getDailyReading(planData, currentDay);
    return dailyReading ? dailyReading.chapters : [];
};

/**
 * 장 읽기 완료 처리
 */
export const markChapterAsRead = (
    planData: TimeBasedBiblePlan,
    book: number,
    chapter: number
): TimeBasedBiblePlan => {
    const bookInfo = BibleStep.find(step => step.index === book);
    if (!bookInfo) return planData;

    const estimatedMinutes = getChapterReadingTime(book, chapter);

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
            bookName: bookInfo.name,
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
 * 진행률 계산
 */
export const calculatePeriodBasedProgress = (planData: TimeBasedBiblePlan) => {
    const currentDay = getCurrentDay(planData.startDate);

    // 읽은 총 시간 계산
    const readMinutes = planData.readChapters
        .filter(r => r.isRead)
        .reduce((sum, r) => sum + r.estimatedMinutes, 0);

    // 현재까지 읽어야 할 시간 계산
    const shouldReadMinutes = Math.min(currentDay, planData.totalDays) * planData.calculatedMinutesPerDay;

    // 진행률 계산 (시간 기준)
    const progressPercentage = Math.min((readMinutes / planData.totalMinutes) * 100, 100);

    // 읽은 장수 계산
    const readChapters = planData.readChapters.filter(r => r.isRead).length;

    return {
        currentDay,
        readMinutes: Math.round(readMinutes * 10) / 10,
        shouldReadMinutes: Math.round(shouldReadMinutes * 10) / 10,
        totalMinutes: planData.totalMinutes,
        readChapters,
        totalChapters: planData.totalChapters,
        progressPercentage: Math.round(progressPercentage * 10) / 10,
        isOnTrack: readMinutes >= shouldReadMinutes * 0.8, // 80% 이상이면 정상
        daysRemaining: Math.max(0, planData.totalDays - currentDay + 1)
    };
};

/**
 * 데이터 검증
 */
export const validatePlanData = (planData: any): boolean => {
    if (!planData || typeof planData !== 'object') return false;

    const requiredFields = [
        'planType', 'startDate', 'endDate', 'totalDays',
        'calculatedMinutesPerDay', 'totalMinutes', 'totalChapters'
    ];

    return requiredFields.every(field => planData[field] != null);
};

/**
 * 시간 포맷팅
 */
export const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${Math.round(minutes)}분`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
    }
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

/**
 * 진행률 표시기
 */
export const getProgressIndicator = (percentage: number): string => {
    if (percentage >= 90) return '🎉 거의 완료!';
    if (percentage >= 75) return '🔥 잘하고 있어요!';
    if (percentage >= 50) return '💪 중간 지점 통과!';
    if (percentage >= 25) return '📚 좋은 시작!';
    return '🌱 시작이 반!';
};

/**
 * 예상 완료일 계산
 */
export const getEstimatedCompletionDate = (planData: TimeBasedBiblePlan): string => {
    return formatDate(planData.endDate);
};