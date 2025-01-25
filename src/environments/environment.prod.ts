// Fallback configuration
const defaultNewsApiKey = safeParseEnv(
  typeof process !== 'undefined' ? process.env['NG_APP_NEWS_API_KEY'] : undefined, 
  ''
);
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDh3NvhzWcHRhlfHrYIQreIKK6vXjgiS8Q",
  authDomain: "newsangularapp.firebaseapp.com",
  projectId: "newsangularapp",
  storageBucket: "newsangularapp.firebasestorage.app",
  messagingSenderId: "823520124714",
  appId: "1:823520124714:web:486c488aab226cccac4853",
  measurementId: "G-DSNEZQ3FLK"
};

// Safe environment variable parsing
function safeParseEnv(envVar: string | undefined, defaultValue: string): string {
  return envVar || defaultValue;
}

function safeParseFirebaseConfig(envConfig: string | undefined): any {
  try {
    return envConfig ? JSON.parse(envConfig) : defaultFirebaseConfig;
  } catch {
    console.warn('Invalid Firebase configuration, using default');
    return defaultFirebaseConfig;
  }
}

export const environment = {
  production: true,
  newsApiKey: defaultNewsApiKey,
  firebase: defaultFirebaseConfig
};
