// src/components/page/reading/index.tsx - 완전 수정된 전체 코드

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
  deleteBiblePlanData
} from "../../../utils/biblePlanUtils";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { Alert } from "react-native";
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { useBibleReading } from "../../../utils/useBibleReading";
import { defaultStorage } from "../../../utils/mmkv";
import Tabs from "../../layout/tab/tabs"; // Tabs 컴포넌트 import
import BackHeaderLayout from "../../layout/header/backHeader";
import ProgressScreen from "../progs"; // 기본 헤더로 변경

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

  // 🔥 수정: resetAllData 제거하고 필요한 함수만 사용
  const {
    registerGlobalRefreshCallback,
    unregisterGlobalRefreshCallback
    // resetAllData 제거
  } = useBibleReading(mark);

  // 안전한 메뉴 리스트 확보
  const safeMenuList = menuList && menuList.length > 0 ? menuList : ["구약", "신약", "설정"];

  // 메뉴 변경 핸들러 - Tabs 컴포넌트용으로 수정
  const handleMenuChange = useCallback((index: number) => {
    setMenuIndex(index);
    const currentMenuName = safeMenuList[index];

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
  }, [safeMenuList, planData]);

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
        setMenuIndex(0); // 첫 번째 탭으로 이동

        console.log('일독 메뉴 업데이트:', newMenuList);
      } else {
        setPlanData(null);
        setMenuList(["구약", "신약", "설정"]);
        setMenuIndex(2); // 설정 탭으로 이동
        console.log('일독 없음 - 기본 메뉴 설정');
      }
    } catch (error) {
      console.error('일독 데이터 업데이트 오류:', error);
      setPlanData(null);
      setMenuList(["구약", "신약", "설정"]);
      setMenuIndex(2);
    }
  }, []);

  // 📚 읽기 상태 로드 함수
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

  // 컴포넌트 포커스 시 데이터 로드
  useFocusEffect(
      useCallback(() => {
        console.log('🎯 ReadingBibleScreen 포커스 - 데이터 로드 시작');

        // 일독 데이터부터 로드 (메뉴 결정)
        updateMenuAndData();

        // 읽기 상태 로드
        loadReadingState();

        return () => {
          console.log('🎯 ReadingBibleScreen 포커스 해제');
        };
      }, [updateMenuAndData, loadReadingState])
  );

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

      // 5. 성공 토스트
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
      return <ProgressScreen key={`progress-${forceUpdateKey}`} />;
    }

    // 일독이 있는 경우 - 각 타입별 컨텐츠 렌더링
    if (planData && menuIndex === 0) {
      const progressIndicator = (
          <Box bg="#E8F8F7" p={4} mx={4} mt={4} borderRadius="md">
            <VStack alignItems="center" space={2}>
              <Text fontSize="20" fontWeight="600" color="#37C4B9">
                📖 {getPlanTypeName(planData.planType)} 일독 진행중
              </Text>
              <Text fontSize="16" color="#666" textAlign="center">
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
          return (
              <Box flex={1} justifyContent="center" alignItems="center">
                <Text>알 수 없는 일독 타입입니다.</Text>
              </Box>
          );
      }
    }

    // 기본 컨텐츠 (일독이 없는 경우)
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
  }, [isLoading, safeMenuList, menuIndex, mark, planData, forceUpdateKey, color.white, handleChangeUpdateData, isFocused]);

  return (
      <View style={styles.container}>
        {/* 마이페이지 스타일의 헤더로 변경 */}
        <BackHeaderLayout title="성경일독" />

        {/* 마이페이지와 동일한 Tabs 컴포넌트 사용 */}
        <Tabs
            menus={safeMenuList}
            onSelectHandler={handleMenuChange}
            selectedIndex={menuIndex}
        />

        {/* 탭 컨텐츠 */}
        {renderContent()}

        {/* 기존 광고 */}
        <View style={styles.adContainer}>
          <BannerAdMain />
        </View>

        {/* 기존 Footer */}
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