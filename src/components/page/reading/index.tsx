// src/components/page/reading/index.tsx
// 시간 기반 계산 지원을 위한 전체 수정 코드

import {useFocusEffect, useIsFocused} from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { bibleSetting, defineSQL, fetchSql } from "../../../utils";
import FooterLayout from "../../layout/footer/footer";
import New from "./_side/new";
import Old from "./_side/old";
import SettingSidePage from "./_side/setting";
import { Platform, View, StyleSheet } from "react-native";
import { Box, Text, VStack, HStack, Progress, Button, Badge, ScrollView } from "native-base";
import BannerAdMain from "../../../adforus/BannerAdMain";
import {
  loadBiblePlanData,
  calculateProgress,
  calculateMissedChapters,
  formatDate,
  deleteBiblePlanData,
  getTodayChapters,
  formatTime,
  formatDailyTarget, getCurrentDay
} from "../../../utils/biblePlanUtils";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { Alert } from "react-native";
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { useBibleReading } from "../../../utils/useBibleReading";
import { defaultStorage } from "../../../utils/mmkv";
import Tabs from "../../layout/tab/tabs";
import BackHeaderLayout from "../../layout/header/backHeader";
import ProgressScreen from "../progs";
import dayjs from 'dayjs';

export default function ReadingBibleScreen() {
  const [menuIndex, setMenuIndex] = useState<number>(2);
  const [mark, setMark] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [menuList, setMenuList] = useState<string[]>(["구약", "신약", "설정"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [forceUpdateKey, setForceUpdateKey] = useState<number>(0);
  const isFocused = useIsFocused();
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  const {
    registerGlobalRefreshCallback,
    unregisterGlobalRefreshCallback
  } = useBibleReading(mark);

  const safeMenuList = menuList && menuList.length > 0 ? menuList : ["구약", "신약", "설정"];

  const settingSelectSql = `${defineSQL(["*"], "SELECT", "reading_table", {
    WHERE: { read: "?" }
  })}`;

  const getPlanTypeName = useCallback((planType: string): string => {
    switch (planType) {
      case 'full_bible': return '성경';
      case 'old_testament': return '구약';
      case 'new_testament': return '신약';
      case 'pentateuch': return '모세오경';
      case 'psalms': return '시편';
      default: return '성경';
    }
  }, []);

  const getPlanTypeDescription = useCallback((planType: string): string => {
    switch (planType) {
      case 'full_bible':
        return '창세기 1장 ~ 요한계시록 22장';
      case 'old_testament':
        return '창세기 1장 ~ 말라기 4장';
      case 'new_testament':
        return '마태복음 1장 ~ 요한계시록 22장';
      case 'pentateuch':
        return '창세기 1장 ~ 신명기 34장';
      case 'psalms':
        return '시편 1장 ~ 시편 150장';
      default:
        return '창세기 1장 ~ 요한계시록 22장';
    }
  }, []);

  const loadReadingState = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📚 읽기 상태 로드 시작');

      const results = await fetchSql(
          bibleSetting,
          settingSelectSql,
          ['TRUE']
      );

      if (results && Array.isArray(results)) {
        setMark(results);
        console.log('📚 읽기 상태 로드 완료:', results.length, '개 항목');
      } else {
        setMark([]);
        console.log('📚 읽기 상태 없음');
      }
    } catch (error) {
      console.error('📚 읽기 상태 로드 오류:', error);
      setMark([]);
    } finally {
      setIsLoading(false);
    }
  }, [settingSelectSql]);

  const updateMenuAndData = useCallback(() => {
    try {
      const existingPlan = loadBiblePlanData();

      if (existingPlan) {
        setPlanData(existingPlan);

        let newMenuList: string[] = ["구약", "신약", "설정"];

        switch (existingPlan.planType) {
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
            newMenuList = ["구약", "신약", "설정"];
        }

        setMenuList(newMenuList);
        setMenuIndex(0);
        console.log('일독 메뉴 업데이트:', newMenuList);
      } else {
        setPlanData(null);
        setMenuList(["구약", "신약", "설정"]);
        setMenuIndex(2);
        console.log('일독 없음 - 기본 메뉴 설정');
      }
    } catch (error) {
      console.error('일독 데이터 업데이트 오류:', error);
      setPlanData(null);
      setMenuList(["구약", "신약", "설정"]);
      setMenuIndex(2);
    }
  }, []);

  const handleGlobalRefresh = useCallback(() => {
    console.log('🔄 ReadingBibleScreen 전역 새로고침 실행');
    setForceUpdateKey(prev => prev + 1);
    loadReadingState();
    updateMenuAndData();
  }, [loadReadingState, updateMenuAndData]);

  const handleMenuChange = useCallback((index: number) => {
    setMenuIndex(index);
    const currentMenuName = safeMenuList[index];
    console.log(`메뉴 변경: ${currentMenuName} (인덱스: ${index})`);
  }, [safeMenuList]);

  const handleChangeUpdateData = useCallback(async (targetTabIndex?: number) => {
    try {
      setIsLoading(true);
      await loadReadingState();
      updateMenuAndData();
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
  }, [loadReadingState, updateMenuAndData]);

  const handleDirectReset = useCallback(async () => {
    try {
      console.log('=== ReadingBibleScreen 직접 초기화 시작 ===');

      Toast.show({
        type: 'info',
        text1: '초기화 중...',
        text2: '잠시만 기다려주세요',
        autoHide: false
      });

      try {
        const allKeys = defaultStorage.getAllKeys();
        const keysToDelete = allKeys.filter(key =>
            key.startsWith('bible_') ||
            key.startsWith('reading_') ||
            key.includes('plan') ||
            key === 'calender' ||
            key === 'bible_reading_plan'
        );

        keysToDelete.forEach(key => {
          defaultStorage.delete(key);
          console.log('MMKV 키 삭제:', key);
        });
      } catch (mmkvError) {
        console.error('MMKV 정리 오류:', mmkvError);
      }

      try {
        const deleteSql = 'DELETE FROM reading_table';
        await fetchSql(bibleSetting, deleteSql, []);
        console.log('SQLite reading_table 삭제 완료');
      } catch (sqlError) {
        console.error('SQLite 삭제 오류:', sqlError);
      }

      setPlanData(null);
      setMenuList(["구약", "신약", "설정"]);
      setMenuIndex(2);
      setForceUpdateKey(prev => prev + 1);

      await loadReadingState();
      updateMenuAndData();

      Toast.hide();
      Toast.show({
        type: 'success',
        text1: '초기화 완료',
        text2: '모든 데이터가 초기화되었습니다'
      });

      console.log('=== ReadingBibleScreen 직접 초기화 완료 ===');
    } catch (error) {
      console.error('직접 초기화 오류:', error);
      Toast.hide();
      Toast.show({
        type: 'error',
        text1: '초기화 실패',
        text2: '초기화 중 오류가 발생했습니다'
      });
    }
  }, [loadReadingState, updateMenuAndData]);

  // 🔥 수정된 ProgressView 컴포넌트 - 시간 기반 계산 통합
  const ProgressView = useCallback(() => {
    if (!planData) {
      return <ProgressScreen key={`progress-${forceUpdateKey}`} />;
    }

    const progress = calculateProgress(planData);
    const missedCount = calculateMissedChapters(planData);
    const todayChapters = getTodayChapters(planData);

    const getDaysRemaining = () => {
      const endDate = new Date(planData.endDate || planData.targetDate);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    };

    const getStatusColor = (percentage: number) => {
      if (percentage >= 80) return '#4CAF50';
      if (percentage >= 60) return '#FF9800';
      return '#F44336';
    };

    // 🔥 수정: getDailyTargetDisplay 함수도 동일하게 수정
    const getDailyTargetDisplay = () => {
      // 시간 기반 계획이고 dailyPlan이 있는 경우
      if (planData.isTimeBasedCalculation && planData.dailyPlan && planData.dailyPlan.length > 0) {
        const currentDay = getCurrentDay(planData.startDate);
        const todayPlan = planData.dailyPlan.find((day: any) => day.day === currentDay);

        if (todayPlan) {
          return {
            chapters: todayPlan.actualChapterCount || todayPlan.chapters.length,
            time: todayPlan.formattedTime || `${todayPlan.totalMinutes}분`,
            isTimeBase: true
          };
        }
      }

      // 기본값
      const chapters = todayChapters.length || planData.chaptersPerDay || Math.ceil(planData.totalChapters / planData.totalDays);
      const minutes = planData.minutesPerDay || planData.targetMinutesPerDay || Math.round(planData.minutesPerDayExact) || Math.round(chapters * 4.5);

      return {
        chapters: chapters,
        time: `${minutes}분`,
        isTimeBase: planData.isTimeBasedCalculation || false
      };
    };

    const dailyTarget = getDailyTargetDisplay();

    const handleResetPlan = () => {
      Alert.alert(
          '일독 초기화',
          '현재 일독 계획을 초기화하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '초기화',
              style: 'destructive',
              onPress: handleDirectReset
            }
          ]
      );
    };

    return (
        <ScrollView style={{ backgroundColor: color.white, flex: 1 }}>
          {/* 진행률 카드 */}
          <Box bg="white" mx={4} mt={4} p={4} borderRadius="md" shadow={1}>
            <VStack space={3}>
              <Text fontSize="22" fontWeight="600" color="#333">
                📊 일독 진행 현황
              </Text>

              <Box>
                <HStack justifyContent="space-between" mb={2}>
                  <Text fontSize="18" color="#666">
                    전체 진행률
                  </Text>
                  <Text fontSize="18" fontWeight="600" color={getStatusColor(progress.progressPercentage)}>
                    {progress.progressPercentage.toFixed(1)}%
                  </Text>
                </HStack>
                <Progress
                    value={progress.progressPercentage}
                    bg="#E0E0E0"
                    _filledTrack={{ bg: getStatusColor(progress.progressPercentage) }}
                    size="md"
                    borderRadius="full"
                />
              </Box>

              {/* 시간 기반일 때 오늘 진도 표시 개선 */}
              {planData.isTimeBasedCalculation && todayChapters.length > 0 && (
                  <Box>
                    <HStack justifyContent="space-between" mb={2}>
                      <Text fontSize="18" color="#666">
                        오늘 진도
                      </Text>
                      <Text fontSize="18" fontWeight="600" color="#4CAF50">
                        {progress.todayProgress ? `${progress.todayProgress.toFixed(1)}%` : '0%'}
                      </Text>
                    </HStack>
                    <Progress
                        value={progress.todayProgress || 0}
                        bg="#E0E0E0"
                        _filledTrack={{ bg: "#4CAF50" }}
                        size="sm"
                        borderRadius="full"
                    />
                    {progress.estimatedTimeToday && (
                        <Text fontSize="14" color="#666" mt={1}>
                          예상 시간: {progress.estimatedTimeToday}
                        </Text>
                    )}
                  </Box>
              )}

              <HStack justifyContent="space-around" pt={2}>
                <VStack alignItems="center">
                  <Text fontSize="24" fontWeight="600" color="#37C4B9">
                    {progress.readChapters || 0}
                  </Text>
                  <Text fontSize="16" color="#666">
                    읽은 장
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="24" fontWeight="600" color="#666">
                    {planData.totalChapters || 0}
                  </Text>
                  <Text fontSize="16" color="#666">
                    전체 장
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="24" fontWeight="600" color="#F44336">
                    {missedCount || 0}
                  </Text>
                  <Text fontSize="16" color="#666">
                    놓친 장
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </Box>

          {/* 일정 정보 카드 - 시간 기반 개선 */}
          <Box bg="white" mx={4} mt={4} p={4} borderRadius="md" shadow={1}>
            <VStack space={3}>
              <Text fontSize="22" fontWeight="600" color="#333">
                📅 일독 정보
              </Text>
              <VStack space={2}>
                <HStack justifyContent="space-between">
                  <Text fontSize="18" color="#666">계획 유형</Text>
                  <Text fontSize="18" fontWeight="500">{getPlanTypeName(planData.planType)}</Text>
                </HStack>

                {/* 하루 목표 표시 개선 */}
                <HStack justifyContent="space-between">
                  <Text fontSize="18" color="#666">오늘 목표</Text>
                  <Text fontSize="18" fontWeight="500">
                    {dailyTarget.chapters}장 / {dailyTarget.time.toString().split('.')[0].replace('', '')}
                  </Text>
                </HStack>

                {/* 진행 상태 개선 */}
                <HStack justifyContent="space-between">
                  <Text fontSize="18" color="#666">진행 상태</Text>
                  <Badge
                      colorScheme={progress.isOnTrack ? "green" : "orange"}
                      variant="subtle"
                  >
                    <Text fontSize="16" fontWeight="500">
                      {progress.isOnTrack ? "정상 진행중" : "진도 뒤처짐"}
                    </Text>
                  </Badge>
                </HStack>

                <HStack justifyContent="space-between">
                  <Text fontSize="18" color="#666">남은 일수</Text>
                  <Text fontSize="18" fontWeight="500">
                    {progress.remainingDays || getDaysRemaining()}일
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          <Box mx={4} mt={4} mb={4}>
            <VStack space={3}>
              <Button
                  bg="#37C4B9"
                  _pressed={{ bg: "#2BA89E" }}
                  onPress={() => setMenuIndex(0)}
                  borderRadius="md"
                  h={12}
              >
                <Text color="white" fontSize={16} fontWeight="600">
                  오늘 읽기 계속하기
                </Text>
              </Button>

              <Button
                  bg="transparent"
                  borderWidth={2}
                  borderColor="#FF6B6B"
                  _pressed={{ bg: "#FFF5F5" }}
                  onPress={handleResetPlan}
                  borderRadius="md"
                  h={12}
              >
                <Text color="#FF6B6B" fontSize={16} fontWeight="600">
                  일독 초기화
                </Text>
              </Button>
            </VStack>
          </Box>
        </ScrollView>
    );
  }, [planData, color.white, navigation, handleDirectReset, getPlanTypeName, calculateProgress, calculateMissedChapters, getTodayChapters, getCurrentDay, forceUpdateKey]);

  // 🔥 수정된 일독 진행 현황 박스 - 시간 기반 계산 지원
  const renderProgressIndicator = useCallback((planData: any) => {
    // 오늘의 계획 정보 가져오기 (통합된 방식)
    const getTodayPlanInfo = () => {
      // 시간 기반 계획이고 dailyPlan이 있는 경우
      if (planData.isTimeBasedCalculation && planData.dailyPlan && planData.dailyPlan.length > 0) {
        const currentDay = getCurrentDay(planData.startDate);

        console.log(`
        📱 오늘 목표 계산
        - 시작일: ${planData.startDate}
        - 현재 일차: ${currentDay}일차
        - dailyPlan 길이: ${planData.dailyPlan.length}
      `);

        // 일차로 오늘의 계획 찾기
        const todayPlan = planData.dailyPlan.find((day: any) => day.day === currentDay);

        if (todayPlan) {
          console.log(`✅ ${currentDay}일차 계획 찾음:`, {
            장수: todayPlan.actualChapterCount || todayPlan.chapters.length,
            시간: todayPlan.formattedTime
          });

          return {
            chapters: todayPlan.actualChapterCount || todayPlan.chapters.length,
            time: todayPlan.formattedTime || `${todayPlan.totalMinutes}분`,
            isActual: true
          };
        } else {
          console.log(`⚠️ ${currentDay}일차 계획을 찾을 수 없음`);

          // 계획이 끝났거나 시작 전인 경우 처리
          if (currentDay > planData.totalDays) {
            return {
              chapters: 0,
              time: '완료',
              isActual: true
            };
          } else if (currentDay < 1) {
            return {
              chapters: 0,
              time: '시작 전',
              isActual: true
            };
          }
        }
      }

      // 기본값 - getTodayChapters 사용
      const todayChapters = getTodayChapters(planData);
      const chapters = todayChapters.length || planData.chaptersPerDay || Math.ceil(planData.totalChapters / planData.totalDays);
      const minutes = planData.minutesPerDay || planData.targetMinutesPerDay || Math.round(planData.minutesPerDayExact) || Math.round(chapters * 4.5);

      return {
        chapters: chapters,
        time: formatDailyTarget ? formatDailyTarget(minutes) : `${minutes}분`,
        isActual: false
      };
    };

    const todayInfo = getTodayPlanInfo();

    console.log(`
    📱 UI 표시 정보 (최종)
    - 오늘 목표: ${todayInfo.chapters}장 / ${todayInfo.time}
    - 실제 계획: ${todayInfo.isActual}
  `);

    return (
        <Box bg="#E8F8F7" mx={4} mt={4} p={4} borderRadius="md">
          <VStack space={3}>
            {/* 상단 설명 */}
            <Text fontSize="16" color="#666" textAlign="center">
              {getPlanTypeDescription(planData.planType)}
            </Text>

            {/* 중앙 일독 진행중 텍스트 */}
            <HStack justifyContent="center" alignItems="center" space={2}>
              <Text fontSize="19" color="#37C4B9">📖</Text>
              <Text fontSize="19" color="#37C4B9" fontWeight="600">
                {getPlanTypeName(planData.planType)} 일독 진행중
              </Text>
            </HStack>

            {/* 하단 기간 정보 */}
            <VStack space={1}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="18" color="#666">총 기간 :</Text>
                <HStack alignItems="baseline">
                  <Text fontSize="16" color="#666">
                    {dayjs(planData.startDate).format('YY.MM.DD')} ~ {dayjs(planData.endDate || planData.targetDate).format('YY.MM.DD')}
                  </Text>
                  <Text fontSize="18" color="#37C4B9" fontWeight="600" ml={2}>
                    {planData.totalDays}일
                  </Text>
                </HStack>
              </HStack>

              {/* 하루 목표 표시 - 통합된 정보 사용 */}
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="18" color="#666">
                  {todayInfo.isActual ? "오늘 목표 :" : "하루 목표 :"}
                </Text>
                <HStack alignItems="baseline">
                  <Text fontSize="18" color="#37C4B9" fontWeight="700">
                    {todayInfo.chapters}장
                  </Text>
                  <Text fontSize="18" color="#37C4B9" ml={1} fontWeight="700">
                    / {todayInfo.time.toString().split('.')[0].replace('', '')}
                  </Text>
                </HStack>
              </HStack>
            </VStack>
          </VStack>
        </Box>
    );
  }, [getPlanTypeName, getPlanTypeDescription, getTodayChapters, getCurrentDay, formatDailyTarget]);

  // 컴포넌트 렌더링
  const renderContent = useCallback(() => {
    if (isLoading) {
      return (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text>로딩 중...</Text>
          </Box>
      );
    }

    const currentMenuName = safeMenuList[menuIndex];

    if (currentMenuName === "설정") {
      return <SettingSidePage
          key={`setting-${forceUpdateKey}`}
          readState={mark}
          onTrigger={handleChangeUpdateData}
      />;
    }

    if (currentMenuName === "진도") {
      return <ProgressView key={`progress-${forceUpdateKey}`} />;
    }

    if (planData && menuIndex === 0) {
      const progressIndicator = renderProgressIndicator(planData);

      switch (planData.planType) {
        case 'full_bible':
          return (
              <ScrollView
                  key={`full-bible-${forceUpdateKey}-${mark?.length || 0}`}
                  style={{ backgroundColor: color.white }}
              >
                {progressIndicator}
                <Box>
                  {isFocused && mark && (
                      <Old
                          key={`plan-old-${forceUpdateKey}-${mark?.length || 0}`}
                          readState={mark}
                          menuIndex={menuIndex}
                      />
                  )}
                </Box>
                <Box>
                  {isFocused && mark && (
                      <New
                          key={`plan-new-${forceUpdateKey}-${mark?.length || 0}`}
                          readState={mark}
                          menuIndex={menuIndex}
                      />
                  )}
                </Box>
              </ScrollView>
          );

        case 'old_testament':
          return (
              <ScrollView
                  key={`old-testament-${forceUpdateKey}-${mark?.length || 0}`}
                  style={{ backgroundColor: color.white }}
              >
                {progressIndicator}
                {isFocused && mark && (
                    <Old
                        key={`old-only-${forceUpdateKey}-${mark?.length || 0}`}
                        readState={mark}
                        menuIndex={menuIndex}
                    />
                )}
              </ScrollView>
          );

        case 'new_testament':
          return (
              <ScrollView
                  key={`new-testament-${forceUpdateKey}-${mark?.length || 0}`}
                  style={{ backgroundColor: color.white }}
              >
                {progressIndicator}
                {isFocused && mark && (
                    <New
                        key={`new-only-${forceUpdateKey}-${mark?.length || 0}`}
                        readState={mark}
                        menuIndex={menuIndex}
                    />
                )}
              </ScrollView>
          );

        case 'pentateuch':
          return (
              <ScrollView
                  key={`pentateuch-${forceUpdateKey}-${mark?.length || 0}`}
                  style={{ backgroundColor: color.white }}
              >
                {progressIndicator}
                {isFocused && mark && (
                    <Old
                        key={`pentateuch-view-${forceUpdateKey}-${mark?.length || 0}`}
                        readState={mark}
                        menuIndex={menuIndex}
                        filterBooks={[1, 2, 3, 4, 5]}
                    />
                )}
              </ScrollView>
          );

        case 'psalms':
          return (
              <ScrollView
                  key={`psalms-${forceUpdateKey}-${mark?.length || 0}`}
                  style={{ backgroundColor: color.white }}
              >
                {progressIndicator}
                {isFocused && mark && (
                    <Old
                        key={`psalms-view-${forceUpdateKey}-${mark?.length || 0}`}
                        readState={mark}
                        menuIndex={menuIndex}
                        filterBooks={[19]}
                    />
                )}
              </ScrollView>
          );

        default:
          return (
              <Box flex={1} justifyContent="center" alignItems="center">
                <Text>알 수 없는 일독 타입입니다.</Text>
              </Box>
          );
      }
    }

    if (currentMenuName === "구약") {
      return (
          <ScrollView
              key={`old-${forceUpdateKey}-${mark?.length || 0}`}
              style={{ backgroundColor: color.white }}
          >
            {isFocused && mark && (
                <Old
                    key={`old-${forceUpdateKey}-${mark?.length || 0}`}
                    readState={mark}
                    menuIndex={menuIndex}
                />
            )}
          </ScrollView>
      );
    }

    if (currentMenuName === "신약") {
      return (
          <ScrollView
              key={`new-${forceUpdateKey}-${mark?.length || 0}`}
              style={{ backgroundColor: color.white }}
          >
            {isFocused && mark && (
                <New
                    key={`new-${forceUpdateKey}-${mark?.length || 0}`}
                    readState={mark}
                    menuIndex={menuIndex}
                />
            )}
          </ScrollView>
      );
    }

    return null;
  }, [isLoading, safeMenuList, menuIndex, mark, planData, forceUpdateKey, color.white, handleChangeUpdateData, isFocused, ProgressView, renderProgressIndicator]);

  useEffect(() => {
    console.log('🔄 ReadingBibleScreen 전역 새로고침 콜백 등록');
    registerGlobalRefreshCallback(handleGlobalRefresh);

    return () => {
      console.log('🔄 ReadingBibleScreen 전역 새로고침 콜백 해제');
      unregisterGlobalRefreshCallback();
    };
  }, [registerGlobalRefreshCallback, unregisterGlobalRefreshCallback, handleGlobalRefresh]);

  useFocusEffect(
      useCallback(() => {
        console.log('🎯 ReadingBibleScreen 포커스 - 데이터 로드 시작');
        updateMenuAndData();
        loadReadingState();

        return () => {
          console.log('🎯 ReadingBibleScreen 포커스 해제');
        };
      }, [updateMenuAndData, loadReadingState])
  );

  return (
      <View style={styles.container}>
        <BackHeaderLayout title="성경일독" />

        <Tabs
            menus={safeMenuList}
            onSelectHandler={handleMenuChange}
            selectedIndex={menuIndex}
        />

        {renderContent()}

        <View style={styles.adContainer}>
          <BannerAdMain />
        </View>

        <FooterLayout />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  adContainer: {
    marginTop: 10,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});