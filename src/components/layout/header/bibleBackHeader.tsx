import {
  Box,
  HStack,
  StatusBar,
  VStack,
  Text,
  Flex,
  IconButton
} from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { memo, useState } from 'react';
import { gFontTitle } from '../../../constant/global';

interface Props {
  title: string;
}
export default function BibleBackHeaderLayout({ title }: Props) {
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  const onGoBack = () => {
    navigation.navigate('BookMarkScreen', {});
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
          justifyContent="space-evenly"
          borderBottomColor={color.status}
          borderBottomWidth={'1'}
        >
          <Flex w={'100%'} flexDirection={'row'}>
            <Icon
              name="arrow-back-ios"
              color="black"
              size={26}
              style={{ padding: 5, marginLeft: 5 }}
              onPress={onGoBack}
            />

            <Text
              fontSize="24"
              marginLeft={2}
              style={{ color: color.black }}
              fontFamily={gFontTitle}
            >
              {title}
            </Text>
          </Flex>
        </HStack>
      </VStack>
    </>
  );
}
