import {
    Box,
    HStack,
    StatusBar,
    VStack,
    Text,
    Flex,
    IconButton,
    Button
} from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { gFontTitle } from '../../../constant/global';

interface Props {
    title: string;
    onNavigate?: () => void;
}

export default function IlldocBackHeaderLayout({ title, onNavigate }: Props) {
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
                    justifyContent="space-between"
                    borderBottomColor={color.status}
                    borderBottomWidth={'1'}
                    px={3}
                >
                    <Flex flexDirection={'row'} alignItems="center" flex={1}>
                        <IconButton
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
                            style={{ color: color.black }}
                            fontFamily={gFontTitle}
                        >
                            {title}
                        </Text>
                    </Flex>

                    <Button
                        bg={color.status}
                        size={0}
                        w={'65px'}
                        h={8}
                        onPress={()=>{navigation.navigate('IllDocTranslateScreen', {});}}
                        _pressed={{ bg: color.white }}
                    >
                        <Text fontSize={14} color={color.bible}>
                            개역개정
                        </Text>
                    </Button>
                </HStack>
            </VStack>
        </>
    );
}