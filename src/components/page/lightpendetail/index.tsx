import {
  HStack,
  ScrollView,
  VStack,
  Text,
  Button,
  Menu,
  Box
} from 'native-base';
import FooterLayout from '../../layout/footer/footer';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { useEffect, useState } from 'react';
import { BibleNewDB, bibleSetting, defineSQL, fetchSql } from '../../../utils';
import { BibleStep } from '../../../utils/define';
import { isEmpty } from 'lodash';
import { useIsFocused } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import BackHeaderLayout from '../../layout/header/backHeader';
import { gBibleBook } from '../../../constant/global';
import { defaultStorage } from '../../../utils/mmkv';
import {useSafeAreaInsets} from "react-native-safe-area-context";

//사용안함
export default function LightPenDetailScreen() {
  const { color } = useBaseStyle();

  const { navigation, route } = useNativeNavigation();

  const dispatch = useDispatch();

  const [data, setData] = useState<any>(null);
  const [trigger] = useState<boolean>(false);

  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const onMainNavigate = () => {
    defaultStorage.set('bible_book', data?.book);
    defaultStorage.set('bible_jang', data?.jang);
    // dispatch(indexSlice.actions.change({ BOOK: data?.book, JANG: data?.jang }));
    navigation.navigate('BibleScreen', {});
  };

  const { id, title, content } = route.params as any;

  useEffect(() => {
    const sqlQuery = `SELECT bible, content, title, book, jang, title FROM bible_setting WHERE id = ${id};`;
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

  return (
    <>
      <BackHeaderLayout title="말씀노트" />

      {!isEmpty(data) ? (
        <>
          <VStack
            minH={'0px'}
            borderBottomColor={color.status}
            borderBottomWidth={1}
          >
            <HStack padding={3} bg={color.white}>
              <Text
                fontSize={'16px'}
                margin={1}
                fontWeight={900}
                color={color.bible}
              >
                {data?.content}
              </Text>
            </HStack>
          </VStack>
          <ScrollView bg={color.white} contentContainerStyle={{
            paddingBottom: insets.bottom
          }}>
            <Text fontSize={'16px'} margin={4} fontWeight={700}>
              {data?.bible} {data?.jang}장( {data?.title} )
            </Text>
            {data?.contents?.map(
              ({ content, jul }: { content: string; jul: number }) => (
                <VStack marginBottom={2} key={content}>
                  <HStack alignSelf={'center'} w={'94%'}>
                    <Text
                      style={{ color: color.bible }}
                      fontSize={'16px'}
                      fontWeight={900}
                      marginTop={1}
                    >
                      {jul}
                    </Text>
                    <Text fontSize={'16px'} margin={1}>
                      {content}
                    </Text>
                  </HStack>
                </VStack>
              )
            )}
          </ScrollView>
          <Button
            w={'100%'}
            borderRadius={0}
            bg={color.bible}
            onPress={onMainNavigate}
            marginBottom={insets.bottom}
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
