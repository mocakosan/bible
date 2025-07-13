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
            swipeEnabled: false
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
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS
          }}
      >
        <Stack.Screen
            name="DrawerScreens"
            component={DrawerNavigator}
        />

        {/* 마이페이지 스크린 직접 등록 */}
        <Stack.Screen
            name="MyPageScreen"
            component={MyPageScreen}
        />

        {/* 기존 route 기반의 스크린들 */}
        <Stack.Screen
            name="HomeScreen"
            component={route[0].component}
        />
        <Stack.Screen
            name="BibleScreen"
            component={route[1].component}
        />
        <Stack.Screen
            name="BibleConectionScreen"
            component={route[2].component}
        />
        <Stack.Screen
            name="PhotoDetailScreen"
            component={route[3].component}
        />
        <Stack.Screen
            name="ChapterScreen"
            component={route[4].component}
        />
        <Stack.Screen
            name="SettingScreen"
            component={route[5].component}
        />
        <Stack.Screen
            name="HymnScreen"
            component={route[6].component}
        />
        <Stack.Screen
            name="BibleStudyScreen"
            component={route[7].component}
        />
        <Stack.Screen
            name="WordScreen"
            component={route[8].component}
        />
        <Stack.Screen
            name="CommonScreen"
            component={route[9].component}
        />
        <Stack.Screen
            name="ReadingBibleScreen"
            component={route[10].component}
        />
        <Stack.Screen
            name="ProgressScreen"
            component={route[11].component}
            options={{
              header: () => <HeaderBackButton />,
              headerShown: false
            }}
        />
        <Stack.Screen
            name="MenuListScreen"
            component={route[12].component}
        />
        <Stack.Screen
            name="MenuDetailScreen"
            component={route[13].component}
        />
        <Stack.Screen
            name="PreferencesScreen"
            component={route[14].component}
        />
        <Stack.Screen
            name="ManualScreen"
            component={route[15].component}
        />
        <Stack.Screen
            name="TranslateScreen"
            component={route[16].component}
        />
        <Stack.Screen
            name="AssociateScreen"
            component={route[17].component}
        />
        <Stack.Screen
            name="SupportScreen"
            component={route[18].component}
        />
        <Stack.Screen
            name="VersionInfoScreen"
            component={route[19].component}
        />
        <Stack.Screen
            name="BookMarkScreen"
            component={route[20].component}
        />
        <Stack.Screen
            name="LightPenScreen"
            component={route[21].component}
        />
        <Stack.Screen
            name="MalSumNoteScreen"
            component={route[22].component}
        />
        <Stack.Screen
            name="MalSumNoteDetailScreen"
            component={route[23].component}
        />
        <Stack.Screen
            name="BookMarkDetailScreen"
            component={route[24].component}
        />
        <Stack.Screen
            name="LightPenDetailScreen"
            component={route[25].component}
        />
        <Stack.Screen
            name="NoteScreen"
            component={route[26].component}
        />
        <Stack.Screen
            name="CopyRightScreen"
            component={route[27].component}
        />
        <Stack.Screen
            name="ChapterScreen2"
            component={route[28].component}
        />
        <Stack.Screen
            name="HomeFocusScreen"
            component={route[29].component}
        />
        <Stack.Screen
            name="IllDocSettingScreen"
            component={route[30].component}
        />
        <Stack.Screen
            name="IllDocTranslateScreen"
            component={route[31].component}
        />
        <Stack.Screen
            name="InquiryScreen"
            component={route[32].component}
        />
        <Stack.Screen
            name="NewsScreen"
            component={route[33].component}
        />
        <Stack.Screen
            name="KakaoScreen"
            component={route[34].component}
        />
        <Stack.Screen
            name="PointHistoryScreen"
            component={route[35].component}
        />
      </Stack.Navigator>
  );
};