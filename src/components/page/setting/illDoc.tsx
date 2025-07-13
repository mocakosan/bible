import {
  Box,
  Button,
  Checkbox,
  HStack,
  ScrollView,
  Slider,
  Text,
  useDisclose,
  VStack
} from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { navigationData } from '../../../utils/nav';
import Svg from '../../Svg';

import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { gFontTitle } from '../../../constant/global';
import { defaultStorage } from '../../../utils/mmkv';
import FooterLayout from '../../layout/footer/footer';
import BackHeaderLayout from '../../layout/header/backHeader';
import FontSelectModal from '../../modal/illDocFont';
import IlldocBackHeaderLayout from "../../layout/header/illdocBackHeader";

export default function IllDocSettingScreen() {
  const { color } = useBaseStyle();

  const { isOpen, onOpen, onClose } = useDisclose();

  const [fontChecked, setFontChecked] = useState<boolean>(false);

  const { navigation } = useNativeNavigation();

  const [fontStyle, setFontStyle] = useState<fontStateType>({
    name: gFontTitle,
    fontName: gFontTitle,
    size: 16,
    backgroundColor: 'white',
    fontColor: 'black',
    julColor: color.bible
  });

  // const mmkv = defaultStorage.getString('fontStyle');
  const mmkv = defaultStorage.getString('illDocFontStyle') ?? '';

  useEffect(() => {
    if (mmkv) {
      const result = JSON.parse(mmkv);
      setFontStyle(result);
      setFontChecked(result.julColor === color.bible ? false : true);
    }
  }, [mmkv]);

  const setCheckBoxData = (value: boolean) => {
    const fontInfo = defaultStorage.getString('illDocFontStyle') ?? '';
    setFontChecked(value);
    return defaultStorage.set(
      'illDocFontStyle',
      JSON.stringify({
        ...JSON.parse(fontInfo),
        ...activeCheckStyle[value ? 'bible' : 'white']
      })
    );
  };

  const findSvg = (name: string) => {
    return navigationData.find((data) => data.name === name)?.svg as any;
  };

  return (
    <>
      <FontSelectModal isOpen={isOpen} onClose={onClose} />
      <IlldocBackHeaderLayout
        title={'성경일독 환경설정'}
        onNavigate={() => navigation.navigate('BibleConectionScreen', {})}
      />
      <ScrollView>
        <Box bg={color.white} h={'100%'}>
          <Box w={'100%'} h={38} bg={color.status}>
            <Text marginTop={2} marginLeft={3} color={color.gray1}>
              일반 설정
            </Text>
          </Box>
          <FontSizeChangeArea
            color={color}
            defaultFont={JSON.parse(mmkv)}
            font={JSON.parse(mmkv).fontName}
          />
          <VStack h={70} borderBottomColor={color.status} borderBottomWidth={1}>
            <HStack>
              <Box w={'75%'} bg={color.white}>
                <Text
                  fontSize={16}
                  marginTop={3}
                  marginLeft={3}
                  fontWeight={600}
                >
                  글꼴
                </Text>
                <Text
                  fontSize={14}
                  marginLeft={5}
                  style={{ color: color.gray8 }}
                >
                  {fontStyle.name}
                </Text>
              </Box>

              <Box
                w={'15%'}
                height={'100%'}
                flex={1}
                justifyContent={'center'}
                alignSelf={'center'}
              >
                <Button
                  padding={0}
                  w={20}
                  h={10}
                  bg={color.bible}
                  onPress={onOpen}
                >
                  다른 글꼴
                </Button>
              </Box>
            </HStack>
          </VStack>
          <VStack h={70} borderBottomColor={color.status} borderBottomWidth={1}>
            <HStack>
              <Box w={'86%'} bg={color.white}>
                <Text
                  fontSize={16}
                  marginTop={3}
                  marginLeft={3}
                  fontWeight={600}
                >
                  조명선택
                </Text>
                <Text
                  fontSize={14}
                  marginLeft={5}
                  style={{ color: color.gray8 }}
                >
                  기본 색상 바탕에 흰 글자
                </Text>
              </Box>

              <Box
                w={'14%'}
                h={'100%'}
                flex={1}
                justifyContent={'center'}
                alignSelf={'baseline'}
              >
                <Checkbox
                  value=""
                  onChange={(event) => setCheckBoxData(event)}
                  isChecked={fontChecked}
                  colorScheme="info"
                >
                  {'     '}
                </Checkbox>
              </Box>
            </HStack>
          </VStack>
          <Box w={'100%'} h={38} bg={color.status}>
            <Text marginTop={2} marginLeft={3} color={color.gray1}>
              개인 설정
            </Text>
          </Box>
          <VStack h={70} borderBottomColor={color.status} borderBottomWidth={1}>
            <TouchableOpacity
              onPress={() =>
                // navigation.navigate('MenuListScreen', { name: '북마크' })
                navigation.navigate('BookMarkScreen', {})
              }
            >
              <HStack>
                <Box
                  w={'15%'}
                  flexDirection={'row'}
                  justifyContent={'center'}
                  alignSelf={'center'}
                >
                  <Svg width={23} height={23} Svg={findSvg('북마크')} />
                </Box>

                <Box w={'75%'} bg={color.white}>
                  <Text
                    fontSize={16}
                    marginTop={3}
                    marginLeft={3}
                    fontWeight={600}
                  >
                    북마크 보기
                  </Text>
                  <Text
                    fontSize={14}
                    marginLeft={3}
                    style={{ color: color.gray8 }}
                  >
                    북마크한 설정 페이지 목록 확인
                  </Text>
                </Box>
              </HStack>
            </TouchableOpacity>
          </VStack>
          <VStack h={70} borderBottomColor={color.status} borderBottomWidth={1}>
            <TouchableOpacity
              onPress={() => navigation.navigate('LightPenScreen', {})}
            >
              <HStack>
                <Box
                  w={'15%'}
                  flexDirection={'row'}
                  justifyContent={'center'}
                  alignSelf={'center'}
                >
                  <Svg width={22} height={22} Svg={findSvg('형광펜')} />
                </Box>
                <Box w={'75%'} bg={color.white}>
                  <Text
                    fontSize={16}
                    marginTop={3}
                    marginLeft={3}
                    fontWeight={600}
                  >
                    형광펜 보기
                  </Text>
                  <Text
                    fontSize={14}
                    marginLeft={3}
                    style={{ color: color.gray8 }}
                  >
                    형광펜으로 밑줄한 말씀 구절 확인
                  </Text>
                </Box>
              </HStack>
            </TouchableOpacity>
          </VStack>

          <VStack h={70} borderBottomColor={color.status} borderBottomWidth={1}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MalSumNoteScreen', {})}
            >
              <HStack>
                <Box
                  w={'15%'}
                  flexDirection={'row'}
                  justifyContent={'center'}
                  alignSelf={'center'}
                >
                  <Svg width={22} height={22} Svg={findSvg('말씀노트')} />
                </Box>
                <Box w={'75%'} bg={color.white}>
                  <Text
                    fontSize={16}
                    marginTop={3}
                    marginLeft={3}
                    fontWeight={600}
                  >
                    말씀노트 보기
                  </Text>
                  <Text
                    fontSize={14}
                    marginLeft={3}
                    style={{ color: color.gray8 }}
                  >
                    말씀노트 목록 확인
                  </Text>
                </Box>
              </HStack>
            </TouchableOpacity>
          </VStack>
          <VStack h={70} borderBottomColor={color.status} borderBottomWidth={1}>
            <TouchableOpacity
              onPress={
                () =>
                  navigation.navigate('ManualScreen', {
                    name: '말씀노트'
                  })
                // navigation.navigate('MalsumNoteScreen'), {})
              }
            >
              <HStack>
                <Box
                  w={'15%'}
                  flexDirection={'row'}
                  justifyContent={'center'}
                  alignSelf={'center'}
                >
                  <Svg width={22} height={22} Svg={findSvg('사용설명서')} />
                </Box>
                <Box w={'75%'} bg={color.white}>
                  <Text
                    fontSize={16}
                    marginTop={3}
                    marginLeft={3}
                    fontWeight={600}
                  >
                    사용자 설명서
                  </Text>
                  <Text
                    fontSize={14}
                    marginLeft={3}
                    style={{ color: color.gray8 }}
                  >
                    사용 방법과 기능을 소개합니다.
                  </Text>
                </Box>
              </HStack>
            </TouchableOpacity>
          </VStack>
        </Box>
      </ScrollView>

      <FooterLayout />
    </>
  );
}

const FontSizeChangeArea = ({
  color,
  font,
  defaultFont
}: {
  color: any;
  font: any;
  defaultFont: any;
}) => {
  const [fSize, setFSize] = useState(Number(defaultFont?.size) ?? 16);

  useEffect(() => {
    defaultStorage.set(
      'illDocFontStyle',
      JSON.stringify({ ...defaultFont, size: fSize })
    );
  }, [fSize]);

  return (
    <VStack h={90} borderBottomColor={color.status} borderBottomWidth={1}>
      <HStack>
        <Box w={'50%'} bg={color.white}>
          <Text fontSize={16} ml={3} mt={3} fontWeight={600}>
            글자 크기
          </Text>
          <Text
            fontSize={fSize}
            fontFamily={font}
            marginLeft={5}
            fontWeight={600}
          >
            성경(Bible)
          </Text>
        </Box>

        <Box>
          <Box
            w={'50%'}
            bg={color.white}
            flexDirection={'row'}
            justifyContent={'space-between'}
          >
            <TouchableOpacity
              onPress={() => {
                fSize > 16 && setFSize((pre: number) => pre - 1);
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
                fSize < 30 && setFSize((pre: number) => pre + 2);
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
  );
};

const activeCheckStyle = {
  white: {
    backgroundColor: '#fff',
    fontColor: '#000',
    julColor: '#2AC1BC'
  },
  bible: {
    backgroundColor: '#2AC1BC',
    fontColor: '#fff',
    julColor: '#fff'
  }
};
