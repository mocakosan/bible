// src/components/page/reading/_tab/today.tsx
// 🔥 시간 기반 계획을 지원하는 오늘 읽기 컴포넌트

import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert
} from 'react-native';
import { Toast } from 'react-native-toast-message';
import {useBibleReading} from "../../../../utils/useBibleReading";
import {UnifiedBiblePlan} from "../../../../utils/biblePlanUtils";
import {formatTime} from "../../../../utils/timeBasedBibleCalculator";

// 🔥 시간 기반 시스템 imports


interface TodayProps {
    todayReading: any[];
    progressInfo: any;
    planData: UnifiedBiblePlan | null;
    isTimeBasedPlan: boolean;
    onRefresh?: () => void;
}

export default function Today({
                                  todayReading,
                                  progressInfo,
                                  planData,
                                  isTimeBasedPlan,
                                  onRefresh
                              }: TodayProps) {

    // 🔥 상태 관리
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 🔥 Bible Reading 훅 사용
    const { markChapterAsRead, isChapterReadSync, refreshAll } = useBibleReading();

    /**
     * 🔥 새로고침 처리
     */
    const handleRefresh = useCallback(async () => {
        try {
            console.log('🔄 Today 컴포넌트 새로고침');
            setIsRefreshing(true);

            await refreshAll();
            if (onRefresh) {
                await onRefresh();
            }

            Toast.show({
                type: 'success',
                text1: '새로고침 완료',
                visibilityTime: 1000
            });

        } catch (error) {
            console.error('❌ Today 새로고침 오류:', error);
            Toast.show({
                type: 'error',
                text1: '새로고침 실패',
                text2: '다시 시도해주세요'
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshAll, onRefresh]);

    /**
     * 🔥 장 읽기 핸들러
     */
    const handleChapterRead = useCallback(async (book: string | number, chapter: number) => {
        try {
            console.log(`📚 장 읽기 시도: ${book} ${chapter}장`);

            // 이미 읽은 장인지 확인
            if (isChapterReadSync(book, chapter)) {
                Alert.alert(
                    '이미 읽은 장입니다',
                    '다른 장을 선택해주세요.',
                    [{ text: '확인' }]
                );
                return;
            }

            // 읽기 확인 다이얼로그
            Alert.alert(
                '읽기 완료',
                `${typeof book === 'string' ? book : '성경'} ${chapter}장을 읽기 완료로 표시하시겠습니까?`,
                [
                    { text: '취소', style: 'cancel' },
                    {
                        text: '완료',
                        onPress: async () => {
                            const success = await markChapterAsRead(book, chapter);
                            if (success) {
                                console.log(`✅ 장 읽기 완료: ${book} ${chapter}장`);

                                // 햅틱 피드백 (선택사항)
                                // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('❌ 장 읽기 처리 오류:', error);
            Toast.show({
                type: 'error',
                text1: '읽기 처리 실패',
                text2: '다시 시도해주세요'
            });
        }
    }, [markChapterAsRead, isChapterReadSync]);

    /**
     * 🔥 오늘의 총 읽기 시간 계산
     */
    const todayTimeInfo = useMemo(() => {
        if (!todayReading || todayReading.length === 0) {
            return {
                totalSeconds: 0,
                readSeconds: 0,
                remainingSeconds: 0,
                progressPercentage: 0
            };
        }

        if (!isTimeBasedPlan) {
            // 기존 방식: 장당 3분으로 계산
            const totalSeconds = todayReading.length * 180;
            const readSeconds = todayReading.filter(ch => ch.isRead).length * 180;
            const remainingSeconds = totalSeconds - readSeconds;
            const progressPercentage = totalSeconds > 0
                ? Math.round((readSeconds / totalSeconds) * 100)
                : 0;

            return {
                totalSeconds,
                readSeconds,
                remainingSeconds,
                progressPercentage
            };
        }

        // 시간 기반 계획: 실제 음성 시간 사용
        const totalSeconds = todayReading.reduce((sum, ch) => sum + (ch.totalSeconds || 180), 0);
        const readSeconds = todayReading
            .filter(ch => ch.isRead)
            .reduce((sum, ch) => sum + (ch.totalSeconds || 180), 0);
        const remainingSeconds = totalSeconds - readSeconds;
        const progressPercentage = totalSeconds > 0 ? Math.round((readSeconds / totalSeconds) * 100) : 0;

        return {
            totalSeconds,
            readSeconds,
            remainingSeconds,
            progressPercentage
        };
    }, [todayReading, isTimeBasedPlan]);

    /**
     * 🔥 책별로 그룹화된 장들
     */
    const groupedChapters = useMemo(() => {
        if (!todayReading || todayReading.length === 0) {
            return {};
        }

        const groups: { [key: string]: any[] } = {};

        todayReading.forEach(chapter => {
            const bookName = chapter.bookName || chapter.book || '성경';
            if (!groups[bookName]) {
                groups[bookName] = [];
            }
            groups[bookName].push(chapter);
        });

        return groups;
    }, [todayReading]);

    /**
     * 🔥 장 버튼 스타일 계산
     */
    const getChapterButtonStyle = useCallback((chapter: any) => {
        if (chapter.isRead) {
            return styles.completedChapter;
        }

        switch (chapter.type || 'normal') {
            case 'today':
                return styles.todayChapter;
            case 'yesterday':
                return styles.yesterdayChapter;
            case 'missed':
                return styles.missedChapter;
            case 'future':
                return styles.futureChapter;
            default:
                return styles.normalChapter;
        }
    }, []);

    /**
     * 🔥 장 텍스트 스타일 계산
     */
    const getChapterTextStyle = useCallback((chapter: any) => {
        if (chapter.isRead) {
            return styles.completedChapterText;
        }

        switch (chapter.type || 'normal') {
            case 'today':
                return styles.todayChapterText;
            case 'yesterday':
                return styles.yesterdayChapterText;
            case 'missed':
                return styles.missedChapterText;
            case 'future':
                return styles.futureChapterText;
            default:
                return styles.normalChapterText;
        }
    }, []);

    /**
     * 🔥 빈 상태 렌더링
     */
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📖</Text>
            <Text style={styles.emptyText}>오늘 읽을 장이 없습니다</Text>
            <Text style={styles.emptySubText}>
                {planData
                    ? '계획이 완료되었거나 일정을 확인해주세요'
                    : '먼저 성경일독 계획을 설정해주세요'
                }
            </Text>

            {!planData && (
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => {
                        // 설정 탭으로 이동하는 로직
                        Toast.show({
                            type: 'info',
                            text1: '설정 탭에서 계획을 생성해주세요'
                        });
                    }}
                >
                    <Text style={styles.emptyButtonText}>계획 설정하기</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    /**
     * 🔥 오늘의 시간 정보 렌더링
     */
    const renderTimeInfo = () => {
        return (
            <View style={styles.timeInfoContainer}>
                <Text style={styles.timeInfoTitle}>
                    ⏰ 오늘의 읽기 {isTimeBasedPlan ? '시간' : '분량'}
                </Text>

                <View style={styles.timeInfoContent}>
                    <View style={styles.timeInfoRow}>
                        <Text style={styles.timeInfoLabel}>전체:</Text>
                        <Text style={styles.timeInfoValue}>
                            {isTimeBasedPlan
                                ? formatTime(todayTimeInfo.totalSeconds)
                                : `${todayReading.length}장`
                            }
                        </Text>
                    </View>

                    <View style={styles.timeInfoRow}>
                        <Text style={styles.timeInfoLabel}>완료:</Text>
                        <Text style={[styles.timeInfoValue, styles.completedTime]}>
                            {isTimeBasedPlan
                                ? formatTime(todayTimeInfo.readSeconds)
                                : `${todayReading.filter(ch => ch.isRead).length}장`
                            }
                        </Text>
                    </View>

                    <View style={styles.timeInfoRow}>
                        <Text style={styles.timeInfoLabel}>남은:</Text>
                        <Text style={[styles.timeInfoValue, styles.remainingTime]}>
                            {isTimeBasedPlan
                                ? formatTime(todayTimeInfo.remainingSeconds)
                                : `${todayReading.filter(ch => !ch.isRead).length}장`
                            }
                        </Text>
                    </View>

                    {/* 진행률 바 */}
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${todayTimeInfo.progressPercentage}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {todayTimeInfo.progressPercentage}%
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    /**
     * 🔥 전체 진행률 정보 렌더링
     */
    const renderOverallProgress = () => (
        <View style={styles.progressContainer}>
            <Text style={styles.progressTitle}>📊 전체 진행률</Text>

            <View style={styles.progressContent}>
                <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>완료</Text>
                    <Text style={styles.progressValue}>
                        {progressInfo.readChapters || 0}장
                    </Text>
                </View>

                <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>전체</Text>
                    <Text style={styles.progressValue}>
                        {progressInfo.totalChapters || 0}장
                    </Text>
                </View>

                <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>진행률</Text>
                    <Text style={[styles.progressValue, styles.progressPercentage]}>
                        {progressInfo.progressPercentage || 0}%
                    </Text>
                </View>

                {isTimeBasedPlan && progressInfo.totalReadMinutes && (
                    <View style={styles.progressItem}>
                        <Text style={styles.progressLabel}>읽은 시간</Text>
                        <Text style={styles.progressValue}>
                            {Math.round(progressInfo.totalReadMinutes / 60)}시간
                        </Text>
                    </View>
                )}
            </View>

            {/* 전체 진행률 바 */}
            <View style={styles.overallProgressBar}>
                <View style={styles.progressBarBackground}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${progressInfo.progressPercentage || 0}%` }
                        ]}
                    />
                </View>
            </View>

            {/* 예상 진행률과 비교 (시간 기반 계획만) */}
            {isTimeBasedPlan && progressInfo.expectedProgressPercentage && (
                <View style={styles.expectedProgressContainer}>
                    <Text style={styles.expectedProgressText}>
                        예상 진행률: {progressInfo.expectedProgressPercentage}%
                        {progressInfo.isAhead && ' 🚀 앞서가고 있어요!'}
                        {progressInfo.isBehind && ' ⏰ 조금 늦어지고 있어요'}
                    </Text>
                </View>
            )}
        </View>
    );

    /**
     * 🔥 책별 장 목록 렌더링
     */
    const renderChaptersByBook = () => {
        if (Object.keys(groupedChapters).length === 0) {
            return null;
        }

        return (
            <View style={styles.chaptersContainer}>
                {Object.entries(groupedChapters).map(([bookName, chapters]) => (
                    <View key={bookName} style={styles.bookSection}>
                        <View style={styles.bookHeader}>
                            <Text style={styles.bookTitle}>
                                📚 {bookName}
                            </Text>
                            <Text style={styles.bookSubtitle}>
                                {chapters.length}장
                                {isTimeBasedPlan && (
                                    <Text style={styles.bookTime}>
                                        {' '}• {formatTime(
                                        chapters.reduce((sum, ch) => sum + (ch.totalSeconds || 180), 0)
                                    )}
                                    </Text>
                                )}
                            </Text>
                        </View>

                        <View style={styles.chaptersGrid}>
                            {chapters.map((chapter, index) => (
                                <TouchableOpacity
                                    key={`${chapter.book}-${chapter.chapter}-${index}`}
                                    style={[
                                        styles.chapterButton,
                                        getChapterButtonStyle(chapter)
                                    ]}
                                    onPress={() => handleChapterRead(chapter.book, chapter.chapter)}
                                    activeOpacity={0.7}
                                    disabled={chapter.isRead}
                                >
                                    <Text style={[
                                        styles.chapterText,
                                        getChapterTextStyle(chapter)
                                    ]}>
                                        {chapter.chapter}
                                    </Text>

                                    {/* 🔥 시간 기반 계획일 때 읽기 시간 표시 */}
                                    {isTimeBasedPlan && (
                                        <Text style={styles.chapterTimeText}>
                                            {formatTime(chapter.totalSeconds || 180)}
                                        </Text>
                                    )}

                                    {/* 읽기 완료 체크 */}
                                    {chapter.isRead && (
                                        <View style={styles.checkMark}>
                                            <Text style={styles.checkMarkText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 책별 진행률 */}
                        <View style={styles.bookProgressContainer}>
                            <View style={styles.bookProgressBar}>
                                <View
                                    style={[
                                        styles.bookProgressFill,
                                        {
                                            width: `${Math.round(
                                                (chapters.filter(ch => ch.isRead).length / chapters.length) * 100
                                            )}%`
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.bookProgressText}>
                                {chapters.filter(ch => ch.isRead).length}/{chapters.length}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    /**
     * 🔥 메인 렌더링
     */
    if (!todayReading || todayReading.length === 0) {
        return (
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor="#007AFF"
                        title="새로고침 중..."
                    />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {renderEmptyState()}
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor="#007AFF"
                    title="새로고침 중..."
                />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {/* 전체 진행률 */}
            {renderOverallProgress()}

            {/* 오늘의 시간 정보 */}
            {renderTimeInfo()}

            {/* 책별 장 목록 */}
            {renderChaptersByBook()}

            {/* 하단 여백 */}
            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
}

/**
 * 🔥 스타일 정의
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },

    // 빈 상태
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        minHeight: 400,
    },
    emptyTitle: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // 진행률 정보
    progressContainer: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    progressContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    progressItem: {
        alignItems: 'center',
        flex: 1,
    },
    progressLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    progressValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    progressPercentage: {
        color: '#007AFF',
        fontSize: 18,
    },
    overallProgressBar: {
        marginTop: 8,
    },
    expectedProgressContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
    },
    expectedProgressText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },

    // 시간 정보
    timeInfoContainer: {
        backgroundColor: '#fff',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    timeInfoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    timeInfoContent: {
        gap: 8,
    },
    timeInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeInfoLabel: {
        fontSize: 14,
        color: '#666',
    },
    timeInfoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    completedTime: {
        color: '#28a745',
    },
    remainingTime: {
        color: '#ff9800',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    progressBarBackground: {
        flex: 1,
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#28a745',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        minWidth: 40,
        textAlign: 'right',
    },

    // 장 목록
    chaptersContainer: {
        paddingBottom: 16,
    },
    bookSection: {
        backgroundColor: '#fff',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookHeader: {
        marginBottom: 12,
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    bookSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    bookTime: {
        color: '#007AFF',
        fontWeight: '500',
    },
    chaptersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    bookProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bookProgressBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
    },
    bookProgressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2,
    },
    bookProgressText: {
        fontSize: 11,
        color: '#666',
        minWidth: 40,
        textAlign: 'right',
    },

    // 장 버튼
    chapterButton: {
        minWidth: 60,
        minHeight: 60,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        position: 'relative',
    },
    chapterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    chapterTimeText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    checkMark: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#28a745',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkMarkText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // 장 상태별 스타일
    todayChapter: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
        borderWidth: 2,
    },
    todayChapterText: {
        color: '#1976d2',
        fontWeight: 'bold',
    },
    yesterdayChapter: {
        backgroundColor: '#fff3e0',
        borderColor: '#ff9800',
        borderWidth: 1,
    },
    yesterdayChapterText: {
        color: '#f57c00',
    },
    missedChapter: {
        backgroundColor: '#ffebee',
        borderColor: '#f44336',
        borderWidth: 1,
    },
    missedChapterText: {
        color: '#d32f2f',
    },
    futureChapter: {
        backgroundColor: '#f5f5f5',
        borderColor: '#ccc',
        borderWidth: 1,
        opacity: 0.6,
    },
    futureChapterText: {
        color: '#999',
    },
    completedChapter: {
        backgroundColor: '#e8f5e8',
        borderColor: '#4caf50',
        borderWidth: 1,
    },
    completedChapterText: {
        color: '#2e7d32',
        fontWeight: 'bold',
    },
    normalChapter: {
        backgroundColor: '#f5f5f5',
        borderColor: '#ddd',
        borderWidth: 1,
    },
    normalChapterText: {
        color: '#333',
    },

    // 하단 여백
    bottomSpacing: {
        height: 20,
    },
});