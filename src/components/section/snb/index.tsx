import { Box, HStack, Image, Text, VStack } from 'native-base';
import { sectionNavigationData } from '../../../utils/nav';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { Pressable } from 'react-native';

interface Props {}

export default function Navigation({}: Props) {
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();
  const onPress = (route: string, sub: string | undefined) => {
    sub ? navigation.navigate(route, { data: sub }) : navigation.navigate(route, {});
  };

  return (
    <>
      {sectionNavigationData.map((obj, index) => (
        <HStack w={'100%'} key={index}>
          {obj.map(({ img, name, route, sub }) => (
            <VStack w={'25%'} key={name}>
              <Pressable onPress={() => onPress(route, sub)}>
                <Box
                  bg={color.white}
                  alignItems={'center'}
                  borderBottomWidth={1}
                  borderBottomStyle={'solid'}
                  borderBottomColor={color.status}
                  paddingTop={3}
                  paddingBottom={3}
                >
                  <Image source={img} size={10} alt={'nav'} />
                  <Text>{name}</Text>
                </Box>
              </Pressable>
            </VStack>
          ))}
        </HStack>
      ))}
    </>
  );
}
