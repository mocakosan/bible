import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Alert,
    Keyboard,
} from 'react-native';
import { Box, StatusBar } from 'native-base';
import { debounce } from 'lodash';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { HymnCategory, HymnData } from "../../../types/hymn";
import { API_ENDPOINTS, apiClient } from "../../../utils/api";
import BannerAdComponent from "../../../adforus";
import FooterLayout from "../../layout/footer/footer";
import BackHeaderLayout from "../../layout/header/backHeader";
import TrackPlayer, {State} from "react-native-track-player";
import {defaultStorage} from "../../../utils/mmkv";


const HYMN_CATEGORIES: HymnCategory[] = [
    '교독문','001', '100', '200', '300', '400', '500', '600'
];

const ITEMS_PER_PAGE = 20; // 페이지당 아이템 수

// 검색어 하이라이트 컴포넌트
const HighlightText = ({ text, keyword }: { text: string; keyword: string }) => {
    if (!keyword || !text) return <Text style={styles.hymnTitle}>{text}</Text>;

    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));

    return (
        <Text style={styles.hymnTitle}>
            {parts.map((part, index) =>
                part.toLowerCase() === keyword.toLowerCase() ? (
                    <Text key={index} style={{ backgroundColor: '#FFEB3B', fontWeight: 'bold' }}>
                        {part}
                    </Text>
                ) : (
                    <Text key={index}>{part}</Text>
                )
            )}
        </Text>
    );
};

export default function HymnListScreen() {
    const { navigation } = useNativeNavigation();
    const { color } = useBaseStyle();
    const insets = useSafeAreaInsets();

    const [selectedCategory, setSelectedCategory] = useState<HymnCategory>('001');
    const [hymnList, setHymnList] = useState<HymnData[]>([]);
    const [allHymnList, setAllHymnList] = useState<HymnData[]>([]); // 전체 데이터 캐시
    const [searchResults, setSearchResults] = useState<HymnData[]>([]); // 검색 결과 전체
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isDocMode, setIsDocMode] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const searchInputRef = useRef<TextInput>(null);

    useEffect(() => {
        const stopHymnPlayer = async () => {
            try {
                console.log('[HYMN_LIST] 찬송가 플레이어 정지 시작');

                // ✅ 플레이어 상태 확인
                const state = await TrackPlayer.getState();
                console.log(`[HYMN_LIST] 현재 플레이어 상태: ${state}`);

                // ✅ 재생 중이거나 일시정지 상태면 정지
                if (state === State.Playing || state === State.Paused || state === State.Ready || state === State.Buffering) {
                    await TrackPlayer.pause();
                    console.log('[HYMN_LIST] ⏸ 일시정지 완료');

                    await TrackPlayer.stop();
                    console.log('[HYMN_LIST] ⏹ 정지 완료');
                }

                // ✅ 큐 리셋
                await TrackPlayer.reset();
                console.log('[HYMN_LIST] 🔄 큐 리셋 완료');

                // ✅ 찬송가 관련 모든 스토리지 초기화
                defaultStorage.set('hymn_was_playing', false);
                defaultStorage.set('is_hymn_player', false);
                defaultStorage.delete('current_hymn_id'); // ✅ 현재 찬송가 ID 삭제
                console.log('[HYMN_LIST] 📝 플래그 초기화 완료 (is_hymn_player = false, current_hymn_id 삭제)');

                console.log('[HYMN_LIST] ✅ 찬송가 플레이어 완전 정지 및 초기화 완료');
            } catch (error) {
                console.error('[HYMN_LIST] ❌ 플레이어 정지 실패:', error);
            }
        };

        stopHymnPlayer();

        // ✅ 포커스 리스너 추가 - 화면 복귀 시에도 플레이어 정지 보장
        const unsubscribeFocus = navigation.addListener('focus', () => {
            console.log('[HYMN_LIST] 화면 포커스 - 플레이어 상태 재확인');
            stopHymnPlayer();
        });

        return () => {
            console.log('[HYMN_LIST] 화면 언마운트');
            unsubscribeFocus();
        };
    }, [navigation]);

    // 찬송가 데이터 로드
    useEffect(() => {
        if (!isDocMode && !isSearchMode) {
            loadHymnData();
        }
    }, [selectedCategory, isDocMode, isSearchMode]);

    const loadHymnData = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(API_ENDPOINTS.HYMN_LIST, {
                params: {
                    take: 700,
                    page: 1,
                }
            });

            console.log('✅ 찬송가 데이터 로드 성공:', response.data);

            let list = [];
            if (Array.isArray(response.data)) {
                list = response.data;
            } else if (response.data.list && Array.isArray(response.data.list)) {
                list = response.data.list;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                list = response.data.data;
            }

            setHymnList(list);
            setAllHymnList(list); // 전체 데이터 캐시 저장

            if (list.length === 0) {
                console.warn('⚠️ 찬송가 목록이 비어있습니다.');
            }
        } catch (error) {
            console.error('❌ 찬송가 데이터 로드 실패:', error);
            Alert.alert(
                '데이터 로드 실패',
                '찬송가 목록을 불러오는데 실패했습니다.\n네트워크 연결을 확인해주세요.',
                [
                    { text: '다시 시도', onPress: () => loadHymnData() },
                    { text: '취소', style: 'cancel' }
                ]
            );
            setHymnList([]);
        } finally {
            setLoading(false);
        }
    };

    // 개선된 검색 필터 함수
    const performSearch = (keyword: string, dataList: HymnData[]) => {
        if (!keyword.trim()) {
            return [];
        }

        const searchLower = keyword.toLowerCase().trim();

        const filtered = dataList.filter((item: HymnData) => {
            // 찬송가 번호로 검색
            if (item.num && String(item.num).includes(keyword)) {
                return true;
            }

            // 제목으로 검색
            if (item.title && item.title.toLowerCase().includes(searchLower)) {
                return true;
            }

            // 부제목으로 검색
            if (item.subtitle && item.subtitle.toLowerCase().includes(searchLower)) {
                return true;
            }

            // 구 찬송가 번호로 검색
            if (item.oldnum && String(item.oldnum).includes(keyword)) {
                return true;
            }

            return false;
        });

        // 검색 결과 정렬 (관련도 순)
        return filtered.sort((a, b) => {
            // 1. 번호 완전 일치 최우선
            const aNumMatch = String(a.num) === keyword;
            const bNumMatch = String(b.num) === keyword;
            if (aNumMatch && !bNumMatch) return -1;
            if (!aNumMatch && bNumMatch) return 1;

            // 2. 제목 시작 일치
            const aTitleStart = a.title?.toLowerCase().startsWith(searchLower);
            const bTitleStart = b.title?.toLowerCase().startsWith(searchLower);
            if (aTitleStart && !bTitleStart) return -1;
            if (!aTitleStart && bTitleStart) return 1;

            // 3. 번호 순 정렬
            return (a.num || 0) - (b.num || 0);
        });
    };

    // 실시간 검색 함수 (디바운스 적용)
    const debouncedSearch = useCallback(
        debounce((keyword: string) => {
            if (keyword.trim().length > 0) {
                const results = performSearch(keyword, allHymnList);
                setSearchResults(results);
                setIsSearchMode(true);
                setCurrentPage(1);

                // 총 페이지 수 계산
                const pages = Math.ceil(results.length / ITEMS_PER_PAGE);
                setTotalPages(pages);

                console.log(`🔍 실시간 검색: "${keyword}" - ${results.length}개 결과, ${pages}페이지`);
            } else {
                handleClearSearch();
            }
        }, 300),
        [allHymnList]
    );

    // 컴포넌트 언마운트 시 디바운스 정리
    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    // 검색 입력 변경 핸들러
    const handleSearchInputChange = (text: string) => {
        setSearchKeyword(text);
        debouncedSearch(text);
    };

    // 검색 버튼 클릭 또는 Enter 키 검색
    const handleSearch = async () => {
        const keyword = searchKeyword.trim();

        if (!keyword) {
            Alert.alert('알림', '검색어를 입력해주세요.');
            return;
        }

        Keyboard.dismiss();

        try {
            // 캐시된 데이터가 있으면 사용, 없으면 로드
            let dataToSearch = allHymnList;

            if (allHymnList.length === 0) {
                setLoading(true);
                const response = await apiClient.get(API_ENDPOINTS.HYMN_LIST, {
                    params: {
                        take: 700,
                        page: 1,
                    }
                });

                let list = [];
                if (Array.isArray(response.data)) {
                    list = response.data;
                } else if (response.data.list && Array.isArray(response.data.list)) {
                    list = response.data.list;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    list = response.data.data;
                }

                setAllHymnList(list);
                dataToSearch = list;
                setLoading(false);
            }

            const results = performSearch(keyword, dataToSearch);
            setSearchResults(results);
            setIsSearchMode(true);
            setCurrentPage(1);

            const pages = Math.ceil(results.length / ITEMS_PER_PAGE);
            setTotalPages(pages);

            console.log(`✅ 검색 결과: ${results.length}개, ${pages}페이지`);

            if (results.length === 0) {
                Alert.alert('검색 결과', `"${keyword}" 검색 결과가 없습니다.`);
            }
        } catch (error: any) {
            console.error('❌ 검색 실패:', error);
            Alert.alert('검색 실패', '검색 중 오류가 발생했습니다.');
            setSearchResults([]);
            setLoading(false);
        }
    };

    // Enter 키로 검색
    const handleSearchSubmit = () => {
        if (searchKeyword.trim()) {
            handleSearch();
        }
    };

    // 검색 초기화
    const handleClearSearch = () => {
        setSearchKeyword('');
        setIsSearchMode(false);
        setSearchResults([]);
        setCurrentPage(1);
        setTotalPages(1);
        loadHymnData();
    };

    // 페이지 변경
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // 숫자만 뽑아 안전하게 변환
    const toNum = (v: unknown) => {
        const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
        return Number.isNaN(n) ? null : n;
    };

    // 현재 페이지에 표시할 데이터 (페이지네이션 적용)
    const paginatedSearchResults = useMemo(() => {
        if (!isSearchMode) return [];

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return searchResults.slice(startIndex, endIndex);
    }, [searchResults, currentPage, isSearchMode]);

    const filteredHymnList = useMemo(() => {
        // 검색 모드일 때는 페이지네이션 적용된 검색 결과만 표시
        if (isSearchMode) {
            return paginatedSearchResults;
        }

        // '교독문'이나 '분류' 같은 비숫자 탭이면 전체 노출
        const catNum = parseInt(String(selectedCategory), 10);
        if (!Number.isFinite(catNum)) return hymnList;

        const lower = catNum;
        const upper = catNum === 700 ? Infinity : catNum + 100;
        return hymnList.filter((it) => {
            const n = toNum(it?.num);
            return n !== null && n >= lower && n < upper;
        });
    }, [hymnList, selectedCategory, isSearchMode, paginatedSearchResults]);

    const renderCategoryHeader = () => (
        <View style={styles.categoryContainer}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={HYMN_CATEGORIES}
                keyExtractor={(item) => `tab-${String(item)}`}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.categoryItem,
                            selectedCategory === item && styles.categoryItemActive,
                        ]}
                        onPress={() => {
                            // 카테고리 변경 시 검색 초기화
                            setIsSearchMode(false);
                            setSearchKeyword('');
                            setSearchResults([]);
                            setCurrentPage(1);
                            setTotalPages(1);

                            if (item === '교독문') {
                                setIsDocMode(true);
                                setSelectedCategory(item);
                            } else {
                                setIsDocMode(false);
                                setSelectedCategory(item);
                            }
                        }}
                    >
                        <Text
                            style={[
                                styles.categoryText,
                                selectedCategory === item && styles.categoryTextActive,
                            ]}
                        >
                            {item}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const renderSearchBar = () => (
        <View>
            <View style={styles.searchContainer}>
                <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="찬송가 제목, 번호로 검색"
                    value={searchKeyword}
                    onChangeText={handleSearchInputChange}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                >
                    <Text style={styles.searchButtonText}>검색</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // 검색 결과 헤더 (웹 스타일)
    const renderSearchResultHeader = () => (
        <View style={styles.searchResultHeader}>
            <View>
                <Text style={styles.searchResultTitle}>
                    <Text style={styles.searchKeywordText}>"{searchKeyword}"</Text>
                    에 대한 검색 결과
                </Text>
                <Text style={styles.searchResultCount}>
                    검색된 개수 <Text style={styles.searchCountNumber}>{searchResults.length}</Text>개
                </Text>
            </View>
            <TouchableOpacity onPress={handleClearSearch}>
                <Text style={styles.clearSearchText}>뒤로가기</Text>
            </TouchableOpacity>
        </View>
    );

    // 페이지네이션 컴포넌트
    const renderPagination = () => {
        if (!isSearchMode || totalPages <= 1) return null;

        const pageNumbers = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <View style={styles.paginationContainer}>
                {/* 이전 페이지 버튼 */}
                <TouchableOpacity
                    style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                    onPress={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                        {'<'}
                    </Text>
                </TouchableOpacity>

                {/* 페이지 번호 */}
                {pageNumbers.map((page) => (
                    <TouchableOpacity
                        key={page}
                        style={[
                            styles.paginationButton,
                            currentPage === page && styles.paginationButtonActive
                        ]}
                        onPress={() => handlePageChange(page)}
                    >
                        <Text style={[
                            styles.paginationButtonText,
                            currentPage === page && styles.paginationButtonTextActive
                        ]}>
                            {page}
                        </Text>
                    </TouchableOpacity>
                ))}

                {/* 다음 페이지 버튼 */}
                <TouchableOpacity
                    style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                    onPress={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                        {'>'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderDocList = () => (
        <View style={styles.docContainer}>
            <Text style={styles.docSectionTitle}>교독문</Text>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 1,
                    type: 'gyodok',
                    // title: '교독문 - 개역개정'
                })}
            >
                <Text style={styles.docItemText}>개역개정</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 2,
                    type: 'gyodok',
                    // title: '교독문 - 개역한글'
                })}
            >
                <Text style={styles.docItemText}>개역한글</Text>
            </TouchableOpacity>

            <Text style={styles.docSectionTitle}>주기도문</Text>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 1,
                    type: 'kido',
                    // title: '주기도문 - 개역개정'
                })}
            >
                <Text style={styles.docItemText}>개역개정</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 2,
                    type: 'kido',
                    // title: '주기도문 - 개역한글'
                })}
            >
                <Text style={styles.docItemText}>개역한글</Text>
            </TouchableOpacity>

            <Text style={styles.docSectionTitle}>사도신경</Text>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 1,
                    type: 'sado',
                    // title: '사도신경 - 개역개정'
                })}
            >
                <Text style={styles.docItemText}>개역개정</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 2,
                    type: 'sado',
                    // title: '사도신경 - 개역한글'
                })}
            >
                <Text style={styles.docItemText}>개역한글</Text>
            </TouchableOpacity>
        </View>
    );

    const renderHymnItem = ({ item }: { item: HymnData }) => (
        <TouchableOpacity
            style={styles.hymnItem}
            onPress={() => navigation.navigate('HymnDetailScreen', { hymnId: item.id })}
        >
            <View style={styles.hymnItemContent}>
                <Text style={styles.hymnNum}>{item.num}</Text>
                <View style={styles.hymnInfo}>
                    {isSearchMode ? (
                        <HighlightText text={item.title} keyword={searchKeyword} />
                    ) : (
                        <Text style={styles.hymnTitle}>{item.title}</Text>
                    )}
                    <Text style={styles.hymnOldNum}>
                        {`통일 찬송가${item?.oldnum !== undefined && item.oldnum !== null && String(item.oldnum).trim() !== '' ? ` ${item.oldnum}장` : ''}`}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // 개선된 빈 검색 결과 컴포넌트
    const renderEmptySearchResult = () => (
        <View style={styles.emptySearchContainer}>
            <Text style={styles.emptySearchIcon}>🔍</Text>
            <Text style={styles.emptySearchTitle}>
                "{searchKeyword}" 검색 결과가 없습니다
            </Text>
            <Text style={styles.emptySearchSubtitle}>
                다른 검색어를 입력해보세요
            </Text>
            <View style={styles.searchTipsContainer}>
                <Text style={styles.searchTipsTitle}>검색 팁:</Text>
                <Text style={styles.searchTip}>• 찬송가 번호로 검색해보세요 (예: 1, 23, 456)</Text>
                <Text style={styles.searchTip}>• 제목 일부로 검색해보세요 (예: "주", "찬송")</Text>
                <Text style={styles.searchTip}>• 구 찬송가 번호로 검색해보세요</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <BackHeaderLayout title="찬송가" />
            <Box safeAreaTop bg={color.status} />

            {/* 배너 광고 */}
            <View style={[styles.adContainer, { top: 75 }]}>
                <BannerAdComponent />
            </View>

            {/* 검색바 */}
            <View style={{ top: 80 }}>
                {renderSearchBar()}
            </View>

            {/* 검색 모드가 아닐 때만 카테고리 헤더 표시 */}
            {!isSearchMode && renderCategoryHeader()}

            {/* 검색 결과 헤더 (검색 모드일 때만) */}
            {isSearchMode && renderSearchResultHeader()}

            {/* 컨텐츠 영역 */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2AC1BC" />
                    <Text style={styles.loadingText}>
                        {isSearchMode ? '검색 중...' : '불러오는 중...'}
                    </Text>
                </View>
            ) : isDocMode ? (
                renderDocList()
            ) : (
                <>
                    <FlatList
                        data={filteredHymnList}
                        renderItem={renderHymnItem}
                        keyExtractor={(item, idx) =>
                            item?.id != null
                                ? `hymn-${String(item.id)}`
                                : `hymn-fallback-${String(item?.num ?? '')}-${idx}`
                        }
                        contentContainerStyle={[
                            styles.listContainer,
                            { paddingBottom: insets.bottom + 140 } // 페이지네이션 공간 확보
                        ]}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={() => (
                            isSearchMode ? renderEmptySearchResult() : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>찬송가 목록이 없습니다.</Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={loadHymnData}
                                    >
                                        <Text style={styles.retryButtonText}>다시 불러오기</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        )}
                    />

                    {/* 페이지네이션 (검색 모드일 때만) */}
                    {renderPagination()}
                </>
            )}

            <FooterLayout />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    adContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#FFFFFF',
        marginTop: 75,
    },
    categoryItem: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    categoryItemActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#2AC1BC',
    },
    categoryText: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.5)',
    },
    categoryTextActive: {
        color: '#2AC1BC',
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        margin: 8,
        borderWidth: 2,
        borderColor: '#2AC1BC',
        borderRadius: 16,
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 13,
        fontSize: 14,
        height: 44,
    },
    searchButton: {
        width: 64,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    searchButtonText: {
        color: '#2AC1BC',
        fontSize: 14,
        fontWeight: '500',
    },
    // 웹 스타일의 검색 결과 헤더
    searchResultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F0F0F0',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        marginTop: 75,
    },
    searchResultTitle: {
        fontSize: 14,
        color: '#333333',
        marginBottom: 4,
    },
    searchKeywordText: {
        fontWeight: '600',
        color: '#FF0000',
    },
    searchResultCount: {
        fontSize: 12,
        color: '#666666',
    },
    searchCountNumber: {
        color: '#FF0000',
        fontWeight: '600',
    },
    clearSearchText: {
        fontSize: 12,
        color: '#666666',
    },
    listContainer: {
        paddingTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999999',
        marginBottom: 16,
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#2AC1BC',
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    hymnItem: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
    },
    hymnItemContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    hymnNum: {
        fontSize: 16,
        color: '#2AC1BC',
        fontWeight: '600',
        marginRight: 12,
        minWidth: 40,
    },
    hymnInfo: {
        flex: 1,
    },
    hymnTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
        color: '#000000',
    },
    hymnOldNum: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.5)',
    },
    separator: {
        height: 1,
        backgroundColor: '#ECECEC',
    },
    docContainer: {
        flex: 1,
    },
    docSectionTitle: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#E5E5E5',
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.5)',
    },
    docItem: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#FFFFFF',
    },
    docItemText: {
        fontSize: 16,
        color: '#000000',
    },
    // 빈 검색 결과 스타일
    emptySearchContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptySearchIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptySearchTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySearchSubtitle: {
        fontSize: 14,
        color: '#999999',
        marginBottom: 24,
        textAlign: 'center',
    },
    searchTipsContainer: {
        backgroundColor: '#F9F9F9',
        padding: 16,
        borderRadius: 8,
        width: '100%',
    },
    searchTipsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2AC1BC',
        marginBottom: 8,
    },
    searchTip: {
        fontSize: 13,
        color: '#666666',
        marginBottom: 4,
        lineHeight: 20,
    },
    // 페이지네이션 스타일
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
        gap: 8,
    },
    paginationButton: {
        minWidth: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ECECEC',
        backgroundColor: '#FFFFFF',
    },
    paginationButtonActive: {
        backgroundColor: '#2AC1BC',
        borderColor: '#2AC1BC',
    },
    paginationButtonDisabled: {
        opacity: 0.3,
    },
    paginationButtonText: {
        fontSize: 14,
        color: '#333333',
        fontWeight: '500',
    },
    paginationButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    paginationButtonTextDisabled: {
        color: '#999999',
    },
});