import {
  Box,
  Button,
  Center,
  Flex,
  HStack,
  ScrollView,
  Text,
  VStack
} from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import FooterLayout from '../../layout/footer/footer';
import SectionHeaderLayout from '../../layout/header/sectionHeader';
import { TouchableOpacity } from 'react-native';
import { bibleSetting, defineSQL, fetchSql } from '../../../utils';
import { useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import { BibleStep, groupObjectsByTwoCriteria } from '../../../utils/define';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';

import BackHeaderLayout from '../../layout/header/backHeader';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import { defaultStorage } from '../../../utils/mmkv';

export default function LightPenScreen() {
  const { color } = useBaseStyle();
  const { navigation, route } = useNativeNavigation();
  const dispatch = useDispatch();
  const [data, setData] = useState<any[]>([]);
  const [trigger, setTrigger] = useState<number>(1);

  const selectSql = `SELECT bible, book, color, content, datetime, jang, jul, title FROM bible_setting WHERE type = 2`;

  const onNavigate = (
    name: string,
    _id: string,
    book: string,
    jang: string,
    dname: string,
    jul?: string
  ) => {
    defaultStorage.set('bible_book', book);
    defaultStorage.set('bible_jang', jang);
    // dispatch(indexSlice.actions.change({ BOOK: book, JANG: jang }));
    navigation.navigate('BibleScreen', {});
    // navigation.navigate('MenuDetailScreen', {
    //   name,
    //   _id,
    //   book,
    //   jang,
    //   dname,
    //   jul
    // });
  };

  const onLightNavigate = (book: number, jang: number) => {
    defaultStorage.set('bible_book', book);
    defaultStorage.set('bible_jang', jang);
    // dispatch(indexSlice.actions.change({ BOOK: book, JANG: jang }));
    navigation.navigate('BibleScreen', {});
  };

  useEffect(() => {
    fetchSql(bibleSetting, selectSql, []).then((res: any) => {
      setData(res);
    });
  }, [route, trigger]);

  const NotfoundComponent = () => {
    return (
      <Center marginTop={12}>
        <Text color={color.gray8}>{`저장된 형광펜이 없습니다.`}</Text>
      </Center>
    );
  };

  const RenderComponent = (): JSX.Element => {
    const sucMessage = () => {
      Toast.show({
        type: 'success',
        text1: '성공했습니다.'
      });
      setTrigger((pre) => pre + 1);
    };

    const errMessage = () => {
      Toast.show({
        type: 'error',
        text1: '실패했습니다.'
      });
    };

    const totalData = groupObjectsByTwoCriteria(data, 'book', 'jang', 'color');

    const onDeleteData = (book: string, jang: string, jul: string) => {
      const delSql = `DELETE FROM bible_setting WHERE book = ${book} and jang = ${jang} and jul in(${jul}) and type = 2;`;
      fetchSql(bibleSetting, delSql, []).then(sucMessage).catch(errMessage);
    };

    return (
      <>
        {Object.values(totalData)?.map((data: any, index) => (
          <VStack
            minH={'100px'}
            w={'100%'}
            borderBottomColor={color.status}
            borderBottomWidth={1}
            key={index * 11}
          >
            <HStack padding={1}>
              <TouchableOpacity
                style={{ width: '85%' }}
                onPress={() =>
                  onNavigate(
                    '북마크',
                    data[0].id,
                    data[0].book,
                    data[0].jang,
                    `${BibleStep[data[0].book - 1].name} ${data[0].jang}장`,
                    String(data.map(({ jul }: any) => jul))
                  )
                }
              >
                <Box>
                  <Flex>
                    <HStack>
                      <Text fontSize={'16px'} margin={1} fontWeight={600}>
                        {data[0].title}
                      </Text>
                      <Box
                        bg={data[0].color}
                        borderRadius={'50'}
                        marginTop={'10px'}
                        w={'12px'}
                        h={'12px'}
                      />
                    </HStack>
                    <Text
                      fontSize={'16px'}
                      margin={1}
                      fontWeight={400}
                      color={'#464646'}
                    >
                      {`${data[0].bible} ${data[0].jang} : ${String(
                        data.map(({ jul }: any) => jul)
                      )}`}
                    </Text>
                    <Text fontSize={'12px'} margin={1} color={'#BCBCBC'}>
                      {data[0].datetime}
                    </Text>
                  </Flex>
                </Box>
              </TouchableOpacity>
              <Button
                bg={'#F68B87'}
                w={'39px'}
                h={'26px'}
                padding={0}
                marginTop={2}
              >
                <Text
                  fontSize={'14px'}
                  color={color.white}
                  onPress={() =>
                    onDeleteData(
                      data[0].book,
                      data[0].jang,
                      String(data.map(({ jul }: any) => jul))
                    )
                  }
                >
                  삭제
                </Text>
              </Button>
            </HStack>
          </VStack>
        ))}
      </>
    );
  };

  return (
    <>
      <BackHeaderLayout title="형광펜" />
      <ScrollView bg={color.white}>
        {isEmpty(data) ? <NotfoundComponent /> : <RenderComponent />}
      </ScrollView>
      <FooterLayout />
    </>
  );
}
