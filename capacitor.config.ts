import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.manhole.inspection',
  appName: 'マンホールポンプ点検',
  webDir: '.',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;