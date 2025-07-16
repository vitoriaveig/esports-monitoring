// backend/real-data-collector.js - VERSÃO COMPLETA COM TWITTER API
require('dotenv').config();

class RealDataCollector {
    constructor() {
        this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
        this.twitchClientId = process.env.TWITCH_CLIENT_ID;
        this.twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
        this.twitchToken = null;
        
        // Twitter API credentials
        this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
        this.twitterApiKey = process.env.TWITTER_API_KEY;
        this.twitterApiSecret = process.env.TWITTER_API_SECRET;
        
        // Lista expandida de atletas brasileiros para coletar
        this.athletes = [
            {
                name: 'Gabriel Toledo',
                nickname: 'FalleN',
                game: 'Counter-Strike',
                team: 'Imperial',
                division: 1,
                youtube_username: 'fallen',
                twitch_username: 'fallen',
                twitter_username: 'FalleNCS',
                playing_country: 'BR'
            },
            {
                name: 'Erick Santos',
                nickname: 'aspas',
                game: 'Valorant',
                team: 'Leviatán',
                division: 1,
                youtube_username: 'aspaszin',
                twitch_username: 'aspaszin',
                twitter_username: 'aspaszin',
                playing_country: 'CL'
            },
            {
                name: 'Gustavo Rossi',
                nickname: 'Sacy',
                game: 'Valorant',
                team: 'Sentinels',
                division: 1,
                youtube_username: 'sacy',
                twitch_username: 'sacy',
                twitter_username: 'gustavosacy',
                playing_country: 'US'
            },
            {
                name: 'Kaike Cerato',
                nickname: 'KSCERATO',
                game: 'Counter-Strike',
                team: 'FURIA',
                division: 1,
                youtube_username: 'kscerato',
                twitch_username: 'kscerato',
                twitter_username: 'KSCERATO',
                playing_country: 'US'
            },
            {
                name: 'Felipe Gonçalves',
                nickname: 'brTT',
                game: 'League of Legends',
                team: 'paiN Gaming',
                division: 1,
                youtube_username: 'brttoficial',
                twitch_username: 'brtt',
                twitter_username: 'brttoficial',
                playing_country: 'BR'
            },
            {
                name: 'Andrei Piovezan',
                nickname: 'arT',
                game: 'Counter-Strike',
                team: 'FURIA',
                division: 1,
                youtube_username: 'artcs',
                twitch_username: 'art',
                twitter_username: 'arTcs',
                playing_country: 'US'
            },
            {
                name: 'Matias Delipetro',
                nickname: 'saadhak',
                game: 'Valorant',
                team: 'LOUD',
                division: 1,
                youtube_username: 'saadhak',
                twitch_username: 'saadhak',
                twitter_username: 'saadhak',
                playing_country: 'BR'
            }
        ];
    }

    // Obter token Twitch
    async getTwitchToken() {
        if (this.twitchToken) return this.twitchToken;
        
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    'client_id': this.twitchClientId,
                    'client_secret': this.twitchClientSecret,
                    'grant_type': 'client_credentials'
                })
            });
            
            const data = await response.json();
            this.twitchToken = data.access_token;
            return this.twitchToken;
        } catch (error) {
            console.error('❌ Erro ao obter token Twitch:', error);
            return null;
        }
    }

    // Coletar dados YouTube
    async collectYouTubeData(athlete) {
        try {
            if (!athlete.youtube_username) return null;
            
            console.log(`🔍 YouTube: Buscando ${athlete.nickname}...`);
            
            // Buscar canal
            const searchResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?` +
                `key=${this.youtubeApiKey}&` +
                `q=${encodeURIComponent(athlete.youtube_username)}&` +
                `type=channel&part=snippet&maxResults=1`
            );
            
            if (!searchResponse.ok) throw new Error('YouTube search failed');
            
            const searchData = await searchResponse.json();
            if (!searchData.items || searchData.items.length === 0) {
                console.log(`❌ YouTube: Canal não encontrado para ${athlete.nickname}`);
                return null;
            }
            
            const channelId = searchData.items[0].id.channelId;
            
            // Obter estatísticas
            const statsResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?` +
                `key=${this.youtubeApiKey}&` +
                `id=${channelId}&` +
                `part=statistics,snippet`
            );
            
            if (!statsResponse.ok) throw new Error('YouTube stats failed');
            
            const statsData = await statsResponse.json();
            const channel = statsData.items[0];
            
            // Buscar vídeos recentes
            const videosResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?` +
                `key=${this.youtubeApiKey}&` +
                `channelId=${channelId}&` +
                `type=video&order=date&part=snippet&maxResults=10`
            );
            
            let recentVideos = [];
            if (videosResponse.ok) {
                const videosData = await videosResponse.json();
                recentVideos = videosData.items || [];
            }
            
            // Analisar patrocínios
            const sponsorshipAnalysis = this.analyzeSponsorship(recentVideos);
            
            console.log(`✅ YouTube: ${athlete.nickname} - ${parseInt(channel.statistics.subscriberCount).toLocaleString()} inscritos`);
            
            return {
                platform: 'youtube',
                channel_data: {
                    id: channelId,
                    title: channel.snippet.title,
                    subscribers: parseInt(channel.statistics.subscriberCount) || 0,
                    views: parseInt(channel.statistics.viewCount) || 0,
                    videos: parseInt(channel.statistics.videoCount) || 0,
                    description: channel.snippet.description
                },
                recent_videos: recentVideos.map(v => ({
                    title: v.snippet.title,
                    published: v.snippet.publishedAt,
                    description: v.snippet.description,
                    videoId: v.id.videoId
                })),
                sponsorship_analysis: sponsorshipAnalysis
            };
            
        } catch (error) {
            console.error(`❌ YouTube error for ${athlete.nickname}:`, error.message);
            return null;
        }
    }

    // Coletar dados Twitch
    async collectTwitchData(athlete) {
        try {
            if (!athlete.twitch_username) return null;
            
            console.log(`🔍 Twitch: Buscando ${athlete.nickname}...`);
            
            const token = await this.getTwitchToken();
            if (!token) throw new Error('No Twitch token');
            
            const headers = {
                'Client-ID': this.twitchClientId,
                'Authorization': `Bearer ${token}`
            };
            
            // Buscar usuário
            const userResponse = await fetch(
                `https://api.twitch.tv/helix/users?login=${athlete.twitch_username}`,
                { headers }
            );
            
            if (!userResponse.ok) throw new Error('Twitch user search failed');
            
            const userData = await userResponse.json();
            if (!userData.data || userData.data.length === 0) {
                console.log(`❌ Twitch: Usuário não encontrado para ${athlete.nickname}`);
                return null;
            }
            
            const user = userData.data[0];
            
            // Obter seguidores
            const followersResponse = await fetch(
                `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`,
                { headers }
            );
            
            let followersCount = 0;
            if (followersResponse.ok) {
                const followersData = await followersResponse.json();
                followersCount = followersData.total || 0;
            }
            
            // Buscar VODs recentes
            const videosResponse = await fetch(
                `https://api.twitch.tv/helix/videos?user_id=${user.id}&type=archive&first=10`,
                { headers }
            );
            
            let recentVideos = [];
            if (videosResponse.ok) {
                const videosData = await videosResponse.json();
                recentVideos = videosData.data || [];
            }
            
            // Analisar patrocínios
            const sponsorshipAnalysis = this.analyzeSponsorship(recentVideos, 'twitch');
            
            console.log(`✅ Twitch: ${athlete.nickname} - ${followersCount.toLocaleString()} seguidores`);
            
            return {
                platform: 'twitch',
                user_data: {
                    id: user.id,
                    login: user.login,
                    display_name: user.display_name,
                    followers: followersCount,
                    views: user.view_count,
                    description: user.description,
                    profile_image: user.profile_image_url
                },
                recent_videos: recentVideos.map(v => ({
                    title: v.title,
                    created_at: v.created_at,
                    view_count: v.view_count,
                    description: v.description,
                    id: v.id
                })),
                sponsorship_analysis: sponsorshipAnalysis
            };
            
        } catch (error) {
            console.error(`❌ Twitch error for ${athlete.nickname}:`, error.message);
            return null;
        }
    }

    // NOVA FUNÇÃO: Coletar dados Twitter
    async collectTwitterData(athlete) {
        try {
            if (!athlete.twitter_username) return null;
            
            console.log(`🔍 Twitter: Buscando ${athlete.nickname}...`);
            
            if (!this.twitterBearerToken) {
                console.log('❌ Twitter Bearer Token não configurado');
                return null;
            }
            
            const headers = {
                'Authorization': `Bearer ${this.twitterBearerToken}`,
                'Content-Type': 'application/json'
            };
            
            // Buscar usuário por username
            const userResponse = await fetch(
                `https://api.twitter.com/2/users/by/username/${athlete.twitter_username}?` +
                `user.fields=public_metrics,description,verified,location,created_at`,
                { headers }
            );
            
            if (!userResponse.ok) {
                const errorData = await userResponse.json();
                console.log(`❌ Twitter API Error: ${userResponse.status} - ${errorData.detail || 'Unknown error'}`);
                return null;
            }
            
            const userData = await userResponse.json();
            if (!userData.data) {
                console.log(`❌ Twitter: Usuário não encontrado para ${athlete.nickname}`);
                return null;
            }
            
            const user = userData.data;
            
            // Buscar tweets recentes (limitado a 10 pela API free)
            const tweetsResponse = await fetch(
                `https://api.twitter.com/2/users/${user.id}/tweets?` +
                `max_results=10&` +
                `tweet.fields=public_metrics,created_at,context_annotations,entities,author_id&` +
                `expansions=author_id`,
                { headers }
            );
            
            let recentTweets = [];
            if (tweetsResponse.ok) {
                const tweetsData = await tweetsResponse.json();
                recentTweets = tweetsData.data || [];
            }
            
            // Analisar patrocínios nos tweets
            const sponsorshipAnalysis = this.analyzeSponsorship(
                recentTweets.map(tweet => ({
                    title: tweet.text.substring(0, 100), // Primeiros 100 chars como "título"
                    description: tweet.text,
                    published: tweet.created_at,
                    id: tweet.id
                })), 
                'twitter'
            );
            
            const followersCount = user.public_metrics?.followers_count || 0;
            const tweetsCount = user.public_metrics?.tweet_count || 0;
            
            console.log(`✅ Twitter: ${athlete.nickname} - ${followersCount.toLocaleString()} seguidores`);
            
            return {
                platform: 'twitter',
                user_data: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    followers: followersCount,
                    following: user.public_metrics?.following_count || 0,
                    tweets: tweetsCount,
                    likes: user.public_metrics?.like_count || 0,
                    verified: user.verified || false,
                    description: user.description || '',
                    location: user.location || '',
                    created_at: user.created_at
                },
                recent_tweets: recentTweets.map(tweet => ({
                    id: tweet.id,
                    text: tweet.text,
                    created_at: tweet.created_at,
                    public_metrics: tweet.public_metrics,
                    retweets: tweet.public_metrics?.retweet_count || 0,
                    likes: tweet.public_metrics?.like_count || 0,
                    replies: tweet.public_metrics?.reply_count || 0
                })),
                sponsorship_analysis: sponsorshipAnalysis
            };
            
        } catch (error) {
            console.error(`❌ Twitter error for ${athlete.nickname}:`, error.message);
            return null;
        }
    }

    // ANÁLISE EXPANDIDA DE PATROCÍNIOS - VERSÃO COMPLETA
    analyzeSponsorship(videos, platform = 'youtube') {
        // PALAVRAS-CHAVE EXPANDIDAS PARA DETECÇÃO COMPLETA
        const sponsorshipKeywords = {
            // Casas de apostas tradicionais
            betting_sites: [
                'bet365', 'betway', 'rivalry', 'betano', 'sportingbet', '1xbet',
                'pinnacle', 'betfair', 'william hill', 'unibet', 'bet nacional',
                'pixbet', 'stake', 'bc.game', 'roobet', 'betsson', 'betwinner',
                'melbet', '22bet', 'parimatch', 'betmotion', 'bodog'
            ],
            
            // Palavras relacionadas a apostas em português
            betting_terms: [
                'aposta', 'apostas', 'apostar', 'bet', 'betting',
                'casa de aposta', 'site de aposta', 'plataforma de aposta',
                'odds', 'palpite', 'palpites', 'prognóstico', 'tips',
                'green', 'red', 'cash out', 'all in', 'bankroll'
            ],
            
            // Jogos específicos brasileiros
            brazilian_games: [
                'jogo do tigrinho', 'tigrinho', 'fortune tiger',
                'spaceman', 'aviator', 'crash', 'mines', 'plinko',
                'roleta', 'blackjack', 'baccarat', 'dragon tiger',
                'crazy time', 'lightning roulette', 'mega wheel',
                'fortune ox', 'fortune rabbit', 'fortune mouse'
            ],
            
            // Skin gambling, loot boxes e mecânicas similares - VERSÃO EXPANDIDA
            skin_gambling: [
                // Sites tradicionais de skin gambling
                'csgolive', 'skinclub', 'hellcase', 'gamdom', 'csgoroll',
                'csgo500', 'daddyskins', 'skinbaron', 'bitskins', 'waxpeer',
                'tradeit', 'skinport', 'swap.gg', 'rollbit', 'duelbits',
                
                // Termos relacionados a skins
                'skins', 'skin bet', 'skin betting', 'cs skins', 'csgo skins',
                'valorant skins', 'trade skins', 'sell skins', 'buy skins',
                
                // Loot boxes - termos em inglês
                'loot box', 'loot boxes', 'lootbox', 'lootboxes',
                'mystery box', 'mystery boxes', 'surprise box',
                'treasure box', 'treasure chest',
                
                // Loot boxes - termos em português
                'caixa misteriosa', 'caixas misteriosas', 'caixa surpresa',
                'caixas surpresa', 'caixa de loot', 'caixas de loot',
                'caixa do tesouro', 'caixas do tesouro', 'baú',
                'baús', 'pacote misterioso', 'pacotes misteriosos',
                
                // Case opening (muito comum em CS:GO)
                'case opening', 'case open', 'opening cases', 'open cases',
                'case unboxing', 'unboxing cases', 'case battle',
                'case simulator', 'case opening simulator',
                
                // Termos em português para case opening
                'abrir caixas', 'abrindo caixas', 'abertura de caixas',
                'abertura de case', 'abrindo case', 'cases',
                'simulador de cases', 'battle de cases',
                
                // Gambling mechanics específicas
                'gacha', 'gacha system', 'sistema gacha', 'pull', 'pulls',
                'random drop', 'random drops', 'drop aleatorio', 'drops aleatorios',
                'spin wheel', 'roda da fortuna', 'wheel of fortune',
                'scratch card', 'scratch cards', 'raspadinha', 'raspadinhas',
                
                // Valorant específico
                'valorant points', 'vp', 'radianite', 'night market',
                'mercado noturno', 'bundle valorant', 'skin valorant',
                
                // CS:GO específico  
                'steam market', 'steam wallet', 'csgo case', 'csgo crate',
                'operation pass', 'sticker capsule', 'music kit',
                
                // Free Fire (muito popular no Brasil)
                'diamante free fire', 'diamantes ff', 'cubo magico',
                'cubo mágico', 'roleta free fire', 'sorteio ff',
                
                // Mobile games loot boxes
                'chest mobile', 'mobile chest', 'premium box',
                'elite box', 'legendary box', 'epic box',
                
                // Mecânicas predatórias
                'pay to win', 'p2w', 'microtransaction', 'microtransações',
                'in app purchase', 'compra no app', 'premium currency',
                'moeda premium', 'virtual currency', 'moeda virtual',
                
                // Indicadores de vício em loot boxes
                'just one more', 'mais uma caixa', 'última caixa',
                'luck based', 'sorte', 'azar', 'lucky drop',
                'rare drop', 'drop raro', 'legendary drop',
                
                // Sites brasileiros que fazem loot boxes
                'sorteio de skin', 'rifa de skin', 'rifa cs', 'sorteio cs',
                'live sorteio', 'sorteio ao vivo', 'giveaway skin'
            ],
            
            // Cassinos online
            online_casinos: [
                'blaze', 'f12bet', 'estrela bet', 'kto', 'leon',
                'galera bet', 'novibet', 'apostaganha', 'vaidebet',
                'casino', 'cassino', 'slots', 'caça níquel'
            ],
            
            // Indicadores de patrocínio
            sponsorship_indicators: [
                '#publi', '#publicidade', '#ad', '#sponsored', '#partnership',
                'parceria', 'apoio', 'patrocínio', 'colaboração', 'apoiado por',
                'em parceria', 'sponsor', 'apoiador', 'patrocinador'
            ],
            
            // Códigos promocionais e promoções
            promo_indicators: [
                'código', 'cupom', 'desconto', 'bônus', 'promo', 'promocional',
                'oferta', 'cashback', 'freebet', 'rodadas grátis', 'giros grátis',
                '!code', '!código', '!cupom', '!promo', '!bonus',
                'use o código', 'digite o código', 'código promocional'
            ],
            
            // Nova categoria específica para mecânicas predatórias
            predatory_mechanics: [
                // FOMO (Fear of Missing Out)
                'limited time', 'tempo limitado', 'oferta limitada',
                'última chance', 'last chance', 'apenas hoje',
                'only today', 'expires soon', 'expira em breve',
                
                // Pressure tactics
                'act now', 'aja agora', 'não perca', "don't miss",
                'exclusive offer', 'oferta exclusiva', 'vip offer',
                'special deal', 'promoção especial',
                
                // Psychological triggers
                'you deserve', 'você merece', 'treat yourself',
                'se dê um presente', 'reward yourself', 'se recompense',
                
                // Addiction patterns
                'one more try', 'mais uma tentativa', 'better luck',
                'melhor sorte', 'try again', 'tente novamente',
                'almost won', 'quase ganhou', 'so close', 'tão perto'
            ],
            
            // Cripto apostas (emergente no Brasil)
            crypto_betting: [
                'bitcoin bet', 'crypto bet', 'btc bet', 'eth bet',
                'cripto aposta', 'aposta crypto', 'blockchain bet'
            ],
            
            // Termos de risco (menores)
            risk_terms: [
                'maior de idade', '+18', 'responsável', 'vício',
                'problema de jogo', 'jogue com responsabilidade',
                'pode causar dependência'
            ]
        };

        let foundSponsors = [];
        let sponsorshipEvidence = [];
        let riskFactors = [];
        let totalMentions = 0;

        videos.forEach((video, index) => {
            const text = (video.title + ' ' + (video.description || '')).toLowerCase();
            let videoSponsors = [];
            let videoEvidence = [];

            // Analisar cada categoria de palavras-chave
            Object.entries(sponsorshipKeywords).forEach(([category, keywords]) => {
                keywords.forEach(keyword => {
                    if (text.includes(keyword.toLowerCase())) {
                        videoSponsors.push({
                            keyword,
                            category,
                            context: this.extractContext(text, keyword)
                        });
                        
                        foundSponsors.push(keyword);
                        totalMentions++;
                        
                        videoEvidence.push({
                            video_index: index,
                            video_title: video.title,
                            keyword,
                            category,
                            timestamp: video.published || video.created_at
                        });
                    }
                });
            });

            if (videoSponsors.length > 0) {
                sponsorshipEvidence.push({
                    video: {
                        title: video.title,
                        id: video.videoId || video.id,
                        published: video.published || video.created_at
                    },
                    sponsors_found: videoSponsors
                });
            }
        });

        // Detectar padrões de códigos promocionais
        const promoPatterns = this.detectPromoPatterns(videos);
        
        // Calcular score de risco baseado em múltiplos fatores
        const riskScore = this.calculateRiskScore({
            uniqueSponsors: [...new Set(foundSponsors)],
            totalMentions,
            categories: this.getCategoriesFound(sponsorshipEvidence),
            promoPatterns,
            videosAnalyzed: videos.length
        });

        return {
            // Dados básicos
            videos_analyzed: videos.length,
            videos_with_sponsors: sponsorshipEvidence.length,
            
            // Patrocínios encontrados
            unique_sponsors: [...new Set(foundSponsors)],
            total_sponsor_mentions: totalMentions,
            
            // Análise detalhada
            sponsorship_evidence: sponsorshipEvidence,
            categories_detected: this.getCategoriesFound(sponsorshipEvidence),
            promo_patterns: promoPatterns,
            
            // Avaliação de risco
            risk_level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
            risk_score: riskScore,
            risk_factors: this.identifyRiskFactors(sponsorshipEvidence, promoPatterns),
            
            // Compliance
            has_disclosure: this.checkDisclosure(sponsorshipEvidence),
            compliance_score: this.calculateComplianceScore(sponsorshipEvidence),
            
            // Metadados
            analysis_timestamp: new Date().toISOString(),
            platform: platform
        };
    }

    // Funções auxiliares para análise avançada
    extractContext(text, keyword) {
        const index = text.indexOf(keyword.toLowerCase());
        const start = Math.max(0, index - 30);
        const end = Math.min(text.length, index + keyword.length + 30);
        return text.substring(start, end);
    }

    detectPromoPatterns(videos) {
        const patterns = [];
        const promoRegex = [
            /código[:\s]*([A-Z0-9]{3,10})/gi,
            /cupom[:\s]*([A-Z0-9]{3,10})/gi,
            /use[:\s]*([A-Z0-9]{3,10})/gi,
            /!([A-Z0-9]{3,10})/gi
        ];

        videos.forEach(video => {
            const text = video.title + ' ' + (video.description || '');
            promoRegex.forEach(regex => {
                const matches = text.match(regex);
                if (matches) {
                    patterns.push(...matches.map(match => ({
                        code: match,
                        video_title: video.title,
                        type: 'promotional_code'
                    })));
                }
            });
        });

        return patterns;
    }

    getCategoriesFound(evidence) {
        const categories = new Set();
        evidence.forEach(item => {
            item.sponsors_found.forEach(sponsor => {
                categories.add(sponsor.category);
            });
        });
        return Array.from(categories);
    }

    calculateRiskScore({ uniqueSponsors, totalMentions, categories, promoPatterns, videosAnalyzed }) {
        let score = 0;
        
        // Pontuação por patrocinadores únicos
        score += uniqueSponsors.length * 8;
        
        // Pontuação por frequência de menções
        score += Math.min(totalMentions * 3, 30);
        
        // Pontuação por categorias de risco
        const riskCategories = ['betting_sites', 'brazilian_games', 'skin_gambling', 'online_casinos', 'predatory_mechanics'];
        const riskCategoryCount = categories.filter(cat => riskCategories.includes(cat)).length;
        score += riskCategoryCount * 15;
        
        // Pontuação por códigos promocionais
        score += promoPatterns.length * 10;
        
        // Penalização por poucos vídeos analisados
        if (videosAnalyzed < 3) {
            score *= 0.7;
        }
        
        return Math.min(Math.round(score), 100);
    }

    identifyRiskFactors(evidence, promoPatterns) {
        const factors = [];
        
        if (evidence.length > 0) {
            factors.push('Patrocínios de apostas detectados');
        }
        
        if (promoPatterns.length > 0) {
            factors.push('Códigos promocionais identificados');
        }
        
        const categories = this.getCategoriesFound(evidence);
        if (categories.includes('brazilian_games')) {
            factors.push('Jogos populares no Brasil (Tigrinho, etc.)');
        }
        
        if (categories.includes('skin_gambling')) {
            factors.push('Skin gambling / Loot boxes');
        }
        
        if (categories.includes('online_casinos')) {
            factors.push('Cassinos online');
        }
        
        if (categories.includes('predatory_mechanics')) {
            factors.push('Mecânicas predatórias detectadas');
        }
        
        return factors;
    }

    checkDisclosure(evidence) {
        return evidence.some(item => 
            item.sponsors_found.some(sponsor => 
                sponsor.category === 'sponsorship_indicators'
            )
        );
    }

    calculateComplianceScore(evidence) {
        if (evidence.length === 0) return 100;
        
        const videosWithDisclosure = evidence.filter(item =>
            item.sponsors_found.some(sponsor => 
                sponsor.category === 'sponsorship_indicators'
            )
        ).length;
        
        return Math.round((videosWithDisclosure / evidence.length) * 100);
    }

    // Coletar dados completos de um atleta específico - ATUALIZADO COM TWITTER
    async collectAthleteData(athlete) {
        console.log(`\n🎯 Coletando dados: ${athlete.nickname} (${athlete.game})`);
        
        const [youtubeData, twitchData, twitterData] = await Promise.all([
            this.collectYouTubeData(athlete),
            this.collectTwitchData(athlete),
            this.collectTwitterData(athlete) // INCLUINDO TWITTER
        ]);
        
        // Calcular score de risco incluindo Twitter
        let riskScore = 0;
        let totalSponsors = [];
        let allRiskFactors = [];
        let platformCount = 0;
        
        if (youtubeData?.sponsorship_analysis) {
            riskScore += youtubeData.sponsorship_analysis.risk_score;
            totalSponsors.push(...youtubeData.sponsorship_analysis.unique_sponsors);
            allRiskFactors.push(...youtubeData.sponsorship_analysis.risk_factors);
            platformCount++;
        }
        
        if (twitchData?.sponsorship_analysis) {
            riskScore += twitchData.sponsorship_analysis.risk_score;
            totalSponsors.push(...twitchData.sponsorship_analysis.unique_sponsors);
            allRiskFactors.push(...twitchData.sponsorship_analysis.risk_factors);
            platformCount++;
        }
        
        // INCLUINDO TWITTER na análise de risco
        if (twitterData?.sponsorship_analysis) {
            riskScore += twitterData.sponsorship_analysis.risk_score;
            totalSponsors.push(...twitterData.sponsorship_analysis.unique_sponsors);
            allRiskFactors.push(...twitterData.sponsorship_analysis.risk_factors);
            platformCount++;
        }
        
        const uniqueSponsors = [...new Set(totalSponsors)];
        const finalRiskScore = Math.min(Math.round(riskScore / Math.max(platformCount, 1)), 100);
        
        const result = {
            ...athlete,
            social_media: {
                youtube: youtubeData?.channel_data || null,
                twitch: twitchData?.user_data || null,
                twitter: twitterData?.user_data || null // INCLUINDO TWITTER
            },
            sponsorships: uniqueSponsors,
            risk_score: finalRiskScore,
            risk_factors: [...new Set(allRiskFactors)],
            last_update: new Date().toISOString(),
            raw_data: {
                youtube: youtubeData,
                twitch: twitchData,
                twitter: twitterData // INCLUINDO TWITTER
            }
        };
        
        // Log detalhado incluindo Twitter
        console.log(`✅ ${athlete.nickname}: Coleta finalizada`);
        if (youtubeData) {
            console.log(`   📺 YouTube: ${youtubeData.channel_data.subscribers.toLocaleString()} inscritos`);
        }
        if (twitchData) {
            console.log(`   🎮 Twitch: ${twitchData.user_data.followers.toLocaleString()} seguidores`);
        }
        if (twitterData) {
            console.log(`   🐦 Twitter: ${twitterData.user_data.followers.toLocaleString()} seguidores`);
        }
        console.log(`   ⚠️ Risco: ${finalRiskScore}/100`);
        console.log(`   🎯 Patrocínios: ${uniqueSponsors.join(', ') || 'Nenhum detectado'}`);
        
        return result;
    }

    // Coletar dados de todos os atletas
    async collectAllAthletes() {
        console.log('🚀 Iniciando coleta de dados reais...\n');
        
        const results = [];
        
        for (const athlete of this.athletes) {
            try {
                const athleteData = await this.collectAthleteData(athlete);
                results.push(athleteData);
                
                // Pausa entre coletas para respeitar rate limits
                await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos
                
            } catch (error) {
                console.error(`❌ Erro ao coletar ${athlete.nickname}:`, error.message);
            }
        }
        
        console.log(`\n✅ Coleta finalizada! ${results.length} atletas processados`);
        
        // Resumo da coleta
        const platformSummary = {
            youtube: results.filter(a => a.social_media.youtube).length,
            twitch: results.filter(a => a.social_media.twitch).length,
            twitter: results.filter(a => a.social_media.twitter).length
        };
        
        console.log('\n📊 RESUMO DA COLETA:');
        console.log(`   📺 YouTube: ${platformSummary.youtube}/${results.length} atletas`);
        console.log(`   🎮 Twitch: ${platformSummary.twitch}/${results.length} atletas`);
        console.log(`   🐦 Twitter: ${platformSummary.twitter}/${results.length} atletas`);
        
        const totalSponsors = results.reduce((acc, a) => acc + a.sponsorships.length, 0);
        const highRisk = results.filter(a => a.risk_score >= 70).length;
        
        console.log(`   💰 Total patrocínios: ${totalSponsors}`);
        console.log(`   ⚠️ Alto risco: ${highRisk}/${results.length} atletas`);
        
        return results;
    }

    // Gerar dashboard data com dados reais - ATUALIZADO
    generateDashboardData(athletesData) {
        const totalAthletes = athletesData.length;
        const highRiskAthletes = athletesData.filter(a => a.risk_score >= 70).length;
        const totalSponsors = athletesData.reduce((acc, a) => acc + a.sponsorships.length, 0);
        
        // Análise por plataforma
        const platformStats = {
            youtube: athletesData.filter(a => a.social_media.youtube).length,
            twitch: athletesData.filter(a => a.social_media.twitch).length,
            twitter: athletesData.filter(a => a.social_media.twitter).length
        };
        
        const gamesDistribution = {};
        athletesData.forEach(athlete => {
            if (!gamesDistribution[athlete.game]) {
                gamesDistribution[athlete.game] = { athletes: 0, sponsorships: 0 };
            }
            gamesDistribution[athlete.game].athletes++;
            gamesDistribution[athlete.game].sponsorships += athlete.sponsorships.length;
        });
        
        // Análise de risco por divisão
        const division1Athletes = athletesData.filter(a => a.division === 1);
        const division2Athletes = athletesData.filter(a => a.division === 2);
        
        return {
            total_athletes: totalAthletes,
            active_athletes: totalAthletes,
            total_sponsorships: totalSponsors,
            high_risk_count: highRiskAthletes,
            avg_risk_score: Math.round(athletesData.reduce((acc, a) => acc + a.risk_score, 0) / totalAthletes),
            
            // Estatísticas por plataforma
            platform_coverage: platformStats,
            platform_percentage: {
                youtube: Math.round((platformStats.youtube / totalAthletes) * 100),
                twitch: Math.round((platformStats.twitch / totalAthletes) * 100),
                twitter: Math.round((platformStats.twitter / totalAthletes) * 100)
            },
            
            // Distribuição por modalidade
            games_distribution: Object.keys(gamesDistribution).map(game => ({
                game,
                athletes: gamesDistribution[game].athletes,
                sponsorships: gamesDistribution[game].sponsorships
            })),
            
            // Análise por divisão
            division_analysis: {
                division_1: {
                    total: division1Athletes.length,
                    high_risk: division1Athletes.filter(a => a.risk_score >= 70).length,
                    avg_risk: Math.round(division1Athletes.reduce((acc, a) => acc + a.risk_score, 0) / Math.max(division1Athletes.length, 1))
                },
                division_2: {
                    total: division2Athletes.length,
                    high_risk: division2Athletes.filter(a => a.risk_score >= 70).length,
                    avg_risk: Math.round(division2Athletes.reduce((acc, a) => acc + a.risk_score, 0) / Math.max(division2Athletes.length, 1))
                }
            },
            
            // Metadados
            last_collection: new Date().toISOString(),
            collection_method: 'multi_platform_api',
            data_sources: ['youtube_api', 'twitch_api', 'twitter_api']
        };
    }

    // Função para verificar status das APIs
    async getAPIStatus() {
        const status = {
            youtube: { status: 'unknown', message: '' },
            twitch: { status: 'unknown', message: '' },
            twitter: { status: 'unknown', message: '' }
        };
        
        // Verificar YouTube
        try {
            if (this.youtubeApiKey) {
                const response = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${this.youtubeApiKey}&q=test&maxResults=1`);
                status.youtube.status = response.ok ? 'active' : 'error';
                status.youtube.message = response.ok ? 'API funcionando' : `Erro ${response.status}`;
            } else {
                status.youtube.status = 'not_configured';
                status.youtube.message = 'API Key não configurada';
            }
        } catch (error) {
            status.youtube.status = 'error';
            status.youtube.message = error.message;
        }
        
        // Verificar Twitch
        try {
            if (this.twitchClientId && this.twitchClientSecret) {
                const token = await this.getTwitchToken();
                status.twitch.status = token ? 'active' : 'error';
                status.twitch.message = token ? 'API funcionando' : 'Erro na autenticação';
            } else {
                status.twitch.status = 'not_configured';
                status.twitch.message = 'Credenciais não configuradas';
            }
        } catch (error) {
            status.twitch.status = 'error';
            status.twitch.message = error.message;
        }
        
        // Verificar Twitter
        try {
            if (this.twitterBearerToken) {
                const response = await fetch('https://api.twitter.com/2/users/by/username/twitter', {
                    headers: { 'Authorization': `Bearer ${this.twitterBearerToken}` }
                });
                status.twitter.status = response.ok ? 'active' : 'error';
                status.twitter.message = response.ok ? 'API funcionando' : `Erro ${response.status}`;
            } else {
                status.twitter.status = 'not_configured';
                status.twitter.message = 'Bearer Token não configurado';
            }
        } catch (error) {
            status.twitter.status = 'error';
            status.twitter.message = error.message;
        }
        
        return status;
    }
}

module.exports = RealDataCollector;