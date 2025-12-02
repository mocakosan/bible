import { useDisclose } from "native-base";
import React, { useEffect, useState } from "react";
import { BackHandler, Linking, Platform } from "react-native";
import RNExitApp from "react-native-exit-app";
import SplashScreen from "react-native-splash-screen";
import { api } from "../../../api/define";
import { useGetSwr, useNativeNavigation } from "../../../hooks";
import useWebview from "../../../hooks/webview/useWebview";
import { defaultStorage } from "../../../utils/mmkv";
import FooterLayout from "../../layout/footer/footer";
import HomeHeaderLayout from "../../layout/header/homeHeader";
import ExitModal from "../../modal/exit";
import FirstModal from "../../modal/first";
import Navigation from "../../section/snb";

export default function HomeFocusScreen() {
  const [exit, setExit] = useState<boolean>(false);

  const latlon = defaultStorage.getString("latlon")?.split("|");

  const latData = latlon?.[0] ?? 0;
  const lonData = latlon?.[1] ?? 0;

  // 앱 시작 광고
  const { data: firstData } = useGetSwr(api.POST_BANNER_CLICK, {
    type: "first",
    lat: latData,
    lon: lonData,
  });

  // 앱 종료 광고
  const { data: lastData } = useGetSwr(api.POST_BANNER_CLICK, {
    type: "last",
    lat: latData,
    lon: lonData,
  });

  const [uri] = useState<string>(
    `${process.env.WEB_WIEW_BASE_URL}?push=true` ?? ""
  );

  const { navigation, route } = useNativeNavigation();

  const { isOpen, onOpen, onClose } = useDisclose();

  const exitApp = () => {
    BackHandler.exitApp();
    RNExitApp.exitApp();
    setExit(false);
  };

  const backAction = () => {
    if (route.name === "HomeScreen") {
      setExit(true);
    }

    return true;
  };

  useEffect(() => {
    onOpen();
    SplashScreen.hide();
    BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => {
      BackHandler.removeEventListener("hardwareBackPress", backAction);
    };
  }, []);

  const onMessage = (event: any) => {
    if (event?.key === "billBoard") {
      navigation.navigate("WordScreen", {
        data: { uri: event?.url, back: true },
      });
    } else if (event?.iconUrl) {
      navigation.navigate("CommonScreen", { data: event?.iconUrl });
    } else {
      if (event?.name === "billboard") {
        Linking.openURL(event.link);
      } else if (event?.name === "성경") {
        navigation.navigate("BibleScreen", {});
      } else if (event?.name === "찬송") {
        navigation.navigate("HymnScreen", {});
      } else if (event?.name === "성경일독") {
        navigation.navigate("ReadingBibleScreen", {});
      } else if (event?.name === "share") {
      } else {
        navigation.navigate("WordScreen", { data: { uri: event?.url } });
      }
    }
  };

  const { WebView, isNetWork, currentUrl } = useWebview({ uri, onMessage });

  console.log(currentUrl);

  return (
    <>
      {route.name === "HomeScreen" && Platform.OS === "android" && (
        <ExitModal
          data={lastData}
          isOpen={exit}
          onCancel={() => setExit(false)}
          onClose={exitApp}
        />
      )}
      <HomeHeaderLayout />
      {!isNetWork && <Navigation />}
      {WebView}
      <FirstModal data={firstData} isOpen={isOpen} onClose={onClose} />

      <FooterLayout />
    </>
  );
}
