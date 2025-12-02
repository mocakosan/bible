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

interface DocContent {
    id?: number;
    title: string;
    content: string;
}

interface HymnDocScreenProps {
    route?: {
        params: {
            type?: ContentType;
            version?: 1 | 2;
        };
    };
    navigation?: any;
}

const HymnDocScreen: React.FC<HymnDocScreenProps> = ({ route, navigation }) => {
    const initialType = route?.params?.type || 'gyodok';
    const initialVersion = route?.params?.version || 1;

    const [selectedContent] = useState<ContentType>(initialType);
    const [selectedVersion, setSelectedVersion] = useState<1 | 2>(initialVersion);
    const [docList, setDocList] = useState<DocItem[]>([]);
    const [contentData, setContentData] = useState<DocContent | null>(null); // 주기도문/사도신경 내용
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

            // 주기도문과 사도신경은 바로 내용을 표시
            if (selectedContent === 'kido' || selectedContent === 'sado') {
                let itemData = null;

                // response.data.data 구조 확인
                if (response.data.data) {
                    itemData = response.data.data;
                } else if (response.data) {
                    itemData = response.data;
                }

                // 내용이 있으면 contentData에 저장
                if (itemData && (itemData.content || itemData.title)) {
                    setContentData({
                        id: itemData.id || 1,
                        title: itemData.title || CONTENT_TITLES[selectedContent],
                        content: itemData.content || ''
                    });
                } else {
                    console.warn('⚠️ 응답 데이터 구조:', response.data);
                    setContentData(null);
                }
            } else {
                // 교독문은 목록으로 반환
                let list: DocItem[] = [];
                if (Array.isArray(response.data)) {
                    list = response.data;
                } else if (response.data.list && Array.isArray(response.data.list)) {
                    list = response.data.list;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    list = response.data.data;
                }
                setDocList(list);
            }
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
        navigation.navigate('GyodokDetailScreen', {
            id: item.id,
            title: item.title,
            version: selectedVersion,
            type: selectedContent,
            num: selectedContent === 'gyodok' ? num : undefined,
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

    //주기도문/사도신경 내용 직접 표시
    const renderFormattedContent = (content: string) => {
        const normalizedContent = content.replace(/\n/g, '<br />');
        const lines = normalizedContent.split('<br />').filter(line => line.trim());

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                return null;
            }

            return (
                <Text key={index} style={styles.contentText}>
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
                    <Text style={styles.loadingText}>불러오는 중...</Text>
                </View>
            );
        }

        // 주기도문이나 사도신경인 경우 바로 내용 표시
        if (selectedContent === 'kido' || selectedContent === 'sado') {
            if (!contentData || !contentData.content) {
                return (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>내용이 없습니다.</Text>
                    </View>
                );
            }

            return (
                <ScrollView style={styles.contentScrollContainer}>
                    <View style={styles.contentWrapper}>
                        {renderFormattedContent(contentData.content)}
                    </View>
                </ScrollView>
            );
        }

        // 교독문인 경우 목록 표시
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
                            {selectedContent === 'gyodok' && (
                                <Text style={styles.listItemNumber}>
                                    {String(index + 1).padStart(3, '0')}{'\u00A0'}
                                </Text>
                            )}
                            {item.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackHeaderLayout title={CONTENT_TITLES[selectedContent]} />
            <View style={styles.bannerContainer}>
                <BannerAdComponent />
            </View>
            {renderVersionTab()}
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
        marginLeft:16
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
    contentScrollContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    contentWrapper: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        paddingBottom: 60,
    },
    contentText: {
        fontSize: 17,
        lineHeight: 32,
        color: '#000000',
        marginBottom: 8,
    },
});

export default HymnDocScreen;