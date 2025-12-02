// src/components/layout/footer/footer.tsx
import axios from "axios";
import { Box, Center, HStack, Image, Pressable, Text } from "native-base";
import React, { useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import { shallowEqual, useSelector } from "react-redux";
import { gFontTitle } from "../../../constant/global";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FooterLayout() {
  const { color } = useBaseStyle();
  const { route, navigation } = useNativeNavigation();
  const linkState = useSelector(
      (state: combineType) => state.link,
      shallowEqual
  );
  const { name: routeName } = route;
  const insets = useSafeAreaInsets();
  const [link, setLink] = useState<string>("https://www.kdknews.com");

  const object = [
    {
      name: "홈",
      open_img: require(`../../../assets/img/navbar_m01_on.png`),
      off_img: require(`../../../assets/img/navbar_m01_off.png`),
      route: "DrawerScreens",
    },
    {
      name: "성경",
      open_img: require(`../../../assets/img/navbar_m02_on.png`),
      off_img: require(`../../../assets/img/navbar_m02_off.png`),
      route: "BibleScreen",
    },
    {
      name: "찬송",
      open_img: require(`../../../assets/img/navbar_m03_on.png`),
      off_img: require(`../../../assets/img/navbar_m03_off.png`),
      route: "HymnScreen",
    },
    {
      name: "혜택",
      open_img: require(`../../../assets/img/navbar_point.png`),
      off_img: require(`../../../assets/img/navbar_point.png`),
      route: "MyPageScreen",
      params: { selectedTabIndex: 1 },
    },
    {
      name: "후원몰",
      open_img: require(`../../../assets/img/navbar_wishtalk.png`),
      off_img: require(`../../../assets/img/navbar_wishtalk.png`),
      url: "https://wishtem.co.kr/",
    },
    {
      name: "나의정보",
      open_img: require(`../../../assets/img/user_on.png`),
      off_img: require(`../../../assets/img/user_off.png`),
      route: "MyPageScreen",
    },
  ];

  const onNavigate = (route: string | undefined, url: string | undefined, params?: object) => {
    route && navigation.navigate(route, params || {});
    url && Linking.openURL(url);
  };

  useEffect(() => {
    axios
        .get("https://bible25backend.givemeprice.co.kr/board?type=6")
        .then((res) => {
          setLink(res.data.data.link);
        });
  }, []);

  // Android targetSdk 35 대응: 하단 네비게이션 바 높이 계산
  const footerHeight = Platform.select({
    ios: 50 + insets.bottom,
    android: 50 + (insets.bottom > 0 ? insets.bottom : 0), // Android에서 safe area bottom 적용
    default: 50
  });

  return (
      <Box
          borderTopColor={color.gray2}
          borderLeftColor={color.gray2}
          borderRightColor={color.gray2}
          borderTopStyle={"solid"}
          borderLeftStyle={"solid"}
          borderRightStyle={"solid"}
          borderTopWidth={1}
          bg="white"
          width="100%"
          height={`${footerHeight}px`}
          paddingBottom={`${insets.bottom}px`} // 하단 패딩 추가
      >
        <HStack
            px="3"
            py="1"
            pt="1"
            justifyContent="space-between"
            alignItems="center"
            w="100%"
            height="50px" // 실제 컨텐츠 높이는 50px로 유지
        >
          {object.map((item, index) => {
            const isActive =
                item.route === routeName ||
                (item.route === "DrawerScreens" && routeName === "HomeScreen") ||
                (item.route === "MyPageScreen" && routeName === "MyPageScreen");

            return (
                <Pressable
                    key={index}
                    onPress={() => onNavigate(item.route, item.url, item.params)}
                    style={{ alignItems: "center", flex: 1 }}
                >
                  <Center>
                    <Image
                        source={isActive ? item.open_img : item.off_img}
                        alt={item.name}
                        size="25px"
                        resizeMode="contain"
                    />
                    <Text
                        fontSize="10px"
                        color={isActive ? color.bible : color.gray}
                        mt="0.5"
                        fontFamily={gFontTitle}
                        fontWeight={isActive ? "bold" : "normal"}
                    >
                      {item.name}
                    </Text>
                  </Center>
                </Pressable>
            );
          })}
        </HStack>
      </Box>
  );
}