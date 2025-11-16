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
import { gFontTitle } from '../../../constant/global';

interface Props {
  title: string;
  onNavigate?: () => void;
}
export default function BackHeaderLayout({ title, onNavigate }: Props) {
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

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
          justifyContent="space-evenly"
          borderBottomColor={color.status}
          borderBottomWidth={'1'}
        >
          <Flex w={'100%'} flexDirection={'row'} alignItems={'center'} marginTop={2}>
            <IconButton
                style={{marginTop:4}}
              icon={
                <Icon
                  name="arrow-back-ios"
                  color="black"
                  size={24}
                  style={{ paddingLeft: 5 }}
                />
              }
              onPress={() => (onNavigate ? onNavigate() : onGoBack())}
            />

            <Text
              fontSize="24"
              marginTop={1}
              // marginLeft={2}
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
