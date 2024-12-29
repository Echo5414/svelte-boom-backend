export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/steam/callback',
      handler: 'auth.steamCallback',
      config: {
        auth: false,
      },
    },
  ],
}; 