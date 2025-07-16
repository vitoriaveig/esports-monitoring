const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Dados simulados para começar
const sampleData = {
    athletes: [
        {
            id: 1,
            name: 'Gabriel Toledo',
            nickname: 'FalleN',
            game: 'CS',
            team: 'Imperial',
            division: 1,
            nationality: 'BR',
            playing_country: 'BR',
            social_media: {
                twitter: { followers: 850000 },
                instagram: { followers: 420000 },
                youtube: { subscribers: 380000 },
                twitch: { followers: 290000 }
            },
            sponsorships: ['Bet365', 'SkinClub'],
            risk_score: 75,
            last_update: new Date()
        }
    ],
    dashboard: {
        total_athletes: 280,
        active_athletes: 156,
        total_sponsorships: 72,
        high_risk_count: 18
    }
};

// Rotas da API
app.get('/api/dashboard/data', (req, res) => {
    console.log('📊 Dashboard data requested');
    res.json(sampleData.dashboard);
});

app.get('/api/athletes', (req, res) => {
    console.log('👥 Athletes data requested');
    res.json(sampleData.athletes);
});

// Servir frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n🚀 SISTEMA DE MONITORAMENTO E-SPORTS INICIADO!');
    console.log('=' .repeat(50));
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log('📈 Status: Dados simulados funcionando');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('1. Abra http://localhost:3001 no navegador');
    console.log('2. Teste o dashboard');
    console.log('\n' + '=' .repeat(50));
});