// src/components/page/reading/_side/setting.tsx
// 🔥 기존 UI 완전히 그대로 유지, 로직만 시간 기반으로 수정

import { Box, Button, HStack, Text, VStack, Actionsheet, useDisclose, Badge } from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../../hooks';
import Calender from '../../../section/calendar';

import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {ScrollView, View, Alert, Image} from 'react-native';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { bibleSetting, fetchSql } from '../../../../utils';
import { defaultStorage } from '../../../../utils/mmkv';

// 🔥 기존 import들 그대로 유지하되, 내부적으로 시간 기반 함수 사용
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

// 🔥 시간 기반 시스템 import (내부적으로만 사용)
import {
  initializeBibleApp,
  getPlanPreview,
  createAndSaveBiblePlan,
  loadExistingBiblePlan,
  deleteBiblePlan,
  BiblePlanFormData
} from "../../../../utils/biblePlanIntegration";

interface Props {
  readState: any;
  onTrigger: () => void;
}

// 🆕 총기간 컨트롤 컴포넌트 (기존 UI 그대로 유지)
const DurationControlComponent = ({ startDate, endDate, onEndDateChange, planData }: any) => {
  // 문자열 날짜를 dayjs 객체로 변환
  const convertStringToDate = (dateString: string) => {
    const cleaned = dateString.replace(/년|월/g, '-').replace(/일/g, '');
    return dayjs(cleaned);
  };

  // 총 기간 계산
  const calculateTotalDays = () => {
    if (!startDate || !endDate) return 0;

    const start = convertStringToDate(startDate);
    const end = convertStringToDate(endDate);

    return end.diff(start, 'day') + 1; // 시작일 포함
  };

  // 종료일 조정
  const adjustEndDate = (direction: 'up' | 'down') => {
    if (!endDate || planData) return; // 기존 플랜이 있으면 수정 불가

    const currentEnd = convertStringToDate(endDate);
    const start = convertStringToDate(startDate);

    let newEndDate;
    if (direction === 'up') {
      newEndDate = currentEnd.add(1, 'day');
    } else {
      newEndDate = currentEnd.subtract(1, 'day');
    }

    // 시작일보다 이전으로 갈 수 없게 제한
    if (newEndDate.isBefore(start)) {
      return;
    }

    // 새로운 종료일을 원래 형태로 변환
    const formattedDate = newEndDate.format('YYYY년MM월DD일');
    onEndDateChange(formattedDate);
  };

  const totalDays = calculateTotalDays();

  // 종료일이 선택되었을 때만 렌더링
  if (!startDate || !endDate) {
    return null;
  }

  return (
      /* 이미지와 동일한 총기간 섹션 */
      <HStack
          h={70}
          alignItems="center"
          justifyContent="space-between"
          px={4}
          borderBottomColor="#F0F0F0"
          borderBottomWidth={1}
          bg="white"
      >
        <VStack>
          <Text fontSize={18} fontWeight={600}>총 기간</Text>
        </VStack>

        <HStack alignItems="center" space={3}>
          <Text fontSize={16} color="#37C4B9" fontWeight={600} mr={6}>
            {totalDays}일
          </Text>

          {/* 기간 조정 버튼들 - 기존 플랜이 없을 때만 활성화 */}
          <HStack space={1}>
            <Button
                w={18}
                h={22}
                bg="transparent"
                borderRadius="sm"
                p={0}
                onPress={() => !planData && adjustEndDate('up')}
                isDisabled={!!planData}
                _pressed={{ bg: "transparent" }}
                mr={6}
            >
              <Image source={require('../../../../assets/img/up.png')}/>
            </Button>

            <Button
                w={18}
                h={22}
                bg="transparent"
                borderRadius="sm"
                p={0}
                onPress={() => !planData && adjustEndDate('down')}
                isDisabled={!!planData}
                _pressed={{ bg: "transparent" }}
                mr={2}
            >
              <Image source={require('../../../../assets/img/down.png')}/>
            </Button>
          </HStack>
        </HStack>
      </HStack>
  );
};

export default function SettingSidePage({ readState, onTrigger }: Props) {
  const { color } = useBaseStyle();
  const [open, setOpen] = useState<number>(0);
  const { navigation } = useNativeNavigation();
  const mmkv = defaultStorage.getString('calender');

  // 바텀시트 상태 관리 (기존과 동일)
  const { isOpen, onOpen, onClose } = useDisclose();

  // 🔥 성경일독 상태 관리 (기존과 동일하지만 내부적으로 시간 기반)
  const [planData, setPlanData] = useState<any>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<string>('');
  const [missedCount, setMissedCount] = useState(0);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  // ! 시작, 끝 날짜 분리 - 초기값을 null로 설정 (기존과 동일)
  const [calendarState, setCalenderState] = useState<{
    start: string | null;
    end: string | null;
  }>({
    start: null,
    end: null
  });

  // 🔥 앱 초기화 (시간 기반 시스템)
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeBibleApp();
        console.log('✅ 시간 기반 시스템 초기화 완료');
      } catch (error) {
        console.error('❌ 시간 기반 시스템 초기화 실패:', error);
      }
    };
    initApp();
  }, []);

  // 기존 함수들 그대로 유지
  const convertDate = (type: 'start' | 'end') => {
    const result: { [key: string]: string | null } = calendarState;
    const dateString = result[type];

    if (!dateString) {
      return dayjs(new Date()); // null인 경우 오늘 날짜 반환
    }

    return dayjs(
        dateString.replace('년', '-').replace('월', '-').replace('일', '')
    );
  };

  const s1Day = () => {
    if (!calendarState.start || !calendarState.end) return 1;
    const result = dayjs(convertDate('end')).diff(convertDate('start'), 'day');
    return result >= 0 ? result + 1 : 1;
  };

  const s2Day = () => {
    if (!calendarState.start) return 1;
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

  // 🔥 날짜 선택 완료 및 유효성 확인 함수 (기존과 동일)
  const isDatesCompleted = () => {
    // 시작일과 종료일이 모두 선택되었는지 확인
    if (!calendarState.start || !calendarState.end) return false;

    // 목표일이 시작일보다 이후인지 확인
    const startDateObj = convertDate('start');
    const endDateObj = convertDate('end');
    const isEndDateAfterStart = endDateObj.isAfter(startDateObj) || endDateObj.isSame(startDateObj);

    return isEndDateAfterStart;
  };

  // 🔥 일독 설정하기 버튼 클릭 핸들러 (기존과 동일)
  const handleSetupBibleReading = () => {
    // 1. 기본 날짜 설정 확인
    if (!calendarState.start || !calendarState.end) {
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

  // 🔥 일독 설정하기 버튼 렌더링 함수 (기존과 동일)
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
              fontWeight={700}
          >
            일독 설정하기
          </Text>
        </Button>
    );
  };

  // 🆕 종료일 변경 핸들러 추가 (기존과 동일)
  const handleEndDateChange = (newEndDate: string) => {
    setCalenderState(prev => ({
      ...prev,
      end: newEndDate
    }));

    // 로컬 스토리지도 업데이트
    const convertStringToDate = (dateString: string) => {
      const cleaned = dateString.replace(/년|월/g, '-').replace(/일/g, '');
      return dayjs(cleaned);
    };

    if (mmkv) {
      const parsed = JSON.parse(mmkv);
      const result = Object.assign(parsed, {
        end: convertStringToDate(newEndDate).toDate()
      });
      defaultStorage.set('calender', JSON.stringify(result));
    } else {
      const result = {
        end: convertStringToDate(newEndDate).toDate()
      };
      defaultStorage.set('calender', JSON.stringify(result));
    }
  };

  // 🔥 초기화 (내부적으로 시간 기반 시스템 로드)
  useEffect(() => {
    // 컴포넌트 마운트 시 상태 정리
    const initializeComponent = () => {
      loadExistingPlan();

      if (mmkv) {
        const result = JSON.parse(mmkv);
        setCalenderState({
          start: result.start ? dayjs(result.start).format('YYYY년MM월DD일') : null,
          end: result.end ? dayjs(result.end).format('YYYY년MM월DD일') : null
        });
      } else {
        // MMKV 데이터가 없으면 null로 초기화 (날짜 미표시)
        setCalenderState({
          start: null,
          end: null
        });
      }
    };

    initializeComponent();
  }, []);

  // 🔥 시간 기반 계산 (기존 calculateReadingPlan 대신 getPlanPreview 사용)
  useEffect(() => {
    // 선택된 타입과 날짜가 있을 때 계산 수행
    if (selectedPlanType && calendarState.start && calendarState.end) {
      try {
        const startDate = convertDate('start').toISOString().split('T')[0];
        const endDate = convertDate('end').toISOString().split('T')[0];

        const formData: BiblePlanFormData = {
          planType: selectedPlanType,
          startDate,
          endDate
        };

        const preview = getPlanPreview(formData);

        if (preview.isValid && preview.preview) {
          // 🔥 기존 UI와 호환되도록 형식 맞춤
          const calculation = {
            totalDays: preview.preview.totalDays,
            chaptersPerDay: Math.round(preview.preview.totalChapters / preview.preview.totalDays * 10) / 10, // 하루 평균 장수
            minutesPerDay: Math.round(preview.preview.calculatedMinutesPerDay * 10) / 10, // 🔥 시간 기반 계산
            dailySchedule: preview.preview.exampleDays,
            weeklyBreakdown: []
          };
          setCalculationResult(calculation);
        } else {
          console.log('시간 기반 계산 실패:', preview.errorMessage);
          setCalculationResult(null);
        }
      } catch (error) {
        console.log('시간 기반 계산 오류:', error);
        setCalculationResult(null);
      }
    }
  }, [selectedPlanType, calendarState]);

  // 🔥 기존 계획 로드 (시간 기반 시스템)
  const loadExistingPlan = () => {
    const existingPlan = loadExistingBiblePlan();
    if (existingPlan) {
      setPlanData(existingPlan);
      setMissedCount(calculateMissedChapters(existingPlan));

      setCalenderState({
        start: dayjs(existingPlan.startDate).format('YYYY년MM월DD일'),
        end: dayjs(existingPlan.endDate || existingPlan.targetDate).format('YYYY년MM월DD일')
      });
    }
  };

  // 기존 날짜 변경 함수 그대로 유지
  const onDateChange = (date: string) => {
    if (open === 1) {
      // 🔥 시작일 선택: 제한 없이 자유롭게 선택 가능 (오늘 날짜도 허용)
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
        const parsed = JSON.parse(mmkv);
        const result = Object.assign(parsed, {
          start: new Date(date)
        });
        defaultStorage.set('calender', JSON.stringify(result));
      } else {
        const result = {
          start: new Date(date)
        };
        defaultStorage.set('calender', JSON.stringify(result));
      }
    } else {
      // 🔥 목표일 선택 로직 수정
      const selectedEndDate = dayjs(date);

      // 시작일이 설정되지 않은 경우 처리
      if (!calendarState.start) {
        Toast.show({
          type: 'error',
          text1: '시작일을 먼저 선택해주세요'
        });
        return;
      }

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

      // 로컬 스토리지 업데이트
      if (mmkv) {
        const parsed = JSON.parse(mmkv);
        const result = Object.assign(parsed, {
          end: new Date(date)
        });
        defaultStorage.set('calender', JSON.stringify(result));
      } else {
        const result = {
          end: new Date(date)
        };
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

  // 🔥 초기화 로직 (시간 기반 시스템)
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
                console.log('=== 시간 기반 설정 초기화 시작 ===');

                // 로딩 상태 표시
                Toast.show({
                  type: 'info',
                  text1: '초기화 중...',
                  text2: '잠시만 기다려주세요',
                  autoHide: false
                });

                // 🔥 시간 기반 계획 삭제
                const result = deleteBiblePlan();

                if (result.success) {
                  // 🔥 기존 초기화 로직도 함께 실행 (호환성)
                  try {
                    // MMKV 스토리지 초기화
                    const keysToDelete = [
                      'bible_plan_data',
                      'bible_reading_cache',
                      'reading_progress',
                      'calender'
                    ];

                    keysToDelete.forEach(key => {
                      try {
                        defaultStorage.delete(key);
                        console.log(`MMKV 키 삭제 완료: ${key}`);
                      } catch (keyError) {
                        console.warn(`MMKV 키 삭제 실패 (무시 가능): ${key}`, keyError);
                      }
                    });

                    // SQLite 데이터 초기화
                    await bibleSetting('UPDATE reading_table SET read = "F"');
                    console.log('SQLite reading_table 초기화 완료');

                    // Redux 상태 초기화
                    if (typeof store !== 'undefined' && store.dispatch) {
                      store.dispatch(bibleSelectSlice.actions.reset());
                      store.dispatch(illdocSelectSlice.actions.reset());
                      store.dispatch(bibleTextSlice.actions.reset());
                      console.log('Redux 상태 초기화 완료');
                    }
                  } catch (legacyError) {
                    console.warn('기존 시스템 초기화 중 오류 (계속 진행):', legacyError);
                  }

                  // 로컬 상태 초기화
                  setPlanData(null);
                  setMissedCount(0);
                  setSelectedPlanType('');
                  setCalculationResult(null);

                  // 캘린더 상태를 null로 초기화 (날짜 미표시)
                  setCalenderState({
                    start: null,
                    end: null
                  });

                  // 바텀시트 닫기
                  if (isOpen && typeof onClose === 'function') {
                    onClose();
                  }

                  Toast.show({
                    type: 'success',
                    text1: '초기화 완료',
                    text2: '새로운 시간 기반 계획을 설정해보세요'
                  });

                  // 상위 컴포넌트에 변경사항 알림
                  onTrigger();

                } else {
                  Toast.show({
                    type: 'error',
                    text1: result.errorMessage || '초기화 실패'
                  });
                }

              } catch (error) {
                console.error('❌ 초기화 실패:', error);
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

  const handleSelectBibleCategory = (category: string) => {
    console.log("🔥 성경 카테고리 선택:", category);

    const selectedType = DETAILED_BIBLE_PLAN_TYPES.find(type => type.name === category);
    if (selectedType) {
      setSelectedPlanType(selectedType.id);
      console.log("✅ 선택된 타입 ID:", selectedType.id);

    } else {
      console.error("❌ 선택된 타입을 찾을 수 없음:", category);
    }
  };

  // 🔥 계획 설정 완료 (시간 기반 시스템)
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

    try {
      const startDate = convertDate('start').toISOString().split('T')[0];
      const endDate = convertDate('end').toISOString().split('T')[0];

      const formData: BiblePlanFormData = {
        planType: selectedPlanType,
        startDate,
        endDate
      };

      const result = createAndSaveBiblePlan(formData);

      if (result.success && result.planData) {
        // 🔥 기존 UI와 호환되도록 데이터 변환
        const legacyPlanData = {
          ...result.planData,
          targetDate: result.planData.endDate, // 기존 필드명 호환
          chaptersPerDay: calculationResult.chaptersPerDay,
          minutesPerDay: calculationResult.minutesPerDay
        };

        // 로컬 상태 업데이트
        setPlanData(legacyPlanData);
        setSelectedPlanType('');
        setCalculationResult(null);
        onClose();

        const selectedPlan = DETAILED_BIBLE_PLAN_TYPES.find(plan => plan.id === selectedPlanType);

        // 🔥 시간 정보 포함한 성공 메시지
        Toast.show({
          type: 'success',
          text1: `${selectedPlan?.name} 일독이 설정되었습니다`,
          text2: `하루 평균 ${calculationResult.minutesPerDay}분씩 ${calculationResult.totalDays}일간 진행`
        });

        // 상위 컴포넌트에 즉시 변경사항 알림
        onTrigger();

      } else {
        Toast.show({
          type: 'error',
          text1: result.errorMessage || '계획 설정 실패'
        });
      }

    } catch (error) {
      console.error('❌ 시간 기반 계획 설정 실패:', error);
      Toast.show({
        type: 'error',
        text1: '계획 설정 중 오류가 발생했습니다'
      });
    }
  };

  // 🔥 기존 UI 코드 완전히 그대로 유지
  return (
      <>
        <ScrollView style={{ backgroundColor: color.white }}>
          <Calender isOpen={open} onClose={setOpen} onChange={onDateChange} />
          {planData && (
              <>
                <Box w="100%" h={38} bg="#F0F0F0" justifyContent="center">
                </Box>
                <HStack
                    h={70}
                    alignItems="center"
                    justifyContent="space-between"
                    px={4}
                    borderBottomColor="#F0F0F0"
                    borderBottomWidth={1}
                >
                  <Text fontSize={20} fontWeight={600}>
                    일독 진행 현황
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
                      일독 보기
                    </Text>
                  </Button>
                </HStack>
              </>
          )}
          <Box bg={color.white}>
            {/* 읽기 현황 섹션 */}

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
                <Text fontSize={18} fontWeight={600}>시작일</Text>
              </VStack>
              <VStack>
                {calendarState.start && (
                    <Text fontSize={16} color="#777777" >
                      {calendarState.start}
                    </Text>
                )}
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
                <Text color={color.white}  fontSize={16} fontWeight={500}>시작일 선택</Text>
              </Button>
            </HStack>

            {/* 종료일 섹션 */}
            <HStack
                h={70}
                alignItems="center"
                justifyContent="space-between"
                px={4}
                borderBottomColor="#F0F0F0"
                borderBottomWidth={1}
            >
              <VStack>
                <Text fontSize={18} fontWeight={600}>종료일</Text>
              </VStack>
              <VStack>
                {calendarState.end && (
                    <Text fontSize={16} color="#777777">
                      {calendarState.end}
                    </Text>
                )}
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
                <Text color={color.white} fontSize={16} fontWeight={500}>종료일 선택</Text>
              </Button>
            </HStack>

            {/* 🆕 총기간 섹션 - 이미지와 동일한 디자인 */}
            <DurationControlComponent
                startDate={calendarState.start}
                endDate={calendarState.end}
                onEndDateChange={handleEndDateChange}
                planData={planData}
            />

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
                  <VStack space={3}>
                    {renderSetupButton()}
                    <Button
                        w="100%"
                        h={55}
                        bg="transparent"
                        borderWidth={2}
                        borderColor="#37C4B9"
                        borderRadius="md"
                        onPress={onReset}
                        _pressed={{ bg: "#F0F9FF" }}
                    >
                      <Text color="#37C4B9" fontSize={16} fontWeight={600}>
                        설정 초기화
                      </Text>
                    </Button>
                  </VStack>
              ) : (
                  <VStack space={3}>
                    <Button
                        w="100%"
                        h={55}
                        bg="#37C4B9"
                        borderRadius="md"
                        onPress={onNavigate}
                        _pressed={{ bg: "#2BA89E" }}
                    >
                      <Text color={color.white} fontSize={16} fontWeight={700}>
                        일독 진행 보기
                      </Text>
                    </Button>
                    <Button
                        w="100%"
                        h={55}
                        bg="transparent"
                        borderWidth={2}
                        borderColor="#FF6B6B"
                        borderRadius="md"
                        onPress={onReset}
                        _pressed={{ bg: "#FFF5F5" }}
                    >
                      <Text color="#FF6B6B" fontSize={16} fontWeight={600}>
                        일독 설정 초기화
                      </Text>
                    </Button>
                  </VStack>
              )}
            </View>
          </Box>
        </ScrollView>

        {/* 성경일독 타입 선택 바텀시트 - 기존 UI 완전히 그대로 */}
        <Actionsheet isOpen={isOpen} onClose={onClose}>
          <Actionsheet.Content borderTopRadius="15" bg="white">
            {!selectedPlanType ? (
                // 첫 번째 단계: 타입 선택 화면 (기존 디자인 유지)
                <>
                  <Box w="100%" h={60} px={4} justifyContent="center" alignItems="center" borderBottomWidth={1} borderBottomColor="#F0F0F0">
                    <Text fontSize={18} fontWeight="600" color="#333333">
                      성경 일독 선택
                    </Text>
                  </Box>

                  <View style={{ width: '100%', padding: 16 }}>
                    {/* 🔥 카테고리 버튼들 - 기존 디자인에 선택 상태만 추가 */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {DETAILED_BIBLE_PLAN_TYPES.map((planType) => (
                          <Button
                              key={planType.id}
                              w="48%"
                              h={65}
                              mb={3}
                              bg={selectedPlanType === planType.id ? "#37C4B9" : "#F8F9FA"}  // 🔥 선택된 상태만 색상 변경
                              borderRadius="md"
                              borderWidth={selectedPlanType === planType.id ? 2 : 1}  // 🔥 선택된 상태 테두리 강화
                              borderColor={selectedPlanType === planType.id ? "#37C4B9" : "#E0E0E0"}
                              _pressed={{ bg: selectedPlanType === planType.id ? "#2BA89E" : "#F0F0F0" }}
                              onPress={() => handleSelectBibleCategory(planType.name)}  // 🔥 기존 함수 사용
                          >
                            <VStack alignItems="center" space={1}>
                              <Text
                                  color={selectedPlanType === planType.id ? "#FFFFFF" : "#333333"}  // 🔥 선택된 상태 텍스트 색상
                                  fontSize="15"
                                  fontWeight="600"
                                  textAlign="center"
                              >
                                {planType.name}
                              </Text>
                              <Text
                                  color={selectedPlanType === planType.id ? "#F0F9FF" : "#666666"}  // 🔥 선택된 상태 설명 색상
                                  fontSize="11"
                                  textAlign="center"
                                  numberOfLines={2}
                              >
                                {planType.description}
                              </Text>
                            </VStack>
                          </Button>
                      ))}
                    </View>
                  </View>
                </>
            ) : (
                // 두 번째 단계: 선택된 타입의 상세 정보 화면 (기존 디자인 완전 유지)
                <>
                  <Box w="100%" h={60} px={4} justifyContent="center" alignItems="center" borderBottomWidth={1} borderBottomColor="#F0F0F0">
                    <Text fontSize={18} fontWeight="600" color="#333333">
                      성경 일독 설정
                    </Text>
                  </Box>

                  <ScrollView style={{ width: '100%', maxHeight: 500 }}>
                    <View style={{ padding: 16 }}>
                      {/* 선택된 타입 정보 - 기존과 동일 */}
                      <VStack space={3} mb={4}>
                        {/* 🔥 성경/구약/신약/모세오경/시편 박스들 - 클릭 가능하도록 수정 */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                          {DETAILED_BIBLE_PLAN_TYPES.map((planType) => (
                              <Button  // 🔥 Box를 Button으로 변경하여 클릭 가능하게
                                  key={planType.id}
                                  w="48%"
                                  h={20}
                                  bg={selectedPlanType === planType.id ? "#37C4B9" : "#F0F0F0"}
                                  borderRadius="md"
                                  justifyContent="center"
                                  alignItems="center"
                                  mb={2}
                                  _pressed={{ bg: selectedPlanType === planType.id ? "#2BA89E" : "#E0E0E0" }}
                                  onPress={() => {
                                    console.log("🔄 타입 변경:", planType.name);
                                    setSelectedPlanType(planType.id);  // 🔥 직접 상태 변경
                                  }}
                              >
                                <VStack alignItems="center">
                                  <Text
                                      color={selectedPlanType === planType.id ? "white" : "#999999"}
                                      fontSize="19"
                                      fontWeight="600"
                                  >
                                    {planType.name}
                                  </Text>
                                  <Text
                                      color={selectedPlanType === planType.id ? "white" : "#999999"}
                                      fontSize="19"
                                  >
                                    {planType.totalChapters}장
                                  </Text>
                                </VStack>
                              </Button>
                          ))}
                        </View>

                        {/* 선택된 타입의 상세 설명 - 기존과 동일 */}
                        <Box bg="#F8F9FA" p={3} borderRadius="md">
                          <Text fontSize="16" color="#666" textAlign="center">
                            {DETAILED_BIBLE_PLAN_TYPES.find(t => t.id === selectedPlanType)?.description}
                          </Text>
                        </Box>

                        {/* 예상 계산결과 - 🔥 시간 기반 정보 표시 */}
                        {calculationResult && (
                            <Box bg="#F0F9FF" p={4} borderRadius="md">
                              <HStack alignItems="center" justifyContent="center" mb={3}>
                                <Text fontSize="19" color="#37C4B9" fontWeight="600">
                                  📊 시간 기반 계산결과
                                </Text>
                              </HStack>

                              <VStack space={2}>
                                <HStack justifyContent="space-between" alignItems="center">
                                  <Text fontSize="18" color="#666">총 기간 :</Text>
                                  <HStack alignItems="baseline">
                                    <Text fontSize="16" color="#666">
                                      {calendarState.start?.replace(/년|월/g, '.').replace(/일/g, '')} ~ {calendarState.end?.replace(/년|월/g, '.').replace(/일/g, '')}
                                    </Text>
                                    <Text fontSize="18" color="#37C4B9" fontWeight="600" ml={2}>
                                      {calculationResult.totalDays}일
                                    </Text>
                                  </HStack>
                                </HStack>

                                <HStack justifyContent="space-between" alignItems="center">
                                  <Text fontSize="18" color="#666">하루목표 :</Text>
                                  <HStack alignItems="baseline">
                                    <Text fontSize="18" color="#37C4B9" fontWeight="600">
                                      {calculationResult.chaptersPerDay}장
                                    </Text>
                                    <Text fontSize="18" color="#37C4B9" ml={1}>
                                      / {calculationResult.minutesPerDay}분
                                    </Text>
                                  </HStack>
                                </HStack>
                              </VStack>
                            </Box>
                        )}
                      </VStack>
                    </View>
                  </ScrollView>

                  {/* 하단 버튼 - 기존과 동일 */}
                  <Box w="100%" p={4}>
                    <Button
                        w="100%"
                        h={55}
                        bg="#37C4B9"
                        borderRadius="md"
                        _pressed={{ bg: "#2BA89E" }}
                        onPress={handleCompletePlanSetup}
                    >
                      <Text color="white" fontSize={16} fontWeight="600">
                        일독 설정 완료
                      </Text>
                    </Button>
                  </Box>
                </>
            )}
          </Actionsheet.Content>
        </Actionsheet>
      </>
  );
}