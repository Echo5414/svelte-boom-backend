export default {
  async register({ strapi }) {
    // Register the Steam provider
    strapi.plugins['users-permissions'].services.providers.register({
      steam: require('../extensions/users-permissions/services/steam').default(strapi)
    });
  }
}; 