import { View, Pressable, Text, Animated, Dimensions } from 'react-native';
import React from 'react';

interface Props {
    selectedIndex: number;
    onSelectHandler: (selectedIndex: number) => void;
    menus: string[];
}

const Tabs = ({ selectedIndex, onSelectHandler, menus }: Props) => {
    const width = Dimensions.get('window').width / menus.length;
    const animatedValue = React.useRef(
        new Animated.Value(selectedIndex * width)
    ).current;

    React.useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: selectedIndex * width,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [selectedIndex]);

    return (
        <View style={{ flexDirection: 'row', backgroundColor: 'white' }}>
            <Animated.View
                style={{
                    position: 'absolute',
                    left: 0,
                    width: width,
                    borderBottomWidth: 3,
                    borderBottomColor: '#2AC1BC',
                    transform: [{ translateX: animatedValue }],
                    bottom: 0,
                }}
            />
            {menus.map((v, i) => (
                <Pressable
                    style={{
                        flex: 1,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    key={v}
                    onPress={() => {
                        onSelectHandler(i);
                    }}
                >
                    <Text
                        style={{
                            fontFamily: 'Pretendard',
                            fontWeight: '400',
                            fontSize: 16,
                            lineHeight: 20,
                            letterSpacing: 0,
                            textAlign: 'center',
                            color: '#000000',
                            includeFontPadding: false,
                            textAlignVertical: 'center',
                        }}
                    >
                        {v}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
};

export default Tabs;