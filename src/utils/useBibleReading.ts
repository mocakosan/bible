// src/utils/useBibleReading.ts
// 성경 읽기 관련 커스텀 훅

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    getTodayChapters,
    getChapterStatus,
    calculateProgress,
    calculateMissedChapters,
    loadBiblePlanData,
    saveBiblePlanData,
    markChapterAsRead,
    getCurrentDay as getCurrentDayUtil
} from './biblePlanUtils';
import { BibleStep } from './define';
import { defaultStorage } from './mmkv';
import { bibleSetting, defineSQL, fetchSql } from '../utils';

interface ReadingTableData {
    [key: string]: boolean;
}

export const useBibleReading = (readState: any) => {
    const [planData, setPlanData] = useState<any>(null);
    const [readingTableData, setReadingTableData] = useState<ReadingTableData>({});
    const [refreshKey, setRefreshKey] = useState(0);
    const globalRefreshCallbackRef = useRef<(() => void) | null>(null);

    // 읽기 상태 확인 (동기)
    const isChapterReadSync = useCallback((book: number, chapter: number): boolean => {
        const key = `${book}_${chapter}`;
        return readingTableData[key] === true;
    }, [readingTableData]);

    // 일독 계획 로드
    const loadPlan = useCallback(() => {
        const plan = loadBiblePlanData();
        setPlanData(plan);
        return plan;
    }, []);

    // SQLite에서 모든 읽기 데이터 로드
    const loadAllReadingTableData = useCallback(async () => {
        try {
            const sql = `SELECT book, jang FROM reading_table WHERE read = 'TRUE'`;
            const results = await fetchSql(bibleSetting, sql, []);

            const dataMap: ReadingTableData = {};
            if (results && Array.isArray(results)) {
                results.forEach((row: any) => {
                    const key = `${row.book}_${row.jang}`;
                    dataMap[key] = true;
                });
            }

            setReadingTableData(dataMap);
            console.log(`읽기 데이터 로드 완료: ${Object.keys(dataMap).length}개 항목`);
        } catch (error) {
            console.error('읽기 데이터 로드 오류:', error);
            setReadingTableData({});
        }
    }, []);

    // 강제 새로고침
    const forceRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        loadPlan();
        loadAllReadingTableData();
    }, [loadPlan, loadAllReadingTableData]);

    // 전역 새로고침 콜백 등록
    const registerGlobalRefreshCallback = useCallback((callback: () => void) => {
        globalRefreshCallbackRef.current = callback;
    }, []);

    // 전역 새로고침 콜백 해제
    const unregisterGlobalRefreshCallback = useCallback(() => {
        globalRefreshCallbackRef.current = null;
    }, []);

    // 모든 데이터 초기화
    const resetAllData = useCallback(async () => {
        try {
            // SQLite 초기화
            const deleteSql = 'DELETE FROM reading_table';
            await fetchSql(bibleSetting, deleteSql, []);

            // MMKV 초기화
            defaultStorage.delete('bible_reading_plan');

            // 상태 초기화
            setPlanData(null);
            setReadingTableData({});
            setRefreshKey(prev => prev + 1);

            // 전역 새로고침 콜백 실행
            if (globalRefreshCallbackRef.current) {
                globalRefreshCallbackRef.current();
            }

            console.log('모든 데이터 초기화 완료');
        } catch (error) {
            console.error('데이터 초기화 오류:', error);
        }
    }, []);

    // 🔥 getChapterStyleWithExclamation 함수 추가
    const getChapterStyleWithExclamation = useCallback((book: number, chapter: number) => {
        const baseStyle = {
            borderRadius: 17.5,
            width: 35,
            height: 35,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            borderWidth: 1,
            borderColor: "#E0E0E0",
            backgroundColor: 'transparent',
        };

        try {
            // 읽기 상태 확인
            const isRead = isChapterReadSync(book, chapter);

            if (isRead) {
                return {
                    style: {
                        ...baseStyle,
                        color: '#4CAF50', // 초록색
                    },
                    showExclamation: false
                };
            }

            // 일독 계획이 없는 경우
            if (!planData) {
                return {
                    style: {
                        ...baseStyle,
                        color: "#000000",
                    },
                    showExclamation: false
                };
            }

            // 장 상태 확인
            const status = getChapterStatus(planData, book, chapter);

            switch (status) {
                case 'today':
                    return {
                        style: {
                            ...baseStyle,
                            color: '#F44336', // 빨간색
                        },
                        showExclamation: false
                    };
                case 'yesterday':
                    return {
                        style: {
                            ...baseStyle,
                            color: '#2196F3', // 파란색
                        },
                        showExclamation: true // 어제 놓친 장
                    };
                case 'missed':
                    return {
                        style: {
                            ...baseStyle,
                            color: '#333333', // 진한 회색
                        },
                        showExclamation: true // 놓친 장
                    };
                default:
                    return {
                        style: {
                            ...baseStyle,
                            color: "#000000",
                        },
                        showExclamation: false
                    };
            }
        } catch (error) {
            console.error('장 스타일 계산 오류:', error);
            return {
                style: {
                    ...baseStyle,
                    color: "#000000",
                },
                showExclamation: false
            };
        }
    }, [planData, isChapterReadSync]);

    // 🔥 getTodayProgress 함수 추가
    const getTodayProgress = useCallback(() => {
        if (!planData) return null;

        try {
            const todayChapters = getTodayChapters(planData);
            const remainingChapters = todayChapters.filter(ch => !isChapterReadSync(ch.book, ch.chapter));
            const completedChapters = todayChapters.filter(ch => isChapterReadSync(ch.book, ch.chapter));

            return {
                totalChapters: todayChapters,
                remainingChapters,
                completedChapters,
                totalCount: todayChapters.length,
                remainingCount: remainingChapters.length,
                completedCount: completedChapters.length
            };
        } catch (error) {
            console.error('오늘 진행 상황 계산 오류:', error);
            return null;
        }
    }, [planData, isChapterReadSync]);

    // 🔥 getYesterdayProgress 함수 추가
    const getYesterdayProgress = useCallback(() => {
        if (!planData) return null;

        try {
            const currentDay = getCurrentDay(planData.startDate);
            if (currentDay <= 1) return null;

            // 어제 읽어야 했던 장들 찾기
            const yesterdayChapters: any[] = [];

            // 시간 기반 계획인 경우
            if (planData.isTimeBasedCalculation && planData.dailyReadingPlan) {
                const yesterdayPlan = planData.dailyReadingPlan[currentDay - 2];
                if (yesterdayPlan) {
                    yesterdayPlan.chapters.forEach((ch: any) => {
                        yesterdayChapters.push({
                            book: ch.book,
                            chapter: ch.chapter,
                            bookName: ch.bookName,
                            bookIndex: ch.book
                        });
                    });
                }
            } else {
                // 기존 장 기반 로직
                const yesterdayStart = (currentDay - 2) * planData.chaptersPerDay;
                const yesterdayEnd = yesterdayStart + planData.chaptersPerDay;

                // 전체 장을 순회하여 어제 범위 찾기
                let globalIndex = 0;
                const bookRange = getBookRangeForPlan(planData.planType);

                for (let book = bookRange.start; book <= bookRange.end; book++) {
                    const bookInfo = BibleStep.find(step => step.index === book);
                    if (!bookInfo) continue;

                    for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
                        if (globalIndex >= yesterdayStart && globalIndex < yesterdayEnd) {
                            yesterdayChapters.push({
                                book,
                                chapter,
                                bookName: bookInfo.name,
                                bookIndex: book
                            });
                        }
                        globalIndex++;
                    }
                }
            }

            const missedChapters = yesterdayChapters.filter(ch => !isChapterReadSync(ch.book, ch.chapter));

            return {
                totalChapters: yesterdayChapters,
                missedChapters,
                missedCount: missedChapters.length
            };
        } catch (error) {
            console.error('어제 진행 상황 계산 오류:', error);
            return null;
        }
    }, [planData, isChapterReadSync]);

    // 🔥 handleMarkAsRead 함수 추가 (장 읽기 완료 처리)
    const handleMarkAsRead = useCallback(async (book: number, chapter: number) => {
        try {
            if (!planData) return false;

            // markChapterAsRead 함수 사용
            const updatedPlan = markChapterAsRead(planData, book, chapter);

            // 저장
            saveBiblePlanData(updatedPlan);

            // SQLite에도 저장
            const insertSql = `
                INSERT OR REPLACE INTO reading_table (
                    book, jang, paragraph, jul, read, date
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;

            await fetchSql(bibleSetting, insertSql, [
                book,
                chapter,
                1,
                1,
                'TRUE',
                new Date().toISOString()
            ]);

            // 상태 업데이트
            setPlanData(updatedPlan);
            await loadAllReadingTableData();
            forceRefresh();

            return true;
        } catch (error) {
            console.error('읽기 완료 처리 오류:', error);
            return false;
        }
    }, [planData, forceRefresh, loadAllReadingTableData]);

    // 초기 데이터 로드
    useEffect(() => {
        loadPlan();
        loadAllReadingTableData();
    }, [loadPlan, loadAllReadingTableData]);

    // readState 변경 감지
    useEffect(() => {
        if (readState) {
            loadAllReadingTableData();
        }
    }, [readState, loadAllReadingTableData]);

    return {
        planData,
        isChapterReadSync,
        getChapterStatus,  // 🔥 추가
        getChapterStyleWithExclamation,  // 🔥 추가
        getTodayProgress,  // 🔥 추가
        getYesterdayProgress,  // 🔥 추가
        handleMarkAsRead,  // 🔥 추가
        loadPlan,
        loadAllReadingTableData,
        refreshKey,
        forceRefresh,
        readingTableData,
        registerGlobalRefreshCallback,
        unregisterGlobalRefreshCallback,
        resetAllData
    };
};

// 🔥 헬퍼 함수 추가 (Hook 외부)
const getCurrentDay = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const getBookRangeForPlan = (planType: string): { start: number; end: number } => {
    switch (planType) {
        case 'full_bible':
            return { start: 1, end: 66 };
        case 'old_testament':
            return { start: 1, end: 39 };
        case 'new_testament':
            return { start: 40, end: 66 };
        case 'pentateuch':
            return { start: 1, end: 5 };
        case 'psalms':
            return { start: 19, end: 19 };
        default:
            return { start: 1, end: 66 };
    }
};