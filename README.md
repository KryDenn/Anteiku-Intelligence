[![Deepseek v3 & R1](https://img.shields.io/badge/Deepseek-v3%20%26%20R1-blue.svg)](https://deepseek.example.com)
[![Railway Deploy](https://img.shields.io/badge/Railway-Deploy-red.svg)](https://railway.app/)


# The bot Integrate two of the best models of DeepSeek. R1 && V3. 


Welcome to the **Anteiku Intelligence** repository! This project integrates powerful AI models for an enhanced user experience on Discord, leveraging the seamless deployment capabilities of Railway.

## Features

- 🤖 **AI Model Integration**: Combines the capabilities of Deepseek v3 and R1.
- 🚀 **Seamless Deployment**: Utilizes Railway for efficient and straightforward deployment.
- 🔍 **Advanced Search**: Enhanced search capabilities for better results within your Discord server.
- 🛠️ **Customization**: Easily customizable to fit your server's needs.

## Getting Started

### Prerequisites

Ensure you have the following before getting started:
- A [Railway](https://railway.app/) account
- Node.js and npm installed
- capacity to think

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/KryDenn/Anteiku-Intelligence.git
    cd Anteiku-Intelligence
    ```

2. **Install dependencies**:
    ```bash
    npm install axios, discord.js @discordjs/builders @discordjs/rest discord-api-types openai dotenv
    ```

3. **Set up environment variables**:
    Create a `.env` file in the root directory and add your configuration:
    ```env
    DISCORD_TOKEN=your_discord_token
    DEEPSEEK_API_KEY=your_deepseek_api_key
    CLIENT_ID=....Bot Client ID
    GUILD_ID=...Server ID
    ```

4. **Deploy to Railway**:
    Follow the [Railway deployment guide](https://docs.railway.app/deploy) to deploy your bot.

### Usage

Run the bot locally:
```bash
npm start
