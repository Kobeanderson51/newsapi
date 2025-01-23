import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { provideAnalytics, getAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { provideHttpClient } from '@angular/common/http';

// Function to get Firebase config from environment or runtime
function getFirebaseConfig() {
  // Check for runtime environment variables
  const runtimeConfig = {
    apiKey: (window as any).NG_APP_FIREBASE_CONFIG_API_KEY || environment.firebase.apiKey,
    authDomain: (window as any).NG_APP_FIREBASE_CONFIG_AUTH_DOMAIN || environment.firebase.authDomain,
    projectId: (window as any).NG_APP_FIREBASE_CONFIG_PROJECT_ID || environment.firebase.projectId,
    storageBucket: (window as any).NG_APP_FIREBASE_CONFIG_STORAGE_BUCKET || environment.firebase.storageBucket,
    messagingSenderId: (window as any).NG_APP_FIREBASE_CONFIG_MESSAGING_SENDER_ID || environment.firebase.messagingSenderId,
    appId: (window as any).NG_APP_FIREBASE_CONFIG_APP_ID || environment.firebase.appId,
    measurementId: (window as any).NG_APP_FIREBASE_CONFIG_MEASUREMENT_ID || environment.firebase.measurementId
  };

  console.log('Firebase Config:', runtimeConfig);
  return runtimeConfig;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideFirebaseApp(() => {
      try {
        const config = getFirebaseConfig();
        return initializeApp(config);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        throw error;
      }
    }),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    provideHttpClient(),
    ScreenTrackingService,
    UserTrackingService
  ]
};
