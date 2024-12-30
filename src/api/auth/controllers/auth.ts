export default {
  async steamCallback(ctx) {
    try {
      // Get steamId from the OpenID response
      const steamId = ctx.query['openid.claimed_id']?.split('/').pop();
      
      if (!steamId) {
        throw new Error('Steam ID not found in response');
      }

      // Get Steam profile using the service
      const steamService = strapi.service('api::auth.steam');
      if (!steamService) {
        throw new Error('Steam service not found');
      }

      const steamProfile = await steamService.getProfile(steamId);

      // Find existing user
      let user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { steamId: steamProfile.steamId }
      });

      if (!user) {
        // Get authenticated role
        const role = await strapi
          .query('plugin::users-permissions.role')
          .findOne({ where: { type: 'authenticated' } });

        if (!role) {
          throw new Error('Authenticated role not found');
        }

        // Create new user
        user = await strapi.db.query('plugin::users-permissions.user').create({
          data: {
            username: steamProfile.username,
            email: steamProfile.email,
            steamId: steamProfile.steamId,
            avatar: steamProfile.avatar,
            provider: 'steam',
            confirmed: true,
            blocked: false,
            role: role.id
          }
        });
      }

      // Generate JWT
      const jwt = strapi.plugins['users-permissions'].services.jwt.issue({
        id: user.id,
      });

      // Return user data and token
      return ctx.send({
        jwt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          steamId: user.steamId,
          avatar: user.avatar,
          provider: user.provider
        }
      });

    } catch (error) {
      console.error('Steam auth error:', error);
      ctx.throw(400, error instanceof Error ? error.message : 'Steam authentication failed');
    }
  },
}; 