class TwitchCollector {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseURL = 'https://api.twitch.tv/helix';
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    // Obter token de acesso (App Access Token)
    async getAccessToken() {
        try {
            if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return this.accessToken;
            }

            console.log('🔐 Obtendo token de acesso Twitch...');
            
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'client_id': this.clientId,
                    'client_secret': this.clientSecret,
                    'grant_type': 'client_credentials'
                })
            });

            if (!response.ok) {
                throw new Error(`Token request failed: ${response.status}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 300000; // -5min buffer
            
            console.log('✅ Token Twitch obtido com sucesso');
            return this.accessToken;
            
        } catch (error) {
            console.error('❌ Erro ao obter token Twitch:', error.message);
            throw error;
        }
    }

    // Headers para requisições
    async getHeaders() {
        const token = await this.getAccessToken();
        return {
            'Client-ID': this.clientId,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // Buscar usuário por login
    async getUserByLogin(username) {
        try {
            console.log(`🔍 Buscando usuário Twitch: ${username}`);
            
            const headers = await this.getHeaders();
            const response = await fetch(
                `${this.baseURL}/users?login=${username}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Twitch API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const user = data.data[0];
                console.log(`✅ Usuário encontrado: ${user.display_name}`);
                return user;
            }
            
            console.log(`❌ Usuário não encontrado: ${username}`);
            return null;
            
        } catch (error) {
            console.error(`❌ Erro ao buscar usuário ${username}:`, error.message);
            return null;
        }
    }

    // Obter informações do canal
    async getChannelInfo(userId) {
        try {
            console.log(`📺 Obtendo info do canal: ${userId}`);
            
            const headers = await this.getHeaders();
            const response = await fetch(
                `${this.baseURL}/channels?broadcaster_id=${userId}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Twitch API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                return data.data[0];
            }
            
            return null;
            
        } catch (error) {
            console.error(`❌ Erro ao obter info do canal:`, error.message);
            return null;
        }
    }

    // Obter seguidores do canal
    async getFollowersCount(userId) {
        try {
            console.log(`👥 Obtendo seguidores: ${userId}`);
            
            const headers = await this.getHeaders();
            const response = await fetch(
                `${this.baseURL}/channels/followers?broadcaster_id=${userId}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Twitch API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.total || 0;
            
        } catch (error) {
            console.error(`❌ Erro ao obter seguidores:`, error.message);
            return 0;
        }
    }

    // Obter vídeos recentes (VODs)
    async getRecentVideos(userId, maxResults = 10) {
        try {
            console.log(`🎥 Buscando VODs recentes: ${userId}`);
            
            const headers = await this.getHeaders();
            const response = await fetch(
                `${this.baseURL}/videos?user_id=${userId}&type=archive&first=${maxResults}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Twitch API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.data || [];
            
        } catch (error) {
            console.error(`❌ Erro ao buscar VODs:`, error.message);
            return [];
        }
    }

    // Analisar títulos e descrições para patrocínios
    detectSponsorship(title, description = '') {
        const gamblingKeywords = [
            'bet365', 'betway', 'rivalry', 'betano', 'stake', 'blaze',
            'hellcase', 'gamdom', 'csgoroll', 'skinclub', 'roobet',
            'código', 'cupom', 'desconto', 'parceria', 'apoio',
            'patrocínio', '!code', '!código'
        ];

        const foundSponsors = [];
        const text = (title + ' ' + description).toLowerCase();
        
        gamblingKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                foundSponsors.push(keyword);
            }
        });

        // Detectar comandos de código (!code, !código)
        const codeCommands = text.match(/![a-z]*cod[a-z]*/gi) || [];
        
        return {
            hasSponsorship: foundSponsors.length > 0 || codeCommands.length > 0,
            sponsors: foundSponsors,
            codeCommands: codeCommands,
            riskLevel: (foundSponsors.length + codeCommands.length) >= 2 ? 'high' : 
                      (foundSponsors.length + codeCommands.length) === 1 ? 'medium' : 'low'
        };
    }

    // Coletar dados completos de um atleta
    async collectAthleteData(athlete) {
        try {
            console.log(`\n🎯 Coletando dados Twitch: ${athlete.name}`);
            
            if (!athlete.twitch_username) {
                console.log(`⏭️ ${athlete.name}: Sem canal Twitch configurado`);
                return null;
            }

            // Buscar usuário
            const user = await this.getUserByLogin(athlete.twitch_username);
            if (!user) {
                console.log(`❌ ${athlete.name}: Usuário não encontrado`);
                return null;
            }

            // Obter informações do canal
            const channelInfo = await this.getChannelInfo(user.id);
            
            // Obter número de seguidores
            const followersCount = await this.getFollowersCount(user.id);
            
            // Buscar VODs recentes
            const recentVideos = await this.getRecentVideos(user.id, 10);
            
            // Analisar patrocínios nos VODs
            const sponsorshipAnalysis = recentVideos.map(video => ({
                videoId: video.id,
                title: video.title,
                description: video.description,
                createdAt: video.created_at,
                viewCount: video.view_count,
                duration: video.duration,
                sponsorship: this.detectSponsorship(video.title, video.description)
            }));

            const hasAnySponsorship = sponsorshipAnalysis.some(v => v.sponsorship.hasSponsorship);
            const totalSponsors = [...new Set(sponsorshipAnalysis.flatMap(v => v.sponsorship.sponsors))];
            
            const result = {
                athlete_id: athlete.name,
                platform: 'twitch',
                user_data: {
                    id: user.id,
                    login: user.login,
                    display_name: user.display_name,
                    description: user.description,
                    profile_image_url: user.profile_image_url,
                    view_count: user.view_count,
                    followers_count: followersCount,
                    created_at: user.created_at
                },
                channel_data: channelInfo,
                recent_videos: sponsorshipAnalysis,
                sponsorship_summary: {
                    has_gambling_sponsors: hasAnySponsorship,
                    sponsors_detected: totalSponsors,
                    risk_level: totalSponsors.length >= 3 ? 'high' : 
                               totalSponsors.length >= 1 ? 'medium' : 'low',
                    videos_with_sponsors: sponsorshipAnalysis.filter(v => v.sponsorship.hasSponsorship).length
                },
                collected_at: new Date().toISOString()
            };

            console.log(`✅ ${athlete.name}: Dados coletados com sucesso`);
            console.log(`👥 Seguidores: ${followersCount.toLocaleString()}`);
            console.log(`🎥 VODs analisados: ${recentVideos.length}`);
            console.log(`⚠️ Patrocínios: ${totalSponsors.join(', ') || 'Nenhum detectado'}`);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erro ao coletar dados de ${athlete.name}:`, error.message);
            return null;
        }
    }

    // Verificar status da API
    async getAPIStatus() {
        try {
            const token = await this.getAccessToken();
            return {
                status: 'active',
                hasValidToken: !!token,
                tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
}

// Exemplo de uso:
async function testTwitchCollector() {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const collector = new TwitchCollector(clientId, clientSecret);
    
    // Testar com FalleN
    const fallenData = await collector.collectAthleteData({
        name: 'FalleN',
        twitch_username: 'fallen'
    });
    
    console.log('Dados coletados:', JSON.stringify(fallenData, null, 2));
    console.log('Status API:', await collector.getAPIStatus());
}

module.exports = TwitchCollector;