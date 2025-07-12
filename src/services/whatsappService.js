const axios = require('axios');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.userId = process.env.SENDPULSE_USER_ID;
    this.secret = process.env.SENDPULSE_SECRET;
    this.serviceId = process.env.SENDPULSE_WHATSAPP_SERVICE_ID;
    this.baseUrl = 'https://api.sendpulse.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/oauth/access_token`, {
        grant_type: 'client_credentials',
        client_id: this.userId,
        client_secret: this.secret
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry
      
      logger.info('SendPulse access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Error getting SendPulse access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with SendPulse');
    }
  }

  async sendMessage(phone, message) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/whatsapp/contacts/sendByPhones`,
        {
          phones: [this.formatPhone(phone)],
          body: message
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Message sent to ${phone}: ${message.substring(0, 50)}...`);
      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  async sendImage(phone, imageUrl, caption = '') {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/whatsapp/contacts/sendByPhones`,
        {
          phones: [this.formatPhone(phone)],
          body: caption,
          media: {
            type: 'image',
            url: imageUrl
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Image sent to ${phone}: ${imageUrl}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp image:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp image');
    }
  }

  async sendDocument(phone, documentUrl, filename, caption = '') {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/whatsapp/contacts/sendByPhones`,
        {
          phones: [this.formatPhone(phone)],
          body: caption,
          media: {
            type: 'document',
            url: documentUrl,
            filename: filename
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Document sent to ${phone}: ${filename}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp document:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp document');
    }
  }

  async sendTemplate(phone, templateName, variables = []) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/whatsapp/contacts/sendTemplate`,
        {
          phones: [this.formatPhone(phone)],
          template: {
            name: templateName,
            language: 'en',
            variables: variables
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Template sent to ${phone}: ${templateName}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp template:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp template');
    }
  }

  formatPhone(phone) {
    // Remove any non-digit characters and ensure it starts with country code
    let formatted = phone.replace(/\D/g, '');
    
    // If it doesn't start with country code, assume it's US (+1)
    if (!formatted.startsWith('1') && formatted.length === 10) {
      formatted = '1' + formatted;
    }
    
    return formatted;
  }

  parseIncomingMessage(webhook) {
    try {
      return {
        phone: webhook.contact?.phone || webhook.from,
        message: webhook.message?.text || webhook.text,
        messageId: webhook.message?.id || webhook.id,
        timestamp: webhook.timestamp || Date.now(),
        type: webhook.message?.type || 'text',
        media: webhook.message?.media || null,
        contact: {
          name: webhook.contact?.name || 'Unknown',
          phone: webhook.contact?.phone || webhook.from
        }
      };
    } catch (error) {
      logger.error('Error parsing incoming message:', error);
      throw new Error('Failed to parse incoming message');
    }
  }

  async markAsRead(messageId) {
    try {
      const token = await this.getAccessToken();
      
      await axios.post(
        `${this.baseUrl}/whatsapp/messages/${messageId}/read`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Message marked as read: ${messageId}`);
    } catch (error) {
      logger.error('Error marking message as read:', error.response?.data || error.message);
    }
  }
}

module.exports = WhatsAppService;