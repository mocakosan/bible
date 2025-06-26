import { Button, IconButton, Text } from 'native-base';
import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { useBaseStyle } from '../../../hooks';
import { bibleSetting, defineSQL, fetchSql } from '../../../utils';
import { defaultStorage } from '../../../utils/mmkv';
import { useBibleReading } from '../../../utils/useBibleReading';

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
    const {
        isChapterReadSync,
        markChapterAsRead,
        markChapterAsUnread,
        planData,
        updateReadingTableCache,
        loadReadingTableData,
        forceRefresh
    } = useBibleReading();

    const BOOK = defaultStorage.getNumber('bible_book_connec') ?? 1;
    const JANG = defaultStorage.getNumber('bible_jang_connec') ?? 1;

    useEffect(() => {
        // 페이지 로드 시 읽기 상태 확인
        const loadReadStatus = async () => {
            // 1. reading_table에서 상태 로드
            const tableRead = await loadReadingTableData(BOOK, JANG);

            // 2. 일독 계획에서도 확인
            const planRead = isChapterReadSync(BOOK, JANG);

            // 3. 둘 중 하나라도 읽었으면 읽은 것으로 표시
            const finalRead = tableRead || planRead;
            setRead(finalRead);

            console.log(`Chapter ${BOOK}:${JANG} - Table: ${tableRead}, Plan: ${planRead}, Final: ${finalRead}`);
        };

        loadReadStatus();
    }, [BOOK, JANG, loadReadingTableData, isChapterReadSync]);

    const onReadPress = async () => {
        try {
            const newReadStatus = !read;

            //console.log(`🔄 ConectionPageBar: Changing read status for ${BOOK}:${JANG} from ${read} to ${newReadStatus}`);

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

            // 2. 캐시 업데이트 (이것이 리스트 표시에 중요!)
            updateReadingTableCache(BOOK, JANG, newReadStatus);
            console.log('✅ ConectionPageBar: Updated reading table cache');

            // 3. 일독 계획 데이터도 업데이트 (있는 경우)
            if (planData) {
                if (newReadStatus) {
                    await markChapterAsRead(BOOK, JANG);
                    console.log('✅ ConectionPageBar: Marked chapter as read in plan data');
                } else {
                    await markChapterAsUnread(BOOK, JANG);
                    console.log('✅ ConectionPageBar: Marked chapter as unread in plan data');
                }
            }

            // 4. 로컬 상태 업데이트
            setRead(newReadStatus);
            console.log('✅ ConectionPageBar: Updated local read state');

            // 5. 🆕 훅의 강제 새로고침 실행 (리스트 업데이트를 위해)
            setTimeout(() => {
                console.log('🔄 ConectionPageBar: Triggering forceRefresh after state change');
                forceRefresh();
            }, 100);

            // 6. 상위 컴포넌트에 알림 (기존 로직)
            if (onReadStatusChange) {
                onReadStatusChange(BOOK, JANG, newReadStatus);
                console.log('✅ ConectionPageBar: Notified parent component');
            }

            // 7. 읽었을 때만 다음 장으로 이동 (기존 로직)
            if (newReadStatus) {
                console.log('➡️ ConectionPageBar: Moving to next chapter');
                onPressNext(JANG);
            }

            console.log(`✅ ConectionPageBar: Successfully updated read status to ${newReadStatus}`);

        } catch (error) {
            console.error('❌ ConectionPageBar: 읽기 상태 업데이트 오류:', error);
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