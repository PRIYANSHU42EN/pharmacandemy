export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'nvidia' | 'openrouter';

export interface AIResponse {
  text: string;
  provider: AIProvider;
  model: string;
  latency: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIContext {
  pillar: 'study' | 'negotiator';
  fallbackEnabled: boolean;
  preferredProvider?: AIProvider;
}

export abstract class AIProviderBase {
  abstract name: AIProvider;
  abstract generateResponse(messages: ChatMessage[], model?: string): Promise<AIResponse>;
}
