import {
  Box,
  HStack,
  StatusBar,
  VStack,
  Text,
  Flex,
  Button,
  IconButton
} from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { memo, useState } from 'react';
import { gFontTitle } from '../../../constant/global';

interface Props {
  title?: string;
  list: string[];
  menuIndex: number;
  onMenuChange: (index: number) => void;
}
function ReadingHeaderLayout({ title, list, menuIndex, onMenuChange }: Props) {
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  const width = 100 / list.length;

  const onGoBack = () => {
    navigation.goBack();
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Box safeAreaTop bg={color.status} />
      <VStack
        borderBottomWidth={'1'}
        borderBottomColor={color.status}
        bg={color.white}
      >
        <HStack
          alignItems="center"
          height={'60px'}
          borderBottomColor={color.status}
          borderBottomWidth={'1'}
        >
          <IconButton
            icon={
              <Icon
                name="arrow-back-ios"
                color="black"
                size={24}
                style={{ paddingLeft: 5 }}
              />
            }
            onPress={() => onGoBack()}
          />
          <Text
            fontSize="20"
            style={{ color: color.black }}
            fontFamily={gFontTitle}
          >
            {title ? title : '성경일독'}
          </Text>
        </HStack>
        <HStack alignItems="center">
          {list.map((name, index) => (
            <Button
              w={`${width}%`}
              borderRadius={'none'}
              bg={
                index === menuIndex
                  ? `${color.bible}:alpha.0`
                  : `${color.white}:alpha.0`
              }
              _pressed={{
                bg: color.white
              }}
              fontSize={13}
              key={name}
              onPress={() => onMenuChange(index)}
            >
              <Text
                color={index === menuIndex ? color.white : color.gray1}
                style={{
                  fontWeight: '900',
                  fontSize:20
                }}
              >
                {name}
              </Text>
            </Button>
          ))}
        </HStack>
      </VStack>
    </>
  );
}
export default memo(ReadingHeaderLayout);
