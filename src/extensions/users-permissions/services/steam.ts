interface SteamResponse {
  response: {
    players: Array<{
      steamid: string;
      personaname: string;
      avatarfull: string;
    }>;
  };
}

interface SteamProfile {
  username: string;
  email: string;
  steamId: string;
  avatar: string;
}

export default ({ strapi }: any) => ({
  async getProfile(steamId: string): Promise<SteamProfile> {
    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    
    try {
      const response = await fetch(
        `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
      );
      
      const responseData = await response.json();
      if (!responseData || typeof responseData !== 'object' || !('response' in responseData)) {
        throw new Error('Invalid Steam API response format');
      }

      const data = responseData as SteamResponse;
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
}); 