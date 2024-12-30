export default ({ env }) => ({
  upload: {
    config: {
      providerOptions: {
        allowedFormats: ['jpeg', 'png', 'gif', 'svg', 'tiff', 'ico', 'dvu', 'webp'],
      },
    },
  },
  'users-permissions': {
    config: {
      providers: {
        steam: {
          enabled: true,
          icon: 'steam',
          key: env('STEAM_API_KEY'),
        },
      },
    },
  },
});