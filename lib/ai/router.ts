import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  AIProvider, 
  AIResponse, 
  ChatMessage, 
  AIContext, 
  AIProviderBase 
} from './types';
import { supabaseAdmin } from '../supabase/admin';

// Provider Implementations
class OpenAIProvider implements AIProviderBase {
  name: AIProvider = 'openai';
  private _client: OpenAI | null = null;

  private get client() {
    if (!this._client) {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
      this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._client;
  }

  async generateResponse(messages: ChatMessage[], model = 'gpt-4o'): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: 0.1,
    });
    return {
      text: response.choices[0].message.content || '',
      provider: this.name,
      model,
      latency: Date.now() - start
    };
  }
}

class AnthropicProvider implements AIProviderBase {
  name: AIProvider = 'anthropic';
  private _client: Anthropic | null = null;

  private get client() {
    if (!this._client) {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
      this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this._client;
  }

  async generateResponse(messages: ChatMessage[], model = 'claude-3-5-sonnet-20241022'): Promise<AIResponse> {
    const start = Date.now();
    const system = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const response = await this.client.messages.create({
      model,
      system,
      messages: userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      max_tokens: 1024,
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    return {
      text,
      provider: this.name,
      model,
      latency: Date.now() - start
    };
  }
}

class GeminiProvider implements AIProviderBase {
  name: AIProvider = 'gemini';
  private _genAI: GoogleGenerativeAI | null = null;

  private get genAI() {
    if (!this._genAI) {
      const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY missing");
      this._genAI = new GoogleGenerativeAI(key);
    }
    return this._genAI;
  }

  async generateResponse(messages: ChatMessage[], model = 'gemini-1.5-pro'): Promise<AIResponse> {
    const start = Date.now();
    const geminiModel = this.genAI.getGenerativeModel({ model });
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    
    const chat = geminiModel.startChat({
      history: messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
      systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined
    });

    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.content);
    
    return {
      text: result.response.text(),
      provider: this.name,
      model,
      latency: Date.now() - start
    };
  }
}

class OpenRouterProvider implements AIProviderBase {
  name: AIProvider = 'openrouter';
  private _client: OpenAI | null = null;

  private get client() {
    if (!this._client) {
      if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing");
      this._client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "CubePharma",
        }
      });
    }
    return this._client;
  }

  async generateResponse(messages: ChatMessage[], model = process.env.OPENROUTER_MODEL || 'inclusionai/ring-2.6-1t:free'): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map(m => ({ role: m.role as any, content: m.content })),
      temperature: 0.1,
    });
    return {
      text: response.choices[0].message.content || '',
      provider: this.name,
      model,
      latency: Date.now() - start
    };
  }
}

// Router Logic
export class AIRouter {
  private providers: Record<AIProvider, AIProviderBase>;
  private order: AIProvider[] = ['openrouter', 'openai', 'anthropic', 'gemini'];

  constructor() {
    this.providers = {
      openai: new OpenAIProvider(),
      anthropic: new AnthropicProvider(),
      gemini: new GeminiProvider(),
      openrouter: new OpenRouterProvider(),
      nvidia: null as any
    };
  }

  async chat(messages: ChatMessage[], context: AIContext): Promise<AIResponse> {
    const attemptedProviders: AIProvider[] = [];
    const providersToTry = context.preferredProvider 
      ? [context.preferredProvider, ...this.order.filter(p => p !== context.preferredProvider)]
      : this.order;

    for (const providerKey of providersToTry) {
      try {
        const provider = this.providers[providerKey];
        if (!provider) continue;

        attemptedProviders.push(providerKey);
        const response = await provider.generateResponse(messages);
        
        // Log success
        this.logProviderActivity(response, 'success', context);
        return response;

      } catch (error: any) {
        console.error(`[AIRouter] ${providerKey} failed:`, error.message);
        this.logProviderActivity({
          provider: providerKey,
          model: 'unknown',
          text: '',
          latency: 0
        }, 'failure', context, error.message);

        if (!context.fallbackEnabled) throw error;
        // Continue to next provider
      }
    }

    throw new Error(`All AI providers failed: ${attemptedProviders.join(', ')}`);
  }

  private async logProviderActivity(
    response: AIResponse, 
    status: 'success' | 'failure', 
    context: AIContext, 
    error?: string
  ) {
    try {
      await supabaseAdmin.from('ai_provider_logs').insert({
        provider: response.provider,
        model: response.model,
        latency_ms: response.latency,
        status,
        error_message: error,
        context: context.pillar,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("[AIRouter] Failed to log activity:", e);
    }
  }
}

export const aiRouter = new AIRouter();
