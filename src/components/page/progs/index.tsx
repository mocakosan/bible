import { Box, HStack, Progress, VStack, Text } from 'native-base';
import FooterLayout from '../../layout/footer/footer';
import BibleBackHeaderLayout from '../../layout/header/backHeader';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { ScrollView } from 'react-native';
import useSWR from 'swr';
import { bibleSetting, fetchSql } from '../../../utils';

export default function ProgressScreen() {
  const { color } = useBaseStyle();

  const { route } = useNativeNavigation();

  const selectSql = `SELECT * FROM 'reading_table' where read = 'true'`;

  const fetcher = async (url: string) => {
    const data = await fetchSql(bibleSetting, url, []);

    return data;
  };

  const { data } = useSWR(selectSql, fetcher);

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

  return (
      <>
        <BibleBackHeaderLayout title={'진도현황'} />
        <ScrollView style={{ backgroundColor: color.white }}>
          {/* 경과일수 섹션 */}
          <VStack
              h={'90px'}
              borderBottomColor={color.status}
              borderBottomWidth={1}
          >
            <HStack>
              <Box w={'75%'} bg={color.white}>
                <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
                  경과일수 {route.params?.parcent || 0}/{route.params?.total || 0}
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

                <Text fontSize={14} marginLeft={3} style={{ color: color.bible }}>
                  {dayPercent ? dayPercent.toFixed(1) : 0}%
                </Text>
              </Box>

              <Box
                  w={'15%'}
                  height={'100%'}
                  flex={1}
                  justifyContent={'center'}
                  alignSelf={'center'}
              >
                <Text fontSize={20} marginLeft={3} style={{ color: color.black }}>
                  {(dayPercent ? dayPercent.toFixed(1) : 0)}%
                </Text>
              </Box>
            </HStack>
          </VStack>

          {/* 구약 진도 섹션 */}
          <VStack
              h={'90px'}
              borderBottomColor={color.status}
              borderBottomWidth={1}
          >
            <HStack>
              <Box w={'75%'} bg={color.white}>
                <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
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

                <Text fontSize={14} marginLeft={3} style={{ color: color.bible }}>
                  {oldChapther || 0}
                </Text>
              </Box>

              <Box
                  w={'15%'}
                  height={'100%'}
                  flex={1}
                  justifyContent={'center'}
                  alignSelf={'center'}
              >
                <Text fontSize={20} marginLeft={3} style={{ color: color.black }}>
                  {oldPercent ? oldPercent.toFixed(1) : 0}%
                </Text>
              </Box>
            </HStack>
          </VStack>

          {/* 신약 진도 섹션 */}
          <VStack
              h={'90px'}
              borderBottomColor={color.status}
              borderBottomWidth={1}
          >
            <HStack>
              <Box w={'75%'} bg={color.white}>
                <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
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

                <Text fontSize={14} marginLeft={3} style={{ color: color.bible }}>
                  {newChapther || 0}
                </Text>
              </Box>

              <Box
                  w={'15%'}
                  height={'100%'}
                  flex={1}
                  justifyContent={'center'}
                  alignSelf={'center'}
              >
                <Text fontSize={20} marginLeft={3} style={{ color: color.black }}>
                  {newPercent ? newPercent.toFixed(1) : 0}%
                </Text>
              </Box>
            </HStack>
          </VStack>

          {/* 모세오경 진도 섹션 */}
          <VStack
              h={'90px'}
              borderBottomColor={color.status}
              borderBottomWidth={1}
          >
            <HStack>
              <Box w={'75%'} bg={color.white}>
                <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
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

                <Text fontSize={14} marginLeft={3} style={{ color: color.bible }}>
                  {pentateuchChapters || 0}
                </Text>
              </Box>

              <Box
                  w={'15%'}
                  height={'100%'}
                  flex={1}
                  justifyContent={'center'}
                  alignSelf={'center'}
              >
                <Text fontSize={20} marginLeft={3} style={{ color: color.black }}>
                  {pentateuchPercent ? pentateuchPercent.toFixed(1) : 0}%
                </Text>
              </Box>
            </HStack>
          </VStack>

          {/* 시편 진도 섹션 */}
          <VStack
              h={'90px'}
              borderBottomColor={color.status}
              borderBottomWidth={1}
          >
            <HStack>
              <Box w={'75%'} bg={color.white}>
                <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
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

                <Text fontSize={14} marginLeft={3} style={{ color: color.bible }}>
                  {psalmsChapters || 0}
                </Text>
              </Box>

              <Box
                  w={'15%'}
                  height={'100%'}
                  flex={1}
                  justifyContent={'center'}
                  alignSelf={'center'}
              >
                <Text fontSize={20} marginLeft={3} style={{ color: color.black }}>
                  {psalmsPercent ? psalmsPercent.toFixed(1) : 0}%
                </Text>
              </Box>
            </HStack>
          </VStack>

          {/* 전체 학습장수 섹션 */}
          <VStack
              h={'90px'}
              borderBottomColor={color.status}
              borderBottomWidth={1}
          >
            <HStack>
              <Box w={'75%'} bg={color.white}>
                <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
                  학습장수 {totalChapters}/1189
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

                <Text fontSize={14} marginLeft={3} style={{ color: color.bible }}>
                  {totalChapters}
                </Text>
              </Box>

              <Box
                  w={'15%'}
                  height={'100%'}
                  flex={1}
                  justifyContent={'center'}
                  alignSelf={'center'}
              >
                <Text fontSize={20} marginLeft={3} style={{ color: color.black }}>
                  {totalPercent ? totalPercent.toFixed(1) : 0}%
                </Text>
              </Box>
            </HStack>
          </VStack>
        </ScrollView>
        <FooterLayout />
      </>
  );
}