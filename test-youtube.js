// test-youtube.js
require('dotenv').config();

async function testYouTube() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    console.log('🔑 YouTube API Key:', apiKey ? 'Configurado ✅' : 'Não encontrado ❌');
    
    if (!apiKey) {
        console.log('❌ Configure YOUTUBE_API_KEY no arquivo .env');
        return;
    }
    
    try {
        console.log('\n🧪 Testando YouTube API...');
        
        // Buscar canal do FalleN
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `key=${apiKey}&` +
            `q=fallen&` +
            `type=channel&` +
            `part=snippet&` +
            `maxResults=1`
        );
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                const channel = data.items[0];
                console.log('✅ YouTube API funcionando!');
                console.log('🎥 Canal encontrado:');
                console.log('   Nome:', channel.snippet.title);
                console.log('   Descrição:', channel.snippet.description.substring(0, 100) + '...');
                console.log('   ID:', channel.id.channelId);
                
                // Buscar estatísticas do canal
                const statsResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/channels?` +
                    `key=${apiKey}&` +
                    `id=${channel.id.channelId}&` +
                    `part=statistics`
                );
                
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    if (statsData.items && statsData.items.length > 0) {
                        const stats = statsData.items[0].statistics;
                        console.log('📊 Estatísticas:');
                        console.log('   Inscritos:', parseInt(stats.subscriberCount).toLocaleString());
                        console.log('   Visualizações:', parseInt(stats.viewCount).toLocaleString());
                        console.log('   Vídeos:', parseInt(stats.videoCount).toLocaleString());
                    }
                }
                
            } else {
                console.log('❌ Nenhum canal encontrado');
            }
            
        } else {
            console.log('❌ Erro na YouTube API:', response.status, response.statusText);
            const errorData = await response.json();
            console.log('Detalhes:', errorData.error?.message);
        }
        
    } catch (error) {
        console.log('❌ Erro de conexão:', error.message);
    }
}

testYouTube();