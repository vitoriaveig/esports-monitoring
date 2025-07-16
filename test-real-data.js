// test-real-data.js
const RealDataCollector = require('./backend/real-data-collector');

async function testRealDataCollection() {
    console.log('🎯 TESTE DE COLETA DE DADOS REAIS\n');
    
    const collector = new RealDataCollector();
    
    try {
        // Coletar dados de todos os atletas
        const athletesData = await collector.collectAllAthletes();
        
        // Gerar dados do dashboard
        const dashboardData = collector.generateDashboardData(athletesData);
        
        console.log('\n📊 RESUMO DOS DADOS COLETADOS:');
        console.log('=' .repeat(50));
        console.log(`👥 Total de atletas: ${dashboardData.total_athletes}`);
        console.log(`⚠️ Alto risco: ${dashboardData.high_risk_count}`);
        console.log(`💰 Total patrocínios: ${dashboardData.total_sponsorships}`);
        console.log(`📈 Score médio: ${dashboardData.avg_risk_score}/100`);
        
        console.log('\n🎮 POR MODALIDADE:');
        dashboardData.games_distribution.forEach(game => {
            console.log(`   ${game.game}: ${game.athletes} atletas, ${game.sponsorships} patrocínios`);
        });
        
        console.log('\n👤 ATLETAS DETALHADOS:');
        athletesData.forEach(athlete => {
            console.log(`\n${athlete.nickname} (${athlete.game}):`);
            console.log(`   YouTube: ${athlete.social_media.youtube?.subscribers?.toLocaleString() || 'N/A'} inscritos`);
            console.log(`   Twitch: ${athlete.social_media.twitch?.followers?.toLocaleString() || 'N/A'} seguidores`);
            console.log(`   Patrocínios: ${athlete.sponsorships.join(', ') || 'Nenhum'}`);
            console.log(`   Risco: ${athlete.risk_score}/100`);
        });
        
        // Salvar dados coletados
        const fs = require('fs');
        fs.writeFileSync('collected-data.json', JSON.stringify({
            athletes: athletesData,
            dashboard: dashboardData
        }, null, 2));
        
        console.log('\n💾 Dados salvos em: collected-data.json');
        console.log('✅ Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testRealDataCollection();