const logger = require('../utils/logger');
const moment = require('moment');

class MessageHandler {
  constructor(whatsappService, stabilityService, mistralService, reminderService) {
    this.whatsappService = whatsappService;
    this.stabilityService = stabilityService;
    this.mistralService = mistralService;
    this.reminderService = reminderService;
    
    // Inject WhatsApp service into reminder service
    this.reminderService.setWhatsAppService(this.whatsappService);
    
    // Command patterns
    this.commands = {
      '/help': this.handleHelpCommand.bind(this),
      '/start': this.handleStartCommand.bind(this),
      '/image': this.handleImageCommand.bind(this),
      '/remind': this.handleReminderCommand.bind(this),
      '/reminders': this.handleListRemindersCommand.bind(this),
      '/cancel': this.handleCancelReminderCommand.bind(this),
      '/chat': this.handleChatCommand.bind(this),
      '/translate': this.handleTranslateCommand.bind(this),
      '/summarize': this.handleSummarizeCommand.bind(this),
      '/joke': this.handleJokeCommand.bind(this),
      '/story': this.handleStoryCommand.bind(this),
      '/clear': this.handleClearHistoryCommand.bind(this),
      '/stats': this.handleStatsCommand.bind(this)
    };
    
    // User states for multi-step interactions
    this.userStates = new Map();
  }

  async handleIncomingMessage(webhook) {
    try {
      const messageData = this.whatsappService.parseIncomingMessage(webhook);
      const { phone, message, messageId, contact } = messageData;
      
      logger.info(`Processing message from ${contact.name} (${phone}): ${message}`);
      
      // Mark message as read
      if (messageId) {
        await this.whatsappService.markAsRead(messageId);
      }
      
      // Check for commands
      if (message.startsWith('/')) {
        await this.handleCommand(phone, message, contact);
      } else {
        // Handle natural conversation
        await this.handleNaturalMessage(phone, message, contact);
      }
      
    } catch (error) {
      logger.error('Error handling incoming message:', error);
    }
  }

  async handleCommand(phone, message, contact) {
    try {
      const commandParts = message.split(' ');
      const command = commandParts[0].toLowerCase();
      const args = commandParts.slice(1).join(' ');
      
      if (this.commands[command]) {
        await this.commands[command](phone, args, contact);
      } else {
        await this.whatsappService.sendMessage(
          phone,
          `❓ Unknown command: ${command}\n\nType /help to see available commands.`
        );
      }
    } catch (error) {
      logger.error('Error handling command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I encountered an error processing your command. Please try again.'
      );
    }
  }

  async handleNaturalMessage(phone, message, contact) {
    try {
      // Check if user is in a specific state (multi-step interaction)
      const userState = this.userStates.get(phone);
      
      if (userState) {
        await this.handleStateBasedMessage(phone, message, userState);
        return;
      }
      
      // Detect intent from natural language
      const intent = this.detectIntent(message);
      
      switch (intent) {
        case 'image_generation':
          await this.handleImageGenerationFromText(phone, message);
          break;
        case 'reminder_setting':
          await this.handleReminderFromText(phone, message);
          break;
        case 'question':
          await this.handleQuestionFromText(phone, message);
          break;
        case 'greeting':
          await this.handleGreeting(phone, contact);
          break;
        default:
          // Default to chat
          await this.handleChatFromText(phone, message);
      }
    } catch (error) {
      logger.error('Error handling natural message:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I encountered an error. Please try again or type /help for available commands.'
      );
    }
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Image generation keywords
    if (lowerMessage.includes('generate image') || 
        lowerMessage.includes('create image') || 
        lowerMessage.includes('draw') || 
        lowerMessage.includes('picture') ||
        lowerMessage.includes('image of')) {
      return 'image_generation';
    }
    
    // Reminder keywords
    if (lowerMessage.includes('remind me') || 
        lowerMessage.includes('reminder') || 
        lowerMessage.includes('schedule') ||
        /remind.*to/.test(lowerMessage)) {
      return 'reminder_setting';
    }
    
    // Question keywords
    if (lowerMessage.startsWith('what') || 
        lowerMessage.startsWith('how') || 
        lowerMessage.startsWith('why') || 
        lowerMessage.startsWith('when') ||
        lowerMessage.startsWith('where') ||
        lowerMessage.includes('?')) {
      return 'question';
    }
    
    // Greeting keywords
    if (lowerMessage.includes('hello') || 
        lowerMessage.includes('hi') || 
        lowerMessage.includes('hey') ||
        lowerMessage.includes('good morning') ||
        lowerMessage.includes('good afternoon') ||
        lowerMessage.includes('good evening')) {
      return 'greeting';
    }
    
    return 'chat';
  }

  async handleHelpCommand(phone, args, contact) {
    const helpMessage = `🤖 *Advanced WhatsApp Bot* 🤖

*🎨 Image Generation:*
/image [description] - Generate an image
Example: /image sunset over mountains

*⏰ Reminders:*
/remind [message] at [time] - Set a reminder
/reminders - List your reminders
/cancel [reminder_id] - Cancel a reminder

*💬 AI Chat:*
/chat [message] - Chat with AI
/clear - Clear chat history

*🔧 Utilities:*
/translate [text] to [language] - Translate text
/summarize [text] - Summarize text
/joke [topic] - Get a joke
/story [topic] - Generate a story

*📊 Other:*
/stats - Bot statistics
/help - Show this help

*Natural Language Support:*
You can also use natural language like:
• "Generate an image of a cat"
• "Remind me to call mom at 3pm"
• "What is the weather like?"

Type any message to start chatting! 😊`;

    await this.whatsappService.sendMessage(phone, helpMessage);
  }

  async handleStartCommand(phone, args, contact) {
    const welcomeMessage = `👋 Welcome to Advanced WhatsApp Bot, ${contact.name}!

I'm your AI-powered assistant that can:
🎨 Generate amazing images
🧠 Have intelligent conversations
⏰ Set and manage reminders
🌍 Translate text
📝 Summarize content
😄 Tell jokes and create stories

Type /help to see all commands or just start chatting naturally!

What would you like to do today? ✨`;

    await this.whatsappService.sendMessage(phone, welcomeMessage);
  }

  async handleImageCommand(phone, args, contact) {
    if (!args.trim()) {
      await this.whatsappService.sendMessage(
        phone,
        '🎨 Please provide a description for the image.\n\nExample: /image sunset over mountains with purple clouds'
      );
      return;
    }

    try {
      await this.whatsappService.sendMessage(phone, '🎨 Generating your image... This may take a few moments.');
      
      // Enhance the prompt with Mistral
      const enhancedPrompt = await this.mistralService.generateImagePrompt(args);
      
      // Generate image
      const imageUrl = await this.stabilityService.generateImage(enhancedPrompt);
      
      // Send image
      await this.whatsappService.sendImage(
        phone, 
        imageUrl, 
        `🎨 Here's your generated image: "${args}"`
      );
      
    } catch (error) {
      logger.error('Error in image command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t generate the image. Please try again with a different description.'
      );
    }
  }

  async handleReminderCommand(phone, args, contact) {
    if (!args.trim()) {
      await this.whatsappService.sendMessage(
        phone,
        '⏰ Please provide reminder details.\n\nExamples:\n• /remind Buy groceries at 5pm\n• /remind Call doctor tomorrow at 10am\n• /remind Meeting in 2 hours'
      );
      return;
    }

    try {
      const { message, datetime } = this.parseReminderText(args);
      
      if (!message || !datetime) {
        await this.whatsappService.sendMessage(
          phone,
          '⚠️ I couldn\'t understand the reminder format. Please try:\n/remind [message] at [time]'
        );
        return;
      }

      const reminder = await this.reminderService.setReminder(phone, message, datetime);
      
      await this.whatsappService.sendMessage(
        phone,
        `✅ Reminder set!\n\n📝 Message: ${message}\n⏰ Time: ${moment(datetime).format('YYYY-MM-DD HH:mm')}\n🆔 ID: ${reminder.id.substring(0, 8)}`
      );
      
    } catch (error) {
      logger.error('Error in reminder command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t set the reminder. Please check your time format and try again.'
      );
    }
  }

  async handleListRemindersCommand(phone, args, contact) {
    try {
      const reminders = await this.reminderService.getUserReminders(phone, { status: 'active' });
      
      if (reminders.length === 0) {
        await this.whatsappService.sendMessage(
          phone,
          '📅 You have no active reminders.\n\nSet one with: /remind [message] at [time]'
        );
        return;
      }

      let message = '📅 *Your Active Reminders:*\n\n';
      
      reminders.forEach((reminder, index) => {
        const time = moment(reminder.datetime).format('MMM DD, YYYY HH:mm');
        const shortId = reminder.id.substring(0, 8);
        message += `${index + 1}. 📝 ${reminder.message}\n⏰ ${time}\n🆔 ${shortId}\n\n`;
      });

      message += 'To cancel a reminder, use: /cancel [ID]';
      
      await this.whatsappService.sendMessage(phone, message);
      
    } catch (error) {
      logger.error('Error listing reminders:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t retrieve your reminders. Please try again.'
      );
    }
  }

  async handleCancelReminderCommand(phone, args, contact) {
    if (!args.trim()) {
      await this.whatsappService.sendMessage(
        phone,
        '❌ Please provide the reminder ID.\n\nExample: /cancel 12345678'
      );
      return;
    }

    try {
      // Find reminder by partial ID
      const userReminders = await this.reminderService.getUserReminders(phone, { status: 'active' });
      const reminder = userReminders.find(r => r.id.startsWith(args.trim()));
      
      if (!reminder) {
        await this.whatsappService.sendMessage(
          phone,
          '❌ Reminder not found. Use /reminders to see your active reminders.'
        );
        return;
      }

      await this.reminderService.cancelReminder(phone, reminder.id);
      
      await this.whatsappService.sendMessage(
        phone,
        `✅ Reminder cancelled!\n\n📝 "${reminder.message}"\n⏰ Was scheduled for: ${moment(reminder.datetime).format('MMM DD, YYYY HH:mm')}`
      );
      
    } catch (error) {
      logger.error('Error cancelling reminder:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t cancel the reminder. Please try again.'
      );
    }
  }

  async handleChatCommand(phone, args, contact) {
    if (!args.trim()) {
      await this.whatsappService.sendMessage(
        phone,
        '💬 Please provide a message to chat about.\n\nExample: /chat Tell me about artificial intelligence'
      );
      return;
    }

    try {
      const response = await this.mistralService.chat(phone, args);
      await this.whatsappService.sendMessage(phone, response);
    } catch (error) {
      logger.error('Error in chat command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t process your chat message. Please try again.'
      );
    }
  }

  async handleTranslateCommand(phone, args, contact) {
    const translateMatch = args.match(/(.+?)\s+to\s+(.+)/i);
    
    if (!translateMatch) {
      await this.whatsappService.sendMessage(
        phone,
        '🌍 Please use the format: /translate [text] to [language]\n\nExample: /translate Hello world to Spanish'
      );
      return;
    }

    try {
      const [, text, targetLanguage] = translateMatch;
      const translation = await this.mistralService.translateText(text.trim(), targetLanguage.trim());
      
      await this.whatsappService.sendMessage(
        phone,
        `🌍 *Translation to ${targetLanguage}:*\n\n${translation}`
      );
    } catch (error) {
      logger.error('Error in translate command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t translate the text. Please try again.'
      );
    }
  }

  async handleSummarizeCommand(phone, args, contact) {
    if (!args.trim()) {
      await this.whatsappService.sendMessage(
        phone,
        '📝 Please provide text to summarize.\n\nExample: /summarize [your long text here]'
      );
      return;
    }

    try {
      const summary = await this.mistralService.summarizeText(args);
      await this.whatsappService.sendMessage(
        phone,
        `📝 *Summary:*\n\n${summary}`
      );
    } catch (error) {
      logger.error('Error in summarize command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t summarize the text. Please try again.'
      );
    }
  }

  async handleJokeCommand(phone, args, contact) {
    try {
      const topic = args.trim() || 'general';
      const joke = await this.mistralService.generateCreativeContent('joke', topic);
      
      await this.whatsappService.sendMessage(phone, `😄 ${joke}`);
    } catch (error) {
      logger.error('Error in joke command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t generate a joke. Please try again.'
      );
    }
  }

  async handleStoryCommand(phone, args, contact) {
    if (!args.trim()) {
      await this.whatsappService.sendMessage(
        phone,
        '📚 Please provide a topic for the story.\n\nExample: /story space adventure'
      );
      return;
    }

    try {
      const story = await this.mistralService.generateCreativeContent('story', args, { length: 'medium' });
      await this.whatsappService.sendMessage(phone, `📚 *Story: ${args}*\n\n${story}`);
    } catch (error) {
      logger.error('Error in story command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t generate a story. Please try again.'
      );
    }
  }

  async handleClearHistoryCommand(phone, args, contact) {
    try {
      this.mistralService.clearConversationHistory(phone);
      await this.whatsappService.sendMessage(
        phone,
        '🧹 Your conversation history has been cleared. We can start fresh!'
      );
    } catch (error) {
      logger.error('Error clearing history:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t clear your history. Please try again.'
      );
    }
  }

  async handleStatsCommand(phone, args, contact) {
    try {
      const reminderStats = this.reminderService.getStats();
      
      const statsMessage = `📊 *Bot Statistics:*

⏰ *Reminders:*
• Total: ${reminderStats.total}
• Active: ${reminderStats.active}
• Completed: ${reminderStats.sent}
• Users with reminders: ${reminderStats.users}

🤖 *Bot Status:* Online ✅
⏱️ *Uptime:* ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m

Thank you for using Advanced WhatsApp Bot! 🚀`;

      await this.whatsappService.sendMessage(phone, statsMessage);
    } catch (error) {
      logger.error('Error in stats command:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I couldn\'t retrieve statistics. Please try again.'
      );
    }
  }

  // Natural language handlers
  async handleImageGenerationFromText(phone, message) {
    const prompt = message.replace(/generate image|create image|draw|picture|image of/gi, '').trim();
    if (prompt) {
      await this.handleImageCommand(phone, prompt, null);
    } else {
      await this.whatsappService.sendMessage(
        phone,
        '🎨 What image would you like me to generate? Please describe it.'
      );
    }
  }

  async handleReminderFromText(phone, message) {
    try {
      const { message: reminderText, datetime } = this.parseReminderText(message);
      if (reminderText && datetime) {
        await this.handleReminderCommand(phone, `${reminderText} at ${datetime}`, null);
      } else {
        await this.whatsappService.sendMessage(
          phone,
          '⏰ I understand you want to set a reminder. Please specify what and when.\n\nExample: "Remind me to call mom at 3pm"'
        );
      }
    } catch (error) {
      await this.handleReminderCommand(phone, message.replace(/remind me/gi, '').trim(), null);
    }
  }

  async handleQuestionFromText(phone, message) {
    try {
      const answer = await this.mistralService.answerQuestion(message);
      await this.whatsappService.sendMessage(phone, answer);
    } catch (error) {
      await this.handleChatFromText(phone, message);
    }
  }

  async handleGreeting(phone, contact) {
    const greetings = [
      `👋 Hello ${contact.name}! How can I help you today?`,
      `Hi there! 😊 What would you like to do?`,
      `Hey ${contact.name}! Ready for some AI magic? ✨`,
      `Hello! I'm here to help with images, reminders, or just to chat! 🤖`
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    await this.whatsappService.sendMessage(phone, greeting);
  }

  async handleChatFromText(phone, message) {
    try {
      const response = await this.mistralService.chat(phone, message);
      await this.whatsappService.sendMessage(phone, response);
    } catch (error) {
      logger.error('Error in natural chat:', error);
      await this.whatsappService.sendMessage(
        phone,
        '⚠️ Sorry, I\'m having trouble responding right now. Please try again or use /help for commands.'
      );
    }
  }

  parseReminderText(text) {
    try {
      // Extract reminder message and time
      const atMatch = text.match(/(.+?)\s+at\s+(.+)/i);
      const inMatch = text.match(/(.+?)\s+in\s+(.+)/i);
      const onMatch = text.match(/(.+?)\s+on\s+(.+)/i);
      
      let reminderMessage, timeString;
      
      if (atMatch) {
        [, reminderMessage, timeString] = atMatch;
      } else if (inMatch) {
        [, reminderMessage, timeString] = inMatch;
      } else if (onMatch) {
        [, reminderMessage, timeString] = onMatch;
      } else {
        return { message: null, datetime: null };
      }
      
      // Clean up the message
      reminderMessage = reminderMessage.replace(/remind me to|remind me|reminder/gi, '').trim();
      
      // Parse the time
      const datetime = this.reminderService.parseNaturalLanguageTime(timeString);
      
      return {
        message: reminderMessage,
        datetime: datetime.toISOString()
      };
    } catch (error) {
      logger.error('Error parsing reminder text:', error);
      return { message: null, datetime: null };
    }
  }

  async handleStateBasedMessage(phone, message, state) {
    // Handle multi-step interactions
    // This can be extended for complex workflows
    switch (state.type) {
      case 'image_details':
        // Handle additional image generation details
        break;
      case 'reminder_confirmation':
        // Handle reminder confirmation
        break;
      default:
        this.userStates.delete(phone);
        await this.handleNaturalMessage(phone, message, null);
    }
  }

  setUserState(phone, state) {
    this.userStates.set(phone, state);
  }

  clearUserState(phone) {
    this.userStates.delete(phone);
  }
}

module.exports = MessageHandler;