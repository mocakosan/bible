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
import SectionHeaderLayout from '../../layout/header/sectionHeader';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { useEffect, useState } from 'react';
import { BibleNewDB, bibleSetting, defineSQL, fetchSql } from '../../../utils';
import { isEmpty } from 'lodash';
import { useIsFocused } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import BackHeaderLayout from '../../layout/header/backHeader';
import { gBibleBook } from '../../../constant/global';
import { defaultStorage } from '../../../utils/mmkv';

export default function MenuDetailScreen() {
  const { color } = useBaseStyle();

  const { navigation, route } = useNativeNavigation();

  const [data, setData] = useState<any>(null);
  const [trigger] = useState<boolean>(false);

  const isFocused = useIsFocused();

  const onMainNavigate = () => {
    const { book, jang } = route.params as any;

    defaultStorage.set('bible_book', Number(book));
    defaultStorage.set('bible_jang', Number(jang));
    /*  dispatch(indexSlice.actions.change({ BOOK: data?.book, JANG: data?.jang })); */

    navigation.navigate('BibleScreen', {});
  };

  useEffect(() => {
    switch (route.params?.name ?? '') {
      case '북마크':
        (async () => {
          const { book, jang, id, jul } = route.params as any;

          const selectSql = `${defineSQL(['*'], 'SELECT', 'bible_setting', {
            WHERE: { id: '?', type: '?' }
          })}`;

          const dataSelectSql = `SELECT content, jul FROM bible_${book} WHERE type = '${gBibleBook}' and jang=${jang} and jul in (${jul})`;

          try {
            const result = await fetchSql(bibleSetting, selectSql, [id, 2], 0);
            const contents = await fetchSql(BibleNewDB, dataSelectSql, []);

            setData({ ...result, contents });
          } catch (err) {
            console.log(err);
          }
        })();
        break;
      case '형광펜':
        break;
      case '말씀노트':
        (async () => {
          const { book, jang, id } = route.params as any;

          const selectSql = `${defineSQL(['*'], 'SELECT', 'bible_setting', {
            WHERE: { id: '?', type: '?' }
          })}`;

          try {
            fetchSql(bibleSetting, selectSql, [id, 3], 0).then(async (res) => {
              const { bible } = res;
              const dataSelectSql = `SELECT content, jul FROM bible_${book} WHERE type = '${gBibleBook}' and jang=${jang} and jul in (${bible})`;
              const result = await fetchSql(BibleNewDB, dataSelectSql, []);

              setData({ ...res, contents: result });
            });
          } catch (err) {
            console.log(err);
          }
        })();
        break;
      case '즐겨찾기':
        break;
      default:
        break;
    }
    isFocused && setData(null);
  }, [isFocused, route]);

  return (
    <>
      <BackHeaderLayout title="형광펜" />

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
                fontWeight={200}
                color={'#464646'}
              >
                {data?.title}
              </Text>
            </HStack>
          </VStack>
          <ScrollView bg={color.white}>
            <Text fontSize={'16px'} margin={4} fontWeight={700}>
              {data?.bible} {data?.jang}장
            </Text>
            {data?.contents?.map(
              ({ content, jul }: { content: string; jul: number }) => (
                <VStack marginBottom={2} key={content}>
                  <HStack alignSelf={'center'} w={'94%'}>
                    <Text
                      style={{ color: color.bible }}
                      fontSize={'16px'}
                      fontWeight={900}
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
