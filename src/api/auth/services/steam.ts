import fetch from 'node-fetch';

interface SteamProfile {
  username: string;
  email: string;
  steamId: string;
  avatar: string;
}

const steamService = {
  async getProfile(steamId: string): Promise<SteamProfile> {
    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    
    try {
      const response = await fetch(
        `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
      );
      
      const data = await response.json();
      const player = data.response.players[0];
      
      if (!player) {
        throw new Error('Steam profile not found');
      }
      
      return {
        username: player.personaname,
        email: `${steamId}@steam.local`,
        steamId: player.steamid,
        avatar: player.avatarfull
      };
    } catch (error) {
      console.error('Steam API error:', error);
      throw new Error('Error fetching Steam profile');
    }
  }
};

export default steamService; 