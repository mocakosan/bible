import { isEmpty } from "lodash";
import { Box, Button, Flex, Image, Modal, Text } from "native-base";
import { useCallback } from "react";
import { Linking, Pressable, TouchableOpacity } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { baseAxios } from "../../api";
import React from "react";

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

  const renderItem = useCallback(
    ({ item }: { item: { image: string; link: string; id: number } }) => {
      const { id, link, image } = item;
      return (
        <Pressable key={image} onPress={() => onPressImage(id, link)}>
          <Image
            width={300}
            height={"100%"}
            resizeMode="stretch"
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
        <Modal isOpen={isOpen} onClose={onCancel} zIndex={20}>
          <Modal.Content height={500} width={300}>
            <Carousel
              loop
              width={300}
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
                  resizeMode="stretch"
                  source={{ uri: data.image }}
                  alt="이미지"
                />
              </TouchableOpacity>
            </Box>
            <Box bg={"#fff"} height={"50px"}>
              <Flex bg={"#fff"} flexDirection={"row"}>
                <Button
                  width={"50%"}
                  marginRight={"5px"}
                  borderRadius={0}
                  height={"50px"}
                  backgroundColor={"#f1f1f1"}
                  onPress={onClose}
                >
                  <Text color={"#323232"} fontWeight={"bold"}>
                    닫기
                  </Text>
                </Button>
                <Button
                  width={"50%"}
                  marginRight={"5px"}
                  borderRadius={0}
                  height={"50px"}
                  backgroundColor={"#f1f1f1"}
                  onPress={handleMoreButtonClick}
                >
                  <Text color={"#323232"} fontWeight={"bold"}>
                    더보기
                  </Text>
                </Button>
              </Flex>
            </Box>
          </Modal.Content>
        </Modal>
      )}
    </>
  );
}
