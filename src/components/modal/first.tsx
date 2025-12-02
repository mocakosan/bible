import { isEmpty } from "lodash";
import { Box, Button, Image, Modal, Text } from "native-base";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, TouchableOpacity, Linking } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { baseAxios } from "../../api";
import { useNativeNavigation } from "../../hooks";

interface Props {
  data: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function FirstModal({ data, isOpen, onClose }: Props) {
  const { navigation, route } = useNativeNavigation();
  const ref = useRef<any>(null);

  const onPressImage = async (id: number, link: string) => {
    try {
      await baseAxios
        .patch(`https://bible25backend.givemeprice.co.kr/advertisement?id=${id}`);
    } catch (err) {
      console.log(err);
    }
    onClose();
    
    // 외부 브라우저로 열기
    try {
      const canOpen = await Linking.canOpenURL(link);
      if (canOpen) {
        await Linking.openURL(link);
      } else {
        console.error("URL을 열 수 없습니다:", link);
      }
    } catch (err) {
      console.error("URL 열기 오류:", err);
    }
  };
  

  const renderItem = useCallback(
    ({ item }: { item: { image: string; link: string; id: number } }) => {
      const { id, link, image } = item;
      return (
        <Pressable key={image} onPress={() => onPressImage(id, link)}>
          <Image
            height={"100%"}
            width={300}
            resizeMode="stretch"
            source={{ uri: image }}
            alt={link}
          />
        </Pressable>
      );
    },
    []
  );

  useEffect(() => {
    console.log(ref.current?.offsetWidth, "#########################");
  }, [ref]);

  return (
    <>
      {!isEmpty(data) && isOpen && (
        <Modal isOpen={isOpen} onClose={onClose} zIndex={20}>
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
          </Modal.Content>

          <Box bg={"#ffff"} width={300} height={"50px"}>
            <Button
              borderRadius={0}
              height={"50px"}
              backgroundColor={"#2AC1BC"}
              onPress={onClose}
            >
              닫기
            </Button>
          </Box>
        </Modal>
      )}
    </>
  );
}
