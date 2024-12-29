import type { Schema, Struct } from '@strapi/strapi';

export interface NewcategoryNewComponentTest extends Struct.ComponentSchema {
  collectionName: 'components_newcategory_new_component_tests';
  info: {
    displayName: 'new component test';
    icon: 'alien';
  };
  attributes: {
    isCool: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    newtextfield: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'newcategory.new-component-test': NewcategoryNewComponentTest;
    }
  }
}
