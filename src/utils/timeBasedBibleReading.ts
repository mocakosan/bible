// src/utils/timeBasedBibleReading.ts
// 시간 기반 성경 일독 계산 시스템 - CSV 데이터 사용 버전

import { BibleStep } from './define';
import Papa from 'papaparse';
import { window } from 'react-native';

// CSV 데이터 타입 정의
interface ChapterTimeData {
    book: string;
    chapter: number;
    duration: string;
    totalSeconds: number;
    totalMinutes: number;
}

// 일일 읽기 계획 타입
export interface DailyReadingPlan {
    day: number;
    date: Date;
    chapters: {
        book: string;
        chapter: number;
        duration: string;
        minutes: number;
        seconds: number;
    }[];
    totalMinutes: number;
    totalSeconds: number;
    formattedTime: string;
}

// CSV 데이터 로드 함수
async function loadCSVData(): Promise<ChapterTimeData[]> {
    try {
        const csvContent = await window.fs.readFile('Bible_Chapter_Mapping_Fixed.csv', { encoding: 'utf8' });

        const parsed = Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            delimitersToGuess: [',', '\t', '|', ';']
        });

        // duration을 초로 변환
        const processedData = parsed.data.map(row => {
            const [minutes, seconds] = row.duration.trim().split(':').map(Number);
            const totalSeconds = minutes * 60 + seconds;

            return {
                book: row.book.trim(),
                chapter: row.chapter,
                duration: row.duration.trim(),
                totalSeconds: totalSeconds,
                totalMinutes: totalSeconds / 60
            };
        });

        return processedData;
    } catch (error) {
        console.error('CSV 로드 실패:', error);
        return [];
    }
}

// 시간을 포맷팅하는 함수
function formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
        return `${minutes}분 ${seconds}초`;
    } else {
        return `${seconds}초`;
    }
}

// 계획 타입별 필터링
function filterDataByPlanType(data: ChapterTimeData[], planType: string): ChapterTimeData[] {
    const planRanges = {
        'full_bible': { start: 0, end: 1189 },
        'old_testament': { start: 0, end: 929 },
        'new_testament': { start: 929, end: 1189 },
        'pentateuch': { start: 0, end: 187 },
        'psalms': { books: ['시편'] }
    };

    const range = planRanges[planType] || planRanges['full_bible'];

    if (planType === 'psalms') {
        return data.filter(ch => ch.book === '시편');
    }

    return data.slice(range.start, range.end);
}

/**
 * 🔥 메인 함수: CSV 데이터 기반 총 기간 계획 생성
 * 총 기간(173일)을 분 단위로 변환하여 하루 목표 시간을 고정
 *
 * @param totalDays 총 일독 기간 (일)
 * @param planType 계획 타입
 * @param startDate 시작 날짜
 */
export async function createTimeBasedReadingPlan(
    totalDays: number,
    planType: string,
    startDate: Date
): Promise<DailyReadingPlan[]> {
    // CSV 데이터 로드
    const csvData = await loadCSVData();
    if (csvData.length === 0) {
        console.error('CSV 데이터를 로드할 수 없습니다.');
        return [];
    }

    // 계획 타입별 데이터 필터링
    const filteredData = filterDataByPlanType(csvData, planType);

    // 정확한 시간 데이터 (CSV 데이터가 불완전한 경우 대비)
    const planTypeDefaults: { [key: string]: { totalMinutes: number; totalChapters: number } } = {
        'full_bible': { totalMinutes: 4756, totalChapters: 1189 },
        'old_testament': { totalMinutes: 3680, totalChapters: 929 },
        'new_testament': { totalMinutes: 1076, totalChapters: 260 },
        'pentateuch': { totalMinutes: 910, totalChapters: 187 },
        'psalms': { totalMinutes: 330, totalChapters: 150 }
    };

    const defaults = planTypeDefaults[planType] || planTypeDefaults['full_bible'];

    // 1. 전체 성경을 분 단위로 계산
    let totalMinutesInBible = 0;
    let totalSecondsInBible = 0;

    // CSV 데이터가 불완전한 경우 기본값 사용
    if (filteredData.length < defaults.totalChapters * 0.8) {
        totalMinutesInBible = defaults.totalMinutes;
        totalSecondsInBible = defaults.totalMinutes * 60;
        console.log(`⚠️ CSV 데이터 불완전. 기본값 사용: ${defaults.totalMinutes}분`);
    } else {
        totalSecondsInBible = filteredData.reduce((sum, ch) => sum + ch.totalSeconds, 0);
        totalMinutesInBible = totalSecondsInBible / 60;
    }

    // 2. 하루 목표 시간 계산 (분 단위) - 고정값
    const targetMinutesPerDay = Math.round(totalMinutesInBible / totalDays);
    const targetSecondsPerDay = targetMinutesPerDay * 60;

    console.log(`📊 일독 계획 계산:
        - 계획 타입: ${planType}
        - 총 기간: ${totalDays}일
        - 성경 범위: ${filteredData.length}장
        - 전체 시간: ${Math.round(totalMinutesInBible)}분
        - 하루 목표: ${targetMinutesPerDay}분 (고정)
    `);

    const plan: DailyReadingPlan[] = [];
    let currentDay = 1;
    let currentDate = new Date(startDate);
    let dailyChapters: DailyReadingPlan['chapters'] = [];
    let dailyTotalSeconds = 0;
    let chapterIndex = 0;

    // 3. 각 날짜별로 목표 시간에 맞춰 장수 배분
    while (chapterIndex < filteredData.length && currentDay <= totalDays) {
        const chapter = filteredData[chapterIndex];
        const [mins, secs] = chapter.duration.split(':').map(Number);

        // 현재 장을 추가
        dailyChapters.push({
            book: chapter.book,
            chapter: chapter.chapter,
            duration: chapter.duration,
            minutes: mins,
            seconds: secs
        });
        dailyTotalSeconds += chapter.totalSeconds;
        chapterIndex++;

        // 목표 시간에 도달했거나 마지막 장인 경우
        const isTargetReached = dailyTotalSeconds >= targetSecondsPerDay * 0.9; // 90% 도달 시
        const isLastChapter = chapterIndex === filteredData.length;
        const isLastDay = currentDay === totalDays;

        if ((isTargetReached && !isLastDay) || isLastChapter || isLastDay) {
            // 마지막 날이면 남은 모든 장을 포함
            if (isLastDay && !isLastChapter) {
                // 남은 장들을 모두 마지막 날에 추가
                while (chapterIndex < filteredData.length) {
                    const remainingChapter = filteredData[chapterIndex];
                    const [m, s] = remainingChapter.duration.split(':').map(Number);

                    dailyChapters.push({
                        book: remainingChapter.book,
                        chapter: remainingChapter.chapter,
                        duration: remainingChapter.duration,
                        minutes: m,
                        seconds: s
                    });
                    dailyTotalSeconds += remainingChapter.totalSeconds;
                    chapterIndex++;
                }
            }

            // 일일 계획 저장
            plan.push({
                day: currentDay,
                date: new Date(currentDate),
                chapters: [...dailyChapters],
                totalMinutes: Math.round(dailyTotalSeconds / 60),
                totalSeconds: dailyTotalSeconds,
                formattedTime: formatTime(dailyTotalSeconds)
            });

            // 다음 날 준비
            if (currentDay < totalDays) {
                currentDay++;
                currentDate.setDate(currentDate.getDate() + 1);
                dailyChapters = [];
                dailyTotalSeconds = 0;
            }
        }
    }

    console.log(`✅ 일독 계획 생성 완료: ${plan.length}일 계획`);

    // 계획 검증
    const totalPlannedChapters = plan.reduce((sum, day) => sum + day.chapters.length, 0);
    console.log(`검증: 계획된 총 장수 ${totalPlannedChapters} / 실제 ${filteredData.length}`);

    return plan;
}

/**
 * 진도 정보 계산
 */
export function calculateProgressInfo(
    plan: DailyReadingPlan[],
    completedChapters: { book: string; chapter: number }[]
): {
    totalProgress: number;
    todayProgress: number;
    estimatedTimeToday: string;
    remainingDays: number;
    isOnTrack: boolean;
    todayPlan?: DailyReadingPlan;
} {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPlan = plan.find(day => {
        const planDate = new Date(day.date);
        planDate.setHours(0, 0, 0, 0);
        return planDate.getTime() === today.getTime();
    });

    // 전체 진도율 계산
    const totalChapters = plan.reduce((sum, day) => sum + day.chapters.length, 0);
    const readChapters = completedChapters.length;
    const totalProgress = (readChapters / totalChapters) * 100;

    // 오늘 진도율 계산
    let todayProgress = 0;
    if (todayPlan) {
        const todayReadChapters = todayPlan.chapters.filter(ch =>
            completedChapters.some(c => c.book === ch.book && c.chapter === ch.chapter)
        ).length;
        todayProgress = (todayReadChapters / todayPlan.chapters.length) * 100;
    }

    // 남은 일수 계산
    const lastDay = plan[plan.length - 1];
    const remainingDays = lastDay ?
        Math.ceil((new Date(lastDay.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) :
        0;

    // 진도 체크
    const expectedProgress = ((plan.length - remainingDays) / plan.length) * 100;
    const isOnTrack = totalProgress >= expectedProgress - 5; // 5% 여유

    return {
        totalProgress,
        todayProgress,
        estimatedTimeToday: todayPlan ? todayPlan.formattedTime : '0분',
        remainingDays,
        isOnTrack,
        todayPlan
    };
}

/**
 * 하루 목표 시간 문자열 생성
 */
export function calculateDailyTargetTime(dailyPlan: DailyReadingPlan): string {
    return formatTime(dailyPlan.totalSeconds);
}

// Export all functions
export {
    formatTime,
    loadCSVData,
    filterDataByPlanType
};