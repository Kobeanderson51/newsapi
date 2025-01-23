export const environment = {
  production: false,
  newsApiKey: process.env['NG_APP_NEWS_API_KEY'] || '',
  firebase: process.env['NG_APP_FIREBASE_CONFIG'] 
    ? JSON.parse(process.env['NG_APP_FIREBASE_CONFIG']) 
    : {
      apiKey: "AIzaSyDh3NvhzWcHRhlfHrYIQreIKK6vXjgiS8Q",
      authDomain: "newsangularapp.firebaseapp.com",
      projectId: "newsangularapp",
      storageBucket: "newsangularapp.firebasestorage.app",
      messagingSenderId: "823520124714",
      appId: "1:823520124714:web:486c488aab226cccac4853",
      measurementId: "G-DSNEZQ3FLK"
    }
};
