// test-twitter.js - VERSÃO COM USERNAMES CORRETOS
require('dotenv').config();

async function testTwitterAPI() {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    console.log('🔑 Twitter Bearer Token:', bearerToken ? 'Configurado ✅' : 'Não encontrado ❌');
    
    if (!bearerToken) {
        console.log('❌ Configure TWITTER_BEARER_TOKEN no arquivo .env');
        return;
    }
    
    // Usernames corretos dos atletas
    const testUsers = [
        'FalleNCS',      // FalleN
        'aspaszin',      // aspas  
        'gustavosacy',   // Sacy
        'twitter'        // Fallback teste
    ];
    
    console.log('\n🧪 Testando Twitter API com usernames corretos...\n');
    
    for (const username of testUsers) {
        try {
            console.log(`🔍 Testando usuário: @${username}`);
            
            const response = await fetch(
                `https://api.twitter.com/2/users/by/username/${username}?` +
                'user.fields=public_metrics,description,verified',
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log(`   Status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.data) {
                    const user = data.data;
                    console.log('   ✅ ENCONTRADO!');
                    console.log(`      Nome: ${user.name}`);
                    console.log(`      Seguidores: ${user.public_metrics.followers_count.toLocaleString()}`);
                    console.log(`      Tweets: ${user.public_metrics.tweet_count.toLocaleString()}`);
                } else {
                    console.log('   ❌ Usuário não encontrado');
                }
                
            } else {
                if (response.status === 429) {
                    console.log('   ⚠️ Rate limit - aguardando...');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    continue;
                } else {
                    console.log(`   ❌ Erro: ${response.status}`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
        }
        
        console.log('');
        
        // Pausa entre requests (importante para rate limit)
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('🎉 Teste concluído!');
}

testTwitterAPI();