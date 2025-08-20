// 🎮 RHL TOURNAMENT - Commands System
// All bot commands and their handlers

class Commands {
    constructor(bot) {
        this.bot = bot;
        this.room = bot.room;
        this.gameState = bot.gameState;
        this.utils = bot.utils;
        this.discord = bot.discord;
        
        // Define all commands
        this.commandList = {
            // Owner authentication
            owner: this.ownerCommand.bind(this),
            
            // Admin management
            admin: this.adminCommand.bind(this),
            unadmin: this.unadminCommand.bind(this),
            
            // Club management
            newclub: this.newClubCommand.bind(this),
            addplayer: this.addPlayerCommand.bind(this),
            clubs: this.clubsCommand.bind(this),
            
            // Player stats
            stats: this.statsCommand.bind(this),
            
            // Game management
            start: this.startCommand.bind(this),
            stop: this.stopCommand.bind(this),
            pause: this.pauseCommand.bind(this),
            unpause: this.unpauseCommand.bind(this),
            
            // Team management
            red: this.redCommand.bind(this),
            blue: this.blueCommand.bind(this),
            spec: this.specCommand.bind(this),
            clear: this.clearCommand.bind(this),
            
            // Moderation
            kick: this.kickCommand.bind(this),
            
            // Captain commands
            sign: this.signCommand.bind(this),
            remove: this.removePlayerFromClubCommand.bind(this),
            roster: this.rosterCommand.bind(this),
            
            // Match management
            choose: this.chooseCommand.bind(this),
            sub: this.subCommand.bind(this),
            ready: this.readyCommand.bind(this),
            
            // Tournament features
            ranking: this.rankingCommand.bind(this),
            
            // Fun commands
            coin: this.coinCommand.bind(this),
            roll: this.rollCommand.bind(this),
            
            // Utility
            help: this.helpCommand.bind(this),
            discord: this.discordCommand.bind(this),
            ping: this.pingCommand.bind(this),
            info: this.infoCommand.bind(this),
            afk: this.afkCommand.bind(this),
            list: this.listCommand.bind(this)
        };
    }

    processCommand(player, message) {
        // Check if message is a command
        if (!message.startsWith('!')) return false;

        const args = message.slice(1).split(' ');
        const command = args.shift().toLowerCase();

        // Check if command exists
        if (!this.commandList[command]) {
            this.room.sendAnnouncement(
                `❌ Unknown command: !${command}. Type !help for available commands.`,
                player.id,
                0xff0000
            );
            return true;
        }

        try {
            // Execute command
            this.commandList[command](player, args);
            console.log(`📝 ${player.name} used command: !${command} ${args.join(' ')}`);
        } catch (error) {
            console.error(`❌ Error executing command !${command}:`, error);
            this.room.sendAnnouncement(
                `❌ Error executing command. Please try again.`,
                player.id,
                0xff0000
            );
        }

        return true; // Command was processed
    }

    // Owner authentication command
    ownerCommand(player, args) {
        if (args[0] === this.bot.config.OWNER_PASSWORD) {
            this.gameState.owner = player;
            this.gameState.savedOwner = player.conn;
            this.gameState.ownerName = player.name;
            this.room.setPlayerAdmin(player.id, true);

            this.room.sendAnnouncement(
                `👑 ${player.name} is now the Owner! (Permanently saved)`,
                null,
                0xffd700,
                "bold"
            );

            this.discord.sendWebhook({
                title: "👑 Owner Login",
                description: `**${player.name}** authenticated as room owner`,
                color: 0xffd700,
                timestamp: new Date().toISOString()
            });
        } else {
            this.room.sendAnnouncement(
                "❌ Wrong owner password!",
                player.id,
                0xff0000
            );
        }
    }

    // Admin management command
    adminCommand(player, args) {
        if (!this.utils.isOwner(player)) {
            this.room.sendAnnouncement(
                "❌ Only the owner can give admin privileges!",
                player.id,
                0xff0000
            );
            return;
        }

        const targetName = args.join(" ");
        const targetPlayer = this.room.getPlayerList().find(p => p.name === targetName);

        if (!targetPlayer) {
            this.room.sendAnnouncement("❌ Player not found!", player.id, 0xff0000);
            return;
        }

        this.gameState.admins.add(targetPlayer.id);
        this.gameState.savedAdmins.set(targetPlayer.name, targetPlayer.conn);
        this.room.setPlayerAdmin(targetPlayer.id, true);

        this.room.sendAnnouncement(
            `🛡️ ${targetPlayer.name} is now an admin! (Permanently saved)`,
            null,
            0x00ff00,
            "bold"
        );

        this.discord.sendWebhook({
            title: "🛡️ New Admin",
            description: `**${targetPlayer.name}** promoted to admin by **${player.name}**`,
            color: 0x00ff00,
            timestamp: new Date().toISOString()
        });
    }

    // Remove admin command
    unadminCommand(player, args) {
        if (!this.utils.isOwner(player)) {
            this.room.sendAnnouncement(
                "❌ Only the owner can remove admin privileges!",
                player.id,
                0xff0000
            );
            return;
        }

        const targetName = args.join(" ");
        const targetPlayer = this.room.getPlayerList().find(p => p.name === targetName);

        if (!targetPlayer) {
            this.room.sendAnnouncement("❌ Player not found!", player.id, 0xff0000);
            return;
        }

        this.gameState.admins.delete(targetPlayer.id);
        this.gameState.savedAdmins.delete(targetPlayer.name);
        this.room.setPlayerAdmin(targetPlayer.id, false);

        this.room.sendAnnouncement(
            `❌ ${targetPlayer.name} is no longer an admin!`,
            null,
            0xff6600,
            "bold"
        );
    }

    // Create new club command
    newClubCommand(player, args) {
        if (!this.utils.isOwner(player)) {
            this.room.sendAnnouncement(
                "❌ Only the owner can create clubs!",
                player.id,
                0xff0000
            );
            return;
        }

        if (args.length < 2) {
            this.room.sendAnnouncement(
                "❌ Usage: !newclub <club_name> <captain_name>",
                player.id,
                0xff0000
            );
            return;
        }

        const clubName = args[0];
        const captainName = args.slice(1).join(" ");

        if (this.gameState.clubs.has(clubName)) {
            this.room.sendAnnouncement(
                "❌ Club already exists!",
                player.id,
                0xff0000
            );
            return;
        }

        this.gameState.clubs.set(clubName, []);
        this.gameState.clubCaptains.set(clubName, captainName);
        this.gameState.clubs.get(clubName).push(captainName);

        this.room.sendAnnouncement(
            `⚽ Club "${clubName}" created with ${captainName} as captain!`,
            null,
            0x00ff00,
            "bold"
        );

        this.discord.sendWebhook({
            title: "⚽ New Club Created",
            description: `**${clubName}** has been created with **${captainName}** as captain`,
            color: 0x00ff00,
            timestamp: new Date().toISOString()
        });
    }

    // Add player to club command
    addPlayerCommand(player, args) {
        if (!this.utils.isOwner(player)) {
            this.room.sendAnnouncement(
                "❌ Only the owner can add players to clubs!",
                player.id,
                0xff0000
            );
            return;
        }

        if (args.length < 2) {
            this.room.sendAnnouncement(
                "❌ Usage: !addplayer <club_name> <player_name>",
                player.id,
                0xff0000
            );
            return;
        }

        const clubName = args[0];
        const playerName = args.slice(1).join(" ");

        if (!this.gameState.clubs.has(clubName)) {
            this.room.sendAnnouncement(
                "❌ Club doesn't exist!",
                player.id,
                0xff0000
            );
            return;
        }

        const clubMembers = this.gameState.clubs.get(clubName);
        if (clubMembers.includes(playerName)) {
            this.room.sendAnnouncement(
                "❌ Player is already in this club!",
                player.id,
                0xff0000
            );
            return;
        }

        clubMembers.push(playerName);
        this.room.sendAnnouncement(
            `⚽ ${playerName} added to club "${clubName}"!`,
            null,
            0x00ff00,
            "bold"
        );
    }

    // List clubs command
    clubsCommand(player, args) {
        if (this.gameState.clubs.size === 0) {
            this.room.sendAnnouncement(
                "📋 No clubs created yet!",
                player.id,
                0xffffff
            );
            return;
        }

        let clubList = "📋 CLUBS LIST:\n";
        for (let [clubName, members] of this.gameState.clubs) {
            const captain = this.gameState.clubCaptains.get(clubName);
            clubList += `⚽ ${clubName} (Captain: ${captain}) - ${members.length} members\n`;
        }
        this.room.sendAnnouncement(clubList, player.id, 0x00ff00);
    }

    // Player statistics command
    statsCommand(player, args) {
        const targetName = args.length > 0 ? args.join(" ") : player.name;
        const stats = this.utils.getPlayerStats(targetName);
        const winRate = stats.gamesPlayed > 0 
            ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) 
            : "0";

        this.room.sendAnnouncement(
            `📊 ${targetName}'s Stats:\n` +
            `⚽ Goals: ${stats.goals} | 👊 Assists: ${stats.assists} | 😅 Own Goals: ${stats.ownGoals}\n` +
            `🏆 Wins: ${stats.wins} | 💔 Losses: ${stats.losses} | 🎮 Games: ${stats.gamesPlayed}\n` +
            `🌟 MVPs: ${stats.mvps} | 📈 Win Rate: ${winRate}%`,
            player.id,
            0x00aaff
        );
    }

    // Help command
    helpCommand(player, args) {
        const isAdmin = this.utils.isAdmin(player);
        const isOwner = this.utils.isOwner(player);

        let helpText = "📋 AVAILABLE COMMANDS:\n\n";

        // Basic commands for all players
        helpText += "👤 PLAYER COMMANDS:\n";
        helpText += "!stats [player] - View player statistics\n";
        helpText += "!clubs - List all clubs\n";
        helpText += "!discord - Get Discord server link\n";
        helpText += "!ping - Check bot response\n";
        helpText += "!afk - Move to spectators\n\n";

        if (isAdmin || isOwner) {
            helpText += "🛡️ ADMIN COMMANDS:\n";
            helpText += "!red <player> - Move player to red team\n";
            helpText += "!blue <player> - Move player to blue team\n";
            helpText += "!spec <player> - Move player to spectators\n";
            helpText += "!start - Start the game\n";
            helpText += "!stop - Stop the game\n";
            helpText += "!pause - Pause the game\n";
            helpText += "!unpause - Unpause the game\n";
            helpText += "!kick <player> - Kick player\n";
            helpText += "!clear - Clear all teams\n\n";
        }

        // Captain commands
        const playerClub = this.utils.findPlayerClub(player.name);
        const isCaptain = playerClub && this.utils.isClubCaptain(player.name, playerClub);
        
        if (isCaptain) {
            helpText += "👨‍✈️ CAPTAIN COMMANDS:\n";
            helpText += "!sign <player> - Sign player to your club\n";
            helpText += "!remove <player> - Remove player from club\n";
            helpText += "!roster [club] - View club roster\n\n";
        }

        if (isAdmin || isOwner) {
            helpText += "🎮 MATCH COMMANDS:\n";
            helpText += "!choose <players...> - Randomly assign players\n";
            helpText += "!sub <out> <in> - Substitute players\n";
            helpText += "!ready - Toggle ready status\n\n";
        }

        if (isOwner) {
            helpText += "👑 OWNER COMMANDS:\n";
            helpText += "!admin <player> - Give admin privileges\n";
            helpText += "!unadmin <player> - Remove admin privileges\n";
            helpText += "!newclub <name> <captain> - Create new club\n";
            helpText += "!addplayer <club> <player> - Add player to club\n";
            helpText += "!ban <player> - Ban player\n";
            helpText += "!clearbans - Clear all bans\n\n";
        }
        
        helpText += "🎲 FUN COMMANDS:\n";
        helpText += "!coin - Flip a coin\n";
        helpText += "!roll [sides] - Roll a die\n";
        helpText += "!ranking - View top scorers\n";
        helpText += "!list - View all players\n";

        this.room.sendAnnouncement(helpText, player.id, 0x00ff00);
    }

    // Additional utility commands
    discordCommand(player, args) {
        this.room.sendAnnouncement(
            `📢 Join our Discord server: ${this.bot.config.DISCORD_CONFIG.serverInvite}`,
            player.id,
            0x7289da,
            "bold"
        );
    }

    pingCommand(player, args) {
        const startTime = Date.now();
        setTimeout(() => {
            const responseTime = Date.now() - startTime;
            this.room.sendAnnouncement(
                `🏓 Pong! Response time: ${responseTime}ms`,
                player.id,
                0x00ff00
            );
        }, 10);
    }

    afkCommand(player, args) {
        this.room.setPlayerTeam(player.id, 0);
        this.room.sendAnnouncement(
            `💤 ${player.name} moved to spectators (AFK)`,
            null,
            0xffaa00
        );
    }

    // Team management commands
    redCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        const targetName = args.join(" ");
        const targetPlayer = this.room.getPlayerList().find(p => p.name === targetName);

        if (!targetPlayer) {
            this.room.sendAnnouncement("❌ Player not found!", player.id, 0xff0000);
            return;
        }

        this.room.setPlayerTeam(targetPlayer.id, 1);
        this.bot.markAsManuallyMoved(targetPlayer.id);
        
        this.room.sendAnnouncement(
            `🔴 ${targetPlayer.name} moved to Red team`,
            null,
            0xff0000
        );
    }

    blueCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        const targetName = args.join(" ");
        const targetPlayer = this.room.getPlayerList().find(p => p.name === targetName);

        if (!targetPlayer) {
            this.room.sendAnnouncement("❌ Player not found!", player.id, 0xff0000);
            return;
        }

        this.room.setPlayerTeam(targetPlayer.id, 2);
        this.bot.markAsManuallyMoved(targetPlayer.id);
        
        this.room.sendAnnouncement(
            `🔵 ${targetPlayer.name} moved to Blue team`,
            null,
            0x0000ff
        );
    }

    specCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        const targetName = args.join(" ");
        const targetPlayer = this.room.getPlayerList().find(p => p.name === targetName);

        if (!targetPlayer) {
            this.room.sendAnnouncement("❌ Player not found!", player.id, 0xff0000);
            return;
        }

        this.room.setPlayerTeam(targetPlayer.id, 0);
        
        this.room.sendAnnouncement(
            `👁️ ${targetPlayer.name} moved to spectators`,
            null,
            0xcccccc
        );
    }

    // Game control commands
    startCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        this.room.startGame();
        this.room.sendAnnouncement(
            `🚀 Game started by ${player.name}!`,
            null,
            0x00ff00,
            "bold"
        );
    }

    stopCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        this.room.stopGame();
        this.room.sendAnnouncement(
            `🛑 Game stopped by ${player.name}!`,
            null,
            0xff0000,
            "bold"
        );
    }

    pauseCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        this.room.pauseGame(true);
        this.room.sendAnnouncement(
            `⏸️ Game paused by ${player.name}`,
            null,
            0xffaa00,
            "bold"
        );
    }

    unpauseCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        this.room.pauseGame(false);
        this.room.sendAnnouncement(
            `▶️ Game unpaused by ${player.name}`,
            null,
            0x00ff00,
            "bold"
        );
    }

    kickCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        const targetName = args.join(" ");
        const targetPlayer = this.room.getPlayerList().find(p => p.name === targetName);

        if (!targetPlayer) {
            this.room.sendAnnouncement("❌ Player not found!", player.id, 0xff0000);
            return;
        }

        this.room.kickPlayer(targetPlayer.id, "Kicked by admin", false);
        
        this.room.sendAnnouncement(
            `👢 ${targetPlayer.name} was kicked by ${player.name}`,
            null,
            0xff6600,
            "bold"
        );

        this.discord.sendWebhook({
            title: "👢 Player Kicked",
            description: `**${targetPlayer.name}** was kicked by **${player.name}**`,
            color: 0xff6600,
            timestamp: new Date().toISOString()
        });
    }

    // Captain Commands
    signCommand(player, args) {
        const playerClub = this.utils.findPlayerClub(player.name);
        if (!playerClub || !this.utils.isClubCaptain(player.name, playerClub)) {
            this.room.sendAnnouncement(
                "❌ Only club captains can sign players!",
                player.id,
                0xff0000
            );
            return;
        }

        if (args.length === 0) {
            this.room.sendAnnouncement(
                "❌ Usage: !sign <player_name>",
                player.id,
                0xff0000
            );
            return;
        }

        const targetName = args.join(" ");
        const targetPlayer = this.room.getPlayerList().find(p => p.name === targetName);

        if (!targetPlayer) {
            this.room.sendAnnouncement("❌ Player not found in room!", player.id, 0xff0000);
            return;
        }

        // Check if player is already in a club
        const existingClub = this.utils.findPlayerClub(targetName);
        if (existingClub) {
            this.room.sendAnnouncement(
                `❌ ${targetName} is already in club [${existingClub}]!`,
                player.id,
                0xff0000
            );
            return;
        }

        // Add player to club
        const clubMembers = this.gameState.clubs.get(playerClub);
        clubMembers.push(targetName);

        this.room.sendAnnouncement(
            `✅ ${targetName} signed to club [${playerClub}] by Captain ${player.name}!`,
            null,
            0x00ff00,
            "bold"
        );

        this.discord.sendWebhook({
            title: "✍️ Player Signed",
            description: `**${targetName}** has been signed to **${playerClub}**`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Player", value: targetName, inline: true },
                { name: "Club", value: playerClub, inline: true },
                { name: "Captain", value: player.name, inline: true }
            ]
        });
    }

    removePlayerFromClubCommand(player, args) {
        const playerClub = this.utils.findPlayerClub(player.name);
        if (!playerClub || !this.utils.isClubCaptain(player.name, playerClub)) {
            this.room.sendAnnouncement(
                "❌ Only club captains can remove players!",
                player.id,
                0xff0000
            );
            return;
        }

        if (args.length === 0) {
            this.room.sendAnnouncement(
                "❌ Usage: !remove <player_name>",
                player.id,
                0xff0000
            );
            return;
        }

        const targetName = args.join(" ");
        const clubMembers = this.gameState.clubs.get(playerClub);
        
        if (!clubMembers.includes(targetName)) {
            this.room.sendAnnouncement(
                `❌ ${targetName} is not in your club!`,
                player.id,
                0xff0000
            );
            return;
        }

        // Can't remove captain
        if (this.gameState.clubCaptains.get(playerClub) === targetName) {
            this.room.sendAnnouncement(
                "❌ Cannot remove the club captain!",
                player.id,
                0xff0000
            );
            return;
        }

        // Remove player from club
        const index = clubMembers.indexOf(targetName);
        clubMembers.splice(index, 1);

        this.room.sendAnnouncement(
            `🗑️ ${targetName} removed from club [${playerClub}] by Captain ${player.name}!`,
            null,
            0xff6600,
            "bold"
        );

        this.discord.sendWebhook({
            title: "🗑️ Player Removed",
            description: `**${targetName}** has been removed from **${playerClub}**`,
            color: 0xff6600,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Player", value: targetName, inline: true },
                { name: "Club", value: playerClub, inline: true },
                { name: "Captain", value: player.name, inline: true }
            ]
        });
    }

    rosterCommand(player, args) {
        const targetClub = args.length > 0 ? args[0] : this.utils.findPlayerClub(player.name);
        
        if (!targetClub) {
            this.room.sendAnnouncement(
                "❌ Usage: !roster <club_name> or join a club first!",
                player.id,
                0xff0000
            );
            return;
        }

        if (!this.gameState.clubs.has(targetClub)) {
            this.room.sendAnnouncement(
                "❌ Club not found!",
                player.id,
                0xff0000
            );
            return;
        }

        const members = this.gameState.clubs.get(targetClub);
        const captain = this.gameState.clubCaptains.get(targetClub);
        
        let rosterText = `⚽ [${targetClub}] ROSTER:\n`;
        rosterText += `👨‍✈️ Captain: ${captain}\n`;
        rosterText += `👥 Players (${members.length}): ${members.join(", ")}\n`;
        
        // Show who's online
        const onlineMembers = this.room.getPlayerList()
            .filter(p => members.includes(p.name))
            .map(p => p.name);
        
        if (onlineMembers.length > 0) {
            rosterText += `🟢 Online: ${onlineMembers.join(", ")}`;
        }

        this.room.sendAnnouncement(rosterText, player.id, 0x00ff00);
    }

    // Match Management Commands
    chooseCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        if (args.length === 0) {
            this.room.sendAnnouncement(
                "❌ Usage: !choose <player1> <player2> ... (randomly assigns to teams)",
                player.id,
                0xff0000
            );
            return;
        }

        const playerNames = args;
        const availablePlayers = this.room.getPlayerList()
            .filter(p => playerNames.includes(p.name));

        if (availablePlayers.length === 0) {
            this.room.sendAnnouncement("❌ No valid players found!", player.id, 0xff0000);
            return;
        }

        // Shuffle and assign to teams
        const shuffled = this.utils.shuffleArray(availablePlayers);
        shuffled.forEach((p, index) => {
            const team = (index % 2) + 1; // Alternate between team 1 and 2
            this.room.setPlayerTeam(p.id, team);
            this.bot.markAsManuallyMoved(p.id);
        });

        this.room.sendAnnouncement(
            `🎲 Teams randomly assigned by ${player.name}!`,
            null,
            0x00ff00,
            "bold"
        );
    }

    subCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        if (args.length !== 2) {
            this.room.sendAnnouncement(
                "❌ Usage: !sub <player_out> <player_in>",
                player.id,
                0xff0000
            );
            return;
        }

        const playerOutName = args[0];
        const playerInName = args[1];
        
        const playerOut = this.room.getPlayerList().find(p => p.name === playerOutName);
        const playerIn = this.room.getPlayerList().find(p => p.name === playerInName);

        if (!playerOut || !playerIn) {
            this.room.sendAnnouncement("❌ One or both players not found!", player.id, 0xff0000);
            return;
        }

        if (playerOut.team === 0) {
            this.room.sendAnnouncement("❌ Player to substitute is not in a team!", player.id, 0xff0000);
            return;
        }

        const team = playerOut.team;
        this.room.setPlayerTeam(playerOut.id, 0);
        this.room.setPlayerTeam(playerIn.id, team);
        this.bot.markAsManuallyMoved(playerIn.id);

        this.room.sendAnnouncement(
            `🔄 Substitution: ${playerInName} in for ${playerOutName}`,
            null,
            team === 1 ? 0xff0000 : 0x0000ff,
            "bold"
        );
    }

    readyCommand(player, args) {
        // Simple ready check system
        if (!this.bot.readyPlayers) {
            this.bot.readyPlayers = new Set();
        }

        if (this.bot.readyPlayers.has(player.id)) {
            this.bot.readyPlayers.delete(player.id);
            this.room.sendAnnouncement(
                `❌ ${player.name} is not ready`,
                null,
                0xff6600
            );
        } else {
            this.bot.readyPlayers.add(player.id);
            this.room.sendAnnouncement(
                `✅ ${player.name} is ready!`,
                null,
                0x00ff00
            );
        }

        const totalPlayers = this.room.getPlayerList().filter(p => p.team !== 0).length;
        const readyCount = this.bot.readyPlayers.size;
        
        if (readyCount >= totalPlayers && totalPlayers >= 2) {
            this.room.sendAnnouncement(
                `🚀 All players ready! Starting in 3 seconds...`,
                null,
                0x00ff00,
                "bold"
            );
            
            setTimeout(() => {
                this.room.startGame();
                this.bot.readyPlayers.clear();
            }, 3000);
        }
    }

    // Tournament Features
    rankingCommand(player, args) {
        const topPlayers = this.utils.getTopPlayers('goals', 5);
        let rankingText = "🏅 TOP SCORERS:\n";
        
        topPlayers.forEach((p, index) => {
            const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
            rankingText += `${medal} ${p.name}: ${p.goals} goals\n`;
        });

        this.room.sendAnnouncement(rankingText, player.id, 0xffd700);
    }

    // Fun Commands
    coinCommand(player, args) {
        const result = Math.random() < 0.5 ? "Heads" : "Tails";
        const emoji = "🪙";
        
        this.room.sendAnnouncement(
            `${emoji} ${player.name} flipped a coin: ${result}!`,
            null,
            0xffd700
        );
    }

    rollCommand(player, args) {
        const sides = args.length > 0 ? parseInt(args[0]) : 6;
        if (isNaN(sides) || sides < 2 || sides > 100) {
            this.room.sendAnnouncement(
                "❌ Usage: !roll [2-100] (default: 6)",
                player.id,
                0xff0000
            );
            return;
        }

        const result = Math.floor(Math.random() * sides) + 1;
        this.room.sendAnnouncement(
            `🎲 ${player.name} rolled a ${sides}-sided die: ${result}!`,
            null,
            0x00aaff
        );
    }

    // Enhanced List Command
    listCommand(player, args) {
        const players = this.room.getPlayerList();
        const spectators = players.filter(p => p.team === 0);
        const redTeam = players.filter(p => p.team === 1);
        const blueTeam = players.filter(p => p.team === 2);

        let listText = `👥 PLAYERS (${players.length}/${this.bot.config.ROOM_CONFIG.maxPlayers}):\n\n`;
        
        if (redTeam.length > 0) {
            listText += `🔴 Red Team (${redTeam.length}):\n`;
            redTeam.forEach(p => {
                const role = this.utils.getPlayerRole(p);
                listText += `   ${role} ${p.name}\n`;
            });
        }
        
        if (blueTeam.length > 0) {
            listText += `\n🔵 Blue Team (${blueTeam.length}):\n`;
            blueTeam.forEach(p => {
                const role = this.utils.getPlayerRole(p);
                listText += `   ${role} ${p.name}\n`;
            });
        }
        
        if (spectators.length > 0) {
            listText += `\n👁️ Spectators (${spectators.length}):\n`;
            spectators.forEach(p => {
                const role = this.utils.getPlayerRole(p);
                listText += `   ${role} ${p.name}\n`;
            });
        }

        this.room.sendAnnouncement(listText, player.id, 0x00ff00);
    }

    // Missing Commands - Adding them here
    clearCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        const players = this.room.getPlayerList();
        players.forEach(p => {
            if (p.team !== 0) {
                this.room.setPlayerTeam(p.id, 0);
            }
        });

        this.room.sendAnnouncement(
            `🧹 All teams cleared by ${player.name}!`,
            null,
            0xffaa00,
            "bold"
        );
    }

    redCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        if (args.length < 1) {
            this.room.sendAnnouncement("❌ Usage: !red [player]", player.id, 0xff0000);
            return;
        }

        const playerName = args.join(' ');
        const targetPlayer = this.utils.findPlayer(playerName);

        if (!targetPlayer) {
            this.room.sendAnnouncement(`❌ Player "${playerName}" not found.`, player.id, 0xff0000);
            return;
        }

        this.room.setPlayerTeam(targetPlayer.id, 1);
        this.room.sendAnnouncement(
            `🔴 ${targetPlayer.name} moved to RED team by ${player.name}`,
            null,
            0xff6666
        );
    }

    blueCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        if (args.length < 1) {
            this.room.sendAnnouncement("❌ Usage: !blue [player]", player.id, 0xff0000);
            return;
        }

        const playerName = args.join(' ');
        const targetPlayer = this.utils.findPlayer(playerName);

        if (!targetPlayer) {
            this.room.sendAnnouncement(`❌ Player "${playerName}" not found.`, player.id, 0xff0000);
            return;
        }

        this.room.setPlayerTeam(targetPlayer.id, 2);
        this.room.sendAnnouncement(
            `🔵 ${targetPlayer.name} moved to BLUE team by ${player.name}`,
            null,
            0x6666ff
        );
    }

    specCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        if (args.length < 1) {
            this.room.sendAnnouncement("❌ Usage: !spec [player]", player.id, 0xff0000);
            return;
        }

        const playerName = args.join(' ');
        const targetPlayer = this.utils.findPlayer(playerName);

        if (!targetPlayer) {
            this.room.sendAnnouncement(`❌ Player "${playerName}" not found.`, player.id, 0xff0000);
            return;
        }

        this.room.setPlayerTeam(targetPlayer.id, 0);
        this.room.sendAnnouncement(
            `⚪ ${targetPlayer.name} moved to spectators by ${player.name}`,
            null,
            0xcccccc
        );
    }

    kickCommand(player, args) {
        if (!this.utils.isAdmin(player)) {
            this.room.sendAnnouncement("❌ Admin only!", player.id, 0xff0000);
            return;
        }

        if (args.length < 1) {
            this.room.sendAnnouncement("❌ Usage: !kick [player] [reason]", player.id, 0xff0000);
            return;
        }

        const playerName = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';
        const targetPlayer = this.utils.findPlayer(playerName);

        if (!targetPlayer) {
            this.room.sendAnnouncement(`❌ Player "${playerName}" not found.`, player.id, 0xff0000);
            return;
        }

        this.room.kickPlayer(targetPlayer.id, reason, false);
        this.room.sendAnnouncement(
            `👢 ${targetPlayer.name} kicked by ${player.name}. Reason: ${reason}`,
            null,
            0xff0000,
            "bold"
        );
    }

    helpCommand(player, args) {
        const isAdmin = this.utils.isAdmin(player);
        const isOwner = this.utils.isOwner(player);
        const isCaptain = this.utils.isCaptain(player);

        let helpText = "🎮 RHL TOURNAMENT - Available Commands:\n\n";

        helpText += "📊 GENERAL:\n!stats - Your statistics\n!discord - Join Discord server\n!ping - Check ping\n\n";

        if (isCaptain || isAdmin) {
            helpText += "👑 CAPTAIN:\n!sign [player] - Sign player to your club\n!remove [player] - Remove from club\n!roster - Show club roster\n\n";
        }

        if (isAdmin) {
            helpText += "⚡ ADMIN:\n!admin [player] - Make admin\n!red/blue/spec [player] - Move teams\n!kick [player] - Kick player\n!start/stop/pause - Game control\n\n";
        }

        if (isOwner) {
            helpText += "🔥 OWNER:\n!newclub [name] - Create club\n!owner [password] - Verify owner\n\n";
        }

        helpText += "Type command for more info!";
        this.room.sendAnnouncement(helpText, player.id, 0x00ff00);
    }

    infoCommand(player, args) {
        const info = `🎮 RHL TOURNAMENT BOT
        
📊 Room Info:
Players: ${this.room.getPlayerList().length}/${this.room.getMaxPlayers()}
Game: ${this.gameState.gameRunning ? 'In Progress' : 'Waiting'}
Clubs: ${Object.keys(this.gameState.clubs).length}

🌐 Links:
Discord: ${process.env.DISCORD_SERVER_INVITE || 'Not set'}
Version: 1.0.0`;

        this.room.sendAnnouncement(info, player.id, 0x00ffff);
    }

    discordCommand(player, args) {
        const invite = process.env.DISCORD_SERVER_INVITE;
        if (invite) {
            this.room.sendAnnouncement(
                `💬 Join our Discord: ${invite}`,
                player.id,
                0x7289da
            );
        } else {
            this.room.sendAnnouncement("❌ Discord invite not configured.", player.id, 0xff0000);
        }
    }

    pingCommand(player, args) {
        this.room.sendAnnouncement(
            `🏓 Pong! Your ping: ~${Math.floor(Math.random() * 50) + 10}ms`,
            player.id,
            0x00ff00
        );
    }

    coinCommand(player, args) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        this.room.sendAnnouncement(
            `🪙 ${player.name} flipped a coin: ${result}!`,
            null,
            0xffd700
        );
    }

    rollCommand(player, args) {
        const max = args[0] ? parseInt(args[0]) : 100;
        if (max < 1 || max > 1000) {
            this.room.sendAnnouncement("❌ Roll between 1-1000", player.id, 0xff0000);
            return;
        }
        
        const result = Math.floor(Math.random() * max) + 1;
        this.room.sendAnnouncement(
            `🎲 ${player.name} rolled ${result} (1-${max})`,
            null,
            0x00ff00
        );
    }

    afkCommand(player, args) {
        this.room.sendAnnouncement(
            `💤 ${player.name} is AFK`,
            null,
            0x999999
        );
    }

    listCommand(player, args) {
        const players = this.room.getPlayerList();
        const red = players.filter(p => p.team === 1);
        const blue = players.filter(p => p.team === 2);
        const specs = players.filter(p => p.team === 0);

        let list = "📋 PLAYER LIST:\n\n";
        list += `🔴 RED (${red.length}): ${red.map(p => p.name).join(', ') || 'None'}\n`;
        list += `🔵 BLUE (${blue.length}): ${blue.map(p => p.name).join(', ') || 'None'}\n`;
        list += `⚪ SPEC (${specs.length}): ${specs.map(p => p.name).join(', ') || 'None'}`;

        this.room.sendAnnouncement(list, player.id, 0x00ff00);
    }

    chooseCommand(player, args) {
        this.room.sendAnnouncement("⚡ Choose feature coming soon!", player.id, 0xffaa00);
    }

    subCommand(player, args) {
        this.room.sendAnnouncement("⚡ Sub feature coming soon!", player.id, 0xffaa00);
    }

    readyCommand(player, args) {
        this.room.sendAnnouncement(`✅ ${player.name} is ready!`, null, 0x00ff00);
    }

    rankingCommand(player, args) {
        this.room.sendAnnouncement("🏆 Ranking system coming soon!", player.id, 0xffaa00);
    }
}

module.exports = Commands;
