# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# 기존 광고 SDK 설정
-keep class com.adforus.sdk.greenp.v3.** { *; }
-dontwarn com.adforus.sdk.greenp.v3.**

-keep class com.adforus.sdk.adsu.** {*;}
-dontwarn com.adforus.sdk.adsu.**

-keep public class com.navercorp.nid.** { *; }

-keep class com.tnkfactory.** { *;}

# TrackPlayer 관련 설정 추가
-keep class com.doublesymmetry.trackplayer.** { *; }
-keep interface com.doublesymmetry.trackplayer.** { *; }
-dontwarn com.doublesymmetry.trackplayer.**

# Android Media 관련 설정
-keep class androidx.media.** { *; }
-keep class androidx.media3.** { *; }
-dontwarn androidx.media.**
-dontwarn androidx.media3.**

# React Native Screens 관련 설정
-keep class com.swmansion.rnscreens.** { *; }
-keep class androidx.fragment.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ExoPlayer 관련 설정 (TrackPlayer가 사용)
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**

# 미디어 세션 관련
-keep class android.support.v4.media.** { *; }
-keep class androidx.media.session.** { *; }
-dontwarn android.support.v4.media.**
-dontwarn androidx.media.session.**

# React Native 관련 설정
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# 버즈빌 SDK 설정
-keep class com.buzzvil.** { *; }
-dontwarn com.buzzvil.**

# 일반적인 Android 설정
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Kotlin 관련
-keep class kotlin.** { *; }
-dontwarn kotlin.**

# 서비스 관련 설정 유지
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver

# 알림 관련 설정
-keep class * extends androidx.core.app.NotificationCompat.** { *; }

# JSON 직렬화를 위한 설정 (필요한 경우)
-keepclassmembers class * {
    @com.fasterxml.jackson.annotation.JsonProperty <fields>;
}

# 리플렉션 사용하는 클래스들 보호
-keepclassmembers class * {
    public <init>(...);
}