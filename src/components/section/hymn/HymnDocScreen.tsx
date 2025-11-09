import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { Box, StatusBar } from 'native-base';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {useBaseStyle, useNativeNavigation} from "../../../hooks";
import {API_ENDPOINTS, apiClient} from "../../../utils/api";


interface DocData {
    title: string;
    content: string;
}

export default function HymnDocScreen() {
    const { navigation, route } = useNativeNavigation();
    const { version, type, title } = route.params as {
        version: number;
        type: 'gyodok' | 'kido' | 'sado';
        title: string;
    };
    const { color } = useBaseStyle();
    const insets = useSafeAreaInsets();

    const [docData, setDocData] = useState<DocData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDocData();
    }, [version, type]);

    const loadDocData = async () => {
        setLoading(true);
        try {
            // API_ENDPOINTS 맵핑
            const endpointMap = {
                'gyodok': API_ENDPOINTS.GYODOK, // '/chansong/gyodok'
                'kido': API_ENDPOINTS.KIDO,     // '/chansong/kido'
                'sado': API_ENDPOINTS.SADO,     // '/chansong/sado'
            };

            const endpoint = endpointMap[type];

            console.log(`📖 ${type} 데이터 로드:`, { endpoint, version });

            const response = await apiClient.get(endpoint, {
                params: { version }
            });

            console.log('✅ 교독문 데이터 로드 성공:', response.data);

            if (response.data) {
                setDocData(response.data);
            } else {
                throw new Error('데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ 교독문 데이터 로드 실패:', error);
            Alert.alert(
                '데이터 로드 실패',
                '정보를 불러오는데 실패했습니다.',
                [
                    { text: '다시 시도', onPress: () => loadDocData() },
                    { text: '닫기', onPress: () => navigation.goBack() }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading || !docData) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color="#2AC1BC" />
                <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Box safeAreaTop bg={color.status} />

            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 20 }
                ]}
            >
                <Text style={styles.docTitle}>{docData.title}</Text>
                <Text style={styles.docContent}>{docData.content}</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#2AC1BC',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        textAlign: 'center',
        marginRight: 40,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    docTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2AC1BC',
        marginBottom: 20,
        textAlign: 'center',
    },
    docContent: {
        fontSize: 16,
        lineHeight: 28,
        color: '#000000',
    },
});