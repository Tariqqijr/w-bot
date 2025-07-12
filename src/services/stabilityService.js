const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

class StabilityService {
  constructor() {
    this.apiKey = process.env.STABILITY_API_KEY;
    this.baseUrl = process.env.STABILITY_BASE_URL || 'https://api.stability.ai';
    this.defaultModel = 'stable-diffusion-xl-1024-v1-0';
  }

  async generateImage(prompt, options = {}) {
    try {
      const {
        model = this.defaultModel,
        width = 1024,
        height = 1024,
        steps = 30,
        seed = Math.floor(Math.random() * 1000000),
        cfg_scale = 7,
        samples = 1,
        style = 'enhance',
        negative_prompt = 'blurry, bad quality, distorted, deformed'
      } = options;

      logger.info(`Generating image with prompt: "${prompt.substring(0, 100)}..."`);

      const response = await axios.post(
        `${this.baseUrl}/v1/generation/${model}/text-to-image`,
        {
          text_prompts: [
            {
              text: prompt,
              weight: 1
            },
            {
              text: negative_prompt,
              weight: -1
            }
          ],
          cfg_scale,
          height,
          width,
          steps,
          samples,
          seed,
          style_preset: style
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.artifacts && response.data.artifacts.length > 0) {
        const base64Image = response.data.artifacts[0].base64;
        
        // Convert base64 to hosted URL (you might want to upload to a cloud storage)
        const imageUrl = await this.uploadBase64Image(base64Image);
        
        logger.info('Image generated successfully');
        return imageUrl;
      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      logger.error('Error generating image:', error.response?.data || error.message);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  async generateImageFromImage(prompt, initImage, options = {}) {
    try {
      const {
        model = this.defaultModel,
        image_strength = 0.35,
        steps = 30,
        seed = Math.floor(Math.random() * 1000000),
        cfg_scale = 7,
        samples = 1
      } = options;

      const formData = new FormData();
      formData.append('init_image', initImage);
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', image_strength);
      formData.append('text_prompts[0][text]', prompt);
      formData.append('text_prompts[0][weight]', 1);
      formData.append('cfg_scale', cfg_scale);
      formData.append('samples', samples);
      formData.append('steps', steps);
      formData.append('seed', seed);

      const response = await axios.post(
        `${this.baseUrl}/v1/generation/${model}/image-to-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
            ...formData.getHeaders()
          }
        }
      );

      if (response.data.artifacts && response.data.artifacts.length > 0) {
        const base64Image = response.data.artifacts[0].base64;
        const imageUrl = await this.uploadBase64Image(base64Image);
        
        logger.info('Image-to-image generation successful');
        return imageUrl;
      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      logger.error('Error in image-to-image generation:', error.response?.data || error.message);
      throw new Error(`Failed to generate image from image: ${error.message}`);
    }
  }

  async upscaleImage(image, options = {}) {
    try {
      const { width = 2048, height = 2048 } = options;

      const formData = new FormData();
      formData.append('image', image);
      formData.append('width', width);
      formData.append('height', height);

      const response = await axios.post(
        `${this.baseUrl}/v1/generation/esrgan-v1-x2plus/image-to-image/upscale`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
            ...formData.getHeaders()
          }
        }
      );

      if (response.data.artifacts && response.data.artifacts.length > 0) {
        const base64Image = response.data.artifacts[0].base64;
        const imageUrl = await this.uploadBase64Image(base64Image);
        
        logger.info('Image upscaling successful');
        return imageUrl;
      } else {
        throw new Error('No upscaled image generated');
      }
    } catch (error) {
      logger.error('Error upscaling image:', error.response?.data || error.message);
      throw new Error(`Failed to upscale image: ${error.message}`);
    }
  }

  async uploadBase64Image(base64Data) {
    try {
      // In a real implementation, you would upload this to a cloud storage service
      // For now, we'll create a data URL (not recommended for production)
      // You should implement actual file upload to AWS S3, Cloudinary, etc.
      
      // Simple implementation returning data URL (replace with actual upload)
      const dataUrl = `data:image/png;base64,${base64Data}`;
      
      // TODO: Replace with actual cloud storage upload
      // Example with AWS S3, Cloudinary, or similar service
      
      logger.info('Image uploaded successfully (using data URL)');
      return dataUrl;
    } catch (error) {
      logger.error('Error uploading image:', error);
      throw new Error('Failed to upload generated image');
    }
  }

  async getEngines() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/engines/list`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting engines:', error.response?.data || error.message);
      throw new Error('Failed to get available engines');
    }
  }

  async getUserAccount() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/user/account`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting user account:', error.response?.data || error.message);
      throw new Error('Failed to get user account information');
    }
  }

  validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }

    if (prompt.length < 3) {
      throw new Error('Prompt must be at least 3 characters long');
    }

    if (prompt.length > 2000) {
      throw new Error('Prompt must be less than 2000 characters');
    }

    // Check for inappropriate content (basic filtering)
    const inappropriateTerms = ['explicit', 'nsfw', 'nude', 'adult'];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const term of inappropriateTerms) {
      if (lowerPrompt.includes(term)) {
        throw new Error('Inappropriate content detected in prompt');
      }
    }

    return true;
  }

  enhancePrompt(prompt) {
    // Add quality enhancers to the prompt
    const enhancers = [
      'high quality',
      'detailed',
      'professional',
      '8k resolution',
      'masterpiece'
    ];

    return `${prompt}, ${enhancers.join(', ')}`;
  }
}

module.exports = StabilityService;