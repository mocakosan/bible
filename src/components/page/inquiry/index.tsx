import { Box, StatusBar } from "native-base";

import { useNativeNavigation } from "../../../hooks";
import useWebview from "../../../hooks/webview/useWebview";
import { color } from "../../../utils";
import FooterLayout from "../../layout/footer/footer";

export default function InquiryScreen() {
  const uri = process.env.WEB_WIEW_BASE_URL!;
  const { navigation } = useNativeNavigation();
  const onMessage = (event: any) => {
    const { name, link } = event;
    name && name === "문의요청" && navigation.navigate("InquiryScreen", {});
    name && name === "main" && navigation.goBack();
  };

  const { WebView, currentUrl } = useWebview({
    uri: uri + "/inquiry",
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
