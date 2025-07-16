class YouTubeCollector {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
        this.dailyQuotaUsed = 0;
        this.maxDailyQuota = 10000;
    }

    // Buscar canal por nome de usuário
    async findChannelByUsername(username) {
        try {
            console.log(`🔍 Buscando canal: ${username}`);
            
            // Primeira tentativa: busca direta
            const searchResponse = await fetch(
                `${this.baseURL}/search?` +
                `key=${this.apiKey}&` +
                `q=${encodeURIComponent(username)}&` +
                `type=channel&` +
                `part=snippet&` +
                `maxResults=5`
            );

            this.dailyQuotaUsed += 100; // Busca = 100 unidades
            
            if (!searchResponse.ok) {
                throw new Error(`YouTube API Error: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            
            if (searchData.items && searchData.items.length > 0) {
                // Encontrou canais, pegar o mais relevante
                const channel = searchData.items[0];
                console.log(`✅ Canal encontrado: ${channel.snippet.title}`);
                
                return {
                    channelId: channel.id.channelId,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    thumbnail: channel.snippet.thumbnails.default.url
                };
            }
            
            console.log(`❌ Canal não encontrado: ${username}`);
            return null;
            
        } catch (error) {
            console.error(`❌ Erro ao buscar canal ${username}:`, error.message);
            return null;
        }
    }

    // Obter estatísticas detalhadas do canal
    async getChannelStats(channelId) {
        try {
            console.log(`📊 Obtendo stats do canal: ${channelId}`);
            
            const response = await fetch(
                `${this.baseURL}/channels?` +
                `key=${this.apiKey}&` +
                `id=${channelId}&` +
                `part=statistics,snippet,brandingSettings`
            );

            this.dailyQuotaUsed += 5; // Channel details = 5 unidades
            
            if (!response.ok) {
                throw new Error(`YouTube API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                const channel = data.items[0];
                return {
                    channelId: channelId,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    subscribers: parseInt(channel.statistics.subscriberCount) || 0,
                    totalViews: parseInt(channel.statistics.viewCount) || 0,
                    videoCount: parseInt(channel.statistics.videoCount) || 0,
                    thumbnail: channel.snippet.thumbnails.default?.url,
                    country: channel.snippet.country,
                    customUrl: channel.snippet.customUrl
                };
            }
            
            return null;
            
        } catch (error) {
            console.error(`❌ Erro ao obter stats do canal:`, error.message);
            return null;
        }
    }

    // Buscar vídeos recentes do canal
    async getRecentVideos(channelId, maxResults = 10) {
        try {
            console.log(`🎥 Buscando vídeos recentes: ${channelId}`);
            
            const response = await fetch(
                `${this.baseURL}/search?` +
                `key=${this.apiKey}&` +
                `channelId=${channelId}&` +
                `type=video&` +
                `order=date&` +
                `part=snippet&` +
                `maxResults=${maxResults}`
            );

            this.dailyQuotaUsed += 100; // Search = 100 unidades
            
            if (!response.ok) {
                throw new Error(`YouTube API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                const videos = data.items.map(video => ({
                    videoId: video.id.videoId,
                    title: video.snippet.title,
                    description: video.snippet.description,
                    publishedAt: video.snippet.publishedAt,
                    thumbnail: video.snippet.thumbnails.default.url,
                    channelTitle: video.snippet.channelTitle
                }));
                
                console.log(`✅ ${videos.length} vídeos encontrados`);
                return videos;
            }
            
            return [];
            
        } catch (error) {
            console.error(`❌ Erro ao buscar vídeos:`, error.message);
            return [];
        }
    }

    // Analisar descrições de vídeos para detectar patrocínios
    detectSponsorship(videoDescription, videoTitle) {
        const gamblingKeywords = [
            // Casas de apostas
            'bet365', 'betway', 'rivalry', 'betano', 'stake', 'blaze',
            // Skin gambling
            'hellcase', 'gamdom', 'csgoroll', 'skinclub',
            // Indicadores
            'código', 'cupom', 'desconto', 'parceria', '#publi'
        ];

        const foundSponsors = [];
        const text = (videoDescription + ' ' + videoTitle).toLowerCase();
        
        gamblingKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                foundSponsors.push(keyword);
            }
        });

        // Detectar códigos promocionais (padrão comum)
        const promoCodePattern = /código[:\s]*([A-Z0-9]{3,})/gi;
        const promoCodes = text.match(promoCodePattern);
        
        return {
            hasSponsorship: foundSponsors.length > 0,
            sponsors: foundSponsors,
            promoCodes: promoCodes || [],
            riskLevel: foundSponsors.length >= 2 ? 'high' : 
                      foundSponsors.length === 1 ? 'medium' : 'low'
        };
    }

    // Coletar dados completos de um atleta
    async collectAthleteData(athlete) {
        try {
            console.log(`\n🎯 Coletando dados YouTube: ${athlete.name}`);
            
            if (!athlete.youtube_username) {
                console.log(`⏭️ ${athlete.name}: Sem canal YouTube configurado`);
                return null;
            }

            // Buscar canal
            const channelInfo = await this.findChannelByUsername(athlete.youtube_username);
            if (!channelInfo) {
                console.log(`❌ ${athlete.name}: Canal não encontrado`);
                return null;
            }

            // Obter estatísticas
            const stats = await this.getChannelStats(channelInfo.channelId);
            if (!stats) {
                console.log(`❌ ${athlete.name}: Erro ao obter estatísticas`);
                return null;
            }

            // Buscar vídeos recentes
            const recentVideos = await this.getRecentVideos(channelInfo.channelId, 10);
            
            // Analisar patrocínios nos vídeos
            const sponsorshipAnalysis = recentVideos.map(video => ({
                videoId: video.videoId,
                title: video.title,
                publishedAt: video.publishedAt,
                sponsorship: this.detectSponsorship(video.description, video.title)
            }));

            const hasAnySponsorship = sponsorshipAnalysis.some(v => v.sponsorship.hasSponsorship);
            const totalSponsors = [...new Set(sponsorshipAnalysis.flatMap(v => v.sponsorship.sponsors))];
            
            const result = {
                athlete_id: athlete.name,
                platform: 'youtube',
                channel_data: stats,
                recent_videos: sponsorshipAnalysis,
                sponsorship_summary: {
                    has_gambling_sponsors: hasAnySponsorship,
                    sponsors_detected: totalSponsors,
                    risk_level: totalSponsors.length >= 3 ? 'high' : 
                               totalSponsors.length >= 1 ? 'medium' : 'low',
                    videos_with_sponsors: sponsorshipAnalysis.filter(v => v.sponsorship.hasSponsorship).length
                },
                quota_used: this.dailyQuotaUsed,
                collected_at: new Date().toISOString()
            };

            console.log(`✅ ${athlete.name}: Dados coletados com sucesso`);
            console.log(`📊 Inscritos: ${stats.subscribers.toLocaleString()}`);
            console.log(`🎥 Vídeos: ${stats.videoCount}`);
            console.log(`⚠️ Patrocínios: ${totalSponsors.join(', ') || 'Nenhum detectado'}`);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erro ao coletar dados de ${athlete.name}:`, error.message);
            return null;
        }
    }

    // Verificar quota restante
    getQuotaStatus() {
        return {
            used: this.dailyQuotaUsed,
            remaining: this.maxDailyQuota - this.dailyQuotaUsed,
            percentage: (this.dailyQuotaUsed / this.maxDailyQuota * 100).toFixed(1)
        };
    }
}

// Exemplo de uso:
async function testYouTubeCollector() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const collector = new YouTubeCollector(apiKey);
    
    // Testar com FalleN
    const fallenData = await collector.collectAthleteData({
        name: 'FalleN',
        youtube_username: 'fallen'
    });
    
    console.log('Dados coletados:', JSON.stringify(fallenData, null, 2));
    console.log('Quota status:', collector.getQuotaStatus());
}

module.exports = YouTubeCollector;