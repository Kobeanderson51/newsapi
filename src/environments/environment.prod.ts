export const environment = {
  production: true,
  newsApiKey: process.env['NG_APP_NEWS_API_KEY'] || '',
  firebase: JSON.parse(process.env['NG_APP_FIREBASE_CONFIG'] || '{}')
};
