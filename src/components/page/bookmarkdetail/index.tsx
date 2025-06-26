import { useIsFocused } from '@react-navigation/native';
import { isEmpty } from 'lodash';
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
import { TouchableOpacity } from 'react-native';
import { gBibleBook } from '../../../constant/global';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { BibleNewDB, fetchSql } from '../../../utils';
import { defaultStorage } from '../../../utils/mmkv';
import FooterLayout from '../../layout/footer/footer';
import BibleBackHeaderLayout from '../../layout/header/bibleBackHeader';

export default function BookMarkDetailScreen() {
  const settingFontSize = JSON.parse(
    defaultStorage.getString('settingFontStyle')!
  ).size;
  const { color } = useBaseStyle();
  const { navigation, route } = useNativeNavigation();
  const [data, setData] = useState<any>(null);
  const isFocused = useIsFocused();
  const [fSize, setFSize] = useState<number>(settingFontSize);

  const { book, jang, jul } = route.params as any;

  const onMainNavigate = (book: number, jang: number) => {
    console.log(Number(book), Number(jang));
    navigation.navigate('BibleScreen', {});
  };

  useEffect(() => {
    try {
      const dataSelectSql = `SELECT content, jul FROM bible_${book} WHERE type = '${gBibleBook}' and jang=${jang} and jul in (${jul})`;
      fetchSql(BibleNewDB, dataSelectSql, []).then((res: any) => {
        setData(res);
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
      <BibleBackHeaderLayout title="북마크" />
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

      {!isEmpty(data) ? (
        <>
          <ScrollView bg={color.white}>
            {data?.map(({ content, jul }: { content: string; jul: number }) => (
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
            ))}
          </ScrollView>
          <Button
            w={'100%'}
            borderRadius={0}
            bg={color.bible}
            onPress={() => onMainNavigate(book, jang)}
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
