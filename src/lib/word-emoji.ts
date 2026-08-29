/**
 * Small, free (no API) picture-hint for a vocabulary word.
 * Exact word match first, then a keyword/category fallback.
 */
const EXACT: Record<string, string> = {
  hello: "👋", hi: "👋", welcome: "🤝", goodbye: "👋", please: "🙏", "thank you": "🙏", sorry: "😔",
  name: "🏷️", first: "1️⃣", last: "🔚", meet: "🤝", friend: "🧑‍🤝‍🧑", student: "🧑‍🎓", teacher: "🧑‍🏫",
  school: "🏫", class: "🪑", classroom: "🏫", book: "📖", notebook: "📓", pen: "🖊️", pencil: "✏️",
  bag: "🎒", desk: "🪑", chair: "🪑", table: "🪑", board: "🖼️", homework: "📝", lesson: "📚",
  city: "🏙️", country: "🌍", world: "🌎", street: "🛣️", house: "🏠", home: "🏠", room: "🛏️",
  kitchen: "🍳", bathroom: "🛁", garden: "🌳", door: "🚪", window: "🪟", family: "👨‍👩‍👧‍👦",
  mother: "👩", father: "👨", sister: "👧", brother: "👦", baby: "👶", son: "👦", daughter: "👧",
  man: "👨", woman: "👩", boy: "👦", girl: "👧", people: "👥", child: "🧒",
  water: "💧", tea: "🍵", coffee: "☕", milk: "🥛", juice: "🧃", bread: "🍞", rice: "🍚",
  food: "🍽️", fruit: "🍎", apple: "🍎", banana: "🍌", egg: "🥚", fish: "🐟", meat: "🥩",
  breakfast: "🥐", lunch: "🍛", dinner: "🍽️", restaurant: "🍴", cook: "👨‍🍳", eat: "🍴", drink: "🥤",
  work: "💼", job: "💼", office: "🏢", money: "💰", price: "🏷️", buy: "🛒", sell: "🏪",
  shop: "🏬", market: "🛍️", ticket: "🎫", bank: "🏦", phone: "📱", computer: "💻", email: "📧",
  car: "🚗", bus: "🚌", train: "🚆", plane: "✈️", flight: "✈️", airport: "🛫", station: "🚉",
  travel: "🧳", journey: "🗺️", trip: "🧳", luggage: "🧳", suitcase: "💼", passenger: "🧍",
  departure: "🛫", arrival: "🛬", platform: "🚉", abroad: "🌍", tourist: "📷", delay: "⏳",
  distance: "📏", map: "🗺️", hotel: "🏨", beach: "🏖️", sea: "🌊", mountain: "⛰️",
  day: "📅", week: "🗓️", month: "📆", year: "🗓️", time: "⏰", morning: "🌅", night: "🌙",
  today: "📅", tomorrow: "➡️", yesterday: "⬅️", clock: "🕐", hour: "⌛", minute: "⏱️",
  weather: "⛅", sun: "☀️", rain: "🌧️", snow: "❄️", wind: "💨", hot: "🔥", cold: "🥶",
  happy: "😊", sad: "😢", angry: "😠", tired: "😴", sick: "🤒", doctor: "🧑‍⚕️", hospital: "🏥",
  sport: "⚽", football: "⚽", run: "🏃", swim: "🏊", music: "🎵", film: "🎬", movie: "🎬",
  game: "🎮", party: "🎉", gift: "🎁", photo: "📷", art: "🎨", read: "📖", write: "✍️",
  listen: "🎧", speak: "🗣️", learn: "🧠", study: "📚", question: "❓", answer: "✅",
  new: "✨", old: "🧓", big: "🔵", small: "🔹", good: "👍", bad: "👎", from: "📍", love: "❤️",
};

const KEYWORDS: [RegExp, string][] = [
  [/travel|trip|tour|journey|flight|airport/i, "✈️"],
  [/food|eat|meal|cook|restaurant|kitchen/i, "🍽️"],
  [/family|parent|relative/i, "👨‍👩‍👧‍👦"],
  [/school|study|educat|learn|academ/i, "🎓"],
  [/work|job|business|office|career/i, "💼"],
  [/health|body|medic|doctor/i, "🩺"],
  [/money|shop|buy|market|price|econom/i, "💰"],
  [/tech|comput|digital|internet|online/i, "💻"],
  [/nature|environment|animal|plant/i, "🌿"],
  [/city|place|home|house|hous/i, "🏙️"],
  [/sport|game|play|exercise/i, "⚽"],
  [/time|day|week|month|year/i, "⏰"],
  [/feel|emotion|happy|mood/i, "😊"],
  [/weather|climate|season/i, "⛅"],
  [/transport|car|bus|train/i, "🚌"],
];

export function wordEmoji(word: string, category?: string | null): string | null {
  const w = word.trim().toLowerCase();
  if (EXACT[w]) return EXACT[w]!;
  const stem = w.replace(/(ing|ed|es|s)$/, "");
  if (EXACT[stem]) return EXACT[stem]!;
  for (const [re, e] of KEYWORDS) if (re.test(w)) return e;
  if (category) for (const [re, e] of KEYWORDS) if (re.test(category)) return e;
  return null;
}
