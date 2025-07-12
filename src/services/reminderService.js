const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ReminderService {
  constructor() {
    this.reminders = new Map(); // In-memory storage (use database in production)
    this.whatsappService = null; // Will be injected
  }

  setWhatsAppService(whatsappService) {
    this.whatsappService = whatsappService;
  }

  async setReminder(phone, message, datetime, options = {}) {
    try {
      const {
        timezone = 'UTC',
        recurring = false,
        recurrence_type = null, // 'daily', 'weekly', 'monthly'
        priority = 'normal'
      } = options;

      // Parse and validate datetime
      const reminderTime = moment(datetime);
      if (!reminderTime.isValid()) {
        throw new Error('Invalid date/time format');
      }

      if (reminderTime.isBefore(moment())) {
        throw new Error('Reminder time cannot be in the past');
      }

      const reminderId = uuidv4();
      const reminder = {
        id: reminderId,
        phone: phone,
        message: message,
        datetime: reminderTime.toISOString(),
        timezone: timezone,
        recurring: recurring,
        recurrence_type: recurrence_type,
        priority: priority,
        status: 'active',
        created_at: moment().toISOString(),
        sent: false
      };

      // Store reminder
      if (!this.reminders.has(phone)) {
        this.reminders.set(phone, []);
      }
      this.reminders.get(phone).push(reminder);

      logger.info(`Reminder set for ${phone} at ${reminderTime.format()}: ${message.substring(0, 50)}...`);
      
      return reminder;
    } catch (error) {
      logger.error('Error setting reminder:', error);
      throw new Error(`Failed to set reminder: ${error.message}`);
    }
  }

  async getUserReminders(phone, options = {}) {
    try {
      const {
        status = 'all', // 'active', 'sent', 'cancelled', 'all'
        limit = 50,
        sort = 'datetime' // 'datetime', 'created_at'
      } = options;

      const userReminders = this.reminders.get(phone) || [];
      
      let filteredReminders = userReminders;
      
      if (status !== 'all') {
        filteredReminders = userReminders.filter(r => r.status === status);
      }

      // Sort reminders
      filteredReminders.sort((a, b) => {
        if (sort === 'datetime') {
          return moment(a.datetime).valueOf() - moment(b.datetime).valueOf();
        } else {
          return moment(a.created_at).valueOf() - moment(b.created_at).valueOf();
        }
      });

      // Apply limit
      if (limit > 0) {
        filteredReminders = filteredReminders.slice(0, limit);
      }

      return filteredReminders;
    } catch (error) {
      logger.error('Error getting user reminders:', error);
      throw new Error('Failed to get user reminders');
    }
  }

  async cancelReminder(phone, reminderId) {
    try {
      const userReminders = this.reminders.get(phone) || [];
      const reminderIndex = userReminders.findIndex(r => r.id === reminderId);
      
      if (reminderIndex === -1) {
        throw new Error('Reminder not found');
      }

      userReminders[reminderIndex].status = 'cancelled';
      
      logger.info(`Reminder cancelled for ${phone}: ${reminderId}`);
      return userReminders[reminderIndex];
    } catch (error) {
      logger.error('Error cancelling reminder:', error);
      throw new Error(`Failed to cancel reminder: ${error.message}`);
    }
  }

  async updateReminder(phone, reminderId, updates) {
    try {
      const userReminders = this.reminders.get(phone) || [];
      const reminderIndex = userReminders.findIndex(r => r.id === reminderId);
      
      if (reminderIndex === -1) {
        throw new Error('Reminder not found');
      }

      const reminder = userReminders[reminderIndex];
      
      // Validate updates
      if (updates.datetime) {
        const newTime = moment(updates.datetime);
        if (!newTime.isValid()) {
          throw new Error('Invalid date/time format');
        }
        if (newTime.isBefore(moment())) {
          throw new Error('Reminder time cannot be in the past');
        }
        updates.datetime = newTime.toISOString();
      }

      // Apply updates
      Object.assign(reminder, updates);
      reminder.updated_at = moment().toISOString();

      logger.info(`Reminder updated for ${phone}: ${reminderId}`);
      return reminder;
    } catch (error) {
      logger.error('Error updating reminder:', error);
      throw new Error(`Failed to update reminder: ${error.message}`);
    }
  }

  async checkReminders() {
    try {
      const now = moment();
      let sentCount = 0;

      for (const [phone, userReminders] of this.reminders.entries()) {
        for (const reminder of userReminders) {
          if (reminder.status === 'active' && !reminder.sent) {
            const reminderTime = moment(reminder.datetime);
            
            // Check if it's time to send the reminder (within 1 minute)
            if (now.isSameOrAfter(reminderTime) && now.diff(reminderTime, 'minutes') <= 1) {
              await this.sendReminder(reminder);
              sentCount++;
            }
          }
        }
      }

      if (sentCount > 0) {
        logger.info(`Sent ${sentCount} reminders`);
      }

      return sentCount;
    } catch (error) {
      logger.error('Error checking reminders:', error);
    }
  }

  async sendReminder(reminder) {
    try {
      if (!this.whatsappService) {
        throw new Error('WhatsApp service not available');
      }

      const reminderMessage = `🔔 *Reminder*\n\n${reminder.message}\n\n⏰ Scheduled for: ${moment(reminder.datetime).format('YYYY-MM-DD HH:mm')}`;
      
      await this.whatsappService.sendMessage(reminder.phone, reminderMessage);
      
      // Mark as sent
      reminder.sent = true;
      reminder.sent_at = moment().toISOString();
      
      // Handle recurring reminders
      if (reminder.recurring && reminder.recurrence_type) {
        await this.scheduleNextRecurrence(reminder);
      } else {
        reminder.status = 'sent';
      }

      logger.info(`Reminder sent to ${reminder.phone}: ${reminder.message.substring(0, 50)}...`);
    } catch (error) {
      logger.error('Error sending reminder:', error);
      reminder.status = 'failed';
      reminder.error = error.message;
    }
  }

  async scheduleNextRecurrence(reminder) {
    try {
      const currentTime = moment(reminder.datetime);
      let nextTime;

      switch (reminder.recurrence_type) {
        case 'daily':
          nextTime = currentTime.add(1, 'day');
          break;
        case 'weekly':
          nextTime = currentTime.add(1, 'week');
          break;
        case 'monthly':
          nextTime = currentTime.add(1, 'month');
          break;
        default:
          throw new Error('Invalid recurrence type');
      }

      // Create new reminder for next occurrence
      const nextReminder = {
        ...reminder,
        id: uuidv4(),
        datetime: nextTime.toISOString(),
        sent: false,
        status: 'active',
        created_at: moment().toISOString()
      };

      const userReminders = this.reminders.get(reminder.phone);
      userReminders.push(nextReminder);

      logger.info(`Next recurring reminder scheduled for ${reminder.phone} at ${nextTime.format()}`);
    } catch (error) {
      logger.error('Error scheduling next recurrence:', error);
    }
  }

  parseNaturalLanguageTime(text) {
    try {
      const now = moment();
      const lowerText = text.toLowerCase();

      // Handle relative times
      if (lowerText.includes('tomorrow')) {
        const timeMatch = lowerText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]) || 0;
          const isPM = timeMatch[3] === 'pm';
          
          let finalHour = hour;
          if (isPM && hour < 12) finalHour += 12;
          if (!isPM && hour === 12) finalHour = 0;
          
          return now.clone().add(1, 'day').hour(finalHour).minute(minute).second(0);
        }
      }

      // Handle "in X minutes/hours/days"
      const inMatch = lowerText.match(/in (\d+) (minute|hour|day)s?/);
      if (inMatch) {
        const amount = parseInt(inMatch[1]);
        const unit = inMatch[2];
        return now.clone().add(amount, unit);
      }

      // Handle "at X:XX" (today)
      const timeMatch = lowerText.match(/at (\d{1,2}):(\d{2})\s*(am|pm)?/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const isPM = timeMatch[3] === 'pm';
        
        let finalHour = hour;
        if (isPM && hour < 12) finalHour += 12;
        if (!isPM && hour === 12) finalHour = 0;
        
        const targetTime = now.clone().hour(finalHour).minute(minute).second(0);
        
        // If time has passed today, schedule for tomorrow
        if (targetTime.isBefore(now)) {
          targetTime.add(1, 'day');
        }
        
        return targetTime;
      }

      // Handle specific dates
      const dateMatch = lowerText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        return moment([year, month, day]);
      }

      // Fall back to moment parsing
      return moment(text);
    } catch (error) {
      logger.error('Error parsing natural language time:', error);
      throw new Error('Could not understand the time format');
    }
  }

  async getUpcomingReminders(phone, hours = 24) {
    try {
      const userReminders = await this.getUserReminders(phone, { status: 'active' });
      const now = moment();
      const cutoff = now.clone().add(hours, 'hours');

      return userReminders.filter(reminder => {
        const reminderTime = moment(reminder.datetime);
        return reminderTime.isAfter(now) && reminderTime.isBefore(cutoff);
      });
    } catch (error) {
      logger.error('Error getting upcoming reminders:', error);
      throw new Error('Failed to get upcoming reminders');
    }
  }

  // Clean up old reminders (call periodically)
  cleanupOldReminders(daysOld = 30) {
    const cutoff = moment().subtract(daysOld, 'days');
    let cleanedCount = 0;

    for (const [phone, userReminders] of this.reminders.entries()) {
      const initialLength = userReminders.length;
      
      // Remove old sent or cancelled reminders
      this.reminders.set(phone, userReminders.filter(reminder => {
        const reminderTime = moment(reminder.datetime);
        return reminder.status === 'active' || reminderTime.isAfter(cutoff);
      }));

      cleanedCount += initialLength - this.reminders.get(phone).length;
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old reminders`);
    }
  }

  getStats() {
    let totalReminders = 0;
    let activeReminders = 0;
    let sentReminders = 0;

    for (const userReminders of this.reminders.values()) {
      totalReminders += userReminders.length;
      activeReminders += userReminders.filter(r => r.status === 'active').length;
      sentReminders += userReminders.filter(r => r.status === 'sent').length;
    }

    return {
      total: totalReminders,
      active: activeReminders,
      sent: sentReminders,
      users: this.reminders.size
    };
  }
}

module.exports = ReminderService;