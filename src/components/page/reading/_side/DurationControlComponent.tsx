// 이미지와 동일한 총기간 섹션 컴포넌트
import React from 'react';
import { HStack, VStack, Text, Button, Box } from 'native-base';
import dayjs from 'dayjs';

interface DurationControlProps {
    startDate: string; // YYYY년MM월DD일 형태
    endDate: string;   // YYYY년MM월DD일 형태
    onEndDateChange: (newEndDate: string) => void;
    planData?: any; // 기존 플랜이 있는지 확인용
}

const DurationControlComponent: React.FC<DurationControlProps> = ({
                                                                      startDate,
                                                                      endDate,
                                                                      onEndDateChange,
                                                                      planData
                                                                  }) => {
    // 문자열 날짜를 dayjs 객체로 변환
    const convertStringToDate = (dateString: string) => {
        // "2024년07월08일" -> "2024-07-08"
        const cleaned = dateString.replace(/년|월/g, '-').replace(/일/g, '');
        return dayjs(cleaned);
    };

    // 총 기간 계산
    const calculateTotalDays = () => {
        if (!startDate || !endDate) return 0;

        const start = convertStringToDate(startDate);
        const end = convertStringToDate(endDate);

        return end.diff(start, 'day') + 1; // 시작일 포함
    };

    // 종료일 조정
    const adjustEndDate = (direction: 'up' | 'down') => {
        if (!endDate || planData) return; // 기존 플랜이 있으면 수정 불가

        const currentEnd = convertStringToDate(endDate);
        const start = convertStringToDate(startDate);

        let newEndDate;
        if (direction === 'up') {
            newEndDate = currentEnd.add(1, 'day');
        } else {
            newEndDate = currentEnd.subtract(1, 'day');
        }

        // 시작일보다 이전으로 갈 수 없게 제한
        if (newEndDate.isBefore(start)) {
            return;
        }

        // 새로운 종료일을 원래 형태로 변환
        const formattedDate = newEndDate.format('YYYY년MM월DD일');
        onEndDateChange(formattedDate);
    };

    const totalDays = calculateTotalDays();

    // 종료일이 선택되었을 때만 렌더링
    if (!startDate || !endDate) {
        return null;
    }

    return (
        /* 이미지와 동일한 총기간 섹션 */
        <HStack
            h={70}
            alignItems="center"
            justifyContent="space-between"
            px={4}
            borderBottomColor="#F0F0F0"
            borderBottomWidth={1}
            bg="white"
        >
            <VStack>
                <Text fontSize={18} fontWeight={600}>총 기간</Text>
            </VStack>

            <HStack alignItems="center" space={3}>
                <Text fontSize={16} color="#37C4B9" fontWeight={600}>
                    {totalDays}일
                </Text>

                {/* 기간 조정 버튼들 - 기존 플랜이 없을 때만 활성화 */}
                <HStack space={1}>
                    <Button
                        w={10}
                        h={10}
                        bg={planData ? "#CCCCCC" : "#E0E0E0"}
                        borderRadius="sm"
                        p={0}
                        onPress={() => !planData && adjustEndDate('up')}
                        isDisabled={!!planData}
                        _pressed={{ bg: planData ? "#CCCCCC" : "#BDBDBD" }}
                    >
                        <Text fontSize="16" color={planData ? "#999999" : "#37C4B9"}>
                            🔼
                        </Text>
                    </Button>

                    <Button
                        w={10}
                        h={10}
                        bg={planData ? "#CCCCCC" : "#E0E0E0"}
                        borderRadius="sm"
                        p={0}
                        onPress={() => !planData && adjustEndDate('down')}
                        isDisabled={!!planData}
                        _pressed={{ bg: planData ? "#CCCCCC" : "#BDBDBD" }}
                    >
                        <Text fontSize="16" color={planData ? "#999999" : "#37C4B9"}>
                            🔽
                        </Text>
                    </Button>
                </HStack>
            </HStack>
        </HStack>
    );
};

export default DurationControlComponent;