// 🎮 RHL TOURNAMENT - Configuration
// Environment variables and bot settings

require('dotenv').config();

const config = {
    // Haxball room configuration
    ROOM_CONFIG: {
        roomName: process.env.ROOM_NAME || "🎮 RHL TOURNAMENT 🎮",
        playerName: process.env.PLAYER_NAME || "[HOST]",
        maxPlayers: parseInt(process.env.MAX_PLAYERS) || 16,
        public: process.env.PUBLIC === 'false' ? false : true,
        geo: {
            code: process.env.GEO_CODE || "eg",
            lat: parseFloat(process.env.GEO_LAT) || 30.0444,
            lon: parseFloat(process.env.GEO_LON) || 31.2357
        },
        token: process.env.HAXBALL_TOKEN || "thr1.AAAAAGiiB9wGRHVJ7oMR6g.RThbhoe2xHc"
    },

    // Discord configuration
    DISCORD_CONFIG: {
        webhook: process.env.DISCORD_WEBHOOK || "",
        channelId: process.env.DISCORD_CHANNEL_ID || "",
        reportRoleId: process.env.DISCORD_REPORT_ROLE_ID || "",
        serverInvite: process.env.DISCORD_SERVER_INVITE || "https://discord.gg/R3Rtwqqhwm"
    },

    // Authentication
    OWNER_PASSWORD: process.env.OWNER_PASSWORD || "opopop",
    HAXBALL_TOKEN: process.env.HAXBALL_TOKEN || "thr1.AAAAAGiiB9wGRHVJ7oMR6g.RThbhoe2xHc",

    // Bot settings
    BOT_SETTINGS: {
        discordReminderInterval: parseInt(process.env.DISCORD_REMINDER_INTERVAL) || 180000, // 3 minutes
        autoJoinPreventionInterval: parseInt(process.env.AUTO_JOIN_PREVENTION_INTERVAL) || 1000, // 1 second
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
        maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 5,
        reconnectDelay: parseInt(process.env.RECONNECT_DELAY) || 30000 // 30 seconds
    },

    // Map settings
    MAP_SETTINGS: {
        defaultMap: process.env.DEFAULT_MAP || "classic",
        enableCustomMaps: process.env.ENABLE_CUSTOM_MAPS === 'true',
        timeLimit: parseInt(process.env.TIME_LIMIT) || 3,
        scoreLimit: parseInt(process.env.SCORE_LIMIT) || 3
    }
};

// Validate required environment variables
const requiredVars = ['HAXBALL_TOKEN'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please check your .env file or environment variables on Render');
    process.exit(1);
}

// Log configuration (without sensitive data)
console.log('⚙️ Bot Configuration:');
console.log(`   Room Name: ${config.ROOM_CONFIG.roomName}`);
console.log(`   Max Players: ${config.ROOM_CONFIG.maxPlayers}`);
console.log(`   Public: ${config.ROOM_CONFIG.public}`);
console.log(`   Location: ${config.ROOM_CONFIG.geo.code.toUpperCase()}`);
console.log(`   Discord Webhook: ${config.DISCORD_CONFIG.webhook ? '✅ Configured' : '❌ Not configured'}`);
console.log(`   Discord Invite: ${config.DISCORD_CONFIG.serverInvite}`);

module.exports = config;
