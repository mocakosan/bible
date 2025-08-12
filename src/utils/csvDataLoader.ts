// src/utils/csvDataLoader.ts
// CSV 파일에서 성경 장별 시간 데이터를 로드하고 관리하는 모듈

import Papa from 'papaparse';
import { BibleStep } from './define';
import { defaultStorage } from './mmkv';
import {window} from "react-native";

// 타입 정의
export interface ChapterTimeData {
    bookIndex: number;
    bookName: string;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    duration: string;
}

// 캐시 저장소
let chapterTimeCache: Map<string, ChapterTimeData> = new Map();
let isDataLoaded = false;

/**
 * CSV 파일에서 시간 데이터 로드
 */
export async function loadChapterTimeDataFromCSV(): Promise<boolean> {
    try {
        // React Native 환경에서 CSV 파일 읽기
        const csvContent = await window.fs.readFile('Bible_Chapter_Mapping_Fixed.csv', { encoding: 'utf8' });

        const parsed = Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            delimitersToGuess: [',', '\t', '|', ';']
        });

        // 데이터 처리 및 캐싱
        parsed.data.forEach((row: any) => {
            const bookName = row.book?.trim();
            const chapter = parseInt(row.chapter);
            const duration = row.duration?.trim();

            if (!bookName || !chapter || !duration) return;

            // BibleStep에서 bookIndex 찾기
            const bookIndex = findBookIndex(bookName);
            if (bookIndex === -1) return;

            // duration 파싱 (MM:SS 형식)
            const [minutes, seconds] = duration.split(':').map(Number);
            const totalSeconds = minutes * 60 + seconds;

            const timeData: ChapterTimeData = {
                bookIndex,
                bookName,
                chapter,
                minutes,
                seconds,
                totalSeconds,
                duration
            };

            // 캐시에 저장 (key: "bookIndex-chapter")
            const key = `${bookIndex}-${chapter}`;
            chapterTimeCache.set(key, timeData);
        });

        isDataLoaded = true;

        // 로컬 스토리지에도 저장 (옵션)
        saveToLocalStorage();

        console.log(`✅ CSV 데이터 로드 완료: ${chapterTimeCache.size}개 장`);
        return true;

    } catch (error) {
        console.error('❌ CSV 데이터 로드 실패:', error);

        // 로컬 스토리지에서 복구 시도
        return loadFromLocalStorage();
    }
}

/**
 * 책 이름으로 인덱스 찾기
 */
function findBookIndex(bookName: string): number {
    const bookNameMap: { [key: string]: number } = {
        '창세기': 1, '출애굽기': 2, '레위기': 3, '민수기': 4, '신명기': 5,
        '여호수아': 6, '사사기': 7, '룻기': 8, '사무엘상': 9, '사무엘하': 10,
        '열왕기상': 11, '열왕기하': 12, '역대상': 13, '역대하': 14, '에스라': 15,
        '느헤미야': 16, '에스더': 17, '욥기': 18, '시편': 19, '잠언': 20,
        '전도서': 21, '아가': 22, '이사야': 23, '예레미야': 24, '예레미야애가': 25,
        '에스겔': 26, '다니엘': 27, '호세아': 28, '요엘': 29, '아모스': 30,
        '오바댜': 31, '요나': 32, '미가': 33, '나훔': 34, '하박국': 35,
        '스바냐': 36, '학개': 37, '스가랴': 38, '말라기': 39,
        '마태복음': 40, '마가복음': 41, '누가복음': 42, '요한복음': 43,
        '사도행전': 44, '로마서': 45, '고린도전서': 46, '고린도후서': 47,
        '갈라디아서': 48, '에베소서': 49, '빌립보서': 50, '골로새서': 51,
        '데살로니가전서': 52, '데살로니가후서': 53, '디모데전서': 54, '디모데후서': 55,
        '디도서': 56, '빌레몬서': 57, '히브리서': 58, '야고보서': 59,
        '베드로전서': 60, '베드로후서': 61, '요한1서': 62, '요한2서': 63,
        '요한3서': 64, '유다서': 65, '요한계시록': 66
    };

    return bookNameMap[bookName] || -1;
}

/**
 * 로컬 스토리지에 저장
 */
function saveToLocalStorage(): void {
    try {
        const dataArray = Array.from(chapterTimeCache.entries());
        defaultStorage.set('chapter_time_data', JSON.stringify(dataArray));
        console.log('💾 시간 데이터를 로컬 스토리지에 저장했습니다.');
    } catch (error) {
        console.error('로컬 스토리지 저장 실패:', error);
    }
}

/**
 * 로컬 스토리지에서 로드
 */
function loadFromLocalStorage(): boolean {
    try {
        const savedData = defaultStorage.getString('chapter_time_data');
        if (!savedData) return false;

        const dataArray = JSON.parse(savedData);
        chapterTimeCache = new Map(dataArray);
        isDataLoaded = true;

        console.log('💾 로컬 스토리지에서 시간 데이터를 로드했습니다.');
        return true;
    } catch (error) {
        console.error('로컬 스토리지 로드 실패:', error);
        return false;
    }
}

/**
 * 특정 장의 시간 데이터 가져오기
 */
export function getChapterTimeData(bookIndex: number, chapter: number): ChapterTimeData | null {
    if (!isDataLoaded) {
        console.warn('시간 데이터가 아직 로드되지 않았습니다.');
        return null;
    }

    const key = `${bookIndex}-${chapter}`;
    return chapterTimeCache.get(key) || null;
}

/**
 * 계획 범위에 해당하는 모든 시간 데이터 가져오기
 */
export function getChapterTimeDataForPlan(
    startBook: number,
    endBook: number
): ChapterTimeData[] {
    if (!isDataLoaded) {
        console.warn('시간 데이터가 아직 로드되지 않았습니다.');
        return [];
    }

    const result: ChapterTimeData[] = [];

    for (let bookIndex = startBook; bookIndex <= endBook; bookIndex++) {
        const bookInfo = BibleStep.find(step => step.index === bookIndex);
        if (!bookInfo) continue;

        for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
            const timeData = getChapterTimeData(bookIndex, chapter);
            if (timeData) {
                result.push(timeData);
            }
        }
    }

    return result;
}

/**
 * 전체 시간 데이터 가져오기
 */
export function getAllChapterTimeData(): ChapterTimeData[] {
    if (!isDataLoaded) {
        console.warn('시간 데이터가 아직 로드되지 않았습니다.');
        return [];
    }

    return Array.from(chapterTimeCache.values());
}

/**
 * 데이터 로드 상태 확인
 */
export function isChapterTimeDataLoaded(): boolean {
    return isDataLoaded;
}

/**
 * 계획별 총 시간 계산
 */
export function calculateTotalTimeForPlan(planType: string): { totalMinutes: number; totalSeconds: number } {
    const ranges: { [key: string]: [number, number] } = {
        'full_bible': [1, 66],
        'old_testament': [1, 39],
        'new_testament': [40, 66],
        'pentateuch': [1, 5],
        'psalms': [19, 19]
    };

    const [start, end] = ranges[planType] || [1, 66];
    const data = getChapterTimeDataForPlan(start, end);

    const totalSeconds = data.reduce((sum, ch) => sum + ch.totalSeconds, 0);
    return {
        totalSeconds,
        totalMinutes: totalSeconds / 60
    };
}

// 앱 시작 시 자동 로드
export async function initializeChapterTimeData(): Promise<void> {
    if (!isDataLoaded) {
        const success = await loadChapterTimeDataFromCSV();
        if (!success) {
            console.error('⚠️ 시간 데이터 초기화 실패');
        }
    }
}