import { Button, IconButton, Text } from 'native-base';
import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { useBaseStyle } from '../../../hooks';
import { bibleSetting, defineSQL, fetchSql } from '../../../utils';
import { defaultStorage } from '../../../utils/mmkv';
import {
    loadBiblePlanData,
    isChapterRead,
    markChapterAsRead,
    markChapterAsUnread,
    getSafePlanData
} from '../../../utils/biblePlanUtils';

export default function ConectionPageBar({
                                             onPressforward,
                                             onPressNext,
                                             isPlaying,
                                             setIsPlaying,
                                             autoPlay,
                                             setAutoPlay,
                                             onReadStatusChange
                                         }: {
    onPressNext: any;
    onPressforward: any;
    isPlaying: any;
    setIsPlaying: any;
    autoPlay: any;
    setAutoPlay: any;
    onReadStatusChange?: (book: number, chapter: number, isRead: boolean) => void;
}) {
    const { color } = useBaseStyle();
    const [read, setRead] = useState<boolean>(false);
    const [planData, setPlanData] = useState<any>(null);

    const BOOK = defaultStorage.getNumber('bible_book_connec') ?? 1;
    const JANG = defaultStorage.getNumber('bible_jang_connec') ?? 1;

    // 계획 데이터 로드
    useEffect(() => {
        const loadPlan = () => {
            const rawPlanData = loadBiblePlanData();
            const safePlan = getSafePlanData(rawPlanData);
            setPlanData(safePlan);
        };

        loadPlan();

        // 주기적으로 계획 데이터 새로고침 (옵션)
        const interval = setInterval(loadPlan, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadReadStatus = async () => {
            try {
                // 1. reading_table에서 상태 로드
                const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
                    WHERE: { BOOK: '?', JANG: '?' }
                })}`;

                const result = await fetchSql(bibleSetting, settingSelectSql, [BOOK, JANG], 0);
                const tableRead = result ? result.read === 'true' : false;

                // 2. 일독 계획에서 읽음 상태 확인
                let planRead = false;
                if (planData) {
                    planRead = isChapterRead(planData, BOOK, JANG);
                }

                // 3. 최종 읽음 상태 결정
                const finalRead = tableRead || planRead;
                setRead(finalRead);

                console.log(`Chapter ${BOOK}:${JANG} - Table: ${tableRead}, Plan: ${planRead}, Final: ${finalRead}`);
            } catch (error) {
                console.error('읽음 상태 로드 오류:', error);
                setRead(false);
            }
        };

        loadReadStatus();
    }, [BOOK, JANG, planData]);

    const onReadPress = async () => {
        try {
            const newReadStatus = !read;

            console.log(`🔄 ConectionPageBar: Changing read status for ${BOOK}:${JANG} from ${read} to ${newReadStatus}`);

            // 1. reading_table 업데이트
            const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
                WHERE: { BOOK: '?', JANG: '?' }
            })}`;

            const settingInserttSql = `${defineSQL(
                ['book', 'jang', 'read', 'time'],
                'INSERT',
                'reading_table',
                {}
            )}`;

            const settingUpdatetSql = `${defineSQL(
                ['read', 'time'],
                'UPDATE',
                'reading_table',
                {
                    WHERE: { BOOK, JANG }
                }
            )}`;

            const result = await fetchSql(bibleSetting, settingSelectSql, [BOOK, JANG], 0);

            // reading_table 업데이트
            if (result) {
                await fetchSql(bibleSetting, settingUpdatetSql, [
                    String(newReadStatus),
                    String(new Date())
                ]);
                console.log('✅ ConectionPageBar: Updated existing reading_table record');
            } else {
                await fetchSql(bibleSetting, settingInserttSql, [
                    BOOK,
                    JANG,
                    String(newReadStatus),
                    String(new Date())
                ]);
                console.log('✅ ConectionPageBar: Created new reading_table record');
            }

            // 2. 일독 계획 데이터 업데이트 (있는 경우)
            if (planData) {
                try {
                    let updatedPlanData;
                    if (newReadStatus) {
                        updatedPlanData = markChapterAsRead(planData, BOOK, JANG);
                        console.log('✅ ConectionPageBar: Marked chapter as read in plan data');
                    } else {
                        updatedPlanData = markChapterAsUnread(planData, BOOK, JANG);
                        console.log('✅ ConectionPageBar: Marked chapter as unread in plan data');
                    }

                    // 업데이트된 계획 데이터로 상태 갱신
                    const safePlan = getSafePlanData(updatedPlanData);
                    setPlanData(safePlan);
                } catch (planError) {
                    console.error('❌ 일독 계획 업데이트 오류:', planError);
                    // 일독 계획 업데이트 실패해도 계속 진행
                }
            }

            // 3. 로컬 상태 업데이트
            setRead(newReadStatus);
            console.log('✅ ConectionPageBar: Updated local read state');

            // 4. 상위 컴포넌트에 알림
            if (onReadStatusChange) {
                onReadStatusChange(BOOK, JANG, newReadStatus);
                console.log('✅ ConectionPageBar: Notified parent component');
            }

            // 5. 읽었을 때만 다음 장으로 이동
            if (newReadStatus) {
                console.log('➡️ ConectionPageBar: Moving to next chapter');
                setTimeout(() => {
                    onPressNext(JANG);
                }, 300); // 약간의 딜레이 추가
            }

            console.log(`✅ ConectionPageBar: Successfully updated read status to ${newReadStatus}`);

        } catch (error) {
            console.error('❌ ConectionPageBar: 읽기 상태 업데이트 오류:', error);
            // 에러가 발생해도 UI는 업데이트하지 않음
        }
    };

    return (
        <>
            <IconButton
                style={{ position: 'absolute', bottom: 0, left: 0 }}
                onPress={() => onPressforward(JANG)}
                icon={<AntDesignIcon name="caretleft" size={30} color={'#2AC1BC'} />}
            />
            <Button
                alignSelf={'center'}
                borderRadius="full"
                bg={read ? color.bible : color.gray4}
                fontSize={12}
                _pressed={{ bg: color.bible }}
                _hover={{}}
                width={'120px'}
                height={'30px'}
                onPress={onReadPress}
                padding={0}
                style={{
                    position: 'absolute',
                    left: Dimensions.get('screen').width / 2 - 60,
                    bottom: 5
                }}
            >
                <Text color={read ? color.white : color.black} fontSize={'10px'}>
                    {read ? '안읽음 체크' : '읽었음 체크'}
                </Text>
            </Button>
            <IconButton
                style={{ position: 'absolute', bottom: 0, right: 0 }}
                onPress={() => onPressNext(JANG)}
                icon={<AntDesignIcon name="caretright" size={30} color={'#2AC1BC'} />}
            />
        </>
    );
}