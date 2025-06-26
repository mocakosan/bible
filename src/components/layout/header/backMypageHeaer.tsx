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
import {Image, TouchableOpacity} from 'react-native';
import {useCallback, useEffect, useState} from "react";
import axios from "axios";
import {useFocusEffect} from "@react-navigation/native";

interface Props {
    title: string;
    onNavigate?: () => void;
    point?: any;
    showPoints?: boolean;
    user?: any;
    totalSumPoint?: number;
}

export default function BackMypageHeaderLayout({
                                                   title,
                                                   onNavigate,
                                                   point,
                                                   user,
                                                   showPoints = true,
                                                   totalSumPoint,
                                               }: Props) {
    const { color } = useBaseStyle();
    const { navigation } = useNativeNavigation();
    const [totalPoint, setTotalPoint] = useState(totalSumPoint || 0);

    console.log("detailtotalSumPoint", totalSumPoint);
    console.log("헤더에서 받은 point:", point);

    const onGoBack = () => {
        navigation.goBack();
    };

    const onPointsPress = () => {
        navigation.navigate("PointHistoryScreen", {
            point: point,
            user: user,
        });
    };

    const fetchPointSum = useCallback(async () => {
        try {
            // totalSumPoint가 이미 있으면 API 호출하지 않음
            if (totalSumPoint !== undefined && totalSumPoint !== null) {
                setTotalPoint(totalSumPoint);
                return;
            }

            // point?.userId가 없으면 API 호출 불가
            if (!point?.userId) {
                console.log('userId가 없어서 포인트 API 호출을 건너뜁니다.');
                return;
            }

            console.log('포인트 API 호출 중... userId:', point.userId);

            const response = await axios.get(
                `https://bible25backend.givemeprice.co.kr/point/sum?userId=${point.userId}&type=sum`
            );

            console.log('포인트 API 응답:', response.data);

            // 응답 구조에 따라 적절한 필드를 선택하여 상태 업데이트
            const pointValue = response.data.totalPoint || response.data.sum || response.data || 0;
            setTotalPoint(pointValue);

        } catch (error) {
            console.error('포인트 API 호출 실패:', error);
            if (axios.isAxiosError(error)) {
                console.error('에러 상세:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
            }
        }
    }, [point?.userId, totalSumPoint]);

    // totalSumPoint가 변경되면 즉시 반영
    useEffect(() => {
        if (totalSumPoint !== undefined && totalSumPoint !== null) {
            setTotalPoint(totalSumPoint);
        }
    }, [totalSumPoint]);

    useFocusEffect(
        useCallback(() => {
            fetchPointSum();
        }, [fetchPointSum])
    );

    useEffect(() => {
        const unsubscribe = navigation.addListener('state', () => {
            console.log('네비게이션 상태 변화 감지 - 포인트 업데이트');
            fetchPointSum();
        });

        return unsubscribe;
    }, [navigation, fetchPointSum]);

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
                    position="relative"
                    px={4}
                >
                    <IconButton
                        position="absolute"
                        left={0}
                        zIndex={1}
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
                        flex={1}
                        textAlign="center"
                        style={{ color: "#2AC1BC" }}
                        fontFamily={gFontTitle}
                    >
                        {title}
                    </Text>

                    {showPoints && (
                        <TouchableOpacity
                            onPress={onPointsPress}
                            style={{
                                position: 'absolute',
                                right: 16,
                                zIndex: 1
                            }}
                        >
                            <HStack
                                alignItems="center"
                                bg="#FFFFFF"
                                borderRadius="20"
                                borderWidth={1}
                                borderColor="#DFE2E5"
                                px={3}
                                py={1}
                                space={1}
                            >
                                <Image
                                    source={require('../../../assets/img/pimage.png')}
                                    style={{width:20,height:20}}
                                />
                                <Text
                                    fontSize="14"
                                    fontWeight="600"
                                    color="#333"
                                >
                                    {totalPoint.toLocaleString()}
                                </Text>
                            </HStack>
                        </TouchableOpacity>
                    )}
                </HStack>
            </VStack>
        </>
    );
}