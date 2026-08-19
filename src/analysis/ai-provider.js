/**
 * AI provider adapter.
 * Keep credentials outside source control.
 *
 * Replace this implementation with your chosen Claude / Amazon Q /
 * Copilot / MCP tool-calling integration during the hackathon.
 */
class AIProvider {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'none';
  }

  async enrich(requirement, deterministicAnalysis) {
    if (this.provider === 'none') {
      return deterministicAnalysis;
    }

    // Deliberately safe scaffold: no external provider is called by default.
    // Add a provider-specific implementation here.
    return deterministicAnalysis;
  }
}

module.exports = { AIProvider };
