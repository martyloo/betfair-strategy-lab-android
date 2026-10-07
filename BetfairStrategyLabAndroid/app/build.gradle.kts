plugins { id("com.android.application") }

android {
    namespace = "com.nardelligaming.betfairstrategylab"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.nardelligaming.betfairstrategylab"
        minSdk = 24
        targetSdk = 36
        versionCode = 2
        versionName = "1.1.0"
    }

    signingConfigs {
        create("release") {
            val ks = System.getenv("KEYSTORE_FILE")
            if (!ks.isNullOrBlank()) storeFile = file(ks)
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = System.getenv("KEY_ALIAS")
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}


dependencies {
    implementation("com.android.billingclient:billing:9.1.0")
}
