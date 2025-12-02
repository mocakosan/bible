import { useState, useEffect } from 'react';
import { Box, Button, Center, HStack, Text, View } from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { BibleStep } from '../../../utils/define';
import BibleFlatList from '../../section/flatList';
import NumberList from '../../section/numberList';
import BackHeaderLayout from '../../layout/header/backHeader';
import { defaultStorage } from '../../../utils/mmkv';
import { FlashList } from '@shopify/flash-list';
import { TouchableOpacity } from 'react-native';
import { bibleSetting, fetchSql } from '../../../utils';
import { isEmpty } from 'lodash';
import { useDispatch } from "react-redux";
import { bibleSelectSlice, bibleTextSlice } from "../../../provider/redux/slice";

const RenderItems = ({
                         book,
                         title,
                         length,
                         onNavigate,
                         read
                     }: {
    book: number;
    title: string;
    length: number;
    onNavigate: any;
    read: any
}) => {
    const onReadStyle = (book: number, jang: number) => {
        if (isEmpty(read)) {
            return {};
        }

        const checked = read?.find(
            (data: any) => data.book === book && data.jang === jang
        );

        if (checked) {
            return {
                color: '#2AC1BC'
            };
        } else {
            return {
                color: '#000'
            };
        }
    };

    return (
        <>
            <Center>
                <Text
                    fontSize={'18px'}
                    fontWeight={'bold'}
                    marginTop={5}
                    marginBottom={5}
                    key={title}
                >
                    {title}
                </Text>
            </Center>
            <View
                style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    width: '100%',
                    padding: 12
                }}
            >
                {Array.from({ length }).map((_, index) => (
                    <TouchableOpacity
                        key={index * 11}
                        activeOpacity={0.1}
                        style={{
                            width: 40,
                            height: 30,
                            borderRadius: 30
                        }}
                        onPress={() => onNavigate(book, index + 1)}
                    >
                        <Text
                            textAlign={'center'}
                            style={onReadStyle(book, index + 1)}
                            fontSize={15}
                        >
                            {index + 1}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </>
    );
};

export function ChapterScreen2() {
    const { color } = useBaseStyle();
    const { navigation } = useNativeNavigation();
    const [read, setRead] = useState([]);

    const BOOK = defaultStorage.getNumber('bible_book_connec') ?? 1;

    const selecBook = (BOOK: number) => {
        if (BOOK === 1) return '1,2';
        else if (BOOK === 66) return '65,66';
        else return `${BOOK - 1},${BOOK},${BOOK + 1}`;
    };

    const testSql = `SELECT * FROM reading_table WHERE read = 'true' and book in(${selecBook(BOOK)})`;
    fetchSql(bibleSetting, testSql, []).then((res) => setRead(res));

    const onNavigate = (book: number, jang: number) => {
        try {
            defaultStorage.set('bible_book_connec', Number(book));
            defaultStorage.set('bible_jang_connec', Number(jang));

            navigation.navigate('BibleConectionScreen', {});
        } catch (error) {
            console.error('ChapterScreen2 MMKV 오류:', error);
        }
    };

    return (
        <>
            <BackHeaderLayout title="성경일독" />
            <FlashList
                renderItem={({ item }) => {
                    return (
                        <RenderItems
                            key={item?.name}
                            book={item?.index}
                            length={item?.count}
                            title={item?.name}
                            onNavigate={onNavigate}
                            read={read}
                        />
                    );
                }}
                showsHorizontalScrollIndicator={true}
                estimatedItemSize={66}
                data={[BibleStep[BOOK! - 2], BibleStep[BOOK! - 1], BibleStep[BOOK!]]}
            />
        </>
    );
}

export default function ChapterScreen({ route }: any) {
    // 라우트 파라미터에서 기본 탭 설정 가져오기
    const defaultTab = route?.params?.defaultTab;

    // 기본 탭에 따라 초기 menuIndex 설정
    const getInitialMenuIndex = () => {
        if (defaultTab === 'bible') return 0; // 성경탭
        if (defaultTab === 'chapter') return 1; // 장탭
        return 0; // 기본값은 성경탭
    };

    const [menuIndex, setMenuIndex] = useState<number>(getInitialMenuIndex());
    const { color } = useBaseStyle();
    const { navigation } = useNativeNavigation();
    const dispatch = useDispatch();

    // MMKV에서 현재 값 읽기
    const BOOK = defaultStorage.getNumber('bible_book') ?? 1;

    // 라우트 파라미터 변경 시 탭 업데이트
    useEffect(() => {
        if (defaultTab === 'bible') {
            setMenuIndex(0);
        } else if (defaultTab === 'chapter') {
            setMenuIndex(1);
        }
    }, [defaultTab]);

    const onPressBook = (index: number, active: number) => {
        const newBook = index + 1;
        // 성경 선택 후 장탭으로 자동 이동
        setMenuIndex(1);

        try {
            // MMKV 업데이트 (타입 확실히 하기)
            defaultStorage.set('bible_book', Number(newBook));

            // Redux도 함께 업데이트 (현재 장 유지)
            const currentJang = defaultStorage.getNumber('bible_jang') ?? 1;
            dispatch(bibleSelectSlice.actions.changePage({
                book: Number(newBook),
                jang: Number(currentJang)
            }));
            dispatch(bibleTextSlice.actions.reset());

            console.log(`[CHAPTER_SCREEN] 성경 변경: ${newBook}권 ${currentJang}장`);
        } catch (error) {
            console.error('MMKV 저장 오류:', error);
        }
    };

    const pressBible = () => {
        setMenuIndex(0);
    };

    const pressJang = () => {
        setMenuIndex(1);
    };

    const onPressJang = (jang: number) => {
        try {
            // MMKV 업데이트
            defaultStorage.set('bible_jang', Number(jang));

            // Redux 업데이트
            dispatch(bibleSelectSlice.actions.changePage({
                book: Number(BOOK),
                jang: Number(jang)
            }));
            dispatch(bibleTextSlice.actions.reset());

            console.log(`[CHAPTER_SCREEN] 장 변경: ${BOOK}권 ${jang}장`);

            // BibleScreen으로 돌아가기
            navigation.navigate('BibleScreen');
        } catch (error) {
            console.error('장 선택 MMKV 오류:', error);
        }
    };

    return (
        <>
            <BackHeaderLayout title="목차 선택" />
            <HStack alignItems="center">
                <Button
                    w={`50%`}
                    fontWeight={100}
                    _pressed={{ bg: color.white }}
                    bg={
                        menuIndex === 0
                            ? `${color.bible}:alpha.0`
                            : `${color.white}:alpha.0`
                    }
                    onPress={() => pressBible()}
                >
                    <Text
                        style={{
                            color: menuIndex === 0 ? color.white : color.gray1
                        }}
                        fontSize={16}
                        fontWeight={100}
                    >
                        성경
                    </Text>
                </Button>
                <Button
                    w={`50%`}
                    _pressed={{ bg: color.white }}
                    bg={
                        menuIndex === 1
                            ? `${color.bible}:alpha.0`
                            : `${color.white}:alpha.0`
                    }
                    onPress={() => pressJang()}
                >
                    <Text
                        style={{
                            color: menuIndex === 1 ? color.white : color.gray1
                        }}
                        fontSize={16}
                        fontWeight={100}
                    >
                        장
                    </Text>
                </Button>
            </HStack>
            <Box
                h={'100%'}
                bg={color.white}
                borderTopWidth="1"
                borderColor={color.status}
                safeAreaBottom={true}
            >
                {menuIndex === 0 && <BibleFlatList onPress={onPressBook} />}
                {menuIndex === 1 && BOOK && (
                    <NumberList
                        count={BibleStep[BOOK - 1].count}
                        bookNumber={BOOK}
                        setActive={setMenuIndex}
                        onPressJang={onPressJang}
                    />
                )}
            </Box>
        </>
    );
}