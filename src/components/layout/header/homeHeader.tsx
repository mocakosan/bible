import { Box, Button, HStack, Image, StatusBar, Text } from "native-base";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { menuSlice } from "../../../provider/redux/slice";
import SearchBar from "../../section/search";

import { useNavigation } from "@react-navigation/native";
import { Share, TouchableOpacity } from "react-native";
import { gFontTitle } from "../../../constant/global";
import { hookNavigationProp } from "../../../hooks/navigate/useNativeNavigation.type";
import { APP_STORE_URL } from "../../../utils";

export default function HomeHeaderLayout() {
  const { route } = useNativeNavigation();
  const navigation = useNavigation<hookNavigationProp>();

  const dispatch = useDispatch();

  const { color } = useBaseStyle();

  const onToggle = () => {
    console.log(navigation?.toggleDrawer, "click success");
    navigation?.toggleDrawer();
  };

  useEffect(() => {
    route.name !== "BibleScreen" &&
      (() => {
        dispatch(menuSlice.actions.reset());
      })();
  }, [route]);

  const onShare = () => {
    Share.share({
      message: APP_STORE_URL,
    });
  };

  const onSearch = (
    data: string,
    setInputValue: Dispatch<SetStateAction<string>>
  ) => {
    !!data &&
      navigation.navigate("CommonScreen", { data: `search/${data.trim()}` });
    setInputValue("");
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Box safeAreaTop bg={color.status} />

      <HStack
        bg="white"
        px="2"
        pt="1"
        justifyContent="space-between"
        alignItems="center"
        w="100%"
      >
        <HStack alignItems="center">
          <TouchableOpacity
            style={{
              borderRadius: 20,
              backgroundColor: color.bible,
              width: 35,
              height: 35,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 8,
            }}
            onPress={onToggle}
          >
            <Box
              style={{
                width: 20,
                height: 3,
                backgroundColor: color.white,
                borderRadius: 5,
              }}
            ></Box>
            <Box
              style={{
                width: 20,
                height: 3,
                backgroundColor: color.white,
                borderRadius: 5,
              }}
            ></Box>
            <Box
              style={{
                width: 20,
                height: 3,
                backgroundColor: color.white,
                borderRadius: 5,
              }}
            ></Box>
          </TouchableOpacity>
          <Text
            fontSize="26"
            marginLeft={2}
            fontFamily={gFontTitle}
            style={{ color: color.bible }}
          >
            바이블 25
          </Text>
        </HStack>

        <HStack marginRight={2}>
          <Button
            variant={"unstyled"}
            height={"auto"}
            onPress={() => {
              navigation.navigate("MyPageScreen", {});
            }}
            paddingTop={1}
            size={8}
          >
            <Image
              size={8}
              source={require("../../../assets/img/mypage_icon.png")}
              alt="1"
            />
            <Text fontSize="12" textAlign={"center"}>
              혜택
            </Text>
          </Button>
          <Button
            variant={"unstyled"}
            height={"auto"}
            onPress={
              () =>
                navigation.navigate("WordScreen", {
                  data: {
                    uri: process.env.WEB_WIEW_BASE_URL + "/board?type=1",
                    back: true,
                  },
                })
              // navigation.navigate('CommonScreen', { data: `board?type=1` })
            }
            paddingTop={1}
            size={8}
          >
            <Image
              size={8}
              source={require("../../../assets/img/love_icon.png")}
              alt="2"
            />
            <Text fontSize="12" textAlign={"center"}>
              후원
            </Text>
          </Button>
          <Button
            variant={"unstyled"}
            height={"auto"}
            onPress={onShare}
            paddingTop={1}
            size={8}
          >
            <Image
              size={8}
              source={require("../../../assets/img/like_icon.png")}
              alt="3"
            />
            <Text fontSize="12" textAlign={"center"}>
              추천
            </Text>
          </Button>
        </HStack>
      </HStack>
      <Box
        style={{ backgroundColor: "#fff", width: "100%", paddingBottom: 10 }}
        paddingX={3}
      >
        <SearchBar placeholder="성경 단어 검색" onPress={onSearch} />
      </Box>
    </>
  );
}
