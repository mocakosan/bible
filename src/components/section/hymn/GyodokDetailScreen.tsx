import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/env';
import BackHeaderLayout from "../../layout/header/backHeader";
import BannerAdComponent from "../../../adforus";

interface GyodokDetailProps {
    route?: {
        params: {
            id: number;
            title: string;
            version: number;
            type?: 'gyodok' | 'kido' | 'sado';
            num?: string;
        };
    };
    navigation?: any;
}

interface GyodokContent {
    id?: number;
    title: string;
    content: string;
    together?: number;  // 마지막 줄이 다같이인지 표시하는 플래그
}

const GyodokDetailScreen: React.FC<GyodokDetailProps> = ({ route, navigation }) => {
    const { id, title, version, type = 'gyodok', num } = route?.params || {
        id: 1,
        title: '',
        version: 1,
        type: 'gyodok'
    };

    const [contentData, setContentData] = useState<GyodokContent | null>(null);
    const [loading, setLoading] = useState(false);

    // API 설정
    const API_ENDPOINTS = {
        gyodok: '/chansong/gyodok',
        kido: '/chansong/kido',
        sado: '/chansong/sado',
    };

    const API_ENDPOINT = API_ENDPOINTS[type];

    useEffect(() => {
        loadGyodokContent();
    }, [id, version]);

    const loadGyodokContent = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}${API_ENDPOINT}`, {
                params: {
                    version: version,
                    id: id
                },
                timeout: 10000,
            });

            console.log('✅ 교독문 내용 로드 성공:', response.data);

            if (response.data) {
                if (Array.isArray(response.data)) {
                    const foundItem = response.data.find(item => item.id === id);
                    if (foundItem) {
                        setContentData(foundItem);
                    } else {
                        throw new Error('해당 교독문을 찾을 수 없습니다.');
                    }
                } else if (response.data.content || response.data.title) {
                    setContentData(response.data);
                } else if (response.data.data) {
                    if (Array.isArray(response.data.data)) {
                        const foundItem = response.data.data.find(item => item.id === id);
                        if (foundItem) {
                            setContentData(foundItem);
                        } else {
                            throw new Error('해당 교독문을 찾을 수 없습니다.');
                        }
                    } else {
                        setContentData(response.data.data);
                    }
                } else {
                    throw new Error('데이터를 찾을 수 없습니다.');
                }
            } else {
                throw new Error('데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ 교독문 내용 로드 실패:', error);
            Alert.alert(
                '데이터 로드 실패',
                '교독문 내용을 불러오는데 실패했습니다.\n네트워크 연결을 확인해주세요.',
                [
                    { text: '다시 시도', onPress: () => loadGyodokContent() },
                    { text: '확인', style: 'cancel' },
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    // ✅ 교독문/주기도문/사도신경에 따라 다른 렌더링
    const renderFormattedContent = (content: string, together?: number) => {
        // HTML의 <br /> 태그 또는 \n으로 분리
        // 먼저 \n을 <br />로 통일
        const normalizedContent = content.replace(/\n/g, '<br />');
        const lines = normalizedContent.split('<br />').filter(line => line.trim());

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                return null;
            }

            // 교독문인 경우: (인도자), (회중), (다같이) 표시
            if (type === 'gyodok') {
                // 마지막 줄이고 together 플래그가 있으면 (다같이)
                if (together && index === lines.length - 1) {
                    return (
                        <Text key={index} style={styles.congregationText}>
                            (다같이) {trimmedLine}
                        </Text>
                    );
                }
                // 첫 줄(0) 또는 짝수 인덱스 → (인도자) - 청록색
                else if (index === 0 || index % 2 === 0) {
                    return (
                        <Text key={index} style={styles.leaderText}>
                            (인도자) {trimmedLine}
                        </Text>
                    );
                }
                // 홀수 인덱스 → (회중) - 검정색
                else {
                    return (
                        <Text key={index} style={styles.congregationText}>
                            (회중) {trimmedLine}
                        </Text>
                    );
                }
            }
            // ✅ 주기도문, 사도신경인 경우: 그냥 텍스트만 표시 (인도자/회중 표시 없음)
            else {
                return (
                    <Text key={index} style={styles.plainText}>
                        {trimmedLine}
                    </Text>
                );
            }
        });
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2AC1BC" />
                    <Text style={styles.loadingText}>불러오는 중...</Text>
                </View>
            );
        }

        if (!contentData) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>내용이 없습니다.</Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.contentContainer}>
                <View style={styles.contentWrapper}>
                    {renderFormattedContent(contentData.content, contentData.together)}
                </View>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackHeaderLayout title={num ? `${num} ${title}` : title}/>
            <View style={styles.bannerContainer}>
                <BannerAdComponent />
            </View>
            {renderContent()}
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
    contentContainer: {
        flex: 1,
    },
    contentWrapper: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        paddingBottom: 60,
    },
    // (인도자) - 청록색 + 볼드 (교독문용)
    leaderText: {
        fontSize: 17,
        lineHeight: 32,
        color: '#2AC1BC',
        fontWeight: '500',
        marginBottom: 20,
    },
    // (회중), (다같이) - 검정색 (교독문용)
    congregationText: {
        fontSize: 17,
        lineHeight: 32,
        color: '#000000',
        marginBottom: 20,
    },
    // ✅ 주기도문, 사도신경용 - 검정색, (인도자)/(회중) 표시 없음
    plainText: {
        fontSize: 17,
        lineHeight: 32,
        color: '#000000',
        marginBottom: 8,
    },
});

export default GyodokDetailScreen;