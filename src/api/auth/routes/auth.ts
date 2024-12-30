export default {
  routes: [
    {
      method: 'GET',
      path: '/auth/steam/callback',
      handler: 'auth.steamCallback',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 