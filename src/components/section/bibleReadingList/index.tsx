import { Button, HStack, Text } from "native-base";
import { useBaseStyle } from "../../../hooks";
import { gFontTitle } from "../../../constant/global";
import { memo } from "react";
import { useNavigation } from "@react-navigation/native";

interface Props {
  vector: boolean;
  menuIndex: number;
  onPress: (index: number) => void;
}

function bibleReadingList({ vector, menuIndex, onPress }: Props) {
  const { color } = useBaseStyle();
  const navigation = useNavigation();

  const list = vector
    ? ["공유", "복사", "북마크", "형광펜", "취소"]
    : ["성경", "스터디", "핵심", "묵상", "포인트"];

  const width = 100 / list.length;

  const handlePress = (index: number, name: string) => {
    // "포인트" 버튼을 누른 경우 마이페이지로 이동
    if (name === "포인트") {
      navigation.navigate("MyPageScreen" as never);
      return;
    }

    // 기존 로직 실행
    onPress(index);
  };

  return (
    <HStack alignItems="center" borderColor={color.bible} borderWidth={1}>
      {list.map((name, index) => (
        <Button
          w={`${width}%`}
          padding={1}
          fontWeight={900}
          _pressed={{ bg: color.white }}
          bg={`${color.white}:alpha.0`}
          key={index * 13}
          onPress={() => handlePress(index, name)}
        >
          <Text
            style={{
              color: vector
                ? index === list.length - 1
                  ? color.orange
                  : color.black
                : index === menuIndex
                ? color.bible
                : color.black,
            }}
            fontFamily={gFontTitle}
            fontSize={13}
          >
            {name}
          </Text>
        </Button>
      ))}
    </HStack>
  );
}

export default memo(bibleReadingList);
