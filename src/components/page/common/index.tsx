import { useIsFocused } from "@react-navigation/native";
import { Box, StatusBar } from "native-base";
import React, { useEffect, useState } from "react";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import useWebview from "../../../hooks/webview/useWebview";
import FooterLayout from "../../layout/footer/footer";
import { Linking } from "react-native";

export default function CommonScreen() {
  const { color } = useBaseStyle();
  const { route, navigation } = useNativeNavigation();
  const SUB_URL = route.params as any;
  const [uri, setUri] = useState<string>("");
  const baseUri = process.env.WEB_WIEW_BASE_URL!;

  const isFocused = useIsFocused();

  useEffect(() => {
    const routeUri = `${baseUri}/${SUB_URL?.data}`;
    console.log("route url", routeUri);
    isFocused ? setUri(routeUri) : setUri("");
  }, [isFocused, SUB_URL]);

  const onMessage = (event: any) => {
    const { side, name, link } = event;
    console.log(event);
    !!name && name === "main" && navigation.goBack();
    name && name === "billboard" && Linking.openURL(link);
  };

  const { WebView } = useWebview({
    uri,
    onMessage,
  });

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Box safeAreaTop bg={color.status} />
      {WebView}
      <FooterLayout />
    </>
  );
}
