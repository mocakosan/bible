import { BibleStep } from './define';

//시간 기반 장수 계산을 위한 확장된 BiblePlanData
export interface TimeBasedBiblePlanData {
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;

    // UI에서 보여줄 장 기반 데이터
    chaptersPerDay: number;
    totalChapters: number;

    // 내부 시간 기반 데이터
    targetMinutesPerDay: number;
    isTimeBasedCalculation: true;

    currentDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;
}

export interface ReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    estimatedMinutes: number;
}

// 장별 시간 데이터 저장소
let chapterTimeMap: Map<string, number> = new Map();

export const initializeChapterTimes = (audioData: any[]) => {
    chapterTimeMap.clear();

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

    audioData.forEach(row => {
        try {
            const filename = row['파일명'] || row['ÆÄÀÏ¸í'] || '';
            const lengthSeconds = row['Length'] || 0;

            const match = filename.match(/^([A-Za-z0-9]+)(\d{3})$/);
            if (match && lengthSeconds) {
                const bookCode = match[1];
                const chapterNum = parseInt(match[2], 10);
                const bookNumber = bookMapping[bookCode];

                if (bookNumber) {
                    const key = `${bookNumber}_${chapterNum}`;
                    // 오디오 시간을 읽기 시간으로 변환 (분 단위)
                    chapterTimeMap.set(key, (lengthSeconds / 60) * 1.2);
                }
            }
        } catch (error) {
            // 에러 무시하고 계속 진행
        }
    });

    console.log(`장별 시간 데이터 로드: ${chapterTimeMap.size}개`);
};

export const getChapterReadingTime = (book: number, chapter: number): number => {
    const key = `${book}_${chapter}`;
    const actualTime = chapterTimeMap.get(key);

    if (actualTime) {
        return Math.round(actualTime);
    }

    // 기본 추정치
    if (book === 19) return 2.5;
    if (book === 20) return 3.5;
    if (book <= 39) return 4.0;
    return 4.2;
};

export const calculateChaptersFromTimeGoal = (
    planType: string,
    targetMinutesPerDay: number
): number => {
    try {
        const bookRange = getBookRangeForPlan(planType);

        // 해당 계획의 평균 장당 시간 계산
        let totalTime = 0;
        let totalChapters = 0;

        for (let book = bookRange.start; book <= bookRange.end; book++) {
            const bookInfo = BibleStep?.find(step => step.index === book);
            if (bookInfo) {
                for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                    totalTime += getChapterReadingTime(book, chapter);
                    totalChapters++;
                }
            }
        }

        if (totalChapters === 0) {
            // 기본값 반환
            return Math.max(1, Math.round(targetMinutesPerDay / 4));
        }

        const avgTimePerChapter = totalTime / totalChapters;

        // 목표 시간으로 읽을 수 있는 장수 계산
        const chaptersForTargetTime = Math.round(targetMinutesPerDay / avgTimePerChapter);

        // 최소 1장, 최대 합리적인 범위로 제한
        return Math.max(1, Math.min(chaptersForTargetTime, 15));

    } catch (error) {
        console.warn('시간 기반 장수 계산 오류:', error);
        // 에러 발생 시 기본값 반환
        return Math.max(1, Math.round(targetMinutesPerDay / 4));
    }
};

export const createTimeBasedPlan = (
    planTypeId: string,
    startDate: Date,
    endDate: Date,
    targetMinutesPerDay: number
): TimeBasedBiblePlanData => {
    try {
        const planType = BIBLE_PLAN_TYPES.find(type => type.id === planTypeId);
        if (!planType) {
            throw new Error(`Invalid plan type: ${planTypeId}`);
        }

        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (totalDays <= 0) {
            throw new Error('Invalid date range');
        }

        //핵심: 시간 목표를 장수로 변환
        const chaptersPerDay = calculateChaptersFromTimeGoal(planTypeId, targetMinutesPerDay);

        return {
            planType: planTypeId,
            planName: planType.name,
            startDate: startDate.toISOString(),
            targetDate: endDate.toISOString(),
            totalDays,
            totalChapters: planType.totalChapters,

            // UI에서 보여줄 장 기반 데이터
            chaptersPerDay,

            // 내부 시간 기반 데이터
            targetMinutesPerDay,
            isTimeBasedCalculation: true,

            currentDay: 1,
            readChapters: [],
            createdAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('시간 기반 계획 생성 오류:', error);
        throw error;
    }
};

export const getTodayChaptersFromTime = (planData: TimeBasedBiblePlanData): ReadingStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);

    //핵심: 시간 목표에 맞는 장들을 순차적으로 선택
    const bookRange = getBookRangeForPlan(planData.planType);
    const targetTime = planData.targetMinutesPerDay;

    // 오늘까지 읽어야 할 누적 시간 계산
    const cumulativeTargetTime = currentDay * targetTime;

    // 이미 읽은 총 시간 계산
    const totalReadTime = planData.readChapters
        .filter(r => r.isRead)
        .reduce((sum, r) => sum + r.estimatedMinutes, 0);

    // 오늘 읽어야 할 시간
    const todayNeededTime = Math.max(0, cumulativeTargetTime - totalReadTime);

    if (todayNeededTime <= 0) {
        return []; // 이미 목표 달성
    }

    // 순차적으로 읽지 않은 장들을 시간에 맞게 선택
    return selectChaptersForTime(planData, todayNeededTime, bookRange);
};

const selectChaptersForTime = (
    planData: TimeBasedBiblePlanData,
    targetTime: number,
    bookRange: { start: number, end: number }
): ReadingStatus[] => {
    const result: ReadingStatus[] = [];
    let accumulatedTime = 0;

    for (let book = bookRange.start; book <= bookRange.end; book++) {
        const bookInfo = BibleStep.find(step => step.index === book);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            // 이미 읽은 장은 건너뛰기
            if (isChapterRead(planData, book, chapter)) {
                continue;
            }

            const chapterTime = getChapterReadingTime(book, chapter);

            // 목표 시간에 맞으면 추가
            if (accumulatedTime + chapterTime <= targetTime) {
                result.push({
                    book,
                    chapter,
                    date: new Date().toISOString(),
                    isRead: false,
                    estimatedMinutes: chapterTime
                });
                accumulatedTime += chapterTime;
            } else if (result.length === 0) {
                // 첫 번째 장이 시간을 초과해도 최소 1장은 추가
                result.push({
                    book,
                    chapter,
                    date: new Date().toISOString(),
                    isRead: false,
                    estimatedMinutes: chapterTime
                });
                break;
            } else {
                // 목표 시간 달성
                break;
            }

            // 너무 많은 장이 선택되지 않도록 제한
            if (result.length >= 10) {
                break;
            }
        }

        if (accumulatedTime >= targetTime || result.length >= 10) {
            break;
        }
    }

    return result;
};

export const getTodayChapters = (planData: any): ReadingStatus[] => {
    if (planData.isTimeBasedCalculation) {
        return getTodayChaptersFromTime(planData);
    }
    return getTodayChaptersLegacy(planData);
};

const getTodayChaptersLegacy = (planData: any): ReadingStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const startIndex = (currentDay - 1) * planData.chaptersPerDay;
    const endIndex = Math.min(startIndex + planData.chaptersPerDay, planData.totalChapters);

    const todayChapters: ReadingStatus[] = [];
    let globalChapterIndex = startIndex;

    for (let i = 0; i < planData.chaptersPerDay && globalChapterIndex < planData.totalChapters; i++) {
        const { book, chapter } = getBookAndChapterFromGlobalIndex(globalChapterIndex + 1);

        todayChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: false,
            estimatedMinutes: getChapterReadingTime(book, chapter)
        });

        globalChapterIndex++;
    }

    return todayChapters;
};

export const getChapterStatus = (
    planData: any,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    // 읽기 완료 확인
    const isRead = planData.readChapters?.some(
        (r: any) => r.book === book && r.chapter === chapter && r.isRead
    );

    if (isRead) return 'completed';

    if (planData.isTimeBasedCalculation) {
        return getChapterStatusTimeBased(planData, book, chapter);
    }

    return getChapterStatusLegacy(planData, book, chapter);
};

const getChapterStatusTimeBased = (planData: any, book: number, chapter: number): string => {
    try {
        const currentDay = getCurrentDay(planData.startDate);


        const todayChapters = getTodayChaptersFromTime(planData);
        const isTodayChapter = todayChapters.some(c => c.book === book && c.chapter === chapter);

        if (isTodayChapter) return 'today';


        if (currentDay > 1) {
            const bookRange = getBookRangeForPlan(planData.planType);
            if (book >= bookRange.start && book <= bookRange.end) {

                const chapterPosition = getChapterPositionInPlan(book, chapter, planData);
                const expectedDay = Math.ceil(chapterPosition / planData.targetMinutesPerDay);

                if (expectedDay === currentDay - 1) {
                    return 'yesterday';
                } else if (expectedDay < currentDay - 1) {
                    return 'missed';
                } else if (expectedDay > currentDay) {
                    return 'future';
                }
            }
        }

        return 'normal';
    } catch (error) {
        return 'normal';
    }
};

const getBookRangeForPlan = (planType: string) => {
    switch (planType) {
        case 'pentateuch': return { start: 1, end: 5 };
        case 'old_testament': return { start: 1, end: 39 };
        case 'new_testament': return { start: 40, end: 66 };
        case 'psalms': return { start: 19, end: 19 };
        case 'full_bible':
        default: return { start: 1, end: 66 };
    }
};

const isChapterRead = (planData: any, book: number, chapter: number): boolean => {
    return planData.readChapters?.some(
        (r: any) => r.book === book && r.chapter === chapter && r.isRead
    ) || false;
};

const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const getChapterPositionInPlan = (book: number, chapter: number, planData: any): number => {
    const bookRange = getBookRangeForPlan(planData.planType);
    let cumulativeTime = 0;

    for (let b = bookRange.start; b < book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (bookInfo) {
            for (let c = 1; c <= bookInfo.count; c++) {
                cumulativeTime += getChapterReadingTime(b, c);
            }
        }
    }

    for (let c = 1; c <= chapter; c++) {
        cumulativeTime += getChapterReadingTime(book, c);
    }

    return cumulativeTime;
};

const getBookAndChapterFromGlobalIndex = (globalIndex: number): { book: number, chapter: number } => {
    let remainingChapters = globalIndex;

    for (let i = 0; i < BibleStep.length; i++) {
        if (remainingChapters <= BibleStep[i].count) {
            return {
                book: i + 1,
                chapter: remainingChapters
            };
        }
        remainingChapters -= BibleStep[i].count;
    }

    return { book: 66, chapter: 22 };
};

const getChapterStatusLegacy = (planData: any, book: number, chapter: number): string => {

    return 'normal';
};

export const BIBLE_PLAN_TYPES = [
    {
        id: 'full_bible',
        name: '성경',
        description: '창세기 1장 ~ 요한계시록 22장',
        totalChapters: 1189,
        totalMinutes: 4715,
        totalSeconds: 29
    },
    {
        id: 'old_testament',
        name: '구약',
        description: '창세기 1장 ~ 말라기 4장',
        totalChapters: 939,
        totalMinutes: 3677,
        totalSeconds: 25
    },
    {
        id: 'new_testament',
        name: '신약',
        description: '마태복음 1장 ~ 요한계시록 22장',
        totalChapters: 250,
        totalMinutes: 1038,
        totalSeconds: 4
    },
    {
        id: 'pentateuch',
        name: '모세오경',
        description: '창세기 1장 ~ 신명기 34장',
        totalChapters: 187,
        totalMinutes: 910,
        totalSeconds: 17
    },
    {
        id: 'psalms',
        name: '시편',
        description: '시편 1장 ~ 시편 150장',
        totalChapters: 150,
        totalMinutes: 326,
        totalSeconds: 29
    }
];