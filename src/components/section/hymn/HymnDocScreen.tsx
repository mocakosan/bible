import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/env';
import BackHeaderLayout from "../../layout/header/backHeader";
import BannerAdComponent from "../../../adforus";

type ContentType = 'gyodok' | 'kido' | 'sado';

interface DocItem {
    id: number;
    title: string;
}

interface HymnDocScreenProps {
    navigation?: any;
}

const HymnDocScreen: React.FC<HymnDocScreenProps> = ({ navigation }) => {
    const [selectedContent, setSelectedContent] = useState<ContentType>('gyodok');
    const [selectedVersion, setSelectedVersion] = useState<1 | 2>(1);
    const [docList, setDocList] = useState<DocItem[]>([]);
    const [loading, setLoading] = useState(false);

    // API 엔드포인트 설정
    const API_ENDPOINTS = {
        gyodok: '/chansong/gyodok',
        kido: '/chansong/kido',
        sado: '/chansong/sado',
    };

    const CONTENT_TITLES = {
        gyodok: '교독문',
        kido: '주기도문',
        sado: '사도신경',
    };

    useEffect(() => {
        loadDocList();
    }, [selectedContent, selectedVersion]);

    const loadDocList = async () => {
        setLoading(true);
        try {
            const endpoint = API_ENDPOINTS[selectedContent];
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
                params: { version: selectedVersion },
                timeout: 10000,
            });

            console.log(`✅ ${CONTENT_TITLES[selectedContent]} 목록 로드 성공:`, response.data);

            let list: DocItem[] = [];
            if (Array.isArray(response.data)) {
                list = response.data;
            } else if (response.data.list && Array.isArray(response.data.list)) {
                list = response.data.list;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                list = response.data.data;
            }

            setDocList(list);
        } catch (error) {
            console.error(`❌ ${CONTENT_TITLES[selectedContent]} 목록 로드 실패:`, error);
            Alert.alert(
                '데이터 로드 실패',
                `${CONTENT_TITLES[selectedContent]} 목록을 불러오는데 실패했습니다.\n네트워크 연결을 확인해주세요.`,
                [
                    { text: '다시 시도', onPress: () => loadDocList() },
                    { text: '취소', style: 'cancel' },
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDocItemPress = (item: DocItem, index: number) => {
        const num = String(index + 1).padStart(3, '0');
        console.log('📍 네비게이션 파라미터:', {
            id: item.id,
            title: item.title,
            version: selectedVersion,
            type: selectedContent,
            num: num,
            index: index
        });
        navigation.navigate('GyodokDetailScreen', {
            id: item.id,
            title: item.title,
            version: selectedVersion,
            type: selectedContent,
            num: num,
        });
    };

    const renderVersionTab = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[
                    styles.tabButton,
                    selectedVersion === 1 && styles.tabButtonActive,
                ]}
                onPress={() => setSelectedVersion(1)}
            >
                <Text
                    style={[
                        styles.tabButtonText,
                        selectedVersion === 1 && styles.tabButtonTextActive,
                    ]}
                >
                    개역개정
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                    styles.tabButton,
                    selectedVersion === 2 && styles.tabButtonActive,
                ]}
                onPress={() => setSelectedVersion(2)}
            >
                <Text
                    style={[
                        styles.tabButtonText,
                        selectedVersion === 2 && styles.tabButtonTextActive,
                    ]}
                >
                    개역한글
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderDocList = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2AC1BC" />
                    <Text style={styles.loadingText}>불러오는 중...</Text>
                </View>
            );
        }

        if (docList.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>목록이 없습니다.</Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.listContainer}>
                {docList.map((item, index) => (
                    <TouchableOpacity
                        key={item.id || index}
                        style={styles.listItem}
                        onPress={() => handleDocItemPress(item, index)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.listItemText}>
                            <Text style={styles.listItemNumber}>
                                {String(index + 1).padStart(3, '0')}
                            </Text>
                            {'\u00A0'}{item.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackHeaderLayout title="교독문" />
            <View style={styles.bannerContainer}>
                <BannerAdComponent />
            </View>
            {renderVersionTab()}
            {renderDocList()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    bannerContainer: {
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#F8F8F8',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
    },
    contentTabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#F8F8F8',
    },
    contentTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentTabActive: {
        borderBottomWidth: 3,
        borderBottomColor: '#2AC1BC',
    },
    contentTabText: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.5)',
        fontWeight: '500',
    },
    contentTabTextActive: {
        color: '#2AC1BC',
        fontWeight: '700',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#FFFFFF',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 0,
    },
    tabButtonActive: {
        backgroundColor: '#2AC1BC',
        borderBottomWidth: 0,
    },
    tabButtonText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    tabButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#999999',
    },
    listContainer: {
        backgroundColor: '#FFFFFF',
    },
    listItem: {
        flex:1,
        FlexDirection : 'column',
        AlignItems : 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#FFFFFF',

    },
    listItemNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2AC1BC',
    },
    listItemText: {
        marginTop: 12,
        marginBottom: -8,
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
        lineHeight: 22,
    },
});

export default HymnDocScreen;