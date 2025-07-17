// src/components/page/reading/_tab/statistics.tsx
// 🔥 시간 기반 계획을 지원하는 통계 컴포넌트

import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import {getMissedChapters, getYesterdayChapters, UnifiedBiblePlan} from "../../../../utils/biblePlanUtils";
import {formatTime, getCurrentDayFromPlan} from "../../../../utils/timeBasedBibleCalculator";

// 🔥 시간 기반 시스템 imports


const { width } = Dimensions.get('window');

interface StatisticsProps {
    planData: UnifiedBiblePlan | null;
    progressInfo: any;
    isTimeBasedPlan: boolean;
    todayReading: any[];
    planSummary: any;
}

export default function Statistics({
                                       planData,
                                       progressInfo,
                                       isTimeBasedPlan,
                                       todayReading,
                                       planSummary
                                   }: StatisticsProps) {

    /**
     * 🔥 상세 통계 계산
     */
    const detailedStats = useMemo(() => {
        if (!planData || !progressInfo) {
            return null;
        }

        try {
            // 기본 통계
            const totalChapters = progressInfo.totalChapters || 0;
            const readChapters = progressInfo.readChapters || 0;
            const remainingChapters = totalChapters - readChapters;
            const progressPercentage = progressInfo.progressPercentage || 0;

            // 오늘 통계
            const todayTotal = todayReading.length;
            const todayCompleted = todayReading.filter(ch => ch.isRead).length;
            const todayRemaining = todayTotal - todayCompleted;

            // 놓친 장들
            const missedChapters = getMissedChapters(planData);
            const yesterdayChapters = getYesterdayChapters(planData);

            // 시간 기반 계획 전용 통계
            let timeStats = null;
            if (isTimeBasedPlan && planData.isTimeBasedCalculation) {
                const currentDay = getCurrentDayFromPlan(planData);
                const totalDays = planData.totalDays || 0;
                const remainingDays = Math.max(0, totalDays - currentDay + 1);

                // 읽기 속도 계산
                const daysElapsed = Math.max(1, currentDay - 1);
                const readingVelocity = daysElapsed > 0 ? readChapters / daysElapsed : 0;

                // 예상 완료일
                const estimatedDaysToComplete = readingVelocity > 0
                    ? Math.ceil(remainingChapters / readingVelocity)
                    : 0;

                // 일정 준수율
                const expectedProgress = progressInfo.expectedProgressPercentage || 0;
                const adherenceRate = expectedProgress > 0
                    ? Math.min(100, Math.round((progressPercentage / expectedProgress) * 100))
                    : 100;

                // 오늘 시간 통계
                const todayTotalTime = todayReading.reduce((sum, ch) => sum + (ch.totalSeconds || 180), 0);
                const todayCompletedTime = todayReading
                    .filter(ch => ch.isRead)
                    .reduce((sum, ch) => sum + (ch.totalSeconds || 180), 0);

                timeStats = {
                    currentDay,
                    totalDays,
                    remainingDays,
                    readingVelocity: Math.round(readingVelocity * 10) / 10,
                    estimatedDaysToComplete,
                    adherenceRate,
                    totalMinutes: planData.totalMinutes || 0,
                    actualMinutesPerDay: planData.actualMinutesPerDay || 0,
                    totalReadMinutes: progressInfo.totalReadMinutes || 0,
                    todayTotalTime,
                    todayCompletedTime,
                    expectedProgress,
                    isAhead: progressInfo.isAhead || false,
                    isBehind: progressInfo.isBehind || false
                };
            }

            return {
                // 기본 통계
                totalChapters,
                readChapters,
                remainingChapters,
                progressPercentage,

                // 오늘 통계
                todayTotal,
                todayCompleted,
                todayRemaining,

                // 기간 통계
                missedCount: missedChapters.length,
                yesterdayCount: yesterdayChapters.length,

                // 시간 기반 통계
                timeStats
            };

        } catch (error) {
            console.error('통계 계산 오류:', error);
            return null;
        }
    }, [planData, progressInfo, isTimeBasedPlan, todayReading]);

    /**
     * 🔥 진행률 차트 계산 (간단한 바 차트)
     */
    const progressChart = useMemo(() => {
        if (!detailedStats) return null;

        const chartWidth = width - 64; // 좌우 마진 32씩
        const completedWidth = (detailedStats.progressPercentage / 100) * chartWidth;

        return {
            chartWidth,
            completedWidth,
            remainingWidth: chartWidth - completedWidth
        };
    }, [detailedStats]);

    /**
     * 🔥 기본 정보 카드 렌더링
     */
    const renderBasicInfo = () => {
        if (!planSummary) return null;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📋 계획 정보</Text>

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>계획명</Text>
                        <Text style={styles.infoValue}>{planSummary.planName}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>타입</Text>
                        <Text style={styles.infoValue}>
                            {isTimeBasedPlan ? '시간 기반' : '장 기반'}
                        </Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>총 기간</Text>
                        <Text style={styles.infoValue}>{planSummary.totalDays}일</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>시작일</Text>
                        <Text style={styles.infoValue}>{planSummary.startDate}</Text>
                    </View>

                    {isTimeBasedPlan && planSummary.actualMinutesPerDay && (
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>하루 평균</Text>
                            <Text style={styles.infoValue}>{planSummary.actualMinutesPerDay}분</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    /**
     * 🔥 진행률 차트 렌더링
     */
    const renderProgressChart = () => {
        if (!detailedStats || !progressChart) return null;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 전체 진행률</Text>

                <View style={styles.progressInfo}>
                    <Text style={styles.progressMainText}>
                        {detailedStats.progressPercentage}%
                    </Text>
                    <Text style={styles.progressSubText}>
                        {detailedStats.readChapters}/{detailedStats.totalChapters}장 완료
                    </Text>
                </View>

                {/* 진행률 바 차트 */}
                <View style={styles.chartContainer}>
                    <View style={[styles.chartBar, { width: progressChart.chartWidth }]}>
                        <View
                            style={[
                                styles.chartCompleted,
                                { width: progressChart.completedWidth }
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.chartLabels}>
                    <View style={styles.chartLabel}>
                        <View style={[styles.chartLabelColor, { backgroundColor: '#4caf50' }]} />
                        <Text style={styles.chartLabelText}>완료 ({detailedStats.readChapters})</Text>
                    </View>
                    <View style={styles.chartLabel}>
                        <View style={[styles.chartLabelColor, { backgroundColor: '#e0e0e0' }]} />
                        <Text style={styles.chartLabelText}>남은 ({detailedStats.remainingChapters})</Text>
                    </View>
                </View>
            </View>
        );
    };

    /**
     * 🔥 오늘 통계 렌더링
     */
    const renderTodayStats = () => {
        if (!detailedStats) return null;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📅 오늘 통계</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{detailedStats.todayTotal}</Text>
                        <Text style={styles.statLabel}>총 장수</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, styles.completedStat]}>
                            {detailedStats.todayCompleted}
                        </Text>
                        <Text style={styles.statLabel}>완료</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, styles.remainingStat]}>
                            {detailedStats.todayRemaining}
                        </Text>
                        <Text style={styles.statLabel}>남은</Text>
                    </View>

                    {isTimeBasedPlan && detailedStats.timeStats && (
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {formatTime(detailedStats.timeStats.todayTotalTime)}
                            </Text>
                            <Text style={styles.statLabel}>예상 시간</Text>
                        </View>
                    )}
                </View>

                {/* 오늘 진행률 바 */}
                <View style={styles.todayProgressBar}>
                    <View style={styles.todayProgressBackground}>
                        <View
                            style={[
                                styles.todayProgressFill,
                                {
                                    width: `${detailedStats.todayTotal > 0
                                        ? Math.round((detailedStats.todayCompleted / detailedStats.todayTotal) * 100)
                                        : 0}%`
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.todayProgressText}>
                        {detailedStats.todayTotal > 0
                            ? Math.round((detailedStats.todayCompleted / detailedStats.todayTotal) * 100)
                            : 0}%
                    </Text>
                </View>
            </View>
        );
    };

    /**
     * 🔥 시간 기반 통계 렌더링
     */
    const renderTimeBasedStats = () => {
        if (!isTimeBasedPlan || !detailedStats?.timeStats) return null;

        const timeStats = detailedStats.timeStats;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>⏰ 시간 통계</Text>

                <View style={styles.timeStatsGrid}>
                    <View style={styles.timeStatItem}>
                        <Text style={styles.timeStatValue}>
                            {Math.round(timeStats.totalReadMinutes / 60)}
                        </Text>
                        <Text style={styles.timeStatLabel}>읽은 시간 (시)</Text>
                    </View>

                    <View style={styles.timeStatItem}>
                        <Text style={styles.timeStatValue}>
                            {Math.round(timeStats.totalMinutes / 60)}
                        </Text>
                        <Text style={styles.timeStatLabel}>총 시간 (시)</Text>
                    </View>

                    <View style={styles.timeStatItem}>
                        <Text style={styles.timeStatValue}>
                            {timeStats.actualMinutesPerDay}
                        </Text>
                        <Text style={styles.timeStatLabel}>하루 평균 (분)</Text>
                    </View>

                    <View style={styles.timeStatItem}>
                        <Text style={styles.timeStatValue}>
                            {timeStats.readingVelocity}
                        </Text>
                        <Text style={styles.timeStatLabel}>읽기 속도 (장/일)</Text>
                    </View>
                </View>

                {/* 일정 준수율 */}
                <View style={styles.adherenceContainer}>
                    <Text style={styles.adherenceTitle}>일정 준수율</Text>
                    <View style={styles.adherenceInfo}>
                        <Text style={[
                            styles.adherenceValue,
                            timeStats.isAhead ? styles.aheadColor :
                                timeStats.isBehind ? styles.behindColor : styles.onTrackColor
                        ]}>
                            {timeStats.adherenceRate}%
                        </Text>
                        <Text style={styles.adherenceStatus}>
                            {timeStats.isAhead ? '🚀 앞서가고 있어요!' :
                                timeStats.isBehind ? '⏰ 조금 늦어지고 있어요' :
                                    '✅ 계획대로 진행중'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    /**
     * 🔥 기간별 통계 렌더링
     */
    const renderPeriodStats = () => {
        if (!detailedStats) return null;

        const timeStats = detailedStats.timeStats;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📈 기간별 통계</Text>

                <View style={styles.periodGrid}>
                    {timeStats && (
                        <>
                            <View style={styles.periodItem}>
                                <Text style={styles.periodValue}>{timeStats.currentDay}</Text>
                                <Text style={styles.periodLabel}>현재 일차</Text>
                            </View>

                            <View style={styles.periodItem}>
                                <Text style={styles.periodValue}>{timeStats.totalDays}</Text>
                                <Text style={styles.periodLabel}>총 일수</Text>
                            </View>

                            <View style={styles.periodItem}>
                                <Text style={styles.periodValue}>{timeStats.remainingDays}</Text>
                                <Text style={styles.periodLabel}>남은 일수</Text>
                            </View>

                            {timeStats.estimatedDaysToComplete > 0 && (
                                <View style={styles.periodItem}>
                                    <Text style={styles.periodValue}>
                                        {timeStats.estimatedDaysToComplete}
                                    </Text>
                                    <Text style={styles.periodLabel}>예상 완료 (일)</Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={styles.periodItem}>
                        <Text style={[styles.periodValue, styles.missedColor]}>
                            {detailedStats.missedCount}
                        </Text>
                        <Text style={styles.periodLabel}>놓친 장</Text>
                    </View>

                    <View style={styles.periodItem}>
                        <Text style={styles.periodValue}>{detailedStats.yesterdayCount}</Text>
                        <Text style={styles.periodLabel}>어제 장수</Text>
                    </View>
                </View>
            </View>
        );
    };

    /**
     * 🔥 빈 상태 렌더링
     */
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📊</Text>
            <Text style={styles.emptyText}>통계 정보가 없습니다</Text>
            <Text style={styles.emptySubText}>
                성경일독 계획을 설정하고 읽기를 시작해보세요
            </Text>
        </View>
    );

    /**
     * 🔥 메인 렌더링
     */
    if (!planData || !detailedStats) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {renderEmptyState()}
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* 기본 정보 */}
            {renderBasicInfo()}

            {/* 진행률 차트 */}
            {renderProgressChart()}

            {/* 오늘 통계 */}
            {renderTodayStats()}

            {/* 시간 기반 통계 */}
            {renderTimeBasedStats()}

            {/* 기간별 통계 */}
            {renderPeriodStats()}

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
        padding: 16,
    },

    // 카드 공통
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },

    // 빈 상태
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    },

    // 기본 정보 그리드
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    infoItem: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },

    // 진행률 정보
    progressInfo: {
        alignItems: 'center',
        marginBottom: 16,
    },
    progressMainText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4caf50',
    },
    progressSubText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },

    // 차트
    chartContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    chartBar: {
        height: 12,
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        overflow: 'hidden',
    },
    chartCompleted: {
        height: '100%',
        backgroundColor: '#4caf50',
        borderRadius: 6,
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    chartLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chartLabelColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    chartLabelText: {
        fontSize: 12,
        color: '#666',
    },

    // 통계 그리드
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    completedStat: {
        color: '#4caf50',
    },
    remainingStat: {
        color: '#ff9800',
    },

    // 오늘 진행률 바
    todayProgressBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    todayProgressBackground: {
        flex: 1,
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
    },
    todayProgressFill: {
        height: '100%',
        backgroundColor: '#2196f3',
        borderRadius: 4,
    },
    todayProgressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        minWidth: 40,
        textAlign: 'right',
    },

    // 시간 통계
    timeStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    timeStatItem: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    timeStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2196f3',
        marginBottom: 4,
    },
    timeStatLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
    },

    // 일정 준수율
    adherenceContainer: {
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingTop: 16,
    },
    adherenceTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    adherenceInfo: {
        alignItems: 'center',
    },
    adherenceValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    adherenceStatus: {
        fontSize: 12,
        color: '#666',
    },
    aheadColor: {
        color: '#4caf50',
    },
    behindColor: {
        color: '#f44336',
    },
    onTrackColor: {
        color: '#2196f3',
    },

    // 기간별 통계
    periodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    periodItem: {
        flex: 1,
        minWidth: '30%',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    periodValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    periodLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
    },
    missedColor: {
        color: '#f44336',
    },

    // 하단 여백
    bottomSpacing: {
        height: 20,
    },
});