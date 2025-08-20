// 🎮 RHL TOURNAMENT - Discord Integration
// Handles Discord webhook notifications

const fetch = require('node-fetch');

class Discord {
    constructor(bot) {
        this.bot = bot;
        this.config = bot.config.DISCORD_CONFIG;
        this.webhookUrl = this.config.webhook;
        
        // Rate limiting
        this.lastWebhookTime = 0;
        this.webhookCooldown = 1000; // 1 second between webhooks
        this.webhookQueue = [];
        this.isProcessingQueue = false;
    }

    async sendWebhook(embed) {
        // Validate webhook configuration
        if (!this.webhookUrl || 
            this.webhookUrl.includes("PUT_YOUR") || 
            !this.webhookUrl.includes("discord.com")) {
            console.log('⚠️ Discord webhook not configured, skipping notification');
            return false;
        }

        // Add to queue to handle rate limiting
        return new Promise((resolve) => {
            this.webhookQueue.push({ embed, resolve });
            this.processWebhookQueue();
        });
    }

    async processWebhookQueue() {
        if (this.isProcessingQueue || this.webhookQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.webhookQueue.length > 0) {
            const { embed, resolve } = this.webhookQueue.shift();
            
            // Respect rate limiting
            const now = Date.now();
            const timeSinceLastWebhook = now - this.lastWebhookTime;
            
            if (timeSinceLastWebhook < this.webhookCooldown) {
                await this.sleep(this.webhookCooldown - timeSinceLastWebhook);
            }

            try {
                const success = await this.sendWebhookImmediate(embed);
                resolve(success);
                this.lastWebhookTime = Date.now();
            } catch (error) {
                console.error('❌ Discord webhook error:', error);
                resolve(false);
            }

            // Small delay between webhooks
            await this.sleep(100);
        }

        this.isProcessingQueue = false;
    }

    async sendWebhookImmediate(embed) {
        try {
            // Enhance embed with bot info
            const enhancedEmbed = {
                ...embed,
                footer: {
                    text: "🎮 RHL Tournament Bot",
                    icon_url: "https://cdn.discordapp.com/emojis/995388267645448303.png"
                },
                thumbnail: embed.thumbnail || {
                    url: "https://www.haxball.com/favicon.ico"
                }
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    embeds: [enhancedEmbed],
                    username: "RHL Tournament Bot",
                    avatar_url: "https://www.haxball.com/favicon.ico"
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`✅ Discord webhook sent: ${embed.title}`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to send Discord webhook:`, error);
            return false;
        }
    }

    // Send specific types of notifications
    async sendPlayerJoinNotification(player) {
        return this.sendWebhook({
            title: "📥 Player Joined",
            description: `**${player.name}** joined the tournament room`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Player ID", value: player.id.toString(), inline: true },
                { name: "Connection", value: player.conn || "Unknown", inline: true }
            ]
        });
    }

    async sendPlayerLeaveNotification(player) {
        return this.sendWebhook({
            title: "📤 Player Left",
            description: `**${player.name}** left the tournament room`,
            color: 0xff6600,
            timestamp: new Date().toISOString()
        });
    }

    async sendGoalNotification(scorer, team, isOwnGoal = false, assistant = null) {
        const goalType = isOwnGoal ? "Own Goal" : "Goal";
        const assistText = assistant ? ` (Assist: ${assistant.name})` : "";
        
        return this.sendWebhook({
            title: `⚽ ${goalType}!`,
            description: `**${scorer.name}** scored for ${team === 1 ? 'Red' : 'Blue'} team${assistText}`,
            color: isOwnGoal ? 0xff4444 : (team === 1 ? 0xff0000 : 0x0000ff),
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Scorer", value: scorer.name, inline: true },
                { name: "Team", value: team === 1 ? "🔴 Red" : "🔵 Blue", inline: true },
                ...(assistant ? [{ name: "Assist", value: assistant.name, inline: true }] : [])
            ]
        });
    }

    async sendGameStartNotification(starter, redTeam, blueTeam) {
        return this.sendWebhook({
            title: "🚀 Game Started",
            description: `Tournament match started by **${starter ? starter.name : 'System'}**`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            fields: [
                { 
                    name: "🔴 Red Team", 
                    value: redTeam.length > 0 ? redTeam.map(p => p.name).join('\n') : 'No players', 
                    inline: true 
                },
                { 
                    name: "🔵 Blue Team", 
                    value: blueTeam.length > 0 ? blueTeam.map(p => p.name).join('\n') : 'No players', 
                    inline: true 
                }
            ]
        });
    }

    async sendGameEndNotification(redScore, blueScore, mvp = null, duration = null) {
        const winner = redScore > blueScore ? "🔴 Red Team" : 
                      blueScore > redScore ? "🔵 Blue Team" : "Draw";
        
        const fields = [
            { name: "Final Score", value: `🔴 ${redScore} - ${blueScore} 🔵`, inline: true },
            { name: "Winner", value: winner, inline: true }
        ];

        if (mvp) {
            fields.push({ name: "🌟 MVP", value: mvp, inline: true });
        }

        if (duration) {
            fields.push({ name: "⏱️ Duration", value: duration, inline: true });
        }

        return this.sendWebhook({
            title: "🏁 Game Ended",
            description: `Tournament match completed!`,
            color: winner.includes("Red") ? 0xff0000 : winner.includes("Blue") ? 0x0000ff : 0xffaa00,
            timestamp: new Date().toISOString(),
            fields: fields
        });
    }

    async sendAdminPromotionNotification(newAdmin, promoter) {
        return this.sendWebhook({
            title: "🛡️ New Admin",
            description: `**${newAdmin.name}** has been promoted to admin`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "New Admin", value: newAdmin.name, inline: true },
                { name: "Promoted By", value: promoter.name, inline: true }
            ]
        });
    }

    async sendClubCreationNotification(clubName, captainName, creator) {
        return this.sendWebhook({
            title: "⚽ New Club Created",
            description: `A new club has been created in the tournament`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Club Name", value: clubName, inline: true },
                { name: "Captain", value: captainName, inline: true },
                { name: "Created By", value: creator.name, inline: true }
            ]
        });
    }

    async sendErrorNotification(error, context = '') {
        return this.sendWebhook({
            title: "❌ Bot Error",
            description: `An error occurred in the tournament bot`,
            color: 0xff0000,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Error", value: error.message || 'Unknown error', inline: false },
                { name: "Context", value: context || 'No context provided', inline: false }
            ]
        });
    }

    async sendServerStatusNotification(status, uptime = null) {
        const color = status === 'online' ? 0x00ff00 : 
                     status === 'warning' ? 0xffaa00 : 0xff0000;
        
        const fields = [];
        if (uptime) {
            fields.push({ name: "⏰ Uptime", value: uptime, inline: true });
        }

        return this.sendWebhook({
            title: `🖥️ Server Status: ${status.toUpperCase()}`,
            description: `Tournament bot server status update`,
            color: color,
            timestamp: new Date().toISOString(),
            fields: fields
        });
    }

    // Utility methods
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    // Test webhook functionality
    async testWebhook() {
        return this.sendWebhook({
            title: "🧪 Webhook Test",
            description: "This is a test notification to verify Discord integration",
            color: 0x7289da,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Status", value: "✅ Working", inline: true },
                { name: "Bot Version", value: "1.0.0", inline: true }
            ]
        });
    }

    // Get webhook statistics
    getWebhookStats() {
        return {
            queueLength: this.webhookQueue.length,
            isProcessing: this.isProcessingQueue,
            lastSent: this.lastWebhookTime,
            cooldown: this.webhookCooldown
        };
    }
}

module.exports = Discord;
