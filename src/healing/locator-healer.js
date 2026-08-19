/**
 * Conservative locator-healing scaffold.
 * It captures a healing event instead of silently rewriting tests.
 * A model/MCP implementation can propose an alternate locator and
 * require an approval policy before persisting it.
 */
class LocatorHealer {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  async withHealing(action, context = {}) {
    try {
      return await action();
    } catch (error) {
      this.logger.warn('[HEALING] action failed', {
        error: error.message,
        ...context
      });
      throw error;
    }
  }
}

module.exports = { LocatorHealer };
