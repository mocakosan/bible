import { unlink } from "@react-native-seoul/kakao-login";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";
import axios from "axios";
import { Box, HStack, IconButton, StatusBar, Text } from "native-base";
import React, { useState, useEffect } from "react";
import {
  Image,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import { gFontTitle } from "../../../constant/global";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { navigationData, upDownIcon } from "../../../utils/nav";
import Svg from "../../Svg";
// 필요한 구성 가져오기
import {
  API_CONFIG,
  APP_CONFIG,
  NAVER_CONFIG,
  DAWU_API_CONFIG,
  AUTH_CACHE,
} from "../../../../config";
import NaverLogin from "@react-native-seoul/naver-login";
import CryptoJS from "crypto-js";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import BannerAdMyPage from "../../../adforus/BannerAdMypage";
import BannerAdDrawer from "../../../adforus/BannerAdDrawer";

// 네이버 로그인 설정
const naverLoginConfig = {
  consumerKey: NAVER_CONFIG.CONSUMER_KEY,
  consumerSecret: NAVER_CONFIG.CONSUMER_SECRET,
  appName: NAVER_CONFIG.APP_NAME,
  serviceUrlSchemeIOS: NAVER_CONFIG.SERVICE_URL_SCHEME_IOS,
  disableNaverAppAuthIOS: NAVER_CONFIG.DISABLE_NAVER_APP_AUTH_IOS,
};

interface Props {
  props: DrawerContentComponentProps;
}
export default function DrawerLayout({ props }: Props) {
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation(); // 전체 네비게이션 객체 가져오기
  const { closeDrawer, navigate } = props.navigation;
  const [adidInfo, setAdidInfo] = useState({
    id: "",
    isAdTrackingLimited: false,
  });
  const [pointData, setPointData] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0); // 총 포인트 상태 추가
  const [loading, setLoading] = useState(false);
  const [naverId, setNaverId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [naverPayInfo, setNaverPayInfo] = useState(null);
  const [uniqueId, setUniqueId] = useState(null);

  // ADID/IDFA 정보 가져오기
  useEffect(() => {
    const getAdvertisingId = async () => {
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

        setAdidInfo(adid);
        // adid를 가져온 후 포인트 정보도 가져옴
        fetchPointData(adid.id);
      } catch (error) {
        console.error("광고 ID 가져오기 오류:", error);
      }
    };

    getAdvertisingId();
  }, []);

  // 포인트 정보 가져오기 - 총 포인트 API 추가
  const fetchPointData = async (adid) => {
    try {
      if (!adid) {
        console.log("광고 ID가 아직 로드되지 않았습니다.");
        return;
      }

      // 유저 정보 조회
      const userResponse = await axios.get(
        `https://bible25backend.givemeprice.co.kr/login/finduser`,
        { params: { adid: adid } }
      );

      if (!userResponse.data || !userResponse.data.userId) {
        console.error("유저 정보를 가져오지 못했습니다.");
        return;
      }

      const userId = userResponse.data.userId;

      // 총 포인트 조회
      const totalPointsResponse = await axios.get(
        `https://bible25backend.givemeprice.co.kr/point/sum`,
        {
          params: {
            userId: userId,
            type: "sum",
          },
        }
      );

      if (userResponse.data) {
        setPointData({
          points: userResponse.data.points || 0,
          get_points: userResponse.data.get_points || 0,
          lose_points: userResponse.data.lose_points || 0,
          delete_points: userResponse.data.delete_points || 0,
          userId: userId,
        });

        // 총 포인트 설정
        let totalPointsValue = 0;
        if (
          totalPointsResponse.data &&
          totalPointsResponse.data.data !== undefined
        ) {
          totalPointsValue = totalPointsResponse.data.data;
        } else {
          totalPointsValue = totalPointsResponse.data || 0;
        }
        setTotalPoints(totalPointsValue);
      }
    } catch (error) {
      console.error("포인트 정보 조회 오류:", error);
    }
  };

  // 포인트 사용 가능 여부 확인
  const checkPointAvailability = async (userId) => {
    try {
      if (!userId) {
        throw new Error("사용자 ID가 누락되었습니다.");
      }

      // 포인트 사용 가능 여부 API 호출
      const response = await axios.get(
        `https://bible25backend.givemeprice.co.kr/point/availabe`,
        {
          params: { userId },
        }
      );

      // 응답이 'ok'인 경우에만 true 반환
      return response.data === "ok";
    } catch (error) {
      console.error(
        "포인트 사용 가능 여부 확인 오류:",
        error.response?.data || error.message
      );
      throw new Error("포인트 사용 가능 여부 확인 중 오류가 발생했습니다.");
    }
  };

  // 개인정보 암호화 함수
  const encryptPersonalInfo = (text) => {
    try {
      if (!text) {
        throw new Error("암호화할 텍스트가 비어있습니다.");
      }

      // 다우기술에서 제공한 정확한 암호화 키와 IV 사용
      const ENC_KEY = DAWU_API_CONFIG.ENCRYPTION_KEY; // 32바이트 키
      const ENC_IV = DAWU_API_CONFIG.ENCRYPTION_IV; // 16바이트 IV

      // 키와 IV를 UTF-8 바이트 배열로 변환
      const key = CryptoJS.enc.Utf8.parse(ENC_KEY);
      const iv = CryptoJS.enc.Utf8.parse(ENC_IV);

      // AES 암호화 수행 (CBC 모드, PKCS7 패딩)
      const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7, // PKCS7은 PKCS5Padding과 동일
      });

      // Base64 인코딩된 결과 반환
      return encrypted.toString();
    } catch (error) {
      throw new Error(
        "개인정보 암호화 중 오류가 발생했습니다: " + error.message
      );
    }
  };

  // 접근 토큰 가져오기
  const getAccessToken = async () => {
    try {
      // 토큰이 유효한 경우 재사용
      const now = Date.now();
      if (AUTH_CACHE.accessToken && now < AUTH_CACHE.tokenExpireTime) {
        return AUTH_CACHE.accessToken;
      }

      // 토큰 발급 API 호출
      const response = await axios.post(
        `${DAWU_API_CONFIG.BASE_URL}/v1/auth/token`,
        { apiKey: DAWU_API_CONFIG.API_KEY },
        {
          headers: {
            "Content-Type": "application/json",
            "pointbox-partner-code": DAWU_API_CONFIG.PARTNER_CODE,
          },
        }
      );

      // 응답 데이터 확인
      if (response.data && response.data.accessToken) {
        // 토큰 저장 및 만료 시간 계산
        AUTH_CACHE.accessToken = response.data.accessToken;
        // expiresIn은 초 단위로 제공됨 (예: 3600초 = 1시간)
        // 약간의 여유를 두고 만료 시간 설정 (10초 전)
        AUTH_CACHE.tokenExpireTime =
          now + (parseInt(response.data.expiresIn) - 10) * 1000;

        return AUTH_CACHE.accessToken;
      } else {
        throw new Error("접근 토큰 발급 실패: 응답 데이터 형식 오류");
      }
    } catch (error) {
      console.error(
        "접근 토큰 발급 오류:",
        error.response?.data || error.message
      );
      throw new Error("접근 토큰 발급 중 오류가 발생했습니다.");
    }
  };

  //! 네이버페이 회원 정보 조회 함수
  const getNaverPayMemberInfo = async (uniqueId) => {
    try {
      if (!uniqueId) {
        throw new Error("네이버 유니크 아이디가 누락되었습니다.");
      }

      // API 호출
      const response = await axios.get(
        `https://dev25backend.givemeprice.co.kr/point/nid?uniqueId=${uniqueId}`
      );
      console.log("response", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "네이버페이 회원 정보 조회 오류:",
        error.response?.data || error.message
      );
      throw new Error(
        `네이버페이 회원 정보 조회 중 오류가 발생했습니다: ${
          error.message || "알 수 없는 오류"
        }`
      );
    }
  };

  // 네이버페이 포인트 적립 함수
  const addNaverPayPoint = async (userKey, points) => {
    try {
      if (!userKey) {
        throw new Error("네이버페이 유저키가 누락되었습니다.");
      }

      if (!points || isNaN(points) || points <= 0) {
        throw new Error("적립할 포인트는 양수여야 합니다.");
      }
      // API 요청 데이터 구성
      const requestData = {
        userKey: userKey,
        points: points,
      };

      // API 호출
      const response = await axios.post(
        `https://dev25backend.givemeprice.co.kr/point/addnaver`,
        requestData
      );

      // 응답 확인
      console.log("포인트 적립 응답 결과:", response.data);

      // 응답 데이터 반환
      return response.data;
    } catch (error) {
      console.error(
        "네이버페이 포인트 적립 오류:",
        error.response?.data || error.message
      );
      throw new Error(
        `네이버페이 포인트 적립 중 오류가 발생했습니다: ${
          error.message || "알 수 없는 오류"
        }`
      );
    }
  };

  // 백엔드 서버에 포인트 적립 결과 전송
  const notifyBackend = async () => {
    try {
      if (!adidInfo.id) {
        console.error("광고 ID를 가져올 수 없습니다.");
        return null;
      }

      // 유저 ID 조회
      const appUidResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
        params: { adid: adidInfo.id },
      });

      if (!appUidResponse.data || !appUidResponse.data.userId) {
        console.error("사용자 ID를 찾을 수 없습니다.");
        return null;
      }

      // 백엔드 서버 요청 데이터
      const requestData = {
        app_uid: appUidResponse.data.userId,
        ptn_cost: APP_CONFIG.MINIMUM_POINTS_REQUIRED,
      };

      // 백엔드 서버 API 호출
      const response = await axios.post(
        API_CONFIG.BIBLE25_BACKEND_URL,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // UI 포인트 즉시 업데이트 (임시적인 UI 업데이트)
      updatePointsImmediately(APP_CONFIG.MINIMUM_POINTS_REQUIRED);

      return response.data;
    } catch (error) {
      console.error(
        "백엔드 서버 통신 오류:",
        error.response?.data || error.message
      );

      // 백엔드 통신 실패해도 UI는 일단 업데이트
      updatePointsImmediately(APP_CONFIG.MINIMUM_POINTS_REQUIRED);

      return null;
    }
  };

  // 즉시 화면에 포인트 업데이트 적용하기
  const updatePointsImmediately = (spentPoints) => {
    // 총 포인트에서 차감
    setTotalPoints((prevTotal) => Math.max(0, prevTotal - spentPoints));

    // 기존 포인트 데이터도 업데이트
    setPointData((prevPoint) => {
      if (!prevPoint) return prevPoint;

      // 포인트 정보 업데이트
      const updatedPoint = {
        ...prevPoint,
        get_points: Math.max(0, (prevPoint.get_points || 0) - spentPoints),
        lose_points: (prevPoint.lose_points || 0) + spentPoints,
      };

      return updatedPoint;
    });
  };

  const onClose = () => {
    closeDrawer();
  };

  const onMenuPress = (route: string) => {
    navigate(route);
  };

  // 포인트 아이콘 클릭 시 마이페이지 혜택 탭으로 이동하는 함수
  const onPressPointIcon = () => {
    closeDrawer(); // 서랍 닫기
    // 마이페이지로 이동하면서 혜택 탭(인덱스 1)을 선택하도록 파라미터 전달
    navigation.navigate("MyPageScreen", { selectedTabIndex: 1 });
  };

  const onPressMypage = () => {
    closeDrawer(); // 서랍 닫기
    navigation.navigate("MyPageScreen", { selectedTabIndex: 0 });
  };

  // 네이버 로그인 및 포인트 적립 처리를 한번에 수행하는 함수
  const handleNaverLoginAndAddPoint = async () => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "지원되지 않는 플랫폼",
        "네이버 로그인은 안드로이드에서만 지원됩니다."
      );
      return;
    }

    try {
      setLoading(true);

      // 총 포인트로 변경하여 체크
      const pointsToAdd = totalPoints;
      const minimumPoints = APP_CONFIG?.MINIMUM_POINTS_REQUIRED || 1000;

      if (pointsToAdd < minimumPoints) {
        Alert.alert(
          "포인트 전환 실패",
          `최소 ${minimumPoints}원 이상의 포인트가 필요합니다.`
        );
        setLoading(false);
        return;
      }

      // 포인트 사용 가능 여부 확인
      const isAvailable = await checkPointAvailability(pointData.userId);

      if (!isAvailable) {
        Alert.alert(
          "알림",
          "일일 포인트 사용 한도(10,000원)를 초과하였습니다. 내일 다시 시도해주세요."
        );
        setLoading(false);
        return;
      }

      // 1. 네이버 로그인 실행
      const { isSuccess, successResponse, failureResponse } =
        await NaverLogin.login();

      if (!isSuccess || !successResponse) {
        if (failureResponse?.isCancel) {
          Alert.alert("로그인 취소", "네이버 로그인이 취소되었습니다.");
        } else {
          Alert.alert(
            "로그인 실패",
            failureResponse?.message || "네이버 로그인에 실패했습니다."
          );
        }
        setLoading(false);
        return;
      }

      // 2. 프로필 정보 가져오기
      const profileResult = await NaverLogin.getProfile(
        successResponse.accessToken
      );
      if (!profileResult?.response?.id) {
        Alert.alert("오류", "네이버 사용자 정보를 가져오지 못했습니다.");
        setLoading(false);
        return;
      }

      const naverId = profileResult.response.id;
      setNaverId(naverId);
      setUniqueId(naverId);
      setIsLoggedIn(true);

      // 3. 네이버페이 회원 정보 조회
      const naverPayMemberInfo = await getNaverPayMemberInfo(naverId);
      setNaverPayInfo(naverPayMemberInfo);

      // 4. 네이버페이 포인트 적립
      Alert.alert(
        "네이버페이 포인트 전환",
        `${minimumPoints}원을 네이버페이 포인트로 전환하시겠습니까?`,
        [
          {
            text: "취소",
            style: "cancel",
            onPress: () => setLoading(false),
          },
          {
            text: "전환",
            onPress: async () => {
              try {
                // 5. 포인트 적립 실행
                const pointResult = await addNaverPayPoint(
                  naverPayMemberInfo.userKey,
                  minimumPoints
                );

                // 6. 백엔드 서버에 결과 통지
                await notifyBackend();

                // 7. 최신 포인트 데이터 다시 로드
                if (adidInfo && adidInfo.id) {
                  await fetchPointData(adidInfo.id);
                }

                // 8. 완료 알림
                Alert.alert(
                  "네이버페이 포인트 전환 완료",
                  `${minimumPoints}원이 네이버페이 포인트로 전환되었습니다.\n거래번호: ${pointResult.txNo}`,
                  [{ text: "확인" }]
                );
              } catch (error) {
                console.error("포인트 전환 처리 오류:", error);
                Alert.alert(
                  "포인트 전환 실패",
                  error.message || "네이버페이 포인트 전환에 실패했습니다."
                );
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("네이버 로그인 및 포인트 적립 오류:", error);
      Alert.alert("오류 발생", error.message || "처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  // 교환 버튼 클릭 시 바로 네이버 포인트로 전환하는 함수
  const onPressExchange = async () => {
    try {
      if (!pointData || !pointData.userId) {
        Alert.alert(
          "알림",
          "포인트 정보를 로드 중입니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      // 최소 포인트 체크 - 총 포인트로 변경
      const minimumPoints = APP_CONFIG?.MINIMUM_POINTS_REQUIRED || 1000;
      if (totalPoints < minimumPoints) {
        Alert.alert(
          "알림",
          `포인트 교환을 위해서는 최소 ${minimumPoints}원 이상이 필요합니다.`
        );
        return;
      }

      // 포인트 사용 가능 여부 확인
      setLoading(true);
      const isAvailable = await checkPointAvailability(pointData.userId);

      if (!isAvailable) {
        Alert.alert(
          "알림",
          "일일 포인트 사용 한도(10,000원)를 초과하였습니다. 내일 다시 시도해주세요."
        );
        setLoading(false);
        return;
      }

      // 이미 로그인 상태면 바로 포인트 적립으로 진행
      if (isLoggedIn && naverPayInfo?.userKey) {
        Alert.alert(
          "네이버페이 포인트 전환",
          `${minimumPoints}포인트를 네이버페이 포인트로 전환하시겠습니까?`,
          [
            {
              text: "취소",
              style: "cancel",
              onPress: () => setLoading(false),
            },
            {
              text: "전환",
              onPress: async () => {
                try {
                  const pointResult = await addNaverPayPoint(
                    naverPayInfo.userKey,
                    minimumPoints
                  );

                  // 백엔드 서버에 결과 통지
                  await notifyBackend();

                  // 최신 포인트 데이터 다시 로드
                  if (adidInfo && adidInfo.id) {
                    await fetchPointData(adidInfo.id);
                  }

                  Alert.alert(
                    "네이버페이 포인트 전환 완료",
                    `${minimumPoints}포인트가 네이버페이 포인트로 전환되었습니다.\n거래번호: ${pointResult.txNo}`,
                    [{ text: "확인" }]
                  );
                } catch (error) {
                  Alert.alert(
                    "포인트 전환 실패",
                    error.message || "네이버페이 포인트 전환에 실패했습니다."
                  );
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
      } else {
        // 로그인되어 있지 않으면 로그인부터 시작해서 포인트 적립까지 한번에 진행
        handleNaverLoginAndAddPoint();
      }
    } catch (error) {
      Alert.alert(
        "오류 발생",
        error.message || "포인트 사용 중 오류가 발생했습니다."
      );
      setLoading(false);
    }
  };

  // 네이버 로그인 초기화
  useEffect(() => {
    if (Platform.OS === "android") {
      NaverLogin.initialize(naverLoginConfig);
    }
  }, []);

  console.log("point", pointData);
  console.log("totalPoints", totalPoints);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Box safeAreaTop bg={color.status} />

      <Box bgColor="#25BBA3" px="1" py="0" flexDirection={"row"}>
        <IconButton
          bg="#25BBA3"
          marginTop={"14px"}
          marginBottom={"10px"}
          icon={<Icon name="close" color={color.white} size={24} />}
          onPress={onClose}
        />
        <TouchableOpacity onPress={() => onMenuPress("DrawerScreens")}>
          <Text
            fontSize="28"
            marginTop={"10px"}
            marginBottom={"12px"}
            fontFamily={gFontTitle}
            style={{ color: color.white, textAlignVertical: "top" }}
          >
            바이블 25
          </Text>
        </TouchableOpacity>
      </Box>

      {/* 캐시 영역 - 총 포인트 표시로 변경 */}
      <View
        style={{
          margin: 16,
          borderRadius: 16,
          height: 80,
          position: "relative",
        }}
      >
        <LinearGradient
          colors={["#2AC1BC", "#03A29C"]}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 16,
            paddingLeft: 18,
            justifyContent: "center",
          }}
        >
          <TouchableOpacity onPress={onPressMypage}>
            <View>
              <Text fontSize="12" color="white" style={{ marginTop: 18 }}>
                보유포인트
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text fontSize="30" fontWeight="bold" color="white">
                  {totalPoints}
                </Text>
                <View
                  style={{
                    marginLeft: 8,
                  }}
                >
                  <Image
                    source={require("../../../assets/img/P.png")}
                    style={{
                      width: 28,
                      height: 28,
                    }}
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* 교환 버튼 - 총 포인트 기준으로 활성화 */}
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            backgroundColor: "white",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 5000,
            opacity:
              loading ||
              totalPoints < (APP_CONFIG?.MINIMUM_POINTS_REQUIRED || 1000)
                ? 0.7
                : 1,
          }}
          onPress={onPressExchange}
          disabled={
            loading ||
            totalPoints < (APP_CONFIG?.MINIMUM_POINTS_REQUIRED || 1000)
          }
        >
          <Text color="#25BBA3" fontWeight="medium">
            교환
          </Text>
        </TouchableOpacity>
      </View>

      {/* 아이콘 메뉴 - 포인트 아이콘 클릭 시 마이페이지 혜택 탭으로 이동하도록 수정 */}
      <HStack
        bg="white"
        justifyContent="flex-start"
        pl="4"
        pb="4"
        borderBottomWidth="1"
        borderBottomColor="#E5E5E5"
      >
        <TouchableOpacity onPress={onPressPointIcon}>
          <Box alignItems="center">
            <Image
              source={require("../../../assets/img/Money.png")}
              style={{
                width: 42,
                height: 42,
              }}
            />
            <Text color="#8F8E94">적립하기</Text>
          </Box>
        </TouchableOpacity>
      </HStack>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        <ListComponent navigationData={navigationData} navigate={navigate} />
      </DrawerContentScrollView>
    </>
  );
}

const ListComponent = ({ navigationData, navigate }: any): JSX.Element => {
  const [active, setActive] = useState(false);
  const { navigation, route } = useNativeNavigation();

  const onPressCommunity = (url: string) => {
    navigation.navigate("WordScreen", {
      data: {
        uri: "https://cafe.naver.com/loveandsalvation",
        back: true,
      },
    });
  };

  const onMenuPress = (route: string, name: string, sub?: string) => {
    if (name === "로그아웃") {
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
          adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
          await axios.delete(
            `https://bible25backend.givemeprice.co.kr/login/deleteid`,
            {
              params: { adid: adid.id },
            }
          );
        } catch (error) {
          console.log(error);
        }
      })();
      unlink();
      navigation.replace(route);
      return;
    }
    if (
      name === "개선사항" ||
      name === "개인정보처리방침" ||
      name === "이용약관"
    ) {
      Linking.openURL(route);
      return;
    }

    if (
      name === "북마크" ||
      name === "형광펜" ||
      name === "즐겨찾기" ||
      name === "말씀노트"
    ) {
      navigate(route, { name });
    } else if (name === "문의요청") {
      navigate(route);
    } else if (sub) {
      navigate(route, { data: sub });
    } else {
      navigate(route);
    }
  };

  return (
    <Box pt={["3", "3"]}>
      {navigationData.map(
        ({ name, svg, sub, route, type }: typeof navigationData) => (
          <Box key={name} paddingTop={1}>
            <Pressable
              onPress={() => {
                sub ? setActive((pre) => !pre) : onMenuPress(route, name, type);
              }}
            >
              <Box
                pl={["0", "4"]}
                pr={["3", "5"]}
                py="2"
                marginLeft={6}
                flexDirection={"row"}
                justifyContent={"space-between"}
              >
                <HStack
                  space={[2, 3]}
                  color={"#000000"}
                  justifyContent={"flex-start"}
                  alignItems={"center"}
                >
                  <Svg Svg={svg} />
                  <Text fontWeight={"medium"} fontSize={18}>
                    {name}
                  </Text>
                </HStack>
                {sub && <Svg Svg={upDownIcon} />}
              </Box>
            </Pressable>

            {sub?.map(({ name: subName, route: subRoute, svg, sub }: any) => (
              <Box
                key={subName}
                pl={["6", "4"]}
                pr={["3", "5"]}
                py="2"
                marginLeft={6}
                flexDirection={"row"}
                justifyContent={"space-between"}
                display={active ? "flex" : "none"}
              >
                <Pressable onPress={() => onMenuPress(subRoute, subName, sub)}>
                  <HStack
                    space={[2, 3]}
                    color={"#000000"}
                    justifyContent={"flex-start"}
                    alignItems={"center"}
                  >
                    <Svg Svg={svg} />
                    <Text fontWeight={"medium"} fontSize={16}>
                      {subName}
                    </Text>
                  </HStack>
                </Pressable>
              </Box>
            ))}
          </Box>
        )
      )}
      {/*<BannerAdDrawer/>*/}
    </Box>
  );
};
