import { useEffect, useRef, useState } from "react";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import NetInfo from "@react-native-community/netinfo";
import { ScrollView } from "native-base";
import { NativeModules, Platform, Share } from "react-native";
import { WebViewProgressEvent } from "react-native-webview/lib/WebViewTypes";
import { defaultStorage } from "../../utils/mmkv";
import useNativeNavigation from "../navigate/useNativeNavigation";
import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";

interface Props {
  uri: string;
  onMessage?: (event?: any) => void;
  onPostMessage?: (event?: any) => any;
}

export const useWebview = ({
  uri,
  onMessage,
  onPostMessage = () => {
    return "";
  },
}: Props) => {
  let webRef = useRef<WebView | any>(null);

  const handleSetRef = (_ref: any) => {
    webRef = _ref;
  };

  const { route } = useNativeNavigation();

  const [currentUrl, setCurrentUrl] = useState<string>("");

  const [isNetWork, setIsNetWork] = useState<boolean>(true);

  const [adidId, setAdidId] = useState<any>(null);

  const checkNetworkStatus = async () => {
    const netInfo = await NetInfo.fetch();
    setIsNetWork(netInfo.isConnected ?? true);
  };

  useEffect(() => {
    (async () => {
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
        setAdidId(adid.id);
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  const onShare = ({
    title,
    message,
    url,
  }: {
    title: string;
    message: string;
    url: string;
  }) => {
    Share.share({
      // title,
      message,
      // url
    });
  };

  const onReadMessage = (e: WebViewMessageEvent) => {
    const event = JSON.parse(e.nativeEvent.data);
    console.log("event", event);

    if (event.name === "share") {
      onShare({
        title: "바이블25\r\n",
        message: event?.content + "\r\n" + event?.url,
        url: event?.url,
      });
    }

    if (event) {
      onMessage && onMessage(event);
    }
  };
  const onLoad = () => {
    webRef.postMessage(adidId);

    console.log("웹뷰에 전송된 데이터:", adidId);
  };

  const onLoadProgress = (e: WebViewProgressEvent) => {
    if (e.nativeEvent.progress === 1) {
      if (webRef.current) {
        webRef.current?.goBack();
        webRef.current.postMessage(onPostMessage(e));
        webRef.current.postMessage(adidId);
      }
    }
  };
  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView error:", nativeEvent);
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    setCurrentUrl(url);
  };
  useEffect(() => {
    if (adidId) {
      console.log("adidId updated:", adidId);
    }
  }, [adidId]);

  useEffect(() => {
    checkNetworkStatus();
    if (webRef.current) {
      webRef.current.postMessage(adidId);
    }
  }, []);

  const latlon = defaultStorage.getString("latlon")?.split("|");
  const lat = latlon?.[0] ? latlon?.[0] : 0;
  const lon = latlon?.[1] ? latlon?.[1] : 0;

  const realUrl = uri.includes("?")
    ? uri + "&lat=" + lat + "&lon=" + lon
    : uri + "?lat=" + lat + "&lon=" + lon;

  return {
    WebView: (
      <>
        {isNetWork ? (
          <WebView
            ref={handleSetRef}
            source={{
              uri: realUrl,
            }}
            onLoad={onLoad}
            onMessage={onReadMessage}
            onLoadProgress={onLoadProgress}
            javaScriptEnabled={true}
            onError={handleWebViewError}
            onNavigationStateChange={handleNavigationStateChange}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
          />
        ) : (
          <ScrollView />
        )}
      </>
    ),
    currentUrl,
    isNetWork,
  };
};

export default useWebview;
