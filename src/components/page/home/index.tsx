import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";
import axios from "axios";
import { useDisclose } from "native-base";
import React, { useEffect, useState } from "react";
import { BackHandler, Linking, NativeModules, Platform } from "react-native";
import RNExitApp from "react-native-exit-app";
import SplashScreen from "react-native-splash-screen";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../../../api/define";
import { useGetSwr, useNativeNavigation } from "../../../hooks";
import useWebview from "../../../hooks/webview/useWebview";
import { firstPopupSlice } from "../../../provider/redux/slice";
import FooterLayout from "../../layout/footer/footer";
import ExitModal from "../../modal/exit";
import FirstModal from "../../modal/first";
import Navigation from "../../section/snb";

// FIXME: 리팩토링 필요
export default function HomeScreen() {
  const [exit, setExit] = useState<boolean>(false);
  const [isUser, setIsUser] = useState<boolean>(false);
  const dispatch = useDispatch();
  const mapState = (state: combineType) => ({
    firstPopup: state.firstPopup as firstPopupType,
  });
  const { firstPopup } = useSelector(mapState);

  const { data: firstData } = useGetSwr(api.POST_BANNER_CLICK, {
    type: "first",
    lat: 0,
    lon: 0,
  });
  const { data: lastData } = useGetSwr(api.POST_BANNER_CLICK, {
    type: "last",
    lat: 0,
    lon: 0,
  });

  const uri = process.env.WEB_WIEW_BASE_URL;

  const { navigation, route } = useNativeNavigation();

  const { isOpen, onOpen, onClose } = useDisclose();

  useEffect(() => {
    (async () => {
      SplashScreen.hide();
      try {
        let adid: { id: string | null; isAdTrackingLimited: boolean } = {
          id: "",
          isAdTrackingLimited: false,
        };
        if (Platform.OS === "android") {
          adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
        } else if (Platform.OS === "ios") {
          const { IDFAModule } = NativeModules;
          try {
            const idfa = await IDFAModule.getIDFA();
            adid.id = idfa;
          } catch (error) {
            adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
            if (!adid) {
              adid =
                await ReactNativeIdfaAaid.getAdvertisingInfoAndCheckAuthorization(
                  true
                );
            }
          }
        }
        const response = await axios.get(
          `https://bible25backend.givemeprice.co.kr/login/finduser`,
          {
            params: { adid: adid.id },
          }
        );
        if (response.data) {
          setIsUser(true);
        } else {
          setIsUser(false);
          navigation.replace("KakaoScreen");
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, [isUser]);

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
      } else if (event?.name === "mypage") {
        navigation.navigate("MyPageScreen", {});
      } else if (event?.name === "share") {
      } else {
        navigation.navigate("WordScreen", { data: { uri: event?.url } });
      }
    }
  };

  const { WebView, isNetWork } = useWebview({ uri, onMessage });

  const handleFirstModalClose = () => {
    dispatch(
      firstPopupSlice.actions.changeState({
        isFirst: true,
      })
    );
    onClose();
  };

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
      {/* <HomeHeaderLayout /> */}
      {!isNetWork && <Navigation />}
      {WebView}
      {!firstPopup.isFirst && (
        <FirstModal
          data={firstData}
          isOpen={isOpen}
          onClose={handleFirstModalClose}
        />
      )}
      <FooterLayout />
    </>
  );
}
