import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
  NativeModules,
  ActivityIndicator,
} from "react-native";
import BackMypageHeaderLayout from "../../layout/header/backMypageHeaer";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useEffect, useState, useMemo } from "react";
import DropDownPicker from "react-native-dropdown-picker";
import {
  format,
  subDays,
  subMonths,
  parseISO,
  isAfter,
  isSameDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import NaverLogin from "@react-native-seoul/naver-login";
import axios from "axios";
import CryptoJS from "crypto-js";
import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";

// 설정 가져오기
import {
  API_CONFIG,
  NAVER_CONFIG,
  DAWU_API_CONFIG,
  APP_CONFIG,
  AUTH_CACHE,
} from "../../../../config";
import BannerAdMyPage from "../../../adforus/BannerAdMypage";

interface NaverPayMemberInfo {
  maskingId: string;
  point: number;
  userKey: string;
}

// 네이버 로그인 설정
const naverLoginConfig = {
  consumerKey: NAVER_CONFIG.CONSUMER_KEY,
  consumerSecret: NAVER_CONFIG.CONSUMER_SECRET,
  appName: NAVER_CONFIG.APP_NAME,
  serviceUrlSchemeIOS: NAVER_CONFIG.SERVICE_URL_SCHEME_IOS,
  disableNaverAppAuthIOS: NAVER_CONFIG.DISABLE_NAVER_APP_AUTH_IOS,
};

export default function PointHistoryScreen() {
  const route = useRoute();
  const [pointData, setPointData] = useState(route.params?.point);
  const [userData, setUserData] = useState([]);
  const [total, setTotal] = useState(0);
  const [naverId, setNaverId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [naverPayInfo, setNaverPayInfo] = useState<NaverPayMemberInfo | null>(
    null
  );
  const [uniqueId, setUniqueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adidInfo, setAdidInfo] = useState({
    id: "",
    isAdTrackingLimited: false,
  });
  const [totalPoint, setTotalPoint] = useState(0);
  // 새로 추가된 상태
  const [todayPoints, setTodayPoints] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  // 첫 번째 드롭다운 상태 - 만기 포인트 제거
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("번 포인트");
  const [items, setItems] = useState([
    { label: "전체", value: "전체" },
    { label: "쓴 포인트", value: "쓴 포인트" },
    { label: "번 포인트", value: "번 포인트" },
  ]);

  // 두 번째 드롭다운 상태
  const [open2, setOpen2] = useState(false);
  const [value2, setValue2] = useState("한달");
  const [items2, setItems2] = useState([
    { label: "전체", value: "전체" },
    { label: "일주일", value: "일주일" },
    { label: "한달", value: "한달" },
    { label: "세달", value: "세달" },
  ]);

  // route.params 변경 감지
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
          const filteredData = response1.data.list;
          setUserData(filteredData);
          setTotal(response1.data.total);
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

  const currentPoints = pointData?.points || 0;
  const isPointButtonEnabled =
    currentPoints >= APP_CONFIG.MINIMUM_POINTS_REQUIRED && !loading;

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
      } catch (error) {
        console.error("광고 ID 가져오기 오류:", error);
      }
    };

    getAdvertisingId();
  }, []);

  // 오늘 포인트와 총 적립 포인트를 가져오는 새로운 useEffect
  useEffect(() => {
    const fetchPointData = async () => {
      try {
        if (!adidInfo.id) {
          console.log("광고 ID가 아직 로드되지 않았습니다.");
          return;
        }

        // 1. 유저 정보 조회
        const userResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
          params: { adid: adidInfo.id },
        });

        if (!userResponse.data || !userResponse.data.userId) {
          console.error("유저 정보를 가져오지 못했습니다.");
          return;
        }

        const userId = userResponse.data.userId;

        // 2. 오늘 번 포인트 조회
        const todayPointResponse = await axios.get(
          `https://bible25backend.givemeprice.co.kr/point/sum?userId=${userId}&type=today`
        );

        // 3. 총 적립 포인트 조회
        const totalPointResponse = await axios.get(
          `https://bible25backend.givemeprice.co.kr/point/sum?userId=${userId}&type=sum`
        );

        console.log("todayPointResponse", todayPointResponse.data);
        console.log("totalPointResponse", totalPointResponse.data);

        // 응답에서 포인트 데이터 추출 및 저장
        if (todayPointResponse.data !== undefined) {
          setTodayPoints(todayPointResponse.data);
        }

        if (totalPointResponse.data !== undefined) {
          setTotalPoints(totalPointResponse.data);
        }

        // 4. 포인트 이력 조회 및 업데이트 (수정된 함수 호출)
        await fetchPointHistory(userId);
      } catch (error) {
        console.error("포인트 정보 조회 오류:", error.response?.data || error);
      }
    };

    fetchPointData();
  }, [adidInfo.id]);

  const fetchPointSum = async () => {
    try {
      const response = await axios.get(
        `https://bible25backend.givemeprice.co.kr/point/sum?userId=${pointData?.userId}&type=sum`
      );

      // 응답 구조에 따라 적절한 필드를 선택하여 상태 업데이트
      const pointValue =
        response.data.totalPoint || response.data.sum || response.data || 0;
      setTotalPoint(pointValue);
    } catch (error) {
      console.error("포인트 API 호출 실패:", error);
      if (axios.isAxiosError(error)) {
        console.error("에러 상세:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
    }
  };
  useFocusEffect(
    useCallback(() => {
      fetchPointSum();
    }, [fetchPointSum])
  );

  // 포인트 이력 조회 함수
  const fetchPointHistory = async (userId) => {
    if (!userId) return;

    setLoadingHistory(true);

    try {
      // 포인트 이력 API 호출
      if (adidInfo.id) {
        // API_CONFIG.BIBLE25_USER_API를 통해 사용자 데이터 조회
        const userDataResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
          params: { adid: adidInfo.id },
        });

        if (userDataResponse.data && userDataResponse.data.history) {
          // 만기포인트를 제외한 데이터만 필터링
          const filteredHistory = userDataResponse.data.history.filter(
            (item) => item.point_type !== "만기 포인트"
          );
          setUserData(filteredHistory);
        }
      }
    } catch (error) {
      console.error("포인트 이력 조회 오류:", error.response?.data || error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 즉시 화면에 포인트 업데이트 적용하기
  const updatePointsImmediately = async (spentPoints) => {
    setPointData((prevPoint) => {
      if (!prevPoint) return prevPoint;

      // 포인트 정보 업데이트
      const updatedPoint = {
        ...prevPoint,
        points: Math.max(0, (prevPoint.points || 0) - spentPoints),
        lose_points: (prevPoint.lose_points || 0) + spentPoints,
      };

      console.log("포인트 업데이트:", updatedPoint);
      return updatedPoint;
    });

    // 내역에 새 항목 추가
    const now = new Date();
    const koreanNow = toZonedTime(now, "Asia/Seoul");
    const newTransaction = {
      id: Date.now(), // 임시 ID
      point_type: "쓴 포인트",
      points: spentPoints,
      today: format(koreanNow, "yyyy-MM-dd"),
      time: format(koreanNow, "HH:mm:ss"),
      company: "네이버페이 전환",
    };

    // 1. 새 항목 추가
    setUserData((prev) => [newTransaction, ...prev]);

    // 2. 유저 ID 조회 후 이력 갱신
    if (adidInfo.id) {
      try {
        const userResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
          params: { adid: adidInfo.id },
        });

        if (userResponse.data && userResponse.data.userId) {
          // 잠시 대기 후 이력 갱신 (백엔드 처리 시간 고려)
          setTimeout(() => {
            fetchPointHistory(userResponse.data.userId);
          }, 500);
        }
      } catch (error) {
        console.error("이력 갱신 중 오류:", error);
      }
    }
  };

  // 포인트 정보 새로고침
  const refreshPointData = async () => {
    try {
      if (!adidInfo.id) {
        console.log("광고 ID가 아직 로드되지 않았습니다.");
        return;
      }

      // 1. 유저 정보 조회
      const userResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
        params: { adid: adidInfo.id },
      });

      if (!userResponse.data || !userResponse.data.userId) {
        console.error("유저 정보를 가져오지 못했습니다.");
        return;
      }

      const userId = userResponse.data.userId;

      // 2. 포인트 정보 조회
      const pointResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
        params: { adid: adidInfo.id },
      });

      if (pointResponse.data) {
        console.log("최신 포인트 정보:", pointResponse.data);

        // 3. 상태 업데이트
        setPointData((prevPoint) => ({
          ...prevPoint,
          ...pointResponse.data.get_points,
        }));

        // 4. 히스토리 데이터도 필요시 업데이트
        // 히스토리 데이터가 포함되어 있다면 업데이트
        if (pointResponse.data.history) {
          // 만기포인트를 제외한 데이터만 필터링
          const filteredHistory = pointResponse.data.history.filter(
            (item) => item.point_type !== "만기 포인트"
          );
          setUserData(filteredHistory);
        } else {
          // 포인트 이력 별도 조회
          await fetchPointHistory(userId);
        }

        // 5. 오늘 포인트와 총 적립 포인트 조회 업데이트
        const todayPointResponse = await axios.get(
          `https://bible25backend.givemeprice.co.kr/point/sum`,
          {
            params: { userId, type: "today" },
          }
        );

        const totalPointResponse = await axios.get(
          `https://bible25backend.givemeprice.co.kr/point/sum`,
          {
            params: { userId, type: "sum" },
          }
        );

        if (
          todayPointResponse.data &&
          todayPointResponse.data.data !== undefined
        ) {
          setTodayPoints(todayPointResponse.data.data);
        }

        if (
          totalPointResponse.data &&
          totalPointResponse.data.data !== undefined
        ) {
          setTotalPoints(totalPointResponse.data.data);
        }
      }
    } catch (error) {
      console.error(
        "포인트 정보 새로고침 오류:",
        error.response?.data || error.message
      );
    }
  };

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
      const result = encrypted.toString();

      return result;
    } catch (error) {
      throw new Error(
        "개인정보 암호화 중 오류가 발생했습니다: " + error.message
      );
    }
  };

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

  /**
   * 네이버페이 회원 정보 조회 함수
   */
  const getNaverPayMemberInfo = async (uniqueId) => {
    try {
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

      console.log("조회된 사용자 정보:", appUidResponse.data);
      const userId = appUidResponse.data.userId;

      // 백엔드 서버 요청 데이터
      const requestData = {
        app_uid: userId,
        ptn_cost: APP_CONFIG.MINIMUM_POINTS_REQUIRED,
      };

      console.log("백엔드 서버 요청 데이터:", requestData);

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

      console.log("백엔드 서버 응답 결과:", response.data);

      // 즉시 포인트 갱신 (UI 반영)
      await updatePointsImmediately(APP_CONFIG.MINIMUM_POINTS_REQUIRED);

      // 백엔드에서 포인트 정보 새로고침 시도 (실패해도 괜찮음)
      try {
        await refreshPointData();

        // 포인트 이력 새로고침
        await fetchPointHistory(userId);
      } catch (refreshError) {
        console.log(
          "백엔드 포인트 정보 새로고침 실패 (UI는 업데이트됨):",
          refreshError
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        "백엔드 서버 통신 오류:",
        error.response?.data || error.message
      );

      // 백엔드 통신 실패해도 UI는 업데이트
      await updatePointsImmediately(APP_CONFIG.MINIMUM_POINTS_REQUIRED);

      return null;
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 네이버 로그인 초기화
    if (Platform.OS === "android") {
      NaverLogin.initialize(naverLoginConfig);
    }
  }, []);

  const getKoreanDate = () => {
    return toZonedTime(new Date(), "Asia/Seoul");
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

      // 보유한 달란트를 확인
      const pointsToAdd = currentPoints;
      if (pointsToAdd < APP_CONFIG.MINIMUM_POINTS_REQUIRED) {
        Alert.alert(
          "포인트 전환 실패",
          `최소 ${APP_CONFIG.MINIMUM_POINTS_REQUIRED}원 이상의 포인트가 필요합니다.`
        );
        setLoading(false);
        return;
      }

      // 앱 사용자 ID 가져오기
      const appUidResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
        params: { adid: adidInfo.id },
      });

      if (!appUidResponse.data || !appUidResponse.data.userId) {
        Alert.alert("오류", "사용자 정보를 가져오지 못했습니다.");
        setLoading(false);
        return;
      }

      const userId = appUidResponse.data.userId;

      // 포인트 사용 가능 여부 확인
      const isAvailable = await checkPointAvailability(userId);

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
        `${APP_CONFIG.MINIMUM_POINTS_REQUIRED}원을 네이버페이 포인트로 전환하시겠습니까?`,
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
                  APP_CONFIG.MINIMUM_POINTS_REQUIRED
                );

                // 6. 백엔드 서버에 결과 통지 및 포인트 정보 새로고침
                await notifyBackend();

                // 7. 완료 알림
                Alert.alert(
                  "네이버페이 포인트 전환 완료",
                  `${APP_CONFIG.MINIMUM_POINTS_REQUIRED}원이 네이버페이 포인트로 전환되었습니다.\n거래번호: ${pointResult.txNo}`,
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

  const checkPointAvailability = async (userId) => {
    try {
      console.log("userId", userId);
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

      console.log("포인트 사용 가능 여부 응답:", response.data);

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

  // 달란트 사용 버튼 처리 함수 - 한번에 로그인과 포인트 전환
  const handleUsePointPress = async () => {
    // 최소 금액 확인
    if (currentPoints < APP_CONFIG.MINIMUM_POINTS_REQUIRED) {
      Alert.alert(
        "알림",
        `포인트 사용을 위해서는 최소 ${APP_CONFIG.MINIMUM_POINTS_REQUIRED}원 이상이 필요합니다.`
      );
      return;
    }

    try {
      setLoading(true);

      // 앱 사용자 ID 가져오기
      const appUidResponse = await axios.get(API_CONFIG.BIBLE25_USER_API, {
        params: { adid: adidInfo.id },
      });

      if (!appUidResponse.data || !appUidResponse.data.userId) {
        Alert.alert("오류", "사용자 정보를 가져오지 못했습니다.");
        setLoading(false);
        return;
      }

      const userId = appUidResponse.data.userId;

      // 포인트 사용 가능 여부 확인
      const isAvailable = await checkPointAvailability(userId);

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
          `${APP_CONFIG.MINIMUM_POINTS_REQUIRED}포인트를 네이버페이 포인트로 전환하시겠습니까?`,
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
                    APP_CONFIG.MINIMUM_POINTS_REQUIRED
                  );

                  // 백엔드 서버에 결과 통지 및 포인트 정보 새로고침
                  await notifyBackend();

                  Alert.alert(
                    "네이버페이 포인트 전환 완료",
                    `${APP_CONFIG.MINIMUM_POINTS_REQUIRED}포인트가 네이버페이 포인트로 전환되었습니다.\n거래번호: ${pointResult.txNo}`,
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

  const getFilteredData = useCallback(() => {
    const koreanToday = getKoreanDate();

    // 포인트 타입 필터링 (첫 번째 드롭다운)
    let filtered = userData.filter((item) => {
      if (value === "전체") return true;
      return item.point_type === value; // 정확히 일치하는지 확인
    });

    // 날짜 필터링 (두 번째 드롭다운)
    filtered = filtered.filter((item) => {
      if (!item.today) return false; // 날짜가 없는 항목은 필터링

      const itemDate = parseISO(item.today);
      if (isNaN(itemDate.getTime())) return false; // 유효하지 않은 날짜는 필터링

      switch (value2) {
        case "일주일": {
          const weekAgo = subDays(koreanToday, 7);
          return isAfter(itemDate, weekAgo) || isSameDay(itemDate, weekAgo);
        }
        case "한달": {
          const monthAgo = subMonths(koreanToday, 1);
          return isAfter(itemDate, monthAgo) || isSameDay(itemDate, monthAgo);
        }
        case "세달": {
          const threeMonthsAgo = subMonths(koreanToday, 3);
          return (
            isAfter(itemDate, threeMonthsAgo) ||
            isSameDay(itemDate, threeMonthsAgo)
          );
        }
        default:
          return true;
      }
    });

    // 날짜순으로 정렬 (최신순)
    return filtered.sort((a, b) => {
      if (!a.today || !b.today) return 0;

      const dateA = parseISO(a.today);
      const dateB = parseISO(b.today);

      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;

      // 날짜가 같으면 시간으로 비교
      if (isSameDay(dateA, dateB)) {
        // time 형식이 "HH:mm" 또는 "HH:mm:ss"라고 가정
        const timeA = a.time.split(":");
        const timeB = b.time.split(":");

        // 시간 비교
        const hourA = parseInt(timeA[0]);
        const hourB = parseInt(timeB[0]);
        if (hourA !== hourB) return hourB - hourA;

        // 분 비교
        const minuteA = parseInt(timeA[1]);
        const minuteB = parseInt(timeB[1]);
        return minuteB - minuteA;
      }

      return dateB.getTime() - dateA.getTime();
    });
  }, [userData, value, value2]);

  const filteredData = getFilteredData();

  // 필터링된 데이터의 총 포인트 계산 - 만기포인트 로직 제거
  const filteredTotalPoints = useMemo(() => {
    return filteredData.reduce((total, item) => {
      if (item.point_type === "쓴 포인트") {
        return total - (item.points || 0); // 쓴 포인트는 음수로 처리
      } else {
        return total + (item.points || 0); // 번 포인트는 양수로 처리
      }
    }, 0);
  }, [filteredData]);
  console.log("detailtotalPoint", totalPoint);
  return (
    <View style={styles.container}>
      <BackMypageHeaderLayout
        title="포인트 내역"
        totalSumPoint={totalPoint} // 헤더에 표시할 포인트 값
        point={{
          userId: pointData?.userId, // API 호출을 위한 userId
        }}
        user={route.params?.user}
        showPoints={true} // 포인트 표시 활성화
      />

      {/* 상단 포인트 카드 섹션 */}
      <View style={styles.pointCard}>
        <View style={styles.headerSection}>
          <View style={styles.currentPointSection}>
            <Text style={styles.mainLabel}>출금가능 포인트</Text>
            <View style={styles.pointValueContainer}>
              <Image
                source={require("../../../assets/img/pimage.png")}
                style={styles.mainPointIcon}
              />
              <Text style={styles.mainPointValue}>{currentPoints}</Text>
              <Text style={styles.wonText}>포인트</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.usePointButton,
              !isPointButtonEnabled && styles.usePointButtonDisabled,
            ]}
            onPress={handleUsePointPress}
            disabled={!isPointButtonEnabled}
          >
            <Text style={styles.usePointButtonText}>포인트 사용</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pointDetailsSection}>
          <View style={styles.pointDetailItem}>
            <Text style={styles.detailLabel}>오늘 번 포인트</Text>
            <View style={styles.detailValueContainer}>
              <Image
                source={require("../../../assets/img/pimage.png")}
                style={styles.detailPointIcon}
              />
              <Text style={styles.detailPointValue}>{todayPoints}</Text>
              <Text style={styles.detailWonText}>포인트</Text>
            </View>
          </View>

          <View style={styles.pointDetailItem}>
            <Text style={styles.detailLabel}>총 적립 포인트</Text>
            <View style={styles.detailValueContainer}>
              <Image
                source={require("../../../assets/img/pimage.png")}
                style={styles.detailPointIcon}
              />
              <Text style={styles.detailPointValue}>{totalPoints}</Text>
              <Text style={styles.detailWonText}>포인트</Text>
            </View>
          </View>
        </View>

        {/* 최소 달란트 요구 사항 안내 */}
        {currentPoints < APP_CONFIG.MINIMUM_POINTS_REQUIRED && (
          <View style={styles.minimumPointsNotice}>
            <Text style={styles.minimumPointsText}>
              포인트는 {APP_CONFIG.MINIMUM_POINTS_REQUIRED}원 이상부터 사용
              가능합니다.
            </Text>
          </View>
        )}
      </View>

      {/* 상단 총 건수 및 필터 섹션 */}
      <View style={styles.topSection}>
        <View style={styles.totalCount}>
          <Text style={styles.totalCountText}>총 </Text>
          <Text style={styles.totalCountNumber}>{total}</Text>
          <Text style={styles.totalCountText}>건</Text>
        </View>
        <View style={styles.filterButtons}>
          <View style={styles.dropdownContainer}>
            <DropDownPicker
              open={open}
              value={value}
              items={items}
              setOpen={setOpen}
              setValue={setValue}
              setItems={setItems}
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownPanel}
              listItemContainerStyle={styles.dropdownItemContainer}
              zIndex={2000}
            />
          </View>
          <View style={styles.dropdownContainer}>
            <DropDownPicker
              open={open2}
              value={value2}
              items={items2}
              setOpen={setOpen2}
              setValue={setValue2}
              setItems={setItems2}
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownPanel}
              listItemContainerStyle={styles.dropdownItemContainer}
              zIndex={1000}
            />
          </View>
        </View>
      </View>

      {/* 총 포인트 섹션 */}
      <View style={styles.filteredTotalSection}>
        <Text style={styles.filteredTotalLabel}>총 포인트</Text>
        <View style={styles.filteredTotalValueContainer}>
          <Text style={styles.filteredTotalValue}>{filteredTotalPoints}</Text>
          <Text style={styles.filteredTotalUnit}>포인트</Text>
        </View>
      </View>

      {/* 로딩 인디케이터 */}
      {loadingHistory && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#75C2B8" />
        </View>
      )}

      {/* 포인트 내역 리스트 */}
      <FlatList
        data={filteredData}
        renderItem={({ item }) => (
          <View style={styles.historyItemCard}>
            <Text style={styles.historyDateTime}>
              {item.today} | {item.time}
            </Text>
            <View style={styles.historyContent}>
              <View style={styles.historyTitleContainer}>
                <Text style={styles.historyTitle}>{item.point_type}</Text>
                {item.company && (
                  <Text style={styles.historyCompany}>{item.company}</Text>
                )}
              </View>
              <View style={styles.historyPoints}>
                <Image
                  source={require("../../../assets/img/pimage.png")}
                  style={styles.historyPointIcon}
                />
                <Text
                  style={[
                    styles.historyPointValue,
                    item.point_type.includes("쓴")
                      ? styles.usedPoints
                      : styles.earnedPoints,
                  ]}
                >
                  {item.point_type.includes("쓴") ? "-" : ""}
                  {item.points}포인트
                </Text>
              </View>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        style={styles.historyList}
        contentContainerStyle={styles.historyListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyListText}>포인트 내역이 없습니다.</Text>
          </View>
        }
      />
      <View style={styles.adContainer}>
        <BannerAdMyPage />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  pointCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adContainer: {
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
  },
  currentPointSection: {
    flex: 1,
  },
  mainLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  pointValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainPointIcon: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  mainPointValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  wonText: {
    fontSize: 20,
    color: "#333",
    marginLeft: 4,
  },
  usePointButton: {
    backgroundColor: "#75C2B8",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  usePointButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  usePointButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  minimumPointsNotice: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFF9C4",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  minimumPointsText: {
    fontSize: 13,
    color: "#555",
  },
  pointDetailsSection: {
    marginTop: 8,
  },
  pointDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailPointIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  detailPointValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  detailWonText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 2,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
    zIndex: 100,
  },
  totalCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalCountText: {
    fontSize: 16,
    color: "#333",
  },
  totalCountNumber: {
    fontSize: 16,
    color: "#75C2B8",
    fontWeight: "600",
    marginHorizontal: 2,
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    zIndex: 2000,
  },
  dropdownContainer: {
    width: 140,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
  },
  dropdown: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  dropdownPanel: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    position: "absolute",
    left: 0,
    right: 0,
  },
  dropdownText: {
    fontSize: 13,
    color: "#333",
  },
  dropdownItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingVertical: 10,
  },
  filteredTotalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filteredTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  filteredTotalValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  filteredTotalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#75C2B8",
    marginRight: 4,
  },
  filteredTotalUnit: {
    fontSize: 16,
    color: "#333",
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    gap: 12,
  },
  historyItemCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  historyDateTime: {
    fontSize: 16,
    color: "#75C2B8",
    marginBottom: 8,
  },
  historyContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  historyPoints: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyPointIcon: {
    width: 20,
    height: 20,
  },
  historyPointValue: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
  },
  historyTitleContainer: {
    flexDirection: "column",
  },
  historyCompany: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  usedPoints: {
    color: "#FF5252",
  },
  earnedPoints: {
    color: "#4CAF50",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    zIndex: 999,
  },
  emptyListContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
});
