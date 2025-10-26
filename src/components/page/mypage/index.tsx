import { NativeModules, Platform, StyleSheet, View } from "react-native";
import BackMypageHeaderLayout from "../../layout/header/backMypageHeaer";
import Tabs from "../../layout/tab/tabs";
import React, { useEffect, useMemo, useState } from "react";
import Dalant from "../../section/dalant";
import SettingsTab from "../../section/setting";
import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";
import axios from "axios";
import Benefit from "../../section/benefit";
import { useRoute } from "@react-navigation/native";
import BannerAdMyPage from "../../../adforus/BannerAdMypage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MyPageScreen() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const initialTabIndex = route.params?.selectedTabIndex || 0;

  const [tab, setTab] = useState(initialTabIndex);
  const [point, setPoint] = useState(null);
  const [user, setUser] = useState([]);
  const [hmacData, setHmacData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let adid = { id: "", isAdTrackingLimited: false };

        if (Platform.OS === "android") {
          adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
        } else if (Platform.OS === "ios") {
          const { IDFAModule } = NativeModules;
          try {
            const idfa = await IDFAModule.getIDFA();
            adid.id = idfa;
          } catch (error) {
            adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
          }
        }

        const response = await axios.get(
            `https://bible25backend.givemeprice.co.kr/login/finduser`,
            { params: { adid: adid.id } }
        );

        // HMAC 엔드포인트 호출 추가
        const hmacResponse = await axios.get(
            `https://bible25backend.givemeprice.co.kr/login/hmac`,
            { params: { adid: adid.id } }
        );
        setHmacData(hmacResponse.data);

        if (response.data && response.data.userId) {
          const response1 = await axios.get(
              `https://bible25backend.givemeprice.co.kr/point`,
              {
                params: {
                  userId: response.data.userId,
                  type: "all",
                  period: "all",
                },
              }
          );

          setPoint(response.data);
          setUser(response1.data.list || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (axios.isAxiosError(error)) {
          console.error("Request details:", error.config);
          console.error("Response details:", error.response?.data);
        }
      }
    };

    fetchData();
  }, []);

  const content = useMemo(() => {
    switch (tab) {
      case 0:
        return <Dalant point={point} user={user} hmacData={hmacData} />;
      case 1:
        return <Benefit point={point} user={user} hmacData={hmacData} />;
      case 2:
        return <SettingsTab />;
      default:
        return null;
    }
  }, [tab, point, user, hmacData]);

  return (
      <View style={[styles.container, {
        paddingTop: insets.top,
        paddingBottom: insets.bottom
      }]}>
        <BackMypageHeaderLayout title="바이블25" point={point} user={user} />
        <Tabs
            menus={["홈", "혜택", "설정"]}
            onSelectHandler={(index) => {
              setTab(index);
            }}
            selectedIndex={tab}
        />
        <View style={styles.contentContainer}>
          {content}
        </View>
        <View style={[styles.adContainer, {
          paddingBottom: Platform.select({
            ios: 0,
            android: insets.bottom > 0 ? 0 : 10,
            default: 10,
          })
        }]}>
          <BannerAdMyPage />
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    flex: 1,
  },
  advertisingStyle: {
    width: "100%",
    backgroundColor: "transparent",
  },
  adContainer: {
    marginTop: 10,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});