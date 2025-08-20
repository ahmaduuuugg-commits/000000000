// 🎮 RHL TOURNAMENT - Game Events Handler
// Handles all Haxball room events

class GameEvents {
    constructor(bot) {
        this.bot = bot;
        this.room = bot.room;
        this.gameState = bot.gameState;
        this.utils = bot.utils;
        this.discord = bot.discord;
        this.commands = bot.commands;
    }

    onPlayerJoin(player) {
        console.log(`📥 ${player.name} joined (ID: ${player.id}, Conn: ${player.conn})`);
        
        // Try to auto-restore admin/owner privileges
        const restored = this.utils.autoRestoreRanks(player);
        
        if (!restored) {
            // Welcome message for regular players
            const welcomeMsg = 
                `🎮 Welcome ${this.utils.formatPlayerName(player)}!\n` +
                `📋 Type !help for commands | 📢 Join Discord: ${this.bot.config.DISCORD_CONFIG.serverInvite}\n` +
                `⚠️ Wait for admin to assign you to a team`;
            
            this.room.sendAnnouncement(welcomeMsg, player.id, 0x00ff00, "bold");
        }

        // Send Discord notification for new joins
        this.discord.sendWebhook({
            title: "📥 Player Joined",
            description: `**${player.name}** joined the room`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Player ID", value: player.id.toString(), inline: true },
                { name: "Role", value: this.utils.getPlayerRole(player), inline: true }
            ]
        });

        // Update player stats entry
        this.utils.getPlayerStats(player.name);
    }

    onPlayerLeave(player) {
        console.log(`📤 ${player.name} left (ID: ${player.id})`);
        
        // Clean up tracking
        this.bot.removePlayerTracking(player.id);
        
        // Remove from active admin set (but keep in saved admins)
        this.gameState.admins.delete(player.id);
        
        // Clear owner if owner leaves (but keep saved owner)
        if (this.gameState.owner && player.id === this.gameState.owner.id) {
            this.gameState.owner = null;
        }

        // Send Discord notification
        this.discord.sendWebhook({
            title: "📤 Player Left",
            description: `**${player.name}** left the room`,
            color: 0xff6600,
            timestamp: new Date().toISOString()
        });

        // Announce in room
        this.room.sendAnnouncement(
            `👋 ${this.utils.formatPlayerName(player)} left the room`,
            null,
            0xcccccc
        );
    }

    onPlayerChat(player, message) {
        console.log(`💬 ${player.name}: ${message}`);
        
        // Process commands
        if (message.startsWith('!')) {
            return this.commands.processCommand(player, message);
        }

        // Log chat to Discord (optional - can be enabled/disabled)
        if (this.bot.config.DISCORD_CONFIG.logChat) {
            this.discord.sendWebhook({
                title: "💬 Chat Message",
                description: `**${player.name}**: ${message}`,
                color: 0x7289da,
                timestamp: new Date().toISOString()
            });
        }

        return false; // Don't block regular chat
    }

    onPlayerTeamChange(changedPlayer, byPlayer) {
        if (byPlayer && this.utils.isAdmin(byPlayer)) {
            // Mark as manually moved by admin
            this.bot.markAsManuallyMoved(changedPlayer.id);
            
            const teamNames = ["Spectators", "Red Team", "Blue Team"];
            const teamName = teamNames[changedPlayer.team] || "Unknown";
            
            this.room.sendAnnouncement(
                `🔄 ${changedPlayer.name} moved to ${teamName} by ${byPlayer.name}`,
                null,
                changedPlayer.team === 1 ? 0xff0000 : changedPlayer.team === 2 ? 0x0000ff : 0xcccccc
            );

            console.log(`🔄 ${changedPlayer.name} moved to team ${changedPlayer.team} by ${byPlayer.name}`);
        }
    }

    onTeamGoal(team) {
        const players = this.room.getPlayerList();
        const ballPosition = this.room.getBallPosition();
        
        // Determine goal scorer and assist
        const { scorer, assistant } = this.determineGoalScorerAndAssist(team, players);
        
        if (scorer) {
            // Update statistics
            const scorerStats = this.utils.getPlayerStats(scorer.name);
            
            if (scorer.team === team) {
                // Regular goal
                scorerStats.goals++;
                this.gameState.matchStats.goalScorers.push(scorer.name);
                this.utils.createGoalEffect(scorer);
                
                // Handle assist
                if (assistant && assistant.id !== scorer.id) {
                    const assistantStats = this.utils.getPlayerStats(assistant.name);
                    assistantStats.assists++;
                    this.gameState.matchStats.assists.push(assistant.name);
                    this.utils.createAssistEffect(assistant);
                }
            } else {
                // Own goal
                scorerStats.ownGoals++;
                this.utils.createOwnGoalEffect(scorer);
            }

            // Update match stats
            if (team === 1) {
                this.gameState.matchStats.redGoals++;
            } else {
                this.gameState.matchStats.blueGoals++;
            }

            // Send Discord notification
            const goalType = scorer.team === team ? "Goal" : "Own Goal";
            const assistText = assistant && assistant.id !== scorer.id ? ` (Assist: ${assistant.name})` : "";
            
            this.discord.sendWebhook({
                title: `⚽ ${goalType}!`,
                description: `**${scorer.name}** scored for ${team === 1 ? 'Red' : 'Blue'} team${assistText}`,
                color: team === 1 ? 0xff0000 : 0x0000ff,
                timestamp: new Date().toISOString(),
                fields: [
                    { name: "Score", value: `🔴 ${this.gameState.matchStats.redGoals} - ${this.gameState.matchStats.blueGoals} 🔵`, inline: true }
                ]
            });

            console.log(`⚽ Goal by ${scorer.name} for team ${team}${assistText}`);
        }
    }

    onGameStart(byPlayer) {
        console.log(`🚀 Game started by ${byPlayer ? byPlayer.name : 'System'}`);
        
        // Reset match stats
        this.gameState.matchStats = {
            redGoals: 0,
            blueGoals: 0,
            goalScorers: [],
            assists: [],
            mvp: null
        };

        // Reset ball tracker
        this.gameState.ballTracker = {
            lastTouchPlayer: null,
            lastTouchTime: 0,
            lastTouchTeam: 0,
            ballHistory: []
        };

        this.room.sendAnnouncement(
            `🚀 Game started! Good luck to both teams! 🍀`,
            null,
            0x00ff00,
            "bold",
            2
        );

        // Send Discord notification
        this.discord.sendWebhook({
            title: "🚀 Game Started",
            description: `Match started by **${byPlayer ? byPlayer.name : 'System'}**`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Red Team", value: this.getTeamPlayers(1), inline: true },
                { name: "Blue Team", value: this.getTeamPlayers(2), inline: true }
            ]
        });
    }

    onGameStop(byPlayer) {
        console.log(`🛑 Game stopped by ${byPlayer ? byPlayer.name : 'System'}`);
        
        const scores = this.room.getScores();
        if (scores) {
            this.processGameEnd(scores);
        }

        this.room.sendAnnouncement(
            `🛑 Game stopped!`,
            null,
            0xff0000,
            "bold"
        );

        // Send Discord notification
        this.discord.sendWebhook({
            title: "🛑 Game Stopped",
            description: `Match stopped by **${byPlayer ? byPlayer.name : 'System'}**`,
            color: 0xff0000,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Final Score", value: `🔴 ${this.gameState.matchStats.redGoals} - ${this.gameState.matchStats.blueGoals} 🔵`, inline: true }
            ]
        });
    }

    onGamePause(byPlayer) {
        console.log(`⏸️ Game paused by ${byPlayer.name}`);
        
        this.room.sendAnnouncement(
            `⏸️ Game paused by ${byPlayer.name}`,
            null,
            0xffaa00,
            "bold"
        );
    }

    onGameUnpause(byPlayer) {
        console.log(`▶️ Game unpaused by ${byPlayer.name}`);
        
        this.room.sendAnnouncement(
            `▶️ Game resumed by ${byPlayer.name}`,
            null,
            0x00ff00,
            "bold"
        );
    }

    onPlayerBallKick(player) {
        // Update ball tracker for assist detection
        this.gameState.ballTracker.lastTouchPlayer = player;
        this.gameState.ballTracker.lastTouchTime = Date.now();
        this.gameState.ballTracker.lastTouchTeam = player.team;
        
        // Keep ball history for advanced assist detection
        this.gameState.ballTracker.ballHistory.push({
            player: player,
            time: Date.now(),
            team: player.team
        });

        // Keep only last 10 touches
        if (this.gameState.ballTracker.ballHistory.length > 10) {
            this.gameState.ballTracker.ballHistory.shift();
        }
    }

    onPlayerAdminChange(changedPlayer, byPlayer) {
        if (changedPlayer.admin) {
            console.log(`🛡️ ${changedPlayer.name} given admin by ${byPlayer ? byPlayer.name : 'System'}`);
        } else {
            console.log(`❌ ${changedPlayer.name} admin removed by ${byPlayer ? byPlayer.name : 'System'}`);
        }
    }

    // Helper methods
    determineGoalScorerAndAssist(team, players) {
        const ballTracker = this.gameState.ballTracker;
        
        // Get recent ball touches
        const recentTouches = ballTracker.ballHistory
            .filter(touch => Date.now() - touch.time < 5000) // Last 5 seconds
            .reverse(); // Most recent first

        let scorer = null;
        let assistant = null;

        // Find the last player who touched the ball
        for (const touch of recentTouches) {
            const touchPlayer = players.find(p => p.id === touch.player.id);
            if (touchPlayer && touchPlayer.team !== 0) { // Must be in a team
                if (!scorer) {
                    scorer = touchPlayer;
                } else if (!assistant && touchPlayer.id !== scorer.id && touchPlayer.team === scorer.team) {
                    assistant = touchPlayer;
                    break;
                }
            }
        }

        return { scorer, assistant };
    }

    getTeamPlayers(team) {
        const players = this.room.getPlayerList().filter(p => p.team === team);
        return players.length > 0 ? players.map(p => p.name).join(', ') : 'No players';
    }

    processGameEnd(scores) {
        // Update player statistics
        const redPlayers = this.room.getPlayerList().filter(p => p.team === 1);
        const bluePlayers = this.room.getPlayerList().filter(p => p.team === 2);

        const redWon = scores.red > scores.blue;
        const blueWon = scores.blue > scores.red;

        // Update win/loss stats
        if (redWon) {
            redPlayers.forEach(player => {
                const stats = this.utils.getPlayerStats(player.name);
                stats.wins++;
                stats.gamesPlayed++;
            });
            bluePlayers.forEach(player => {
                const stats = this.utils.getPlayerStats(player.name);
                stats.losses++;
                stats.gamesPlayed++;
            });
        } else if (blueWon) {
            bluePlayers.forEach(player => {
                const stats = this.utils.getPlayerStats(player.name);
                stats.wins++;
                stats.gamesPlayed++;
            });
            redPlayers.forEach(player => {
                const stats = this.utils.getPlayerStats(player.name);
                stats.losses++;
                stats.gamesPlayed++;
            });
        } else {
            // Draw - count as games played but no wins/losses
            [...redPlayers, ...bluePlayers].forEach(player => {
                const stats = this.utils.getPlayerStats(player.name);
                stats.gamesPlayed++;
            });
        }

        // Determine MVP (most goals + assists)
        this.determineMVP([...redPlayers, ...bluePlayers]);
    }

    determineMVP(players) {
        let mvp = null;
        let highestScore = 0;

        players.forEach(player => {
            const goals = this.gameState.matchStats.goalScorers.filter(name => name === player.name).length;
            const assists = this.gameState.matchStats.assists.filter(name => name === player.name).length;
            const totalScore = goals * 2 + assists; // Goals worth 2 points, assists worth 1

            if (totalScore > highestScore) {
                highestScore = totalScore;
                mvp = player;
            }
        });

        if (mvp && highestScore > 0) {
            this.gameState.matchStats.mvp = mvp.name;
            const mvpStats = this.utils.getPlayerStats(mvp.name);
            mvpStats.mvps++;

            this.room.sendAnnouncement(
                `🌟 MVP: ${mvp.name} (${this.gameState.matchStats.goalScorers.filter(n => n === mvp.name).length} goals, ${this.gameState.matchStats.assists.filter(n => n === mvp.name).length} assists)`,
                null,
                0xffd700,
                "bold",
                2
            );
        }
    }
}

module.exports = GameEvents;
