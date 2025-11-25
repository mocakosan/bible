import { Box, Button, HStack, Text, VStack, Actionsheet, useDisclose, Badge } from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../../hooks';
import Calender from '../../../section/calendar';

import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {ScrollView, View, Alert, Image} from 'react-native';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import {
  bibleSetting,
  fetchSql,
  invalidateCache,
  refreshCache
} from '../../../../utils';
import { defaultStorage } from '../../../../utils/mmkv';
import {
  loadBiblePlanData,
  saveBiblePlanData,
  deleteBiblePlanData,
  calculateMissedChapters,
  formatDate,
  calculateProgress,
  invalidateTodayChaptersCache
} from '../../../../utils/biblePlanUtils';
import {
  DETAILED_BIBLE_PLAN_TYPES,
  calculateReadingPlan,
  type BiblePlanTypeDetail
} from '../../../../utils/biblePlanCalculator';
import {useBibleReading} from "../../../../utils/useBibleReading";
import {bibleSelectSlice, bibleTextSlice, illdocSelectSlice} from "../../../../provider/redux/slice";
import {store} from "../../../../provider/redux/store";
import {getChapterTimeDataForPlan, loadChapterTimeDataFromCSV} from "../../../../utils/csvDataLoader";
import {createTimeBasedReadingPlan} from "../../../../utils/timeBasedBibleReading";
import { BibleStep } from '../../../../utils/define';
import { getChapterReadingTime } from '../../../../utils/completeBibleReadingTimes';

interface Props {
  readState: any;
  onTrigger: () => void;
}

// 시간 기반 일별 계획 타입
interface DailyChapterPlan {
  day: number;
  date: Date;
  chapters: {
    book: number;
    bookName: string;
    chapter: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }[];
  totalMinutes: number;
  totalSeconds: number;
  formattedTime: string;
  actualChapterCount: number;
}

// 시간 기반 일별 계획 생성 함수
function generateTimeBasedDailyPlan(
    planType: string,
    totalDays: number,
    startDate: Date
): DailyChapterPlan[] {
  let startBook = 1;
  let endBook = 66;

  switch (planType) {
    case 'old_testament':
      endBook = 39;
      break;
    case 'new_testament':
      startBook = 40;
      break;
    case 'pentateuch':
      endBook = 5;
      break;
    case 'psalms':
      startBook = 19;
      endBook = 19;
      break;
  }

  let totalSeconds = 0;
  let totalChapters = 0;
  const allChapters: {
    book: number;
    bookName: string;
    chapter: number;
    seconds: number;
  }[] = [];

  for (let bookIndex = startBook; bookIndex <= endBook; bookIndex++) {
    const bookInfo = BibleStep.find(step => step.index === bookIndex);
    if (!bookInfo) continue;

    for (let chapter = 1; chapter <= bookInfo.count; chapter++) {
      const chapterSeconds = getChapterReadingTime(bookIndex, chapter);
      totalSeconds += chapterSeconds;
      totalChapters++;

      allChapters.push({
        book: bookIndex,
        bookName: bookInfo.name,
        chapter: chapter,
        seconds: chapterSeconds
      });
    }
  }

  const targetSecondsPerDay = Math.round(totalSeconds / totalDays);
  const targetMinutesPerDay = Math.round(targetSecondsPerDay / 60);

  console.log(`
  시간 기반 계획 생성
  - 총 ${totalDays}일
  - 전체 장수: ${totalChapters}장
  - 하루 목표: ${targetMinutesPerDay}분
  `);

  const dailyPlan: DailyChapterPlan[] = [];
  let currentDate = new Date(startDate);
  let chapterIndex = 0;

  for (let day = 1; day <= totalDays && chapterIndex < allChapters.length; day++) {
    const dayChapters: DailyChapterPlan['chapters'] = [];
    let dayTotalSeconds = 0;

    if (day === totalDays) {
      while (chapterIndex < allChapters.length) {
        const chapter = allChapters[chapterIndex];
        dayChapters.push({
          book: chapter.book,
          bookName: chapter.bookName,
          chapter: chapter.chapter,
          minutes: Math.floor(chapter.seconds / 60),
          seconds: chapter.seconds % 60,
          totalSeconds: chapter.seconds
        });
        dayTotalSeconds += chapter.seconds;
        chapterIndex++;
      }
    } else {
      let targetReached = false;

      while (chapterIndex < allChapters.length && !targetReached) {
        const chapter = allChapters[chapterIndex];
        const nextTotalSeconds = dayTotalSeconds + chapter.seconds;

        if (dayChapters.length === 0) {
          dayChapters.push({
            book: chapter.book,
            bookName: chapter.bookName,
            chapter: chapter.chapter,
            minutes: Math.floor(chapter.seconds / 60),
            seconds: chapter.seconds % 60,
            totalSeconds: chapter.seconds
          });
          dayTotalSeconds += chapter.seconds;
          chapterIndex++;
        } else {
          const currentDiff = Math.abs(dayTotalSeconds - targetSecondsPerDay);
          const nextDiff = Math.abs(nextTotalSeconds - targetSecondsPerDay);

          if (nextDiff < currentDiff || dayTotalSeconds < targetSecondsPerDay * 0.5) {
            dayChapters.push({
              book: chapter.book,
              bookName: chapter.bookName,
              chapter: chapter.chapter,
              minutes: Math.floor(chapter.seconds / 60),
              seconds: chapter.seconds % 60,
              totalSeconds: chapter.seconds
            });
            dayTotalSeconds += chapter.seconds;
            chapterIndex++;
          } else {
            targetReached = true;
          }
        }
      }
    }

    if (dayChapters.length > 0) {
      dailyPlan.push({
        day: day,
        date: new Date(currentDate),
        chapters: dayChapters,
        totalMinutes: Math.floor(dayTotalSeconds / 60),
        totalSeconds: dayTotalSeconds,
        formattedTime: formatTime(dayTotalSeconds),
        actualChapterCount: dayChapters.length
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const includedChapters = dailyPlan.reduce((sum, day) => sum + day.actualChapterCount, 0);
  console.log(`계획 생성 완료: ${includedChapters}/${totalChapters}장 포함`);

  return dailyPlan;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }
  return `${minutes}분 ${seconds}초`;
}

const DurationControlComponent = ({ startDate, endDate, onEndDateChange, planData }: any) => {
  const convertStringToDate = (dateString: string) => {
    const cleaned = dateString.replace(/년|월/g, '-').replace(/일/g, '');
    return dayjs(cleaned);
  };

  const calculateTotalDays = () => {
    if (!startDate || !endDate) return 0;

    const start = convertStringToDate(startDate);
    const end = convertStringToDate(endDate);

    return end.diff(start, 'day') + 1;
  };

  const adjustEndDate = (direction: 'up' | 'down') => {
    if (!endDate || planData) return;

    const currentEnd = convertStringToDate(endDate);
    const start = convertStringToDate(startDate);

    let newEndDate;
    if (direction === 'up') {
      newEndDate = currentEnd.add(1, 'day');
    } else {
      newEndDate = currentEnd.subtract(1, 'day');
    }

    if (newEndDate.isBefore(start)) {
      return;
    }

    const formattedDate = newEndDate.format('YYYY년MM월DD일');
    onEndDateChange(formattedDate);
  };

  const totalDays = calculateTotalDays();

  if (!startDate || !endDate) {
    return null;
  }

  return (
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

  const { isOpen, onOpen, onClose } = useDisclose();

  const [planData, setPlanData] = useState<any>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<string>('');
  const [missedCount, setMissedCount] = useState(0);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  const [calendarState, setCalenderState] = useState<{
    start: string | null;
    end: string | null;
  }>({
    start: null,
    end: null
  });

  const [isTimeDataLoaded, setIsTimeDataLoaded] = useState(false);

  const [actualChapterCounts, setActualChapterCounts] = useState<{ [key: string]: number }>({
    full_bible: 1189,
    old_testament: 921,
    new_testament: 268,
    pentateuch: 187,
    psalms: 150
  });

  useEffect(() => {
    const loadTimeData = async () => {
      try {
        const success = await loadChapterTimeDataFromCSV();
        setIsTimeDataLoaded(success);
        console.log('시간 데이터 로드:', success ? '성공' : '실패');

        const defaultCounts = {
          full_bible: 1189,
          old_testament: 921,
          new_testament: 268,
          pentateuch: 187,
          psalms: 150
        };

        setActualChapterCounts(defaultCounts);
      } catch (error) {
        console.error('시간 데이터 로드 오류:', error);
        setIsTimeDataLoaded(false);
      }
    };

    loadTimeData();
  }, []);

  const convertDate = (type: 'start' | 'end') => {
    const result: { [key: string]: string | null } = calendarState;
    const dateString = result[type];

    if (!dateString) {
      return dayjs(new Date());
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

  const sturdyDif = () => {
    if (planData) {
      const progress = calculateProgress(planData);
      return progress.progressPercentage.toFixed(1);
    }

    if (!readState || !Array.isArray(readState)) {
      return "0";
    }

    const readCount = readState.length;
    const totalChapters = 1189;

    const result = (readCount / totalChapters) * 100;
    return result ? result.toFixed(1) : "0";
  };

  const isDatesCompleted = () => {
    if (!calendarState.start || !calendarState.end) return false;

    const startDateObj = convertDate('start');
    const endDateObj = convertDate('end');
    const isEndDateAfterStart = endDateObj.isAfter(startDateObj) || endDateObj.isSame(startDateObj);

    return isEndDateAfterStart;
  };

  const handleSetupBibleReading = () => {
    if (!calendarState.start || !calendarState.end) {
      Toast.show({
        type: 'error',
        text1: '날짜 설정이 필요합니다',
        text2: '시작일과 목표일을 모두 선택해주세요'
      });
      return;
    }

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

    onOpen();
  };

  const renderSetupButton = () => {
    const datesCompleted = isDatesCompleted();
    return (
        <Button
            w="100%"
            h={55}
            bg={datesCompleted ? "#37C4B9" : "#ACACAC"}
            borderRadius="md"
            mb={3}
            _pressed={{
              bg: datesCompleted ? "#2BA89E" : "#999999"
            }}
            onPress={handleSetupBibleReading}
        >
          <Text
              color={color.white}
              fontSize={16}
              fontWeight={700}
          >
            일독 설정하기
          </Text>
        </Button>
    );
  };

  const handleEndDateChange = (newEndDate: string) => {
    setCalenderState(prev => ({
      ...prev,
      end: newEndDate
    }));

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

  useEffect(() => {
    const initializeComponent = () => {
      loadExistingPlan();

      if (mmkv) {
        const result = JSON.parse(mmkv);
        setCalenderState({
          start: result.start ? dayjs(result.start).format('YYYY년MM월DD일') : null,
          end: result.end ? dayjs(result.end).format('YYYY년MM월DD일') : null
        });
      } else {
        setCalenderState({
          start: null,
          end: null
        });
      }
    };

    initializeComponent();
  }, []);

  useEffect(() => {
    if (selectedPlanType && calendarState.start && calendarState.end) {
      try {
        const startDate = convertDate('start').toDate();
        const endDate = convertDate('end').toDate();

        if (endDate >= startDate) {
          const selectedPlan = DETAILED_BIBLE_PLAN_TYPES.find(p => p.id === selectedPlanType);
          if (!selectedPlan) return;

          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const dailyPlan = generateTimeBasedDailyPlan(selectedPlanType, totalDays, startDate);

          const totalChapters = dailyPlan.reduce((sum, day) => sum + day.actualChapterCount, 0);
          const totalSeconds = dailyPlan.reduce((sum, day) => sum + day.totalSeconds, 0);
          const totalMinutes = totalSeconds / 60;
          const targetMinutesPerDay = Math.round(totalMinutes / totalDays);
          const avgChaptersPerDay = totalChapters / dailyPlan.length;

          setCalculationResult({
            planType: selectedPlanType,
            totalDays: totalDays,
            totalChapters: totalChapters,
            chaptersPerDay: Math.ceil(avgChaptersPerDay),
            chaptersPerDayExact: avgChaptersPerDay,
            minutesPerDay: targetMinutesPerDay,
            minutesPerDayExact: targetMinutesPerDay,
            targetMinutesPerDay: targetMinutesPerDay,
            totalTimeMinutes: totalMinutes,
            totalTimeSeconds: totalSeconds,
            isTimeBasedCalculation: true,
            hasActualTimeData: true,
            dailyPlan: dailyPlan
          });
        }
      } catch (error) {
        console.error('계산 오류:', error);
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
        end: dayjs(existingPlan.targetDate || existingPlan.endDate).format('YYYY년MM월DD일')
      });
    }
  };

  const onDateChange = (date: string) => {
    if (open === 1) {
      const selectedStartDate = dayjs(date);

      setCalenderState((pre) => ({
        ...pre,
        start: selectedStartDate.format('YYYY년MM월DD일')
      }));

      Toast.show({
        type: 'info',
        text1: '목표일을 설정해주세요',
        text2: '시작일이 설정되었습니다. 이제 목표일을 선택해주세요'
      });

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
      const selectedEndDate = dayjs(date);

      if (!calendarState.start) {
        Toast.show({
          type: 'error',
          text1: '시작일을 먼저 선택해주세요'
        });
        return;
      }

      const currentStartDate = convertDate('start');

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

      Toast.show({
        type: 'success',
        text1: '일독 설정하기를 눌러주세요',
        text2: '목표일이 설정되었습니다'
      });

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
      return;
    } else {
      navigation.navigate('ProgressScreen', {
        parcent: s2Day(),
        total: s1Day()
      });
    }
  };

  //수정된 초기화 함수
  const onReset = () => {
    Alert.alert(
        '설정 초기화',
        planData
            ? '일독 설정과 읽기 기록을 모두 초기화하시겠습니까?\n\n️ 이 작업은 되돌릴 수 없습니다.'
            : '읽기 기록을 초기화하시겠습니까?\n\n️ 이 작업은 되돌릴 수 없습니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '초기화',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('===설정 초기화 시작 ===');

                Toast.show({
                  type: 'info',
                  text1: '초기화 중...',
                  text2: '잠시만 기다려주세요',
                  autoHide: false
                });

                // SQLite reading_table 완전 초기화
                try {
                  // 모든 레코드 삭제
                  await fetchSql(bibleSetting, 'DELETE FROM reading_table', []);
                  console.log('SQLite reading_table 삭제 완료');
                } catch (sqlError) {
                  console.error('SQLite DELETE 실패, UPDATE 시도:', sqlError);

                  try {
                    // 방법 2: read를 "false"로 업데이트
                    await fetchSql(bibleSetting, 'UPDATE reading_table SET read = ?', ['false']);
                    console.log('SQLite reading_table UPDATE 완료');
                  } catch (updateError) {
                    console.error('SQLite UPDATE도 실패:', updateError);
                  }
                }

                // 🔥 2. 메모리 캐시 초기화 (sqlite.ts)
                try {
                  invalidateCache();
                  console.log('메모리 캐시 무효화 완료');
                } catch (cacheError) {
                  console.warn('캐시 무효화 실패:', cacheError);
                }

                // 🔥 3. biblePlanUtils 캐시 무효화
                try {
                  invalidateTodayChaptersCache();
                  console.log('일독 계획 캐시 무효화 완료');
                } catch (planCacheError) {
                  console.warn('일독 계획 캐시 무효화 실패:', planCacheError);
                }

                // 🔥 4. 일독 계획 데이터 삭제
                try {
                  deleteBiblePlanData();
                  console.log('일독 계획 데이터 삭제 완료');
                } catch (planError) {
                  console.warn('일독 계획 삭제 실패:', planError);
                }

                //MMKV 스토리지 초기화
                try {
                  const keysToDelete = [
                    'bible_reading_plan',
                    'bible_plan_data',
                    'bible_reading_cache',
                    'reading_progress',
                    'calender',
                    'playback_state'
                  ];

                  keysToDelete.forEach(key => {
                    try {
                      defaultStorage.delete(key);
                    } catch (keyError) {
                      // 무시
                    }
                  });

                  console.log('MMKV 초기화 완료');
                } catch (mmkvError) {
                  console.error('MMKV 초기화 오류:', mmkvError);
                }

                //Redux 상태 초기화
                try {
                  if (typeof store !== 'undefined' && store.dispatch) {
                    store.dispatch(bibleSelectSlice.actions.reset());
                    store.dispatch(illdocSelectSlice.actions.reset());
                    store.dispatch(bibleTextSlice.actions.reset());
                    console.log('Redux 상태 초기화 완료');
                  }
                } catch (reduxError) {
                  console.warn('Redux 초기화 오류:', reduxError);
                }

                //로컬 컴포넌트 상태 초기화
                setPlanData(null);
                setMissedCount(0);
                setSelectedPlanType('');
                setCalculationResult(null);
                setCalenderState({
                  start: null,
                  end: null
                });
                console.log(' 로컬 상태 초기화 완료');

                //메모리 캐시 다시 초기화 (빈 상태로)
                try {
                  await refreshCache();
                  console.log('메모리 캐시 재초기화 완료');
                } catch (refreshError) {
                  console.warn('캐시 재초기화 실패:', refreshError);
                }

                //바텀시트 닫기
                try {
                  if (isOpen && typeof onClose === 'function') {
                    onClose();
                  }
                } catch (closeError) {
                  // 무시
                }

                //상위 컴포넌트 새로고침
                console.log('🔄 상위 컴포넌트 새로고침 트리거');

                if (typeof onTrigger === 'function') {
                  onTrigger();
                }

                // 추가 새로고침 (안전장치)
                setTimeout(() => {
                  if (typeof onTrigger === 'function') {
                    onTrigger();
                  }
                }, 500);

                // 완료 메시지
                setTimeout(() => {
                  Toast.hide();
                  Toast.show({
                    type: 'success',
                    text1: '초기화 완료',
                    text2: '모든 읽기 기록이 초기화되었습니다',
                    visibilityTime: 3000
                  });
                }, 800);

                console.log('===설정 초기화 완료 ===');

              } catch (error) {
                console.error('초기화 중 오류:', error);

                Toast.hide();
                Toast.show({
                  type: 'error',
                  text1: '초기화 오류',
                  text2: '앱을 재시작해주세요',
                  visibilityTime: 4000
                });

                if (typeof onTrigger === 'function') {
                  onTrigger();
                }
              }
            }
          }
        ]
    );
  };

  const handleSelectBibleCategory = (category: string) => {
    console.log("성경 카테고리 선택:", category);

    const selectedType = DETAILED_BIBLE_PLAN_TYPES.find(type => type.name === category);
    if (selectedType) {
      setSelectedPlanType(selectedType.id);
      console.log("선택된 타입 ID:", selectedType.id);
    } else {
      console.error("선택된 타입을 찾을 수 없음:", category);
    }
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
      endDate: convertDate('end').toISOString(),
      totalDays: calculationResult.totalDays,
      chaptersPerDay: calculationResult.chaptersPerDay,
      chaptersPerDayExact: calculationResult.chaptersPerDayExact,
      minutesPerDay: calculationResult.minutesPerDay,
      minutesPerDayExact: calculationResult.minutesPerDayExact,
      targetMinutesPerDay: calculationResult.targetMinutesPerDay,
      totalChapters: calculationResult.totalChapters,
      currentDay: 1,
      readChapters: [],
      createdAt: new Date().toISOString(),
      bookRange: selectedPlan.bookRange,
      isTimeBasedCalculation: true,
      totalTimeMinutes: calculationResult.totalTimeMinutes,
      totalTimeSeconds: calculationResult.totalTimeSeconds,
      hasActualTimeData: true,
      dailyPlan: calculationResult.dailyPlan
    };

    saveBiblePlanData(newPlanData);

    setPlanData(newPlanData);
    setSelectedPlanType('');
    setCalculationResult(null);
    onClose();

    Toast.show({
      type: 'success',
      text1: `${selectedPlan.name} 일독이 설정되었습니다`,
      text2: `하루 목표: ${calculationResult.targetMinutesPerDay}분 (고정)`
    });

    onTrigger();
  };

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

            <DurationControlComponent
                startDate={calendarState.start}
                endDate={calendarState.end}
                onEndDateChange={handleEndDateChange}
                planData={planData}
            />

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
                      <Text fontSize="14" color="#666">전체 장수:</Text>
                      <Text fontSize="14" color="#333333" fontWeight="500">
                        {calculationResult.totalChapters}장
                      </Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="14" color="#666">하루 목표:</Text>
                      <Text fontSize="14" color="#FF5722" fontWeight="600">
                        {calculationResult.targetMinutesPerDay}분 (고정)
                      </Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="14" color="#666">평균 장수:</Text>
                      <Text fontSize="14" color="#333333" fontWeight="500">
                        약 {calculationResult.chaptersPerDayExact.toFixed(1)}장/일
                      </Text>
                    </HStack>
                    <Text fontSize="12" color="#999" textAlign="center" mt={2}>
                      ※ 하루 목표 시간은 고정, 장수는 매일 다름
                    </Text>
                  </VStack>
                </Box>
            )}

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

        <Actionsheet isOpen={isOpen} onClose={onClose}>
          <Actionsheet.Content borderTopRadius="15" bg="white">
            {!selectedPlanType ? (
                <>
                  <Box w="100%" h={60} px={4} justifyContent="center" alignItems="center" borderBottomWidth={1} borderBottomColor="#F0F0F0">
                    <Text fontSize={18} fontWeight="600" color="#333333">
                      성경 일독 선택
                    </Text>
                  </Box>

                  <View style={{ width: '100%', padding: 16 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {DETAILED_BIBLE_PLAN_TYPES.map((planType) => (
                          <Button
                              key={planType.id}
                              w="48%"
                              h={65}
                              mb={3}
                              bg={selectedPlanType === planType.id ? "#37C4B9" : "#F8F9FA"}
                              borderRadius="md"
                              borderWidth={selectedPlanType === planType.id ? 2 : 1}
                              borderColor={selectedPlanType === planType.id ? "#37C4B9" : "#E0E0E0"}
                              _pressed={{ bg: selectedPlanType === planType.id ? "#2BA89E" : "#F0F0F0" }}
                              onPress={() => handleSelectBibleCategory(planType.name)}
                          >
                            <VStack alignItems="center" space={1}>
                              <HStack alignItems="baseline" space={1}>
                                <Text
                                    color={selectedPlanType === planType.id ? "#FFFFFF" : "#333333"}
                                    fontSize="15"
                                    fontWeight="600"
                                    textAlign="center"
                                >
                                  {planType.name}
                                </Text>
                                <Text
                                    color={selectedPlanType === planType.id ? "#E8F8FF" : "#37C4B9"}
                                    fontSize="12"
                                    fontWeight="600"
                                >
                                  {actualChapterCounts[planType.id]}장
                                </Text>
                              </HStack>
                              <Text
                                  color={selectedPlanType === planType.id ? "#F0F9FF" : "#666666"}
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
                <>
                  <Box w="100%" h={60} px={4} justifyContent="center" alignItems="center" borderBottomWidth={1} borderBottomColor="#F0F0F0">
                    <Text fontSize={18} fontWeight="600" color="#333333">
                      성경 일독 설정
                    </Text>
                  </Box>

                  <ScrollView style={{ width: '100%', maxHeight: 500 }}>
                    <View style={{ padding: 16 }}>
                      <VStack space={3} mb={4}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                          {DETAILED_BIBLE_PLAN_TYPES.map((planType) => (
                              <Button
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
                                    setSelectedPlanType(planType.id);
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
                                    {actualChapterCounts[planType.id]}장
                                  </Text>
                                </VStack>
                              </Button>
                          ))}
                        </View>

                        <Box bg="#F8F9FA" p={3} borderRadius="md">
                          <Text fontSize="16" color="#666" textAlign="center">
                            {DETAILED_BIBLE_PLAN_TYPES.find(t => t.id === selectedPlanType)?.description}
                          </Text>
                        </Box>

                        {calculationResult && (
                            <Box bg="#F0F9FF" p={4} borderRadius="md">
                              <HStack alignItems="center" justifyContent="center" mb={3}>
                                <Text fontSize="19" color="#37C4B9" fontWeight="600">
                                  📊 시간 기반 계획
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
                                  <Text fontSize="18" color="#666">총 장수 :</Text>
                                  <Text fontSize="18" color="#37C4B9" fontWeight="600">
                                    {calculationResult.totalChapters}장
                                  </Text>
                                </HStack>

                                <HStack justifyContent="space-between" alignItems="center">
                                  <Text fontSize="18" color="#666">하루목표 :</Text>
                                  <Text fontSize="18" color="#FF5722" fontWeight="700">
                                    {calculationResult.targetMinutesPerDay}분 (고정)
                                  </Text>
                                </HStack>

                                <HStack justifyContent="space-between" alignItems="center">
                                  <Text fontSize="18" color="#666">평균장수 :</Text>
                                  <Text fontSize="18" color="#37C4B9" fontWeight="600">
                                    약 {calculationResult.chaptersPerDayExact.toFixed(1)}장/일
                                  </Text>
                                </HStack>

                                <Text fontSize="14" color="#999" textAlign="center" mt={2}>
                                  ※ 매일 읽는 장수는 다를 수 있습니다
                                </Text>
                              </VStack>
                            </Box>
                        )}
                      </VStack>
                    </View>
                  </ScrollView>

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