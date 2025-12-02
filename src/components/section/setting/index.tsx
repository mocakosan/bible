import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  NativeModules,
  Linking,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";
import axios from "axios";
import { unlink } from "@react-native-seoul/kakao-login";
import { useEffect, useState } from "react";
import VersionCheck from "react-native-version-check";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNativeNavigation } from "../../../hooks";
import { ScrollView } from 'react-native';

export default function SettingsTab() {
  const nativeNav = useNativeNavigation();
  const reactNav = useNavigation();
  const insets = useSafeAreaInsets();

  const [currentVersion, setCurrentVersion] = useState("");
  const [latestVersion, setLatestVersion] = useState("");
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    const getVersionInfo = async () => {
      try {
        const currentV = VersionCheck.getCurrentVersion();
        const latestV = await VersionCheck.getLatestVersion();

        setCurrentVersion(currentV);
        setLatestVersion(latestV);

        // 업데이트 필요 여부 확인
        const needUpdate = await VersionCheck.needUpdate();
        setNeedsUpdate(needUpdate.isNeeded);
      } catch (error) {
        console.error("버전 체크 에러:", error);
      }
    };

    getVersionInfo();
  }, []);

  const handleFAQ = () => {
    if (nativeNav.navigation) {
      nativeNav.navigation.navigate("WordScreen", {
        data: {
          uri: "https://bible25frontend.givemeprice.co.kr/inquiry",
          back: false,
        },
      });
    }
  };

  const handleNoticePress = () => {
    if (nativeNav.navigation) {
      nativeNav.navigation.navigate("WordScreen", {
        data: {
          uri: "https://givemeprice.notion.site/25-0fcac5bd872048818deaed5db6994f78?pvs=4",
          back: true,
        },
      });
    }
  };

  const handlePrivacyPress = () => {
    if (nativeNav.navigation) {
      nativeNav.navigation.navigate("WordScreen", {
        data: {
          uri: "https://bible25frontend.givemeprice.co.kr/terms",
          back: true,
        },
      });
    }
  };

  const handleOperwall = () => {
    if (nativeNav.navigation) {
      nativeNav.navigation.navigate("WordScreen", {
        data: {
          uri: "https://bible25frontend.givemeprice.co.kr/terms/faq",
          back: true,
        },
      });
    }
  };

  const handleMarketPress = () => {
    if (nativeNav.navigation) {
      nativeNav.navigation.navigate("WordScreen", {
        data: {
          uri: "https://bible25-data.s3.ap-northeast-2.amazonaws.com/board/friendship.png",
          back: true,
        },
      });
    }
  };

  const handleLogout = async () => {
    try {
      let adid = { id: "", isAdTrackingLimited: false };

      try {
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
      } catch (error) {
        console.log("ADID 가져오기 오류:", error);
      }

      try {
        await axios.delete(
            `https://bible25backend.givemeprice.co.kr/login/deleteid`,
            {
              params: { adid: adid.id },
            }
        );
      } catch (error) {
        console.log("서버 ID 삭제 오류:", error);
      }

      try {
        await unlink();
      } catch (error) {
        console.log("카카오 연결 해제 오류:", error);
      }

      if (nativeNav.navigation && nativeNav.navigation.reset) {
        nativeNav.navigation.reset({
          index: 0,
          routes: [{ name: "KakaoScreen" }],
        });
      } else if (nativeNav.navigation && nativeNav.navigation.replace) {
        nativeNav.navigation.replace("KakaoScreen");
      } else if (reactNav.reset) {
        reactNav.reset({
          index: 0,
          routes: [{ name: "KakaoScreen" }],
        });
      } else if (reactNav.navigate) {
        reactNav.navigate("KakaoScreen");
      } else {
        Alert.alert(
            "로그아웃 안내",
            "로그아웃되었습니다. 앱을 다시 시작해주세요.",
            [{ text: "확인" }]
        );
      }
    } catch (error) {
      console.log("로그아웃 처리 중 오류 발생:", error);
      Alert.alert(
          "오류",
          "로그아웃 처리 중 오류가 발생했습니다. 앱을 다시 시작해주세요.",
          [{ text: "확인" }]
      );
    }
  };

  const handleUpdate = async () => {
    if (needsUpdate) {
      try {
        const storeUrl = await VersionCheck.getStoreUrl();
        Linking.openURL(storeUrl);
      } catch (error) {
        console.error("스토어 열기 실패:", error);
      }
    }
  };

  return (
  <ScrollView 
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 20, 
      }}
    >
        <View style={[styles.appInfoContainer, { marginTop: insets.top > 0 ? 1 : 1 }]}>
          <View style={styles.appInfoContent}>
            <Image
                source={require("../../../assets/img/bibile25.png")}
                style={styles.appIcon}
            />
            <View style={styles.appTextContainer}>
              <Text style={styles.appName}>바이블25</Text>
              <Text style={styles.appVersion}>
                현재버전 {currentVersion} · 최신버전 {latestVersion}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <Text
                style={[
                  styles.updateButtonText,
                  needsUpdate && styles.updateButtonTextActive,
                ]}
            >
              업데이트
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱정보</Text>
          <MenuItems
              items={[
                { title: "공지사항 (업데이트 현황)", onPress: handleNoticePress },
                { title: "자주묻는질문(FAQ)", onPress: handleOperwall },
                { title: "수정요청(오류,개선)", onPress: handleFAQ },
                { title: "개인정보 취급 방침", onPress: handlePrivacyPress },
                { title: "서비스 이용약관", onPress: handlePrivacyPress },
                { title: "마케팅 정보 수집 방침", onPress: handlePrivacyPress },
                { title: "제휴", onPress: handleMarketPress },
              ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기타</Text>
          <MenuItems items={[{ title: "로그아웃", onPress: handleLogout }]} />
        </View>
      </ScrollView>
  );
}

// 메뉴 아이템 컴포넌트
const MenuItems = ({ items }: any) => {
  return (
      <View style={styles.menuContainer}>
        {items.map((item: any, index: any) => (
            <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
            >
              <Text style={styles.menuText}>{item.title}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
        ))}
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  appInfoContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 1,
  },
  appInfoContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  appTextContainer: {
    marginLeft: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    color: "#666666",
  },
  updateButton: {
    backgroundColor: "#2AC1BC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateButtonText: {
    fontSize: 13,
    color: "#ffffff",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333333",
    marginLeft: 16,
    marginBottom: 8,
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuText: {
    fontSize: 15,
    color: "#333333",
  },
  menuArrow: {
    fontSize: 18,
    color: "#CCCCCC",
  },
  updateButtonActive: {
    backgroundColor: "#007AFF",
  },
  updateButtonTextActive: {
    color: "#ffffff",
  },
});