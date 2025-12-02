import { ImageBackground, Text, useWindowDimensions } from 'react-native';
import { ProgressBar } from 'react-native-paper';

type AppCodePushUpdateScreenProps = {
  syncProgress: number;
  appVersion: string;
};

export const AppCodePushUpdateScreen = ({
  syncProgress
}: // appVersion,
AppCodePushUpdateScreenProps) => {
  const { width: deviceWidth } = useWindowDimensions();

  const isCheckingUpdate = syncProgress === 0;

  return (
    <ImageBackground
      style={{
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: deviceWidth,
        paddingHorizontal: 20,
        paddingBottom: 20
      }}
      source={require('./codePushUpdate.png')}
    >
      <Text style={{ fontSize: 14, opacity: isCheckingUpdate ? 0 : 1 }}>
        업데이트를 진행합니다.
      </Text>
      <ProgressBar
        color="#2AC1BC"
        progress={syncProgress}
        style={{
          marginTop: 8,
          height: 8,
          borderRadius: 4,
          width: deviceWidth - 40,
          backgroundColor: '#d8d8d8',
          opacity: isCheckingUpdate ? 0 : 1
        }}
      />
      <Text
        style={{
          fontSize: 10,
          alignSelf: 'flex-end',
          opacity: isCheckingUpdate ? 0 : 1
        }}
      >
        {/* v.{appVersion} */}
      </Text>
    </ImageBackground>
  );
};
