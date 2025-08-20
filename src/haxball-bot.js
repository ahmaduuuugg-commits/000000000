// 🎮 RHL TOURNAMENT - Main Haxball Bot Class
// This file contains the core bot functionality

const fetch = require('node-fetch');
const config = require('./config');
const Commands = require('./commands');
const GameEvents = require('./game-events');
const Discord = require('./discord');
const Utils = require('./utils');

class HaxballBot {
    constructor() {
        this.room = null;
        this.config = config;
        this.gameState = {
            owner: null,
            admins: new Set(),
            savedAdmins: new Map(),
            savedOwner: null,
            ownerName: null,
            clubs: new Map(),
            clubCaptains: new Map(),
            playerStats: new Map(),
            currentMatch: null,
            lastDiscordReminder: 0,
            matchStats: {
                redGoals: 0,
                blueGoals: 0,
                goalScorers: [],
                assists: [],
                mvp: null
            },
            ballTracker: {
                lastTouchPlayer: null,
                lastTouchTime: 0,
                lastTouchTeam: 0,
                ballHistory: []
            }
        };
        
        // Track manually moved players for auto-join prevention
        this.manuallyMovedPlayers = new Set();
        
        // Initialize modules
        this.commands = new Commands(this);
        this.gameEvents = new GameEvents(this);
        this.discord = new Discord(this);
        this.utils = new Utils(this);
    }

    static getInstance() {
        if (!HaxballBot.instance) {
            HaxballBot.instance = new HaxballBot();
        }
        return HaxballBot.instance;
    }

    static initialize() {
        const bot = HaxballBot.getInstance();
        return bot.start();
    }

    async start() {
        try {
            console.log('🎮 Starting RHL Tournament Bot...');
            
            // Validate configuration
            if (!this.config.HAXBALL_TOKEN) {
                throw new Error('HAXBALL_TOKEN is required');
            }

            // Get HBInit from Haxball API
            const HBInit = await this.getHBInit();
            
            // Initialize room
            this.room = HBInit(this.config.ROOM_CONFIG);
            
            if (!this.room) {
                throw new Error('Failed to create Haxball room');
            }

            console.log('✅ Room initialized successfully');
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Start background tasks
            this.startBackgroundTasks();
            
            // Send initial Discord notification
            await this.discord.sendWebhook({
                title: "🎮 RHL TOURNAMENT Room Started",
                description: "Tournament room is now online and ready for players!",
                color: 0x00ff00,
                timestamp: new Date().toISOString(),
                fields: [
                    { name: "Room Name", value: this.config.ROOM_CONFIG.roomName, inline: true },
                    { name: "Max Players", value: this.config.ROOM_CONFIG.maxPlayers.toString(), inline: true },
                    { name: "Location", value: "Egypt 🇪🇬", inline: true }
                ]
            });

            console.log(`🏆 ${this.config.ROOM_CONFIG.roomName} is now live!`);
            return this;
            
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            
            // Retry after 30 seconds
            console.log('🔄 Retrying in 30 seconds...');
            setTimeout(() => {
                this.start();
            }, 30000);
            
            throw error;
        }
    }

    async getHBInit() {
        // In a real Haxball headless environment, HBInit would be globally available
        if (typeof HBInit !== 'undefined') {
            return HBInit;
        }

        // Try to load from DOM first (browser environment)
        if (typeof window !== 'undefined' && window.HBInit) {
            return window.HBInit;
        }
        
        // Create JSDOM environment and load Haxball API
        const { JSDOM } = require('jsdom');
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        
        console.log('🌐 Loading Haxball Headless API...');
        
        try {
            // Fetch the Haxball headless script
            const response = await fetch('https://www.haxball.com/headless');
            const html = await response.text();
            
            // Create DOM environment
            const dom = new JSDOM(html, {
                runScripts: "dangerously",
                resources: "usable",
                pretendToBeVisual: true
            });
            
            // Wait for HBInit to be available
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout loading Haxball API'));
                }, 30000);
                
                const checkHBInit = () => {
                    if (dom.window.HBInit) {
                        clearTimeout(timeout);
                        console.log('✅ Haxball API loaded successfully');
                        resolve(dom.window.HBInit);
                    } else {
                        setTimeout(checkHBInit, 100);
                    }
                };
                
                checkHBInit();
            });
            
        } catch (error) {
            console.error('❌ Failed to load Haxball API:', error.message);
            console.log('🔧 Using mock room for development...');
            
            // Return a mock HBInit for development/testing
            return this.createMockHBInit();
        }
    }

    createMockHBInit() {
        return (config) => {
            console.log('🎭 Creating mock Haxball room for development...');
            
            return {
                // Mock room methods
                sendAnnouncement: (msg, playerId, color, style, sound) => {
                    console.log(`📢 [MOCK] ${msg}`);
                },
                
                getPlayerList: () => {
                    return []; // Empty player list for now
                },
                
                getMaxPlayers: () => config.maxPlayers,
                
                setPlayerTeam: (playerId, team) => {
                    console.log(`👥 [MOCK] Player ${playerId} moved to team ${team}`);
                },
                
                kickPlayer: (playerId, reason, ban) => {
                    console.log(`👢 [MOCK] Player ${playerId} kicked: ${reason}`);
                },
                
                startGame: () => {
                    console.log('🚀 [MOCK] Game started');
                },
                
                stopGame: () => {
                    console.log('🛑 [MOCK] Game stopped');
                },
                
                pauseGame: (pause) => {
                    console.log(`⏸️ [MOCK] Game ${pause ? 'paused' : 'unpaused'}`);
                },
                
                getBallPosition: () => ({ x: 0, y: 0 }),
                
                getScores: () => ({ red: 0, blue: 0, time: 0, timeLimit: config.timeLimit, scoreLimit: config.scoreLimit }),
                
                // Mock event handlers (will be overridden)
                onPlayerJoin: null,
                onPlayerLeave: null,
                onPlayerChat: null,
                onPlayerTeamChange: null,
                onTeamGoal: null,
                onGameStart: null,
                onGameStop: null,
                onPlayerBallKick: null,
                onPlayerActivity: null,
                onGameTick: null,
                onRoomLink: null
            };
        };
    }

    setupEventHandlers() {
        console.log('🔧 Setting up event handlers...');
        
        // Player join event
        this.room.onPlayerJoin = (player) => {
            this.gameEvents.onPlayerJoin(player);
        };

        // Player leave event
        this.room.onPlayerLeave = (player) => {
            this.gameEvents.onPlayerLeave(player);
        };

        // Player chat event
        this.room.onPlayerChat = (player, message) => {
            return this.gameEvents.onPlayerChat(player, message);
        };

        // Team change event
        this.room.onPlayerTeamChange = (changedPlayer, byPlayer) => {
            this.gameEvents.onPlayerTeamChange(changedPlayer, byPlayer);
        };

        // Goal scored event
        this.room.onTeamGoal = (team) => {
            this.gameEvents.onTeamGoal(team);
        };

        // Game start event
        this.room.onGameStart = (byPlayer) => {
            this.gameEvents.onGameStart(byPlayer);
        };

        // Game stop event
        this.room.onGameStop = (byPlayer) => {
            this.gameEvents.onGameStop(byPlayer);
        };

        // Game pause event
        this.room.onGamePause = (byPlayer) => {
            this.gameEvents.onGamePause(byPlayer);
        };

        // Game unpause event
        this.room.onGameUnpause = (byPlayer) => {
            this.gameEvents.onGameUnpause(byPlayer);
        };

        // Position update event (for ball tracking)
        this.room.onPlayerBallKick = (player) => {
            this.gameEvents.onPlayerBallKick(player);
        };

        // Admin change event
        this.room.onPlayerAdminChange = (changedPlayer, byPlayer) => {
            this.gameEvents.onPlayerAdminChange(changedPlayer, byPlayer);
        };

        console.log('✅ Event handlers set up successfully');
    }

    startBackgroundTasks() {
        console.log('⏰ Starting background tasks...');
        
        // Discord reminder every 3 minutes
        setInterval(() => {
            this.sendDiscordReminder();
        }, 180000);

        // Auto-join prevention check every 1 second
        setInterval(() => {
            this.preventAutoJoinForNewPlayers();
        }, 1000);

        // Health check every 30 seconds
        setInterval(() => {
            this.healthCheck();
        }, 30000);

        console.log('✅ Background tasks started');
    }

    sendDiscordReminder() {
        const now = Date.now();
        if (now - this.gameState.lastDiscordReminder >= 180000) { // 3 minutes
            this.room.sendAnnouncement(
                `📢 Join our Discord server: ${this.config.DISCORD_CONFIG.serverInvite}`,
                null,
                0x7289da,
                "bold"
            );
            this.gameState.lastDiscordReminder = now;
        }
    }

    preventAutoJoinForNewPlayers() {
        if (!this.room) return;
        
        try {
            const players = this.room.getPlayerList();
            players.forEach(player => {
                // Only prevent auto-join for players who haven't been manually moved by admin
                if (player.team !== 0 && !this.utils.isAdmin(player) && !this.manuallyMovedPlayers.has(player.id)) {
                    // Move to spectators only if they auto-joined
                    this.room.setPlayerTeam(player.id, 0);
                    this.room.sendAnnouncement(
                        `⚠️ ${player.name} moved to spectators. Wait for admin to assign you to a team.`,
                        player.id,
                        0xff6600,
                        "normal"
                    );
                }
            });
        } catch (error) {
            console.error('Error in preventAutoJoinForNewPlayers:', error);
        }
    }

    healthCheck() {
        if (!this.room) {
            console.log('⚠️ Room not active, attempting restart...');
            this.start();
        }
    }

    // Mark players as manually moved when admin moves them
    markAsManuallyMoved(playerId) {
        this.manuallyMovedPlayers.add(playerId);
        console.log(`Player ${playerId} marked as manually moved`);
    }

    // Remove player from tracking when they leave
    removePlayerTracking(playerId) {
        this.manuallyMovedPlayers.delete(playerId);
    }
}

module.exports = HaxballBot;
