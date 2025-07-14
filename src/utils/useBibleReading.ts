// src/utils/useBibleReading.ts
// 🔥 시간 기반 성경 읽기 훅

import { useCallback, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import {
    loadBiblePlanData,
    saveBiblePlanData,
    deleteBiblePlanData,
    getTodayChapters,
    getChapterStatus,
    calculateProgress,
    markChapterAsRead as markChapterAsReadUtil,
    formatDate,
    formatReadingTime
} from './biblePlanUtils';
import {
    TimeBasedBiblePlan,
    getCurrentDay,
    getDailyReading
} from './timeBasedBibleSystem';

// 앱 배지 업데이트 함수 (플랫폼별 구현 필요)
const updateAppBadge = (count: number) => {
    // React Native에서는 별도 라이브러리 필요
    console.log(`📱 앱 배지 업데이트: ${count}`);
};

export const useBibleReading = (mark?: any) => {
    // 상태 관리
    const [planData, setPlanData] = useState<any>(null);
    const [todayReading, setTodayReading] = useState<any>(null);
    const [yesterdayReading, setYesterdayReading] = useState<any>(null);
    const [progressInfo, setProgressInfo] = useState<any>(null);
    const [missedCount, setMissedCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [globalRefreshCallback, setGlobalRefreshCallback] = useState<(() => void) | null>(null);

    const appState = useRef(AppState.currentState);

    // 🔥 계획 데이터 로드
    const loadPlanData = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('📚 계획 데이터 로드 시작');

            const plan = loadBiblePlanData();
            if (plan) {
                setPlanData(plan);
                console.log('✅ 계획 데이터 로드 완료:', plan.planType);

                // 오늘 읽을 장 계산
                const todayChapters = getTodayChapters(plan);
                setTodayReading(todayChapters);

                // 어제 읽을 장 계산 (시간 기반 계획만)
                if (plan.isTimeBasedCalculation) {
                    const currentDay = getCurrentDay(plan.startDate);
                    if (currentDay > 1) {
                        const yesterdayReading = getDailyReading(plan, currentDay - 1);
                        setYesterdayReading(yesterdayReading?.chapters || []);
                    }
                }

                // 진행률 계산
                const progress = calculateProgress(plan);
                setProgressInfo(progress);
                setMissedCount(progress.missedChapters || 0);

                // 앱 배지 업데이트 (오늘 읽을 장 중 안 읽은 것)
                const unreadTodayCount = todayChapters.filter(ch => !ch.isRead).length;
                updateAppBadge(unreadTodayCount);

            } else {
                console.log('📚 저장된 계획 없음');
                setPlanData(null);
                setTodayReading([]);
                setYesterdayReading([]);
                setProgressInfo(null);
                setMissedCount(0);
                updateAppBadge(0);
            }

        } catch (error) {
            console.error('❌ 계획 데이터 로드 오류:', error);
            setPlanData(null);
            setTodayReading([]);
            setProgressInfo(null);
            setMissedCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 🔥 장 읽음 처리
    const markChapterAsRead = useCallback(async (book: number, chapter: number) => {
        if (!planData) {
            console.warn('⚠️ 계획 데이터가 없어 읽기 처리 불가');
            return false;
        }

        try {
            console.log(`📖 장 읽음 처리: ${book}권 ${chapter}장`);

            // 이미 읽은 장인지 확인
            const isAlreadyRead = planData.readChapters?.some(
                (r: any) => r.book === book && r.chapter === chapter && r.isRead
            );

            if (isAlreadyRead) {
                console.log('이미 읽은 장입니다.');
                return true;
            }

            // 장 읽음 처리
            const updatedPlan = markChapterAsReadUtil(planData, book, chapter);
            if (!updatedPlan) {
                throw new Error('장 읽음 처리 실패');
            }

            // 상태 업데이트
            setPlanData(updatedPlan);
            saveBiblePlanData(updatedPlan);

            // 진행률 재계산
            const newProgress = calculateProgress(updatedPlan);
            setProgressInfo(newProgress);

            // 오늘 읽을 장 업데이트
            const updatedTodayChapters = getTodayChapters(updatedPlan);
            setTodayReading(updatedTodayChapters);

            // 앱 배지 업데이트
            const unreadTodayCount = updatedTodayChapters.filter(ch => !ch.isRead).length;
            updateAppBadge(unreadTodayCount);

            // 성공 메시지
            if (updatedPlan.isTimeBasedCalculation) {
                const chapterTime = updatedTodayChapters.find(
                    ch => ch.book === book && ch.chapter === chapter
                )?.estimatedMinutes || 0;

                Toast.show({
                    type: 'success',
                    text1: '읽기 완료! 🎉',
                    text2: `${formatReadingTime(chapterTime)} 분량을 읽으셨습니다.`
                });
            } else {
                Toast.show({
                    type: 'success',
                    text1: '읽기 완료! 🎉',
                    text2: '꾸준한 성경 읽기 습관을 만들어가고 있어요!'
                });
            }

            // 전역 새로고침 콜백 실행
            if (globalRefreshCallback) {
                globalRefreshCallback();
            }

            console.log('✅ 장 읽음 처리 완료');
            return true;

        } catch (error) {
            console.error('❌ 장 읽음 처리 오류:', error);
            Toast.show({
                type: 'error',
                text1: '읽기 처리 실패',
                text2: '다시 시도해주세요.'
            });
            return false;
        }
    }, [planData, globalRefreshCallback]);

    // 🔥 장 읽기 상태 확인 (동기화)
    const isChapterReadSync = useCallback((book: number, chapter: number): boolean => {
        if (!planData?.readChapters) return false;

        return planData.readChapters.some(
            (r: any) => r.book === book && r.chapter === chapter && r.isRead
        );
    }, [planData]);

    // 🔥 장 스타일 계산 (읽기 상태 + 일정 상태)
    const getChapterStyleInfo = useCallback((book: number, chapter: number) => {
        try {
            const isRead = isChapterReadSync(book, chapter);
            const status = planData ? getChapterStatus(planData, book, chapter) : 'normal';

            const baseStyle = {
                borderRadius: 17.5,
                width: 35,
                height: 35,
                justifyContent: 'center' as const,
                alignItems: 'center' as const,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                backgroundColor: 'transparent'
            };

            // 읽은 상태가 최우선
            if (isRead) {
                return {
                    style: { ...baseStyle, backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
                    textColor: '#FFFFFF',
                    showExclamation: false
                };
            }

            // 상태별 처리
            switch (status) {
                case 'today':
                    return {
                        style: { ...baseStyle, backgroundColor: '#F44336', borderColor: '#F44336' },
                        textColor: '#FFFFFF',
                        showExclamation: false
                    };
                case 'yesterday':
                    return {
                        style: { ...baseStyle, backgroundColor: '#2196F3', borderColor: '#2196F3' },
                        textColor: '#FFFFFF',
                        showExclamation: true // 🔥 어제 안 읽은 장에 느낌표 표시
                    };
                case 'missed':
                    return {
                        style: { ...baseStyle, backgroundColor: '#FF9800', borderColor: '#FF9800' },
                        textColor: '#FFFFFF',
                        showExclamation: true // 🔥 놓친 장에 느낌표 표시
                    };
                case 'future':
                    return {
                        style: { ...baseStyle, backgroundColor: 'transparent', borderColor: '#E0E0E0' },
                        textColor: '#999999',
                        showExclamation: false
                    };
                default:
                    return {
                        style: { ...baseStyle, backgroundColor: 'transparent', borderColor: '#E0E0E0' },
                        textColor: '#000000',
                        showExclamation: false
                    };
            }
        } catch (error) {
            console.error('장 스타일 계산 오류:', error);
            return {
                style: {
                    borderRadius: 17.5,
                    width: 35,
                    height: 35,
                    justifyContent: 'center' as const,
                    alignItems: 'center' as const,
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                    backgroundColor: 'transparent'
                },
                textColor: '#000000',
                showExclamation: false
            };
        }
    }, [planData, isChapterReadSync]);

    // 🔥 계획 삭제
    const deletePlan = useCallback(() => {
        try {
            deleteBiblePlanData();
            setPlanData(null);
            setTodayReading([]);
            setYesterdayReading([]);
            setProgressInfo(null);
            setMissedCount(0);
            updateAppBadge(0);

            Toast.show({
                type: 'success',
                text1: '일독 계획이 삭제되었습니다.',
                text2: '새로운 계획을 세워보세요!'
            });

            if (globalRefreshCallback) {
                globalRefreshCallback();
            }

        } catch (error) {
            console.error('계획 삭제 오류:', error);
            Toast.show({
                type: 'error',
                text1: '삭제 중 오류가 발생했습니다.',
                text2: '다시 시도해주세요.'
            });
        }
    }, [globalRefreshCallback]);

    // 🔥 전역 새로고침 콜백 등록/해제
    const registerGlobalRefreshCallback = useCallback((callback: () => void) => {
        console.log('🔄 전역 새로고침 콜백 등록됨');
        setGlobalRefreshCallback(() => callback);
    }, []);

    const unregisterGlobalRefreshCallback = useCallback(() => {
        console.log('🔄 전역 새로고침 콜백 해제됨');
        setGlobalRefreshCallback(null);
    }, []);

    // 🔥 수동 새로고침
    const refreshAllData = useCallback(async () => {
        console.log('🔄 수동 데이터 새로고침 시작');
        await loadPlanData();

        if (globalRefreshCallback) {
            globalRefreshCallback();
        }
    }, [loadPlanData, globalRefreshCallback]);

    // 🔥 앱 상태 변경 감지
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                console.log('📱 앱이 포그라운드로 복귀 - 데이터 새로고침');
                loadPlanData();
            }
            appState.current = nextAppState;
        });

        return () => subscription?.remove();
    }, [loadPlanData]);

    // 🔥 초기 데이터 로드
    useEffect(() => {
        loadPlanData();
    }, [loadPlanData]);

    // 🔥 mark 데이터 변경 감지 (외부 의존성)
    useEffect(() => {
        if (mark) {
            console.log('📋 Mark 데이터 변경 감지 - 새로고침');
            loadPlanData();
        }
    }, [mark, loadPlanData]);

    return {
        // 데이터
        planData,
        todayReading,
        yesterdayReading,
        progressInfo,
        missedCount,
        isLoading,

        // 함수
        markChapterAsRead,
        isChapterReadSync,
        getChapterStyleInfo,
        deletePlan,
        refreshAllData,

        // 콜백 관리
        registerGlobalRefreshCallback,
        unregisterGlobalRefreshCallback,

        // 유틸리티
        formatDate,
        formatReadingTime,
        getChapterStatus: (book: number, chapter: number) =>
            planData ? getChapterStatus(planData, book, chapter) : 'normal'
    };
};