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

/** Glossaire culinaire brut. Clé = expression française normalisée. */
const RAW_GLOSSARY: Record<string, Entry> = {
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
  "huile d'olive": { en: 'olive oil', es: 'aceite de oliva', it: 'olio d’oliva', de: 'Olivenöl', pt: 'azeite', nl: 'olijfolie', ru: 'оливковое масло', tr: 'zeytinyağı', ar: 'زيت زيتون', zh: '橄榄油', ja: 'オリーブオイル', ko: '올리브유' },
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

  // --- options : cuissons, accompagnements, portions ---
  cuisson: { en: 'Cooking', es: 'Punto', it: 'Cottura', de: 'Garstufe', pt: 'Ponto', nl: 'Bakwijze', ru: 'Прожарка', tr: 'Pişirme', ar: 'درجة الطهي', zh: '熟度', ja: '焼き加減', ko: '굽기 정도' },
  bleu: { en: 'Blue', es: 'Vuelta y vuelta', it: 'Al sangue estremo', de: 'Blau', pt: 'Muito mal passado', nl: 'Blauw', ru: 'С кровью', tr: 'Az pişmiş', ar: 'نيء جداً', zh: '一分熟', ja: 'ブルー', ko: '레어보다 덜' },
  saignant: { en: 'Rare', es: 'Poco hecho', it: 'Al sangue', de: 'Blutig', pt: 'Mal passado', nl: 'Rood', ru: 'Слабой прожарки', tr: 'Az pişmiş', ar: 'نصف نيء', zh: '三分熟', ja: 'レア', ko: '레어' },
  rose: { en: 'Pink', es: 'Rosado', it: 'Rosato', de: 'Rosa', pt: 'Rosado', nl: 'Rosé', ru: 'Розовый', tr: 'Pembe', ar: 'وردي', zh: '五分熟', ja: 'ミディアムレア', ko: '미디엄 레어' },
  'a point': { en: 'Medium', es: 'Al punto', it: 'Media cottura', de: 'Medium', pt: 'Ao ponto', nl: 'Medium', ru: 'Средней прожарки', tr: 'Orta', ar: 'متوسط', zh: '七分熟', ja: 'ミディアム', ko: '미디엄' },
  'bien cuit': { en: 'Well done', es: 'Muy hecho', it: 'Ben cotta', de: 'Durchgebraten', pt: 'Bem passado', nl: 'Doorbakken', ru: 'Хорошо прожаренный', tr: 'İyi pişmiş', ar: 'ناضج تماماً', zh: '全熟', ja: 'ウェルダン', ko: '웰던' },
  accompagnement: { en: 'Side', es: 'Guarnición', it: 'Contorno', de: 'Beilage', pt: 'Acompanhamento', nl: 'Bijgerecht', ru: 'Гарнир', tr: 'Garnitür', ar: 'طبق جانبي', zh: '配菜', ja: '付け合わせ', ko: '사이드' },
  'salade verte': { en: 'Green salad', es: 'Ensalada verde', it: 'Insalata verde', de: 'Grüner Salat', pt: 'Salada verde', nl: 'Groene salade', ru: 'Зелёный салат', tr: 'Yeşil salata', ar: 'سلطة خضراء', zh: '生菜沙拉', ja: 'グリーンサラダ', ko: '그린 샐러드' },
  'legumes de saison': { en: 'Seasonal vegetables', es: 'Verduras de temporada', it: 'Verdure di stagione', de: 'Saisongemüse', pt: 'Legumes da época', nl: 'Seizoensgroenten', ru: 'Сезонные овощи', tr: 'Mevsim sebzeleri', ar: 'خضار موسمية', zh: '时令蔬菜', ja: '季節の野菜', ko: '제철 채소' },
  'frites maison': { en: 'Homemade fries', es: 'Patatas fritas caseras', it: 'Patatine fatte in casa', de: 'Hausgemachte Pommes', pt: 'Batatas fritas caseiras', nl: 'Huisgemaakte friet', ru: 'Домашний картофель фри', tr: 'Ev yapımı patates', ar: 'بطاطس منزلية', zh: '自制薯条', ja: '自家製フライドポテト', ko: '수제 감자튀김' },
  supplements: { en: 'Extras', es: 'Extras', it: 'Aggiunte', de: 'Extras', pt: 'Extras', nl: 'Extra’s', ru: 'Добавки', tr: 'Ekstralar', ar: 'إضافات', zh: '加料', ja: 'トッピング', ko: '추가' },
  supplement: { en: 'Extra', es: 'Extra', it: 'Aggiunta', de: 'Extra', pt: 'Extra', nl: 'Extra', ru: 'Добавка', tr: 'Ekstra', ar: 'إضافة', zh: '加料', ja: 'トッピング', ko: '추가' },
  portion: { en: 'Portion', es: 'Ración', it: 'Porzione', de: 'Portion', pt: 'Porção', nl: 'Portie', ru: 'Порция', tr: 'Porsiyon', ar: 'حصة', zh: '份量', ja: '量', ko: '양' },
  'portion normale': { en: 'Regular portion', es: 'Ración normal', it: 'Porzione normale', de: 'Normale Portion', pt: 'Porção normal', nl: 'Normale portie', ru: 'Обычная порция', tr: 'Normal porsiyon', ar: 'حصة عادية', zh: '标准份', ja: '普通盛り', ko: '보통' },
  'grande portion': { en: 'Large portion', es: 'Ración grande', it: 'Porzione grande', de: 'Große Portion', pt: 'Porção grande', nl: 'Grote portie', ru: 'Большая порция', tr: 'Büyük porsiyon', ar: 'حصة كبيرة', zh: '大份', ja: '大盛り', ko: '곱빼기' },
  contenance: { en: 'Size', es: 'Tamaño', it: 'Formato', de: 'Größe', pt: 'Tamanho', nl: 'Inhoud', ru: 'Объём', tr: 'Hacim', ar: 'الحجم', zh: '容量', ja: '容量', ko: '용량' },
  verre: { en: 'Glass', es: 'Copa', it: 'Bicchiere', de: 'Glas', pt: 'Copo', nl: 'Glas', ru: 'Бокал', tr: 'Kadeh', ar: 'كأس', zh: '杯', ja: 'グラス', ko: '잔' },
  base: { en: 'Base', es: 'Base', it: 'Base', de: 'Basis', pt: 'Base', nl: 'Basis', ru: 'Основа', tr: 'Taban', ar: 'الأساس', zh: '主食', ja: 'ベース', ko: '베이스' },
  'riz complet': { en: 'Brown rice', es: 'Arroz integral', it: 'Riso integrale', de: 'Vollkornreis', pt: 'Arroz integral', nl: 'Zilvervliesrijst', ru: 'Бурый рис', tr: 'Esmer pirinç', ar: 'أرز كامل', zh: '糙米', ja: '玄米', ko: '현미' },
  quinoa: { en: 'Quinoa', es: 'Quinoa', it: 'Quinoa', de: 'Quinoa', pt: 'Quinoa', nl: 'Quinoa', ru: 'Киноа', tr: 'Kinoa', ar: 'كينوا', zh: '藜麦', ja: 'キヌア', ko: '퀴노아' },
  oeuf: { en: 'Egg', es: 'Huevo', it: 'Uovo', de: 'Ei', pt: 'Ovo', nl: 'Ei', ru: 'Яйцо', tr: 'Yumurta', ar: 'بيضة', zh: '鸡蛋', ja: '卵', ko: '계란' },
  'oeuf marine': { en: 'Marinated egg', es: 'Huevo marinado', it: 'Uovo marinato', de: 'Mariniertes Ei', pt: 'Ovo marinado', nl: 'Gemarineerd ei', ru: 'Маринованное яйцо', tr: 'Marine yumurta', ar: 'بيضة متبلة', zh: '溏心蛋', ja: '味玉', ko: '반숙 계란' },
  jambon: { en: 'Ham', es: 'Jamón', it: 'Prosciutto', de: 'Schinken', pt: 'Fiambre', nl: 'Ham', ru: 'Ветчина', tr: 'Jambon', ar: 'لحم مقدد', zh: '火腿', ja: 'ハム', ko: '햄' },
  roquette: { en: 'Rocket', es: 'Rúcula', it: 'Rucola', de: 'Rucola', pt: 'Rúcula', nl: 'Rucola', ru: 'Руккола', tr: 'Roka', ar: 'جرجير', zh: '芝麻菜', ja: 'ルッコラ', ko: '루꼴라' },
  burrata: { en: 'Burrata', es: 'Burrata', it: 'Burrata', de: 'Burrata', pt: 'Burrata', nl: 'Burrata', ru: 'Буррата', tr: 'Burrata', ar: 'بوراتا', zh: '布拉塔', ja: 'ブラータ', ko: '부라타' },
  graines: { en: 'Seeds', es: 'Semillas', it: 'Semi', de: 'Samen', pt: 'Sementes', nl: 'Zaden', ru: 'Семена', tr: 'Tohumlar', ar: 'بذور', zh: '籽', ja: 'シード', ko: '씨앗' },
  courge: { en: 'Squash', es: 'Calabaza', it: 'Zucca', de: 'Kürbis', pt: 'Abóbora', nl: 'Pompoen', ru: 'Тыква', tr: 'Kabak', ar: 'قرع', zh: '南瓜', ja: 'かぼちゃ', ko: '호박' },
  'sauce blanche': { en: 'White sauce', es: 'Salsa blanca', it: 'Salsa bianca', de: 'Weiße Sauce', pt: 'Molho branco', nl: 'Witte saus', ru: 'Белый соус', tr: 'Beyaz sos', ar: 'صلصة بيضاء', zh: '白酱', ja: 'ホワイトソース', ko: '화이트 소스' },
  'sauce piquante': { en: 'Hot sauce', es: 'Salsa picante', it: 'Salsa piccante', de: 'Scharfe Sauce', pt: 'Molho picante', nl: 'Pittige saus', ru: 'Острый соус', tr: 'Acı sos', ar: 'صلصة حارة', zh: '辣酱', ja: '辛口ソース', ko: '매운 소스' },
  'sauce epicee': { en: 'Spicy sauce', es: 'Salsa picante', it: 'Salsa piccante', de: 'Würzige Sauce', pt: 'Molho picante', nl: 'Pittige saus', ru: 'Пряный соус', tr: 'Baharatlı sos', ar: 'صلصة حارة', zh: '香辣酱', ja: 'スパイシーソース', ko: '매콤 소스' },
  'sauce maison': { en: 'House sauce', es: 'Salsa de la casa', it: 'Salsa della casa', de: 'Hausgemachte Sauce', pt: 'Molho da casa', nl: 'Huissaus', ru: 'Фирменный соус', tr: 'Ev sosu', ar: 'صلصة المنزل', zh: '招牌酱', ja: '自家製ソース', ko: '수제 소스' },
  'sans sauce': { en: 'No sauce', es: 'Sin salsa', it: 'Senza salsa', de: 'Ohne Sauce', pt: 'Sem molho', nl: 'Zonder saus', ru: 'Без соуса', tr: 'Sossuz', ar: 'بدون صلصة', zh: '不加酱', ja: 'ソースなし', ko: '소스 없이' },
  "niveau d'epice": { en: 'Spice level', es: 'Nivel de picante', it: 'Livello di piccante', de: 'Schärfegrad', pt: 'Nível de picante', nl: 'Pittigheid', ru: 'Острота', tr: 'Acı seviyesi', ar: 'درجة الحرارة', zh: '辣度', ja: '辛さ', ko: '맵기' },
  doux: { en: 'Mild', es: 'Suave', it: 'Delicato', de: 'Mild', pt: 'Suave', nl: 'Mild', ru: 'Мягкий', tr: 'Az acı', ar: 'خفيف', zh: '微辣', ja: '甘口', ko: '순한맛' },
  moyen: { en: 'Medium', es: 'Medio', it: 'Medio', de: 'Mittel', pt: 'Médio', nl: 'Medium', ru: 'Средний', tr: 'Orta', ar: 'متوسط', zh: '中辣', ja: '中辛', ko: '보통맛' },
  'tres epice': { en: 'Very spicy', es: 'Muy picante', it: 'Molto piccante', de: 'Sehr scharf', pt: 'Muito picante', nl: 'Zeer pittig', ru: 'Очень острый', tr: 'Çok acı', ar: 'حار جداً', zh: '重辣', ja: '激辛', ko: '아주 매운맛' },
  gratin: { en: 'Gratin', es: 'Gratén', it: 'Gratin', de: 'Gratin', pt: 'Gratinado', nl: 'Gratin', ru: 'Гратен', tr: 'Graten', ar: 'غراتان', zh: '焗菜', ja: 'グラタン', ko: '그라탱' },

  // --- vocabulaire des descriptions de la carte ---
  'au four': { en: 'oven-baked', es: 'al horno', it: 'al forno', de: 'im Ofen gebacken', pt: 'no forno', nl: 'uit de oven', ru: 'запечённый в духовке', tr: 'fırında', ar: 'في الفرن', zh: '烤箱烘烤', ja: 'オーブン焼き', ko: '오븐구이' },
  oignons: { en: 'onions', es: 'cebollas', it: 'cipolle', de: 'Zwiebeln', pt: 'cebolas', nl: 'uien', ru: 'лук', tr: 'soğanlar', ar: 'بصل', zh: '洋葱', ja: '玉ねぎ', ko: '양파' },
  'pain de campagne': { en: 'country bread', es: 'pan de pueblo', it: 'pane casereccio', de: 'Landbrot', pt: 'pão rústico', nl: 'landbrood', ru: 'деревенский хлеб', tr: 'köy ekmeği', ar: 'خبز ريفي', zh: '乡村面包', ja: 'カンパーニュ', ko: '시골빵' },
  mijotes: { en: 'slow-cooked', es: 'estofados', it: 'stufate', de: 'geschmort', pt: 'estufados', nl: 'gestoofd', ru: 'тушёные', tr: 'yahni', ar: 'مطهو ببطء', zh: '慢炖', ja: '煮込み', ko: '조림' },
  gratine: { en: 'gratinated', es: 'gratinado', it: 'gratinato', de: 'überbacken', pt: 'gratinado', nl: 'gegratineerd', ru: 'запечённый', tr: 'graten', ar: 'غراتان', zh: '焗', ja: 'グラタン', ko: '그라탱' },
  midi: { en: 'lunch', es: 'mediodía', it: 'pranzo', de: 'Mittag', pt: 'almoço', nl: 'lunch', ru: 'обед', tr: 'öğle', ar: 'الغداء', zh: '午市', ja: 'ランチ', ko: '점심' },
  decouverte: { en: 'tasting', es: 'degustación', it: 'degustazione', de: 'Entdecker', pt: 'degustação', nl: 'ontdekking', ru: 'дегустационный', tr: 'keşif', ar: 'اكتشاف', zh: '品鉴', ja: 'おまかせ', ko: '테이스팅' },
  ardoise: { en: 'daily board', es: 'pizarra del día', it: 'lavagna del giorno', de: 'Tagestafel', pt: 'quadro do dia', nl: 'dagbord', ru: 'доска дня', tr: 'günün tahtası', ar: 'لوح اليوم', zh: '每日黑板', ja: '本日の黒板', ko: '오늘의 메뉴판' },
  servi: { en: 'served', es: 'servido', it: 'servito', de: 'serviert', pt: 'servido', nl: 'geserveerd', ru: 'подаётся', tr: 'servis edilir', ar: 'يُقدَّم', zh: '供应', ja: '提供', ko: '제공' },
  'au choix': { en: 'of your choice', es: 'a elegir', it: 'a scelta', de: 'nach Wahl', pt: 'à escolha', nl: 'naar keuze', ru: 'на выбор', tr: 'seçmeli', ar: 'حسب الاختيار', zh: '任选', ja: 'お好みで', ko: '선택' },
  cafe: { en: 'coffee', es: 'café', it: 'caffè', de: 'Kaffee', pt: 'café', nl: 'koffie', ru: 'кофе', tr: 'kahve', ar: 'قهوة', zh: '咖啡', ja: 'コーヒー', ko: '커피' },
  mardi: { en: 'Tuesday', es: 'martes', it: 'martedì', de: 'Dienstag', pt: 'terça', nl: 'dinsdag', ru: 'вторник', tr: 'salı', ar: 'الثلاثاء', zh: '周二', ja: '火曜', ko: '화요일' },
  vendredi: { en: 'Friday', es: 'viernes', it: 'venerdì', de: 'Freitag', pt: 'sexta', nl: 'vrijdag', ru: 'пятница', tr: 'cuma', ar: 'الجمعة', zh: '周五', ja: '金曜', ko: '금요일' },
  quartier: { en: 'neighbourhood', es: 'barrio', it: 'quartiere', de: 'Viertel', pt: 'bairro', nl: 'buurt', ru: 'квартал', tr: 'mahalle', ar: 'الحي', zh: '街区', ja: '街', ko: '동네' },
  cave: { en: 'cellar', es: 'bodega', it: 'cantina', de: 'Weinkeller', pt: 'adega', nl: 'wijnkelder', ru: 'винный погреб', tr: 'şarap mahzeni', ar: 'قبو النبيذ', zh: '酒窖', ja: 'ワインセラー', ko: '와인 저장고' },
  'vins nature': { en: 'natural wines', es: 'vinos naturales', it: 'vini naturali', de: 'Naturweine', pt: 'vinhos naturais', nl: 'natuurwijnen', ru: 'натуральные вина', tr: 'doğal şaraplar', ar: 'نبيذ طبيعي', zh: '自然酒', ja: '自然派ワイン', ko: '내추럴 와인' },
  vin: { en: 'wine', es: 'vino', it: 'vino', de: 'Wein', pt: 'vinho', nl: 'wijn', ru: 'вино', tr: 'şarap', ar: 'نبيذ', zh: '葡萄酒', ja: 'ワイン', ko: '와인' },
  rouge: { en: 'red', es: 'tinto', it: 'rosso', de: 'rot', pt: 'tinto', nl: 'rood', ru: 'красный', tr: 'kırmızı', ar: 'أحمر', zh: '红', ja: '赤', ko: '레드' },
  dos: { en: 'fillet', es: 'lomo', it: 'filetto', de: 'Rückenfilet', pt: 'lombo', nl: 'rugfilet', ru: 'филе', tr: 'fileto', ar: 'فيليه', zh: '鱼柳', ja: '背身', ko: '등살' },
  croquants: { en: 'crunchy', es: 'crujientes', it: 'croccanti', de: 'knackig', pt: 'crocantes', nl: 'knapperig', ru: 'хрустящие', tr: 'çıtır', ar: 'مقرمشة', zh: '爽脆', ja: 'シャキシャキ', ko: '아삭한' },
  fondante: { en: 'melting', es: 'fundente', it: 'fondente', de: 'zart', pt: 'fundente', nl: 'smeltend', ru: 'нежный', tr: 'yumuşacık', ar: 'طري', zh: '入口即化', ja: 'とろける', ko: '부드러운' },
  'fleur de sel': { en: 'fleur de sel', es: 'flor de sal', it: 'fior di sale', de: 'Fleur de Sel', pt: 'flor de sal', nl: 'fleur de sel', ru: 'флёр-де-сель', tr: 'çiçek tuzu', ar: 'زهرة الملح', zh: '盐之花', ja: 'ゲランドの塩', ko: '플뢰르 드 셀' },
  'noir': { en: 'dark', es: 'negro', it: 'fondente', de: 'Zartbitter', pt: 'preto', nl: 'puur', ru: 'тёмный', tr: 'bitter', ar: 'داكن', zh: '黑', ja: 'ダーク', ko: '다크' },
  boules: { en: 'scoops', es: 'bolas', it: 'palline', de: 'Kugeln', pt: 'bolas', nl: 'bollen', ru: 'шарика', tr: 'top', ar: 'كرات', zh: '球', ja: 'スクープ', ko: '스쿱' },
  vanille: { en: 'vanilla', es: 'vainilla', it: 'vaniglia', de: 'Vanille', pt: 'baunilha', nl: 'vanille', ru: 'ваниль', tr: 'vanilya', ar: 'فانيليا', zh: '香草', ja: 'バニラ', ko: '바닐라' },
  caramel: { en: 'caramel', es: 'caramelo', it: 'caramello', de: 'Karamell', pt: 'caramelo', nl: 'karamel', ru: 'карамель', tr: 'karamel', ar: 'كراميل', zh: '焦糖', ja: 'キャラメル', ko: '카라멜' },
  'beurre sale': { en: 'salted butter', es: 'mantequilla salada', it: 'burro salato', de: 'gesalzene Butter', pt: 'manteiga salgada', nl: 'gezouten boter', ru: 'солёное масло', tr: 'tuzlu tereyağı', ar: 'زبدة مملحة', zh: '咸黄油', ja: '塩バター', ko: '가염버터' },
  selection: { en: 'selection', es: 'selección', it: 'selezione', de: 'Auswahl', pt: 'seleção', nl: 'selectie', ru: 'подборка', tr: 'seçki', ar: 'تشكيلة', zh: '精选', ja: 'セレクション', ko: '셀렉션' },
  mois: { en: 'month', es: 'mes', it: 'mese', de: 'Monat', pt: 'mês', nl: 'maand', ru: 'месяц', tr: 'ay', ar: 'الشهر', zh: '月', ja: '月', ko: '월' },
  taille: { en: 'cut', es: 'cortado', it: 'tagliato', de: 'geschnitten', pt: 'cortado', nl: 'gesneden', ru: 'нарезанный', tr: 'kesilmiş', ar: 'مقطّع', zh: '切', ja: 'カット', ko: '썬' },
  couteau: { en: 'knife', es: 'cuchillo', it: 'coltello', de: 'Messer', pt: 'faca', nl: 'mes', ru: 'нож', tr: 'bıçak', ar: 'سكين', zh: '刀', ja: 'ナイフ', ko: '칼' },
  capres: { en: 'capers', es: 'alcaparras', it: 'capperi', de: 'Kapern', pt: 'alcaparras', nl: 'kappertjes', ru: 'каперсы', tr: 'kapari', ar: 'كبر', zh: '刺山柑', ja: 'ケッパー', ko: '케이퍼' },
  echalote: { en: 'shallot', es: 'chalota', it: 'scalogno', de: 'Schalotte', pt: 'chalota', nl: 'sjalot', ru: 'лук-шалот', tr: 'arpacık soğan', ar: 'كراث', zh: '青葱', ja: 'エシャロット', ko: '샬롯' },
  jaune: { en: 'yolk', es: 'yema', it: 'tuorlo', de: 'Eigelb', pt: 'gema', nl: 'dooier', ru: 'желток', tr: 'sarısı', ar: 'صفار', zh: '蛋黄', ja: '黄身', ko: '노른자' },
  roquefort: { en: 'roquefort', es: 'roquefort', it: 'roquefort', de: 'Roquefort', pt: 'roquefort', nl: 'roquefort', ru: 'рокфор', tr: 'rokfor', ar: 'روكفور', zh: '洛克福', ja: 'ロックフォール', ko: '로크포르' },
  toast: { en: 'toast', es: 'tostada', it: 'crostino', de: 'Toast', pt: 'torrada', nl: 'toast', ru: 'тост', tr: 'kızarmış ekmek', ar: 'خبز محمص', zh: '吐司', ja: 'トースト', ko: '토스트' },
  saison: { en: 'season', es: 'temporada', it: 'stagione', de: 'Saison', pt: 'época', nl: 'seizoen', ru: 'сезон', tr: 'mevsim', ar: 'الموسم', zh: '时令', ja: '季節', ko: '제철' },
  assortiment: { en: 'assortment', es: 'surtido', it: 'assortimento', de: 'Auswahl', pt: 'sortido', nl: 'assortiment', ru: 'ассорти', tr: 'karışık', ar: 'تشكيلة', zh: '拼盘', ja: '盛り合わせ', ko: '모둠' },
  marinade: { en: 'marinated', es: 'marinado', it: 'marinato', de: 'mariniert', pt: 'marinado', nl: 'gemarineerd', ru: 'маринованный', tr: 'marine', ar: 'متبل', zh: '腌制', ja: 'マリネ', ko: '마리네이드' },
  marine: { en: 'marinated', es: 'marinado', it: 'marinato', de: 'mariniert', pt: 'marinado', nl: 'gemarineerd', ru: 'маринованный', tr: 'marine', ar: 'متبل', zh: '腌制', ja: 'マリネ', ko: '마리네이드' },
  ail: { en: 'garlic', es: 'ajo', it: 'aglio', de: 'Knoblauch', pt: 'alho', nl: 'knoflook', ru: 'чеснок', tr: 'sarımsak', ar: 'ثوم', zh: '大蒜', ja: 'にんにく', ko: '마늘' },
  coriandre: { en: 'coriander', es: 'cilantro', it: 'coriandolo', de: 'Koriander', pt: 'coentros', nl: 'koriander', ru: 'кинза', tr: 'kişniş', ar: 'كزبرة', zh: '香菜', ja: 'パクチー', ko: '고수' },
  persil: { en: 'parsley', es: 'perejil', it: 'prezzemolo', de: 'Petersilie', pt: 'salsa', nl: 'peterselie', ru: 'петрушка', tr: 'maydanoz', ar: 'بقدونس', zh: '欧芹', ja: 'パセリ', ko: '파슬리' },
  haricots: { en: 'beans', es: 'frijoles', it: 'fagioli', de: 'Bohnen', pt: 'feijões', nl: 'bonen', ru: 'фасоль', tr: 'fasulye', ar: 'فاصولياء', zh: '豆', ja: '豆', ko: '콩' },
  concombre: { en: 'cucumber', es: 'pepino', it: 'cetriolo', de: 'Gurke', pt: 'pepino', nl: 'komkommer', ru: 'огурец', tr: 'salatalık', ar: 'خيار', zh: '黄瓜', ja: 'きゅうり', ko: '오이' },
  pomme: { en: 'apple', es: 'manzana', it: 'mela', de: 'Apfel', pt: 'maçã', nl: 'appel', ru: 'яблоко', tr: 'elma', ar: 'تفاح', zh: '苹果', ja: 'りんご', ko: '사과' },
  amandes: { en: 'almonds', es: 'almendras', it: 'mandorle', de: 'Mandeln', pt: 'amêndoas', nl: 'amandelen', ru: 'миндаль', tr: 'badem', ar: 'لوز', zh: '杏仁', ja: 'アーモンド', ko: '아몬드' },
  cacahuetes: { en: 'peanuts', es: 'cacahuetes', it: 'arachidi', de: 'Erdnüsse', pt: 'amendoins', nl: 'pinda’s', ru: 'арахис', tr: 'yer fıstığı', ar: 'فول سوداني', zh: '花生', ja: 'ピーナッツ', ko: '땅콩' },
  farine: { en: 'flour', es: 'harina', it: 'farina', de: 'Mehl', pt: 'farinha', nl: 'meel', ru: 'мука', tr: 'un', ar: 'دقيق', zh: '面粉', ja: '小麦粉', ko: '밀가루' },
  ble: { en: 'wheat', es: 'trigo', it: 'grano', de: 'Weizen', pt: 'trigo', nl: 'tarwe', ru: 'пшеница', tr: 'buğday', ar: 'قمح', zh: '小麦', ja: '小麦', ko: '밀' },
  sans: { en: 'without', es: 'sin', it: 'senza', de: 'ohne', pt: 'sem', nl: 'zonder', ru: 'без', tr: 'siz', ar: 'بدون', zh: '不含', ja: 'なし', ko: '없이' },
  'sucre ajoute': { en: 'added sugar', es: 'azúcar añadido', it: 'zucchero aggiunto', de: 'Zuckerzusatz', pt: 'açúcar adicionado', nl: 'toegevoegde suiker', ru: 'добавленный сахар', tr: 'ilave şeker', ar: 'سكر مضاف', zh: '添加糖', ja: '砂糖不使用', ko: '첨가당' },
  presses: { en: 'pressed', es: 'prensados', it: 'spremuti', de: 'gepresst', pt: 'espremidos', nl: 'geperst', ru: 'свежевыжатые', tr: 'sıkma', ar: 'معصور', zh: '鲜榨', ja: '搾りたて', ko: '착즙' },
  'presse minute': { en: 'freshly pressed', es: 'recién exprimido', it: 'spremuto al momento', de: 'frisch gepresst', pt: 'espremido na hora', nl: 'vers geperst', ru: 'свежевыжатый', tr: 'anında sıkılmış', ar: 'معصور طازج', zh: '现榨', ja: '搾りたて', ko: '즉석 착즙' },
  jus: { en: 'juice', es: 'zumo', it: 'succo', de: 'Saft', pt: 'sumo', nl: 'sap', ru: 'сок', tr: 'suyu', ar: 'عصير', zh: '汁', ja: 'ジュース', ko: '주스' },
  rotis: { en: 'roasted', es: 'asados', it: 'arrostiti', de: 'geröstet', pt: 'assados', nl: 'geroosterd', ru: 'запечённый', tr: 'kavrulmuş', ar: 'محمص', zh: '烤', ja: 'ロースト', ko: '구운' },
  bowl: { en: 'bowl', es: 'bol', it: 'bowl', de: 'Bowl', pt: 'bowl', nl: 'bowl', ru: 'боул', tr: 'kase', ar: 'وعاء', zh: '碗', ja: 'ボウル', ko: '볼' },
  bowls: { en: 'Bowls', es: 'Boles', it: 'Bowl', de: 'Bowls', pt: 'Bowls', nl: 'Bowls', ru: 'Боулы', tr: 'Kaseler', ar: 'الأوعية', zh: '碗物', ja: 'ボウル', ko: '볼' },
  brochettes: { en: 'skewers', es: 'brochetas', it: 'spiedini', de: 'Spieße', pt: 'espetadas', nl: 'spiesjes', ru: 'шашлычки', tr: 'şiş', ar: 'أسياخ', zh: '串', ja: '串', ko: '꼬치' },
  grillades: { en: 'Grills', es: 'Parrilladas', it: 'Grigliate', de: 'Gegrilltes', pt: 'Grelhados', nl: 'Grillgerechten', ru: 'Гриль', tr: 'Izgaralar', ar: 'المشاوي', zh: '烧烤', ja: '炭火焼き', ko: '구이' },
  mezze: { en: 'Mezze', es: 'Mezze', it: 'Mezze', de: 'Mezze', pt: 'Mezze', nl: 'Mezze', ru: 'Мезе', tr: 'Meze', ar: 'مقبلات', zh: '前菜拼盘', ja: 'メゼ', ko: '메제' },
  pizzas: { en: 'Pizzas', es: 'Pizzas', it: 'Pizze', de: 'Pizzen', pt: 'Pizzas', nl: 'Pizza’s', ru: 'Пиццы', tr: 'Pizzalar', ar: 'بيتزا', zh: '披萨', ja: 'ピザ', ko: '피자' },
  antipasti: { en: 'Antipasti', es: 'Antipasti', it: 'Antipasti', de: 'Antipasti', pt: 'Antipasti', nl: 'Antipasti', ru: 'Антипасти', tr: 'Antipasti', ar: 'مقبلات', zh: '前菜', ja: '前菜', ko: '전채' },
  'petites assiettes': { en: 'Small plates', es: 'Platos pequeños', it: 'Piccoli piatti', de: 'Kleine Teller', pt: 'Pratos pequenos', nl: 'Kleine gerechten', ru: 'Маленькие тарелки', tr: 'Küçük tabaklar', ar: 'أطباق صغيرة', zh: '小碟', ja: '小皿', ko: '작은 접시' },
  'riz & nouilles': { en: 'Rice & noodles', es: 'Arroz y fideos', it: 'Riso e noodles', de: 'Reis & Nudeln', pt: 'Arroz e noodles', nl: 'Rijst & noedels', ru: 'Рис и лапша', tr: 'Pilav ve erişte', ar: 'أرز ومعكرونة', zh: '饭与面', ja: 'ご飯と麺', ko: '밥과 면' },
  'a partager': { en: 'To share', es: 'Para compartir', it: 'Da condividere', de: 'Zum Teilen', pt: 'Para partilhar', nl: 'Om te delen', ru: 'На компанию', tr: 'Paylaşımlık', ar: 'للمشاركة', zh: '分享', ja: 'シェア', ko: '나눔' },
  'petits dejeuners': { en: 'Breakfast', es: 'Desayunos', it: 'Colazioni', de: 'Frühstück', pt: 'Pequenos-almoços', nl: 'Ontbijt', ru: 'Завтраки', tr: 'Kahvaltı', ar: 'الفطور', zh: '早餐', ja: '朝食', ko: '아침식사' },
  plat: { en: 'dish', es: 'plato', it: 'piatto', de: 'Gericht', pt: 'prato', nl: 'gerecht', ru: 'блюдо', tr: 'yemek', ar: 'طبق', zh: '菜', ja: '料理', ko: '요리' },
  sur: { en: 'on', es: 'en', it: 'su', de: 'auf', pt: 'em', nl: 'op', ru: 'на', tr: 'üzerinde', ar: 'على', zh: '于', ja: 'の', ko: '위' },
  marche: { en: 'market', es: 'mercado', it: 'mercato', de: 'Markt', pt: 'mercado', nl: 'markt', ru: 'рынок', tr: 'pazar', ar: 'السوق', zh: '市集', ja: '市場', ko: '시장' },
  bistrot: { en: 'bistro', es: 'bistró', it: 'bistrot', de: 'Bistro', pt: 'bistrô', nl: 'bistro', ru: 'бистро', tr: 'bistro', ar: 'بيسترو', zh: '小酒馆', ja: 'ビストロ', ko: '비스트로' },
  "d'oeuf": { en: 'of egg', es: 'de huevo', it: 'd’uovo', de: 'vom Ei', pt: 'de ovo', nl: 'van ei', ru: 'яичный', tr: 'yumurta', ar: 'بيض', zh: '蛋', ja: '卵', ko: '계란' },
  'plat du jour': { en: 'Dish of the day', es: 'Plato del día', it: 'Piatto del giorno', de: 'Tagesgericht', pt: 'Prato do dia', nl: 'Dagschotel', ru: 'Блюдо дня', tr: 'Günün yemeği', ar: 'طبق اليوم', zh: '每日精选', ja: '本日のおすすめ', ko: '오늘의 요리' },
}

/**
 * Les valeurs du glossaire sont saisies comme des libellés autonomes, donc
 * capitalisées. On les stocke en minuscule à l'initiale : `capitalize()` remet
 * la majuscule là où il en faut vraiment (début de texte, début de phrase).
 */
const GLOSSARY: Record<string, Entry> = Object.fromEntries(
  Object.entries(RAW_GLOSSARY).map(([key, entry]) => [
    key,
    Object.fromEntries(
      Object.entries(entry).map(([lang, value]) => [
        lang,
        value ? value.charAt(0).toLowerCase() + value.slice(1) : value,
      ]),
    ) as Entry,
  ]),
)

/** Majuscule en début de texte et après un point. */
function capitalize(s: string): string {
  return s.replace(/(^|[.!?]\s+)([\p{Ll}])/gu, (_m, lead: string, ch: string) => lead + ch.toUpperCase())
}

/** Normalise pour la recherche au glossaire (minuscules, sans accents). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/’/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
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
  return { text: capitalize(joined), confidence: Math.round(confidence * 100) / 100 }
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
