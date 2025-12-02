import { Center, Text } from "native-base"

import { memo, useCallback, useRef } from "react"
import { useBaseStyle, useNativeNavigation } from "../../../../hooks"
import { BibleStep } from "../../../../utils/define"
import { View } from "react-native"
import { defaultStorage } from "../../../../utils/mmkv"
import { FlashList } from "@shopify/flash-list"
import { TouchableOpacity } from "react-native"
import { isEmpty } from "lodash"

interface Props {
    readState: any
    menuIndex: number
}
function ReadingSidePage({ readState, menuIndex }: Props) {
    const { color } = useBaseStyle()

    const { navigation } = useNativeNavigation()

    const onReadStyle = (book: number, jang: number) => {
        if (isEmpty(readState)) {
            return {}
        }

        const checked = readState?.find(
            (data: any) => data.book === book && data.jang === jang
        )

        if (checked) {
            return {
                color: color.bible,
            }
        } else {
            return {
                color: color.black,
            }
        }
    }

    const onNavigate = (book: number, jang: number) => {
        defaultStorage.set("bible_book_connec", book)
        defaultStorage.set("bible_jang_connec", jang)

        navigation.navigate(
            "BibleConectionScreen",
            menuIndex === 1 ? { sound: true } : { show: true }
        )
    }

    const RenderItems = useCallback(
        ({
            book,
            title,
            length,
        }: {
            book: number
            title: string
            length: number
        }) => {
            return (
                <>
                    <Center>
                        <Text
                            fontSize={"18px"}
                            fontWeight={"bold"}
                            marginTop={5}
                            marginBottom={5}
                            key={title}
                        >
                            {title}
                        </Text>
                    </Center>
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            width: "100%",
                            padding: 12,
                        }}
                    >
                        {Array.from({ length }).map((_, index) => (
                            <TouchableOpacity
                                key={index * 11}
                                activeOpacity={0.1}
                                style={{
                                    width: 40,
                                    height: 30,
                                    borderRadius: 30,
                                }}
                                onPress={() => onNavigate(book, index + 1)}
                            >
                                <Text
                                    textAlign={"center"}
                                    style={onReadStyle(book, index + 1)}
                                    fontSize={15}
                                >
                                    {index + 1}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )
        },
        [readState]
    )

    return (
        <>
            {
                <FlashList
                    renderItem={({ item }) => {
                        return (
                            <RenderItems
                                key={item.name}
                                book={item.index}
                                length={item.count}
                                title={item.name}
                            />
                        )
                    }}
                    showsHorizontalScrollIndicator={true}
                    estimatedItemSize={66}
                    data={BibleStep}
                />
            }
        </>
    )
}

export default memo(ReadingSidePage)
