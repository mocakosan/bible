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

-keep class app.notifee.core.** { *; }
-keep class io.invertase.notifee.** { *; }
-dontwarn app.notifee.core.**
-dontwarn io.invertase.notifee.**

-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn io.invertase.firebase.**
-dontwarn com.google.android.gms.**

-keep class io.invertase.firebase.messaging.** { *; }
-keep class io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService { *; }

-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

-keep class com.doublesymmetry.trackplayer.** { *; }
-keep interface com.doublesymmetry.trackplayer.** { *; }
-dontwarn com.doublesymmetry.trackplayer.**

-keep class androidx.media.** { *; }
-keep class androidx.media3.** { *; }
-dontwarn androidx.media.**
-dontwarn androidx.media3.**

-keep class com.swmansion.rnscreens.** { *; }
-keep class androidx.fragment.** { *; }
-dontwarn com.swmansion.rnscreens.**

-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**

-keep class android.support.v4.media.** { *; }
-keep class androidx.media.session.** { *; }
-dontwarn android.support.v4.media.**
-dontwarn androidx.media.session.**

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

-keep class com.buzzvil.** { *; }
-dontwarn com.buzzvil.**

-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

-keep class kotlin.** { *; }
-dontwarn kotlin.**

-keep class * extends android.app.Service { *; }
-keep class * extends android.content.BroadcastReceiver { *; }
-keep class * extends android.app.Activity { *; }

-keep class * extends androidx.core.app.NotificationCompat.** { *; }
-keep class androidx.core.app.** { *; }
-dontwarn androidx.core.app.**

-keep class androidx.** { *; }
-dontwarn androidx.**

-keepclassmembers class * {
    @com.fasterxml.jackson.annotation.JsonProperty <fields>;
}

-keepclassmembers class * {
    public <init>(...);
}

-keepclasseswithmembernames class * {
    native <methods>;
}

-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}