# ProGuard / R8 Rules for IdleStream Android

# Preserve all IdleStream app classes, methods, and companion objects
-keep class com.idlestream.app.** {
    *;
}
-keepclassmembers class com.idlestream.app.** {
    *;
}

# Preserve all native methods across the application
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve JavascriptInterfaces for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Explicitly preserve JNI bridge classes and methods invoked by Rust
-keep class com.idlestream.app.KickHttpBridge {
    public static *;
}
-keepclassmembers class com.idlestream.app.KickHttpBridge {
    public static *;
}

-keep class com.idlestream.app.MainActivity$WebAppInterface {
    public *;
}
-keepclassmembers class com.idlestream.app.MainActivity$WebAppInterface {
    public *;
}

# Preserve line numbers and annotations for debugging
-keepattributes SourceFile,LineNumberTable,*Annotation*,JavascriptInterface
