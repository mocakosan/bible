import { Platform, AppState } from 'react-native';
import { defaultStorage } from "./mmkv";
import { BibleStep } from "./define";

// 성경일독 타입 정의
export interface BiblePlanType {
    id: string;
    name: string;
    description: string;
    totalChapters: number;
    totalMinutes: number;
    totalSeconds: number;
}

export interface ReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    type: 'today' | 'yesterday' | 'missed' | 'completed' | 'future';
}

export interface BiblePlanData {
    planType: string;
    planName: string;
    startDate: string;
    targetDate: string;
    totalDays: number;
    chaptersPerDay: number;
    minutesPerDay: number;
    totalChapters: number;
    currentDay: number;
    readChapters: ReadingStatus[];
    createdAt: string;
}

// 성경일독 타입 상수
export const BIBLE_PLAN_TYPES: BiblePlanType[] = [
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

/**
 * 현재 일독 계획 데이터 로드
 */
export const loadBiblePlanData = (): BiblePlanData | null => {
    const savedPlan = defaultStorage.getString('bible_reading_plan');
    return savedPlan ? JSON.parse(savedPlan) : null;
};

/**
 * 일독 계획 데이터 저장
 */
export const saveBiblePlanData = (planData: BiblePlanData): void => {
    defaultStorage.set('bible_reading_plan', JSON.stringify(planData));
};

/**
 * 일독 계획 삭제
 */
export const deleteBiblePlanData = (): void => {
    defaultStorage.delete('bible_reading_plan');
};

/**
 * 현재 날짜 기준으로 읽어야 할 일차 계산
 */
export const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * 놓친 장 개수 계산
 */
export const calculateMissedChapters = (planData: BiblePlanData): number => {
    const currentDay = getCurrentDay(planData.startDate);
    const shouldHaveRead = Math.min(currentDay * planData.chaptersPerDay, planData.totalChapters);
    const actuallyRead = planData.readChapters.filter(r => r.isRead).length;

    return Math.max(0, shouldHaveRead - actuallyRead);
};

/**
 * 오늘 읽어야 할 장들 가져오기
 */
export const getTodayChapters = (planData: BiblePlanData): ReadingStatus[] => {
    const currentDay = getCurrentDay(planData.startDate);
    const startIndex = (currentDay - 1) * planData.chaptersPerDay;
    const endIndex = Math.min(startIndex + planData.chaptersPerDay, planData.totalChapters);

    // 실제 성경 책과 장 매핑 로직
    const todayChapters: ReadingStatus[] = [];
    let globalChapterIndex = startIndex;

    for (let i = 0; i < planData.chaptersPerDay && globalChapterIndex < planData.totalChapters; i++) {
        const { book, chapter } = getBookAndChapterFromGlobalIndex(globalChapterIndex + 1);

        todayChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: false,
            type: 'today'
        });

        globalChapterIndex++;
    }

    return todayChapters;
};

/**
 * 전역 장 인덱스로부터 책과 장을 계산하는 함수
 */
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

    // 마지막 장
    return {
        book: 66,
        chapter: BibleStep[65].count
    };
};

/**
 * 성경 전체 장 순서를 계산하는 헬퍼 함수
 */
const getGlobalChapterIndex = (book: number, chapter: number): number => {
    let totalChapters = 0;

    // 해당 책 이전까지의 모든 장 수를 더함
    for (let i = 0; i < book - 1; i++) {
        totalChapters += BibleStep[i].count;
    }

    // 현재 책의 장 번호를 더함
    return totalChapters + chapter;
};

/**
 * 장을 읽음으로 표시
 */
export const markChapterAsRead = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): BiblePlanData => {
    const updatedReadChapters = [...planData.readChapters];
    const existingIndex = updatedReadChapters.findIndex(
        r => r.book === book && r.chapter === chapter
    );

    if (existingIndex >= 0) {
        updatedReadChapters[existingIndex].isRead = true;
        updatedReadChapters[existingIndex].date = new Date().toISOString();
    } else {
        updatedReadChapters.push({
            book,
            chapter,
            date: new Date().toISOString(),
            isRead: true,
            type: 'completed'
        });
    }

    const updatedPlanData = {
        ...planData,
        readChapters: updatedReadChapters
    };

    saveBiblePlanData(updatedPlanData);
    return updatedPlanData;
};

/**
 * 앱 뱃지 업데이트 (iOS)
 */
export const updateAppBadge = (missedCount: number): void => {
    if (Platform.OS === 'ios') {
        // PushNotificationIOS.setApplicationIconBadgeNumber(missedCount);
    }
    // Android의 경우 react-native-notifications 또는 다른 라이브러리 사용 필요
};

/**
 * 일독 진행률 계산
 */
export const calculateProgress = (planData: BiblePlanData): {
    completedChapters: number;
    totalChapters: number;
    progressPercentage: number;
    daysElapsed: number;
    totalDays: number;
} => {
    const completedChapters = planData.readChapters.filter(r => r.isRead).length;
    const daysElapsed = getCurrentDay(planData.startDate);
    const progressPercentage = (completedChapters / planData.totalChapters) * 100;

    return {
        completedChapters,
        totalChapters: planData.totalChapters,
        progressPercentage,
        daysElapsed: Math.max(1, daysElapsed),
        totalDays: planData.totalDays
    };
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}년${String(d.getMonth() + 1).padStart(2, '0')}월${String(d.getDate()).padStart(2, '0')}일`;
};

/**
 * 시간 포맷팅 (분 -> 시간:분)
 */
export const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
};

/**
 * 장 상태 확인 - 수정된 버전
 */
export const getChapterStatus = (
    planData: BiblePlanData,
    book: number,
    chapter: number
): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
    if (!planData) return 'normal';

    const currentDay = getCurrentDay(planData.startDate);

    // 읽기 완료 여부 확인
    const isRead = planData.readChapters.some(
        r => r.book === book && r.chapter === chapter && r.isRead
    );

    if (isRead) return 'completed';

    // 이 장이 몇 일차에 해당하는지 계산
    const chapterDay = findChapterDayInPlan(book, chapter, planData);

    if (chapterDay === -1) return 'normal'; // 계획에 포함되지 않은 장

    if (chapterDay < currentDay - 1) {
        return 'missed';
    } else if (chapterDay === currentDay - 1) {
        return 'yesterday';
    } else if (chapterDay === currentDay) {
        return 'today';
    } else {
        return 'future';
    }
};

/**
 * 일독 계획에서 특정 장이 몇 일차에 해당하는지 찾기
 */
const findChapterDayInPlan = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    try {
        switch (planData.planType) {
            case 'full_bible':
                return findChapterDayInFullBible(book, chapter, planData);
            case 'new_testament':
                if (book >= 40 && book <= 66) {
                    return findChapterDayInNewTestament(book, chapter, planData);
                }
                break;
            case 'old_testament':
                if (book >= 1 && book <= 39) {
                    return findChapterDayInOldTestament(book, chapter, planData);
                }
                break;
            case 'pentateuch':
                if (book >= 1 && book <= 5) {
                    return findChapterDayInPentateuch(book, chapter, planData);
                }
                break;
            case 'psalms':
                if (book === 19) {
                    return findChapterDayInPsalms(chapter, planData);
                }
                break;
            default:
                return -1;
        }
        return -1;
    } catch (error) {
        console.error('장 일수 계산 오류:', error);
        return -1;
    }
};

// 신약 챕터 일수 찾기
const findChapterDayInNewTestament = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    let totalChapters = 0;

    // 신약 시작 전까지의 장수 계산
    for (let b = 40; b < book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (bookInfo) {
            totalChapters += bookInfo.count;
        }
    }

    // 현재 책의 챕터 추가
    totalChapters += chapter;

    // 하루에 읽을 장수로 나누어 몇 일째인지 계산
    return Math.ceil(totalChapters / planData.chaptersPerDay);
};

// 구약 챕터 일수 찾기
const findChapterDayInOldTestament = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    let totalChapters = 0;

    // 구약 시작 전까지의 장수 계산
    for (let b = 1; b < book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (bookInfo) {
            totalChapters += bookInfo.count;
        }
    }

    // 현재 책의 챕터 추가
    totalChapters += chapter;

    // 하루에 읽을 장수로 나누어 몇 일째인지 계산
    return Math.ceil(totalChapters / planData.chaptersPerDay);
};

// 모세오경 챕터 일수 찾기
const findChapterDayInPentateuch = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    let totalChapters = 0;

    // 모세오경 시작 전까지의 장수 계산
    for (let b = 1; b < book; b++) {
        const bookInfo = BibleStep.find(step => step.index === b);
        if (bookInfo && b <= 5) { // 모세오경 범위 내에서만
            totalChapters += bookInfo.count;
        }
    }

    // 현재 책의 챕터 추가
    totalChapters += chapter;

    // 하루에 읽을 장수로 나누어 몇 일째인지 계산
    return Math.ceil(totalChapters / planData.chaptersPerDay);
};

// 시편 챕터 일수 찾기
const findChapterDayInPsalms = (
    chapter: number,
    planData: BiblePlanData
): number => {
    // 시편은 장 번호가 곧 순서
    return Math.ceil(chapter / planData.chaptersPerDay);
};

// 전체 성경 챕터 일수 찾기 (맥체인)
const findChapterDayInFullBible = (
    book: number,
    chapter: number,
    planData: BiblePlanData
): number => {
    const globalIndex = getGlobalChapterIndex(book, chapter);
    return Math.ceil(globalIndex / planData.chaptersPerDay);
};

/**
 * 알림 스케줄링 (푸시 알림)
 */
export const scheduleDailyReminder = (time: string = '07:00'): void => {
    // 여기서 푸시 알림 스케줄링 로직
    // react-native-notifications 또는 @react-native-async-storage/async-storage 사용
};

/**
 * 애드몹 광고 로드 체크
 */
export const shouldShowAd = (): boolean => {
    const lastAdShown = defaultStorage.getString('last_ad_shown');
    const now = new Date();

    if (!lastAdShown) {
        return true;
    }

    const lastShown = new Date(lastAdShown);
    const timeDiff = now.getTime() - lastShown.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // 3시간마다 광고 표시
    return hoursDiff >= 3;
};

/**
 * 광고 표시 기록
 */
export const markAdAsShown = (): void => {
    defaultStorage.set('last_ad_shown', new Date().toISOString());
};

/**
 * 일독 통계 가져오기
 */
export const getBiblePlanStats = (planData: BiblePlanData): {
    streak: number; // 연속 읽기 일수
    totalReadDays: number; // 총 읽은 일수
    averageChaptersPerDay: number; // 일평균 읽은 장수
    estimatedCompletionDate: string; // 예상 완료일
} => {
    const readDates = planData.readChapters
        .filter(r => r.isRead)
        .map(r => r.date.split('T')[0]) // 날짜만 추출
        .filter((date, index, arr) => arr.indexOf(date) === index) // 중복 제거
        .sort();

    // 연속 읽기 일수 계산
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = new Date(today);

    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (readDates.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    const totalReadDays = readDates.length;
    const daysElapsed = getCurrentDay(planData.startDate);
    const averageChaptersPerDay = totalReadDays > 0 ?
        planData.readChapters.filter(r => r.isRead).length / totalReadDays : 0;

    // 예상 완료일 계산
    const remainingChapters = planData.totalChapters - planData.readChapters.filter(r => r.isRead).length;
    const daysToComplete = Math.ceil(remainingChapters / Math.max(averageChaptersPerDay, 1));
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + daysToComplete);

    return {
        streak,
        totalReadDays,
        averageChaptersPerDay: Math.round(averageChaptersPerDay * 10) / 10,
        estimatedCompletionDate: formatDate(estimatedCompletion)
    };
};