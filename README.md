# 🤖 Advanced WhatsApp Bot

A powerful AI-driven WhatsApp bot built with Node.js that integrates Stability AI for image generation, Mistral AI for intelligent conversations, and includes a smart reminder system. Designed for easy deployment on Vercel with SendPulse WhatsApp integration.

## ✨ Features

### 🎨 AI Image Generation
- **Stability AI Integration**: Generate high-quality images from text descriptions
- **Smart Prompt Enhancement**: Uses Mistral AI to improve image prompts
- **Multiple Image Styles**: Support for various artistic styles and formats
- **Rate Limiting**: Daily limits to prevent abuse

### 🧠 Intelligent Conversations
- **Mistral AI Integration**: Advanced AI conversations with context awareness
- **Natural Language Processing**: Understands intent from natural language
- **Conversation Memory**: Maintains context across conversations
- **Multi-language Support**: Translation capabilities

### ⏰ Smart Reminder System
- **Natural Language Parsing**: Set reminders using natural language
- **Flexible Scheduling**: Support for relative and absolute time formats
- **Recurring Reminders**: Daily, weekly, and monthly recurring options
- **Automatic Notifications**: Sends reminders via WhatsApp

### 🛡️ Security & Performance
- **Rate Limiting**: Comprehensive rate limiting for all operations
- **Input Validation**: Secure input validation and sanitization
- **Error Handling**: Robust error handling with proper logging
- **Structured Logging**: Winston-based logging with rotation

### 💬 Additional Features
- **Text Summarization**: Summarize long texts automatically
- **Language Translation**: Translate text between languages
- **Creative Content**: Generate jokes, stories, and creative content
- **Command System**: Both slash commands and natural language support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- SendPulse account with WhatsApp service
- Stability AI API key
- Mistral AI API key
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd advanced-whatsapp-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API keys and configuration.

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# SendPulse Configuration
SENDPULSE_USER_ID=your_sendpulse_user_id
SENDPULSE_SECRET=your_sendpulse_secret
SENDPULSE_WHATSAPP_SERVICE_ID=your_whatsapp_service_id
SENDPULSE_WEBHOOK_SECRET=your_webhook_secret

# Stability AI Configuration
STABILITY_API_KEY=your_stability_api_key
STABILITY_BASE_URL=https://api.stability.ai

# Mistral AI Configuration
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_BASE_URL=https://api.mistral.ai

# Bot Configuration
BOT_NAME=Advanced WhatsApp Bot
ADMIN_PHONE=+1234567890
MAX_IMAGE_REQUESTS_PER_DAY=50
MAX_MESSAGES_PER_MINUTE=10

# Security
JWT_SECRET=your_jwt_secret_key_here
WEBHOOK_SECRET=your_webhook_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/bot.log
```

### SendPulse Setup

1. **Create SendPulse Account**
   - Sign up at [SendPulse](https://sendpulse.com)
   - Navigate to WhatsApp section
   - Set up your WhatsApp business account

2. **Get API Credentials**
   - Go to Settings → API
   - Copy your User ID and Secret
   - Note your WhatsApp Service ID

3. **Configure Webhook**
   - Set webhook URL to: `https://your-vercel-url.vercel.app/webhook/sendpulse`
   - Enable webhook for incoming messages
   - Set authentication if required

### API Keys Setup

#### Stability AI
1. Visit [Stability AI](https://platform.stability.ai/)
2. Create an account and get your API key
3. Add it to your environment variables

#### Mistral AI
1. Visit [Mistral AI](https://console.mistral.ai/)
2. Create an account and generate an API key
3. Add it to your environment variables

## 🚀 Deployment on Vercel

### Automatic Deployment

1. **Connect to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect the configuration

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add all variables from your `.env` file
   - Deploy the project

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Environment Variables in Vercel

Add these environment variables in your Vercel dashboard:

| Variable | Description | Required |
|----------|-------------|----------|
| `SENDPULSE_USER_ID` | SendPulse User ID | ✅ |
| `SENDPULSE_SECRET` | SendPulse API Secret | ✅ |
| `SENDPULSE_WHATSAPP_SERVICE_ID` | WhatsApp Service ID | ✅ |
| `STABILITY_API_KEY` | Stability AI API Key | ✅ |
| `MISTRAL_API_KEY` | Mistral AI API Key | ✅ |
| `WEBHOOK_SECRET` | Webhook security secret | ✅ |
| `ADMIN_PHONE` | Admin phone number | ✅ |
| `MAX_IMAGE_REQUESTS_PER_DAY` | Daily image limit | ❌ |
| `MAX_MESSAGES_PER_MINUTE` | Message rate limit | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | General rate limit | ❌ |

## 📱 Bot Commands

### Slash Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Welcome message | `/start` |
| `/help` | Show all commands | `/help` |
| `/image [description]` | Generate an image | `/image sunset over mountains` |
| `/remind [message] at [time]` | Set a reminder | `/remind Call mom at 3pm` |
| `/reminders` | List active reminders | `/reminders` |
| `/cancel [id]` | Cancel a reminder | `/cancel 12345678` |
| `/chat [message]` | Chat with AI | `/chat Tell me about space` |
| `/translate [text] to [language]` | Translate text | `/translate Hello to Spanish` |
| `/summarize [text]` | Summarize text | `/summarize [long text]` |
| `/joke [topic]` | Get a joke | `/joke programming` |
| `/story [topic]` | Generate a story | `/story space adventure` |
| `/clear` | Clear chat history | `/clear` |
| `/stats` | Bot statistics | `/stats` |

### Natural Language Support

The bot also understands natural language:

- **Image Generation**: "Generate an image of a cat"
- **Reminders**: "Remind me to call mom at 3pm"
- **Questions**: "What is artificial intelligence?"
- **Greetings**: "Hello", "Hi", "Good morning"
- **General Chat**: Any conversational message

## 🏗️ Architecture

```
src/
├── index.js                 # Main application entry point
├── handlers/
│   └── messageHandler.js    # Message processing and routing
├── services/
│   ├── whatsappService.js   # SendPulse WhatsApp integration
│   ├── stabilityService.js  # Stability AI image generation
│   ├── mistralService.js    # Mistral AI text generation
│   └── reminderService.js   # Reminder management
├── middleware/
│   └── rateLimiter.js       # Rate limiting middleware
└── utils/
    └── logger.js            # Winston logging configuration
```

### Service Architecture

- **WhatsApp Service**: Handles SendPulse API communication
- **Stability Service**: Manages AI image generation
- **Mistral Service**: Handles AI conversations and text processing
- **Reminder Service**: Manages reminder scheduling and notifications
- **Message Handler**: Routes messages and handles user interactions

## 🔒 Security Features

### Rate Limiting
- **Global Rate Limiting**: 100 requests per minute per IP
- **Image Generation**: 50 images per day per user
- **Messages**: 10 messages per minute per user
- **Strict Operations**: 10 requests per minute for expensive operations

### Input Validation
- Message length limits
- Prompt content filtering
- Time format validation
- Phone number formatting

### Error Handling
- Comprehensive error logging
- Graceful error recovery
- User-friendly error messages
- Webhook failure handling

## 📊 Monitoring & Logging

### Log Files
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Monitoring Endpoints
- `GET /` - Basic status check
- `GET /health` - Detailed health information
- `GET /stats` - Bot usage statistics

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Project Structure

```
advanced-whatsapp-bot/
├── src/                     # Source code
├── logs/                    # Log files
├── package.json             # Dependencies
├── vercel.json             # Vercel configuration
├── .env.example            # Environment template
└── README.md               # Documentation
```

### Adding New Features

1. **New Commands**: Add to `messageHandler.js` commands object
2. **New Services**: Create service file in `services/` directory
3. **New Middleware**: Add to `middleware/` directory
4. **New Utilities**: Add to `utils/` directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

**Bot not receiving messages**
- Check SendPulse webhook configuration
- Verify environment variables
- Check Vercel deployment logs

**Image generation failing**
- Verify Stability AI API key
- Check daily rate limits
- Review prompt content for policy violations

**Reminders not working**
- Check time format parsing
- Verify cron job is running
- Review reminder service logs

### Getting Help

- 📧 Email: support@yourbot.com
- 💬 Discord: [Your Discord Server]
- 📖 Documentation: [Your Documentation URL]
- 🐛 Issues: [GitHub Issues URL]

## 🙏 Acknowledgments

- [SendPulse](https://sendpulse.com) for WhatsApp integration
- [Stability AI](https://stability.ai) for image generation
- [Mistral AI](https://mistral.ai) for text generation
- [Vercel](https://vercel.com) for hosting platform

---

**Made with ❤️ for the WhatsApp community**

*This bot is not affiliated with WhatsApp Inc. WhatsApp is a trademark of WhatsApp Inc.*