import { useMemo } from "react";// src/components/page/reading/index.tsx
// 🔥 시간 기반 성경일독 시스템으로 완전 수정

import {useFocusEffect, useIsFocused} from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Box, Text, VStack, HStack, Progress, Button, Badge, ScrollView } from "native-base";
import { Toast } from "react-native-toast-message/lib/src/Toast";
import dayjs from 'dayjs';

import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { defaultStorage } from "../../../utils/mmkv";
import { useBibleReading } from "../../../utils/useBibleReading";
import Tabs from "../../layout/tab/tabs";
import BackHeaderLayout from "../../layout/header/backHeader";
import BannerAdMain from "../../../adforus/BannerAdMain";

// 사이드 컴포넌트들
import New from "./_side/new";
import Old from "./_side/old";
import SettingSidePage from "./_side/setting";
import ProgressScreen from "../progs";

// 🔥 새로운 시간 기반 시스템 import
import {
  getBibleReadingDashboard,
  markBibleChapterAsRead,
  markBibleChapterAsUnread,
  getTodayReadingSummary,
  loadExistingBiblePlan
} from "../../../utils/biblePlanIntegration";

export default function ReadingBibleScreen() {
  const [menuIndex, setMenuIndex] = useState<number>(2);
  const [mark, setMark] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [menuList, setMenuList] = useState<string[]>(["구약", "신약", "설정"]); // 초기값 명시적 설정
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [forceUpdateKey, setForceUpdateKey] = useState<number>(0);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const isFocused = useIsFocused();
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  // 🔥 수정: resetAllData 제거하고 필요한 함수만 사용
  const {
    registerGlobalRefreshCallback,
    unregisterGlobalRefreshCallback
  } = useBibleReading(mark);

  // 안전한 메뉴 리스트 확보 (초기값 보장)
  const safeMenuList = useMemo(() => {
    if (menuList && Array.isArray(menuList) && menuList.length > 0) {
      return menuList;
    }
    return ["구약", "신약", "설정"]; // 기본값
  }, [menuList]);

  // 🔥 데이터 로드 함수
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📊 대시보드 데이터 로드 시작');

      // 시간 기반 대시보드 데이터 가져오기
      const dashboard = getBibleReadingDashboard();
      setDashboardData(dashboard);

      if (dashboard.hasPlan && dashboard.planData) {
        setPlanData(dashboard.planData);

        // 메뉴 설정
        let newMenuList: string[] = ["구약", "신약", "설정"];

        switch (dashboard.planData.planType) {
          case 'full_bible':
            newMenuList = ["성경", "진도"];
            break;
          case 'old_testament':
            newMenuList = ["구약", "진도"];
            break;
          case 'new_testament':
            newMenuList = ["신약", "진도"];
            break;
          case 'pentateuch':
            newMenuList = ["모세오경", "진도"];
            break;
          case 'psalms':
            newMenuList = ["시편", "진도"];
            break;
          default:
            newMenuList = ["성경", "진도"];
        }

        setMenuList(newMenuList);
        setMenuIndex(0); // 첫 번째 탭으로 설정
        console.log('📊 시간 기반 메뉴 설정:', newMenuList);

      } else {
        setPlanData(null);
        setMenuList(["구약", "신약", "설정"]);
        setMenuIndex(2); // 설정 탭으로 이동
        console.log('📊 계획 없음 - 설정 탭으로 이동');
      }

    } catch (error) {
      console.error('❌ 대시보드 데이터 로드 실패:', error);
      setPlanData(null);
      setDashboardData(null);
      setMenuList(["구약", "신약", "설정"]);
      setMenuIndex(2);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 전역 새로고침 함수
  const handleGlobalRefresh = useCallback(() => {
    console.log('🔄 ReadingBibleScreen 전역 새로고침 실행');
    setForceUpdateKey(prev => prev + 1);
    loadDashboardData();
  }, [loadDashboardData]);

  // 메뉴 변경 핸들러
  const handleMenuChange = useCallback((index: number) => {
    // 인덱스가 유효한지 확인
    if (index >= 0 && index < safeMenuList.length) {
      setMenuIndex(index);
      const currentMenuName = safeMenuList[index];
      console.log(`메뉴 변경: ${currentMenuName} (인덱스: ${index})`);
    } else {
      console.warn(`유효하지 않은 메뉴 인덱스: ${index}, 현재 메뉴 길이: ${safeMenuList.length}`);
    }
  }, [safeMenuList]);

  // 🔥 데이터 업데이트 함수
  const handleChangeUpdateData = useCallback(async (targetTabIndex?: number) => {
    try {
      setIsLoading(true);
      await loadDashboardData();
      setForceUpdateKey(prev => prev + 1);

      if (typeof targetTabIndex === 'number' && targetTabIndex >= 0) {
        setMenuIndex(targetTabIndex);
        console.log(`탭 이동 요청: 인덱스 ${targetTabIndex}`);
      }
    } catch (error) {
      console.error('데이터 업데이트 오류:', error);
      Toast.show({
        type: 'error',
        text1: '데이터 업데이트 중 오류가 발생했습니다'
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadDashboardData]);

  // 🔥 장 읽기 완료/취소 처리
  const handleChapterToggle = useCallback(async (bookIndex: number, chapter: number, isCurrentlyRead: boolean) => {
    try {
      let result;

      if (isCurrentlyRead) {
        // 읽기 취소
        result = markBibleChapterAsUnread(bookIndex, chapter);
      } else {
        // 읽기 완료
        result = markBibleChapterAsRead(bookIndex, chapter);
      }

      if (result.success) {
        // 데이터 새로고침
        await loadDashboardData();

        Toast.show({
          type: 'success',
          text1: isCurrentlyRead ? '읽기를 취소했습니다' : '읽기 완료!',
          text2: `${bookIndex}권 ${chapter}장`
        });
      } else {
        Toast.show({
          type: 'error',
          text1: result.errorMessage || '처리 중 오류가 발생했습니다'
        });
      }

    } catch (error) {
      console.error('❌ 장 읽기 처리 실패:', error);
      Toast.show({
        type: 'error',
        text1: '읽기 처리 중 오류가 발생했습니다'
      });
    }
  }, [loadDashboardData]);

  // 초기 로드
  useEffect(() => {
    if (isFocused) {
      loadDashboardData();
    }
  }, [isFocused, loadDashboardData]);

  // 전역 새로고침 콜백 등록
  useEffect(() => {
    registerGlobalRefreshCallback(handleGlobalRefresh);
    return () => {
      unregisterGlobalRefreshCallback(handleGlobalRefresh);
    };
  }, [registerGlobalRefreshCallback, unregisterGlobalRefreshCallback, handleGlobalRefresh]);

  // 🔥 오늘의 읽기 현황 컴포넌트
  const TodayReadingStatus = () => {
    const todaySummary = getTodayReadingSummary();

    if (!todaySummary.hasSchedule) {
      return null;
    }

    return (
        <Box bg="#F0FDF4" mx={4} p={4} borderRadius="lg" borderWidth={1} borderColor="#D1FAE5" mb={4}>
          <HStack justifyContent="space-between" alignItems="center" mb={3}>
            <Text fontSize={16} fontWeight={600} color="#059669">
              📖 오늘의 읽기 ({dayjs().format('M월 D일')})
            </Text>
            <Badge colorScheme={todaySummary.progressPercentage === 100 ? "green" : "blue"} borderRadius="full">
              {todaySummary.completedChapters}/{todaySummary.totalChapters}장
            </Badge>
          </HStack>

          {/* 진행률 바 */}
          <Progress
              value={todaySummary.progressPercentage}
              bg="#E5E7EB"
              _filledTrack={{ bg: "#10B981" }}
              size="md"
              mb={3}
          />

          <HStack justifyContent="space-between" mb={3}>
            <Text fontSize={12} color="#6B7280">
              완료: {Math.round((todaySummary.completedTime || 0) * 10) / 10}분
            </Text>
            <Text fontSize={12} color="#6B7280">
              남은 시간: {Math.round((todaySummary.remainingTime || 0) * 10) / 10}분
            </Text>
          </HStack>

          {/* 동기부여 메시지 */}
          {todaySummary.motivationalMessage && (
              <Text fontSize={12} color="#059669" textAlign="center" fontStyle="italic">
                {todaySummary.motivationalMessage}
              </Text>
          )}
        </Box>
    );
  };

  // 🔥 전체 진행률 컴포넌트
  const OverallProgressStatus = () => {
    if (!dashboardData?.hasPlan) {
      return null;
    }

    const { progressInfo, planSummary, readingStreak, missedChapters } = dashboardData;

    return (
        <Box bg="#F8F9FF" mx={4} p={4} borderRadius="lg" borderWidth={1} borderColor="#E0E7FF" mb={4}>
          <HStack justifyContent="space-between" alignItems="center" mb={3}>
            <Text fontSize={16} fontWeight={600} color="#4F46E5">
              🎯 {planSummary.planName} 일독 진행률
            </Text>
            <Badge colorScheme="purple" borderRadius="full">
              {planSummary.currentDay}/{planSummary.totalDays}일차
            </Badge>
          </HStack>

          {/* 전체 진행률 */}
          <Progress
              value={progressInfo.progressPercentage}
              bg="#E5E7EB"
              _filledTrack={{ bg: "#8B5CF6" }}
              size="lg"
              mb={3}
          />

          <HStack justifyContent="space-between" mb={3}>
            <Text fontSize={14} fontWeight={600} color="#4F46E5">
              {progressInfo.progressPercentage}% 완료
            </Text>
            <Text fontSize={14} color="#6B7280">
              {progressInfo.readChapters}/{progressInfo.totalChapters}장
            </Text>
          </HStack>

          {/* 통계 정보 */}
          <HStack justifyContent="space-around" pt={2} borderTopWidth={1} borderTopColor="#E0E7FF">
            <VStack alignItems="center">
              <Text fontSize={16} fontWeight={700} color="#059669">
                {readingStreak}
              </Text>
              <Text fontSize={12} color="#6B7280">연속일</Text>
            </VStack>
            <VStack alignItems="center">
              <Text fontSize={16} fontWeight={700} color="#8B5CF6">
                {Math.round(progressInfo.readTime * 10) / 10}분
              </Text>
              <Text fontSize={12} color="#6B7280">읽은 시간</Text>
            </VStack>
            <VStack alignItems="center">
              <Text fontSize={16} fontWeight={700} color={missedChapters > 0 ? "#EF4444" : "#6B7280"}>
                {missedChapters}
              </Text>
              <Text fontSize={12} color="#6B7280">놓친 장</Text>
            </VStack>
          </HStack>
        </Box>
    );
  };

  // 컨텐츠 렌더링 함수
  const renderContent = () => {
    if (isLoading) {
      return (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text fontSize={16} color="#6B7280">로딩 중...</Text>
          </Box>
      );
    }

    // 안전한 인덱스 확인
    if (menuIndex < 0 || menuIndex >= safeMenuList.length) {
      console.warn(`유효하지 않은 메뉴 인덱스: ${menuIndex}, 설정 탭으로 이동`);
      setMenuIndex(safeMenuList.length - 1); // 마지막 탭(설정)으로 이동
      return (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text fontSize={16} color="#6B7280">메뉴를 준비하는 중...</Text>
          </Box>
      );
    }

    const currentMenuName = safeMenuList[menuIndex];

    // 설정 탭
    if (currentMenuName === "설정") {
      return <SettingSidePage onTrigger={handleChangeUpdateData} />;
    }

    // 진도 탭
    if (currentMenuName === "진도") {
      return (
          <ProgressScreen
              planData={planData}
              dashboardData={dashboardData}
              onChapterToggle={handleChapterToggle}
          />
      );
    }

    // 읽기 탭들 (구약, 신약, 성경, 모세오경, 시편)
    const readingProps = {
      mark,
      planData,
      dashboardData,
      onChapterToggle: handleChapterToggle,
      onTrigger: handleChangeUpdateData,
      forceUpdateKey
    };

    switch (currentMenuName) {
      case "구약":
        return <Old {...readingProps} />;
      case "신약":
        return <New {...readingProps} />;
      case "성경":
        // 전체 성경 - 구약+신약 통합 뷰
        return <Old {...readingProps} showFullBible={true} />;
      case "모세오경":
        return <Old {...readingProps} planType="pentateuch" />;
      case "시편":
        return <Old {...readingProps} planType="psalms" />;
      default:
        return <Old {...readingProps} />;
    }
  };

  return (
      <>
        <BackHeaderLayout title="성경일독" />

        {/* 🔥 시간 기반 상태 표시 */}
        {dashboardData?.hasPlan && (
            <ScrollView>
              <TodayReadingStatus />
              <OverallProgressStatus />
            </ScrollView>
        )}

        {/* 광고 배너 */}
        <BannerAdMain />

        {/* 탭 및 컨텐츠 */}
        <Tabs
            menus={safeMenuList}
            onSelectHandler={handleMenuChange}
            selectedIndex={menuIndex}
        />

        {renderContent()}
      </>
  );
}