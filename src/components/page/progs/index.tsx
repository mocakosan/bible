import { Box, HStack, Progress, VStack, Text, Pressable } from 'native-base';
import FooterLayout from '../../layout/footer/footer';
import BibleBackHeaderLayout from '../../layout/header/backHeader';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { ScrollView } from 'react-native';
import useSWR from 'swr';
import { bibleSetting, fetchSql } from '../../../utils';
import { loadBiblePlanData } from '../../../utils/biblePlanUtils';
import { useEffect, useState } from 'react';

export default function ProgressScreen() {
  const { color } = useBaseStyle();
  const { route, navigation } = useNativeNavigation();
  const [planData, setPlanData] = useState<any>(null);

  const selectSql = `SELECT * FROM 'reading_table' where read = 'true'`;

  const fetcher = async (url: string) => {
    const data = await fetchSql(bibleSetting, url, []);
    return data;
  };

  const { data } = useSWR(selectSql, fetcher);

  // 일독 계획 데이터 로드
  useEffect(() => {
    const existingPlan = loadBiblePlanData();
    if (existingPlan) {
      setPlanData(existingPlan);
    }
  }, []);

  // 구약 진도 계산
  const oldChapther = data?.filter((d: any) => d?.book <= 39).length;
  const oldPercent = (oldChapther / 929) * 100;

  // 신약 진도 계산
  const newChapther = data?.filter((d: any) => d?.book > 39).length;
  const newPercent = (newChapther / 260) * 100;

  // 모세오경 진도 계산 (창세기~신명기: 1~5번 책)
  const pentateuchChapters = data?.filter((d: any) => d?.book >= 1 && d?.book <= 5).length;
  const pentateuchPercent = (pentateuchChapters / 187) * 100; // 모세오경 총 187장

  // 시편 진도 계산 (시편: 19번 책)
  const psalmsChapters = data?.filter((d: any) => d?.book === 19).length;
  const psalmsPercent = (psalmsChapters / 150) * 100; // 시편 총 150장

  const dayPercent = (route.params?.parcent / route.params?.total) * 100;

  // 전체 학습장수 계산
  const totalChapters = data?.length ?? 0;
  const totalPercent = (totalChapters / 1189) * 100;

  // 설정된 일독 타입에 따른 강조 색상 반환
  const getBackgroundColor = (sectionType: string) => {
    if (!planData?.planType) return color.white;

    // 경과일수는 항상 민트색 (일독이 설정되어 있으면)
    if (sectionType === 'day') {
      return '#E8F8F7';
    }

    switch (planData.planType) {
      case 'full_bible':
        return sectionType === 'total' ? '#E8F8F7' : color.white;
      case 'old_testament':
        return sectionType === 'old' ? '#E8F8F7' : color.white;
      case 'new_testament':
        return sectionType === 'new' ? '#E8F8F7' : color.white;
      case 'pentateuch':
        return sectionType === 'pentateuch' ? '#E8F8F7' : color.white;
      case 'psalms':
        return sectionType === 'psalms' ? '#E8F8F7' : color.white;
      default:
        return color.white;
    }
  };

  // 클릭 시 성경일독 화면으로 이동
  const handleSectionClick = (sectionType: string) => {
    if (!planData?.planType) return;

    console.log('클릭된 섹션:', sectionType, '일독 타입:', planData.planType);

    // 경과일수는 항상 이동 가능 (첫 번째 탭으로)
    if (sectionType === 'day') {
      navigation.navigate('ReadingBibleScreen');
      return;
    }

    // 설정된 일독과 클릭한 섹션이 일치하는 경우 해당 화면으로 이동
    const shouldNavigate =
        (planData.planType === 'full_bible' && sectionType === 'total') ||
        (planData.planType === 'old_testament' && sectionType === 'old') ||
        (planData.planType === 'new_testament' && sectionType === 'new') ||
        (planData.planType === 'pentateuch' && sectionType === 'pentateuch') ||
        (planData.planType === 'psalms' && sectionType === 'psalms');

    console.log('이동 가능 여부:', shouldNavigate);

    if (shouldNavigate) {
      // ReadingBibleScreen으로 이동
      navigation.navigate('ReadingBibleScreen');
    }
  };

  // 섹션이 클릭 가능한지 확인
  const isClickable = (sectionType: string) => {
    if (!planData?.planType) return false;

    // 경과일수는 항상 클릭 가능
    if (sectionType === 'day') {
      return true;
    }

    return (
        (planData.planType === 'full_bible' && sectionType === 'total') ||
        (planData.planType === 'old_testament' && sectionType === 'old') ||
        (planData.planType === 'new_testament' && sectionType === 'new') ||
        (planData.planType === 'pentateuch' && sectionType === 'pentateuch') ||
        (planData.planType === 'psalms' && sectionType === 'psalms')
    );
  };

  return (
      <>
        <BibleBackHeaderLayout title={'진도현황'} />
        <ScrollView style={{ backgroundColor: color.white }}>
          {/* 경과일수 섹션 */}
          <Pressable
              onPress={() => handleSectionClick('day')}
              disabled={!isClickable('day')}
              _pressed={{ opacity: 0.7 }}
          >
            <VStack
                h={'90px'}
                borderBottomColor={color.status}
                borderBottomWidth={1}
                bg={getBackgroundColor('day')}
            >
              <HStack>
                <Box w={'75%'} bg="transparent">
                  <Text fontSize={19} marginTop={3} marginLeft={3} fontWeight={600}>
                    일독 경과일수 {route.params?.parcent || 0}/{route.params?.total || 0}
                  </Text>
                  <Progress
                      _filledTrack={{
                        bg: color.bible
                      }}
                      w={'60%'}
                      value={dayPercent ? dayPercent : 0}
                      marginTop={3}
                      marginLeft={3}
                  />
                </Box>

                <Box
                    w={'15%'}
                    height={'100%'}
                    flex={1}
                    justifyContent={'center'}
                    alignSelf={'center'}
                >
                  <Text fontSize={26} marginLeft={3} style={{ color: color.black }}>
                    {(dayPercent ? dayPercent.toFixed(1) : 0)}%
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Pressable>

          {/* 구약 진도 섹션 */}
          <Pressable
              onPress={() => handleSectionClick('old')}
              disabled={!isClickable('old')}
              _pressed={{ opacity: 0.7 }}
          >
            <VStack
                h={'90px'}
                borderBottomColor={color.status}
                borderBottomWidth={1}
                bg={getBackgroundColor('old')}
            >
              <HStack>
                <Box w={'75%'} bg="transparent">
                  <Text fontSize={19} marginTop={3} marginLeft={3} fontWeight={600}>
                    구약 {oldChapther || 0}/929
                  </Text>
                  <Progress
                      _filledTrack={{
                        bg: color.bible
                      }}
                      w={'60%'}
                      value={oldPercent}
                      marginTop={3}
                      marginLeft={3}
                  />
                </Box>

                <Box
                    w={'15%'}
                    height={'100%'}
                    flex={1}
                    justifyContent={'center'}
                    alignSelf={'center'}
                >
                  <Text fontSize={26} marginLeft={3} style={{ color: color.black }}>
                    {oldPercent ? oldPercent.toFixed(1) : 0}%
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Pressable>

          {/* 신약 진도 섹션 */}
          <Pressable
              onPress={() => handleSectionClick('new')}
              disabled={!isClickable('new')}
              _pressed={{ opacity: 0.7 }}
          >
            <VStack
                h={'90px'}
                borderBottomColor={color.status}
                borderBottomWidth={1}
                bg={getBackgroundColor('new')}
            >
              <HStack>
                <Box w={'75%'} bg="transparent">
                  <Text fontSize={19} marginTop={3} marginLeft={3} fontWeight={600}>
                    신약 {newChapther || 0}/260
                  </Text>
                  <Progress
                      _filledTrack={{
                        bg: color.bible
                      }}
                      w={'60%'}
                      value={newPercent}
                      marginTop={3}
                      marginLeft={3}
                  />
                </Box>

                <Box
                    w={'15%'}
                    height={'100%'}
                    flex={1}
                    justifyContent={'center'}
                    alignSelf={'center'}
                >
                  <Text fontSize={26} marginLeft={3} style={{ color: color.black }}>
                    {newPercent ? newPercent.toFixed(1) : 0}%
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Pressable>

          {/* 모세오경 진도 섹션 */}
          <Pressable
              onPress={() => handleSectionClick('pentateuch')}
              disabled={!isClickable('pentateuch')}
              _pressed={{ opacity: 0.7 }}
          >
            <VStack
                h={'90px'}
                borderBottomColor={color.status}
                borderBottomWidth={1}
                bg={getBackgroundColor('pentateuch')}
            >
              <HStack>
                <Box w={'75%'} bg="transparent">
                  <Text fontSize={19} marginTop={3} marginLeft={3} fontWeight={600}>
                    모세오경 {pentateuchChapters || 0}/187
                  </Text>
                  <Progress
                      _filledTrack={{
                        bg: color.bible
                      }}
                      w={'60%'}
                      value={pentateuchPercent}
                      marginTop={3}
                      marginLeft={3}
                  />
                </Box>

                <Box
                    w={'15%'}
                    height={'100%'}
                    flex={1}
                    justifyContent={'center'}
                    alignSelf={'center'}
                >
                  <Text fontSize={26} marginLeft={3} style={{ color: color.black }}>
                    {pentateuchPercent ? pentateuchPercent.toFixed(1) : 0}%
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Pressable>

          {/* 시편 진도 섹션 */}
          <Pressable
              onPress={() => handleSectionClick('psalms')}
              disabled={!isClickable('psalms')}
              _pressed={{ opacity: 0.7 }}
          >
            <VStack
                h={'90px'}
                borderBottomColor={color.status}
                borderBottomWidth={1}
                bg={getBackgroundColor('psalms')}
            >
              <HStack>
                <Box w={'75%'} bg="transparent">
                  <Text fontSize={19} marginTop={3} marginLeft={3} fontWeight={600}>
                    시편 {psalmsChapters || 0}/150
                  </Text>
                  <Progress
                      _filledTrack={{
                        bg: color.bible
                      }}
                      w={'60%'}
                      value={psalmsPercent}
                      marginTop={3}
                      marginLeft={3}
                  />
                </Box>

                <Box
                    w={'15%'}
                    height={'100%'}
                    flex={1}
                    justifyContent={'center'}
                    alignSelf={'center'}
                >
                  <Text fontSize={26} marginLeft={3} style={{ color: color.black }}>
                    {psalmsPercent ? psalmsPercent.toFixed(1) : 0}%
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Pressable>

          {/* 전체 학습장수 섹션 */}
          <Pressable
              onPress={() => handleSectionClick('total')}
              disabled={!isClickable('total')}
              _pressed={{ opacity: 0.7 }}
          >
            <VStack
                h={'90px'}
                borderBottomColor={color.status}
                borderBottomWidth={1}
                bg={getBackgroundColor('total')}
            >
              <HStack>
                <Box w={'75%'} bg="transparent">
                  <Text fontSize={19} marginTop={3} marginLeft={3} fontWeight={600}>
                    전체성경 {totalChapters}/1189
                  </Text>
                  <Progress
                      _filledTrack={{
                        bg: color.bible
                      }}
                      w={'60%'}
                      value={totalPercent}
                      marginTop={3}
                      marginLeft={3}
                  />
                </Box>

                <Box
                    w={'15%'}
                    height={'100%'}
                    flex={1}
                    justifyContent={'center'}
                    alignSelf={'center'}
                >
                  <Text fontSize={26} marginLeft={3} style={{ color: color.black }}>
                    {totalPercent ? totalPercent.toFixed(1) : 0}%
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Pressable>
        </ScrollView>
        <FooterLayout />
      </>
  );
}