const axios = require('axios');
const logger = require('../utils/logger');

class MistralService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.baseUrl = process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai';
    this.defaultModel = 'mistral-large-latest';
    this.conversationHistory = new Map(); // Store conversation history per user
  }

  async generateText(prompt, options = {}) {
    try {
      const {
        model = this.defaultModel,
        max_tokens = 500,
        temperature = 0.7,
        top_p = 1,
        random_seed = null,
        safe_prompt = true
      } = options;

      logger.info(`Generating text with Mistral for prompt: "${prompt.substring(0, 100)}..."`);

      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens,
          temperature,
          top_p,
          random_seed,
          safe_prompt
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        const generatedText = response.data.choices[0].message.content;
        logger.info('Text generated successfully with Mistral');
        return generatedText;
      } else {
        throw new Error('No text generated');
      }
    } catch (error) {
      logger.error('Error generating text with Mistral:', error.response?.data || error.message);
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  async chat(userPhone, message, options = {}) {
    try {
      const {
        model = this.defaultModel,
        max_tokens = 500,
        temperature = 0.7,
        system_prompt = "You are a helpful WhatsApp assistant. Be concise, friendly, and helpful. Respond in a conversational manner suitable for messaging."
      } = options;

      // Get or initialize conversation history
      if (!this.conversationHistory.has(userPhone)) {
        this.conversationHistory.set(userPhone, []);
      }

      const history = this.conversationHistory.get(userPhone);
      
      // Build messages array with system prompt and history
      const messages = [
        {
          role: 'system',
          content: system_prompt
        },
        ...history,
        {
          role: 'user',
          content: message
        }
      ];

      // Keep history manageable (last 10 exchanges)
      if (messages.length > 21) { // system + 10 exchanges (20 messages) + current
        messages.splice(1, messages.length - 21);
      }

      logger.info(`Chatting with user ${userPhone}: "${message.substring(0, 50)}..."`);

      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model,
          messages,
          max_tokens,
          temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        const assistantMessage = response.data.choices[0].message.content;
        
        // Update conversation history
        history.push(
          { role: 'user', content: message },
          { role: 'assistant', content: assistantMessage }
        );

        logger.info(`Chat response generated for user ${userPhone}`);
        return assistantMessage;
      } else {
        throw new Error('No response generated');
      }
    } catch (error) {
      logger.error('Error in chat with Mistral:', error.response?.data || error.message);
      throw new Error(`Failed to generate chat response: ${error.message}`);
    }
  }

  async summarizeText(text, options = {}) {
    try {
      const {
        max_length = 150,
        style = 'concise'
      } = options;

      const prompt = `Please summarize the following text in a ${style} manner, keeping it under ${max_length} words:\n\n${text}`;
      
      return await this.generateText(prompt, { max_tokens: Math.min(max_length * 2, 300) });
    } catch (error) {
      logger.error('Error summarizing text:', error);
      throw new Error('Failed to summarize text');
    }
  }

  async translateText(text, targetLanguage, options = {}) {
    try {
      const {
        sourceLanguage = 'auto-detect'
      } = options;

      const prompt = sourceLanguage === 'auto-detect' 
        ? `Translate the following text to ${targetLanguage}:\n\n${text}`
        : `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`;
      
      return await this.generateText(prompt, { max_tokens: text.length * 2 });
    } catch (error) {
      logger.error('Error translating text:', error);
      throw new Error('Failed to translate text');
    }
  }

  async analyzeImage(imageDescription, question) {
    try {
      const prompt = `Based on this image description: "${imageDescription}", please answer the following question: ${question}`;
      
      return await this.generateText(prompt);
    } catch (error) {
      logger.error('Error analyzing image:', error);
      throw new Error('Failed to analyze image');
    }
  }

  async generateCreativeContent(type, topic, options = {}) {
    try {
      const {
        length = 'medium',
        style = 'creative',
        audience = 'general'
      } = options;

      let prompt;
      
      switch (type) {
        case 'story':
          prompt = `Write a ${length} ${style} story about ${topic} for a ${audience} audience.`;
          break;
        case 'poem':
          prompt = `Write a ${style} poem about ${topic}.`;
          break;
        case 'joke':
          prompt = `Tell a clean, funny joke about ${topic}.`;
          break;
        case 'email':
          prompt = `Write a professional email about ${topic}.`;
          break;
        case 'social_post':
          prompt = `Write an engaging social media post about ${topic} for ${audience}.`;
          break;
        default:
          prompt = `Create ${style} content about ${topic} for ${audience}.`;
      }

      const maxTokens = length === 'short' ? 200 : length === 'long' ? 800 : 400;
      
      return await this.generateText(prompt, { max_tokens: maxTokens });
    } catch (error) {
      logger.error('Error generating creative content:', error);
      throw new Error('Failed to generate creative content');
    }
  }

  async answerQuestion(question, context = null) {
    try {
      const prompt = context 
        ? `Based on the following context: "${context}"\n\nPlease answer this question: ${question}`
        : `Please answer this question clearly and concisely: ${question}`;
      
      return await this.generateText(prompt);
    } catch (error) {
      logger.error('Error answering question:', error);
      throw new Error('Failed to answer question');
    }
  }

  async generateImagePrompt(description) {
    try {
      const prompt = `Create a detailed, artistic image generation prompt based on this description: "${description}". Make it suitable for AI image generation with specific details about style, lighting, composition, and quality.`;
      
      return await this.generateText(prompt, { max_tokens: 200 });
    } catch (error) {
      logger.error('Error generating image prompt:', error);
      throw new Error('Failed to generate image prompt');
    }
  }

  clearConversationHistory(userPhone) {
    if (this.conversationHistory.has(userPhone)) {
      this.conversationHistory.delete(userPhone);
      logger.info(`Conversation history cleared for user ${userPhone}`);
    }
  }

  getConversationHistory(userPhone) {
    return this.conversationHistory.get(userPhone) || [];
  }

  async getModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting Mistral models:', error.response?.data || error.message);
      throw new Error('Failed to get available models');
    }
  }

  validateInput(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    if (input.length > 4000) {
      throw new Error('Input must be less than 4000 characters');
    }

    return true;
  }

  // Clean up old conversation histories (call periodically)
  cleanupOldConversations(maxAgeHours = 24) {
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    for (const [userPhone, history] of this.conversationHistory.entries()) {
      if (history.length === 0 || 
          (history[history.length - 1].timestamp && history[history.length - 1].timestamp < cutoff)) {
        this.conversationHistory.delete(userPhone);
        logger.info(`Cleaned up old conversation for user ${userPhone}`);
      }
    }
  }
}

module.exports = MistralService;