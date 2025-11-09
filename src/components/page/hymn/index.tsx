import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Box, StatusBar } from 'native-base';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {useBaseStyle, useNativeNavigation} from "../../../hooks";
import {HymnCategory, HymnData} from "../../../types/hymn";
import {API_ENDPOINTS, apiClient} from "../../../utils/api";
import BannerAdComponent from "../../../adforus";
import FooterLayout from "../../layout/footer/footer";
import BackHeaderLayout from "../../layout/header/backHeader";


const HYMN_CATEGORIES: HymnCategory[] = [
    '교독문','100', '200', '300', '400', '500', '600', '700' , '분류'
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

    // 찬송가 데이터 로드
    useEffect(() => {
        if (!isDocMode) {
            loadHymnData();
        }
    }, [selectedCategory, isDocMode]);

    const loadHymnData = async () => {
        setLoading(true);
        try {
            // API_ENDPOINTS.HYMN_LIST = '/chansong/song'
            const response = await apiClient.get(API_ENDPOINTS.HYMN_LIST, {
                params: {
                    take: 100,
                    page: 1,
                }
            });

            // console.log('✅ 찬송가 데이터 로드 성공:', response.data);

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

    const handleSearch = async () => {
        if (!searchKeyword.trim()) {
            Alert.alert('알림', '검색어를 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.get(API_ENDPOINTS.HYMN_LIST, {
                params: {
                    keyword: searchKeyword,
                    page: 1,
                    take: 10
                }
            });

            console.log('✅ 검색 결과:', response.data);

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
                Alert.alert('검색 결과', '검색 결과가 없습니다.');
            }
        } catch (error) {
            console.error('❌ 검색 실패:', error);
            Alert.alert('검색 실패', '검색 중 오류가 발생했습니다.');
            setHymnList([]);
        } finally {
            setLoading(false);
        }
    };

    const renderCategoryHeader = () => (
        <View style={styles.categoryContainer}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={HYMN_CATEGORIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.categoryItem,
                            selectedCategory === item && styles.categoryItemActive
                        ]}
                        onPress={() => {
                            if (item === '교독문') {
                                setIsDocMode(true);
                                setSelectedCategory(item);
                            } else {
                                setIsDocMode(false);
                                setSelectedCategory(item);
                                setSearchKeyword('');
                            }
                        }}
                    >
                        <Text
                            style={[
                                styles.categoryText,
                                selectedCategory === item && styles.categoryTextActive
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
        <View style={styles.searchContainer}>
            <TextInput
                style={styles.searchInput}
                placeholder="검색어를 입력하세요."
                value={searchKeyword}
                onChangeText={setSearchKeyword}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
            />
            <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
            >
                <Text style={styles.searchButtonText}>검색</Text>
            </TouchableOpacity>
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
                        {item.oldnum ? `통일 찬송가 ${item.oldnum}장` : ''}
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
                    <Text style={styles.loadingText}>불러오는 중...</Text>
                </View>
            ) : isDocMode ? (
                renderDocList()
            ) : (
                <FlatList
                    data={hymnList}
                    renderItem={renderHymnItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[
                        styles.listContainer,
                        { paddingBottom: insets.bottom + 80 }
                    ]}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>찬송가 목록이 없습니다.</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={loadHymnData}
                            >
                                <Text style={styles.retryButtonText}>다시 불러오기</Text>
                            </TouchableOpacity>
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