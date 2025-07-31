// src/components/navigator/navigator.tsx 수정

import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  CardStyleInterpolators,
  createStackNavigator
} from '@react-navigation/stack';
import React from 'react';
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
            // 전체 드로어 화면에서 가로 모드 허용
            orientation: 'all' // 모든 방향 허용
          }}
      >
        <Drawer.Screen
            name="HomeScreen"
            component={route[0].component}
        />
        <Drawer.Screen
            name="CommonScreen"
            component={route[9].component}
        />
      </Drawer.Navigator>
  );
};

export const AppNavigator = () => {
  const Stack = createStackNavigator();

  return (
      <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#fff' },
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            // 기본적으로 모든 화면에서 가로 모드 허용
            orientation: 'all'
          }}
      >
        <Stack.Screen
            name="DrawerScreens"
            component={DrawerNavigator}
            options={{
              orientation: 'all' // 드로어 네비게이터에서 가로 모드 허용
            }}
        />

        {/* 마이페이지 스크린 - 가로 모드 허용 */}
        <Stack.Screen
            name="MyPageScreen"
            component={MyPageScreen}
            options={{
              orientation: 'all'
            }}
        />

        {/* 기존 route 기반의 스크린들 */}
        <Stack.Screen
            name="HomeScreen"
            component={route[0].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="BibleScreen"
            component={route[1].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="BibleConectionScreen"
            component={route[2].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="PhotoDetailScreen"
            component={route[3].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="ChapterScreen"
            component={route[4].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="SettingScreen"
            component={route[5].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="HymnScreen"
            component={route[6].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="BibleStudyScreen"
            component={route[7].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="WordScreen"
            component={route[8].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="CommonScreen"
            component={route[9].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="ReadingBibleScreen"
            component={route[10].component}
            options={{
              orientation: 'all'
            }}
        />
        <Stack.Screen
            name="ProgressScreen"
            component={route[11].component}
            options={{
              header: () => <HeaderBackButton />,
              headerShown: false,
              orientation: 'all'
            }}
        />
        {/* 나머지 스크린들도 동일하게 orientation: 'all' 추가 */}
        <Stack.Screen
            name="MenuListScreen"
            component={route[12].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="MenuDetailScreen"
            component={route[13].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="PreferencesScreen"
            component={route[14].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="ManualScreen"
            component={route[15].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="TranslateScreen"
            component={route[16].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="AssociateScreen"
            component={route[17].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="SupportScreen"
            component={route[18].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="VersionInfoScreen"
            component={route[19].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="BookMarkScreen"
            component={route[20].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="LightPenScreen"
            component={route[21].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="MalSumNoteScreen"
            component={route[22].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="MalSumNoteDetailScreen"
            component={route[23].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="BookMarkDetailScreen"
            component={route[24].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="LightPenDetailScreen"
            component={route[25].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="NoteScreen"
            component={route[26].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="CopyRightScreen"
            component={route[27].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="ChapterScreen2"
            component={route[28].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="HomeFocusScreen"
            component={route[29].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="IllDocSettingScreen"
            component={route[30].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="IllDocTranslateScreen"
            component={route[31].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="InquiryScreen"
            component={route[32].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="NewsScreen"
            component={route[33].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="KakaoScreen"
            component={route[34].component}
            options={{ orientation: 'all' }}
        />
        <Stack.Screen
            name="PointHistoryScreen"
            component={route[35].component}
            options={{ orientation: 'all' }}
        />
      </Stack.Navigator>
  );
};