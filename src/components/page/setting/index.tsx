import { useIsFocused } from '@react-navigation/native';
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
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { gFontTitle } from '../../../constant/global';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { defaultStorage } from '../../../utils/mmkv';
import { navigationData } from '../../../utils/nav';
import FooterLayout from '../../layout/footer/footer';
import BackHeaderLayout from '../../layout/header/backHeader';
import FontSelectModal from '../../modal/font';
import SvgComponent from '../../Svg';

export default function SettingScreen() {
  const { color } = useBaseStyle();

  const { isOpen, onOpen, onClose } = useDisclose();

  const [fontChecked, setFontChecked] = useState<boolean>(false);

  const { navigation } = useNativeNavigation();

  const isFocused = useIsFocused();

  const [fontStyle, setFontStyle] = useState<fontStateType>({
    name: gFontTitle,
    fontName: gFontTitle,
    size: 16,
    backgroundColor: 'white',
    fontColor: 'black',
    julColor: '#2AC1BC'
  });

  const mmkv = defaultStorage.getString('fontStyle') ?? '';

  useEffect(() => {
    if (mmkv) {
      const result = JSON.parse(mmkv);
      setFontStyle(result);
      setFontChecked(result.julColor === color.bible ? false : true);
    }
  }, [mmkv]);

  const setCheckBoxData = (value: boolean) => {
    const fontInfo = defaultStorage.getString('fontStyle') ?? '';
    setFontChecked(value);
    return defaultStorage.set(
        'fontStyle',
        JSON.stringify({
          ...JSON.parse(fontInfo),
          ...activeCheckStyle[value ? 'bible' : 'white']
        })
    );
  };

  const findSvg = (name: string) => {
    const foundItem = navigationData.find((data) => data.name === name);
    return foundItem?.svg || null; // Return null instead of undefined if not found
  };

  return (
      <>
        <FontSelectModal isOpen={isOpen} onClose={onClose} />
        <BackHeaderLayout
            title={'성경 환경설정'}
            onNavigate={() => {
              // navigation.replace('BibleScreen', {});
              navigation.navigate('BibleScreen', {});
            }}
        />
        <ScrollView>
          <Box bg={color.white} h={'100%'}>
            <Box w={'100%'} h={38} bg={color.status}>
              <Text marginTop={2} marginLeft={3} color={color.gray1}>
                일반 설정
              </Text>
            </Box>
            <SizeChangeArea
                color={color}
                defaultFont={JSON.parse(mmkv)}
                font={JSON.parse(mmkv).fontName}
            />
            <FamilyChangeArea
                setOpen={onOpen}
                name={fontStyle.name}
                color={color}
            />
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
                      _pressed={{ bg: color.white }}
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
                    {/* Check if SVG exists before rendering */}
                    {findSvg('북마크') && (
                        <SvgComponent width={23} height={23} Svg={findSvg('북마크')} />
                    )}
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
                    {/* Check if SVG exists before rendering */}
                    {findSvg('형광펜') && (
                        <SvgComponent width={22} height={22} Svg={findSvg('형광펜')} />
                    )}
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
                    {/* Check if SVG exists before rendering */}
                    {findSvg('말씀노트') && (
                        <SvgComponent width={22} height={22} Svg={findSvg('말씀노트')} />
                    )}
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
                    {/* Check if SVG exists before rendering */}
                    {findSvg('사용설명서') && (
                        <SvgComponent width={22} height={22} Svg={findSvg('사용설명서')} />
                    )}
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

// !!!!!!!!!!!!!!!!!!! 폰트 페밀리 설정 영역

const FamilyChangeArea = ({ color, setOpen, name }: any) => {
  return (
      <VStack h={70} borderBottomColor={color.status} borderBottomWidth={1}>
        <HStack>
          <Box w={'75%'} bg={color.white}>
            <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
              글꼴
            </Text>
            <Text fontSize={14} marginLeft={5} style={{ color: color.gray8 }}>
              {name}
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
                onPress={setOpen}
                _pressed={{ bg: color.status }}
            >
              다른 글꼴
            </Button>
          </Box>
        </HStack>
      </VStack>
  );
};

// !!!!!!!!!!!!!!!!!!! 폰트 사이즈 설정 영역

const SizeChangeArea = ({
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
        'fontStyle',
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