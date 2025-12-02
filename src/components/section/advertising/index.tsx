import { isEmpty } from "lodash";
import { Box, Image, Pressable, Skeleton } from "native-base";
import { memo, useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Linking,
  StyleProp,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { baseAxios } from "../../../api";
import { api } from "../../../api/define";

interface AdvertisingItem {
  id: number;
  location: number;
  title: string;
  image: string;
  link: string;
}

interface Props {
  default: {
    lat: number;
    lon: number;
    jang: string;
  };
  type: "slider" | "img";
  name: string;
  isValidating: boolean;
  data?: AdvertisingItem;
  style?: StyleProp<ViewStyle>;
}

function Advertising({
  type,
  isValidating,
  style,
  name,
  default: { lat, lon, jang },
}: Props) {
  const windowWidth = Dimensions.get("window").width;
  const [data, setData] = useState<AdvertisingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 광고 데이터 가져오기 - 실제 API 응답 구조에 맞게 수정
  const fetchAdvertisements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 기존 코드 스타일에 맞춰 API 호출
      const response = await baseAxios({
        method: "GET",
        url: `https://bible25backend.givemeprice.co.kr/advertisement`,
        params: {
          type: name,
          lat: lat,
          lon: lon,
        },
        timeout: 10000,
      });

      console.log(`광고 API 응답 [${name}]:`, response?.data);

      // 실제 API 응답 구조: { success: boolean, timestamp: string, data: [] }
      if (response?.data?.success && response?.data?.data) {
        const advertisementData = response.data.data;

        // 유효한 데이터만 필터링
        const validData = advertisementData.filter(
          (item: any) =>
            item &&
            typeof item === "object" &&
            item.id &&
            item.image &&
            item.link &&
            item.title
        );

        console.log(`유효한 광고 데이터 [${name}]:`, validData.length, "개");
        setData(validData);
      } else {
        console.log(`광고 데이터 없음 [${name}]:`, response?.data);
        setData([]);
      }
    } catch (err: any) {
      console.log(`광고 로드 실패 [${name}]:`, err.message || err);

      // 에러 상세 정보 로깅 (디버깅용)
      if (err.response) {
        console.log(`응답 상태 [${name}]:`, err.response.status);
        console.log(`응답 데이터 [${name}]:`, err.response.data);
        if (err.response.status === 500) {
          console.log("서버 내부 오류 - 광고 숨김 처리");
        }
      }

      setError(err.message || "Network error");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [name, lat, lon]);

  // 컴포넌트 마운트 시 및 jang 변경 시 데이터 가져오기
  useEffect(() => {
    // 약간의 지연을 주어 다른 API 요청과 충돌 방지
    const timer = setTimeout(() => {
      fetchAdvertisements();
    }, 100);

    return () => clearTimeout(timer);
  }, [fetchAdvertisements, jang]);

  // 광고 클릭 시 처리 함수
  const handleAdClick = useCallback(
    async (id: number, url: string) => {
      try {
        console.log(`광고 클릭 [${name}]:`, { id, url });

        // 클릭 통계를 위한 API 호출 (선택사항)
        if (api.POST_BANNER_CLICK) {
          try {
            await baseAxios({
              method: "PATCH",
              url: api.POST_BANNER_CLICK,
              params: { id },
              timeout: 3000,
            });
          } catch (clickError) {
            console.log("클릭 통계 전송 실패:", clickError);
            // 통계 전송 실패해도 링크는 열어줌
          }
        }

        // 외부 링크 열기
        if (url) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            console.warn("URL을 열 수 없습니다:", url);
          }
        }
      } catch (err) {
        console.error("광고 클릭 처리 중 오류:", err);
        // 에러가 발생해도 링크는 열어줌
        if (url) {
          try {
            await Linking.openURL(url);
          } catch (linkError) {
            console.error("링크 열기 실패:", linkError);
          }
        }
      }
    },
    [name]
  );

  // 캐러셀 아이템 렌더링 함수
  const renderItem = useCallback(
    ({ item }: { item: AdvertisingItem }) => {
      if (!item || !item.id || !item.image || !item.link) {
        return null;
      }

      const { id, link, image, title } = item;

      return (
        <Pressable
          key={`${id}-${image}`}
          onPress={() => handleAdClick(id, link)}
          style={{ flex: 1 }}
        >
          <Image
            w={windowWidth}
            h={"100px"}
            resizeMode="contain"
            source={{ uri: image }}
            alt={title || link || "advertisement"}
            fallbackSource={{
              uri: "https://via.placeholder.com/400x100/f0f0f0/666666?text=Ad",
            }}
          />
        </Pressable>
      );
    },
    [windowWidth, handleAdClick]
  );

  // 로딩 중일 때
  if (isLoading || isValidating) {
    return (
      <Box style={style}>
        <Skeleton h={"100px"} w={windowWidth} startColor="coolGray.200" />
      </Box>
    );
  }

  // 에러가 있거나 데이터가 없을 때 - 광고 영역 자체를 숨김
  if (error || !data || data.length === 0) {
    console.log(`광고 숨김 [${name}]:`, { error, dataLength: data?.length });
    return null;
  }

  return (
    <Box style={style}>
      {type === "img" && data.length > 0 && (
        <TouchableOpacity
          onPress={() => handleAdClick(data[0].id, data[0].link)}
          activeOpacity={0.8}
        >
          <Image
            w={windowWidth}
            h={"100px"}
            resizeMode="contain"
            alt={data[0].title || "advertising"}
            source={{ uri: data[0].image }}
            fallbackSource={{
              uri: "https://via.placeholder.com/400x100/f0f0f0/666666?text=Ad",
            }}
          />
        </TouchableOpacity>
      )}

      {type === "slider" && data.length > 0 && (
        <Carousel
          loop={data.length > 1}
          width={windowWidth}
          height={100}
          autoPlay={data.length > 1}
          autoPlayInterval={5000}
          data={data}
          scrollAnimationDuration={490}
          renderItem={renderItem}
          pagingEnabled
          snapEnabled
        />
      )}
    </Box>
  );
}

export default memo(Advertising);
