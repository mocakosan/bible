import {
  Image,
  Linking,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  AppState,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { openMottoWeb } from "../../../utils/MottoWeb";
import Advertising from "../advertising";

interface DalantProps {
  point?: {
    account_email: string;
    adid: string;
    delete_points: number;
    get_points: number;
    lose_points: number;
    name: string;
    points: number;
    profile_nickname: string;
    userId: string;
  };
  user?: {
    company: string;
    id: number;
    point_type: string;
    points: number;
    time: string;
    today: string;
  } | null;
  hmacData?: number;
}

const RNAdPopcornRewardModule = NativeModules.RNAdPopcornRewardModule;
const { ReactWrapperModule } = NativeModules;

export default function Benefit({ point, user, hmacData }: DalantProps) {
  const navigation = useNavigation();
  const appState = useRef(AppState.currentState);
  const toastAnimation = useRef(new Animated.Value(-100)).current;
  const [todayPoints, setTodayPoints] = useState<number>(0);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);
  const [lastCompany, setLastCompany] = useState<string>("");
  const isFirstRun = useRef(true);
  const isToastActive = useRef(false);
  const pendingToastCheck = useRef(false);
  const lastPointCheck = useRef(Date.now());
  const [adData, setAdData] = useState({ lat: 1, lon: 1, jang: "mypage" });
  // 토스트 메시지 표시 함수 개선
  const showCustomToast = useCallback(
    (company: string, points: number) => {
      // 이미 토스트가 활성화되어 있으면 중복 실행 방지
      if (isToastActive.current) {
        console.log("토스트가 이미 활성화되어 있어 무시합니다");
        return;
      }

      isToastActive.current = true;

      // 값 설정 후 애니메이션 시작
      setEarnedPoints(points);
      setLastCompany(company);
      setShowToast(true);

      // 애니메이션 시퀀스 시작
      toastAnimation.setValue(-100); // 애니메이션 시작 전 초기화

      Animated.sequence([
        Animated.timing(toastAnimation, {
          toValue: 20,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(3000), // 3초 동안 표시
        Animated.timing(toastAnimation, {
          toValue: -100, // 화면 밖으로 이동
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowToast(false);
        isToastActive.current = false; // 토스트 비활성화 표시
      });
    },
    [toastAnimation]
  );

  // 포인트 조회 함수 - 중복 호출 방지 기능 추가
  const fetchTodayPoints = useCallback(
    async (source: string = "unknown") => {
      // 이미 진행 중인 포인트 체크가 있으면 중복 실행 방지
      if (pendingToastCheck.current) {
        console.log(`[${source}] 이미 포인트 체크가 진행 중입니다. 요청 무시`);
        return;
      }

      // 마지막 체크 후 최소 간격(1초) 확인
      const now = Date.now();
      if (now - lastPointCheck.current < 1000) {
        console.log(`[${source}] 포인트 체크 간격이 너무 짧습니다. 요청 무시`);
        return;
      }

      lastPointCheck.current = now;

      if (!point?.userId) {
        console.log(`[${source}] userId가 없습니다`);
        return;
      }

      pendingToastCheck.current = true;

      try {
        console.log(`[${source}] 포인트 조회 시작`);
        const oldPoints = todayPoints;

        const response = await axios.get(
          `https://bible25backend.givemeprice.co.kr/point/sum?userId=${point.userId}&type=today`
        );

        // API 응답에서 포인트 데이터 추출 및 저장
        let newPoints = 0;
        if (response.data && response.data.data !== undefined) {
          newPoints = response.data.data;
        } else {
          newPoints = response.data;
        }

        console.log(`[${source}] 포인트 조회 결과:`, { oldPoints, newPoints });

        // 포인트 값이 변경되었을 때만 상태 업데이트
        if (todayPoints !== newPoints) {
          setTodayPoints(newPoints);
        }

        // 첫 실행 시에는 토스트를 표시하지 않음
        if (isFirstRun.current) {
          console.log(`[${source}] 첫 실행이므로 토스트 표시하지 않음`);
          isFirstRun.current = false;
          pendingToastCheck.current = false;
          return;
        }

        // 포인트가 증가했는지 확인하고 토스트 메시지 표시
        const pointsDiff = newPoints - oldPoints;
        if (
          pointsDiff > 0 &&
          appState.current === "active" &&
          lastCompany &&
          !isToastActive.current
        ) {
          console.log(`[${source}] 토스트 표시:`, { pointsDiff, lastCompany });

          // 모토클릭의 경우 회사명을 "모토클릭"으로 표시
          const displayCompany =
            lastCompany === "모토" ? "모토클릭" : lastCompany;
          showCustomToast(displayCompany, pointsDiff);
        } else if (pointsDiff > 0) {
          console.log(
            `[${source}] 포인트가 증가했지만 토스트를 표시할 수 없습니다:`,
            {
              pointsDiff,
              appState: appState.current,
              lastCompany,
              isToastActive: isToastActive.current,
            }
          );
        }
      } catch (error) {
        console.error(`[${source}] 오늘 획득 포인트 조회 오류:`, error);
      } finally {
        pendingToastCheck.current = false;
      }
    },
    [point?.userId, todayPoints, lastCompany, showCustomToast]
  );

  // 앱 상태 변화 감지 수정 - 디바운스 추가
  useEffect(() => {
    // 초기 포인트 조회
    fetchTodayPoints("initial-load");

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // 앱이 백그라운드에서 포그라운드로 돌아올 때 포인트 조회
        // 충분한 지연을 주어 광고 종료 후 포인트가 반영될 시간을 확보
        console.log("앱이 활성화됨 - 포인트 조회 예약");
        setTimeout(() => {
          fetchTodayPoints("app-state-change");
        }, 1500); // 더 긴 지연 시간 (1.5초)
      }

      appState.current = nextAppState;
    });

    // WordScreen에서 돌아올 때 모토클릭 체크를 위한 네비게이션 리스너 추가
    const unsubscribe = navigation.addListener("focus", () => {
      if (lastCompany === "모토") {
        console.log("모토클릭에서 돌아왔습니다 - 포인트 조회");
        setTimeout(() => {
          fetchTodayPoints("motto-return");
        }, 2000); // 포인트 반영 시간을 고려한 지연
      }
    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [fetchTodayPoints, lastCompany, navigation]);

  // 화면 포커스 효과 - 앱 상태와 중복 방지
  useFocusEffect(
    useCallback(() => {
      // 약간의 지연을 주어 포인트가 반영될 시간을 확보하고
      // 앱 상태 이벤트와 충돌 방지
      const timer = setTimeout(() => {
        fetchTodayPoints("screen-focus");
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }, [fetchTodayPoints])
  );

  // 광고 클릭 핸들러들
  const adpopcornClick = () => {
    console.log("애드팝콘 클릭됨");
    setLastCompany("애드팝콘");
    RNAdPopcornRewardModule.setUserId(point?.userId);
    RNAdPopcornRewardModule.openOfferwall();
  };

  const stampClick = () => {
    const moreUrl = `https://doublebenefit.co.kr/static/stamp.html?mkey=1175&mckey=10676&adid=${point?.adid}&user_id=${point?.userId}`;
    Linking.openURL(moreUrl).catch((err) =>
      console.error("URL을 열 수 없습니다.", err)
    );
  };

  const mangoLabClick = async () => {
    try {
      console.log("자몽랩 클릭됨");
      setLastCompany("자몽랩");
      const url = `https://api.quizclick.io/web/k-virus/ads/2KPsLKZy?os=2&apikey=d03D2XDJGucBYmNCYNKw9VeEuCORegNH&uid=${point?.userId?.toString()}&hmac=${hmacData?.toString()}&customStr=${point?.userId?.toString()}&advId=${point?.adid?.toString()}`;
      console.log(url);

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Can't open URL:", url);
      }
    } catch (error) {
      console.error("Error opening MangoLab URL:", error);
    }
  };

  const tnkClick = () => {
    console.log("TNK팩토리 클릭됨");
    setLastCompany("TNK팩토리");
    ReactWrapperModule.setUserName(point?.userId);
    ReactWrapperModule.setCoppa(0);
    ReactWrapperModule.showOfferwallWithAtt();
  };

  const greenpClick = () => {
    console.log("그린피 클릭됨");
    setLastCompany("그린피");
    NativeModules.GreenpModule.show();
  };

  // 모토클릭 함수 수정 - lastCompany를 "모토"로 설정
  const mottoClick = async () => {
    console.log("모토클릭 클릭됨");
    setLastCompany("모토");
    const pubKey = "682fd8b91f7e7";
    await openMottoWeb(pubKey, point?.userId, point?.adid);
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* 커스텀 토스트 메시지 */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: toastAnimation }],
            },
          ]}
        >
          <Image
            source={require("../../../assets/img/bibile25.png")}
            style={styles.toastLogo}
            resizeMode="contain"
          />
          <View style={styles.toastTextContainer}>
            <Text style={styles.toastTitle}>
              {lastCompany} 포인트 적립 성공!
            </Text>
            <Text style={styles.toastMessage}>
              {earnedPoints}P가 적립되었습니다.
            </Text>
          </View>
        </Animated.View>
      )}

      <View>
        <Advertising
          type="slider"
          name="mypage"
          default={adData}
          isValidating={false}
          style={{ marginTop: 6 }}
        />
        <View style={styles.participationSection}>
          <TouchableOpacity style={styles.coupangBanner} onPress={tnkClick}>
            <Image
              source={require("../../../assets/img/tnk.png")}
              style={{ width: "100%", height: 100 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.coupangBanner} onPress={greenpClick}>
            <Image
              source={require("../../../assets/img/point.png")}
              style={{ width: "100%", height: 100 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.coupangBanner}
            onPress={adpopcornClick}
          >
            <Image
              source={require("../../../assets/img/adpopcorn.png")}
              style={{ width: "100%", height: 100 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={[styles.coupangBanner, { width: "100%" }]}
            onPress={mottoClick}
          >
            <Image
              source={require("../../../assets/img/motto.png")}
              style={{ width: "100%", height: 100, borderRadius: 12 }}
              resizeMode="contain"
            />
          </TouchableOpacity> */}
          {/* <TouchableOpacity
            style={styles.coupangBanner}
            onPress={mangoLabClick}
          >
            <Image
              source={require("../../../assets/img/mangolab.png")}
              style={{ width: "100%", height: 100 }}
              resizeMode="cover"
            />
          </TouchableOpacity> */}
          <TouchableOpacity style={styles.coupangBanner} onPress={stampClick}>
            <Image
              source={require("../../../assets/img/coupang_stamp.png")}
              style={{ width: "100%", height: 100 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // 기존 스타일
  dalantCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  mainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  pointContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainIcon: {
    width: 34,
    height: 34,
    marginRight: 8,
    marginTop: 90,
  },
  mainPoints: {
    marginTop: 90,
    fontSize: 30,
    fontWeight: "bold",
    color: "#333333",
  },
  moneyBagImage: {
    width: 97,
    height: 124,
  },
  subContainer: {
    marginBottom: 0,
  },
  subTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 16,
    color: "#666666",
  },
  subPointContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  subIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  subPoints: {
    fontSize: 16,
    color: "#333333",
  },
  noteText: {
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginBottom: 20,
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
  },
  bottomTitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
    justifyContent: "center",
  },
  bottomPointContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomIcon: {
    width: 23,
    height: 23,
    marginRight: 6,
  },
  bottomPoints: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  participationSection: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: "column",
  },
  participationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 12,
  },
  coupangBanner: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  coupangImage: {
    width: 30,
    height: 30,
  },

  // 토스트 메시지용 새 스타일
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999, // 높은 zIndex 값으로 설정
  },
  toastLogo: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 8,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#25BBA3",
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 14,
    color: "#333333",
  },
});
