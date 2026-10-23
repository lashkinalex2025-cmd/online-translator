import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.online.translator',
  appName: 'Онлайн Переводчик',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#2563eb',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: true,
  },
}

export default config
