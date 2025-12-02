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
// import { indexSlice } from '../../../provider/redux/slice';
import { defaultStorage } from '../../../utils/mmkv';
import BackHeaderLayout from '../../layout/header/backHeader';

export default function MalSumNoteScreen() {
  const settingFontSize = JSON.parse(
    defaultStorage.getString('settingFontStyle')!
  ).size;
  const { color } = useBaseStyle();
  const { navigation, route } = useNativeNavigation();
  const dispatch = useDispatch();
  const [data, setData] = useState<any[]>([]);
  const [trigger, setTrigger] = useState<number>(1);
  const [fSize, setFSize] = useState<number>(settingFontSize);

  const selectSql = `SELECT bible, book, color, content, datetime, jang, jul, title FROM bible_setting WHERE type = 3`;

  useEffect(() => {
    fetchSql(bibleSetting, selectSql, []).then((res: any) => {
      setData(res);
    });
  }, [route, trigger]);

  const onNavigate = (
    book: number,
    jang: number,
    title: string,
    content: string
  ) => {
    navigation.navigate('MalSumNoteDetailScreen', {
      book,
      jang,
      title,
      content
    });
  };

  const NotfoundComponent = () => {
    return (
      <Center marginTop={12}>
        <Text color={color.gray8}>{`저장된 말씀노트가 없습니다.`}</Text>
      </Center>
    );
  };

  const RenderComponent = (): JSX.Element => {
    const sucMessage = () => {
      Toast.show({
        type: 'success',
        text1: '삭제하였습니다.'
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

    const onDeleteNote = (
      book: number,
      jang: number,
      title: string,
      content: string
    ) => {
      const delSql = `DELETE FROM bible_setting WHERE book =${book} and jang=${jang} and title ='${title}' and content = '${content}' and type = 3;`;

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
        {data.map(({ title, bible, content, book, jang, datetime }, index) => (
          <VStack
            minH={'100px'}
            maxH={'200px'}
            w={'100%'}
            borderBottomColor={color.status}
            borderBottomWidth={1}
            key={index * 11}
          >
            <HStack padding={1}>
              <TouchableOpacity
                style={{ width: '85%' }}
                onPress={() => {
                  onNavigate(book, jang, title, content);
                }}
              >
                <Box>
                  <Flex>
                    <Text fontSize={fSize} margin={1} fontWeight={600}>
                      {bible}({title})
                    </Text>
                    <Text
                      fontSize={fSize}
                      margin={1}
                      fontWeight={200}
                      color={'#464646'}
                      maxH={'100px'}
                    >
                      {content}
                    </Text>
                    <Text fontSize={fSize - 4} margin={1} color={'#BCBCBC'}>
                      {datetime}
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
                  onPress={() => onDeleteNote(book, jang, title, content)}
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
      <BackHeaderLayout title="말씀노트" />
      <ScrollView bg={color.white}>
        {isEmpty(data) ? <NotfoundComponent /> : <RenderComponent />}
      </ScrollView>
      <FooterLayout />
    </>
  );
}

const sliceText = (text: string, maxLeng: number) => {
  const new_txt =
    text.length > maxLeng ? `${text.substr(0, maxLeng + 1)}...` : text;
  return new_txt;
};
