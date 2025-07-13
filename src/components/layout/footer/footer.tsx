import axios from "axios";
import { Box, Center, HStack, Image, Pressable, Text } from "native-base";
import React, { useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import { shallowEqual, useSelector } from "react-redux";
import { gFontTitle } from "../../../constant/global";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";

export default function FooterLayout() {
  const { color } = useBaseStyle();

  const { route, navigation } = useNativeNavigation();

  const linkState = useSelector(
      (state: combineType) => state.link,
      shallowEqual
  );

  const { name: routeName } = route;

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
    // navigation.navigate('WordScreen', {
    //   data: { uri: url, back: true }
    // });
  };

  useEffect(() => {
    axios
        .get("https://bible25backend.givemeprice.co.kr/board?type=6")
        .then((res) => {
          setLink(res.data.data.link);
        });
  }, []);

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
          height={Platform.OS === "android" ? 45 : 70}
          alignSelf="center"
      >
        <HStack justifyContent={"space-around"}>
          {object.map(({ name, open_img, off_img, route, url, params }) => (
              <Pressable
                  key={name}
                  style={{
                    width: `${100 / object.length}%`,
                    marginTop: 0,
                  }}
                  onPress={() => onNavigate(route, url, params)}
              >
                <Center>
                  <Image
                      width={"24px"}
                      height={"24px"}
                      source={route === routeName ? open_img : off_img}
                      alt={name}
                  />
                  <Text
                      style={{
                        color: route === routeName ? color.bible : color.gray9,
                      }}
                      fontWeight={900}
                      fontFamily={gFontTitle}
                      fontSize={"13px"}
                      textAlign={"center"}
                  >
                    {name}
                  </Text>
                </Center>
              </Pressable>
          ))}
        </HStack>
      </Box>
  );
}