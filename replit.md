# RHL Tournament - Haxball Bot

## Overview

RHL Tournament is a comprehensive Haxball tournament management bot designed for hosting professional-level football tournaments. The application provides a complete tournament ecosystem with club management, player statistics, Discord integration, and advanced game moderation features. Built as a Node.js application with Express server architecture, it serves as both a web service and a Haxball room bot that can manage tournaments, track player performance, and facilitate competitive gameplay.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
The application follows a modular Node.js architecture with Express.js serving as the web server framework. The core bot functionality is encapsulated in a singleton pattern through the `HaxballBot` class, ensuring single-instance room management. The architecture separates concerns into distinct modules:

- **Server Layer** (`server.js`): Express server providing REST endpoints for health checks and bot status monitoring
- **Bot Core** (`haxball-bot.js`): Main bot instance managing room state and coordinating all subsystems
- **Command System** (`commands.js`): Modular command handlers for tournament management, player operations, and administrative functions
- **Event Handling** (`game-events.js`): Real-time game event processing for player joins, leaves, goals, and match events
- **Utility Functions** (`utils.js`): Shared helper functions for player management, role checking, and formatting

### State Management
The bot maintains comprehensive game state including:
- Owner and admin privilege tracking with persistence
- Club registration and membership management
- Player statistics and performance metrics
- Match tracking with goal scorers, assists, and MVP calculation
- Ball possession tracking for advanced statistics

### Command Architecture
Commands are organized into categories with role-based access control:
- **Authentication Commands**: Owner verification and admin management
- **Club Management**: Club creation, player registration, roster management
- **Game Control**: Match start/stop, pause/resume, team assignment
- **Statistics**: Player stats, match history, performance tracking
- **Moderation**: Player kicking, team clearing, spectator management

### Integration Patterns
The bot uses dependency injection to share state and functionality between modules, with the main bot instance serving as the central coordinator. This design allows for easy testing and module isolation while maintaining shared state consistency.

## External Dependencies

### Core Runtime Dependencies
- **Express.js**: Web server framework for REST API endpoints and health monitoring
- **WebSocket (ws)**: Real-time communication with Haxball servers
- **CORS**: Cross-origin resource sharing for web API access
- **dotenv**: Environment variable management for configuration

### Web Scraping and DOM
- **jsdom**: DOM manipulation for Haxball integration and web scraping capabilities
- **node-fetch**: HTTP client for external API calls and webhook communications

### Third-Party Integrations
- **Discord Webhooks**: Tournament notifications, match results, and player activity reporting
- **Haxball API**: Room creation, player management, and game state synchronization through official Haxball tokens

### Configuration Management
Environment-based configuration supporting:
- Haxball room settings (name, capacity, geography, tokens)
- Discord integration (webhooks, channels, role mentions)
- Bot behavior settings (intervals, reconnection logic, rate limiting)
- Map and game rule configuration (time limits, score limits, custom maps)

### Deployment Architecture
Designed for cloud deployment with health check endpoints for monitoring services. The application includes automatic reconnection logic, rate limiting for external API calls, and graceful error handling for production environments.