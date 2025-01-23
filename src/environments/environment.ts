export const environment = {
  production: false,
  // Personal note: Keep API keys secure and out of version control
  newsApiKey: process.env['NG_APP_NEWS_API_KEY'] || '',
  firebase: JSON.parse(process.env['NG_APP_FIREBASE_CONFIG'] || '{}')
};
