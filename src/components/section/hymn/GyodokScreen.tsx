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
import {API_BASE_URL} from "../../../config/env";


interface GyodokItem {
    id: number;
    title: string;
}

interface GyodokScreenProps {
    navigation?: any; // React Navigation 사용 시
}

const GyodokScreen: React.FC<GyodokScreenProps> = ({ navigation }) => {
    const [selectedVersion, setSelectedVersion] = useState<1 | 2>(1); // 1: 개역개정, 2: 개역한글
    const [gyodokList, setGyodokList] = useState<GyodokItem[]>([]);
    const [loading, setLoading] = useState(false);

    // API 설정
    const API_ENDPOINT = '/chansong/gyodok';

    useEffect(() => {
        loadGyodokList();
    }, [selectedVersion]);

    const loadGyodokList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}${API_ENDPOINT}`, {
                params: { version: selectedVersion },
                timeout: 10000,
            });

            console.log('✅ 교독문 목록 로드 성공:', response.data);

            // 응답 데이터 처리
            let list: GyodokItem[] = [];
            if (Array.isArray(response.data)) {
                list = response.data;
            } else if (response.data.list && Array.isArray(response.data.list)) {
                list = response.data.list;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                list = response.data.data;
            }

            setGyodokList(list);
        } catch (error) {
            console.error('❌ 교독문 목록 로드 실패:', error);
            Alert.alert(
                '데이터 로드 실패',
                '교독문 목록을 불러오는데 실패했습니다.\n네트워크 연결을 확인해주세요.',
                [
                    { text: '다시 시도', onPress: () => loadGyodokList() },
                    { text: '취소', style: 'cancel' },
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGyodokItemPress = (item: GyodokItem) => {
        // 상세 화면으로 이동 (React Navigation 사용 시)
        if (navigation) {
            navigation.navigate('GyodokDetail', {
                id: item.id,
                title: item.title,
                version: selectedVersion,
            });
        }
        console.log('교독문 선택:', item);
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

    const renderGyodokList = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2AC1BC" />
                    <Text style={styles.loadingText}>교독문을 불러오는 중...</Text>
                </View>
            );
        }

        if (gyodokList.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>교독문이 없습니다.</Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.listContainer}>
                {gyodokList.map((item, index) => (
                    <TouchableOpacity
                        key={item.id || index}
                        style={styles.listItem}
                        onPress={() => handleGyodokItemPress(item)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.listItemText}>{item.title}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>교독문</Text>
            </View>
            {renderVersionTab()}
            {renderGyodokList()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    tabButtonActive: {
        backgroundColor: '#2AC1BC',
    },
    tabButtonText: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.5)',
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
        flex: 1,
    },
    listItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    listItemText: {
        fontSize: 16,
        color: '#333333',
        fontWeight: '500',
    },
});

export default GyodokScreen;