import { logger } from '../utils/logger';

export interface TranslationResult {
  translatedText: string;
  targetLang: string;
  detectedSourceLang: string;
  provider: 'libretranslate' | 'offline_lexicon';
  note?: string;
}

const PHRASE_LEXICON: Record<string, Record<string, string>> = {
  es: {
    hello: 'hola',
    hi: 'hola',
    'good morning': 'buenos dias',
    'good night': 'buenas noches',
    'how are you': 'como estas',
    thanks: 'gracias',
    'thank you': 'gracias',
    yes: 'si',
    no: 'no',
    please: 'por favor',
    'see you soon': 'hasta pronto',
    'i love you': 'te quiero',
  },
  fr: {
    hello: 'bonjour',
    hi: 'salut',
    'good morning': 'bonjour',
    'good night': 'bonne nuit',
    'how are you': 'comment allez-vous',
    thanks: 'merci',
    'thank you': 'merci beaucoup',
    yes: 'oui',
    no: 'non',
    please: "s'il vous plait",
    'see you soon': 'a bientot',
    'i love you': "je t'aime",
  },
  de: {
    hello: 'hallo',
    hi: 'hallo',
    'good morning': 'guten morgen',
    'good night': 'gute nacht',
    'how are you': 'wie geht es dir',
    thanks: 'danke',
    'thank you': 'danke schon',
    yes: 'ja',
    no: 'nein',
    please: 'bitte',
    'see you soon': 'bis bald',
  },
  ta: {
    hello: 'வணக்கம்',
    hi: 'வணக்கம்',
    'good morning': 'காலை வணக்கம்',
    'good night': 'இனிய இரவு',
    'how are you': 'எப்படி இருக்கீங்க',
    thanks: 'நன்றி',
    'thank you': 'மிக்க நன்றி',
    yes: 'ஆமாம்',
    no: 'இல்லை',
    please: 'தயவுசெய்து',
  },
  hi: {
    hello: 'नमस्ते',
    hi: 'नमस्ते',
    'good morning': 'सुप्रभात',
    'good night': 'शुभ रात्रि',
    'how are you': 'आप कैसे हैं',
    thanks: 'धन्यवाद',
    'thank you': 'धन्यवाद',
    yes: 'हाँ',
    no: 'नहीं',
    please: 'कृपया',
  },
};

function detectScriptLanguage(text: string): string {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  return 'en';
}

export class TranslationService {
  async translateText(text: string, targetLang = 'en'): Promise<TranslationResult> {
    const normalizedLang = targetLang.trim().toLowerCase().slice(0, 5) || 'en';
    const detectedSourceLang = detectScriptLanguage(text);

    // Optional external self-hosted or configured LibreTranslate endpoint (no paid key required)
    const endpoint = process.env.LIBRETRANSLATE_URL;
    if (endpoint) {
      try {
        const res = await fetch(`${endpoint.replace(/\/$/, '')}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: 'auto',
            target: normalizedLang,
            format: 'text',
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            translatedText?: string;
            detectedLanguage?: { language?: string };
          };
          if (data.translatedText) {
            return {
              translatedText: data.translatedText,
              targetLang: normalizedLang,
              detectedSourceLang: data.detectedLanguage?.language || detectedSourceLang,
              provider: 'libretranslate',
            };
          }
        }
      } catch (err) {
        logger.warn('LIBRETRANSLATE_URL failed, falling back to offline lexicon', 'Translation', err);
      }
    }

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase().replace(/[.!?]+$/, '');
    const langDict = PHRASE_LEXICON[normalizedLang];

    if (langDict && langDict[lower]) {
      return {
        translatedText: langDict[lower],
        targetLang: normalizedLang,
        detectedSourceLang,
        provider: 'offline_lexicon',
      };
    }

    // Reverse lookup when translating back to English from known phrase
    if (normalizedLang === 'en') {
      for (const [srcLang, entries] of Object.entries(PHRASE_LEXICON)) {
        for (const [enPhrase, translated] of Object.entries(entries)) {
          if (translated.toLowerCase() === lower) {
            return {
              translatedText: enPhrase.charAt(0).toUpperCase() + enPhrase.slice(1),
              targetLang: 'en',
              detectedSourceLang: srcLang,
              provider: 'offline_lexicon',
            };
          }
        }
      }
    }

    // Word-level lexicon pass if partial match exists
    if (langDict) {
      const words = trimmed.split(/\s+/);
      let hitCount = 0;
      const mapped = words.map((w) => {
        const clean = w.toLowerCase().replace(/[^a-z']/g, '');
        if (langDict[clean]) {
          hitCount++;
          return langDict[clean];
        }
        return w;
      });
      if (hitCount > 0) {
        return {
          translatedText: mapped.join(' '),
          targetLang: normalizedLang,
          detectedSourceLang,
          provider: 'offline_lexicon',
          note: 'Partial offline glossary translation. Configure LIBRETRANSLATE_URL for full neural MT.',
        };
      }
    }

    return {
      translatedText: trimmed,
      targetLang: normalizedLang,
      detectedSourceLang,
      provider: 'offline_lexicon',
      note: 'Phrase not in offline glossary and LIBRETRANSLATE_URL is not configured on this server.',
    };
  }
}

export const translationService = new TranslationService();

