import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { bibleSetting, defineSQL, fetchSql } from "../../../utils";
import FooterLayout from "../../layout/footer/footer";
import ReadingHeaderLayout from "../../layout/header/readingHeader";
import New from "./_side/new";
import Old from "./_side/old";
import SettingSidePage from "./_side/setting";
import { Platform, View } from "react-native";
import { Box, Text, VStack, HStack, Progress, Button, Badge, ScrollView } from "native-base";
import BannerAdMain from "../../../adforus/BannerAdMain";
import {
  loadBiblePlanData,
  calculateProgress,
  calculateMissedChapters,
  formatDate,
  deleteBiblePlanData
} from "../../../utils/biblePlanUtils";
import { useBaseStyle } from "../../../hooks";
import { Alert } from "react-native";
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { useNavigation } from "@react-navigation/native";
import { useBibleReading } from "../../../utils/useBibleReading"; // 🆕 훅 추가

export default function ReadingBibleScreen() {
  const [menuIndex, setMenuIndex] = useState<number>(2);
  const [mark, setMark] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [menuList, setMenuList] = useState<string[]>(["구약", "신약", "설정"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [forceUpdateKey, setForceUpdateKey] = useState<number>(0); // 🆕 강제 업데이트 키
  const isFocused = useIsFocused();
  const { color } = useBaseStyle();
  const navigation = useNavigation();

  // 🆕 useBibleReading 훅 사용하여 전역 새로고침 등록
  const { registerGlobalRefreshCallback, unregisterGlobalRefreshCallback } = useBibleReading(mark);

  const onMenuChange = useCallback(
      (index: number) => {
        setMenuIndex(index);
      },
      []
  );

  const settingSelectSql = `${defineSQL(["*"], "SELECT", "reading_table", {
    WHERE: { read: "?" },
  })}`;

  // 🆕 전역 새로고침 함수
  const handleGlobalRefresh = useCallback(() => {
    console.log('🔄 ReadingBibleScreen 전역 새로고침 실행');

    // 강제 업데이트 키 변경 (모든 자식 컴포넌트 리렌더링)
    setForceUpdateKey(prev => {
      const newKey = prev + 1;
      console.log('🔄 ForceUpdateKey 업데이트:', prev, '->', newKey);
      return newKey;
    });

    // 읽기 상태 다시 로드
    loadReadingState();

    // 일독 데이터 다시 로드
    updateMenuAndData();
  }, []);

  // 🆕 컴포넌트 마운트 시 전역 새로고침 콜백 등록
  useEffect(() => {
    console.log('🔄 ReadingBibleScreen 전역 새로고침 콜백 등록');
    registerGlobalRefreshCallback(handleGlobalRefresh);

    return () => {
      console.log('🔄 ReadingBibleScreen 전역 새로고침 콜백 해제');
      unregisterGlobalRefreshCallback();
    };
  }, [registerGlobalRefreshCallback, unregisterGlobalRefreshCallback, handleGlobalRefresh]);

  // 일독 데이터 로드 및 메뉴 설정
  const updateMenuAndData = useCallback(() => {
    try {
      const existingPlan = loadBiblePlanData();

      if (existingPlan) {
        setPlanData(existingPlan);

        // 일독 타입에 따른 메뉴 설정
        switch (existingPlan.planType) {
          case 'full_bible':
            setMenuList(["맥체인", "진도"]);
            break;
          case 'old_testament':
            setMenuList(["구약", "진도"]);
            break;
          case 'new_testament':
            setMenuList(["신약", "진도"]);
            break;
          case 'pentateuch':
            setMenuList(["모세오경", "진도"]);
            break;
          case 'psalms':
            setMenuList(["시편", "진도"]);
            break;
          default:
            setMenuList(["구약", "신약", "설정"]);
        }

        // 첫 번째 탭으로 이동
        setMenuIndex(0);
      } else {
        setPlanData(null);
        setMenuList(["구약", "신약", "설정"]);
        setMenuIndex(2);
      }
    } catch (error) {
      console.error('일독 데이터 로드 오류:', error);
      setPlanData(null);
      setMenuList(["구약", "신약", "설정"]);
      setMenuIndex(2);
    }
  }, []);

  // 읽기 상태 로드
  const loadReadingState = useCallback(async () => {
    try {
      const res = await fetchSql(bibleSetting, settingSelectSql, ["true"]);
      console.log('🔄 ReadingState 로드됨:', res?.length || 0, '개 항목');
      setMark(res);
    } catch (error) {
      console.error('읽기 상태 로드 오류:', error);
      setMark(null);
    }
  }, [settingSelectSql]);

  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (isFocused) {
        setIsLoading(true);

        try {
          // 일독 데이터 로드 및 메뉴 설정
          updateMenuAndData();

          // 읽기 상태 로드
          await loadReadingState();
        } catch (error) {
          console.error('데이터 초기화 오류:', error);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [isFocused, updateMenuAndData, loadReadingState]);

  const handleChangeUpdateData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 읽기 데이터 업데이트
      await loadReadingState();

      // 일독 데이터 새로고침
      updateMenuAndData();

      // 🆕 강제 업데이트 키 변경
      setForceUpdateKey(prev => prev + 1);

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

  // 진도현황 화면으로 이동
  const navigateToProgress = useCallback(() => {
    navigation.navigate('ProgressScreen' as never);
  }, [navigation]);

  // 간단한 진도 표시 컴포넌트
  const ProgressView = useCallback(() => {
    if (!planData) return null;

    const progress = calculateProgress(planData);
    const missedCount = calculateMissedChapters(planData);

    const getDaysRemaining = () => {
      const endDate = new Date(planData.targetDate);
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

    const handleResetPlan = () => {
      Alert.alert(
          '일독 초기화',
          '현재 일독 계획을 초기화하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '초기화',
              style: 'destructive',
              onPress: async () => {
                try {
                  deleteBiblePlanData();
                  updateMenuAndData();

                  // 🆕 강제 업데이트 트리거
                  setForceUpdateKey(prev => prev + 1);

                  Toast.show({
                    type: 'success',
                    text1: '일독 계획이 초기화되었습니다'
                  });
                } catch (error) {
                  console.error('일독 초기화 오류:', error);
                  Toast.show({
                    type: 'error',
                    text1: '초기화 중 오류가 발생했습니다'
                  });
                }
              }
            }
          ]
      );
    };

    return (
        <ScrollView style={{ backgroundColor: color.white }}>
          <VStack space={4} p={4}>
            {/* 일독 헤더 정보 */}
            <Box bg="#E8F8F7" p={4} borderRadius="12">
              <VStack space={2}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="18" fontWeight="700" color="#37C4B9">
                    📖 {planData.planName} 일독
                  </Text>
                  {missedCount > 0 && (
                      <Badge colorScheme="danger" rounded="full">
                        놓친 장: {missedCount}
                      </Badge>
                  )}
                </HStack>

                <Text fontSize="14" color="#666">
                  {formatDate(planData.startDate)} ~ {formatDate(planData.targetDate)}
                </Text>

                <HStack justifyContent="space-between">
                  <Text fontSize="12" color="#666">
                    하루 목표: {planData.chaptersPerDay}장
                  </Text>
                  <Text fontSize="12" color="#666">
                    예상시간: {planData.minutesPerDay}분
                  </Text>
                  <Text fontSize="12" color="#666">
                    남은 일수: {getDaysRemaining()}일
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* 전체 진행률 */}
            <Box bg="white" p={4} borderRadius="12" borderWidth={1} borderColor="#F0F0F0">
              <VStack space={3}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="16" fontWeight="600">전체 진행률</Text>
                  <Text fontSize="16" fontWeight="700" color={getStatusColor(progress.progressPercentage)}>
                    {progress.progressPercentage.toFixed(1)}%
                  </Text>
                </HStack>

                <Progress
                    value={progress.progressPercentage}
                    bg="#F0F0F0"
                    _filledTrack={{
                      bg: getStatusColor(progress.progressPercentage)
                    }}
                    size="lg"
                />

                <HStack justifyContent="space-between">
                  <Text fontSize="12" color="#666">
                    {progress.completedChapters} / {progress.totalChapters} 장
                  </Text>
                  <Text fontSize="12" color="#666">
                    {progress.daysElapsed} / {progress.totalDays} 일
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* 통계 정보 */}
            <Box bg="white" p={4} borderRadius="12" borderWidth={1} borderColor="#F0F0F0">
              <VStack space={3}>
                <Text fontSize="16" fontWeight="600">일독 정보</Text>

                <VStack space={2}>
                  <HStack justifyContent="space-between">
                    <Text fontSize="14" color="#666">총 장수</Text>
                    <Text fontSize="14" fontWeight="600">
                      {planData.totalChapters}장
                    </Text>
                  </HStack>

                  <HStack justifyContent="space-between">
                    <Text fontSize="14" color="#666">읽은 장수</Text>
                    <Text fontSize="14" fontWeight="600">
                      {progress.completedChapters}장
                    </Text>
                  </HStack>

                  <HStack justifyContent="space-between">
                    <Text fontSize="14" color="#666">남은 장수</Text>
                    <Text fontSize="14" fontWeight="600">
                      {progress.totalChapters - progress.completedChapters}장
                    </Text>
                  </HStack>

                  <HStack justifyContent="space-between">
                    <Text fontSize="14" color="#666">예상 완료일</Text>
                    <Text fontSize="14" fontWeight="600" color="#37C4B9">
                      {formatDate(planData.targetDate)}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>

            {/* 일독 관리 버튼들 */}
            <VStack space={3} mt={4} mb={6}>
              <Button
                  variant="outline"
                  borderColor="#37C4B9"
                  _text={{ color: "#37C4B9" }}
                  _pressed={{ bg: "#F0F9FF" }}
                  size="lg"
                  onPress={navigateToProgress}
              >
                <Text color="#37C4B9" fontSize="16" fontWeight="600">
                  진도현황
                </Text>
              </Button>

              <Button
                  variant="outline"
                  borderColor="#FF5722"
                  _text={{ color: "#FF5722" }}
                  _pressed={{ bg: "#FFF3E0" }}
                  size="lg"
                  onPress={handleResetPlan}
              >
                <Text color="#FF5722" fontSize="16" fontWeight="600">
                  설정 초기화
                </Text>
              </Button>
            </VStack>
          </VStack>
        </ScrollView>
    );
  }, [planData, color.white, updateMenuAndData, navigateToProgress]);

  // 메뉴에 따른 컴포넌트 렌더링
  const renderContent = useCallback(() => {
    if (isLoading) {
      return (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text>로딩 중...</Text>
          </Box>
      );
    }

    const currentMenuName = menuList[menuIndex];

    // 설정 탭
    if (currentMenuName === "설정") {
      return <SettingSidePage
          key={`setting-${forceUpdateKey}`} // 🆕 키 추가
          readState={mark}
          onTrigger={handleChangeUpdateData}
      />;
    }

    // 진도 탭
    if (currentMenuName === "진도") {
      return <ProgressView key={`progress-${forceUpdateKey}`} />; // 🆕 키 추가
    }

    // 일독이 없는 경우 - 기본 구약/신약
    if (!planData) {
      if (menuIndex === 0) {
        return isFocused && mark && (
            <Old
                key={`old-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                readState={mark}
                menuIndex={menuIndex}
            />
        );
      } else if (menuIndex === 1) {
        return isFocused && mark && (
            <New
                key={`new-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                readState={mark}
                menuIndex={menuIndex}
            />
        );
      }
    }

    // 일독이 있는 경우 - 첫 번째 탭의 내용
    if (planData) {
      switch (planData.planType) {
        case 'full_bible':
          // 맥체인: 구약 + 신약 모두 표시 (상단에 일독 진행 상태 표시)
          return (
              <ScrollView
                  key={`full-bible-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                  style={{ backgroundColor: color.white }}
              >
                {/* 일독 진행 상태 표시 */}
                <Box bg="#E8F8F7" p={4} mx={4} mt={4} borderRadius="md">
                  <VStack alignItems="center" space={2}>
                    <Text fontSize="16" fontWeight="600" color="#37C4B9">
                      📖 성경 일독 진행중
                    </Text>
                    <Text fontSize="12" color="#666" textAlign="center">
                      하루 {planData.chaptersPerDay}장씩 • 예상시간 {planData.minutesPerDay}분
                    </Text>
                  </VStack>
                </Box>

                <Box>
                  {isFocused && mark && (
                      <Old
                          key={`plan-old-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                          readState={mark}
                          menuIndex={menuIndex}
                      />
                  )}
                </Box>

                {/* 신약 섹션 */}
                <Box>
                  {isFocused && mark && (
                      <New
                          key={`plan-new-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                          readState={mark}
                          menuIndex={menuIndex}
                      />
                  )}
                </Box>
              </ScrollView>
          );

        case 'old_testament':
          return isFocused && mark && (
              <Old
                  key={`plan-old-only-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                  readState={mark}
                  menuIndex={menuIndex}
              />
          );

        case 'new_testament':
          return isFocused && mark && (
              <New
                  key={`plan-new-only-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                  readState={mark}
                  menuIndex={menuIndex}
              />
          );

        case 'pentateuch':
          return isFocused && mark && (
              <Old
                  key={`plan-pentateuch-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                  readState={mark}
                  menuIndex={menuIndex}
                  filterBooks={[1, 2, 3, 4, 5]}
              />
          );

        case 'psalms':
          return isFocused && mark && (
              <Old
                  key={`plan-psalms-${forceUpdateKey}-${mark?.length || 0}`} // 🆕 키 추가
                  readState={mark}
                  menuIndex={menuIndex}
                  filterBooks={[19]}
              />
          );
      }
    }

    // 기본값
    return <SettingSidePage
        key={`default-setting-${forceUpdateKey}`} // 🆕 키 추가
        readState={mark}
        onTrigger={handleChangeUpdateData}
    />;
  }, [isLoading, menuList, menuIndex, mark, handleChangeUpdateData, ProgressView, planData, isFocused, color.white, forceUpdateKey]);

  return (
      <>
        <ReadingHeaderLayout
            {...{
              list: menuList,
              menuIndex,
              onMenuChange,
            }}
        />
        {Platform.OS === "android" && (
            <View style={{ marginTop: 15 }}>
              <BannerAdMain />
            </View>
        )}

        {renderContent()}

        <FooterLayout />
      </>
  );
}