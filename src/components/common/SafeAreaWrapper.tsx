import React from 'react';
import { View, ScrollView, ViewStyle, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle;
    disableTop?: boolean;
    disableBottom?: boolean;
    customBottomPadding?: number;
}

// 일반 View를 위한 SafeArea 래퍼
export const SafeAreaView: React.FC<SafeAreaWrapperProps> = ({
                                                                 children,
                                                                 style,
                                                                 disableTop = false,
                                                                 disableBottom = false,
                                                                 customBottomPadding = 0,
                                                             }) => {
    const insets = useSafeAreaInsets();

    const safeAreaStyle: ViewStyle = {
        flex: 1,
        paddingTop: disableTop ? 0 : insets.top,
        paddingBottom: disableBottom ? customBottomPadding : (insets.bottom + customBottomPadding),
    };

    return (
        <View style={[safeAreaStyle, style]}>
            {children}
        </View>
    );
};

// ScrollView를 위한 SafeArea 래퍼
export const SafeAreaScrollView: React.FC<SafeAreaWrapperProps & {
    scrollViewProps?: any;
}> = ({
          children,
          style,
          disableTop = false,
          disableBottom = false,
          customBottomPadding = 0,
          scrollViewProps = {},
      }) => {
    const insets = useSafeAreaInsets();

    const contentContainerStyle = {
        paddingTop: disableTop ? 0 : insets.top,
        paddingBottom: disableBottom ? customBottomPadding : (insets.bottom + customBottomPadding),
        flexGrow: 1,
    };

    return (
        <ScrollView
            {...scrollViewProps}
            contentContainerStyle={[contentContainerStyle, scrollViewProps.contentContainerStyle]}
            style={[{ flex: 1 }, style]}
        >
            {children}
        </ScrollView>
    );
};

// 하단 고정 버튼을 위한 SafeArea 래퍼
export const SafeAreaBottomButton: React.FC<{
    children: React.ReactNode;
    style?: ViewStyle;
}> = ({ children, style }) => {
    const insets = useSafeAreaInsets();

    // Android targetSdk 35 대응
    const bottomPadding = Platform.select({
        ios: insets.bottom,
        android: insets.bottom > 0 ? insets.bottom : 0,
        default: 0,
    });

    return (
        <View style={[{ paddingBottom: bottomPadding }, style]}>
            {children}
        </View>
    );
};

// FlatList용 SafeArea 패딩값 계산 유틸
export const useSafeAreaPadding = (options?: {
    disableTop?: boolean;
    disableBottom?: boolean;
    customBottomPadding?: number;
}) => {
    const insets = useSafeAreaInsets();
    const {
        disableTop = false,
        disableBottom = false,
        customBottomPadding = 0,
    } = options || {};

    return {
        paddingTop: disableTop ? 0 : insets.top,
        paddingBottom: disableBottom ? customBottomPadding : (insets.bottom + customBottomPadding),
        insets,
    };
};