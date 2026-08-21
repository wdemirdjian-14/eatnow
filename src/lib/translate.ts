import type { I18nField, Lang } from '../types'

/**
 * Moteur de traduction "auto" d'Eatnow (MVP).
 *
 * En production ce module appelle un fournisseur de traduction (DeepL / Google).
 * Ici il est remplacé par un moteur lexical déterministe : un glossaire
 * culinaire FR -> N langues, appliqué par segments (expressions les plus
 * longues d'abord). Il est volontairement faillible : c'est ce qui justifie
 * le forçage manuel côté restaurateur.
 */

type Entry = Partial<Record<Lang, string>>

/** Glossaire culinaire. Clé = expression française normalisée. */
const GLOSSARY: Record<string, Entry> = {
  // --- liaisons ---
  de: { en: 'of', es: 'de', it: 'di', de: 'von', pt: 'de', nl: 'van', ru: 'из', tr: '', ar: 'من', zh: '', ja: 'の', ko: '' },
  du: { en: 'of', es: 'de', it: 'di', de: 'vom', pt: 'do', nl: 'van', ru: 'из', tr: '', ar: 'من', zh: '', ja: 'の', ko: '' },
  'à la': { en: 'with', es: 'a la', it: 'alla', de: 'nach', pt: 'à', nl: 'met', ru: 'по', tr: 'usulü', ar: 'على طريقة', zh: '风味', ja: '風', ko: '식' },
  au: { en: 'with', es: 'con', it: 'al', de: 'mit', pt: 'com', nl: 'met', ru: 'с', tr: 'ile', ar: 'مع', zh: '配', ja: '添え', ko: '곁들인' },
  aux: { en: 'with', es: 'con', it: 'ai', de: 'mit', pt: 'com', nl: 'met', ru: 'с', tr: 'ile', ar: 'مع', zh: '配', ja: '添え', ko: '곁들인' },
  et: { en: 'and', es: 'y', it: 'e', de: 'und', pt: 'e', nl: 'en', ru: 'и', tr: 've', ar: 'و', zh: '和', ja: 'と', ko: '와' },
  avec: { en: 'with', es: 'con', it: 'con', de: 'mit', pt: 'com', nl: 'met', ru: 'с', tr: 'ile', ar: 'مع', zh: '配', ja: '付き', ko: '함께' },
  maison: { en: 'homemade', es: 'casero', it: 'della casa', de: 'hausgemacht', pt: 'caseiro', nl: 'huisgemaakt', ru: 'домашний', tr: 'ev yapımı', ar: 'منزلي', zh: '自制', ja: '自家製', ko: '수제' },
  frais: { en: 'fresh', es: 'fresco', it: 'fresco', de: 'frisch', pt: 'fresco', nl: 'vers', ru: 'свежий', tr: 'taze', ar: 'طازج', zh: '新鲜', ja: '新鮮', ko: '신선한' },

  // --- viandes ---
  boeuf: { en: 'beef', es: 'ternera', it: 'manzo', de: 'Rind', pt: 'vaca', nl: 'rundvlees', ru: 'говядина', tr: 'dana', ar: 'لحم بقري', zh: '牛肉', ja: '牛肉', ko: '소고기' },
  agneau: { en: 'lamb', es: 'cordero', it: 'agnello', de: 'Lamm', pt: 'borrego', nl: 'lamsvlees', ru: 'ягнёнок', tr: 'kuzu', ar: 'لحم ضأن', zh: '羊肉', ja: 'ラム', ko: '양고기' },
  poulet: { en: 'chicken', es: 'pollo', it: 'pollo', de: 'Hähnchen', pt: 'frango', nl: 'kip', ru: 'курица', tr: 'tavuk', ar: 'دجاج', zh: '鸡肉', ja: '鶏肉', ko: '닭고기' },
  canard: { en: 'duck', es: 'pato', it: 'anatra', de: 'Ente', pt: 'pato', nl: 'eend', ru: 'утка', tr: 'ördek', ar: 'بط', zh: '鸭肉', ja: '鴨', ko: '오리' },
  porc: { en: 'pork', es: 'cerdo', it: 'maiale', de: 'Schwein', pt: 'porco', nl: 'varkensvlees', ru: 'свинина', tr: 'domuz', ar: 'لحم خنزير', zh: '猪肉', ja: '豚肉', ko: '돼지고기' },
  veau: { en: 'veal', es: 'ternera lechal', it: 'vitello', de: 'Kalb', pt: 'vitela', nl: 'kalfsvlees', ru: 'телятина', tr: 'dana eti', ar: 'لحم عجل', zh: '小牛肉', ja: '仔牛', ko: '송아지' },
  magret: { en: 'duck breast', es: 'magret', it: 'petto d’anatra', de: 'Entenbrust', pt: 'magret', nl: 'eendenborst', ru: 'утиная грудка', tr: 'ördek göğsü', ar: 'صدر بط', zh: '鸭胸', ja: '鴨胸肉', ko: '오리 가슴살' },
  entrecote: { en: 'ribeye', es: 'entrecot', it: 'entrecôte', de: 'Entrecôte', pt: 'entrecosto', nl: 'entrecote', ru: 'антрекот', tr: 'antrikot', ar: 'انتركوت', zh: '肋眼牛排', ja: 'リブロース', ko: '립아이' },
  tartare: { en: 'tartare', es: 'tartar', it: 'tartare', de: 'Tatar', pt: 'tártaro', nl: 'tartaar', ru: 'тартар', tr: 'tartar', ar: 'تارتار', zh: '塔塔', ja: 'タルタル', ko: '타르타르' },

  // --- poissons ---
  poisson: { en: 'fish', es: 'pescado', it: 'pesce', de: 'Fisch', pt: 'peixe', nl: 'vis', ru: 'рыба', tr: 'balık', ar: 'سمك', zh: '鱼', ja: '魚', ko: '생선' },
  saumon: { en: 'salmon', es: 'salmón', it: 'salmone', de: 'Lachs', pt: 'salmão', nl: 'zalm', ru: 'лосось', tr: 'somon', ar: 'سلمون', zh: '三文鱼', ja: 'サーモン', ko: '연어' },
  thon: { en: 'tuna', es: 'atún', it: 'tonno', de: 'Thunfisch', pt: 'atum', nl: 'tonijn', ru: 'тунец', tr: 'ton balığı', ar: 'تونة', zh: '金枪鱼', ja: 'マグロ', ko: '참치' },
  cabillaud: { en: 'cod', es: 'bacalao', it: 'merluzzo', de: 'Kabeljau', pt: 'bacalhau', nl: 'kabeljauw', ru: 'треска', tr: 'morina', ar: 'قد', zh: '鳕鱼', ja: 'タラ', ko: '대구' },
  crevettes: { en: 'prawns', es: 'gambas', it: 'gamberi', de: 'Garnelen', pt: 'camarões', nl: 'garnalen', ru: 'креветки', tr: 'karides', ar: 'جمبري', zh: '虾', ja: 'エビ', ko: '새우' },
  poulpe: { en: 'octopus', es: 'pulpo', it: 'polpo', de: 'Oktopus', pt: 'polvo', nl: 'octopus', ru: 'осьминог', tr: 'ahtapot', ar: 'أخطبوط', zh: '章鱼', ja: 'タコ', ko: '문어' },
  'saint-jacques': { en: 'scallops', es: 'vieiras', it: 'capesante', de: 'Jakobsmuscheln', pt: 'vieiras', nl: 'sint-jakobsschelpen', ru: 'гребешки', tr: 'deniz tarağı', ar: 'إسكالوب', zh: '扇贝', ja: 'ホタテ', ko: '가리비' },

  // --- bases ---
  riz: { en: 'rice', es: 'arroz', it: 'riso', de: 'Reis', pt: 'arroz', nl: 'rijst', ru: 'рис', tr: 'pirinç', ar: 'أرز', zh: '米饭', ja: 'ご飯', ko: '밥' },
  pates: { en: 'pasta', es: 'pasta', it: 'pasta', de: 'Pasta', pt: 'massa', nl: 'pasta', ru: 'паста', tr: 'makarna', ar: 'معكرونة', zh: '意面', ja: 'パスタ', ko: '파스타' },
  pain: { en: 'bread', es: 'pan', it: 'pane', de: 'Brot', pt: 'pão', nl: 'brood', ru: 'хлеб', tr: 'ekmek', ar: 'خبز', zh: '面包', ja: 'パン', ko: '빵' },
  frites: { en: 'fries', es: 'patatas fritas', it: 'patatine fritte', de: 'Pommes', pt: 'batatas fritas', nl: 'friet', ru: 'картофель фри', tr: 'patates kızartması', ar: 'بطاطس مقلية', zh: '薯条', ja: 'フライドポテト', ko: '감자튀김' },
  'pommes de terre': { en: 'potatoes', es: 'patatas', it: 'patate', de: 'Kartoffeln', pt: 'batatas', nl: 'aardappelen', ru: 'картофель', tr: 'patates', ar: 'بطاطس', zh: '土豆', ja: 'じゃがいも', ko: '감자' },

  // --- légumes ---
  legumes: { en: 'vegetables', es: 'verduras', it: 'verdure', de: 'Gemüse', pt: 'legumes', nl: 'groenten', ru: 'овощи', tr: 'sebze', ar: 'خضروات', zh: '蔬菜', ja: '野菜', ko: '채소' },
  salade: { en: 'salad', es: 'ensalada', it: 'insalata', de: 'Salat', pt: 'salada', nl: 'salade', ru: 'салат', tr: 'salata', ar: 'سلطة', zh: '沙拉', ja: 'サラダ', ko: '샐러드' },
  tomate: { en: 'tomato', es: 'tomate', it: 'pomodoro', de: 'Tomate', pt: 'tomate', nl: 'tomaat', ru: 'помидор', tr: 'domates', ar: 'طماطم', zh: '番茄', ja: 'トマト', ko: '토마토' },
  tomates: { en: 'tomatoes', es: 'tomates', it: 'pomodori', de: 'Tomaten', pt: 'tomates', nl: 'tomaten', ru: 'помидоры', tr: 'domates', ar: 'طماطم', zh: '番茄', ja: 'トマト', ko: '토마토' },
  champignons: { en: 'mushrooms', es: 'setas', it: 'funghi', de: 'Pilze', pt: 'cogumelos', nl: 'champignons', ru: 'грибы', tr: 'mantar', ar: 'فطر', zh: '蘑菇', ja: 'きのこ', ko: '버섯' },
  oignon: { en: 'onion', es: 'cebolla', it: 'cipolla', de: 'Zwiebel', pt: 'cebola', nl: 'ui', ru: 'лук', tr: 'soğan', ar: 'بصل', zh: '洋葱', ja: '玉ねぎ', ko: '양파' },
  aubergine: { en: 'aubergine', es: 'berenjena', it: 'melanzana', de: 'Aubergine', pt: 'beringela', nl: 'aubergine', ru: 'баклажан', tr: 'patlıcan', ar: 'باذنجان', zh: '茄子', ja: 'ナス', ko: '가지' },
  courgette: { en: 'courgette', es: 'calabacín', it: 'zucchina', de: 'Zucchini', pt: 'courgette', nl: 'courgette', ru: 'кабачок', tr: 'kabak', ar: 'كوسة', zh: '西葫芦', ja: 'ズッキーニ', ko: '애호박' },
  'pois chiches': { en: 'chickpeas', es: 'garbanzos', it: 'ceci', de: 'Kichererbsen', pt: 'grão-de-bico', nl: 'kikkererwten', ru: 'нут', tr: 'nohut', ar: 'حمص', zh: '鹰嘴豆', ja: 'ひよこ豆', ko: '병아리콩' },
  avocat: { en: 'avocado', es: 'aguacate', it: 'avocado', de: 'Avocado', pt: 'abacate', nl: 'avocado', ru: 'авокадо', tr: 'avokado', ar: 'أفوكادو', zh: '牛油果', ja: 'アボカド', ko: '아보카도' },
  truffe: { en: 'truffle', es: 'trufa', it: 'tartufo', de: 'Trüffel', pt: 'trufa', nl: 'truffel', ru: 'трюфель', tr: 'trüf', ar: 'كمأة', zh: '松露', ja: 'トリュフ', ko: '트러플' },

  // --- produits laitiers / condiments ---
  fromage: { en: 'cheese', es: 'queso', it: 'formaggio', de: 'Käse', pt: 'queijo', nl: 'kaas', ru: 'сыр', tr: 'peynir', ar: 'جبن', zh: '奶酪', ja: 'チーズ', ko: '치즈' },
  chevre: { en: 'goat cheese', es: 'queso de cabra', it: 'caprino', de: 'Ziegenkäse', pt: 'queijo de cabra', nl: 'geitenkaas', ru: 'козий сыр', tr: 'keçi peyniri', ar: 'جبن ماعز', zh: '山羊奶酪', ja: 'シェーヴル', ko: '염소치즈' },
  parmesan: { en: 'parmesan', es: 'parmesano', it: 'parmigiano', de: 'Parmesan', pt: 'parmesão', nl: 'parmezaan', ru: 'пармезан', tr: 'parmesan', ar: 'بارميزان', zh: '帕玛森', ja: 'パルメザン', ko: '파르메산' },
  mozzarella: { en: 'mozzarella', es: 'mozzarella', it: 'mozzarella', de: 'Mozzarella', pt: 'mozzarella', nl: 'mozzarella', ru: 'моцарелла', tr: 'mozzarella', ar: 'موزاريلا', zh: '马苏里拉', ja: 'モッツァレラ', ko: '모차렐라' },
  beurre: { en: 'butter', es: 'mantequilla', it: 'burro', de: 'Butter', pt: 'manteiga', nl: 'boter', ru: 'масло', tr: 'tereyağı', ar: 'زبدة', zh: '黄油', ja: 'バター', ko: '버터' },
  creme: { en: 'cream', es: 'nata', it: 'panna', de: 'Sahne', pt: 'natas', nl: 'room', ru: 'сливки', tr: 'krema', ar: 'كريمة', zh: '奶油', ja: 'クリーム', ko: '크림' },
  sauce: { en: 'sauce', es: 'salsa', it: 'salsa', de: 'Sauce', pt: 'molho', nl: 'saus', ru: 'соус', tr: 'sos', ar: 'صلصة', zh: '酱', ja: 'ソース', ko: '소스' },
  'huile d’olive': { en: 'olive oil', es: 'aceite de oliva', it: 'olio d’oliva', de: 'Olivenöl', pt: 'azeite', nl: 'olijfolie', ru: 'оливковое масло', tr: 'zeytinyağı', ar: 'زيت زيتون', zh: '橄榄油', ja: 'オリーブオイル', ko: '올리브유' },
  basilic: { en: 'basil', es: 'albahaca', it: 'basilico', de: 'Basilikum', pt: 'manjericão', nl: 'basilicum', ru: 'базилик', tr: 'fesleğen', ar: 'ريحان', zh: '罗勒', ja: 'バジル', ko: '바질' },
  citron: { en: 'lemon', es: 'limón', it: 'limone', de: 'Zitrone', pt: 'limão', nl: 'citroen', ru: 'лимон', tr: 'limon', ar: 'ليمون', zh: '柠檬', ja: 'レモン', ko: '레몬' },
  miel: { en: 'honey', es: 'miel', it: 'miele', de: 'Honig', pt: 'mel', nl: 'honing', ru: 'мёд', tr: 'bal', ar: 'عسل', zh: '蜂蜜', ja: '蜂蜜', ko: '꿀' },

  // --- plats & préparations ---
  soupe: { en: 'soup', es: 'sopa', it: 'zuppa', de: 'Suppe', pt: 'sopa', nl: 'soep', ru: 'суп', tr: 'çorba', ar: 'شوربة', zh: '汤', ja: 'スープ', ko: '수프' },
  entree: { en: 'starter', es: 'entrante', it: 'antipasto', de: 'Vorspeise', pt: 'entrada', nl: 'voorgerecht', ru: 'закуска', tr: 'başlangıç', ar: 'مقبلات', zh: '前菜', ja: '前菜', ko: '전채' },
  entrees: { en: 'Starters', es: 'Entrantes', it: 'Antipasti', de: 'Vorspeisen', pt: 'Entradas', nl: 'Voorgerechten', ru: 'Закуски', tr: 'Başlangıçlar', ar: 'المقبلات', zh: '前菜', ja: '前菜', ko: '전채' },
  plats: { en: 'Main courses', es: 'Platos principales', it: 'Secondi', de: 'Hauptgerichte', pt: 'Pratos principais', nl: 'Hoofdgerechten', ru: 'Основные блюда', tr: 'Ana yemekler', ar: 'الأطباق الرئيسية', zh: '主菜', ja: 'メイン', ko: '메인' },
  desserts: { en: 'Desserts', es: 'Postres', it: 'Dolci', de: 'Desserts', pt: 'Sobremesas', nl: 'Nagerechten', ru: 'Десерты', tr: 'Tatlılar', ar: 'الحلويات', zh: '甜点', ja: 'デザート', ko: '디저트' },
  boissons: { en: 'Drinks', es: 'Bebidas', it: 'Bevande', de: 'Getränke', pt: 'Bebidas', nl: 'Dranken', ru: 'Напитки', tr: 'İçecekler', ar: 'المشروبات', zh: '饮品', ja: 'ドリンク', ko: '음료' },
  dessert: { en: 'dessert', es: 'postre', it: 'dolce', de: 'Dessert', pt: 'sobremesa', nl: 'nagerecht', ru: 'десерт', tr: 'tatlı', ar: 'حلوى', zh: '甜点', ja: 'デザート', ko: '디저트' },
  gateau: { en: 'cake', es: 'pastel', it: 'torta', de: 'Kuchen', pt: 'bolo', nl: 'taart', ru: 'торт', tr: 'kek', ar: 'كعكة', zh: '蛋糕', ja: 'ケーキ', ko: '케이크' },
  tarte: { en: 'tart', es: 'tarta', it: 'crostata', de: 'Tarte', pt: 'tarte', nl: 'taart', ru: 'тарт', tr: 'tart', ar: 'فطيرة', zh: '塔', ja: 'タルト', ko: '타르트' },
  glace: { en: 'ice cream', es: 'helado', it: 'gelato', de: 'Eis', pt: 'gelado', nl: 'ijs', ru: 'мороженое', tr: 'dondurma', ar: 'آيس كريم', zh: '冰淇淋', ja: 'アイス', ko: '아이스크림' },
  chocolat: { en: 'chocolate', es: 'chocolate', it: 'cioccolato', de: 'Schokolade', pt: 'chocolate', nl: 'chocolade', ru: 'шоколад', tr: 'çikolata', ar: 'شوكولاتة', zh: '巧克力', ja: 'チョコレート', ko: '초콜릿' },
  grille: { en: 'grilled', es: 'a la parrilla', it: 'alla griglia', de: 'gegrillt', pt: 'grelhado', nl: 'gegrild', ru: 'на гриле', tr: 'ızgara', ar: 'مشوي', zh: '烤', ja: 'グリル', ko: '구이' },
  grillee: { en: 'grilled', es: 'a la parrilla', it: 'alla griglia', de: 'gegrillt', pt: 'grelhada', nl: 'gegrild', ru: 'на гриле', tr: 'ızgara', ar: 'مشوي', zh: '烤', ja: 'グリル', ko: '구이' },
  gratinee: { en: 'gratinated', es: 'gratinada', it: 'gratinata', de: 'überbacken', pt: 'gratinada', nl: 'gegratineerd', ru: 'запечённый', tr: 'graten', ar: 'غراتان', zh: '焗', ja: 'グラタン', ko: '그라탱' },
  mijote: { en: 'slow-cooked', es: 'estofado', it: 'stufato', de: 'geschmort', pt: 'estufado', nl: 'gestoofd', ru: 'тушёный', tr: 'yahni', ar: 'مطهو ببطء', zh: '慢炖', ja: '煮込み', ko: '조림' },
  vapeur: { en: 'steamed', es: 'al vapor', it: 'al vapore', de: 'gedämpft', pt: 'ao vapor', nl: 'gestoomd', ru: 'на пару', tr: 'buharda', ar: 'مطهو بالبخار', zh: '清蒸', ja: '蒸し', ko: '찜' },
  epice: { en: 'spicy', es: 'picante', it: 'piccante', de: 'scharf', pt: 'picante', nl: 'pittig', ru: 'острый', tr: 'acılı', ar: 'حار', zh: '辣', ja: '辛口', ko: '매운' },
  'plat du jour': { en: 'Dish of the day', es: 'Plato del día', it: 'Piatto del giorno', de: 'Tagesgericht', pt: 'Prato do dia', nl: 'Dagschotel', ru: 'Блюдо дня', tr: 'Günün yemeği', ar: 'طبق اليوم', zh: '每日精选', ja: '本日のおすすめ', ko: '오늘의 요리' },
}

/** Normalise pour la recherche au glossaire (minuscules, sans accents). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/’/g, "'")
}

const MAX_NGRAM = 3

export interface AutoResult {
  text: string
  /** Part des segments effectivement traduits (0 -> 1). */
  confidence: number
}

/**
 * Traduit un texte source (français) vers `to`.
 * Retourne aussi un indice de confiance qui alimente l'alerte
 * "traduction à vérifier" dans l'espace restaurateur.
 */
export function autoTranslate(text: string, from: Lang, to: Lang): AutoResult {
  if (!text.trim()) return { text: '', confidence: 1 }
  if (from === to) return { text, confidence: 1 }

  // Le glossaire du MVP part du français.
  if (from !== 'fr') return { text, confidence: 0 }

  const tokens = text.split(/(\s+|[,.;:()!?])/).filter((t) => t !== '')
  const out: string[] = []
  let hits = 0
  let words = 0
  let i = 0

  while (i < tokens.length) {
    const tok = tokens[i]
    if (/^\s+$/.test(tok) || /^[,.;:()!?]$/.test(tok)) {
      out.push(tok)
      i++
      continue
    }

    let matched = false
    for (let n = MAX_NGRAM; n >= 1 && !matched; n--) {
      const slice = tokens.slice(i, i + n * 2 - 1)
      if (slice.length < n * 2 - 1) continue
      const phrase = norm(slice.join(''))
      const entry = GLOSSARY[phrase]
      const tr = entry?.[to]
      if (tr !== undefined) {
        if (tr !== '') out.push(tr)
        else if (out.length && !/\s$/.test(out[out.length - 1])) out.push('')
        hits++
        words++
        i += n * 2 - 1
        matched = true
      }
    }

    if (!matched) {
      out.push(tok)
      words++
      i++
    }
  }

  const joined = out
    .join('')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()

  const confidence = words === 0 ? 1 : hits / words
  const text2 = joined.charAt(0).toUpperCase() + joined.slice(1)
  return { text: text2, confidence: Math.round(confidence * 100) / 100 }
}

/** Crée un champ multilingue à partir d'un texte source. */
export function field(source: string): I18nField {
  return { source, auto: {}, manual: {} }
}

/** (Re)calcule les traductions automatiques manquantes d'un champ. */
export function fillAuto(f: I18nField, from: Lang, langs: Lang[]): I18nField {
  const auto = { ...f.auto }
  for (const l of langs) {
    if (l === from) continue
    auto[l] = autoTranslate(f.source, from, l).text
  }
  return { ...f, auto }
}

/**
 * Résout l'affichage d'un champ pour une langue :
 * forçage manuel > traduction auto > texte source.
 */
export function resolve(f: I18nField | undefined, lang: Lang, sourceLang: Lang): string {
  if (!f) return ''
  if (lang === sourceLang) return f.source
  return f.manual[lang] || f.auto[lang] || f.source
}

/** Origine du texte affiché — utilisé pour les badges dans l'admin/back-office. */
export function originOf(f: I18nField, lang: Lang, sourceLang: Lang): 'source' | 'manuel' | 'auto' | 'manquant' {
  if (lang === sourceLang) return 'source'
  if (f.manual[lang]) return 'manuel'
  if (f.auto[lang]) return 'auto'
  return 'manquant'
}
