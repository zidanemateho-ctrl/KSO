const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const chatEmojiCatalog = [
  { shortcode: ":smile:", emoji: "😄", label: "Sourire" },
  { shortcode: ":grin:", emoji: "😁", label: "Grand sourire" },
  { shortcode: ":joy:", emoji: "😂", label: "Rire" },
  { shortcode: ":wink:", emoji: "😉", label: "Clin d oeil" },
  { shortcode: ":heart:", emoji: "❤️", label: "Coeur" },
  { shortcode: ":thumbsup:", emoji: "👍", label: "Pouce en l air" },
  { shortcode: ":clap:", emoji: "👏", label: "Applaudissements" },
  { shortcode: ":fire:", emoji: "🔥", label: "Feu" },
  { shortcode: ":rocket:", emoji: "🚀", label: "Fusee" },
  { shortcode: ":thinking:", emoji: "🤔", label: "Reflexion" },
  { shortcode: ":pray:", emoji: "🙏", label: "Merci" },
  { shortcode: ":ok:", emoji: "👌", label: "OK" },
  { shortcode: ":party:", emoji: "🥳", label: "Fete" },
  { shortcode: ":book:", emoji: "📚", label: "Etudes" },
  { shortcode: ":target:", emoji: "🎯", label: "Objectif" },
  { shortcode: ":star:", emoji: "⭐", label: "Etoile" }
] as const;

const emojiShortcodeMap = new Map<string, string>(chatEmojiCatalog.map((item) => [item.shortcode, item.emoji]));
const emojiRegex = new RegExp(chatEmojiCatalog.map((item) => escapeRegExp(item.shortcode)).join("|"), "g");

export function applyEmojiShortcodes(content: string) {
  return content.replace(emojiRegex, (match) => emojiShortcodeMap.get(match) || match);
}
