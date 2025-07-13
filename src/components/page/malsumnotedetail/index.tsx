import {
  Box,
  Button,
  HStack,
  ScrollView,
  Slider,
  Text,
  VStack
} from 'native-base';
import { useEffect, useState } from 'react';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { BibleNewDB, bibleSetting, fetchSql } from '../../../utils';

import { useIsFocused } from '@react-navigation/native';
import { isEmpty } from 'lodash';
import { TouchableOpacity } from 'react-native';
import { gBibleBook } from '../../../constant/global';
import { defaultStorage } from '../../../utils/mmkv';
import FooterLayout from '../../layout/footer/footer';
import BackHeaderLayout from '../../layout/header/backHeader';

export default function MalSumNoteDetailScreen() {
  const settingFontSize = JSON.parse(
    defaultStorage.getString('settingFontStyle')!
  ).size;
  const fontStyle = JSON.parse(defaultStorage.getString('fontStyle') ?? '');
  const { color } = useBaseStyle();
  const { navigation, route } = useNativeNavigation();
  const [data, setData] = useState<any>(null);
  const isFocused = useIsFocused();
  const [fSize, setFSize] = useState<number>(settingFontSize);

  const onMainNavigate = () => {
    defaultStorage.set('bible_book', data?.book);
    defaultStorage.set('bible_jang', data?.jang);
    navigation.navigate('BibleScreen', {});
  };

  const { book, jang, title, content } = route.params as any;

  useEffect(() => {
    const sqlQuery = `SELECT bible, content, title, book, jang, title FROM bible_setting WHERE book = ${book} and jang =${jang} and type = 3;`;
    try {
      fetchSql(bibleSetting, sqlQuery, [], 0).then(async (res) => {
        const { bible, title, content, book, jang } = res;

        const dataSelectSql = `SELECT content, jul FROM bible_${book} WHERE type = '${gBibleBook}' and jang=${jang} and jul in (${title})`;
        const result = await fetchSql(BibleNewDB, dataSelectSql, []);

        setData({ ...res, contents: result });
      });
    } catch (err) {
      console.log(err);
    }
    isFocused && setData(null);
  }, [isFocused, route]);

  useEffect(() => {
    defaultStorage.set('settingFontStyle', JSON.stringify({ size: fSize }));
  }, [fSize]);

  return (
    <>
      <BackHeaderLayout title="말씀노트" />

      {!isEmpty(data) ? (
        <>
          <VStack
            h={90}
            borderBottomColor={color.status}
            borderBottomWidth={1}
            ml={3}
          >
            <HStack>
              <Box>
                <Box
                  w={'50%'}
                  bg={color.white}
                  flexDirection={'row'}
                  justifyContent={'space-between'}
                >
                  <TouchableOpacity
                    onPress={() => {
                      fSize >= 16 && setFSize((pre: number) => pre - 1);
                    }}
                  >
                    <Text
                      marginTop={3}
                      fontSize={18}
                      style={{ color: color.bible }}
                      fontWeight={900}
                    >
                      작게
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      fSize <= 30 && setFSize((pre: number) => pre + 2);
                    }}
                  >
                    <Text
                      marginTop={3}
                      fontSize={18}
                      style={{ color: color.bible }}
                      fontWeight={900}
                    >
                      크게
                    </Text>
                  </TouchableOpacity>
                </Box>
                <Slider
                  w="50%"
                  minValue={16}
                  maxValue={30}
                  bg={color.white}
                  accessibilityLabel="set"
                  step={1}
                  height={'30px'}
                  value={fSize}
                >
                  <Slider.Track>
                    <Slider.FilledTrack bg={color.bible} />
                  </Slider.Track>
                </Slider>
              </Box>
            </HStack>
          </VStack>

          <ScrollView bg={color.white}>
            <Text fontSize={fSize} margin={4} fontWeight={700}>
              {data?.bible}( {data?.title} )
            </Text>
            {data?.contents?.map(
              ({ content, jul }: { content: string; jul: number }) => (
                <VStack marginBottom={2} key={content}>
                  <HStack alignSelf={'center'} w={'94%'}>
                    <Text
                      style={{ color: color.bible }}
                      fontSize={fSize}
                      fontWeight={900}
                      marginTop={1}
                    >
                      {jul}
                    </Text>
                    <Text fontSize={fSize} margin={1}>
                      {content}
                    </Text>
                  </HStack>
                </VStack>
              )
            )}
            <VStack
              minH={'0px'}
              borderTopColor={color.status}
              borderTopWidth={1}
            >
              <HStack padding={3} bg={color.white}>
                <Text
                  fontSize={fontStyle?.size}
                  margin={1}
                  fontWeight={900}
                  color={color.bible}
                >
                  {data?.content}
                </Text>
              </HStack>
            </VStack>
          </ScrollView>
          <Button
            w={'100%'}
            borderRadius={0}
            bg={color.bible}
            onPress={onMainNavigate}
          >
            본문보기
          </Button>
        </>
      ) : (
        <ScrollView />
      )}
      <FooterLayout />
    </>
  );
}
