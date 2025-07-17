// src/components/page/reading/index.tsx
// 🔥 기존 UI 완전 유지, 내부 로직만 시간 기반으로 변경

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

// 🔥 시간 기반 유틸리티 함수들로 교체 (기존 API 호환성 유지)
import {
  loadBiblePlanData,
  calculateProgress,
  calculateMissedChapters,
  formatDate,
  formatReadingTime,
  deleteBiblePlanData
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
  // 🔥 기존 상태 변수들 완전히 동일하게 유지
  const [menuIndex, setMenuIndex] = useState<number>(2);
  const [mark, setMark] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [menuList, setMenuList] = useState<string[]>(["구약", "신약", "설정"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [forceUpdateKey, setForceUpdateKey] = useState<number>(0);
  const isFocused = useIsFocused();
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  // 🔥 기존 훅 사용 (내부적으로 시간 기반 처리)
  const {
    registerGlobalRefreshCallback,
    unregisterGlobalRefreshCallback
  } = useBibleReading(mark);

  // 🔥 기존 함수들 완전히 동일하게 유지
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

  // 🔥 기존 로딩 함수 그대로 유지
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

  // 🔥 메뉴 업데이트 함수 수정 - 직접 저장소 확인
  const updateMenuAndData = useCallback(() => {
    try {
      console.log('🔄 메뉴 및 데이터 업데이트 시작');

      // 🔥 직접 저장소에서 계획 데이터 로드
      let existingPlan = null;

      // 1. 시간 기반 계획 우선 확인
      try {
        const timeBasedPlanStr = defaultStorage.getString('bible_reading_plan');
        if (timeBasedPlanStr) {
          const parsed = JSON.parse(timeBasedPlanStr);
          console.log('📚 시간 기반 계획 발견:', parsed);
          existingPlan = parsed;
        }
      } catch (error) {
        console.warn('시간 기반 계획 로드 실패:', error);
      }

      // 2. 기존 계획 확인 (호환성)
      if (!existingPlan) {
        try {
          const legacyPlanStr = defaultStorage.getString('bible_plan');
          if (legacyPlanStr) {
            const parsed = JSON.parse(legacyPlanStr);
            console.log('📚 기존 계획 발견:', parsed);
            existingPlan = parsed;
          }
        } catch (error) {
          console.warn('기존 계획 로드 실패:', error);
        }
      }

      if (existingPlan) {
        setPlanData(existingPlan);
        console.log('✅ 계획 데이터 설정됨:', existingPlan.planType);

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
        console.log('✅ 일독 메뉴 업데이트:', newMenuList);

        // 🔥 계획이 있으면 첫 번째 탭(일독 진행)으로 이동
        setTimeout(() => {
          setMenuIndex(0);
          console.log('🎯 일독 진행 탭으로 자동 이동');
        }, 100);

      } else {
        setPlanData(null);
        setMenuList(["구약", "신약", "설정"]);
        setMenuIndex(2); // 설정 탭으로
        console.log('📚 일독 없음 - 기본 메뉴 설정');
      }
    } catch (error) {
      console.error('일독 데이터 업데이트 오류:', error);
      setPlanData(null);
      setMenuList(["구약", "신약", "설정"]);
      setMenuIndex(2);
    }
  }, []);

  // 🔥 기존 새로고침 함수들 그대로 유지
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

  // 🔥 handleChangeUpdateData 함수 수정 - 더 안정적인 탭 이동
  const handleChangeUpdateData = useCallback(async (targetTabIndex?: number) => {
    try {
      setIsLoading(true);

      // 읽기 상태 로드
      await loadReadingState();

      // 메뉴 및 계획 데이터 업데이트
      updateMenuAndData();

      // 강제 새로고침
      setForceUpdateKey(prev => prev + 1);

      // 🔥 탭 이동 처리 (더 안정적으로)
      if (typeof targetTabIndex === 'number' && targetTabIndex >= 0) {
        console.log(`📍 탭 이동 요청: 인덱스 ${targetTabIndex}`);

        // 데이터 업데이트 완료 후 탭 이동
        setTimeout(() => {
          setMenuIndex(targetTabIndex);
          console.log(`✅ 탭 이동 완료: 인덱스 ${targetTabIndex}`);
        }, 200);
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

  // 🔥 기존 초기화 함수 그대로 유지
  const handleDirectReset = useCallback(async () => {
    try {
      console.log('=== ReadingBibleScreen 직접 초기화 시작 ===');

      Toast.show({
        type: 'info',
        text1: '초기화 중...',
        text2: '잠시만 기다려주세요',
        autoHide: false
      });

      // MMKV 스토리지 정리
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

      // SQLite 정리
      try {
        const deleteSql = 'DELETE FROM reading_table';
        await fetchSql(bibleSetting, deleteSql, []);
        console.log('SQLite reading_table 삭제 완료');
      } catch (sqlError) {
        console.error('SQLite 삭제 오류:', sqlError);
      }

      // 로컬 상태 초기화
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

  // 🔥 ProgressView 컴포넌트 (내부적으로 시간 기반 데이터 사용)
  const ProgressView = useCallback(() => {
    if (!planData) {
      return <ProgressScreen key={`progress-${forceUpdateKey}`} />;
    }

    // 🔥 시간 기반 진행률 계산 (기존 UI 형식 유지)
    const progress = calculateProgress(planData);
    const missedCount = calculateMissedChapters(planData);

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

    // 🔥 시간 기반 데이터에서 분 정보 가져오기
    const getEstimatedMinutes = () => {
      if (planData.calculatedMinutesPerDay) {
        return Math.round(planData.calculatedMinutesPerDay);
      }
      if (planData.minutesPerDay) {
        return planData.minutesPerDay;
      }
      return Math.round(planData.chaptersPerDay * 4.5);
    };

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
          {/* 진행률 카드 (기존 UI 그대로) */}
          <Box bg="white" mx={4} mt={4} p={4} borderRadius="md" shadow={1}>
            <VStack space={3}>
              <Text fontSize="22" fontWeight="600" color="#333">
                📊 일독 진행 현황
              </Text>

              <Box>
                <HStack justifyContent="space-between" mb={2}>
                  <Text fontSize="18" color="#666">
                    진행률
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

              <HStack justifyContent="space-around" pt={2}>
                <VStack alignItems="center">
                  <Text fontSize="24" fontWeight="600" color="#37C4B9">
                    {progress.readChapters || progress.completedChapters || 0}
                  </Text>
                  <Text fontSize="16" color="#666">
                    읽은 장
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="24" fontWeight="600" color="#666">
                    {planData.totalChapters || progress.totalChapters || 0}
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

          {/* 일정 정보 카드 (기존 UI에 시간 정보 조건부 추가) */}
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
                <HStack justifyContent="space-between">
                  <Text fontSize="18" color="#666">하루 목표</Text>
                  <Text fontSize="18" fontWeight="500">{planData.chaptersPerDay}장</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="18" color="#666">예상 시간</Text>
                  <Text fontSize="18" fontWeight="500">
                    {planData.isTimeBasedCalculation ?
                        formatReadingTime(getEstimatedMinutes()) :
                        `${getEstimatedMinutes()}분`
                    }
                  </Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="18" color="#666">남은 일수</Text>
                  <Text fontSize="18" fontWeight="500">{getDaysRemaining()}일</Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          {/* 액션 버튼들 (기존 UI 그대로) */}
          <VStack space={3} mx={4} mt={4} mb={6}>
            <Button
                onPress={() => {
                  const today = new Date();
                  const startDate = new Date(planData.startDate);
                  const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                  navigation.navigate('ProgressScreen', {
                    parcent: daysPassed,
                    total: planData.totalDays
                  });
                }}
                bg="#37C4B9"
                _pressed={{ bg: "#2BA89E" }}
                borderRadius="md"
                py={3}
            >
              <Text color="white" fontSize="20" fontWeight="600">
                📈 상세 진도 보기
              </Text>
            </Button>

            <Button
                onPress={() => setMenuIndex(0)}
                bg="#4CAF50"
                _pressed={{ bg: "#45A049" }}
                borderRadius="md"
                py={3}
            >
              <Text color="white" fontSize="20" fontWeight="600">
                📖 일독 계속하기
              </Text>
            </Button>

            <Button
                onPress={handleResetPlan}
                variant="outline"
                borderColor="#FF5722"
                _pressed={{ bg: "#FFEBEE" }}
                borderRadius="md"
                py={3}
            >
              <Text color="#FF5722" fontSize="20" fontWeight="600">
                🔄 일독 계획 초기화
              </Text>
            </Button>
          </VStack>
        </ScrollView>
    );
  }, [planData, color.white, navigation, handleDirectReset, getPlanTypeName, calculateProgress, calculateMissedChapters, forceUpdateKey]);

  // 🔥 기존 렌더링 함수 그대로 유지 (내부 데이터만 시간 기반 처리)
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
      return (
          <SettingSidePage
              key={`setting-${forceUpdateKey}`}
              readState={mark}
              onTrigger={handleChangeUpdateData} // 🔥 이 함수가 targetTabIndex를 받을 수 있어야 함
          />
      );
    }

    if (currentMenuName === "진도") {
      return <ProgressView key={`progress-${forceUpdateKey}`} />;
    }

    if (planData && menuIndex === 0) {
      // 🆕 첨부 이미지와 동일한 일독 진행 현황 박스 (시간 기반 데이터로 개선)
      const progress = calculateProgress(planData);

      const progressIndicator = (
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

              {/* 하단 기간 정보 (시간 기반 데이터 반영) */}
              <VStack space={1}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="18" color="#666">총 기간 :</Text>
                  <HStack alignItems="baseline">
                    <Text fontSize="16" color="#666">
                      {dayjs(planData.startDate).format('YY.MM.DD')} ~ {dayjs(planData.targetDate || planData.endDate).format('YY.MM.DD')}
                    </Text>
                    <Text fontSize="18" color="#37C4B9" fontWeight="600" ml={2}>
                      {planData.totalDays}일
                    </Text>
                  </HStack>
                </HStack>

                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="18" color="#666">하루목표 :</Text>
                  <HStack alignItems="baseline">
                    <Text fontSize="18" color="#37C4B9" fontWeight="700">
                      {planData.chaptersPerDay}장
                    </Text>
                    <Text fontSize="18" color="#37C4B9" ml={1} fontWeight="700">
                      / {planData.isTimeBasedCalculation ?
                        formatReadingTime(planData.calculatedMinutesPerDay) :
                        `${planData.minutesPerDay || Math.round(planData.chaptersPerDay * 4.5)}분`
                    }
                    </Text>
                  </HStack>
                </HStack>
              </VStack>
            </VStack>
          </Box>
      );

      // 🔥 기존 계획 타입별 렌더링 로직 그대로 유지
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

    // 🔥 기존 구약/신약 렌더링 로직 그대로 유지
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
  }, [isLoading, safeMenuList, menuIndex, mark, planData, forceUpdateKey, color.white, handleChangeUpdateData, isFocused, ProgressView, getPlanTypeName, getPlanTypeDescription]);

  // 🔥 초기 로드 useEffect 수정
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('🎯 ReadingBibleScreen 초기화 시작');

        // 1. 읽기 상태 로드
        await loadReadingState();

        // 2. 계획 데이터 확인 및 메뉴 설정
        updateMenuAndData();

        console.log('🎯 ReadingBibleScreen 초기화 완료');
      } catch (error) {
        console.error('ReadingBibleScreen 초기화 오류:', error);
      }
    };

    initializeComponent();
  }, [loadReadingState, updateMenuAndData]);

  // 🔥 기존 useEffect들 모두 그대로 유지
  useEffect(() => {
    console.log('🔄 ReadingBibleScreen 전역 새로고침 콜백 등록');
    registerGlobalRefreshCallback(handleGlobalRefresh);

    return () => {
      console.log('🔄 ReadingBibleScreen 전역 새로고침 콜백 해제');
      unregisterGlobalRefreshCallback();
    };
  }, [registerGlobalRefreshCallback, unregisterGlobalRefreshCallback, handleGlobalRefresh]);

  // 🔥 포커스 이벤트에서도 계획 데이터 재확인
  useFocusEffect(
      useCallback(() => {
        console.log('🎯 ReadingBibleScreen 포커스 - 데이터 로드 시작');

        // 포커스 시마다 최신 계획 데이터 확인
        updateMenuAndData();
        loadReadingState();

        return () => {
          console.log('🎯 ReadingBibleScreen 포커스 해제');
        };
      }, [updateMenuAndData, loadReadingState])
  );

  // 🔥 기존 return 구조 완전히 동일하게 유지
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

// 🔥 기존 스타일 그대로 유지
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