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

  const onPressImage = (id: number, link: string) => {
    baseAxios
      .patch(`https://bible25backend.givemeprice.co.kr/advertisement?id=${id}`)
      .catch((err) => console.log(err));
    onClose();
    navigation.navigate("WordScreen", {
      data: { uri: link, back: true },
    });
  };

  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;
  const imageHeight = windowWidth * (250 / 300);

  const renderItem = useCallback(
    ({ item }: { item: { image: string; link: string; id: number } }) => {
      const { id, link, image } = item;
      return (
        <Pressable key={image} onPress={() => onPressImage(id, link)}>
          {/* <Image
            width={windowWidth - 20}
            height={imageHeight}
            resizeMode="contain"
            source={{ uri: image }}
            alt={link}
          /> */}
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
        // <Modal
        //   isOpen={isOpen}
        //   onClose={onClose}
        //   zIndex={20}
        //   borderTopLeftRadius={50}
        //   borderTopRightRadius={50}
        //   marginTop={"90%"}
        //   paddingBottom={"50%"}
        //   backgroundColor={"#fff"}
        //   width={windowWidth}
        //   height={windowHeight}
        // >
        //   <Modal.Content height={imageHeight - 10} width={windowWidth - 20}>
        <Modal isOpen={isOpen} onClose={onClose} zIndex={20}>
          <Modal.Content height={500} width={300}>
            <Carousel
              loop
              width={300}
              // width={windowWidth - 20}
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
          {/* <Box
            bg={"#ffff"}
            height={"23%"}
            width={windowWidth}
            marginTop={"30px"}
            marginBottom={"30px"}
            paddingLeft={"10px"}
          >
            <Button
              borderRadius={10}
              width={"90%"}
              height={"40%"}
              display={"flex"}
              marginLeft={"10px"}
              justifyItems={"center"}
              alignItems={"center"}
              backgroundColor={"#f1f1f1"}
              onPress={onClose}
            >
              <Text color={"#323232"} fontWeight={"bold"} fontSize={"20px"}>
                닫기
              </Text>
            </Button>
          </Box> */}
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
