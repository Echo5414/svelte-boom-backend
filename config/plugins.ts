export default ({ env }) => ({
  upload: {
    config: {
      providerOptions: {
        allowedFormats: ['jpeg', 'png', 'gif', 'svg', 'tiff', 'ico', 'dvu', 'webp'],
      },
    },
  },
});