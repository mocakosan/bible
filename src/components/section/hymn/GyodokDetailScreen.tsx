import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/env';

interface GyodokDetailProps {
    route?: {
        params: {
            id: number;
            title: string;
            version: number;
            type?: 'gyodok' | 'kido' | 'sado';
        };
    };
    navigation?: any;
}

interface GyodokContent {
    id?: number;
    title: string;
    content: string;
}

const GyodokDetailScreen: React.FC<GyodokDetailProps> = ({ route, navigation }) => {
    const { id, title, version, type = 'gyodok' } = route?.params || { id: 1, title: '', version: 1, type: 'gyodok' };

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
                    id: id  // id 파라미터 추가
                },
                timeout: 10000,
            });

            console.log('✅ 교독문 내용 로드 성공:', response.data);

            // 응답 데이터 처리 개선
            if (response.data) {
                // 배열로 응답이 온 경우 id와 일치하는 항목 찾기
                if (Array.isArray(response.data)) {
                    const foundItem = response.data.find(item => item.id === id);
                    if (foundItem) {
                        setContentData(foundItem);
                    } else {
                        throw new Error('해당 교독문을 찾을 수 없습니다.');
                    }
                }
                // 객체로 응답이 온 경우
                else if (response.data.content || response.data.title) {
                    setContentData(response.data);
                }
                // data 속성 안에 있는 경우
                else if (response.data.data) {
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

    const handleBackPress = () => {
        if (navigation) {
            navigation.goBack();
        }
    };

    // HTML 태그를 텍스트로 변환하는 함수
    const parseHtmlContent = (htmlContent: string): string => {
        if (!htmlContent) return '';

        return htmlContent
            // <br>, <br/>, <br /> 등 모든 줄바꿈 태그를 실제 줄바꿈으로 변환
            .replace(/<br\s*\/?>/gi, '\n')
            // <p> 태그는 앞뒤로 줄바꿈 추가
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            // 기타 HTML 태그 제거
            .replace(/<[^>]+>/g, '')
            // HTML 엔티티 변환
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // 연속된 줄바꿈을 2개까지만 허용
            .replace(/\n{3,}/g, '\n\n')
            // 앞뒤 공백 제거
            .trim();
    };

    // 교독문 내용을 파싱하여 구조화된 컴포넌트로 렌더링
    const renderFormattedContent = (content: string) => {
        const cleanContent = parseHtmlContent(content);
        const lines = cleanContent.split('\n');

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                // 빈 줄은 간격으로 표시
                return <View key={index} style={styles.emptyLine} />;
            }

            // (인도자), (회중), (다같이) 표시 확인
            if (trimmedLine.includes('(인도자)') || trimmedLine.includes('인도자:')) {
                return (
                    <View key={index} style={styles.leaderContainer}>
                        <Text style={styles.leaderLabel}>[인도자]</Text>
                        <Text style={styles.leaderText}>
                            {trimmedLine.replace(/\(인도자\)|인도자:/g, '').trim()}
                        </Text>
                    </View>
                );
            }

            if (trimmedLine.includes('(회중)') || trimmedLine.includes('회중:')) {
                return (
                    <View key={index} style={styles.congregationContainer}>
                        <Text style={styles.congregationLabel}>[회중]</Text>
                        <Text style={styles.congregationText}>
                            {trimmedLine.replace(/\(회중\)|회중:/g, '').trim()}
                        </Text>
                    </View>
                );
            }

            if (trimmedLine.includes('(다같이)') || trimmedLine.includes('다같이:')) {
                return (
                    <View key={index} style={styles.allTogetherContainer}>
                        <Text style={styles.allTogetherLabel}>[다같이]</Text>
                        <Text style={styles.allTogetherText}>
                            {trimmedLine.replace(/\(다같이\)|다같이:/g, '').trim()}
                        </Text>
                    </View>
                );
            }

            // 일반 텍스트
            return (
                <Text key={index} style={styles.normalText}>
                    {trimmedLine}
                </Text>
            );
        });
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2AC1BC" />
                    <Text style={styles.loadingText}>교독문을 불러오는 중...</Text>
                </View>
            );
        }

        if (!contentData) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>교독문 내용이 없습니다.</Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.contentContainer}>
                <View style={styles.contentWrapper}>
                    {/* 교독문 제목 */}
                    {contentData.title && (
                        <Text style={styles.titleText}>{contentData.title}</Text>
                    )}

                    {/* 교독문 내용 - 구조화된 렌더링 */}
                    {renderFormattedContent(contentData.content)}
                </View>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBackPress}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {title}
                </Text>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.versionBadge}>
                <Text style={styles.versionText}>
                    {version === 1 ? '개역개정' : '개역한글'}
                </Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: '#F8F8F8',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: '#333333',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        textAlign: 'center',
        marginHorizontal: 8,
    },
    headerRight: {
        width: 40,
    },
    versionBadge: {
        padding: 12,
        backgroundColor: '#F0F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    versionText: {
        fontSize: 14,
        color: '#2AC1BC',
        fontWeight: '600',
        textAlign: 'center',
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
        padding: 20,
    },
    titleText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2AC1BC',
        marginBottom: 20,
        textAlign: 'center',
    },
    contentText: {
        fontSize: 16,
        lineHeight: 28,
        color: '#333333',
        letterSpacing: 0.3,
    },
    // 빈 줄
    emptyLine: {
        height: 12,
    },
    // 인도자 스타일
    leaderContainer: {
        marginVertical: 8,
        paddingLeft: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#2AC1BC',
    },
    leaderLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2AC1BC',
        marginBottom: 4,
    },
    leaderText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#333333',
    },
    // 회중 스타일
    congregationContainer: {
        marginVertical: 8,
        paddingLeft: 16,
        backgroundColor: '#F8F8F8',
        paddingVertical: 8,
        paddingRight: 8,
        borderRadius: 4,
    },
    congregationLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#666666',
        marginBottom: 4,
    },
    congregationText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#555555',
    },
    // 다같이 스타일
    allTogetherContainer: {
        marginVertical: 12,
        padding: 12,
        backgroundColor: '#E8F5F4',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#2AC1BC',
    },
    allTogetherLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2AC1BC',
        marginBottom: 6,
        textAlign: 'center',
    },
    allTogetherText: {
        fontSize: 17,
        lineHeight: 28,
        color: '#333333',
        fontWeight: '600',
        textAlign: 'center',
    },
    // 일반 텍스트
    normalText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#333333',
        marginVertical: 4,
    },
});

export default GyodokDetailScreen;