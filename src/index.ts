// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    console.log('Loading Strapi extensions...');
    
    // Log available plugins and routes
    console.log('Available plugins:', Object.keys(strapi.plugins));
    console.log('Upload routes:', strapi.plugin('upload').routes);
    
    // Update to use new plugin notation
    console.log('Upload plugin config:', strapi.config.get('plugin::upload'));
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {},
};
