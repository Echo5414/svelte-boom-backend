export default {
  async steamCallback(ctx) {
    const { steamId } = ctx.request.body;
    console.log('Steam callback received with ID:', steamId);

    try {
      // Direkt den Steam-Auth-Flow im Controller implementieren
      const steamProfile = await strapi
        .plugin('users-permissions')
        .service('providers')
        .connect('steam', ctx.query);

      // Check if user exists
      let user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { steamId: steamId.toString() }
      });

      if (!user) {
        // Create new user
        user = await strapi.query('plugin::users-permissions.user').create({
          data: {
            username: steamProfile.username || `user_${steamId}`,
            email: `${steamId}@steam.local`,
            steamId: steamId.toString(),
            provider: 'steam',
            confirmed: true,
            blocked: false,
            role: 1 // authenticated role
          }
        });
      }

      // Generate JWT token
      const jwt = strapi.plugin('users-permissions').service('jwt').issue({
        id: user.id,
      });

      // Return user and jwt
      return ctx.send({
        jwt,
        user: user
      });

    } catch (error) {
      console.error('Steam auth error:', error);
      ctx.throw(400, error);
    }
  },
}; 