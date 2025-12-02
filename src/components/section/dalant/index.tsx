import {
  Image,
  Linking,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AppState,
  Animated,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useState, useRef, useEffect } from "react";
import axios from "axios";
import { openMottoWeb } from "../../../utils/MottoWeb";

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
const { width } = Dimensions.get("window");

export default function Dalant({ point, user, hmacData }: DalantProps) {
  const navigation = useNavigation();
  const appState = useRef(AppState.currentState);
  const toastAnimation = useRef(new Animated.Value(-100)).current;
  const [todayPoints, setTodayPoints] = useState<number>(0);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);
  const [lastCompany, setLastCompany] = useState<string>("");
  const [toastCompany, setToastCompany] = useState<string>(""); // 토스트용 별도 상태

  // 롤링 알림을 위한 상태 추가
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState<number>(0);
  const [nextNoticeIndex, setNextNoticeIndex] = useState<number>(1);
  const rollingAnimation = useRef(new Animated.Value(0)).current;
  const rollingInterval = useRef<NodeJS.Timeout | null>(null);
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  // 알림 메시지 배열
  const noticeMessages = [
    {
      text: "당일 적립한 포인트는 다음 날 적용됩니다.",
      backgroundColor: "#FFF9C4",
      borderColor: "#FFC107",
      textColor: "#555",
    },
    {
      text: "포인트 사용방법이 궁금하다면 클릭!",
      backgroundColor: "#E8F5E8",
      borderColor: "#4CAF50",
      textColor: "#2E7D32",
      isClickable: true,
    },
  ];

  // 최적화된 상태 관리
  const isFirstRun = useRef(true);
  const isToastActive = useRef(false);
  const lastPointCheck = useRef(0);
  const fetchController = useRef<AbortController | null>(null);

  // 롤링 애니메이션 시작
  useEffect(() => {
    const startRolling = () => {
      rollingInterval.current = setInterval(() => {
        // 부드러운 페이드와 슬라이드 조합 애니메이션
        Animated.parallel([
          Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(rollingAnimation, {
            toValue: -30, // 위로 슬라이드
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // 메시지 변경
          setCurrentNoticeIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % noticeMessages.length;
            setNextNoticeIndex((nextIndex + 1) % noticeMessages.length);
            return nextIndex;
          });

          // 아래에서 나타나는 애니메이션
          rollingAnimation.setValue(30);
          Animated.parallel([
            Animated.timing(fadeAnimation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(rollingAnimation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 4000); // 4초마다 롤링
    };

    // 초기 지연 후 시작
    const initialDelay = setTimeout(() => {
      startRolling();
    }, 2000); // 2초 후 시작

    return () => {
      if (rollingInterval.current) {
        clearInterval(rollingInterval.current);
      }
      clearTimeout(initialDelay);
    };
  }, [rollingAnimation, fadeAnimation, noticeMessages.length]);

  // 포인트 사용방법 클릭 핸들러
  const handlePointUsageClick = async () => {
    try {
      const url = "https://wishtem.co.kr/bbs/content.php?co_id=44";
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Can't open URL:", url);
      }
    } catch (error) {
      console.error("Error opening point usage guide URL:", error);
    }
  };

  // 토스트 메시지 표시 함수 - 회사명을 파라미터로 직접 받도록 개선
  const showCustomToast = useCallback(
    (company: string, points: number) => {
      if (isToastActive.current) return;

      isToastActive.current = true;
      setEarnedPoints(points);
      setToastCompany(company); // 토스트용 별도 상태에 저장
      setShowToast(true);

      toastAnimation.setValue(-100);

      Animated.sequence([
        Animated.timing(toastAnimation, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(toastAnimation, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowToast(false);
        isToastActive.current = false;
      });
    },
    [toastAnimation]
  );

  // 즉시 포인트 조회 함수 - 안정성 개선
  const fetchTodayPoints = useCallback(
    async (source: string = "unknown", forceUpdate: boolean = false) => {
      // 기본 유효성 검사
      if (!point?.userId) {
        console.log(`[${source}] userId가 없습니다`);
        return;
      }

      // 중복 요청 방지 - 초기 로드는 항상 허용
      const now = Date.now();
      if (
        !forceUpdate &&
        source !== "initial-load" &&
        now - lastPointCheck.current < 500
      ) {
        console.log(`[${source}] 너무 빠른 요청 - 무시`);
        return;
      }

      // 진행 중인 요청이 있고, 초기 로드가 아닌 경우에만 취소
      if (fetchController.current && source !== "initial-load") {
        fetchController.current.abort();
      }

      const controller = new AbortController();
      fetchController.current = controller;
      lastPointCheck.current = now;

      try {
        console.log(`[${source}] 포인트 조회 시작`);

        const oldPoints = todayPoints;

        // 더 간단한 axios 요청
        const response = await axios.get(
          `https://bible25backend.givemeprice.co.kr/point/sum?userId=${point.userId}&type=today`,
          {
            signal: controller.signal,
            timeout: 5000, // 5초 타임아웃으로 여유있게 설정
          }
        );

        // 요청이 취소된 경우 처리하지 않음
        if (controller.signal.aborted) {
          console.log(`[${source}] 요청이 취소됨`);
          return;
        }

        let newPoints = 0;
        if (response.data && response.data.data !== undefined) {
          newPoints = response.data.data;
        } else if (typeof response.data === "number") {
          newPoints = response.data;
        }

        console.log(`[${source}] 포인트 조회 결과:`, { oldPoints, newPoints });

        // 즉시 상태 업데이트
        setTodayPoints(newPoints);

        // 첫 실행이 아니고 포인트가 증가했을 때만 토스트 표시
        if (!isFirstRun.current) {
          const pointsDiff = newPoints - oldPoints;
          if (pointsDiff > 0 && appState.current === "active" && lastCompany) {
            console.log(`[${source}] 토스트 표시:`, {
              pointsDiff,
              lastCompany,
            });
            showCustomToast(lastCompany, pointsDiff);
          }
        } else {
          isFirstRun.current = false;
        }
      } catch (error: any) {
        // AbortError와 canceled 오류는 무시
        if (
          error.name !== "AbortError" &&
          !error.message?.includes("canceled")
        ) {
          console.error(
            `[${source}] 포인트 조회 오류:`,
            error.message || error
          );
        } else {
          console.log(`[${source}] 요청이 정상적으로 취소됨`);
        }
      } finally {
        // 현재 컨트롤러와 같은 경우에만 null로 설정
        if (fetchController.current === controller) {
          fetchController.current = null;
        }
      }
    },
    [point?.userId, todayPoints, lastCompany, showCustomToast]
  );

  // 최적화된 앱 상태 변화 감지
  useEffect(() => {
    // 초기 로드 시에만 포인트 조회
    fetchTodayPoints("initial-load", true);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("앱 활성화 - 포인트 조회");
        // 앱이 백그라운드에서 돌아올 때만 조회
        setTimeout(() => {
          fetchTodayPoints("app-state-change", true);
        }, 300);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      // 컴포넌트 언마운트 시에만 요청 취소
      if (fetchController.current) {
        fetchController.current.abort();
      }
    };
  }, [fetchTodayPoints]);

  // 모토클릭에서 돌아올 때만 별도 처리
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // 모토클릭에서 돌아온 경우에만 포인트 재조회
      if (lastCompany === "모토") {
        console.log("모토클릭에서 돌아옴 - 포인트 조회");
        setTimeout(() => {
          fetchTodayPoints("motto-return", true);
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchTodayPoints, lastCompany]);

  const onclick = () => {
    navigation.navigate("PointHistoryScreen", {
      point: point,
      user: user,
      todayPoints: todayPoints,
    });
  };

  const adpopcornClick = () => {
    console.log("애드팝콘 클릭됨");
    setLastCompany("애드팝콘");
    RNAdPopcornRewardModule.setUserId(point?.userId);
    RNAdPopcornRewardModule.openOfferwall();
  };

  const mangoLabClick = async () => {
    try {
      console.log("망고랩 클릭됨");
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

  const mottoClick = async () => {
    console.log("모토클릭 클릭됨");
    setLastCompany("모토");
    const pubKey = "682fd8b91f7e7";
    await openMottoWeb(pubKey, point?.userId, point?.adid);
  };

  const stampClick = () => {
    const moreUrl = `https://doublebenefit.co.kr/static/stamp.html?mkey=1175&mckey=10676&adid=${point?.adid}&user_id=${point?.userId}`;
    Linking.openURL(moreUrl).catch((err) =>
      console.error("URL을 열 수 없습니다.", err)
    );
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

  const currentNotice = noticeMessages[currentNoticeIndex];

  return (
    <>
      {/* 토스트 메시지 */}
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
              {toastCompany} 포인트 적립 성공!
            </Text>
            <Text style={styles.toastMessage}>
              {earnedPoints}P가 적립되었습니다.
            </Text>
          </View>
        </Animated.View>
      )}

      <ScrollView>
        <TouchableOpacity style={styles.dalantCard} onPress={onclick}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {point?.name}님 총 출금 가능 포인트
            </Text>
          </View>
          <View style={styles.mainContent}>
            <View style={styles.pointContainer}>
              <Image
                source={require("../../../assets/img/pimage.png")}
                style={styles.mainIcon}
              />
              <Text style={styles.mainPoints}>{point?.points}</Text>
              <Text style={{ fontSize: 14, marginTop: 100 }}>포인트</Text>
            </View>
            <Image
              source={require("../../../assets/img/daller.png")}
              style={styles.moneyBagImage}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.subContainer}>
            <View style={styles.subTitleContainer}>
              <Text style={styles.subTitle}>오늘 번 포인트</Text>
              <View style={styles.subPointContainer}>
                <Image
                  source={require("../../../assets/img/pimage.png")}
                  style={styles.subIcon}
                />
                <Text style={styles.subPointsNumber}>{todayPoints}</Text>
                <Text style={styles.subPointsText}>포인트</Text>
              </View>
            </View>

            {/* 롤링 알림 컨테이너 */}
            <View style={styles.rollingContainer}>
              <Animated.View
                style={[
                  styles.noticeItem,
                  {
                    backgroundColor: currentNotice.backgroundColor,
                    borderLeftColor: currentNotice.borderColor,
                    transform: [{ translateY: rollingAnimation }],
                    opacity: fadeAnimation,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={
                    currentNotice.isClickable
                      ? handlePointUsageClick
                      : undefined
                  }
                  disabled={!currentNotice.isClickable}
                  style={{ flex: 1 }}
                  activeOpacity={currentNotice.isClickable ? 0.7 : 1}
                >
                  <Text
                    style={[
                      styles.noticeText,
                      { color: currentNotice.textColor },
                    ]}
                  >
                    {currentNotice.text}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.participationSection}>
          <Text style={styles.participationTitle}>
            참여 포인트도 놓치지 마세요
          </Text>
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
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
    alignItems: "baseline",
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 16,
    color: "#666666",
  },
  subPointContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  subIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  subPointsNumber: {
    fontSize: 30,
    fontWeight: Platform.OS === "android" ? "700" : "bold",
    color: "#333333",
    fontFamily: Platform.OS === "android" ? "sans-serif-medium" : undefined,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  subPointsText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 4,
    fontWeight: Platform.OS === "android" ? "400" : "normal",
    fontFamily: Platform.OS === "android" ? "sans-serif" : undefined,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  subPoints: {
    fontSize: 16,
    color: "#333333",
  },
  // 롤링 알림을 위한 새로운 스타일
  rollingContainer: {
    marginTop: 10,
    height: 56, // 약간 더 넉넉한 높이
    overflow: "hidden", // 넘치는 부분 숨김
    justifyContent: "center",
  },
  noticeItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderLeftWidth: 5,
    minHeight: 48,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noticeText: {
    fontSize: 16,
    fontWeight: "400",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFF4E6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  noteBar: {
    width: 4,
    backgroundColor: "#FF8A50",
    borderRadius: 2,
    marginRight: 12,
    alignSelf: "stretch",
  },
  noteTextOld: {
    fontSize: 12,
    color: "#8B5A2B",
    lineHeight: 16,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginBottom: 20,
  },
  participationSection: {
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
    zIndex: 9999,
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
