import {
  AiChatSuggestInput,
  AiContentAssistInput,
  AiContentAssistResponse,
  AiSmartReplyResponse,
  AiSummaryResponse,
} from '@infernux/shared';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'have', 'from', 'just', 'your', 'you',
  'are', 'was', 'were', 'been', 'will', 'would', 'could', 'should', 'what', 'when',
  'where', 'which', 'their', 'there', 'they', 'them', 'then', 'than', 'about', 'into',
  'only', 'some', 'more', 'very', 'here', 'also', 'like', 'know', 'want', 'need',
  'going', 'make', 'good', 'well', 'yeah', 'okay', 'sure', 'hey', 'hello', 'guys',
]);

const ACTION_PATTERN =
  /\b(need to|please|todo|to-do|don't forget|remember to|let's|lets|we should|can you|finish|review|prepare|schedule|send|bring|confirm|deploy|check|submit)\b/i;

const DATE_TIME_REGEX =
  /\b(?:today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}(?::\d{2})?\s?(?:am|pm)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2})\b/gi;

const HONEST_AI_DISCLAIMER =
  'Generated via deterministic on-server NLP extraction (set AI_ENDPOINT_URL for optional self-hosted LLM inference).';

export class AiAssistantService {
  private async verifyConversationAccess(userId: string, conversationId: string): Promise<void> {
    const conversation = await Conversation.findById(conversationId).select('participants');
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    const isParticipant = conversation.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
      throw new Error('Access denied: Not a participant in this conversation');
    }
  }

  private async tryExternalAiEndpoint<T>(task: string, payload: Record<string, unknown>): Promise<T | null> {
    const endpoint = process.env.AI_ENDPOINT_URL?.trim();
    if (!endpoint) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, ...payload }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  private extractKeyTopics(texts: string[]): string[] {
    const freq = new Map<string, number>();
    for (const text of texts) {
      const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
      for (const word of words) {
        if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word)) {
          continue;
        }
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);
  }

  async summarizeConversation(userId: string, input: AiChatSuggestInput): Promise<AiSummaryResponse> {
    await this.verifyConversationAccess(userId, input.conversationId);

    const recentMessages = await Message.find({
      conversationId: input.conversationId,
      isDeleted: false,
      isExpired: { $ne: true },
      $or: [{ isScheduled: false }, { scheduleStatus: 'delivered' }],
    })
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('senderId', 'displayName username');

    const ordered = recentMessages.reverse();
    const readableLines: string[] = [];
    const extractedDatesSet = new Set<string>();
    const extractedTasksSet = new Set<string>();
    const speakerNames = new Set<string>();

    for (const msg of ordered) {
      const sender = msg.senderId as any;
      const speaker = sender?.displayName || sender?.username || 'Member';
      speakerNames.add(speaker);

      const content = (msg.content || '').trim();
      if (!content) continue;
      readableLines.push(content);

      const dateMatches = content.match(DATE_TIME_REGEX);
      if (dateMatches) {
        for (const match of dateMatches) {
          extractedDatesSet.add(match.trim());
        }
      }

      const sentences = content
        .split(/[.!?\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 6);
      for (const sentence of sentences) {
        if (ACTION_PATTERN.test(sentence)) {
          extractedTasksSet.add(sentence);
        }
      }
    }

    const external = await this.tryExternalAiEndpoint<AiSummaryResponse>('summarize', {
      conversationId: input.conversationId,
      messages: readableLines.slice(-25),
    });
    if (external?.summary) {
      return {
        ...external,
        conversationId: input.conversationId,
        engine: 'external-ai-endpoint',
      };
    }

    if (readableLines.length === 0) {
      return {
        conversationId: input.conversationId,
        summary: 'No text messages available to summarize in this conversation yet.',
        keyTopics: [],
        extractedTasks: [],
        extractedDates: [],
        engine: 'mozhi-local-nlp-v1',
        disclaimer: HONEST_AI_DISCLAIMER,
      };
    }

    const keyTopics = this.extractKeyTopics(readableLines);
    const extractedTasks = [...extractedTasksSet].slice(0, 6);
    const extractedDates = [...extractedDatesSet].slice(0, 8);

    const latestSnippet = ordered
      .slice(-3)
      .map((m) => {
        const sender = (m.senderId as any)?.displayName || (m.senderId as any)?.username || 'Member';
        const snippet = (m.content || `[${m.contentType}]`).slice(0, 90);
        return `${sender}: ${snippet}`;
      })
      .join(' | ');

    const topicText = keyTopics.length > 0 ? `Topics covered: ${keyTopics.join(', ')}. ` : '';
    const taskText =
      extractedTasks.length > 0
        ? `Detected ${extractedTasks.length} action item(s). `
        : '';
    const dateText =
      extractedDates.length > 0 ? `Time/date mentions: ${extractedDates.join(', ')}. ` : '';

    const summary = `Analyzed ${readableLines.length} message(s) across ${speakerNames.size} participant(s). ${topicText}${taskText}${dateText}Recent thread: ${latestSnippet}`;

    return {
      conversationId: input.conversationId,
      summary,
      keyTopics,
      extractedTasks,
      extractedDates,
      engine: 'mozhi-local-nlp-v1',
      disclaimer: HONEST_AI_DISCLAIMER,
    };
  }

  async suggestReplies(userId: string, input: AiChatSuggestInput): Promise<AiSmartReplyResponse> {
    await this.verifyConversationAccess(userId, input.conversationId);

    const recentMessages = await Message.find({
      conversationId: input.conversationId,
      isDeleted: false,
      isExpired: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(8);

    const latestIncoming =
      recentMessages.find((m) => m.senderId.toString() !== userId) || recentMessages[0];
    const sourceText = `${latestIncoming?.content || ''} ${input.draftContext || ''}`.toLowerCase();

    const external = await this.tryExternalAiEndpoint<AiSmartReplyResponse>('replies', {
      context: sourceText,
      draftContext: input.draftContext,
    });
    if (external?.suggestions?.length) {
      return {
        suggestions: external.suggestions.slice(0, 4),
        engine: 'external-ai-endpoint',
      };
    }

    let suggestions: string[];
    if (/\b(meet|call|tomorrow|pm|am|schedule|time|calendar|friday|today)\b/i.test(sourceText)) {
      suggestions = [
        'That time works well for me!',
        'Could we shift it by 30 minutes?',
        'Let me confirm and message back shortly.',
      ];
    } else if (sourceText.includes('?') || /\b(what|when|where|who|how|can you|are you)\b/i.test(sourceText)) {
      suggestions = [
        'Yes, sounds good to me!',
        'Let me check on that and reply right away.',
        'Can you share a bit more detail?',
      ];
    } else if (/\b(thanks|thank you|awesome|great|love|congrats|happy)\b/i.test(sourceText)) {
      suggestions = [
        'Anytime! Glad I could help.',
        'Appreciate that a lot!',
        'Let me know if you need anything else.',
      ];
    } else if (/\b(file|doc|send|link|review|check|task|deploy)\b/i.test(sourceText)) {
      suggestions = [
        'Got it, reviewing this now.',
        'Thanks for sending it over!',
        'Looks solid — I will follow up with notes.',
      ];
    } else {
      suggestions = [
        'Sounds like a plan!',
        'Got it, thanks for the update.',
        'Tell me more when you have a minute.',
      ];
    }

    if (input.draftContext?.trim()) {
      const cleanDraft = input.draftContext.trim().replace(/[.!?]+$/, '');
      suggestions = [
        `${cleanDraft} — let me know what you think!`,
        ...suggestions.slice(0, 2),
      ];
    }

    return {
      suggestions,
      engine: 'mozhi-local-nlp-v1',
    };
  }

  async generateContentAssist(input: AiContentAssistInput): Promise<AiContentAssistResponse> {
    const cleanTopic = input.topic.trim();

    const external = await this.tryExternalAiEndpoint<AiContentAssistResponse>('content_assist', {
      topic: cleanTopic,
      tone: input.tone,
      mediaDescription: input.mediaDescription,
    });
    if (external?.captions?.length) {
      return {
        ...external,
        engine: 'external-ai-endpoint',
      };
    }

    const topicTokens = cleanTopic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    const uniqueKeywords = [...new Set(topicTokens)].slice(0, 4);
    const formattedTags = uniqueKeywords.map(
      (kw) => `#${kw.charAt(0).toUpperCase()}${kw.slice(1)}`
    );
    const hashtags = [...new Set([...formattedTags, '#MozhiMoments', '#CreatorStudio'])].slice(0, 6);

    let captions: string[];
    switch (input.tone) {
      case 'professional':
        captions = [
          `Exploring ${cleanTopic} — key takeaways and what is next.`,
          `A focused look at ${cleanTopic}. Curious how your team approaches this.`,
          `Sharing recent progress around ${cleanTopic}. Feedback welcome below.`,
        ];
        break;
      case 'hype':
        captions = [
          `${cleanTopic} just hit a whole new level! Who else is hyped for this?`,
          `Wait till you see how ${cleanTopic} came together!`,
          `Big energy around ${cleanTopic} today — drop your thoughts!`,
        ];
        break;
      case 'minimal':
        captions = [
          `${cleanTopic}.`,
          `Currently: ${cleanTopic}`,
          `Notes on ${cleanTopic}`,
        ];
        break;
      case 'casual':
      default:
        captions = [
          `Spending some time with ${cleanTopic} today — what do you think?`,
          `Little glimpse into ${cleanTopic} right now.`,
          `Always good vibes when working on ${cleanTopic}.`,
        ];
        break;
    }

    const contentIdeas = [
      `Reel Hook: Start with a 2-second close-up introducing "${cleanTopic}" and end with a prompt for comments.`,
      `Interactive Story: Run a poll asking followers to rate or vote on one detail of ${cleanTopic}.`,
      `Deep-Dive Follow-Up: Share a quick behind-the-scenes checklist or audio note breaking down ${cleanTopic}.`,
    ];

    const altText = input.mediaDescription?.trim()
      ? `Visual featuring ${input.mediaDescription.trim()}, framed around ${cleanTopic}.`
      : `Post visual illustrating ${cleanTopic}.`;

    return {
      captions,
      hashtags,
      contentIdeas,
      altText,
      engine: 'mozhi-local-nlp-v1',
      disclaimer: HONEST_AI_DISCLAIMER,
    };
  }
}

export const aiAssistantService = new AiAssistantService();

