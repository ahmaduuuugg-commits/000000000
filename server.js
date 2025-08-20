// 🎮 RHL TOURNAMENT - Haxball Bot Server for Render
// This file starts the Express server and initializes the Haxball bot

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import bot modules
const HaxballBot = require('./src/haxball-bot');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint for Render
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: '🎮 RHL TOURNAMENT Bot is running!',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Bot status endpoint
app.get('/status', (req, res) => {
    const bot = HaxballBot.getInstance();
    if (bot && bot.room) {
        const playerList = bot.room.getPlayerList();
        res.json({
            status: 'active',
            roomName: bot.config.ROOM_CONFIG.roomName,
            players: playerList.length,
            maxPlayers: bot.config.ROOM_CONFIG.maxPlayers,
            playerList: playerList.map(p => ({
                id: p.id,
                name: p.name,
                team: p.team,
                admin: p.admin
            }))
        });
    } else {
        res.json({
            status: 'initializing',
            message: 'Bot is starting up...'
        });
    }
});

// API endpoint to get bot statistics
app.get('/api/stats', (req, res) => {
    const bot = HaxballBot.getInstance();
    if (bot && bot.gameState) {
        res.json({
            clubs: Array.from(bot.gameState.clubs.entries()),
            playerStats: Array.from(bot.gameState.playerStats.entries()),
            matchStats: bot.gameState.matchStats,
            admins: bot.gameState.savedAdmins.size,
            owner: bot.gameState.ownerName
        });
    } else {
        res.json({ error: 'Bot not ready' });
    }
});

// Start the Express server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/`);
    
    // Initialize the Haxball bot after server starts
    console.log('🎮 Initializing Haxball bot...');
    try {
        HaxballBot.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize bot:', error);
        // Keep server running even if bot fails to start
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    const bot = HaxballBot.getInstance();
    if (bot && bot.room) {
        bot.room.sendAnnouncement(
            '🛑 Server is restarting... Be back in a moment!',
            null,
            0xff6600,
            'bold'
        );
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    // Try to restart the bot
    setTimeout(() => {
        try {
            HaxballBot.initialize();
        } catch (e) {
            console.error('❌ Failed to restart bot:', e);
        }
    }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
