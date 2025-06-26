import { HStack } from "native-base";
import { useBaseStyle } from "../../../hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { Text } from "react-native";
import { TextInput, TouchableOpacity } from "react-native";

interface Props {
  placeholder: string;
  onPress: (
    data: string,
    setInputValue: Dispatch<SetStateAction<string>>
  ) => void;
}

export default function SearchBar({ placeholder, onPress }: Props) {
  const { color } = useBaseStyle();
  const [inputValue, setInputValue] = useState("");

  return (
    <HStack
      borderStyle={"solid"}
      borderWidth={"2"}
      borderColor={color.bible}
      borderRadius={17}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <TextInput
        placeholder={placeholder}
        style={{
          height: 40,
          width: "85%",
          borderWidth: 0,
          fontSize: 15,
          color: "black",
          paddingLeft: 15,
        }}
        value={inputValue}
        onChangeText={(pre) => setInputValue(pre)}
        onSubmitEditing={() => onPress(inputValue, setInputValue)}
      />
      <TouchableOpacity
        style={{
          width: "10%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 15,
        }}
        onPress={() => onPress(inputValue, setInputValue)}
      >
        <Text
          style={{
            color: color.bible,
            fontWeight: "700",
            fontSize: 17,
            alignItems: "center",
            textAlign: "center",
            justifyContent: "center",
          }}
        >
          {"검색"}
        </Text>
      </TouchableOpacity>
    </HStack>
  );
}
