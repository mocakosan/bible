package com.clsk.media;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

import android.os.Build;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Bundle;
import androidx.core.app.NotificationCompat; // 이미 추가되어 있어야 함

public class MainActivity extends ReactActivity {
  @Override
  protected String getMainComponentName() {
    return "media";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        DefaultNewArchitectureEntryPoint.getFabricEnabled(),
        DefaultNewArchitectureEntryPoint.getConcurrentReactEnabled()
    );
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
        "playback_channel",
        "Media Playback",
        NotificationManager.IMPORTANCE_LOW
      );
      channel.setDescription("Media playback controls");
      channel.setShowBadge(false);
      channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

      NotificationManager notificationManager =
        getSystemService(NotificationManager.class);
      if (notificationManager != null) {
        notificationManager.createNotificationChannel(channel);
      }
    }
  }

  @Override
  protected void onStop() {
    super.onStop();
  }

  @Override
  protected void onDestroy() {
    super.onDestroy();
  }
}
