import { useState, useEffect, useCallback, useRef } from 'react';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { AppState } from 'react-native';
import { BiblePlanData, calculateMissedChapters, loadBiblePlanData, saveBiblePlanData, deleteBiblePlanData } from "./biblePlanUtils";
import {
    calculateProgress, ChapterReading,
    DailyReading,
    DETAILED_BIBLE_PLAN_TYPES,
    estimateCompletionDate,
    getDailyReading
} from "./biblePlanCalculator";
import { bibleSetting, defineSQL, fetchSql } from "./index";
import { defaultStorage } from "./mmkv";
import { BibleStep } from "./define";

interface ReadingStatus {
    book: number;
    chapter: number;
    date: string;
    isRead: boolean;
    type: 'today' | 'yesterday' | 'missed' | 'completed' | 'future';
}

// 성경 전체 장 순서를 계산하는 헬퍼 함수
const getGlobalChapterIndex = (book: number, chapter: number): number => {
    let totalChapters = 0;

    // 해당 책 이전까지의 모든 장 수를 더함
    for (let i = 0; i < book - 1; i++) {
        totalChapters += BibleStep[i].count;
    }

    // 현재 책의 장 번호를 더함
    return totalChapters + chapter;
};

// 전역 장 인덱스로부터 책과 장을 계산하는 함수
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

// 🔥 readState를 매개변수로 받도록 수정
export const useBibleReading = (readState?: any) => {
    const [planData, setPlanData] = useState<BiblePlanData | null>(null);
    const [missedCount, setMissedCount] = useState(0);
    const [todayReading, setTodayReading] = useState<DailyReading | null>(null);
    const [yesterdayReading, setYesterdayReading] = useState<DailyReading | null>(null);
    const [progressInfo, setProgressInfo] = useState<any>(null);
    const [readingTableData, setReadingTableData] = useState<{ [key: string]: boolean }>({});
    const [refreshKey, setRefreshKey] = useState(0);
    const appStateRef = useRef(AppState.currentState);

    // 🆕 전역 새로고침 콜백 상태 추가
    const [globalRefreshCallback, setGlobalRefreshCallback] = useState<(() => void) | null>(null);

    useEffect(() => {
        loadPlan();

        // 앱 상태 변경 리스너 등록
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, []);

    useEffect(() => {
        if (planData) {
            updateTodayReading();
            updateYesterdayReading();
            updateProgressInfo();
            updateMissedCountAndBadge();
        } else {
            // planData가 없을 때 모든 상태 초기화
            setTodayReading(null);
            setYesterdayReading(null);
            setProgressInfo(null);
            setMissedCount(0);
            updateAppBadge(0);
        }
    }, [planData]);

    useEffect(() => {
        const initializeData = async () => {
            // 일독 계획 로드
            loadPlan();

            // 🆕 reading_table 전체 데이터 자동 로드
            await loadAllReadingTableData();
        };

        initializeData();

        // 앱 상태 변경 리스너 등록
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, []);
    useEffect(() => {
        if (readState && Array.isArray(readState)) {
            console.log('readState 변경 감지 - 캐시 업데이트 시작:', readState.length, '개 항목');

            // readState를 캐시에 반영
            const newReadingData: { [key: string]: boolean } = { ...readingTableData };

            readState.forEach((item: any) => {
                const key = `${item.book}_${item.jang}`;
                newReadingData[key] = true;
            });

            setReadingTableData(newReadingData);
            console.log('readState 기반 캐시 업데이트 완료:', Object.keys(newReadingData).length, '개 항목');
        }
    }, [readState]);

    // 앱 상태 변경 처리
    const handleAppStateChange = (nextAppState: string) => {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
            // 앱이 백그라운드에서 포그라운드로 돌아올 때
            if (planData) {
                updateMissedCountAndBadge();
            }
        }
        appStateRef.current = nextAppState;
    };

    // 앱 뱃지 업데이트 (Android 전용)
    const updateAppBadge = useCallback((count: number) => {
        console.log(`앱 뱃지 업데이트: ${count}개 놓친 장`);
    }, []);

    // 놓친 장수 계산 및 뱃지 업데이트
    const updateMissedCountAndBadge = useCallback(() => {
        if (!planData) {
            setMissedCount(0);
            updateAppBadge(0);
            return;
        }

        const newMissedCount = calculateMissedChapters(planData);
        setMissedCount(newMissedCount);
        updateAppBadge(newMissedCount);
    }, [planData, updateAppBadge]);

    const loadPlan = useCallback(() => {
        try {
            const existingPlan = loadBiblePlanData();
            if (existingPlan) {
                console.log('기존 일독 계획 로드됨:', existingPlan.planName);
                setPlanData(existingPlan);
            } else {
                console.log('일독 계획 없음 - 상태 초기화');
                setPlanData(null);
                setMissedCount(0);
                updateAppBadge(0);
            }
        } catch (error) {
            console.error('일독 계획 로드 오류:', error);
            setPlanData(null);
            setMissedCount(0);
            updateAppBadge(0);
        }
    }, [updateAppBadge]);

    // 전체 reading_table 데이터를 한 번에 로드하는 함수
    const loadAllReadingTableData = useCallback(async () => {
        try {
            console.log('reading_table 전체 데이터 로드 시작');
            const selectAllSql = `SELECT book, jang, read FROM reading_table`;
            const results = await fetchSql(bibleSetting, selectAllSql, []);

            console.log('SQLite 조회 결과:', results);

            const readingData: { [key: string]: boolean } = {};

            if (Array.isArray(results)) {
                results.forEach((result: any) => {
                    const key = `${result.book}_${result.jang}`;
                    readingData[key] = result.read ? JSON.parse(result.read) : false;
                });
            } else if (results) {
                // 단일 결과인 경우
                const key = `${results.book}_${results.jang}`;
                readingData[key] = results.read ? JSON.parse(results.read) : false;
            }

            console.log('처리된 reading_table 데이터:', readingData);
            setReadingTableData(readingData);

            console.log('reading_table 데이터 로드 완료:', Object.keys(readingData).length, '개 항목');
            return readingData;
        } catch (error) {
            console.error('reading_table 전체 로드 오류:', error);
            setReadingTableData({});
            return {};
        }
    }, []);

    const updateTodayReading = useCallback(() => {
        if (!planData) {
            setTodayReading(null);
            return;
        }

        try {
            const startDate = new Date(planData.startDate);
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);

            const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const chaptersPerDay = planData.chaptersPerDay;

            // 오늘 읽을 장들의 인덱스 범위
            const todayStartIndex = daysPassed * chaptersPerDay + 1;
            const todayEndIndex = Math.min(todayStartIndex + chaptersPerDay - 1, planData.totalChapters);

            const todayChapters: ChapterReading[] = [];

            for (let i = todayStartIndex; i <= todayEndIndex; i++) {
                const { book, chapter } = getBookAndChapterFromGlobalIndex(i);
                todayChapters.push({
                    bookIndex: book,
                    bookName: BibleStep[book - 1].name,
                    chapter: chapter,
                    estimatedMinutes: 3 // 평균 읽기 시간
                });
            }

            const dailyReading: DailyReading = {
                date: currentDate,
                dayNumber: daysPassed + 1,
                chapters: todayChapters,
                totalMinutes: todayChapters.length * 3
            };

            setTodayReading(dailyReading);
            console.log('오늘 읽기 계획 업데이트:', todayChapters.length, '장');
        } catch (error) {
            console.log('오늘 읽기 계획 로드 오류:', error);
            setTodayReading(null);
        }
    }, [planData]);

    // 어제 읽기 계획 업데이트
    const updateYesterdayReading = useCallback(() => {
        if (!planData) {
            setYesterdayReading(null);
            return;
        }

        try {
            const startDate = new Date(planData.startDate);
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);

            const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            // 첫날이면 어제 읽기 없음
            if (daysPassed === 0) {
                setYesterdayReading(null);
                return;
            }

            const chaptersPerDay = planData.chaptersPerDay;

            // 어제 읽을 장들의 인덱스 범위
            const yesterdayStartIndex = (daysPassed - 1) * chaptersPerDay + 1;
            const yesterdayEndIndex = Math.min(yesterdayStartIndex + chaptersPerDay - 1, planData.totalChapters);

            const yesterdayChapters: ChapterReading[] = [];

            for (let i = yesterdayStartIndex; i <= yesterdayEndIndex; i++) {
                const { book, chapter } = getBookAndChapterFromGlobalIndex(i);
                yesterdayChapters.push({
                    bookIndex: book,
                    bookName: BibleStep[book - 1].name,
                    chapter: chapter,
                    estimatedMinutes: 3
                });
            }

            const dailyReading: DailyReading = {
                date: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000),
                dayNumber: daysPassed,
                chapters: yesterdayChapters,
                totalMinutes: yesterdayChapters.length * 3
            };

            setYesterdayReading(dailyReading);
            console.log('어제 읽기 계획 업데이트:', yesterdayChapters.length, '장');
        } catch (error) {
            console.log('어제 읽기 계획 로드 오류:', error);
            setYesterdayReading(null);
        }
    }, [planData]);

    const updateProgressInfo = () => {
        if (!planData) {
            setProgressInfo(null);
            return;
        }

        try {
            const startDate = new Date(planData.startDate);
            const currentDate = new Date();

            const progress = calculateProgress(
                planData.planType,
                startDate,
                currentDate,
                planData.readChapters
            );

            const estimatedCompletion = estimateCompletionDate(
                planData.planType,
                startDate,
                currentDate,
                planData.readChapters
            );

            setProgressInfo({
                ...progress,
                estimatedCompletion: estimatedCompletion.toLocaleDateString()
            });
        } catch (error) {
            console.log('진도 계산 오류:', error);
            setProgressInfo(null);
        }
    };

    // reading_table에서 읽기 상태 확인 (개별 조회)
    const loadReadingTableData = useCallback(async (book: number, chapter: number): Promise<boolean> => {
        try {
            const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
                WHERE: {BOOK: '?', JANG: '?'}
            })}`;

            const result = await fetchSql(bibleSetting, settingSelectSql, [book, chapter], 0);
            const isRead = result ? JSON.parse(result.read) : false;

            // 캐시에 저장
            setReadingTableData(prev => ({
                ...prev,
                [`${book}_${chapter}`]: isRead
            }));

            return isRead;
        } catch (error) {
            console.log('reading_table 조회 오류:', error);
            return false;
        }
    }, []);

    // 🔥 수정된 isChapterReadSync 함수 - readState 확인 로직 추가
    const isChapterReadSync = useCallback((book: number, chapter: number): boolean => {
        const key = `${book}_${chapter}`;

        try {
            // 디버깅용 로그
            if (book === 1 && chapter === 1) {
                // console.log('=== isChapterReadSync 디버깅 (창세기 1장) ===', {
                //     key,
                //     readingTableDataValue: readingTableData[key],
                //     readingTableDataExists: key in readingTableData,
                //     planDataExists: !!planData,
                //     readStateLength: readState?.length || 0,
                //     refreshKey
                // });
            }

            // 🆕 1. reading_table 캐시 우선 확인 (가장 신뢰할 수 있는 데이터)
            if (readingTableData[key] !== undefined) {
                const tableRead = readingTableData[key];
                if (book === 1 && chapter === 1) {
                    console.log('reading_table 캐시에서 창세기 1장 확인:', tableRead);
                }
                if (tableRead) return true; // 읽었다면 바로 반환
            }

            // 🆕 2. readState에서 확인 (일독 계획 없을 때 중요)
            if (readState && Array.isArray(readState)) {
                const foundInReadState = readState.find(
                    (data: any) => data.book === book && data.jang === chapter
                );

                if (book === 1 && chapter === 1) {
                    console.log('readState에서 창세기 1장 확인:', !!foundInReadState);
                }
                if (foundInReadState) return true; // 읽었다면 바로 반환
            }

            // 🆕 3. 일독 계획이 있는 경우에만 일독 계획 데이터 확인
            if (planData) {
                const planRead = planData.readChapters.some(
                    r => r.book === book && r.chapter === chapter && r.isRead
                );

                if (book === 1 && chapter === 1) {
                    console.log('일독 계획에서 창세기 1장 확인:', planRead);
                }
                if (planRead) return true; // 읽었다면 바로 반환
            }

            // 4. 모든 곳에서 읽지 않았다면 false
            if (book === 1 && chapter === 1) {
                console.log('창세기 1장 모든 소스에서 읽지 않음으로 확인됨');
            }
            return false;

        } catch (error) {
            console.error('isChapterReadSync 오류:', error);
            return false;
        }
    }, [planData, readingTableData, refreshKey, readState]);

    const markChapterAsRead = useCallback(async (book: number, chapter: number) => {
        if (!planData) return false;

        try {
            const updatedReadChapters = [...planData.readChapters];
            const existingIndex = updatedReadChapters.findIndex(
                r => r.book === book && r.chapter === chapter
            );

            const readEntry: ReadingStatus = {
                book,
                chapter,
                date: new Date().toISOString(),
                isRead: true,
                type: 'completed'
            };

            if (existingIndex >= 0) {
                updatedReadChapters[existingIndex] = readEntry;
            } else {
                updatedReadChapters.push(readEntry);
            }

            const updatedPlanData = {
                ...planData,
                readChapters: updatedReadChapters
            };

            setPlanData(updatedPlanData);
            saveBiblePlanData(updatedPlanData);

            // 🆕 전역 새로고침 트리거
            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (markChapterAsRead)');
                globalRefreshCallback();
            }

            // 놓친 장수 재계산 및 뱃지 업데이트
            const newMissedCount = calculateMissedChapters(updatedPlanData);
            setMissedCount(newMissedCount);
            updateAppBadge(newMissedCount);

            return true;
        } catch (error) {
            console.log('장 읽기 표시 오류:', error);
            return false;
        }
    }, [planData, updateAppBadge, globalRefreshCallback]);

    const markChapterAsUnread = useCallback(async (book: number, chapter: number) => {
        if (!planData) return false;

        try {
            const updatedReadChapters = planData.readChapters.filter(
                r => !(r.book === book && r.chapter === chapter)
            );

            const updatedPlanData = {
                ...planData,
                readChapters: updatedReadChapters
            };

            setPlanData(updatedPlanData);
            saveBiblePlanData(updatedPlanData);

            // 🆕 전역 새로고침 트리거
            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (markChapterAsUnread)');
                globalRefreshCallback();
            }

            // 놓친 장수 재계산 및 뱃지 업데이트
            const newMissedCount = calculateMissedChapters(updatedPlanData);
            setMissedCount(newMissedCount);
            updateAppBadge(newMissedCount);

            return true;
        } catch (error) {
            console.log('장 읽기 취소 오류:', error);
            return false;
        }
    }, [planData, updateAppBadge, globalRefreshCallback]);

    // 개선된 장 상태 확인 함수
    const getChapterStatus = useCallback((book: number, chapter: number): 'today' | 'yesterday' | 'missed' | 'completed' | 'future' | 'normal' => {
        if (!planData) return 'normal';

        try {
            // 먼저 읽은 장인지 확인 (최우선)
            const isRead = isChapterReadSync(book, chapter);
            if (isRead) return 'completed';

            const startDate = new Date(planData.startDate);
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);

            // 경과 일수 계산 (0부터 시작)
            const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            // 현재 장의 전체 인덱스 계산 (1부터 시작)
            const globalChapterIndex = getGlobalChapterIndex(book, chapter);

            // 하루 읽을 장 수
            const chaptersPerDay = planData.chaptersPerDay;

            // 오늘 읽을 장의 범위 계산
            const todayStartIndex = daysPassed * chaptersPerDay + 1;
            const todayEndIndex = todayStartIndex + chaptersPerDay - 1;

            // 어제 읽을 장의 범위 계산
            const yesterdayStartIndex = (daysPassed - 1) * chaptersPerDay + 1;
            const yesterdayEndIndex = yesterdayStartIndex + chaptersPerDay - 1;

            // console.log(`Chapter ${book}:${chapter} (global index: ${globalChapterIndex})`);
            // console.log(`Days passed: ${daysPassed}, Today's range: ${todayStartIndex}-${todayEndIndex}`);

            // 오늘 읽을 장인지 확인
            if (globalChapterIndex >= todayStartIndex && globalChapterIndex <= todayEndIndex) {
                return 'today';
            }

            // 어제 읽을 장인지 확인
            if (daysPassed > 0 && globalChapterIndex >= yesterdayStartIndex && globalChapterIndex <= yesterdayEndIndex) {
                return 'yesterday';
            }

            // 놓친 장인지 확인 (어제보다 이전)
            if (globalChapterIndex < yesterdayStartIndex && daysPassed > 0) {
                return 'missed';
            }

            // 미래에 읽을 장
            return 'future';
        } catch (error) {
            console.error('장 상태 확인 오류:', error);
            return 'normal';
        }
    }, [planData, isChapterReadSync]);

    const getChapterIndex = (targetBook: number, targetChapter: number, planType: string): number => {
        const planTypeDetail = DETAILED_BIBLE_PLAN_TYPES.find(type => type.id === planType);
        if (!planTypeDetail) return 0;

        let index = 0;
        for (const book of planTypeDetail.books) {
            if (book.index === targetBook) {
                return index + targetChapter;
            }
            index += book.chapters;
        }
        return index;
    };

    const getTodayProgress = useCallback((): {
        totalChapters: number;
        completedChapters: number;
        percentage: number;
        remainingChapters: ChapterReading[];
    } => {
        if (!todayReading) {
            return {
                totalChapters: 0,
                completedChapters: 0,
                percentage: 0,
                remainingChapters: []
            };
        }

        const completedChapters = todayReading.chapters.filter(ch =>
            isChapterReadSync(ch.bookIndex, ch.chapter)
        ).length;

        const remainingChapters = todayReading.chapters.filter(ch =>
            !isChapterReadSync(ch.bookIndex, ch.chapter)
        );

        return {
            totalChapters: todayReading.chapters.length,
            completedChapters,
            percentage: (completedChapters / todayReading.chapters.length) * 100,
            remainingChapters
        };
    }, [todayReading, isChapterReadSync]);

    // 어제 진도 확인 함수
    const getYesterdayProgress = useCallback((): {
        totalChapters: number;
        completedChapters: number;
        percentage: number;
        missedChapters: ChapterReading[];
    } => {
        if (!yesterdayReading) {
            return {
                totalChapters: 0,
                completedChapters: 0,
                percentage: 0,
                missedChapters: []
            };
        }

        const completedChapters = yesterdayReading.chapters.filter(ch =>
            isChapterReadSync(ch.bookIndex, ch.chapter)
        ).length;

        const missedChapters = yesterdayReading.chapters.filter(ch =>
            !isChapterReadSync(ch.bookIndex, ch.chapter)
        );

        return {
            totalChapters: yesterdayReading.chapters.length,
            completedChapters,
            percentage: (completedChapters / yesterdayReading.chapters.length) * 100,
            missedChapters
        };
    }, [yesterdayReading, isChapterReadSync]);

    // reading_table 상태 업데이트 함수 (🆕 전역 새로고침 트리거 추가)
    const updateReadingTableCache = useCallback((book: number, chapter: number, isRead: boolean) => {
        const key = `${book}_${chapter}`;
        setReadingTableData(prev => ({
            ...prev,
            [key]: isRead
        }));

        // 🆕 전역 새로고침 트리거
        if (globalRefreshCallback) {
            console.log('🔄 전역 새로고침 콜백 호출 (updateReadingTableCache)');
            setTimeout(() => {
                globalRefreshCallback();
            }, 100);
        }
    }, [globalRefreshCallback]);

    // 🆕 완전 초기화 함수 개선
    const resetAllData = useCallback(async () => {
        try {
            console.log('=== useBibleReading 완전 초기화 시작 ===');

            // 1. 로컬 상태 모두 초기화
            setPlanData(null);
            setMissedCount(0);
            setTodayReading(null);
            setYesterdayReading(null);
            setProgressInfo(null);
            setReadingTableData({});  // 중요: 빈 객체로 초기화

            // 2. 일독 계획 데이터 삭제
            deleteBiblePlanData();

            // 3. SQLite reading_table 완전 삭제 (먼저 실행)
            try {
                const deleteSql = `DELETE FROM reading_table`;
                await fetchSql(bibleSetting, deleteSql, []);
                console.log('SQLite reading_table 데이터 삭제 완료');

                // 삭제 확인
                const checkSql = `SELECT COUNT(*) as count FROM reading_table`;
                const result = await fetchSql(bibleSetting, checkSql, []);
                console.log('삭제 후 reading_table 행 수:', result?.count || 0);
            } catch (sqlError) {
                console.error('SQLite 삭제 오류:', sqlError);
            }

            // 4. MMKV에서 성경 관련 데이터 삭제
            try {
                const allKeys = defaultStorage.getAllKeys();
                console.log('삭제 전 MMKV 키들:', allKeys);

                allKeys.forEach(key => {
                    if (key.startsWith('bible_') ||
                        key.startsWith('reading_') ||
                        key.includes('plan') ||
                        key === 'calender') {
                        defaultStorage.delete(key);
                        console.log('MMKV 키 삭제:', key);
                    }
                });

                // 삭제 확인
                const remainingKeys = defaultStorage.getAllKeys();
                console.log('삭제 후 MMKV 키들:', remainingKeys);
            } catch (mmkvError) {
                console.error('MMKV 삭제 오류:', mmkvError);
            }

            // 5. 앱 뱃지 초기화
            updateAppBadge(0);

            // 6. refreshKey 업데이트 (리렌더링 강제)
            setRefreshKey(prev => {
                const newKey = prev + 1;
                console.log('refreshKey 업데이트:', prev, '->', newKey);
                return newKey;
            });

            // 🆕 7. 전역 새로고침 트리거 (여러 번 호출)
            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (resetAllData)');
                globalRefreshCallback();

                // 지연 후에도 다시 호출
                setTimeout(() => globalRefreshCallback(), 200);
                setTimeout(() => globalRefreshCallback(), 500);
                setTimeout(() => globalRefreshCallback(), 1000);
            }

            // 8. 약간의 지연 후 데이터 다시 로드 (빈 상태 확인)
            setTimeout(async () => {
                await loadPlan();
                await loadAllReadingTableData();
                console.log('초기화 후 데이터 재로드 완료');
            }, 100);

            console.log('=== useBibleReading 완전 초기화 완료 ===');
            return true;
        } catch (error) {
            console.error('useBibleReading 초기화 오류:', error);
            return false;
        }
    }, [updateAppBadge, loadPlan, loadAllReadingTableData, globalRefreshCallback]);

    // 🆕 강제 새로고침 함수 추가
    const forceRefresh = useCallback(async () => {
        try {
            console.log('useBibleReading 강제 새로고침 시작');

            // 1. 데이터 다시 로드
            await loadPlan();
            await loadAllReadingTableData();

            // 2. 새로고침 키 업데이트
            setRefreshKey(prev => prev + 1);

            // 🆕 3. 전역 새로고침 트리거
            if (globalRefreshCallback) {
                console.log('🔄 전역 새로고침 콜백 호출 (forceRefresh)');
                globalRefreshCallback();
            }

            console.log('useBibleReading 강제 새로고침 완료');
        } catch (error) {
            console.error('강제 새로고침 오류:', error);
        }
    }, [loadPlan, loadAllReadingTableData, globalRefreshCallback]);

    // 🆕 전역 새로고침 콜백 등록 함수
    const registerGlobalRefreshCallback = useCallback((callback: () => void) => {
        console.log('🔄 전역 새로고침 콜백 등록');
        setGlobalRefreshCallback(() => callback);
    }, []);

    // 🆕 전역 새로고침 콜백 해제 함수
    const unregisterGlobalRefreshCallback = useCallback(() => {
        console.log('🔄 전역 새로고침 콜백 해제');
        setGlobalRefreshCallback(null);
    }, []);

    return {
        planData,
        missedCount,
        todayReading,
        yesterdayReading,
        progressInfo,
        readingTableData,
        refreshKey, // 🆕 추가
        markChapterAsRead,
        markChapterAsUnread,
        isChapterReadSync,
        getChapterStatus,
        getTodayProgress,
        getYesterdayProgress,
        loadPlan,
        loadReadingTableData,
        loadAllReadingTableData, // 🆕 추가
        updateReadingTableCache,
        updateMissedCountAndBadge,
        resetAllData, // 🆕 추가
        forceRefresh, // 🆕 추가
        registerGlobalRefreshCallback, // 🆕 추가
        unregisterGlobalRefreshCallback // 🆕 추가
    };
};