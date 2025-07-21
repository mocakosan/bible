package com.clsk.media;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import android.os.Bundle;
import android.content.Intent;
import android.content.res.Configuration;

import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
      // react-native-screens 라이브러리 충돌 방지
      // savedInstanceState를 null로 전달하여 Fragment 복원을 방지
      super.onCreate(null);
      SplashScreen.show(this);
  }

  @Override
  protected String getMainComponentName() {
    return "media";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled(), // fabricEnabled
        // If you opted-in for the New Architecture, we enable Concurrent React (i.e. React 18).
        DefaultNewArchitectureEntryPoint.getConcurrentReactEnabled() // concurrentRootEnabled
        );
  }

  /**
   * TrackPlayer와 백그라운드 재생을 위한 추가 설정
   */
  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
  }

  /**
   * 앱이 백그라운드로 이동할 때 처리
   */
  @Override
  protected void onPause() {
    super.onPause();
    // 백그라운드에서 일시적으로 재생 유지
  }

  /**
   * 앱이 포그라운드로 돌아올 때 처리
   */
  @Override
  protected void onResume() {
    super.onResume();
    // 포그라운드 복귀 시 처리
  }

  /**
   * Intent 처리 (딥링크, 미디어 버튼 등)
   */
  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }
}