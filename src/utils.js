// 🎮 RHL TOURNAMENT - Utility Functions
// Helper functions for the bot

class Utils {
    constructor(bot) {
        this.bot = bot;
        this.room = bot.room;
        this.gameState = bot.gameState;
    }

    // Player role and permission utilities
    getPlayerRole(player) {
        // Check for club captain first (takes priority)
        for (let [clubName, captain] of this.gameState.clubCaptains) {
            if (captain === player.name) {
                if (this.gameState.owner && player.id === this.gameState.owner.id) {
                    return `👑 OWNER [${clubName}]`;
                }
                if (this.gameState.admins.has(player.id)) {
                    return `🛡️ ADMIN [${clubName}]`;
                }
                return `👨‍✈️ CAPTAIN [${clubName}]`;
            }
        }

        // Check other roles
        if (this.gameState.owner && player.id === this.gameState.owner.id) return "👑 OWNER";
        if (this.gameState.admins.has(player.id)) return "🛡️ ADMIN";

        // Check for club membership
        for (let [clubName, members] of this.gameState.clubs) {
            if (members.includes(player.name)) {
                return `⚽ [${clubName}]`;
            }
        }
        return "👤 PLAYER";
    }

    formatPlayerName(player) {
        const role = this.getPlayerRole(player);
        return `${role} ${player.name}`;
    }

    isOwner(player) {
        return this.gameState.owner && player.id === this.gameState.owner.id;
    }

    isAdmin(player) {
        return this.isOwner(player) || this.gameState.admins.has(player.id);
    }

    isSavedOwner(player) {
        return (
            (this.gameState.savedOwner && player.conn === this.gameState.savedOwner) ||
            (this.gameState.ownerName && player.name === this.gameState.ownerName)
        );
    }

    isSavedAdmin(player) {
        return (
            this.gameState.savedAdmins.has(player.name) &&
            (player.conn === this.gameState.savedAdmins.get(player.name) ||
                this.gameState.savedAdmins.get(player.name) === null)
        );
    }

    autoRestoreRanks(player) {
        // Restore owner automatically
        if (this.isSavedOwner(player)) {
            this.gameState.owner = player;
            this.room.setPlayerAdmin(player.id, true);
            this.room.sendAnnouncement(
                `👑 Welcome back, Owner ${player.name}!`,
                null,
                0xffd700,
                "bold"
            );

            this.gameState.savedOwner = player.conn;
            this.gameState.ownerName = player.name;

            this.bot.discord.sendWebhook({
                title: "👑 Owner Auto-Login",
                description: `**${player.name}** automatically restored as owner`,
                color: 0xffd700,
                timestamp: new Date().toISOString()
            });
            return true;
        }

        // Restore admin automatically
        if (this.isSavedAdmin(player)) {
            this.gameState.admins.add(player.id);
            this.room.setPlayerAdmin(player.id, true);
            this.room.sendAnnouncement(
                `🛡️ Welcome back, Admin ${player.name}!`,
                null,
                0x00ff00,
                "bold"
            );

            this.gameState.savedAdmins.set(player.name, player.conn);

            this.bot.discord.sendWebhook({
                title: "🛡️ Admin Auto-Login",
                description: `**${player.name}** automatically restored as admin`,
                color: 0x00ff00,
                timestamp: new Date().toISOString()
            });
            return true;
        }

        return false;
    }

    // Player statistics utilities
    getPlayerStats(playerName) {
        if (!this.gameState.playerStats.has(playerName)) {
            this.gameState.playerStats.set(playerName, {
                goals: 0,
                assists: 0,
                ownGoals: 0,
                wins: 0,
                losses: 0,
                mvps: 0,
                gamesPlayed: 0
            });
        }
        return this.gameState.playerStats.get(playerName);
    }

    getTopPlayers(stat = 'goals', limit = 5) {
        const players = Array.from(this.gameState.playerStats.entries());
        
        return players
            .sort((a, b) => b[1][stat] - a[1][stat])
            .slice(0, limit)
            .map(([name, stats]) => ({ name, ...stats }));
    }

    // Visual effects for game events
    createGoalEffect(player) {
        this.room.sendAnnouncement(
            `🎯⚡ GOAL! Amazing shot by ${player.name}! ⚡🎯`,
            null,
            0x00ff00,
            "bold",
            2
        );

        setTimeout(() => {
            this.room.sendAnnouncement(
                `🔥 ${player.name} is on fire! 🔥`,
                null,
                0xff6600,
                "bold",
                1
            );
        }, 1000);
    }

    createAssistEffect(player) {
        this.room.sendAnnouncement(
            `👊 Perfect assist by ${player.name}! 👊`,
            null,
            0x0066ff,
            "bold",
            1
        );
    }

    createOwnGoalEffect(player) {
        this.room.sendAnnouncement(
            `😂 Oops! Own goal by ${player.name}! 😂`,
            null,
            0xff0000,
            "bold",
            1
        );
    }

    // Team and club utilities
    getTeamPlayers(teamId) {
        return this.room.getPlayerList().filter(player => player.team === teamId);
    }

    getClubMembers(clubName) {
        return this.gameState.clubs.get(clubName) || [];
    }

    isClubCaptain(playerName, clubName) {
        return this.gameState.clubCaptains.get(clubName) === playerName;
    }

    findPlayerClub(playerName) {
        for (let [clubName, members] of this.gameState.clubs) {
            if (members.includes(playerName)) {
                return clubName;
            }
        }
        return null;
    }

    // Utility functions for room management
    clearAllTeams() {
        const players = this.room.getPlayerList();
        players.forEach(player => {
            if (player.team !== 0) {
                this.room.setPlayerTeam(player.id, 0);
            }
        });
    }

    kickAllPlayers(except = []) {
        const players = this.room.getPlayerList();
        players.forEach(player => {
            if (!except.includes(player.id) && !this.isAdmin(player)) {
                this.room.kickPlayer(player.id, "Room cleared by admin", false);
            }
        });
    }

    // String and formatting utilities
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatNumber(num) {
        return num.toLocaleString();
    }

    // Validation utilities
    isValidPlayerName(name) {
        return name && name.length >= 1 && name.length <= 25;
    }

    isValidClubName(name) {
        return name && name.length >= 2 && name.length <= 20 && /^[a-zA-Z0-9\s]+$/.test(name);
    }

    // Random utilities
    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Debug and logging utilities
    logPlayerAction(player, action, details = '') {
        const timestamp = new Date().toISOString();
        const role = this.getPlayerRole(player);
        console.log(`[${timestamp}] ${role} ${player.name} (ID: ${player.id}): ${action} ${details}`);
    }

    dumpGameState() {
        console.log('=== GAME STATE DUMP ===');
        console.log('Owner:', this.gameState.ownerName);
        console.log('Saved Admins:', Array.from(this.gameState.savedAdmins.keys()));
        console.log('Active Admins:', Array.from(this.gameState.admins));
        console.log('Clubs:', Array.from(this.gameState.clubs.entries()));
        console.log('Match Stats:', this.gameState.matchStats);
        console.log('=====================');
    }

    // Performance utilities
    measureExecutionTime(func, label = '') {
        const start = Date.now();
        const result = func();
        const end = Date.now();
        console.log(`⏱️ ${label} execution time: ${end - start}ms`);
        return result;
    }

    // Memory usage tracking
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
            external: Math.round(usage.external / 1024 / 1024 * 100) / 100
        };
    }
}

module.exports = Utils;
