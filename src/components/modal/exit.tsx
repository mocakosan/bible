import { isEmpty } from "lodash";
import { Box, Button, Flex, Image, Modal, Text } from "native-base";
import { useCallback, useEffect, useState } from "react";
import { Dimensions, Linking, Pressable, TouchableOpacity } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { baseAxios } from "../../api";
import axios from "axios";
import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";
import React from "react";
import BannerAdExit from "../../adforus/BannerAdExit";

interface Props {
  data: any;
  isOpen: boolean;
  onCancel: () => void;
  onClose: () => void;
}

export default function ExitModal({ data, isOpen, onCancel, onClose }: Props) {
  const onPressImage = (id: number, link: string) => {
    baseAxios
      .patch(`https://bible25backend.givemeprice.co.kr/advertisement?id=${id}`)
      .then(() => {
        Linking.openURL(link);
        onClose();
      })
      .catch((err) => console.log(err));
  };

  const handleMoreButtonClick = () => {
    //! 쿠팡
    const moreUrl = "https://link.coupang.com/a/bBOdxK";
    Linking.openURL(moreUrl).catch((err) =>
      console.error("URL을 열 수 없습니다.", err)
    );
    //! 외주 광고
    // baseAxios
    //   .patch(
    //     https://bible25backend.givemeprice.co.kr/advertisement?id=${data[0].id}
    //   )
    //   .then(() => {
    //     Linking.openURL(data[0].link);
    //     onClose();
    //   })
    //   .catch((err) => console.log(err));
  };

  const [adidData, setAdidData] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const adidInfo = await ReactNativeIdfaAaid.getAdvertisingInfo();
        const response = await axios.get(
          "https://bible25backend.givemeprice.co.kr/login/finduser",
          { params: { adid: adidInfo.id } }
        );

        setUserId(response.data.userId);
        setAdidData(response.data.adid);
      } catch (error) {
        console.error("비동기 호출 에러:", error);
      }
    })();
  }, []);

  const coupangLink = `https://doublebenefit.co.kr/static/stamp.html?mkey=1175&mckey=10676&adid=${adidData}&user_id=${userId}`;
  const phoneLink =
    "https://wish.phonetalk.kr/m/good.php?menu=view&p_code=1716298942&session=";

  const onPressCoupang = (link: string) => {
    Linking.openURL(link);
  };

  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;
  const imageHeight = windowWidth * (250 / 300);

  const renderItem = useCallback(
    ({ item }: { item: { image: string; link: string; id: number } }) => {
      const { id, link, image } = item;
      return (
        <Pressable key={image} onPress={() => onPressImage(id, link)}>
          <Image
            width={windowWidth - 20}
            height={imageHeight}
            resizeMode="contain"
            source={{ uri: image }}
            alt={link}
          />
        </Pressable>
      );
    },
    []
  );

  return (
    <>
      {!isEmpty(data) && isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onCancel}
          zIndex={20}
          borderTopLeftRadius={50}
          borderTopRightRadius={50}
          marginTop={"10%"}
          paddingTop={"20%"}
          backgroundColor={"#fff"}
          width={windowWidth}
          height={windowHeight}
        >
          <Modal.Content
            height={imageHeight - 10}
            width={windowWidth - 20}
            marginBottom={3}
          >
            <Carousel
              loop
              width={windowWidth - 20}
              style={{ flex: 1 }}
              autoPlay={true}
              autoPlayInterval={5000}
              data={data}
              scrollAnimationDuration={490}
              renderItem={renderItem}
            />
            <Box>
              <TouchableOpacity>
                <Image
                  resizeMode="contain"
                  source={{ uri: data.image }}
                  alt="이미지"
                />
              </TouchableOpacity>
            </Box>
          </Modal.Content>
          <Box width={windowWidth}>
            <BannerAdExit />
          </Box>
          <Box width={windowWidth} height={"17%"}>
            <Pressable onPress={() => onPressCoupang(phoneLink)}>
              <Image
                w={windowWidth}
                height={"100%"}
                resizeMode="stretch"
                source={require("../../assets/img/exit_top.png")}
              />
            </Pressable>
          </Box>
          <Box width={windowWidth} height={"17%"}>
            <Pressable onPress={() => onPressCoupang(coupangLink)}>
              <Image
                source={require("../../assets/img/exit_bottom.png")}
                height={"100%"}
                w={windowWidth}
                resizeMode="stretch"
              />
            </Pressable>
          </Box>
          <Box
            bg={"#fff"}
            height={"18%"}
            width={windowWidth}
            marginTop={"10px"}
            paddingLeft={"10px"}
            paddingRight={"10px"}
          >
            <Flex
              bg={"#fff"}
              flexDirection={"row"}
              width={windowWidth}
              height={"100%"}
            >
              <Button
                width={"45%"}
                height={"40%"}
                marginRight={"5px"}
                marginLeft={"10px"}
                display={"flex"}
                justifyItems={"center"}
                alignItems={"center"}
                borderRadius={15}
                backgroundColor={"#f1f1f1"}
                onPress={onClose}
              >
                <Text color={"#323232"} fontWeight={"bold"} fontSize={"20px"}>
                  앱종료
                </Text>
              </Button>
              <Button
                width={"45%"}
                height={"40%"}
                display={"flex"}
                marginRight={"10px"}
                justifyItems={"center"}
                alignItems={"center"}
                borderRadius={15}
                backgroundColor={"#f1f1f1"}
                onPress={handleMoreButtonClick}
              >
                <Text color={"#323232"} fontWeight={"bold"} fontSize={"20px"}>
                  더보기
                </Text>
              </Button>
            </Flex>
          </Box>
        </Modal>
      )}
    </>
  );
}
