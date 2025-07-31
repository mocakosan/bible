// src/components/page/progs/index.tsx
// 🔥 시간 기반 성경일독 진도 화면으로 완전 수정

import { useCallback, useEffect, useState } from "react";
import { ScrollView, Dimensions } from "react-native";
import { Box, Text, VStack, HStack, Progress, Badge, Button } from "native-base";
import { LineChart } from "react-native-chart-kit";
import dayjs from 'dayjs';

import { useBaseStyle } from "../../../hooks";
import {
  getWeeklySchedule,
  getWeeklyStats,
  getDayReading,
  getCurrentDay,
  formatReadingTime,
  formatDate
} from "../../../utils/biblePlanIntegration";

interface Props {
  planData?: any;
  dashboardData?: any;
  onChapterToggle?: (bookIndex: number, chapter: number, isCurrentlyRead: boolean) => void;
}

export default function ProgressScreen({ planData, dashboardData, onChapterToggle }: Props) {
  const { color } = useBaseStyle();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0: 이번 주, -1: 지난 주, 1: 다음 주
  const screenWidth = Dimensions.get("window").width;

  // 🔥 주간 일정 데이터
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);

  // 데이터 로드
  const loadWeeklyData = useCallback(() => {
    if (!planData || !dashboardData?.hasPlan) {
      return;
    }

    try {
      const currentDay = getCurrentDay(planData);
      const startDay = Math.max(1, currentDay + (selectedWeekOffset * 7));

      // 주간 스케줄 가져오기
      const schedule = getWeeklySchedule(planData, startDay);
      setWeeklyData(schedule);

      // 주간 통계 가져오기
      const stats = getWeeklyStats();
      setWeeklyStats(stats);

    } catch (error) {
      console.error('❌ 주간 데이터 로드 실패:', error);
      setWeeklyData([]);
      setWeeklyStats(null);
    }
  }, [planData, dashboardData, selectedWeekOffset]);

  useEffect(() => {
    loadWeeklyData();
  }, [loadWeeklyData]);

  // 주간 네비게이션
  const handleWeekNavigation = (offset: number) => {
    setSelectedWeekOffset(offset);
  };

  // 차트 데이터 생성
  const generateChartData = useCallback(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return null;
    }

    const labels = weeklyData.map((day, index) => {
      const date = new Date(day.date);
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    });

    const targetData = weeklyData.map(day => day.targetMinutes);
    const actualData = weeklyData.map(day => {
      const completedTime = day.chapters
          .filter((ch: any) => ch.isRead)
          .reduce((sum: number, ch: any) => sum + ch.estimatedMinutes, 0);
      return Math.round(completedTime * 10) / 10;
    });

    return {
      labels,
      datasets: [
        {
          data: targetData,
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`, // 보라색 (목표)
          strokeWidth: 2
        },
        {
          data: actualData,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // 초록색 (실제)
          strokeWidth: 3
        }
      ],
      legend: ["목표 시간", "실제 시간"]
    };
  }, [weeklyData]);

  const chartData = generateChartData();

  // 일별 상세 정보 컴포넌트
  const DayDetailCard = ({ dayReading, isToday }: { dayReading: any; isToday: boolean }) => {
    const completedChapters = dayReading.chapters.filter((ch: any) => ch.isRead).length;
    const completedTime = dayReading.chapters
        .filter((ch: any) => ch.isRead)
        .reduce((sum: number, ch: any) => sum + ch.estimatedMinutes, 0);

    const progressPercentage = dayReading.chapters.length > 0
        ? Math.round((completedChapters / dayReading.chapters.length) * 100)
        : 0;

    return (
        <Box
            bg={isToday ? "#FEF3C7" : "white"}
            p={4}
            borderRadius="lg"
            borderWidth={isToday ? 2 : 1}
            borderColor={isToday ? "#F59E0B" : "#E5E7EB"}
            mb={3}
        >
          <HStack justifyContent="space-between" alignItems="center" mb={3}>
            <VStack>
              <HStack alignItems="center" space={2}>
                <Text fontSize={14} fontWeight={600} color="#1F2937">
                  {formatDate(dayReading.date)}
                </Text>
                {isToday && (
                    <Badge colorScheme="orange" size="xs" borderRadius="full">
                      오늘
                    </Badge>
                )}
              </HStack>
              <Text fontSize={12} color="#6B7280">
                {dayReading.day}일차
              </Text>
            </VStack>

            <VStack alignItems="flex-end">
              <Text fontSize={14} fontWeight={600} color={dayReading.isCompleted ? "#059669" : "#6B7280"}>
                {completedChapters}/{dayReading.chapters.length}장
              </Text>
              <Text fontSize={12} color="#6B7280">
                {formatReadingTime(completedTime)}/{formatReadingTime(dayReading.targetMinutes)}
              </Text>
            </VStack>
          </HStack>

          {/* 진행률 바 */}
          <Progress
              value={progressPercentage}
              bg="#E5E7EB"
              _filledTrack={{ bg: dayReading.isCompleted ? "#10B981" : "#F59E0B" }}
              size="sm"
              mb={3}
          />

          {/* 장 목록 */}
          <VStack space={1}>
            {dayReading.chapters.slice(0, 3).map((chapter: any, index: number) => (
                <HStack key={index} justifyContent="space-between" alignItems="center">
                  <HStack alignItems="center" space={2}>
                    <Text fontSize={12}>
                      {chapter.isRead ? '✅' : '📖'}
                    </Text>
                    <Text
                        fontSize={12}
                        color={chapter.isRead ? "#059669" : "#6B7280"}
                        fontWeight={chapter.isRead ? 600 : 400}
                    >
                      {chapter.bookName} {chapter.chapter}장
                    </Text>
                  </HStack>
                  <Text fontSize={11} color="#9CA3AF">
                    {formatReadingTime(chapter.estimatedMinutes)}
                  </Text>
                </HStack>
            ))}

            {dayReading.chapters.length > 3 && (
                <Text fontSize={11} color="#6B7280" textAlign="center" mt={1}>
                  ... 외 {dayReading.chapters.length - 3}장 더
                </Text>
            )}
          </VStack>
        </Box>
    );
  };

  if (!planData || !dashboardData?.hasPlan) {
    return (
        <Box flex={1} justifyContent="center" alignItems="center" p={8}>
          <Text fontSize={16} color="#6B7280" textAlign="center">
            성경일독 계획을 먼저 설정해주세요.
          </Text>
        </Box>
    );
  }

  const currentDay = getCurrentDay(planData);

  return (
      <ScrollView style={{ backgroundColor: color.white }} showsVerticalScrollIndicator={false}>
        <VStack space={4} p={4} pb={8}>
          {/* 🔥 전체 진행률 요약 */}
          <Box bg="#F8F9FF" p={4} borderRadius="lg" borderWidth={1} borderColor="#E0E7FF">
            <HStack justifyContent="space-between" alignItems="center" mb={3}>
              <Text fontSize={18} fontWeight={700} color="#4F46E5">
                📊 전체 진행률
              </Text>
              <Badge colorScheme="purple" borderRadius="full">
                {currentDay}/{planData.totalDays}일차
              </Badge>
            </HStack>

            <Progress
                value={dashboardData.progressInfo.progressPercentage}
                bg="#E5E7EB"
                _filledTrack={{ bg: "#8B5CF6" }}
                size="lg"
                mb={3}
            />

            <HStack justifyContent="space-between" mb={3}>
              <Text fontSize={14} fontWeight={600} color="#4F46E5">
                {dashboardData.progressInfo.progressPercentage}% 완료
              </Text>
              <Text fontSize={14} color="#6B7280">
                {formatReadingTime(dashboardData.progressInfo.readTime)} / {formatReadingTime(dashboardData.progressInfo.totalTime)}
              </Text>
            </HStack>

            <HStack justifyContent="space-around" pt={3} borderTopWidth={1} borderTopColor="#E0E7FF">
              <VStack alignItems="center">
                <Text fontSize={16} fontWeight={700} color="#059669">
                  {dashboardData.readingStreak}일
                </Text>
                <Text fontSize={12} color="#6B7280">연속 읽기</Text>
              </VStack>
              <VStack alignItems="center">
                <Text fontSize={16} fontWeight={700} color="#8B5CF6">
                  {dashboardData.progressInfo.readChapters}장
                </Text>
                <Text fontSize={12} color="#6B7280">완료한 장</Text>
              </VStack>
              <VStack alignItems="center">
                <Text fontSize={16} fontWeight={700} color={dashboardData.missedChapters > 0 ? "#EF4444" : "#6B7280"}>
                  {dashboardData.missedChapters}장
                </Text>
                <Text fontSize={12} color="#6B7280">놓친 장</Text>
              </VStack>
            </HStack>
          </Box>

          {/* 🔥 주간 통계 */}
          {weeklyStats && (
              <Box bg="#F0FDF4" p={4} borderRadius="lg" borderWidth={1} borderColor="#D1FAE5">
                <Text fontSize={16} fontWeight={600} color="#059669" mb={3}>
                  📈 최근 7일 통계
                </Text>

                <HStack justifyContent="space-around">
                  <VStack alignItems="center">
                    <Text fontSize={16} fontWeight={700} color="#059669">
                      {weeklyStats.daysCompleted}일
                    </Text>
                    <Text fontSize={12} color="#6B7280">완료한 날</Text>
                  </VStack>
                  <VStack alignItems="center">
                    <Text fontSize={16} fontWeight={700} color="#059669">
                      {weeklyStats.completionRate}%
                    </Text>
                    <Text fontSize={12} color="#6B7280">완료율</Text>
                  </VStack>
                  <VStack alignItems="center">
                    <Text fontSize={16} fontWeight={700} color="#059669">
                      {formatReadingTime(weeklyStats.averageDailyTime)}
                    </Text>
                    <Text fontSize={12} color="#6B7280">일평균</Text>
                  </VStack>
                </HStack>
              </Box>
          )}

          {/* 🔥 주간 차트 */}
          {chartData && (
              <Box bg="white" p={4} borderRadius="lg" borderWidth={1} borderColor="#E5E7EB">
                <HStack justifyContent="space-between" alignItems="center" mb={4}>
                  <Text fontSize={16} fontWeight={600} color="#1F2937">
                    📊 주간 읽기 현황
                  </Text>

                  <HStack space={2}>
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="gray"
                        onPress={() => handleWeekNavigation(-1)}
                        disabled={selectedWeekOffset <= -4} // 최대 4주 전까지
                    >
                      <Text fontSize={12}>이전</Text>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="gray"
                        onPress={() => handleWeekNavigation(0)}
                    >
                      <Text fontSize={12}>이번주</Text>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="gray"
                        onPress={() => handleWeekNavigation(1)}
                        disabled={selectedWeekOffset >= 2} // 최대 2주 후까지
                    >
                      <Text fontSize={12}>다음</Text>
                    </Button>
                  </HStack>
                </HStack>

                <LineChart
                    data={chartData}
                    width={screenWidth - 56} // padding 고려
                    height={220}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                      style: {
                        borderRadius: 8
                      },
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#ffffff"
                      }
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 8
                    }}
                />

                {/* 범례 */}
                <HStack justifyContent="center" space={6} mt={2}>
                  <HStack alignItems="center" space={2}>
                    <Box w={3} h={3} bg="#8B5CF6" borderRadius="full" />
                    <Text fontSize={12} color="#6B7280">목표 시간</Text>
                  </HStack>
                  <HStack alignItems="center" space={2}>
                    <Box w={3} h={3} bg="#10B981" borderRadius="full" />
                    <Text fontSize={12} color="#6B7280">실제 시간</Text>
                  </HStack>
                </HStack>
              </Box>
          )}

          {/* 🔥 일별 상세 현황 */}
          <Box>
            <Text fontSize={16} fontWeight={600} color="#1F2937" mb={3}>
              📅 일별 상세 현황
            </Text>

            {weeklyData.length > 0 ? (
                weeklyData.map((dayReading, index) => {
                  const isToday = dayReading.day === currentDay;
                  return (
                      <DayDetailCard
                          key={dayReading.day}
                          dayReading={dayReading}
                          isToday={isToday}
                      />
                  );
                })
            ) : (
                <Box p={8} alignItems="center">
                  <Text fontSize={14} color="#6B7280" textAlign="center">
                    해당 기간에 일정이 없습니다.
                  </Text>
                </Box>
            )}
          </Box>

          {/* 🔥 동기부여 메시지 */}
          {dashboardData.motivationalMessage && (
              <Box bg="#FEF3C7" p={4} borderRadius="lg" borderWidth={1} borderColor="#FCD34D">
                <HStack alignItems="center" space={3}>
                  <Text fontSize={24}>🌟</Text>
                  <Text fontSize={14} color="#92400E" flex={1} fontStyle="italic">
                    {dashboardData.motivationalMessage}
                  </Text>
                </HStack>
              </Box>
          )}

          {/* 🔥 목표 달성 예상일 */}
          {dashboardData.planSummary.estimatedCompletionDate && (
              <Box bg="#F0F9FF" p={4} borderRadius="lg" borderWidth={1} borderColor="#BFDBFE">
                <HStack justifyContent="space-between" alignItems="center">
                  <VStack>
                    <Text fontSize={14} fontWeight={600} color="#1E40AF">
                      🎯 예상 완료일
                    </Text>
                    <Text fontSize={12} color="#6B7280">
                      현재 진행 속도 기준
                    </Text>
                  </VStack>
                  <Text fontSize={16} fontWeight={700} color="#1E40AF">
                    {dayjs(dashboardData.planSummary.estimatedCompletionDate).format('YYYY년 MM월 DD일')}
                  </Text>
                </HStack>
              </Box>
          )}
        </VStack>
      </ScrollView>
  );
}