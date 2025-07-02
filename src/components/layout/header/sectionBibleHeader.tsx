import { Box, Button, IconButton, StatusBar, Text } from 'native-base';

import { memo } from 'react';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';

import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SettingOff from '../../../assets/svg/SettingOff.svg';
import SoundOff from '../../../assets/svg/SoundOff.svg';
import SoundOn from '../../../assets/svg/SoundOn.svg';
import { gFontTitle } from '../../../constant/global';

import Svg from '../../Svg';
import { defaultStorage } from '../../../utils/mmkv';

interface Props {
  name: string;
  darkmode: boolean;
}

function SectionBibleHeaderLayout({ name, darkmode, ...props }: any) {
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  // MMKV에서 현재 성경과 장 정보 가져오기
  const BOOK = defaultStorage.getNumber('bible_book') ?? 1;
  const JANG = defaultStorage.getNumber('bible_jang') ?? 1;

  const onGoBack = () => {
    navigation.navigate('DrawerScreens', {});
  };

  const onNavigate = () => {
    navigation.navigate('TranslateScreen', {});
  };

  const onPressSound = () => {
    // dispatch(menuSlice.actions.change({ option: result }));
  };

  const onPressSetting = () => {
    navigation.navigate('SettingScreen', {});
  };

  // 성경 이름 클릭 시 - 성경탭으로 이동
  const onPressBibleName = () => {
    navigation.navigate('ChapterScreen', {
      defaultTab: 'bible' // 성경탭으로 이동하기 위한 파라미터
    });
  };

  // 장 번호 클릭 시 - 장탭으로 이동
  const onPressChapterNumber = () => {
    navigation.navigate('ChapterScreen', {
      defaultTab: 'chapter' // 장탭으로 이동하기 위한 파라미터
    });
  };

  // 성경 이름과 장 번호를 분리하여 표시
  const getBibleNameAndChapter = (fullName: string) => {
    // "창세기 1장" 형태에서 성경 이름과 장 번호를 분리
    const match = fullName.match(/^(.+?)\s(\d+)장$/);
    if (match) {
      return {
        bibleName: match[1], // "창세기"
        chapterNumber: match[2] // "1"
      };
    }
    return {
      bibleName: fullName,
      chapterNumber: ''
    };
  };

  const { bibleName, chapterNumber } = getBibleNameAndChapter(name);

  return (
      <>
        <StatusBar barStyle="light-content" />
        <Box safeAreaTop bg={color.status} />
        <View style={styles.container}>
          <View style={styles.firstView}>
            <IconButton
                icon={
                  <Icon
                      name="arrow-back-ios"
                      color="black"
                      size={24}
                  />
                }
                onPress={() => onGoBack()}
            />

            {/* 성경 이름과 장 번호를 분리해서 각각 클릭 가능하게 만들기 */}
            <View style={styles.titleContainer}>
              <TouchableOpacity onPress={onPressBibleName}>
                <Text
                    style={{
                      color: darkmode ? color.white : color.black
                    }}
                    fontSize={18}
                    fontFamily={gFontTitle}
                >
                  {bibleName}
                </Text>
              </TouchableOpacity>

              {chapterNumber && (
                  <>
                    <Text
                        style={{
                          color: darkmode ? color.white : color.black,
                          marginHorizontal: 0
                        }}
                        fontSize={18}
                        fontFamily={gFontTitle}
                    >
                      {" "}
                    </Text>
                    <TouchableOpacity onPress={onPressChapterNumber}>
                      <Text
                          style={{
                            color: darkmode ? color.white : color.black
                          }}
                          fontSize={18}
                          fontFamily={gFontTitle}
                      >
                        {chapterNumber}장
                      </Text>
                    </TouchableOpacity>
                  </>
              )}
            </View>
          </View>
          <View style={styles.secondView}>
            <Button
                bg={color.status}
                size={0}
                w={'65px'}
                h={8}
                onPress={onNavigate}
                _pressed={{ bg: color.white }}
            >
              <Text fontSize={14} color={color.bible}>
                개역개정
              </Text>
            </Button>
            <TouchableOpacity
                onPress={() => props.setOpen((pre: boolean) => !pre)}
            >
              <View style={styles.soundIcon}>
                {props.open ? (
                    <Svg width={24} height={24} Svg={SoundOn} />
                ) : (
                    <Svg width={24} height={24} Svg={SoundOff} />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPressSetting()}>
              <View style={styles.settingIcon}>
                <Svg width={24} height={24} Svg={SettingOff} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 55,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10
  },
  firstView: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginLeft: 8
  },
  secondView: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  soundIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10
  },
  settingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 15
  }
});

export default memo(SectionBibleHeaderLayout);