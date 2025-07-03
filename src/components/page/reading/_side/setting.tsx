import { Box, Button, HStack, Text, VStack, Actionsheet, useDisclose, Badge } from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../../hooks';
import Calender from '../../../section/calendar';

import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { bibleSetting, fetchSql } from '../../../../utils';
import { defaultStorage } from '../../../../utils/mmkv';
import {
  loadBiblePlanData,
  saveBiblePlanData,
  deleteBiblePlanData,
  calculateMissedChapters,
  formatDate,
  calculateProgress
} from '../../../../utils/biblePlanUtils';
import {
  DETAILED_BIBLE_PLAN_TYPES,
  calculateReadingPlan,
  type BiblePlanTypeDetail
} from '../../../../utils/biblePlanCalculator';
import {useBibleReading} from "../../../../utils/useBibleReading";
import {bibleSelectSlice, bibleTextSlice, illdocSelectSlice} from "../../../../provider/redux/slice";
import {store} from "../../../../provider/redux/store";

interface Props {
  readState: any;
  onTrigger: () => void;
}

export default function SettingSidePage({ readState, onTrigger }: Props) {
  const { color } = useBaseStyle();
  const [open, setOpen] = useState<number>(0);
  const { navigation } = useNativeNavigation();
  const mmkv = defaultStorage.getString('calender');

  // 바텀시트 상태 관리
  const { isOpen, onOpen, onClose } = useDisclose();

  // 성경일독 상태 관리
  const [planData, setPlanData] = useState<any>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<string>('');
  const [missedCount, setMissedCount] = useState(0);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  // ! 시작, 끝 날짜 분리
  const [calendarState, setCalenderState] = useState<{
    start: string;
    end: string;
  }>({
    start: dayjs(new Date()).format('YYYY년MM월DD일'),
    end: dayjs(new Date()).format('YYYY년MM월DD일')
  });

  const convertDate = (type: 'start' | 'end') => {
    const result: { [key: string]: string } = calendarState;
    return dayjs(
        result[type].replace('년', '-').replace('월', '-').replace('일', '')
    );
  };

  const s1Day = () => {
    const result = dayjs(convertDate('end')).diff(convertDate('start'), 'day');
    return result >= 0 ? result + 1 : 1;
  };

  const s2Day = () => {
    const nowDate = dayjs(new Date());
    const result = dayjs(nowDate).diff(convertDate('start'), 'day');
    return result >= 0 ? result + 1 : 1;
  };

  const lapseDif = () => {
    const result = (s2Day() / s1Day()) * 100;
    return result ? result.toFixed(1) : 0;
  };

  const sturdyDif = () => {
    if (planData) {
      const progress = calculateProgress(planData);
      return progress.progressPercentage.toFixed(1);
    }

    // 🆕 일독 계획이 없을 때 - readState를 정확히 계산
    if (!readState || !Array.isArray(readState)) {
      return "0";
    }

    // readState에서 실제 읽은 장 수 계산
    const readCount = readState.length;
    const totalChapters = 1189; // 성경 전체 장 수

    const result = (readCount / totalChapters) * 100;
    console.log(`Progress calculation: ${readCount} / ${totalChapters} = ${result.toFixed(1)}%`);

    return result ? result.toFixed(1) : "0";
  };

  // 🔥 날짜 선택 완료 및 유효성 확인 함수
  const isDatesCompleted = () => {
    const today = dayjs(new Date()).format('YYYY년MM월DD일');
    const startDate = calendarState.start;
    const endDate = calendarState.end;

    // 1. 시작일과 목표일이 모두 초기값(오늘)이 아닌 경우에만 기본 완료
    const basicCompleted = startDate !== today || endDate !== today;

    // 2. 목표일이 시작일보다 이후인지 확인
    const startDateObj = convertDate('start');
    const endDateObj = convertDate('end');
    const isEndDateAfterStart = endDateObj.isAfter(startDateObj) || endDateObj.isSame(startDateObj);

    // 두 조건 모두 만족해야 완료
    return basicCompleted && isEndDateAfterStart;
  };

  // 🔥 일독 설정하기 버튼 클릭 핸들러 (유효성 검사 강화)
  const handleSetupBibleReading = () => {
    const today = dayjs(new Date()).format('YYYY년MM월DD일');
    const startDate = calendarState.start;
    const endDate = calendarState.end;

    // 1. 기본 날짜 설정 확인
    if (startDate === today && endDate === today) {
      Toast.show({
        type: 'error',
        text1: '날짜 설정이 필요합니다',
        text2: '시작일과 목표일을 모두 선택해주세요'
      });
      return;
    }

    // 2. 목표일이 시작일보다 이전인지 확인
    const startDateObj = convertDate('start');
    const endDateObj = convertDate('end');

    if (endDateObj.isBefore(startDateObj)) {
      Toast.show({
        type: 'error',
        text1: '목표일을 다시 설정해주세요',
        text2: '목표일은 시작일 이후로 설정해주세요'
      });
      return;
    }

    onOpen(); // 바텀시트 열기
  };

  // 🔥 일독 설정하기 버튼 렌더링 함수 (항상 같은 색상, 항상 클릭 가능)
  const renderSetupButton = () => {
    const datesCompleted = isDatesCompleted();
    return (
        <Button
            w="100%"
            h={55}
            bg={datesCompleted ? "#37C4B9" : "#ACACAC"} // 🔥 조건부 색상 적용
            borderRadius="md"
            mb={3}
            _pressed={{
              bg: datesCompleted ? "#2BA89E" : "#999999" // 🔥 pressed 상태도 조건부 적용
            }}
            onPress={handleSetupBibleReading} // 🔥 항상 클릭 가능하지만 내부에서 조건 체크
        >
          <Text
              color={color.white} // 🔥 텍스트는 항상 흰색 유지
              fontSize={16}
              fontWeight={500}
          >
            일독 설정하기
          </Text>
        </Button>
    );
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 상태 정리
    const initializeComponent = () => {
      loadExistingPlan();

      if (mmkv) {
        const result = JSON.parse(mmkv);
        setCalenderState({
          start: dayjs(result.start ?? new Date()).format('YYYY년MM월DD일'),
          end: dayjs(result.end ?? new Date()).format('YYYY년MM월DD일')
        });
      } else {
        // MMKV 데이터가 없으면 오늘 날짜로 초기화
        const today = dayjs(new Date()).format('YYYY년MM월DD일');
        setCalenderState({
          start: today,
          end: today
        });
      }
    };

    initializeComponent();
  }, []);

  useEffect(() => {
    // 선택된 타입과 날짜가 있을 때 계산 수행
    if (selectedPlanType && calendarState.start && calendarState.end) {
      try {
        const startDate = convertDate('start').toDate();
        const endDate = convertDate('end').toDate();

        if (endDate > startDate) {
          const calculation = calculateReadingPlan(selectedPlanType, startDate, endDate);
          setCalculationResult(calculation);
        }
      } catch (error) {
        console.log('계산 오류:', error);
        setCalculationResult(null);
      }
    }
  }, [selectedPlanType, calendarState]);

  const loadExistingPlan = () => {
    const existingPlan = loadBiblePlanData();
    if (existingPlan) {
      setPlanData(existingPlan);
      setMissedCount(calculateMissedChapters(existingPlan));

      setCalenderState({
        start: dayjs(existingPlan.startDate).format('YYYY년MM월DD일'),
        end: dayjs(existingPlan.targetDate).format('YYYY년MM월DD일')
      });
    }
  };

  const onDateChange = (date: string) => {
    if (open === 1) {
      // 🔥 시작일 선택: 제한 없이 자유롭게 선택 가능
      const selectedStartDate = dayjs(date);

      // 시작일 설정 (과거, 현재, 미래 모든 날짜 허용)
      setCalenderState((pre) => ({
        ...pre,
        start: selectedStartDate.format('YYYY년MM월DD일')
      }));

      // 🆕 시작일 설정 후 목표일 설정 안내 메시지
      Toast.show({
        type: 'info',
        text1: '목표일을 설정해주세요',
        text2: '시작일이 설정되었습니다. 이제 목표일을 선택해주세요'
      });

      // 로컬 스토리지 업데이트
      if (mmkv) {
        const { end } = JSON.parse(mmkv);
        const result = Object.assign({
          start: new Date(date),
          ...(end && { end })
        });
        defaultStorage.set('calender', JSON.stringify(result));
      } else {
        const result = Object.assign({
          start: new Date(date)
        });
        defaultStorage.set('calender', JSON.stringify(result));
      }
    } else {
      // 🔥 목표일 선택 로직 수정
      const selectedEndDate = dayjs(date);
      const currentStartDate = convertDate('start');

      // 1. 오늘 이전 날짜 체크 (기존 로직 유지)
      const beforeToday = selectedEndDate.isBefore(
          dayjs(new Date()).format('YYYY-MM-DD')
      );

      if (beforeToday) {
        Toast.show({
          type: 'error',
          text1: '목표일은 오늘 이후여야 합니다'
        });
        return;
      }

      // 🆕 2. 시작일보다 빠른 날짜 체크
      const beforeStartDate = selectedEndDate.isBefore(currentStartDate);

      if (beforeStartDate) {
        Toast.show({
          type: 'error',
          text1: '목표일은 시작일 이후로 설정해주세요'
        });
        return;
      }

      setCalenderState((pre) => ({
        ...pre,
        end: dayjs(date).format('YYYY년MM월DD일')
      }));

      // 🆕 종료일 설정 후 일독 설정하기 안내 메시지
      Toast.show({
        type: 'success',
        text1: '일독 설정하기를 눌러주세요',
        text2: '목표일이 설정되었습니다. 이제 일독 설정하기 버튼을 눌러주세요'
      });

      if (mmkv) {
        const { start } = JSON.parse(mmkv);
        const result = Object.assign({
          ...(start && { start }),
          end: new Date(date)
        });
        defaultStorage.set('calender', JSON.stringify(result));
      } else {
        const result = Object.assign({
          end: new Date(date)
        });
        defaultStorage.set('calender', JSON.stringify(result));
      }
    }
  };

  const onNavigate = () => {
    if (planData) {
      // 현재 화면에서 처리 (별도 화면 이동 없음)
      return;
    } else {
      // 기존 진도 화면으로 이동
      navigation.navigate('ProgressScreen', {
        parcent: s2Day(),
        total: s1Day()
      });
    }
  };

  // 🔥 완전히 새로운 초기화 로직 (resetAllData 의존하지 않음)
  const onReset = () => {
    Alert.alert(
        '설정 초기화',
        planData
            ? '일독 설정과 읽기 기록을 모두 초기화하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.'
            : '읽기 기록을 초기화하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '초기화',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('=== 설정 초기화 프로세스 시작 ===');

                // 로딩 상태 표시
                Toast.show({
                  type: 'info',
                  text1: '초기화 중...',
                  text2: '잠시만 기다려주세요',
                  autoHide: false
                });

                // 🔥 1. 직접 초기화 작업 수행 (resetAllData 의존하지 않음)
                console.log('🔄 직접 초기화 작업 시작');

                // 1-1. MMKV 스토리지 완전 정리
                try {
                  const allKeys = defaultStorage.getAllKeys();
                  console.log('삭제 전 MMKV 키들:', allKeys);

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

                  console.log('MMKV 정리 완료');
                } catch (mmkvError) {
                  console.error('MMKV 정리 오류:', mmkvError);
                }

                // 1-2. SQLite reading_table 완전 삭제
                try {
                  const deleteSql = 'DELETE FROM reading_table';
                  await fetchSql(bibleSetting, deleteSql, []);
                  console.log('SQLite reading_table 데이터 삭제 완료');

                  // 삭제 확인
                  const checkSql = 'SELECT COUNT(*) as count FROM reading_table';
                  const result = await fetchSql(bibleSetting, checkSql, []);
                  console.log('삭제 후 reading_table 행 수:', result?.count || 0);
                } catch (sqlError) {
                  console.error('SQLite 삭제 오류:', sqlError);
                }

                // 🔥 2. Redux 상태 초기화
                try {
                  if (typeof store !== 'undefined' && store.dispatch) {
                    store.dispatch(bibleSelectSlice.actions.reset());
                    store.dispatch(illdocSelectSlice.actions.reset());
                    store.dispatch(bibleTextSlice.actions.reset());
                    console.log('Redux 상태 초기화 완료');
                  }
                } catch (reduxError) {
                  console.error('Redux 초기화 오류 (무시 가능):', reduxError);
                }

                // 🔥 3. 로컬 컴포넌트 상태 초기화
                try {
                  setPlanData(null);
                  setMissedCount(0);
                  setSelectedPlanType('');
                  setCalculationResult(null);

                  // 캘린더 상태를 오늘 날짜로 초기화
                  const today = dayjs(new Date()).format('YYYY년MM월DD일');
                  setCalenderState({
                    start: today,
                    end: today
                  });

                  console.log('로컬 상태 초기화 완료');
                } catch (stateError) {
                  console.error('로컬 상태 초기화 오류:', stateError);
                }

                // 🔥 4. 바텀시트 닫기
                try {
                  if (isOpen && typeof onClose === 'function') {
                    onClose();
                  }
                } catch (closeError) {
                  console.warn('바텀시트 닫기 오류 (무시 가능):', closeError);
                }

                // 🔥 5. 상위 컴포넌트 새로고침 (강화된 버전)
                const triggerRefresh = () => {
                  try {
                    if (typeof onTrigger === 'function') {
                      onTrigger();
                    }
                  } catch (triggerError) {
                    console.warn('새로고침 트리거 오류:', triggerError);
                  }
                };

                // 즉시 실행
                console.log('🔄 Setting: Triggering immediate refresh');
                triggerRefresh();

                // 다중 지연 실행으로 확실한 전파
                const delays = [50, 100, 200, 300, 500, 800, 1200, 2000, 3000];
                delays.forEach((delay, index) => {
                  setTimeout(() => {
                    console.log(`🔄 Setting: Triggering refresh ${index + 1} (${delay}ms 후)`);
                    triggerRefresh();
                  }, delay);
                });

                // 🔥 6. 성공 메시지 표시
                setTimeout(() => {
                  Toast.hide();
                  Toast.show({
                    type: 'success',
                    text1: '초기화 완료',
                    text2: '모든 읽기 기록이 초기화되었습니다',
                    visibilityTime: 3000
                  });
                }, 1500);

                console.log('=== 설정 초기화 프로세스 완료 ===');

              } catch (error) {
                console.error('초기화 중 최종 오류 발생:', error);

                // 오류가 발생해도 부분 성공일 수 있으므로 일부 작업은 계속 진행
                setTimeout(() => {
                  Toast.hide();
                  Toast.show({
                    type: 'error', // 🔥 'warning'을 'error'로 변경
                    text1: '부분 초기화 완료',
                    text2: '일부 데이터는 초기화되었습니다. 앱을 재시작하면 완전히 정리됩니다.',
                    visibilityTime: 4000
                  });
                }, 1000);

                // 그래도 새로고침은 시도
                try {
                  if (typeof onTrigger === 'function') {
                    onTrigger();
                  }
                } catch (triggerError) {
                  console.warn('최종 새로고침 트리거 실패:', triggerError);
                }
              }
            }
          }
        ]
    );
  };

  const handleSelectBibleCategory = (category: string) => {
    const selectedType = DETAILED_BIBLE_PLAN_TYPES.find(type => type.name === category);
    if (selectedType) {
      setSelectedPlanType(selectedType.id);
    }
    console.log("선택된 카테고리:", category);
  };

  const handleCompletePlanSetup = () => {
    if (!selectedPlanType) {
      Toast.show({
        type: 'error',
        text1: '성경일독 타입을 선택해주세요'
      });
      return;
    }

    if (!calculationResult) {
      Toast.show({
        type: 'error',
        text1: '올바른 시작일과 목표일을 설정해주세요'
      });
      return;
    }

    const selectedPlan = DETAILED_BIBLE_PLAN_TYPES.find(plan => plan.id === selectedPlanType);
    if (!selectedPlan) return;

    const newPlanData = {
      planType: selectedPlanType,
      planName: selectedPlan.name,
      startDate: convertDate('start').toISOString(),
      targetDate: convertDate('end').toISOString(),
      totalDays: calculationResult.totalDays,
      chaptersPerDay: calculationResult.chaptersPerDay,
      minutesPerDay: calculationResult.minutesPerDay,
      totalChapters: selectedPlan.totalChapters,
      currentDay: 1,
      readChapters: [],
      createdAt: new Date().toISOString(),
      dailySchedule: calculationResult.dailySchedule,
      weeklyBreakdown: calculationResult.weeklyBreakdown
    };

    // 데이터 저장
    saveBiblePlanData(newPlanData);

    // 로컬 상태 업데이트
    setPlanData(newPlanData);
    setSelectedPlanType('');
    setCalculationResult(null);
    onClose();

    // 성공 메시지
    Toast.show({
      type: 'success',
      text1: `${selectedPlan.name} 일독이 설정되었습니다`,
      text2: `하루 ${calculationResult.chaptersPerDay}장씩 ${calculationResult.totalDays}일간 진행`
    });

    // 상위 컴포넌트에 즉시 변경사항 알림
    onTrigger();
  };

  return (
      <>
        <ScrollView style={{ backgroundColor: color.white }}>
          <Calender isOpen={open} onClose={setOpen} onChange={onDateChange} />
          <Box bg={color.white}>
            {/* 읽기 현황 섹션 */}
            <Box w="100%" h={38} bg="#F0F0F0" justifyContent="center">
            </Box>

            {/* 진도 보기 버튼이 있는 행 */}
            <HStack
                h={70}
                alignItems="center"
                justifyContent="space-between"
                px={4}
                borderBottomColor="#F0F0F0"
                borderBottomWidth={1}
            >
              <Text fontSize={20} fontWeight={600}>
                {planData ? '일독 진행 현황' : '읽기 현황'}
              </Text>
              <Button
                  w={120}
                  h={45}
                  bg="#37C4B9"
                  borderRadius="md"
                  _pressed={{
                    bg: "#2BA89E"
                  }}
                  onPress={onNavigate}
              >
                <Text color={color.white} fontWeight={500}>
                  {planData ? '일독 보기' : '진도 보기'}
                </Text>
              </Button>
            </HStack>

            <Box w="100%" h={38} bg="#F0F0F0" justifyContent="center">
            </Box>

            {/* 시작일 섹션 */}
            <HStack
                h={70}
                alignItems="center"
                justifyContent="space-between"
                px={4}
                borderBottomColor="#F0F0F0"
                borderBottomWidth={1}
            >
              <VStack>
                <Text fontSize={16} fontWeight={600}>시작일</Text>
                <Text fontSize={14} color="#777777" mt={1}>
                  {calendarState.start}
                </Text>
              </VStack>
              <Button
                  w={120}
                  h={45}
                  bg={planData ? "#CCCCCC" : "#37C4B9"}
                  borderRadius="md"
                  _pressed={{
                    bg: planData ? "#CCCCCC" : "#2BA89E"
                  }}
                  onPress={() => planData ? null : setOpen(1)}
                  isDisabled={!!planData}
              >
                <Text color={color.white} fontWeight={500}>시작일 선택</Text>
              </Button>
            </HStack>

            {/* 목표일 섹션 */}
            <HStack
                h={70}
                alignItems="center"
                justifyContent="space-between"
                px={4}
                borderBottomColor="#F0F0F0"
                borderBottomWidth={1}
            >
              <VStack>
                <Text fontSize={16} fontWeight={600}>종료일</Text>
                <Text fontSize={14} color="#777777" mt={1}>
                  {calendarState.end}
                </Text>
              </VStack>
              <Button
                  w={120}
                  h={45}
                  bg={planData ? "#CCCCCC" : "#37C4B9"}
                  borderRadius="md"
                  _pressed={{
                    bg: planData ? "#CCCCCC" : "#2BA89E"
                  }}
                  onPress={() => planData ? null : setOpen(2)}
                  isDisabled={!!planData}
              >
                <Text color={color.white} fontWeight={500}>종료일 선택</Text>
              </Button>
            </HStack>

            {/* 계산 결과 표시 */}
            {!planData && selectedPlanType && calculationResult && (
                <Box bg="#F0F9FF" p={4} mx={4} mt={4} borderRadius="md">
                  <Text fontSize="16" color="#333333" textAlign="center" mb="2" fontWeight="600">
                    📋 일독 계획 요약
                  </Text>
                  <VStack space={2}>
                    <HStack justifyContent="space-between">
                      <Text fontSize="14" color="#666">전체 기간:</Text>
                      <Text fontSize="14" color="#333333" fontWeight="500">
                        {calculationResult.totalDays}일
                      </Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="14" color="#666">하루 평균:</Text>
                      <Text fontSize="14" color="#333333" fontWeight="500">
                        {calculationResult.chaptersPerDay}장
                      </Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="14" color="#666">예상 시간:</Text>
                      <Text fontSize="14" color="#333333" fontWeight="500">
                        {calculationResult.minutesPerDay}분/일
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
            )}

            {/* 하단 버튼들 */}
            <View
                style={{
                  padding: 16,
                  marginTop: 40,
                  marginBottom: 20
                }}
            >
              {!planData ? (
                  // 🔥 수정된 일독 설정하기 버튼 (날짜 완료 여부에 따라 활성화)
                  renderSetupButton()
              ) : (
                  <Button
                      w="100%"
                      h={55}
                      bg="#4CAF50"
                      borderRadius="md"
                      mb={3}
                      _pressed={{
                        bg: "#45A049"
                      }}
                      onPress={() => {
                        // 현재 화면에서 첫 번째 탭으로 이동
                        onTrigger();
                      }}
                  >
                    <Text color={color.white} fontSize={16} fontWeight={500}>일독 계속하기</Text>
                  </Button>
              )}

              <Button
                  w="100%"
                  h={55}
                  bg="white"
                  borderWidth={1}
                  borderColor="#37C4B9"
                  borderRadius="md"
                  _pressed={{
                    bg: "#F5F5F5"
                  }}
                  onPress={onReset}
              >
                <Text color="#37C4B9" fontSize={16} fontWeight={500}>설정초기화</Text>
              </Button>
            </View>
          </Box>
        </ScrollView>

        {/* 바텀시트 컴포넌트 */}
        <Actionsheet isOpen={isOpen} onClose={onClose}>
          <Actionsheet.Content borderTopRadius="15" bg="white">
            <Box w="100%" h={60} px={4} justifyContent="center" alignItems="center" borderBottomWidth={1} borderBottomColor="#F0F0F0">
              <Text fontSize={18} fontWeight="600" color="#333333">
                성경 일독 선택
              </Text>
              {selectedPlanType && (
                  <Text fontSize={14} color="#37C4B9" mt={1}>
                    {DETAILED_BIBLE_PLAN_TYPES.find(t => t.id === selectedPlanType)?.name} 선택됨
                  </Text>
              )}
            </Box>

            <View style={{ width: '100%', padding: 16 }}>
              {/* 카테고리 버튼들 - 3x2 그리드 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {DETAILED_BIBLE_PLAN_TYPES.map((planType) => (
                    <Button
                        key={planType.id}
                        w="48%"
                        h={65}
                        mb={3}
                        bg={selectedPlanType === planType.id ? "#37C4B9" : "#F8F9FA"}
                        borderRadius="md"
                        borderWidth={selectedPlanType === planType.id ? 0 : 1}
                        borderColor="#E0E0E0"
                        _pressed={{
                          bg: selectedPlanType === planType.id ? "#2BA89E" : "#F0F0F0"
                        }}
                        onPress={() => handleSelectBibleCategory(planType.name)}
                    >
                      <HStack w="100%" justifyContent="space-between" alignItems="center" px={4}>
                        <VStack alignItems="flex-start" space={1}>
                          <Text
                              color={selectedPlanType === planType.id ? "white" : "#333333"}
                              fontWeight="600"
                              fontSize="16"
                          >
                            {planType.name}
                          </Text>
                          <Text
                              color={selectedPlanType === planType.id ? "#E8F8F7" : "#666666"}
                              fontSize="12"
                          >
                            {planType.totalChapters}장
                          </Text>
                        </VStack>
                      </HStack>
                    </Button>
                ))}
              </View>

              {/* 선택된 타입의 상세 정보 */}
              {selectedPlanType && (
                  <Box bg="#F0F9FF" p={3} borderRadius="md" mt={2}>
                    <Text fontSize={20} color="#666" textAlign="center">
                      {DETAILED_BIBLE_PLAN_TYPES.find(t => t.id === selectedPlanType)?.description}
                    </Text>

                    {/* 실시간 계산 결과 */}
                    {calculationResult && (
                        <VStack mt={2} pt={2} borderTopWidth={1} borderTopColor="#37C4B9">
                          <Text fontSize={22} color="#37C4B9" textAlign="center" fontWeight="600">
                            🎯 계산 결과
                          </Text>
                          <HStack justifyContent="space-between" mt={1}>
                            <Text fontSize={20} color="#666">하루 목표:</Text>
                            <Text fontSize={20} color="#37C4B9" fontWeight="500">
                              {calculationResult.chaptersPerDay}장 / {calculationResult.minutesPerDay}분
                            </Text>
                          </HStack>
                          <HStack justifyContent="space-between">
                            <Text fontSize={20} color="#666">총 기간:</Text>
                            <Text fontSize={20} color="#37C4B9" fontWeight="500">
                              {calculationResult.totalDays}일
                            </Text>
                          </HStack>
                        </VStack>
                    )}
                  </Box>
              )}
            </View>

            <Box w="100%" p={4}>
              <Button
                  w="100%"
                  h={55}
                  bg={selectedPlanType && calculationResult ? "#37C4B9" : "#CCCCCC"}
                  borderRadius="md"
                  _pressed={{ bg: selectedPlanType && calculationResult ? "#2BA89E" : "#CCCCCC" }}
                  onPress={handleCompletePlanSetup}
                  isDisabled={!selectedPlanType || !calculationResult}
              >
                <Text color="white" fontSize={16} fontWeight={500}>
                  {calculationResult ?
                      `일독 설정 완료 (${calculationResult.totalDays}일간)` :
                      "일독 설정 완료"
                  }
                </Text>
              </Button>
            </Box>
          </Actionsheet.Content>
        </Actionsheet>
      </>
  );
}