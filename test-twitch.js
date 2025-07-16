// test-twitch.js
require('dotenv').config();

async function testTwitch() {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    console.log('🔑 Client ID:', clientId ? 'Configurado ✅' : 'Não encontrado ❌');
    console.log('🔐 Client Secret:', clientSecret ? 'Configurado ✅' : 'Não encontrado ❌');
    
    if (!clientId || !clientSecret) {
        console.log('❌ Configure as credenciais no arquivo .env');
        return;
    }
    
    try {
        console.log('\n🧪 Testando conexão com Twitch API...');
        
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'client_id': clientId,
                'client_secret': clientSecret,
                'grant_type': 'client_credentials'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Twitch API funcionando!');
            console.log('🎯 Token obtido com sucesso');
            console.log('⏰ Expira em:', data.expires_in, 'segundos');
            
            // Testar busca de usuário
            const userResponse = await fetch('https://api.twitch.tv/helix/users?login=fallen', {
                headers: {
                    'Client-ID': clientId,
                    'Authorization': `Bearer ${data.access_token}`
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData.data && userData.data.length > 0) {
                    const user = userData.data[0];
                    console.log('🎮 Teste de busca:');
                    console.log('   Nome:', user.display_name);
                    console.log('   Visualizações:', user.view_count.toLocaleString());
                    console.log('   Criado em:', user.created_at.split('T')[0]);
                }
            }
            
        } else {
            console.log('❌ Erro na API:', response.status, response.statusText);
        }
        
    } catch (error) {
        console.log('❌ Erro de conexão:', error.message);
    }
}

testTwitch();