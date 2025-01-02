export default [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'http:', 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'http:', 'https:', 'https://steamcommunity.com', 'https://avatars.steamstatic.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'http:', 'https:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: [
        process.env.FRONTEND_URL,
        'https://steamcommunity.com',
        process.env.BACKEND_URL
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'Cookie',
        'Set-Cookie',
        'Range'
      ],
      expose: [
        'WWW-Authenticate',
        'Server-Authorization',
        'Set-Cookie',
        'Content-Range',
        'Accept-Ranges'
      ],
    },
  },
  {
    name: 'strapi::body',
    config: {
      formLimit: '256mb',
      jsonLimit: '10mb',
      textLimit: '10mb',
      formidable: {
        maxFileSize: 250 * 1024 * 1024,
      },
      onError: (err, ctx) => {
        // List of expected streaming-related errors that we can safely ignore
        const expectedErrors = [
          'ECONNRESET',
          'ECANCELED',
          'ECONNABORTED',
          'ERR_STREAM_DESTROYED'
        ];

        if (err.code && expectedErrors.includes(err.code)) {
          // Log at debug level since these are expected behaviors
          strapi.log.debug(`Expected streaming error (${err.code}): Client disconnected`);
          return;
        }

        // For unexpected errors, log as usual
        strapi.log.error('Unexpected error:', err);
      },
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  {
    name: 'strapi::query',
    config: {
      streaming: {
        enabled: true,
        maxRate: '50mb',
        chunkSize: 1024 * 1024,
        // Add error handling for streaming
        onError: (err, ctx) => {
          const expectedErrors = [
            'ECONNRESET',
            'ECANCELED',
            'ECONNABORTED',
            'ERR_STREAM_DESTROYED'
          ];

          if (err.code && expectedErrors.includes(err.code)) {
            strapi.log.debug(`Streaming interrupted (${err.code})`);
            return;
          }
          
          strapi.log.error('Streaming error:', err);
        }
      }
    }
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];