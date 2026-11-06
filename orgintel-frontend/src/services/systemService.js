import axios from 'axios';

export const systemService = {
  /**
   * Check system actuator health.
   */
  async checkHealth() {
    try {
      const response = await axios.get('/actuator/health', { timeout: 5000 });
      return response.data;
    } catch (err) {
      return { status: 'DOWN', error: err.message };
    }
  },
};
