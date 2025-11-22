import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.579b4e6212394277a4c7d1bec80def7d',
  appName: 'interpreta-sogni',
  webDir: 'dist',
  server: {
    url: 'https://579b4e62-1239-4277-a4c7-d1bec80def7d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
