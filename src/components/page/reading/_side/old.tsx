// src/components/page/reading/_side/old.tsx
// 🔥 시간 기반 성경일독 시스템으로 완전 수정

import { useCallback, useEffect, useState, useMemo } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { Box, Text, VStack, HStack, Badge, Pressable } from "native-base";
import { BibleStep } from "../../../../utils/define";
import { useBaseStyle } from "../../../../hooks";
import {
    getBibleChapterStatus,
    getChapterListForReading
} from "../../../../utils/biblePlanIntegration";

interface Props {
    mark?: any;
    planData?: any;
    dashboardData?: any;
    onChapterToggle?: (bookIndex: number, chapter: number, isCurrentlyRead: boolean) => void;
    onTrigger?: () => void;
    forceUpdateKey?: number;
    showFullBible?: boolean; // 전체 성경 표시 여부
    planType?: string; // 'pentateuch', 'psalms' 등
}

export default function Old({
                                mark,
                                planData,
                                dashboardData,
                                onChapterToggle,
                                onTrigger,
                                forceUpdateKey,
                                showFullBible = false,
                                planType
                            }: Props) {
    const { color } = useBaseStyle();
    const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());

    // 🔥 표시할 성경 범위 결정
    const getBookRange = useMemo(() => {
        if (planType === 'pentateuch') {
            return { start: 1, end: 5 }; // 모세오경
        } else if (planType === 'psalms') {
            return { start: 19, end: 19 }; // 시편만
        } else if (showFullBible && planData?.planType === 'full_bible') {
            return { start: 1, end: 66 }; // 전체 성경
        } else if (planData?.planType === 'new_testament') {
            return { start: 40, end: 66 }; // 신약
        } else {
            return { start: 1, end: 39 }; // 구약 (기본값)
        }
    }, [showFullBible, planData?.planType, planType]);

    // 🔥 시간 기반 장 리스트 가져오기
    const chapterList = useMemo(() => {
        if (!planData) {
            // 계획이 없으면 기본 표시
            return BibleStep
                .filter(book => book.index >= getBookRange.start && book.index <= getBookRange.end)
                .map(book => ({
                    bookIndex: book.index,
                    bookName: book.name,
                    chapters: Array.from({ length: book.count }, (_, i) => ({
                        chapter: i + 1,
                        status: 'future' as const,
                        isRead: false,
                        estimatedMinutes: 0,
                        displayTime: ''
                    }))
                }));
        }

        // 시간 기반 계획이 있으면 해당 데이터 사용
        const effectivePlanType = planType || planData.planType || 'old_testament';
        return getChapterListForReading(effectivePlanType)
            .filter(book => book.bookIndex >= getBookRange.start && book.bookIndex <= getBookRange.end);
    }, [planData, getBookRange, planType, forceUpdateKey]);

    // 책 펼침/접힘 토글
    const toggleBookExpanded = useCallback((bookIndex: number) => {
        setExpandedBooks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(bookIndex)) {
                newSet.delete(bookIndex);
            } else {
                newSet.add(bookIndex);
            }
            return newSet;
        });
    }, []);

    // 초기에 오늘 읽을 책들은 펼쳐놓기
    useEffect(() => {
        if (chapterList.length > 0) {
            const todayBooks = new Set<number>();

            chapterList.forEach(book => {
                const hasTodayChapters = book.chapters.some(ch => ch.status === 'today');
                if (hasTodayChapters) {
                    todayBooks.add(book.bookIndex);
                }
            });

            if (todayBooks.size > 0) {
                setExpandedBooks(todayBooks);
            }
        }
    }, [chapterList]);

    // 장 상태에 따른 스타일 반환
    const getChapterStyle = useCallback((chapter: any) => {
        const baseStyle = {
            minH: 45,
            px: 3,
            py: 2,
            borderRadius: 'md',
            borderWidth: 1,
            mb: 1
        };

        switch (chapter.status) {
            case 'completed':
                return {
                    ...baseStyle,
                    bg: '#D1FAE5',
                    borderColor: '#10B981'
                };
            case 'today':
                return {
                    ...baseStyle,
                    bg: chapter.isRead ? '#D1FAE5' : '#FEF3C7',
                    borderColor: chapter.isRead ? '#10B981' : '#F59E0B'
                };
            case 'missed':
                return {
                    ...baseStyle,
                    bg: '#FEE2E2',
                    borderColor: '#EF4444'
                };
            case 'past':
                return {
                    ...baseStyle,
                    bg: '#F3F4F6',
                    borderColor: '#9CA3AF'
                };
            default: // future
                return {
                    ...baseStyle,
                    bg: '#F9FAFB',
                    borderColor: '#E5E7EB'
                };
        }
    }, []);

    // 장 상태에 따른 텍스트 색상
    const getChapterTextColor = useCallback((chapter: any) => {
        switch (chapter.status) {
            case 'completed':
                return '#059669';
            case 'today':
                return chapter.isRead ? '#059669' : '#D97706';
            case 'missed':
                return '#DC2626';
            case 'past':
                return '#6B7280';
            default:
                return '#374151';
        }
    }, []);

    // 장 클릭 핸들러
    const handleChapterPress = useCallback((bookIndex: number, chapter: number, isRead: boolean) => {
        if (onChapterToggle) {
            onChapterToggle(bookIndex, chapter, isRead);
        }
    }, [onChapterToggle]);

    // 책 요약 정보 계산
    const getBookSummary = useCallback((book: any) => {
        const totalChapters = book.chapters.length;
        const completedChapters = book.chapters.filter((ch: any) => ch.isRead).length;
        const todayChapters = book.chapters.filter((ch: any) => ch.status === 'today').length;
        const missedChapters = book.chapters.filter((ch: any) => ch.status === 'missed').length;

        const totalEstimatedTime = book.chapters.reduce((sum: number, ch: any) => sum + (ch.estimatedMinutes || 0), 0);
        const completedTime = book.chapters
            .filter((ch: any) => ch.isRead)
            .reduce((sum: number, ch: any) => sum + (ch.estimatedMinutes || 0), 0);

        return {
            totalChapters,
            completedChapters,
            todayChapters,
            missedChapters,
            totalEstimatedTime,
            completedTime,
            progressPercentage: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
        };
    }, []);

    // 상태별 아이콘
    const getStatusIcon = useCallback((status: string, isRead: boolean) => {
        switch (status) {
            case 'completed':
                return '✅';
            case 'today':
                return isRead ? '✅' : '📖';
            case 'missed':
                return '⏰';
            case 'past':
                return '⏸️';
            default:
                return '📝';
        }
    }, []);

    if (!chapterList || chapterList.length === 0) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center" p={8}>
                <Text fontSize={16} color="#6B7280" textAlign="center">
                    {planData
                        ? '해당 구간에 읽을 내용이 없습니다.'
                        : '성경일독 계획을 먼저 설정해주세요.'}
                </Text>
            </Box>
        );
    }

    return (
        <ScrollView style={{ backgroundColor: color.white }} showsVerticalScrollIndicator={false}>
            <VStack space={3} p={4} pb={8}>
                {chapterList.map((book) => {
                    const bookSummary = getBookSummary(book);
                    const isExpanded = expandedBooks.has(book.bookIndex);

                    return (
                        <Box key={book.bookIndex} bg="white" borderRadius="lg" borderWidth={1} borderColor="#E5E7EB">
                            {/* 책 헤더 */}
                            <Pressable onPress={() => toggleBookExpanded(book.bookIndex)}>
                                <Box p={4} borderBottomWidth={isExpanded ? 1 : 0} borderBottomColor="#F3F4F6">
                                    <HStack justifyContent="space-between" alignItems="center">
                                        <VStack flex={1}>
                                            <HStack alignItems="center" space={2}>
                                                <Text fontSize={16} fontWeight={700} color="#1F2937">
                                                    {book.bookName}
                                                </Text>
                                                <Badge colorScheme={bookSummary.progressPercentage === 100 ? "green" : "blue"} borderRadius="full" size="sm">
                                                    {bookSummary.completedChapters}/{bookSummary.totalChapters}
                                                </Badge>
                                            </HStack>

                                            <HStack space={4} mt={1}>
                                                {bookSummary.todayChapters > 0 && (
                                                    <Text fontSize={12} color="#D97706">
                                                        📖 오늘 {bookSummary.todayChapters}장
                                                    </Text>
                                                )}
                                                {bookSummary.missedChapters > 0 && (
                                                    <Text fontSize={12} color="#DC2626">
                                                        ⏰ 놓친 {bookSummary.missedChapters}장
                                                    </Text>
                                                )}
                                                {planData && bookSummary.totalEstimatedTime > 0 && (
                                                    <Text fontSize={12} color="#6B7280">
                                                        ⏱️ 총 {Math.round(bookSummary.totalEstimatedTime * 10) / 10}분
                                                    </Text>
                                                )}
                                            </HStack>
                                        </VStack>

                                        <VStack alignItems="flex-end" space={1}>
                                            <Text fontSize={14} fontWeight={600} color="#4F46E5">
                                                {bookSummary.progressPercentage}%
                                            </Text>
                                            <Text fontSize={12} color="#6B7280">
                                                {isExpanded ? '접기' : '펼치기'}
                                            </Text>
                                        </VStack>
                                    </HStack>
                                </Box>
                            </Pressable>

                            {/* 장 목록 */}
                            {isExpanded && (
                                <Box p={4}>
                                    <VStack space={2}>
                                        {book.chapters.map((chapter) => (
                                            <TouchableOpacity
                                                key={`${book.bookIndex}-${chapter.chapter}`}
                                                onPress={() => handleChapterPress(book.bookIndex, chapter.chapter, chapter.isRead)}
                                                activeOpacity={0.7}
                                            >
                                                <Box {...getChapterStyle(chapter)}>
                                                    <HStack justifyContent="space-between" alignItems="center">
                                                        <HStack alignItems="center" space={3} flex={1}>
                                                            <Text fontSize={16}>
                                                                {getStatusIcon(chapter.status, chapter.isRead)}
                                                            </Text>
                                                            <VStack flex={1}>
                                                                <Text
                                                                    fontSize={14}
                                                                    fontWeight={600}
                                                                    color={getChapterTextColor(chapter)}
                                                                >
                                                                    {chapter.chapter}장
                                                                </Text>
                                                                {chapter.scheduledDate && (
                                                                    <Text fontSize={11} color="#6B7280">
                                                                        {new Date(chapter.scheduledDate).toLocaleDateString('ko-KR', {
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </Text>
                                                                )}
                                                            </VStack>
                                                        </HStack>

                                                        <VStack alignItems="flex-end">
                                                            {chapter.estimatedMinutes > 0 && (
                                                                <Text fontSize={12} color="#6B7280">
                                                                    {chapter.displayTime}
                                                                </Text>
                                                            )}
                                                            {chapter.status === 'today' && !chapter.isRead && (
                                                                <Badge colorScheme="orange" size="xs" borderRadius="full">
                                                                    Today
                                                                </Badge>
                                                            )}
                                                            {chapter.status === 'missed' && (
                                                                <Badge colorScheme="red" size="xs" borderRadius="full">
                                                                    Missed
                                                                </Badge>
                                                            )}
                                                        </VStack>
                                                    </HStack>
                                                </Box>
                                            </TouchableOpacity>
                                        ))}
                                    </VStack>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </VStack>
        </ScrollView>
    );
}