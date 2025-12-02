import { createDrawerNavigator } from '@react-navigation/drawer';
import {
    CardStyleInterpolators,
    createStackNavigator
} from '@react-navigation/stack';
import React from 'react';
import { Platform } from 'react-native';
import { route } from '../../utils';
import DrawerLayout from '../layout/drawer/drawer';
import HomeHeaderLayout from '../layout/header/homeHeader';
import HeaderBackButton from '../section/headerBackButton';
import MyPageScreen from "../page/mypage";

const DrawerNavigator = () => {
    const Drawer = createDrawerNavigator();
    return (
        <Drawer.Navigator
            initialRouteName="HomeScreen"
            backBehavior="history"
            drawerContent={(props) => DrawerLayout({ props })}
            screenOptions={{
                header: () => {
                    return <HomeHeaderLayout />;
                },
                drawerType: 'front',
                swipeEnabled: false,
                orientation: 'all'
            }}
        >
            <Drawer.Screen
                name="HomeScreen"
                component={route[0].component}
            />
            <Drawer.Screen
                name="CommonScreen"
                component={route[11].component}
            />
        </Drawer.Navigator>
    );
};

export const AppNavigator = () => {
    const Stack = createStackNavigator();

    const commonScreenOptions = {
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        orientation: 'all',
        ...(Platform.OS === 'android' && {
            navigationBarHidden: false,
            navigationBarColor: '#FFFFFF',
            statusBarTranslucent: false,
            autoHideHomeIndicator: false,
        })
    };

    return (
        <Stack.Navigator
            screenOptions={commonScreenOptions}
        >
            <Stack.Screen
                name="DrawerScreens"
                component={DrawerNavigator}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />

            <Stack.Screen
                name="MyPageScreen"
                component={MyPageScreen}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />

            <Stack.Screen
                name="HomeScreen"
                component={route[0].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="BibleScreen"
                component={route[1].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="BibleConectionScreen"
                component={route[2].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="PhotoDetailScreen"
                component={route[3].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="ChapterScreen"
                component={route[4].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="SettingScreen"
                component={route[5].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />

            {/* 찬송가 관련 스크린 */}
            <Stack.Screen
                name="HymnScreen"
                component={route[6].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="HymnDetailScreen"
                component={route[7].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="HymnDocScreen"
                component={route[8].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            {/* 교독문 상세 화면 추가 */}
            <Stack.Screen
                name="GyodokDetailScreen"
                component={route[38].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="BibleStudyScreen"
                component={route[9].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="WordScreen"
                component={route[10].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="CommonScreen"
                component={route[11].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="ReadingBibleScreen"
                component={route[12].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="ProgressScreen"
                component={route[13].component}
                options={{
                    header: () => <HeaderBackButton />,
                    headerShown: false,
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="MenuListScreen"
                component={route[14].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="MenuDetailScreen"
                component={route[15].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="PreferencesScreen"
                component={route[16].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="ManualScreen"
                component={route[17].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="TranslateScreen"
                component={route[18].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="AssociateScreen"
                component={route[19].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="SupportScreen"
                component={route[20].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="VersionInfoScreen"
                component={route[21].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="BookMarkScreen"
                component={route[22].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="LightPenScreen"
                component={route[23].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="MalSumNoteScreen"
                component={route[24].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="MalSumNoteDetailScreen"
                component={route[25].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="BookMarkDetailScreen"
                component={route[26].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="LightPenDetailScreen"
                component={route[27].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="NoteScreen"
                component={route[28].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="CopyRightScreen"
                component={route[29].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="ChapterScreen2"
                component={route[30].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="HomeFocusScreen"
                component={route[31].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="IllDocSettingScreen"
                component={route[32].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="IllDocTranslateScreen"
                component={route[33].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="InquiryScreen"
                component={route[34].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="NewsScreen"
                component={route[35].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="KakaoScreen"
                component={route[36].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />
            <Stack.Screen
                name="PointHistoryScreen"
                component={route[37].component}
                options={{
                    orientation: 'all',
                    navigationBarHidden: false
                }}
            />

        </Stack.Navigator>
    );
};