const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const winston = require('winston');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import services
const WhatsAppService = require('./services/whatsappService');
const StabilityService = require('./services/stabilityService');
const MistralService = require('./services/mistralService');
const ReminderService = require('./services/reminderService');
const MessageHandler = require('./handlers/messageHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize services
const whatsappService = new WhatsAppService();
const stabilityService = new StabilityService();
const mistralService = new MistralService();
const reminderService = new ReminderService();
const messageHandler = new MessageHandler(whatsappService, stabilityService, mistralService, reminderService);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Advanced WhatsApp Bot is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// SendPulse webhook endpoint for incoming messages
app.post('/webhook/sendpulse', rateLimiter, async (req, res) => {
  try {
    logger.info('Received webhook from SendPulse:', req.body);
    
    // Process the incoming message
    await messageHandler.handleIncomingMessage(req.body);
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Manual send message endpoint (for testing)
app.post('/send-message', rateLimiter, async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Phone and message are required' 
      });
    }
    
    const result = await whatsappService.sendMessage(phone, message);
    res.json({ status: 'success', result });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Generate image endpoint
app.post('/generate-image', rateLimiter, async (req, res) => {
  try {
    const { prompt, phone } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Prompt is required' 
      });
    }
    
    const imageUrl = await stabilityService.generateImage(prompt);
    
    if (phone) {
      await whatsappService.sendImage(phone, imageUrl, `Generated image: ${prompt}`);
    }
    
    res.json({ status: 'success', imageUrl });
  } catch (error) {
    logger.error('Error generating image:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Set reminder endpoint
app.post('/set-reminder', rateLimiter, async (req, res) => {
  try {
    const { phone, message, datetime } = req.body;
    
    if (!phone || !message || !datetime) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Phone, message, and datetime are required' 
      });
    }
    
    const reminder = await reminderService.setReminder(phone, message, datetime);
    res.json({ status: 'success', reminder });
  } catch (error) {
    logger.error('Error setting reminder:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get user reminders
app.get('/reminders/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const reminders = await reminderService.getUserReminders(phone);
    res.json({ status: 'success', reminders });
  } catch (error) {
    logger.error('Error getting reminders:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// Schedule reminder checks every minute
cron.schedule('* * * * *', () => {
  reminderService.checkReminders();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Advanced WhatsApp Bot server is running on port ${PORT}`);
  logger.info('Bot features enabled:');
  logger.info('- WhatsApp messaging via SendPulse');
  logger.info('- AI image generation via Stability AI');
  logger.info('- AI text generation via Mistral');
  logger.info('- Smart reminder system');
  logger.info('- Rate limiting and security');
});

module.exports = app;