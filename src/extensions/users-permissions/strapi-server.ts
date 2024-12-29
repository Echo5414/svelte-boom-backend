import steamProvider from './services/steam';

export default (plugin) => {
  console.log('Configuring user content type...');

  plugin.contentTypes.user.schema.attributes.likedGrenades = {
    type: 'relation',
    relation: 'manyToMany',
    target: 'api::grenade.grenade',
    mappedBy: 'likedBy',
    configurable: true,
    visible: true,
    displayName: 'Liked Grenades',
    private: false
  };

  plugin.contentTypes.user.schema.attributes.grenades = {
    type: 'relation',
    relation: 'oneToMany',
    target: 'api::grenade.grenade',
    mappedBy: 'user',
    configurable: true,
    visible: true,
    displayName: 'Created Grenades',
    private: false
  };

  console.log('User content type configured:', plugin.contentTypes.user.schema.attributes);

  return plugin;
}; 