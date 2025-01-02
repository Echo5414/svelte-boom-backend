export default ({ env }) => ({
  upload: {
    config: {
      provider: 'local',
      sizeLimit: 250 * 1024 * 1024,
      providerOptions: {
      },
      breakpoints: {
        thumbnail: { width: 245, height: 156 },
        small: { width: 500 },
        medium: { width: 750 },
        large: { width: 1000 }
      },
      folderStructure: {
        api: '/uploads-api',
        default: '/uploads'
      },
      settings: {
        imageProcessing: {
          outputOptions: {
            default: {
              outputFormat: 'webp', // Output format for all images
              responsiveFormats: true, // Generate responsive formats
              settings: {
                quality: 80,
                webp: {
                  lossless: false,
                  effort: 4
                },
                png: {
                  compressionLevel: 9,
                  palette: true
                }
              }
            },
            exceptions: {
              'svg+xml': ['disableProcessing', 'disableResponsive'], // Always skip processing and responsive formats for SVGs
              'gif': ['disableProcessing', 'disableProcessingResponsive'], // Skip processing but preserve original for responsive
              'jpeg': ['disableProcessingResponsive'] // Same as jpg
            }
          }
        }
      }
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