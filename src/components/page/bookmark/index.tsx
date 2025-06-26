import { isEmpty } from 'lodash';
import {
  Box,
  Button,
  Center,
  Flex,
  HStack,
  ScrollView,
  Slider,
  Text,
  VStack
} from 'native-base';
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { useDispatch } from 'react-redux';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { bibleSetting, fetchSql } from '../../../utils';
import { groupObjectsByTwoCriteria } from '../../../utils/define';
import FooterLayout from '../../layout/footer/footer';

import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import { defaultStorage } from '../../../utils/mmkv';
import BackHeaderLayout from '../../layout/header/backHeader';

export default function BookMarkScreen() {
  const settingFontSize = JSON.parse(
    defaultStorage.getString('settingFontStyle')!
  ).size;
  const { color } = useBaseStyle();
  const { navigation, route } = useNativeNavigation();
  const dispatch = useDispatch();
  const [data, setData] = useState<any[]>([]);
  const [trigger, setTrigger] = useState<number>(1);
  const [fSize, setFSize] = useState<number>(settingFontSize);

  const selectSql = `SELECT book, jang, jul, bible, color, content, datetime, title FROM bible_setting WHERE type = 1`;

  const onLightNavigate = (book: number, jang: number, jul: string) => {
    defaultStorage.set('bible_book', book);
    defaultStorage.set('bible_jang', jang);
    navigation.navigate('BookMarkDetailScreen', { book, jang, jul });
  };

  useEffect(() => {
    fetchSql(bibleSetting, selectSql, []).then((res: any) => {
      setData(res);
    });
  }, [route, trigger]);

  const NotfoundComponent = () => {
    return (
      <Center marginTop={12}>
        <Text color={color.gray8}>{`저장된 북마크가 없습니다.`}</Text>
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
      // dispatch(
      //   bibleSelectSlice.actions.deleteQuery({
      //     book,
      //     jang,
      //     jul,
      //     type: 1
      //   })
      // );

      const delSql = `DELETE FROM bible_setting WHERE book = ${book} and jang = ${jang} and jul in(${jul}) and type = 1;`;
      fetchSql(bibleSetting, delSql, []).then(sucMessage).catch(errMessage);
    };

    useEffect(() => {
      defaultStorage.set('settingFontStyle', JSON.stringify({ size: fSize }));
    }, [fSize]);

    return (
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
                  onLightNavigate(
                    data[0].book,
                    data[0].jang,
                    String(data.map(({ jul }: any) => jul))
                  )
                }
              >
                <Box>
                  <Flex>
                    <HStack>
                      <Text
                        fontSize={fSize}
                        margin={1}
                        fontWeight={600}
                        w={'85%'}
                      >
                        {data[0].title}
                      </Text>
                      <FontAwesomeIcon
                        name="bookmark"
                        size={fSize + 8}
                        style={{
                          marginLeft: 2,
                          position: 'absolute',
                          top: 4,
                          right: 28
                        }}
                        color={data[0].color}
                      />
                    </HStack>
                    <Text
                      fontSize={fSize}
                      margin={1}
                      fontWeight={400}
                      color={'#464646'}
                    >
                      {`${data[0].bible} ${data[0].jang} : ${String(
                        data.map(({ jul }: any) => jul)
                      )}`}
                    </Text>
                    <Text fontSize={fSize - 4} margin={1} color={'#BCBCBC'}>
                      {data[0].datetime}
                    </Text>
                  </Flex>
                </Box>
              </TouchableOpacity>
              <Button
                bg={'#F68B87'}
                w={`${fSize + 23}px`}
                h={`${fSize + 10}px`}
                padding={0}
                marginTop={2}
              >
                <Text
                  fontSize={fSize - 2}
                  color={color.white}
                  onPress={() =>
                    onDeleteData(
                      data[0].book,
                      data[0].jang,
                      // data[0].jul
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
      <BackHeaderLayout title="북마크" />
      <ScrollView bg={color.white}>
        {isEmpty(data) ? <NotfoundComponent /> : <RenderComponent />}
      </ScrollView>
      <FooterLayout />
    </>
  );
}
