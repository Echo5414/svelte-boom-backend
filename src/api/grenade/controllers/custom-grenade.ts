import { factories } from '@strapi/strapi';
import { Context } from 'koa';

interface User {
  id: number;
  username: string;
}

interface GrenadeEntity {
  id: number;
  likes?: number;
  likedBy?: User[];
  publishedAt?: string;
}

export default factories.createCoreController('api::grenade.grenade', ({ strapi }) => ({
  async likeGrenade(ctx: Context) {
    const { documentId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to like grenades');
    }

    try {
      const existingGrenade = await strapi.db.query('api::grenade.grenade').findOne({
        where: { documentId },
        populate: ['likedBy'],
      }) as GrenadeEntity;

      if (!existingGrenade) {
        return ctx.notFound('Grenade not found');
      }

      const likedByUsers = existingGrenade.likedBy || [];
      const alreadyLiked = likedByUsers.some(u => u.id === user.id);

      if (alreadyLiked) {
        return ctx.badRequest('You have already liked this grenade');
      }

      const updatedLikedBy = [
        ...likedByUsers.map(u => ({ id: u.id })),
        { id: user.id }
      ];

      const updatedGrenade = await strapi.documents('api::grenade.grenade').update({
        documentId: documentId,
        data: {
          likes: (existingGrenade.likes || 0) + 1,
          likedBy: updatedLikedBy,
        },
        populate: ['likedBy'],
        status: 'published'
      }) as GrenadeEntity;

      return {
        data: {
          documentId: documentId,
          likes: updatedGrenade.likes,
          likedBy: updatedGrenade.likedBy || []
        }
      };

    } catch (error) {
      console.error('Error in likeGrenade:', error);
      return ctx.internalServerError('An error occurred while liking the grenade');
    }
  },

  async unlikeGrenade(ctx: Context) {
    const { documentId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to unlike grenades');
    }

    try {
      const existingGrenade = await strapi.db.query('api::grenade.grenade').findOne({
        where: { documentId },
        populate: ['likedBy'],
      }) as GrenadeEntity;

      if (!existingGrenade) {
        return ctx.notFound('Grenade not found');
      }

      const likedByUsers = existingGrenade.likedBy || [];
      const hasLiked = likedByUsers.some(u => u.id === user.id);

      if (!hasLiked) {
        return ctx.badRequest('You have not liked this grenade');
      }

      const updatedLikedBy = likedByUsers
        .filter(u => u.id !== user.id)
        .map(u => ({ id: u.id }));

      const updatedGrenade = await strapi.documents('api::grenade.grenade').update({
        documentId: documentId,
        data: {
          likes: Math.max((existingGrenade.likes || 0) - 1, 0),
          likedBy: updatedLikedBy,
        },
        populate: ['likedBy'],
        status: 'published'
      }) as GrenadeEntity;

      return { 
        data: {
          documentId: documentId,
          likes: updatedGrenade.likes,
          likedBy: updatedGrenade.likedBy || []
        }
      };

    } catch (error) {
      console.error('Error in unlikeGrenade:', error);
      return ctx.internalServerError('An error occurred while unliking the grenade');
    }
  }
}));
