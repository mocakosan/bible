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

export default function MenuListScreen() {
  const { color } = useBaseStyle();

  const { navigation, route } = useNativeNavigation();

  const dispatch = useDispatch();

  const [data, setData] = useState<any[]>([]);

  const [trigger, setTrigger] = useState<number>(1);

  const selectSql = `${defineSQL(['*'], 'SELECT', 'bible_setting', {
    WHERE: { type: '?' }
  })}`;

  const onNavigate = (
    name: string,
    _id: string,
    book: string,
    jang: string,
    dname: string,
    jul?: string
  ) => {
    navigation.navigate('MenuDetailScreen', {
      name,
      _id,
      book,
      jang,
      dname,
      jul
    });
  };

  const onLightNavigate = (book: number, jang: number) => {
    defaultStorage.set('bible_book', book);
    defaultStorage.set('bible_jang', jang);

    // dispatch(indexSlice.actions.change({ BOOK: book, JANG: jang }));
    navigation.navigate('BibleScreen', {});
  };

  /**
   * @type {북마크 = 1 형광펜 = 2  말씀노트 = 3 즐겨찾기 = 4 }
   */
  useEffect(() => {
    switch (route.params?.name ?? '') {
      case '북마크':
        fetchSql(bibleSetting, selectSql, [1]).then((res: any) => {
          setData(res);
        });
        break;
      case '형광펜':
        fetchSql(bibleSetting, selectSql, [2]).then((res: any) => {
          setData(res);
        });
        break;
      case '말씀노트':
        fetchSql(bibleSetting, selectSql, [3]).then((res: any) => {
          setData(res);
        });
        break;
      case '즐겨찾기':
        fetchSql(bibleSetting, selectSql, [4]).then((res: any) => {
          setData(res);
        });
        break;
      default:
        break;
    }
  }, [route, trigger]);

  const NotfoundComponent = () => {
    const name = String(route.params?.name).includes('형광펜')
      ? `${route.params?.name}이`
      : `${route.params?.name}가`;

    return (
      <Center marginTop={12}>
        <Text color={color.gray8}>{`저장된 ${name} 없습니다.`}</Text>
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

    switch (route.params?.name ?? '') {
      case '형광펜':
        const groupedbook = groupObjectsByTwoCriteria(
          data,
          'book',
          'jang',
          'color'
        );

        const onDeleteBook = (jul: string) => {
          const delSql = `DELETE FROM bible_setting WHERE jul in(${jul}) and type = 2;`;

          fetchSql(bibleSetting, delSql, []).then(sucMessage).catch(errMessage);
        };

        return (
          <>
            {Object.values(groupedbook)?.map((data: any, index) => (
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
                        data[0]._id,
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
                          {`${BibleStep[data[0].book - 1].name} ${
                            data[0].jang
                          } : ${String(data.map(({ jul }: any) => jul))}`}
                        </Text>
                        <Text fontSize={'12px'} margin={1} color={'#BCBCBC'}>
                          {dayjs(data[0].is_time).format('YYYY-MM-DD')}
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
                        onDeleteBook(String(data.map(({ jul }: any) => jul)))
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
      case '북마크':
        const groupedlight = groupObjectsByTwoCriteria(
          data,
          'book',
          'jang',
          'color'
        );

        const onDeleteLight = (jul: string) => {
          const delSql = `DELETE FROM bible_setting WHERE jul in(${jul}) and type = 1;`;

          fetchSql(bibleSetting, delSql, []).then(sucMessage).catch(errMessage);
        };

        return (
          <>
            {Object.values(groupedlight)?.map((data: any, index) => (
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
                    onPress={() => onLightNavigate(data[0].book, data[0].jang)}
                  >
                    <Box>
                      <Flex>
                        <HStack>
                          <Text
                            //backgroundColor={'red.100'}
                            fontSize={'16px'}
                            margin={1}
                            fontWeight={600}
                            w={'85%'}
                          >
                            {String(data[0].title).trim()}
                          </Text>
                          <FontAwesomeIcon
                            // backgroundColor={'red.100'}
                            name="bookmark"
                            size={24}
                            style={{
                              marginLeft: 2,
                              position: 'absolute',
                              top: 4,
                              right: 28
                            }}
                            color={data[0].color}
                          />
                          {/* <Box
                            bg={data[0].color}
                            borderRadius={'50'}
                            marginTop={'10px'}
                            w={'12px'}
                            h={'12px'}
                          /> */}
                        </HStack>
                        <Text
                          fontSize={'16px'}
                          margin={1}
                          fontWeight={400}
                          color={'#464646'}
                        >
                          {`${BibleStep[data[0].book - 1].name} ${
                            data[0].jang
                          } : ${String(data.map(({ jul }: any) => jul))}`}
                        </Text>
                        <Text fontSize={'12px'} margin={1} color={'#BCBCBC'}>
                          {dayjs(data[0].is_time).format('YYYY-MM-DD')}
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
                        onDeleteLight(String(data.map(({ jul }: any) => jul)))
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

      case '말씀노트':
        const onDeleteNote = (book: string, jang: string) => {
          const delSql = `DELETE FROM bible_setting WHERE book =${book} and jang =${jang} and type = 3;`;

          fetchSql(bibleSetting, delSql, []).then(sucMessage).catch(errMessage);
        };

        return (
          <>
            {data.map(({ title, book, jang, is_time, _id }, index) => (
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
                        '말씀노트',
                        _id,
                        book,
                        jang,
                        dayjs(is_time).format('YYYY-MM-DD 작성')
                      )
                    }
                  >
                    <Box>
                      <Flex>
                        <Text fontSize={'16px'} margin={1} fontWeight={600}>
                          {BibleStep[book - 1].name} {jang}장
                        </Text>
                        <Text
                          fontSize={'16px'}
                          margin={1}
                          fontWeight={200}
                          color={'#464646'}
                        >
                          {title}
                        </Text>
                        <Text fontSize={'12px'} margin={1} color={'#BCBCBC'}>
                          {dayjs(is_time).format('YYYY-MM-DD')}
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
                      onPress={() => onDeleteNote(book, jang)}
                    >
                      삭제
                    </Text>
                  </Button>
                </HStack>
              </VStack>
            ))}
          </>
        );

      case '즐겨찾기':
        return <></>;

      default:
        return <></>;
    }
  };

  return (
    <>
      <BackHeaderLayout title={route.params?.name ?? ''} />

      <ScrollView bg={color.white}>
        {isEmpty(data) ? <NotfoundComponent /> : <RenderComponent />}
      </ScrollView>
      <FooterLayout />
    </>
  );
}
