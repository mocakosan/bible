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
import { useBibleReading } from "../../../utils/useBibleReading";
import { defaultStorage } from "../../../utils/mmkv";

export default function ReadingBibleScreen() {
  const [menuIndex, setMenuIndex] = useState<number>(2);
  const [mark, setMark] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [menuList, setMenuList] = useState<string[]>(["구약", "신약", "설정"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [forceUpdateKey, setForceUpdateKey] = useState<number>(0);
  const isFocused = useIsFocused();
  const { color } = useBaseStyle();
  const navigation = useNavigation();

  // 🔥 수정: resetAllData 제거하고 필요한 함수만 사용
  const {
    registerGlobalRefreshCallback,
    unregisterGlobalRefreshCallback
    // resetAllData 제거
  } = useBibleReading(mark);

  // 안전한 메뉴 리스트 확보
  const safeMenuList = menuList && menuList.length > 0 ? menuList : ["구약", "신약", "설정"];

  const onMenuChange = useCallback(
      (index: number) => {
        setMenuIndex(index);
      },
      []
  );

  const settingSelectSql = `${defineSQL(["*"], "SELECT", "reading_table", {
    WHERE: { read: "?" }
  })}`;

  // 전역 새로고침 함수
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

  // 컴포넌트 마운트 시 전역 새로고침 콜백 등록
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
        let newMenuList: string[] = ["구약", "신약", "설정"]; // 기본값

        switch (existingPlan.planType) {
          case 'full_bible':
            newMenuList = ["성경", "진도"]; // "맥체인" → "성경"으로 수정
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
      // 에러 발생 시 안전한 기본값 설정
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

  const handleChangeMenu = useCallback((index: number) => {
    // 유효한 인덱스 범위 확인
    if (!menuList || index < 0 || index >= menuList.length) {
      console.warn(`Invalid menu index: ${index}, menuList length: ${menuList?.length || 0}`);
      return;
    }

    setMenuIndex(index);

    const currentMenuName = menuList[index];

    // 로그로 현재 선택된 메뉴 확인
    console.log(`메뉴 변경: ${currentMenuName} (인덱스: ${index})`);

    // 일독 타입별 첫 번째 탭 처리
    if (planData && index === 0) {
      switch (planData.planType) {
        case 'full_bible':
          console.log('성경 일독 탭 선택됨');
          break;
        case 'old_testament':
          console.log('구약 일독 탭 선택됨');
          break;
        case 'new_testament':
          console.log('신약 일독 탭 선택됨');
          break;
        case 'pentateuch':
          console.log('모세오경 일독 탭 선택됨');
          break;
        case 'psalms':
          console.log('시편 일독 탭 선택됨');
          break;
      }
    }
  }, [menuList, planData]);

  // 데이터 업데이트 함수
  const handleChangeUpdateData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 읽기 데이터 업데이트
      await loadReadingState();

      // 일독 데이터 새로고침
      updateMenuAndData();

      // 강제 업데이트 키 변경
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

  // 🔥 직접 초기화 함수 (resetAllData 의존하지 않음)
  const handleDirectReset = useCallback(async () => {
    try {
      console.log('=== ReadingBibleScreen 직접 초기화 시작 ===');

      // 로딩 상태 표시
      Toast.show({
        type: 'info',
        text1: '초기화 중...',
        text2: '잠시만 기다려주세요',
        autoHide: false
      });

      // 1. MMKV 스토리지 정리
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

      // 2. SQLite 정리
      try {
        const deleteSql = 'DELETE FROM reading_table';
        await fetchSql(bibleSetting, deleteSql, []);
        console.log('SQLite reading_table 삭제 완료');
      } catch (sqlError) {
        console.error('SQLite 삭제 오류:', sqlError);
      }

      // 3. 로컬 상태 초기화
      setPlanData(null);
      setMenuList(["구약", "신약", "설정"]);
      setMenuIndex(2);
      setForceUpdateKey(prev => prev + 1);

      // 4. 데이터 새로고침
      await loadReadingState();
      updateMenuAndData();

      // 5. 성공 메시지
      setTimeout(() => {
        Toast.hide();
        Toast.show({
          type: 'success',
          text1: '초기화 완료',
          text2: '일독 계획이 초기화되었습니다',
          visibilityTime: 3000
        });
      }, 1000);

      console.log('=== ReadingBibleScreen 직접 초기화 완료 ===');
      return true;

    } catch (error) {
      console.error('ReadingBibleScreen 초기화 오류:', error);

      setTimeout(() => {
        Toast.hide();
        Toast.show({
          type: 'warning',
          text1: '부분 초기화 완료',
          text2: '일부 데이터는 초기화되었습니다',
          visibilityTime: 3000
        });
      }, 1000);

      return false;
    }
  }, [loadReadingState, updateMenuAndData]);

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

    // 🔥 수정: handleDirectReset 사용
    const handleResetPlan = () => {
      Alert.alert(
          '일독 초기화',
          '현재 일독 계획을 초기화하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '초기화',
              style: 'destructive',
              onPress: handleDirectReset // 🔥 직접 초기화 함수 사용
            }
          ]
      );
    };

    return (
        <ScrollView style={{ backgroundColor: color.white, flex: 1 }}>
          {/* 진행률 카드 */}
          <Box bg="white" mx={4} mt={4} p={4} borderRadius="md" shadow={1}>
            <VStack space={3}>
              <Text fontSize="18" fontWeight="600" color="#333">
                📊 일독 진행 현황
              </Text>

              {/* 진행률 바 */}
              <Box>
                <HStack justifyContent="space-between" mb={2}>
                  <Text fontSize="14" color="#666">
                    진행률
                  </Text>
                  <Text fontSize="14" fontWeight="600" color={getStatusColor(progress.progressPercentage)}>
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

              {/* 통계 정보 */}
              <HStack justifyContent="space-around" pt={2}>
                <VStack alignItems="center">
                  <Text fontSize="20" fontWeight="600" color="#37C4B9">
                    {progress.completedChapters}
                  </Text>
                  <Text fontSize="12" color="#666">
                    읽은 장
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="20" fontWeight="600" color="#666">
                    {progress.totalChapters}
                  </Text>
                  <Text fontSize="12" color="#666">
                    전체 장
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="20" fontWeight="600" color="#FF9800">
                    {getDaysRemaining()}
                  </Text>
                  <Text fontSize="12" color="#666">
                    남은 일수
                  </Text>
                </VStack>
              </HStack>

              {/* 놓친 장수 표시 */}
              {missedCount > 0 && (
                  <Box bg="#FFEBEE" p={3} borderRadius="md" mt={2}>
                    <HStack alignItems="center" space={2}>
                      <Text fontSize="16">⚠️</Text>
                      <Text fontSize="14" color="#C62828">
                        놓친 장: {missedCount}개
                      </Text>
                    </HStack>
                  </Box>
              )}
            </VStack>
          </Box>

          {/* 일독 정보 카드 */}
          <Box bg="white" mx={4} mt={4} p={4} borderRadius="md" shadow={1}>
            <VStack space={3}>
              <Text fontSize="18" fontWeight="600" color="#333">
                📖 일독 정보
              </Text>

              <VStack space={2}>
                <HStack justifyContent="space-between">
                  <Text fontSize="14" color="#666">계획명</Text>
                  <Text fontSize="14" fontWeight="500">{planData.planName}</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="14" color="#666">시작일</Text>
                  <Text fontSize="14" fontWeight="500">{formatDate(planData.startDate)}</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="14" color="#666">목표일</Text>
                  <Text fontSize="14" fontWeight="500">{formatDate(planData.targetDate)}</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="14" color="#666">하루 분량</Text>
                  <Text fontSize="14" fontWeight="500">{planData.chaptersPerDay}장</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="14" color="#666">예상 시간</Text>
                  <Text fontSize="14" fontWeight="500">{planData.minutesPerDay}분</Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          {/* 액션 버튼들 */}
          <VStack space={3} mx={4} mt={4} mb={6}>
            <Button
                onPress={navigateToProgress}
                bg="#37C4B9"
                _pressed={{ bg: "#2BA89E" }}
                borderRadius="md"
                py={3}
            >
              <Text color="white" fontSize="16" fontWeight="600">
                📈 상세 진도 보기
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
              <Text color="#FF5722" fontSize="16" fontWeight="600">
                🔄 일독 계획 초기화
              </Text>
            </Button>
          </VStack>
        </ScrollView>
    );
  }, [planData, color.white, navigateToProgress, handleDirectReset]);

  // 일독 타입 이름 변환 함수
  const getPlanTypeName = (planType: string): string => {
    switch (planType) {
      case 'full_bible': return '성경';
      case 'old_testament': return '구약';
      case 'new_testament': return '신약';
      case 'pentateuch': return '모세오경';
      case 'psalms': return '시편';
      default: return '성경';
    }
  };

  // 메뉴에 따른 컴포넌트 렌더링
  const renderContent = useCallback(() => {
    if (isLoading) {
      return (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text>로딩 중...</Text>
          </Box>
      );
    }

    const currentMenuName = safeMenuList[menuIndex];

    // 설정 탭
    if (currentMenuName === "설정") {
      return <SettingSidePage
          key={`setting-${forceUpdateKey}`}
          readState={mark}
          onTrigger={handleChangeUpdateData}
      />;
    }

    // 진도 탭
    if (currentMenuName === "진도") {
      return <ProgressView key={`progress-${forceUpdateKey}`} />;
    }

    // 일독이 있는 경우 - 각 타입별 컨텐츠 렌더링
    if (planData && menuIndex === 0) {
      const progressIndicator = (
          <Box bg="#E8F8F7" p={4} mx={4} mt={4} borderRadius="md">
            <VStack alignItems="center" space={2}>
              <Text fontSize="16" fontWeight="600" color="#37C4B9">
                📖 {getPlanTypeName(planData.planType)} 일독 진행중
              </Text>
              <Text fontSize="12" color="#666" textAlign="center">
                하루 {planData.chaptersPerDay}장씩 • 예상시간 {planData.minutesPerDay}분
              </Text>
            </VStack>
          </Box>
      );

      switch (planData.planType) {
        case 'full_bible':
          // 성경 일독: 구약 + 신약 모두 표시
          return (
              <ScrollView
                  key={`full-bible-${forceUpdateKey}-${mark?.length || 0}`}
                  style={{ backgroundColor: color.white }}
              >
                {progressIndicator}

                {/* 구약 섹션 */}
                <Box>
                  {isFocused && mark && (
                      <Old
                          key={`plan-old-${forceUpdateKey}-${mark?.length || 0}`}
                          readState={mark}
                          menuIndex={menuIndex}
                      />
                  )}
                </Box>

                {/* 신약 섹션 */}
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
          // 구약 일독
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
          // 신약 일독
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
          // 모세오경 일독 (창세기~신명기만 표시)
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
                        filterBooks={[1, 2, 3, 4, 5]} // 창세기(1)~신명기(5)만
                    />
                )}
              </ScrollView>
          );

        case 'psalms':
          // 시편 일독 (시편만 표시)
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
                        filterBooks={[19]} // 시편(19)만
                    />
                )}
              </ScrollView>
          );

        default:
          return null;
      }
    }

    // 일독이 없는 경우 - 기본 구약/신약
    if (!planData) {
      if (menuIndex === 0) {
        return isFocused && mark && (
            <Old
                key={`old-${forceUpdateKey}-${mark?.length || 0}`}
                readState={mark}
                menuIndex={menuIndex}
            />
        );
      } else if (menuIndex === 1) {
        return isFocused && mark && (
            <New
                key={`new-${forceUpdateKey}-${mark?.length || 0}`}
                readState={mark}
                menuIndex={menuIndex}
            />
        );
      }
    }

    return null;
  }, [planData, safeMenuList, menuIndex, forceUpdateKey, isFocused, mark, color.white, ProgressView, isLoading, handleChangeUpdateData]);

  // 로딩 상태일 때의 처리
  if (isLoading) {
    return (
        <View style={{ flex: 1, backgroundColor: color.white }}>
          <ReadingHeaderLayout
              title="성경일독"
              list={safeMenuList}
              menuIndex={Math.min(menuIndex, safeMenuList.length - 1)}
              onMenuChange={handleChangeMenu}
          />
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text>로딩 중...</Text>
          </Box>
          <FooterLayout />
        </View>
    );
  }

  return (
      <View style={{ flex: 1, backgroundColor: color.white }}>
        <ReadingHeaderLayout
            title="성경일독"
            list={safeMenuList}
            menuIndex={Math.min(menuIndex, safeMenuList.length - 1)}
            onMenuChange={handleChangeMenu}
        />

        {renderContent()}

        {/* 광고 배너 */}
        {Platform.OS === 'ios' ? (
            <></>
        ) : (
            <View style={{ paddingVertical: 10 }}>
              <BannerAdMain />
            </View>
        )}

        <FooterLayout />
      </View>
  );
}