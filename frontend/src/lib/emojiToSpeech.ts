/**
 * Converts emoji characters to natural speech equivalents before TTS.
 *
 * Philosophy: use the SEMANTIC meaning (what it conveys in context),
 * not the Unicode name ("waving hand sign" → "hello", not "wave").
 * Unknown / decorative emoji are silently removed.
 */

const EMOJI_SPEECH_MAP: Record<string, string> = {
  // Greetings / gestures
  '👋': 'hello',
  '🤝': 'great',
  '👏': 'well done',
  '👍': 'great',
  '👎': 'not quite',
  '🙌': 'excellent',
  '🫡': 'understood',
  '🫶': 'cheers',

  // Emotions / reactions
  '😊': 'great',
  '😄': '',
  '😀': '',
  '🙂': '',
  '😎': '',
  '🤔': 'hmm',
  '😅': '',
  '🥳': 'congrats',
  '😮': '',
  '😢': '',

  // Learning / education
  '🎓': '',
  '📚': '',
  '📖': '',
  '📝': '',
  '✏️': '',
  '🖊️': '',
  '📌': '',
  '📋': '',
  '🗒️': '',
  '💡': 'tip',
  '🔑': 'key point',
  '🎯': 'goal',
  '🏆': 'achievement',
  '⭐': '',
  '🌟': '',
  '✨': '',

  // Status / results
  '✅': 'correct',
  '❌': 'incorrect',
  '⚠️': 'warning',
  '❓': '',
  '‼️': '',
  '✔️': 'correct',
  '❎': 'incorrect',
  '🟢': 'pass',
  '🔴': 'fail',
  '🟡': 'average',
  '🟠': '',

  // Progress / action
  '🚀': '',
  '💪': 'great effort',
  '🔥': '',
  '⚡': '',
  '🎉': 'congrats',
  '🎊': 'congrats',
  '🏁': 'done',
  '🔄': '',
  '▶️': '',
  '⏹️': '',

  // Info / navigation
  '🔍': '',
  '🔎': '',
  '📊': '',
  '📈': '',
  '📉': '',
  '🗺️': '',
  '🗂️': '',
  '📁': '',
  '📂': '',
  '💬': '',
  '💭': '',

  // Exam / assessment specific
  '📄': '',
  '📃': '',
  '📑': '',
  '🖊': '',
  '⏱️': '',
  '⏰': '',
  '🕐': '',
};

// Matches any Unicode emoji (covers most modern emoji including ZWJ sequences)
const EMOJI_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}\u{200D}\u{20E3}]+/gu;

/**
 * Replaces emoji in `text` with natural speech words (or removes them).
 * Also strips residual markdown symbols that TTS would read literally.
 */
export function prepareForSpeech(text: string): string {
  // 1. Replace known emoji with semantic words
  let result = text;
  for (const [emoji, word] of Object.entries(EMOJI_SPEECH_MAP)) {
    if (result.includes(emoji)) {
      result = result.split(emoji).join(word ? ` ${word} ` : ' ');
    }
  }

  // 2. Remove any remaining emoji characters
  result = result.replace(EMOJI_REGEX, ' ');

  // 3. Strip markdown
  result = result
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*>]\s/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ');

  // 4. Collapse multiple spaces and trim
  return result.replace(/\s{2,}/g, ' ').trim();
}
