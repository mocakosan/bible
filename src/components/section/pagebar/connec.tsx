import { Button, IconButton, Text } from 'native-base';
import { useCallback, useEffect, useState, useRef } from 'react';
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
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // 중복 실행 방지
    const isUpdatingRef = useRef(false);
    const lastUpdateTimeRef = useRef(0);

    const {
        isChapterReadSync,
        markChapterAsRead,
        markChapterAsUnread,
        planData,
        updateReadingTableCache,
        readingTableData,
        forceRefresh
    } = useBibleReading();

    const BOOK = defaultStorage.getNumber('bible_book_connec') ?? 1;
    const JANG = defaultStorage.getNumber('bible_jang_connec') ?? 1;

    //핵심 수정: 읽기 상태 로드
    useEffect(() => {
        const loadReadStatus = async () => {
            setIsLoaded(false);

            const key = `${BOOK}_${JANG}`;

            //먼저 메모리 캐시에서 확인
            if (readingTableData && readingTableData[key] !== undefined) {
                const cachedRead = readingTableData[key];
                console.log(`[CACHE HIT] ${key} = ${cachedRead}`);

                // 일독 계획도 확인
                let planRead = false;
                if (planData) {
                    planRead = isChapterReadSync(BOOK, JANG);
                }

                const finalRead = cachedRead || planRead;
                console.log(`[UI] Button: "${finalRead ? '안읽음 체크' : '읽었음 체크'}"`);

                setRead(finalRead);
                setIsLoaded(true);
                return;
            }

            //캐시에 없으면 DB에서 직접 조회
            console.log(`[CACHE MISS] ${key} - DB에서 직접 조회 (캐시 업데이트 안함)`);

            try {
                const sql = `SELECT read FROM reading_table WHERE book = ? AND jang = ?`;
                const result = await fetchSql(bibleSetting, sql, [BOOK, JANG], 0);

                let dbRead = false;
                if (result && result.read !== undefined) {
                    // read 값 정확하게 파싱
                    if (typeof result.read === 'boolean') {
                        dbRead = result.read;
                    } else if (typeof result.read === 'string') {
                        dbRead = result.read === 'true' || result.read === 'True' || result.read === '1';
                    }
                    console.log(`[DB] ${key} = ${dbRead}`);
                } else {
                    //DB에 데이터가 없으면 false, 하지만 캐시 업데이트 안함!
                    console.log(`[NO DATA] ${key} - DB에 데이터 없음`);
                    dbRead = false;
                }

                // 일독 계획도 확인
                let planRead = false;
                if (planData) {
                    planRead = isChapterReadSync(BOOK, JANG);
                }

                const finalRead = dbRead || planRead;
                console.log(`[UI] Button: "${finalRead ? '안읽음 체크' : '읽었음 체크'}"`);

                setRead(finalRead);
            } catch (error) {
                console.error('DB 조회 오류:', error);
                setRead(false);
            }

            setIsLoaded(true);
        };

        loadReadStatus();
    }, [BOOK, JANG, readingTableData, planData, isChapterReadSync]);

    //읽기 상태 토글
    const onReadPress = useCallback(async () => {
        const now = Date.now();

        // 디바운싱 (200ms)
        if (now - lastUpdateTimeRef.current < 200) {
            console.log('Debounce - skipping');
            return;
        }

        if (isUpdatingRef.current || isProcessing) {
            console.log('Already processing - skipping');
            return;
        }

        try {
            isUpdatingRef.current = true;
            setIsProcessing(true);
            lastUpdateTimeRef.current = now;

            //현재 상태의 반대로 토글
            const newReadStatus = !read;

            console.log(`[TOGGLE] ${BOOK}:${JANG}: ${read} → ${newReadStatus}`);

            //UI 즉시 업데이트
            setRead(newReadStatus);

            //DB 업데이트
            const settingSelectSql = `SELECT read FROM reading_table WHERE book = ? AND jang = ?`;
            const result = await fetchSql(bibleSetting, settingSelectSql, [BOOK, JANG], 0);

            if (result) {
                // 기존 레코드 업데이트
                const updateSql = `UPDATE reading_table SET read = ?, time = ? WHERE book = ? AND jang = ?`;
                await fetchSql(bibleSetting, updateSql, [
                    String(newReadStatus),
                    String(new Date()),
                    BOOK,
                    JANG
                ]);
                console.log('DB: Updated existing record');
            } else {
                // 새 레코드 삽입
                const insertSql = `INSERT INTO reading_table (book, jang, read, time) VALUES (?, ?, ?, ?)`;
                await fetchSql(bibleSetting, insertSql, [
                    BOOK,
                    JANG,
                    String(newReadStatus),
                    String(new Date())
                ]);
                console.log('DB: Created new record');
            }

            //캐시 업데이트 (명시적 저장!)
            updateReadingTableCache(BOOK, JANG, newReadStatus);
            console.log(`Cache updated: ${BOOK}_${JANG} = ${newReadStatus}`);

            //일독 계획 업데이트 (백그라운드)
            if (planData) {
                if (newReadStatus) {
                    markChapterAsRead(BOOK, JANG).catch(err => {
                        console.error('Plan update error:', err);
                    });
                } else {
                    markChapterAsUnread(BOOK, JANG).catch(err => {
                        console.error('Plan update error:', err);
                    });
                }
            }

            //상위 컴포넌트 알림
            if (onReadStatusChange) {
                onReadStatusChange(BOOK, JANG, newReadStatus);
            }

            //읽음으로 변경했을 때만 다음 장으로 이동!
            if (newReadStatus) {
                console.log(`[NAV] Moving to next chapter`);
                setTimeout(() => {
                    onPressNext(JANG);
                }, 50);
            } else {
                console.log(`[NAV] Staying (marked as unread)`);
            }

        } catch (error) {
            console.error('Toggle error:', error);
            // 롤백
            setRead(!read);
        } finally {
            setTimeout(() => {
                isUpdatingRef.current = false;
                setIsProcessing(false);
            }, 50);
        }
    }, [read, BOOK, JANG, planData, isProcessing, updateReadingTableCache,
        markChapterAsRead, markChapterAsUnread, onReadStatusChange, onPressNext]);

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
                _pressed={{ bg: read ? color.bible : color.gray3 }}
                _hover={{}}
                width={'120px'}
                height={'30px'}
                onPress={onReadPress}
                isDisabled={isProcessing || !isLoaded}
                opacity={isProcessing ? 0.6 : 1}
                padding={0}
                style={{
                    position: 'absolute',
                    left: Dimensions.get('screen').width / 2 - 60,
                    bottom: 5
                }}
            >
                <Text color={read ? color.white : color.black} fontSize={'10px'}>
                    {!isLoaded ? '로딩...' : (isProcessing ? '처리중...' : (read ? '안읽음 체크' : '읽었음 체크'))}
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