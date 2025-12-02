import {
  Box,
  Button,
  HStack,
  IconButton,
  StatusBar,
  Text,
  VStack
} from 'native-base';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import ChapterListBtn from '../../section/chapterListBtn';
import VerseListBtn from '../../section/verseListBtn';
import BibleMenu from '../../section/bibleMenu';
import SearchBar from '../../section/search';
import { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { menuSlice } from '../../../provider/redux/slice';
import { gFontTitle } from '../../../constant/global';

interface Props {
  name: string;
  type: 'drawer' | 'back';
  darkmode: boolean;
  list?: string[];
  index?: number;
  bibleMenu?: menuStateType;
  onPress?: (index: number) => void;
}
export default memo(SectionHeaderLayout);

function SectionHeaderLayout({
  name,
  list,
  type,
  darkmode,
  index: mIndex,
  bibleMenu,
  onPress
}: Props) {
  const { color } = useBaseStyle();

  const { navigation, route } = useNativeNavigation();

  const dispatch = useDispatch();

  const onToggle = () => {
    navigation.toggleDrawer();
  };

  const onBack = () => {
    navigation.goBack();
  };

  const onChapNavigate = () => {
    navigation.navigate('ChapterScreen', {});
  };

  useEffect(() => {
    route.name !== 'PhotoDetailScreen' &&
      route.name !== 'BibleScreen' &&
      dispatch(menuSlice.actions.reset());
  }, [route]);

  const SnbComponent = () => {
    if (list && onPress) {
      const width = 100 / list.length;

      return (
        <HStack alignItems="center">
          {list.map((name, index) => (
            <Button
              w={`${width}%`}
              borderRadius={'none'}
              fontWeight={900}
              bg={
                bibleMenu?.option.vector
                  ? index === list.length - 1
                    ? color.orange
                    : color.white
                  : index === mIndex
                  ? color.bible
                  : color.white
              }
              fontSize={13}
              key={index * 13}
              onPress={() => onPress(index)}
            >
              <Text
                style={{
                  color: bibleMenu?.option.vector
                    ? index === list.length - 1
                      ? color.white
                      : color.gray1
                    : index === mIndex
                    ? color.white
                    : color.gray1
                }}
                fontSize={13}
              >
                {name}
              </Text>
            </Button>
          ))}
        </HStack>
      );
    } else {
      return <></>;
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Box safeAreaTop bg={color.status} />
      <HStack
        color={color.white}
        bg={darkmode ? color.black : color.white}
        px="2"
        py="1"
        justifyContent="space-between"
        alignItems="center"
        w="100%"
        borderBottomColor={darkmode ? color.black : color.status}
        borderBottomWidth={1}
        borderBottomStyle={bibleMenu?.option.search ? 'solid' : 'none'}
      >
        <VStack>
          <HStack alignItems="center" height={'40px'}>
            {type === 'drawer' && (
              <IconButton
                borderRadius="full"
                bg={color.bible}
                icon={<Icon name="menu" color="white" size={15} />}
                onPress={onToggle}
              />
            )}
            {type === 'back' && (
              <IconButton
                variant={darkmode ? 'darkBacklined' : 'darkBacklined'}
                icon={
                  <Icon
                    name="arrow-back-ios"
                    color={darkmode ? color.white : color.black}
                    size={16}
                  />
                }
                onPress={onBack}
              />
            )}

            <Text
              marginLeft={2}
              style={{
                color: darkmode ? color.white : color.black
              }}
              fontSize="24"
              fontFamily={gFontTitle}
              onPress={() => {
                route.name === 'BibleScreen' && onChapNavigate();
              }}
            >
              {name}
            </Text>
            {route.name === 'BibleScreen' && (
              <ChapterListBtn onPress={onChapNavigate} />
            )}
          </HStack>

          {(bibleMenu || route.name === 'BibleScreen') && (
            <HStack alignItems="center" w={'100%'} minH={'25px'}>
              {route.name === 'BibleScreen' && <VerseListBtn />}
              {bibleMenu && <BibleMenu />}
            </HStack>
          )}
        </VStack>
      </HStack>
      {/* {bibleMenu?.option.search && (
        <SearchBar placeholder={'검색어를 입력하세요'} onPress={() => { }} />
      )} */}
      <SnbComponent />
    </>
  );
}
