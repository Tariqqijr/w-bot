const request = require('supertest');
const app = require('../index');

describe('WhatsApp Bot API', () => {
  
  describe('Health Checks', () => {
    test('GET / should return status ok', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('Advanced WhatsApp Bot is running!');
    });

    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });
  });

  describe('Webhook Endpoint', () => {
    test('POST /webhook/sendpulse should accept webhook', async () => {
      const webhookData = {
        contact: {
          phone: '+1234567890',
          name: 'Test User'
        },
        message: {
          text: 'Hello',
          id: 'test-message-id'
        },
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/webhook/sendpulse')
        .send(webhookData)
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
  });

  describe('Rate Limiting', () => {
    test('Should handle rate limiting gracefully', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(10).fill().map(() => 
        request(app).get('/')
      );

      const responses = await Promise.all(requests);
      
      // All requests should either succeed (200) or be rate limited (429)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Endpoint not found');
    });

    test('Should handle malformed webhook data', async () => {
      const response = await request(app)
        .post('/webhook/sendpulse')
        .send({ invalid: 'data' })
        .expect(200); // Should not crash, return 200 to avoid webhook retries
    });
  });

  describe('Manual Message Sending', () => {
    test('POST /send-message should validate input', async () => {
      const response = await request(app)
        .post('/send-message')
        .send({})
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Phone and message are required');
    });

    test('POST /send-message should accept valid input format', async () => {
      const response = await request(app)
        .post('/send-message')
        .send({
          phone: '+1234567890',
          message: 'Test message'
        });
      
      // Should not return 400 (bad request)
      expect(response.status).not.toBe(400);
    });
  });

  describe('Image Generation Endpoint', () => {
    test('POST /generate-image should validate prompt', async () => {
      const response = await request(app)
        .post('/generate-image')
        .send({})
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Prompt is required');
    });

    test('POST /generate-image should accept valid prompt', async () => {
      const response = await request(app)
        .post('/generate-image')
        .send({
          prompt: 'A beautiful sunset'
        });
      
      // Should not return 400 (bad request)
      expect(response.status).not.toBe(400);
    });
  });

  describe('Reminder Endpoints', () => {
    test('POST /set-reminder should validate input', async () => {
      const response = await request(app)
        .post('/set-reminder')
        .send({})
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Phone, message, and datetime are required');
    });

    test('GET /reminders/:phone should return reminders', async () => {
      const response = await request(app)
        .get('/reminders/+1234567890')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body).toHaveProperty('reminders');
      expect(Array.isArray(response.body.reminders)).toBe(true);
    });
  });
});

// Service Tests
describe('Service Classes', () => {
  const WhatsAppService = require('../services/whatsappService');
  const StabilityService = require('../services/stabilityService');
  const MistralService = require('../services/mistralService');
  const ReminderService = require('../services/reminderService');

  describe('WhatsAppService', () => {
    test('Should format phone numbers correctly', () => {
      const service = new WhatsAppService();
      
      expect(service.formatPhone('1234567890')).toBe('11234567890');
      expect(service.formatPhone('+1234567890')).toBe('1234567890');
      expect(service.formatPhone('(123) 456-7890')).toBe('11234567890');
    });

    test('Should parse incoming messages', () => {
      const service = new WhatsAppService();
      const webhook = {
        contact: { phone: '+1234567890', name: 'Test User' },
        message: { text: 'Hello', id: 'msg-123' },
        timestamp: Date.now()
      };

      const parsed = service.parseIncomingMessage(webhook);
      
      expect(parsed.phone).toBe('+1234567890');
      expect(parsed.message).toBe('Hello');
      expect(parsed.messageId).toBe('msg-123');
      expect(parsed.contact.name).toBe('Test User');
    });
  });

  describe('StabilityService', () => {
    test('Should validate prompts', () => {
      const service = new StabilityService();
      
      expect(() => service.validatePrompt('')).toThrow();
      expect(() => service.validatePrompt('ab')).toThrow();
      expect(() => service.validatePrompt('a'.repeat(2001))).toThrow();
      expect(service.validatePrompt('valid prompt')).toBe(true);
    });

    test('Should enhance prompts', () => {
      const service = new StabilityService();
      const enhanced = service.enhancePrompt('cat');
      
      expect(enhanced).toContain('cat');
      expect(enhanced).toContain('high quality');
      expect(enhanced).toContain('detailed');
    });
  });

  describe('MistralService', () => {
    test('Should validate input', () => {
      const service = new MistralService();
      
      expect(() => service.validateInput('')).toThrow();
      expect(() => service.validateInput('a'.repeat(4001))).toThrow();
      expect(service.validateInput('valid input')).toBe(true);
    });

    test('Should manage conversation history', () => {
      const service = new MistralService();
      const phone = '+1234567890';
      
      expect(service.getConversationHistory(phone)).toEqual([]);
      
      service.clearConversationHistory(phone);
      expect(service.getConversationHistory(phone)).toEqual([]);
    });
  });

  describe('ReminderService', () => {
    test('Should parse natural language time', () => {
      const service = new ReminderService();
      
      const result1 = service.parseNaturalLanguageTime('in 5 minutes');
      expect(result1.isValid()).toBe(true);
      
      const result2 = service.parseNaturalLanguageTime('tomorrow at 3pm');
      expect(result2.isValid()).toBe(true);
      
      const result3 = service.parseNaturalLanguageTime('at 14:30');
      expect(result3.isValid()).toBe(true);
    });

    test('Should get reminder statistics', () => {
      const service = new ReminderService();
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('sent');
      expect(stats).toHaveProperty('users');
    });
  });
});

// Integration Tests
describe('Message Handler Integration', () => {
  const MessageHandler = require('../handlers/messageHandler');
  const WhatsAppService = require('../services/whatsappService');
  const StabilityService = require('../services/stabilityService');
  const MistralService = require('../services/mistralService');
  const ReminderService = require('../services/reminderService');

  test('Should detect intents correctly', () => {
    const handler = new MessageHandler(
      new WhatsAppService(),
      new StabilityService(),
      new MistralService(),
      new ReminderService()
    );

    expect(handler.detectIntent('generate image of a cat')).toBe('image_generation');
    expect(handler.detectIntent('remind me to call mom')).toBe('reminder_setting');
    expect(handler.detectIntent('what is AI?')).toBe('question');
    expect(handler.detectIntent('hello there')).toBe('greeting');
    expect(handler.detectIntent('how are you?')).toBe('question');
  });

  test('Should parse reminder text correctly', () => {
    const handler = new MessageHandler(
      new WhatsAppService(),
      new StabilityService(),
      new MistralService(),
      new ReminderService()
    );

    const result = handler.parseReminderText('call mom at 3pm');
    expect(result.message).toBe('call mom');
    expect(result.datetime).toBeTruthy();
  });
});