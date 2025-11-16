import React, { useState, useEffect, useMemo, useRef } from 'react';
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { HymnCategory, HymnData } from "../../../types/hymn";
import { API_ENDPOINTS, apiClient } from "../../../utils/api";
import BannerAdComponent from "../../../adforus";
import FooterLayout from "../../layout/footer/footer";
import BackHeaderLayout from "../../layout/header/backHeader";


const HYMN_CATEGORIES: HymnCategory[] = [
    '교독문', '100', '200', '300', '400', '500', '600'
];

export default function HymnListScreen() {
    const { navigation } = useNativeNavigation();
    const { color } = useBaseStyle();
    const insets = useSafeAreaInsets();

    const [selectedCategory, setSelectedCategory] = useState<HymnCategory>('100');
    const [hymnList, setHymnList] = useState<HymnData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isDocMode, setIsDocMode] = useState(false);
    // 웹 검색 기능을 위한 상태 추가
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const searchInputRef = useRef<TextInput>(null);

    // 찬송가 데이터 로드
    useEffect(() => {
        if (!isDocMode && !isSearchMode) {
            loadHymnData();
        }
    }, [selectedCategory, isDocMode, isSearchMode]);

    const loadHymnData = async () => {
        setLoading(true);
        try {
            // 올바른 엔드포인트 사용: /chansong/song
            const response = await apiClient.get(API_ENDPOINTS.HYMN_LIST, {
                params: {
                    take: 700,
                    page: 1,
                }
            });

            console.log('✅ 찬송가 데이터 로드 성공:', response.data);

            // 응답 데이터 처리 - 다양한 형식 지원
            let list = [];
            if (Array.isArray(response.data)) {
                list = response.data;
            } else if (response.data.list && Array.isArray(response.data.list)) {
                list = response.data.list;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                list = response.data.data;
            }

            setHymnList(list);

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

    // 웹 스타일 검색 - 클라이언트 사이드 필터링 방식
    const handleSearch = async (page: number = 1) => {
        const keyword = searchKeyword.trim();

        if (!keyword) {
            Alert.alert('알림', '검색어를 입력해주세요.');
            return;
        }

        Keyboard.dismiss();
        setIsSearchMode(true);
        setCurrentPage(page);
        setLoading(true);

        try {
            // 전체 데이터를 먼저 로드
            const response = await apiClient.get(API_ENDPOINTS.HYMN_LIST, {
                params: {
                    take: 700,  // 전체 데이터 로드
                    page: 1,
                }
            });

            console.log(`🔍 검색어: "${keyword}"`);

            let allList = [];
            if (Array.isArray(response.data)) {
                allList = response.data;
            } else if (response.data.list && Array.isArray(response.data.list)) {
                allList = response.data.list;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                allList = response.data.data;
            }

            // 클라이언트 사이드에서 필터링 (웹 방식)
            const filteredList = allList.filter((item: HymnData) => {
                const searchLower = keyword.toLowerCase();

                // 찬송가 번호로 검색 (부분 일치)
                if (item.num && String(item.num).includes(keyword)) {
                    return true;
                }

                // 제목으로 검색 (포함 여부)
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

            console.log(`✅ 검색 결과: ${filteredList.length}개`);
            setHymnList(filteredList);

            if (filteredList.length === 0) {
                Alert.alert('검색 결과', `"${keyword}" 검색 결과가 없습니다.`);
            }
        } catch (error: any) {
            console.error('❌ 검색 실패:', error);
            Alert.alert('검색 실패', '검색 중 오류가 발생했습니다.');
            setHymnList([]);
        } finally {
            setLoading(false);
        }
    };

    // 웹처럼 Enter 키로 검색
    const handleSearchSubmit = () => {
        if (searchKeyword.trim()) {
            handleSearch(1);
        }
    };

    // 검색 초기화 (웹의 전체보기 기능)
    const handleClearSearch = () => {
        setSearchKeyword('');
        setIsSearchMode(false);
        setCurrentPage(1);
        loadHymnData();
    };

    // 숫자만 뽑아 안전하게 변환
    const toNum = (v: unknown) => {
        const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
        return Number.isNaN(n) ? null : n;
    };

    const filteredHymnList = useMemo(() => {
        // 검색 모드일 때는 필터링 없이 검색 결과만 표시
        if (isSearchMode) {
            return hymnList;
        }

        // '교독문'이나 '분류' 같은 비숫자 탭이면 전체 노출
        const catNum = parseInt(String(selectedCategory), 10);
        if (!Number.isFinite(catNum)) return hymnList;

        const lower = catNum;                           // 100, 200, …
        const upper = catNum === 700 ? Infinity : catNum + 100; // 700은 700+
        return hymnList.filter((it) => {
            const n = toNum(it?.num);
            return n !== null && n >= lower && n < upper;
        });
    }, [hymnList, selectedCategory, isSearchMode]);

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
                            // 웹처럼 카테고리 변경 시 검색 초기화
                            setIsSearchMode(false);
                            setSearchKeyword('');
                            setCurrentPage(1);

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
                    placeholder="검색어를 입력하세요."
                    value={searchKeyword}
                    onChangeText={setSearchKeyword}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={() => handleSearch(1)}
                >
                    <Text style={styles.searchButtonText}>검색</Text>
                </TouchableOpacity>
            </View>

            {/* 웹 스타일의 검색 결과 헤더 */}
            {isSearchMode && (
                <View style={styles.searchResultHeader}>
                    <Text style={styles.searchResultText}>
                        "{searchKeyword}" 검색 결과 ({filteredHymnList.length}개)
                    </Text>
                    <TouchableOpacity onPress={handleClearSearch}>
                        <Text style={styles.clearSearchText}>전체보기</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderDocList = () => (
        <View style={styles.docContainer}>
            <Text style={styles.docSectionTitle}>교독문</Text>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 1,
                    type: 'gyodok',
                    title: '교독문 - 개역개정'
                })}
            >
                <Text style={styles.docItemText}>개역개정</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 2,
                    type: 'gyodok',
                    title: '교독문 - 개역한글'
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
                    title: '주기도문 - 개역개정'
                })}
            >
                <Text style={styles.docItemText}>개역개정</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 2,
                    type: 'kido',
                    title: '주기도문 - 개역한글'
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
                    title: '사도신경 - 개역개정'
                })}
            >
                <Text style={styles.docItemText}>개역개정</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.docItem}
                onPress={() => navigation.navigate('HymnDocScreen', {
                    version: 2,
                    type: 'sado',
                    title: '사도신경 - 개역한글'
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
                    <Text style={styles.hymnTitle}>{item.title}</Text>
                    <Text style={styles.hymnOldNum}>
                        {`통일 찬송가${item?.oldnum !== undefined && item.oldnum !== null && String(item.oldnum).trim() !== '' ? ` ${item.oldnum}장` : ''}`}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <BackHeaderLayout title="찬송가" />
            <Box safeAreaTop bg={color.status} />

            {/* 배너 광고 */}
            <View style={[styles.adContainer, { top: 65 }]}>
                <BannerAdComponent />
            </View>

            {/* 카테고리 헤더 */}
            {renderCategoryHeader()}

            {/* 검색바 */}
            {!isDocMode && renderSearchBar()}

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
                        { paddingBottom: insets.bottom + 80 }
                    ]}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {isSearchMode ? '검색 결과가 없습니다.' : '찬송가 목록이 없습니다.'}
                            </Text>
                            {!isSearchMode && (
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={loadHymnData}
                                >
                                    <Text style={styles.retryButtonText}>다시 불러오기</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                />
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
    // 웹 스타일의 검색 결과 헤더 추가
    searchResultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    searchResultText: {
        fontSize: 14,
        color: '#333333',
        fontWeight: '500',
    },
    clearSearchText: {
        fontSize: 14,
        color: '#2AC1BC',
        fontWeight: '600',
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
});