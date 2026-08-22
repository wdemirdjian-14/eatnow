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
  de: { en: 'of', es: 'de', it: 'di', de: 'von', pt: 'de', nl: 'van', ru: 'из', tr: '', ar: 'من', zh: '', ja: 'の', ko: '', hy: '' },
  du: { en: 'of', es: 'de', it: 'di', de: 'vom', pt: 'do', nl: 'van', ru: 'из', tr: '', ar: 'من', zh: '', ja: 'の', ko: '', hy: '' },
  'à la': { en: 'with', es: 'a la', it: 'alla', de: 'nach', pt: 'à', nl: 'met', ru: 'по', tr: 'usulü', ar: 'على طريقة', zh: '风味', ja: '風', ko: '식', hy: 'ոճով' },
  au: { en: 'with', es: 'con', it: 'al', de: 'mit', pt: 'com', nl: 'met', ru: 'с', tr: 'ile', ar: 'مع', zh: '配', ja: '添え', ko: '곁들인', hy: 'հետ' },
  aux: { en: 'with', es: 'con', it: 'ai', de: 'mit', pt: 'com', nl: 'met', ru: 'с', tr: 'ile', ar: 'مع', zh: '配', ja: '添え', ko: '곁들인', hy: 'հետ' },
  et: { en: 'and', es: 'y', it: 'e', de: 'und', pt: 'e', nl: 'en', ru: 'и', tr: 've', ar: 'و', zh: '和', ja: 'と', ko: '와', hy: 'և' },
  avec: { en: 'with', es: 'con', it: 'con', de: 'mit', pt: 'com', nl: 'met', ru: 'с', tr: 'ile', ar: 'مع', zh: '配', ja: '付き', ko: '함께', hy: 'հետ' },
  maison: { en: 'homemade', es: 'casero', it: 'della casa', de: 'hausgemacht', pt: 'caseiro', nl: 'huisgemaakt', ru: 'домашний', tr: 'ev yapımı', ar: 'منزلي', zh: '自制', ja: '自家製', ko: '수제', hy: 'տնական' },
  frais: { en: 'fresh', es: 'fresco', it: 'fresco', de: 'frisch', pt: 'fresco', nl: 'vers', ru: 'свежий', tr: 'taze', ar: 'طازج', zh: '新鲜', ja: '新鮮', ko: '신선한', hy: 'թարմ' },

  // --- viandes ---
  boeuf: { en: 'beef', es: 'ternera', it: 'manzo', de: 'Rind', pt: 'vaca', nl: 'rundvlees', ru: 'говядина', tr: 'dana', ar: 'لحم بقري', zh: '牛肉', ja: '牛肉', ko: '소고기', hy: 'տավարի միս' },
  agneau: { en: 'lamb', es: 'cordero', it: 'agnello', de: 'Lamm', pt: 'borrego', nl: 'lamsvlees', ru: 'ягнёнок', tr: 'kuzu', ar: 'لحم ضأن', zh: '羊肉', ja: 'ラム', ko: '양고기', hy: 'գառան միս' },
  poulet: { en: 'chicken', es: 'pollo', it: 'pollo', de: 'Hähnchen', pt: 'frango', nl: 'kip', ru: 'курица', tr: 'tavuk', ar: 'دجاج', zh: '鸡肉', ja: '鶏肉', ko: '닭고기', hy: 'հավ' },
  canard: { en: 'duck', es: 'pato', it: 'anatra', de: 'Ente', pt: 'pato', nl: 'eend', ru: 'утка', tr: 'ördek', ar: 'بط', zh: '鸭肉', ja: '鴨', ko: '오리', hy: 'բադ' },
  porc: { en: 'pork', es: 'cerdo', it: 'maiale', de: 'Schwein', pt: 'porco', nl: 'varkensvlees', ru: 'свинина', tr: 'domuz', ar: 'لحم خنزير', zh: '猪肉', ja: '豚肉', ko: '돼지고기', hy: 'խոզի միս' },
  veau: { en: 'veal', es: 'ternera lechal', it: 'vitello', de: 'Kalb', pt: 'vitela', nl: 'kalfsvlees', ru: 'телятина', tr: 'dana eti', ar: 'لحم عجل', zh: '小牛肉', ja: '仔牛', ko: '송아지', hy: 'հորթի միս' },
  magret: { en: 'duck breast', es: 'magret', it: 'petto d’anatra', de: 'Entenbrust', pt: 'magret', nl: 'eendenborst', ru: 'утиная грудка', tr: 'ördek göğsü', ar: 'صدر بط', zh: '鸭胸', ja: '鴨胸肉', ko: '오리 가슴살', hy: 'բադի կրծքամիս' },
  entrecote: { en: 'ribeye', es: 'entrecot', it: 'entrecôte', de: 'Entrecôte', pt: 'entrecosto', nl: 'entrecote', ru: 'антрекот', tr: 'antrikot', ar: 'انتركوت', zh: '肋眼牛排', ja: 'リブロース', ko: '립아이', hy: 'անտրկոտ' },
  tartare: { en: 'tartare', es: 'tartar', it: 'tartare', de: 'Tatar', pt: 'tártaro', nl: 'tartaar', ru: 'тартар', tr: 'tartar', ar: 'تارتار', zh: '塔塔', ja: 'タルタル', ko: '타르타르', hy: 'տարտար' },

  // --- poissons ---
  poisson: { en: 'fish', es: 'pescado', it: 'pesce', de: 'Fisch', pt: 'peixe', nl: 'vis', ru: 'рыба', tr: 'balık', ar: 'سمك', zh: '鱼', ja: '魚', ko: '생선', hy: 'ձուկ' },
  saumon: { en: 'salmon', es: 'salmón', it: 'salmone', de: 'Lachs', pt: 'salmão', nl: 'zalm', ru: 'лосось', tr: 'somon', ar: 'سلمون', zh: '三文鱼', ja: 'サーモン', ko: '연어', hy: 'սաղմոն' },
  thon: { en: 'tuna', es: 'atún', it: 'tonno', de: 'Thunfisch', pt: 'atum', nl: 'tonijn', ru: 'тунец', tr: 'ton balığı', ar: 'تونة', zh: '金枪鱼', ja: 'マグロ', ko: '참치', hy: 'թունոս' },
  cabillaud: { en: 'cod', es: 'bacalao', it: 'merluzzo', de: 'Kabeljau', pt: 'bacalhau', nl: 'kabeljauw', ru: 'треска', tr: 'morina', ar: 'قد', zh: '鳕鱼', ja: 'タラ', ko: '대구', hy: 'ձողաձուկ' },
  crevettes: { en: 'prawns', es: 'gambas', it: 'gamberi', de: 'Garnelen', pt: 'camarões', nl: 'garnalen', ru: 'креветки', tr: 'karides', ar: 'جمبري', zh: '虾', ja: 'エビ', ko: '새우', hy: 'ծովախեցգետին' },
  poulpe: { en: 'octopus', es: 'pulpo', it: 'polpo', de: 'Oktopus', pt: 'polvo', nl: 'octopus', ru: 'осьминог', tr: 'ahtapot', ar: 'أخطبوط', zh: '章鱼', ja: 'タコ', ko: '문어', hy: 'ութոտնուկ' },
  'saint-jacques': { en: 'scallops', es: 'vieiras', it: 'capesante', de: 'Jakobsmuscheln', pt: 'vieiras', nl: 'sint-jakobsschelpen', ru: 'гребешки', tr: 'deniz tarağı', ar: 'إسكالوب', zh: '扇贝', ja: 'ホタテ', ko: '가리비', hy: 'սկալոպ' },

  // --- bases ---
  riz: { en: 'rice', es: 'arroz', it: 'riso', de: 'Reis', pt: 'arroz', nl: 'rijst', ru: 'рис', tr: 'pirinç', ar: 'أرز', zh: '米饭', ja: 'ご飯', ko: '밥', hy: 'բրինձ' },
  pates: { en: 'pasta', es: 'pasta', it: 'pasta', de: 'Pasta', pt: 'massa', nl: 'pasta', ru: 'паста', tr: 'makarna', ar: 'معكرونة', zh: '意面', ja: 'パスタ', ko: '파스타', hy: 'մակարոն' },
  pain: { en: 'bread', es: 'pan', it: 'pane', de: 'Brot', pt: 'pão', nl: 'brood', ru: 'хлеб', tr: 'ekmek', ar: 'خبز', zh: '面包', ja: 'パン', ko: '빵', hy: 'հաց' },
  frites: { en: 'fries', es: 'patatas fritas', it: 'patatine fritte', de: 'Pommes', pt: 'batatas fritas', nl: 'friet', ru: 'картофель фри', tr: 'patates kızartması', ar: 'بطاطس مقلية', zh: '薯条', ja: 'フライドポテト', ko: '감자튀김', hy: 'ֆրի կարտոֆիլ' },
  'pommes de terre': { en: 'potatoes', es: 'patatas', it: 'patate', de: 'Kartoffeln', pt: 'batatas', nl: 'aardappelen', ru: 'картофель', tr: 'patates', ar: 'بطاطس', zh: '土豆', ja: 'じゃがいも', ko: '감자', hy: 'կարտոֆիլ' },

  // --- légumes ---
  legumes: { en: 'vegetables', es: 'verduras', it: 'verdure', de: 'Gemüse', pt: 'legumes', nl: 'groenten', ru: 'овощи', tr: 'sebze', ar: 'خضروات', zh: '蔬菜', ja: '野菜', ko: '채소', hy: 'բանջարեղեն' },
  salade: { en: 'salad', es: 'ensalada', it: 'insalata', de: 'Salat', pt: 'salada', nl: 'salade', ru: 'салат', tr: 'salata', ar: 'سلطة', zh: '沙拉', ja: 'サラダ', ko: '샐러드', hy: 'աղցան' },
  tomate: { en: 'tomato', es: 'tomate', it: 'pomodoro', de: 'Tomate', pt: 'tomate', nl: 'tomaat', ru: 'помидор', tr: 'domates', ar: 'طماطم', zh: '番茄', ja: 'トマト', ko: '토마토', hy: 'լոլիկ' },
  tomates: { en: 'tomatoes', es: 'tomates', it: 'pomodori', de: 'Tomaten', pt: 'tomates', nl: 'tomaten', ru: 'помидоры', tr: 'domates', ar: 'طماطم', zh: '番茄', ja: 'トマト', ko: '토마토', hy: 'լոլիկ' },
  champignons: { en: 'mushrooms', es: 'setas', it: 'funghi', de: 'Pilze', pt: 'cogumelos', nl: 'champignons', ru: 'грибы', tr: 'mantar', ar: 'فطر', zh: '蘑菇', ja: 'きのこ', ko: '버섯', hy: 'սունկ' },
  oignon: { en: 'onion', es: 'cebolla', it: 'cipolla', de: 'Zwiebel', pt: 'cebola', nl: 'ui', ru: 'лук', tr: 'soğan', ar: 'بصل', zh: '洋葱', ja: '玉ねぎ', ko: '양파', hy: 'սոխ' },
  aubergine: { en: 'aubergine', es: 'berenjena', it: 'melanzana', de: 'Aubergine', pt: 'beringela', nl: 'aubergine', ru: 'баклажан', tr: 'patlıcan', ar: 'باذنجان', zh: '茄子', ja: 'ナス', ko: '가지', hy: 'սմբուկ' },
  courgette: { en: 'courgette', es: 'calabacín', it: 'zucchina', de: 'Zucchini', pt: 'courgette', nl: 'courgette', ru: 'кабачок', tr: 'kabak', ar: 'كوسة', zh: '西葫芦', ja: 'ズッキーニ', ko: '애호박', hy: 'դդմիկ' },
  'pois chiches': { en: 'chickpeas', es: 'garbanzos', it: 'ceci', de: 'Kichererbsen', pt: 'grão-de-bico', nl: 'kikkererwten', ru: 'нут', tr: 'nohut', ar: 'حمص', zh: '鹰嘴豆', ja: 'ひよこ豆', ko: '병아리콩', hy: 'սիսեռ' },
  avocat: { en: 'avocado', es: 'aguacate', it: 'avocado', de: 'Avocado', pt: 'abacate', nl: 'avocado', ru: 'авокадо', tr: 'avokado', ar: 'أفوكادو', zh: '牛油果', ja: 'アボカド', ko: '아보카도', hy: 'ավոկադո' },
  truffe: { en: 'truffle', es: 'trufa', it: 'tartufo', de: 'Trüffel', pt: 'trufa', nl: 'truffel', ru: 'трюфель', tr: 'trüf', ar: 'كمأة', zh: '松露', ja: 'トリュフ', ko: '트러플', hy: 'տրյուֆել' },

  // --- produits laitiers / condiments ---
  fromage: { en: 'cheese', es: 'queso', it: 'formaggio', de: 'Käse', pt: 'queijo', nl: 'kaas', ru: 'сыр', tr: 'peynir', ar: 'جبن', zh: '奶酪', ja: 'チーズ', ko: '치즈', hy: 'պանիր' },
  chevre: { en: 'goat cheese', es: 'queso de cabra', it: 'caprino', de: 'Ziegenkäse', pt: 'queijo de cabra', nl: 'geitenkaas', ru: 'козий сыр', tr: 'keçi peyniri', ar: 'جبن ماعز', zh: '山羊奶酪', ja: 'シェーヴル', ko: '염소치즈', hy: 'այծի պանիր' },
  parmesan: { en: 'parmesan', es: 'parmesano', it: 'parmigiano', de: 'Parmesan', pt: 'parmesão', nl: 'parmezaan', ru: 'пармезан', tr: 'parmesan', ar: 'بارميزان', zh: '帕玛森', ja: 'パルメザン', ko: '파르메산', hy: 'պարմեզան' },
  mozzarella: { en: 'mozzarella', es: 'mozzarella', it: 'mozzarella', de: 'Mozzarella', pt: 'mozzarella', nl: 'mozzarella', ru: 'моцарелла', tr: 'mozzarella', ar: 'موزاريلا', zh: '马苏里拉', ja: 'モッツァレラ', ko: '모차렐라', hy: 'մոցարելա' },
  beurre: { en: 'butter', es: 'mantequilla', it: 'burro', de: 'Butter', pt: 'manteiga', nl: 'boter', ru: 'масло', tr: 'tereyağı', ar: 'زبدة', zh: '黄油', ja: 'バター', ko: '버터', hy: 'կարագ' },
  creme: { en: 'cream', es: 'nata', it: 'panna', de: 'Sahne', pt: 'natas', nl: 'room', ru: 'сливки', tr: 'krema', ar: 'كريمة', zh: '奶油', ja: 'クリーム', ko: '크림', hy: 'սերուցք' },
  sauce: { en: 'sauce', es: 'salsa', it: 'salsa', de: 'Sauce', pt: 'molho', nl: 'saus', ru: 'соус', tr: 'sos', ar: 'صلصة', zh: '酱', ja: 'ソース', ko: '소스', hy: 'սոուս' },
  "huile d'olive": { en: 'olive oil', es: 'aceite de oliva', it: 'olio d’oliva', de: 'Olivenöl', pt: 'azeite', nl: 'olijfolie', ru: 'оливковое масло', tr: 'zeytinyağı', ar: 'زيت زيتون', zh: '橄榄油', ja: 'オリーブオイル', ko: '올리브유', hy: 'ձիթապտղի յուղ' },
  basilic: { en: 'basil', es: 'albahaca', it: 'basilico', de: 'Basilikum', pt: 'manjericão', nl: 'basilicum', ru: 'базилик', tr: 'fesleğen', ar: 'ريحان', zh: '罗勒', ja: 'バジル', ko: '바질', hy: 'ռեհան' },
  citron: { en: 'lemon', es: 'limón', it: 'limone', de: 'Zitrone', pt: 'limão', nl: 'citroen', ru: 'лимон', tr: 'limon', ar: 'ليمون', zh: '柠檬', ja: 'レモン', ko: '레몬', hy: 'կիտրոն' },
  miel: { en: 'honey', es: 'miel', it: 'miele', de: 'Honig', pt: 'mel', nl: 'honing', ru: 'мёд', tr: 'bal', ar: 'عسل', zh: '蜂蜜', ja: '蜂蜜', ko: '꿀', hy: 'մեղր' },

  // --- plats & préparations ---
  soupe: { en: 'soup', es: 'sopa', it: 'zuppa', de: 'Suppe', pt: 'sopa', nl: 'soep', ru: 'суп', tr: 'çorba', ar: 'شوربة', zh: '汤', ja: 'スープ', ko: '수프', hy: 'ապուր' },
  entree: { en: 'starter', es: 'entrante', it: 'antipasto', de: 'Vorspeise', pt: 'entrada', nl: 'voorgerecht', ru: 'закуска', tr: 'başlangıç', ar: 'مقبلات', zh: '前菜', ja: '前菜', ko: '전채', hy: 'նախուտեստ' },
  entrees: { en: 'Starters', es: 'Entrantes', it: 'Antipasti', de: 'Vorspeisen', pt: 'Entradas', nl: 'Voorgerechten', ru: 'Закуски', tr: 'Başlangıçlar', ar: 'المقبلات', zh: '前菜', ja: '前菜', ko: '전채', hy: 'Նախուտեստներ' },
  plats: { en: 'Main courses', es: 'Platos principales', it: 'Secondi', de: 'Hauptgerichte', pt: 'Pratos principais', nl: 'Hoofdgerechten', ru: 'Основные блюда', tr: 'Ana yemekler', ar: 'الأطباق الرئيسية', zh: '主菜', ja: 'メイン', ko: '메인', hy: 'Հիմնական ուտեստներ' },
  desserts: { en: 'Desserts', es: 'Postres', it: 'Dolci', de: 'Desserts', pt: 'Sobremesas', nl: 'Nagerechten', ru: 'Десерты', tr: 'Tatlılar', ar: 'الحلويات', zh: '甜点', ja: 'デザート', ko: '디저트', hy: 'Աղանդերներ' },
  boissons: { en: 'Drinks', es: 'Bebidas', it: 'Bevande', de: 'Getränke', pt: 'Bebidas', nl: 'Dranken', ru: 'Напитки', tr: 'İçecekler', ar: 'المشروبات', zh: '饮品', ja: 'ドリンク', ko: '음료', hy: 'Ըմպելիքներ' },
  dessert: { en: 'dessert', es: 'postre', it: 'dolce', de: 'Dessert', pt: 'sobremesa', nl: 'nagerecht', ru: 'десерт', tr: 'tatlı', ar: 'حلوى', zh: '甜点', ja: 'デザート', ko: '디저트', hy: 'աղանդեր' },
  gateau: { en: 'cake', es: 'pastel', it: 'torta', de: 'Kuchen', pt: 'bolo', nl: 'taart', ru: 'торт', tr: 'kek', ar: 'كعكة', zh: '蛋糕', ja: 'ケーキ', ko: '케이크', hy: 'տորթ' },
  tarte: { en: 'tart', es: 'tarta', it: 'crostata', de: 'Tarte', pt: 'tarte', nl: 'taart', ru: 'тарт', tr: 'tart', ar: 'فطيرة', zh: '塔', ja: 'タルト', ko: '타르트', hy: 'կարկանդակ' },
  glace: { en: 'ice cream', es: 'helado', it: 'gelato', de: 'Eis', pt: 'gelado', nl: 'ijs', ru: 'мороженое', tr: 'dondurma', ar: 'آيس كريم', zh: '冰淇淋', ja: 'アイス', ko: '아이스크림', hy: 'պաղպաղակ' },
  chocolat: { en: 'chocolate', es: 'chocolate', it: 'cioccolato', de: 'Schokolade', pt: 'chocolate', nl: 'chocolade', ru: 'шоколад', tr: 'çikolata', ar: 'شوكولاتة', zh: '巧克力', ja: 'チョコレート', ko: '초콜릿', hy: 'շոկոլադ' },
  grille: { en: 'grilled', es: 'a la parrilla', it: 'alla griglia', de: 'gegrillt', pt: 'grelhado', nl: 'gegrild', ru: 'на гриле', tr: 'ızgara', ar: 'مشوي', zh: '烤', ja: 'グリル', ko: '구이', hy: 'խորոված' },
  grillee: { en: 'grilled', es: 'a la parrilla', it: 'alla griglia', de: 'gegrillt', pt: 'grelhada', nl: 'gegrild', ru: 'на гриле', tr: 'ızgara', ar: 'مشوي', zh: '烤', ja: 'グリル', ko: '구이', hy: 'խորոված' },
  gratinee: { en: 'gratinated', es: 'gratinada', it: 'gratinata', de: 'überbacken', pt: 'gratinada', nl: 'gegratineerd', ru: 'запечённый', tr: 'graten', ar: 'غراتان', zh: '焗', ja: 'グラタン', ko: '그라탱', hy: 'գրատեն' },
  mijote: { en: 'slow-cooked', es: 'estofado', it: 'stufato', de: 'geschmort', pt: 'estufado', nl: 'gestoofd', ru: 'тушёный', tr: 'yahni', ar: 'مطهو ببطء', zh: '慢炖', ja: '煮込み', ko: '조림', hy: 'շոգեխաշած' },
  vapeur: { en: 'steamed', es: 'al vapor', it: 'al vapore', de: 'gedämpft', pt: 'ao vapor', nl: 'gestoomd', ru: 'на пару', tr: 'buharda', ar: 'مطهو بالبخار', zh: '清蒸', ja: '蒸し', ko: '찜', hy: 'գոլորշու վրա' },
  epice: { en: 'spicy', es: 'picante', it: 'piccante', de: 'scharf', pt: 'picante', nl: 'pittig', ru: 'острый', tr: 'acılı', ar: 'حار', zh: '辣', ja: '辛口', ko: '매운', hy: 'կծու' },

  // --- options : cuissons, accompagnements, portions ---
  cuisson: { en: 'Cooking', es: 'Punto', it: 'Cottura', de: 'Garstufe', pt: 'Ponto', nl: 'Bakwijze', ru: 'Прожарка', tr: 'Pişirme', ar: 'درجة الطهي', zh: '熟度', ja: '焼き加減', ko: '굽기 정도', hy: 'Տապակման աստիճան' },
  bleu: { en: 'Blue', es: 'Vuelta y vuelta', it: 'Al sangue estremo', de: 'Blau', pt: 'Muito mal passado', nl: 'Blauw', ru: 'С кровью', tr: 'Az pişmiş', ar: 'نيء جداً', zh: '一分熟', ja: 'ブルー', ko: '레어보다 덜', hy: 'շատ հում' },
  saignant: { en: 'Rare', es: 'Poco hecho', it: 'Al sangue', de: 'Blutig', pt: 'Mal passado', nl: 'Rood', ru: 'Слабой прожарки', tr: 'Az pişmiş', ar: 'نصف نيء', zh: '三分熟', ja: 'レア', ko: '레어', hy: 'հում' },
  rose: { en: 'Pink', es: 'Rosado', it: 'Rosato', de: 'Rosa', pt: 'Rosado', nl: 'Rosé', ru: 'Розовый', tr: 'Pembe', ar: 'وردي', zh: '五分熟', ja: 'ミディアムレア', ko: '미디엄 레어', hy: 'վարդագույն' },
  'a point': { en: 'Medium', es: 'Al punto', it: 'Media cottura', de: 'Medium', pt: 'Ao ponto', nl: 'Medium', ru: 'Средней прожарки', tr: 'Orta', ar: 'متوسط', zh: '七分熟', ja: 'ミディアム', ko: '미디엄', hy: 'միջին' },
  'bien cuit': { en: 'Well done', es: 'Muy hecho', it: 'Ben cotta', de: 'Durchgebraten', pt: 'Bem passado', nl: 'Doorbakken', ru: 'Хорошо прожаренный', tr: 'İyi pişmiş', ar: 'ناضج تماماً', zh: '全熟', ja: 'ウェルダン', ko: '웰던', hy: 'լավ տապակած' },
  accompagnement: { en: 'Side', es: 'Guarnición', it: 'Contorno', de: 'Beilage', pt: 'Acompanhamento', nl: 'Bijgerecht', ru: 'Гарнир', tr: 'Garnitür', ar: 'طبق جانبي', zh: '配菜', ja: '付け合わせ', ko: '사이드', hy: 'Կողմնակի ուտեստ' },
  'salade verte': { en: 'Green salad', es: 'Ensalada verde', it: 'Insalata verde', de: 'Grüner Salat', pt: 'Salada verde', nl: 'Groene salade', ru: 'Зелёный салат', tr: 'Yeşil salata', ar: 'سلطة خضراء', zh: '生菜沙拉', ja: 'グリーンサラダ', ko: '그린 샐러드', hy: 'կանաչ աղցան' },
  'legumes de saison': { en: 'Seasonal vegetables', es: 'Verduras de temporada', it: 'Verdure di stagione', de: 'Saisongemüse', pt: 'Legumes da época', nl: 'Seizoensgroenten', ru: 'Сезонные овощи', tr: 'Mevsim sebzeleri', ar: 'خضار موسمية', zh: '时令蔬菜', ja: '季節の野菜', ko: '제철 채소', hy: 'սեզոնային բանջարեղեն' },
  'frites maison': { en: 'Homemade fries', es: 'Patatas fritas caseras', it: 'Patatine fatte in casa', de: 'Hausgemachte Pommes', pt: 'Batatas fritas caseiras', nl: 'Huisgemaakte friet', ru: 'Домашний картофель фри', tr: 'Ev yapımı patates', ar: 'بطاطس منزلية', zh: '自制薯条', ja: '自家製フライドポテト', ko: '수제 감자튀김', hy: 'տնական ֆրի' },
  supplements: { en: 'Extras', es: 'Extras', it: 'Aggiunte', de: 'Extras', pt: 'Extras', nl: 'Extra’s', ru: 'Добавки', tr: 'Ekstralar', ar: 'إضافات', zh: '加料', ja: 'トッピング', ko: '추가', hy: 'Հավելումներ' },
  supplement: { en: 'Extra', es: 'Extra', it: 'Aggiunta', de: 'Extra', pt: 'Extra', nl: 'Extra', ru: 'Добавка', tr: 'Ekstra', ar: 'إضافة', zh: '加料', ja: 'トッピング', ko: '추가', hy: 'հավելում' },
  portion: { en: 'Portion', es: 'Ración', it: 'Porzione', de: 'Portion', pt: 'Porção', nl: 'Portie', ru: 'Порция', tr: 'Porsiyon', ar: 'حصة', zh: '份量', ja: '量', ko: '양', hy: 'Չափաբաժին' },
  'portion normale': { en: 'Regular portion', es: 'Ración normal', it: 'Porzione normale', de: 'Normale Portion', pt: 'Porção normal', nl: 'Normale portie', ru: 'Обычная порция', tr: 'Normal porsiyon', ar: 'حصة عادية', zh: '标准份', ja: '普通盛り', ko: '보통', hy: 'սովորական չափաբաժին' },
  'grande portion': { en: 'Large portion', es: 'Ración grande', it: 'Porzione grande', de: 'Große Portion', pt: 'Porção grande', nl: 'Grote portie', ru: 'Большая порция', tr: 'Büyük porsiyon', ar: 'حصة كبيرة', zh: '大份', ja: '大盛り', ko: '곱빼기', hy: 'մեծ չափաբաժին' },
  contenance: { en: 'Size', es: 'Tamaño', it: 'Formato', de: 'Größe', pt: 'Tamanho', nl: 'Inhoud', ru: 'Объём', tr: 'Hacim', ar: 'الحجم', zh: '容量', ja: '容量', ko: '용량', hy: 'Ծավալ' },
  verre: { en: 'Glass', es: 'Copa', it: 'Bicchiere', de: 'Glas', pt: 'Copo', nl: 'Glas', ru: 'Бокал', tr: 'Kadeh', ar: 'كأس', zh: '杯', ja: 'グラス', ko: '잔', hy: 'բաժակ' },
  base: { en: 'Base', es: 'Base', it: 'Base', de: 'Basis', pt: 'Base', nl: 'Basis', ru: 'Основа', tr: 'Taban', ar: 'الأساس', zh: '主食', ja: 'ベース', ko: '베이스', hy: 'Հիմք' },
  'riz complet': { en: 'Brown rice', es: 'Arroz integral', it: 'Riso integrale', de: 'Vollkornreis', pt: 'Arroz integral', nl: 'Zilvervliesrijst', ru: 'Бурый рис', tr: 'Esmer pirinç', ar: 'أرز كامل', zh: '糙米', ja: '玄米', ko: '현미', hy: 'շագանակագույն բրինձ' },
  quinoa: { en: 'Quinoa', es: 'Quinoa', it: 'Quinoa', de: 'Quinoa', pt: 'Quinoa', nl: 'Quinoa', ru: 'Киноа', tr: 'Kinoa', ar: 'كينوا', zh: '藜麦', ja: 'キヌア', ko: '퀴노아', hy: 'կինոա' },
  oeuf: { en: 'Egg', es: 'Huevo', it: 'Uovo', de: 'Ei', pt: 'Ovo', nl: 'Ei', ru: 'Яйцо', tr: 'Yumurta', ar: 'بيضة', zh: '鸡蛋', ja: '卵', ko: '계란', hy: 'ձու' },
  'oeuf marine': { en: 'Marinated egg', es: 'Huevo marinado', it: 'Uovo marinato', de: 'Mariniertes Ei', pt: 'Ovo marinado', nl: 'Gemarineerd ei', ru: 'Маринованное яйцо', tr: 'Marine yumurta', ar: 'بيضة متبلة', zh: '溏心蛋', ja: '味玉', ko: '반숙 계란', hy: 'մարինացված ձու' },
  jambon: { en: 'Ham', es: 'Jamón', it: 'Prosciutto', de: 'Schinken', pt: 'Fiambre', nl: 'Ham', ru: 'Ветчина', tr: 'Jambon', ar: 'لحم مقدد', zh: '火腿', ja: 'ハム', ko: '햄', hy: 'խոզապուխտ' },
  roquette: { en: 'Rocket', es: 'Rúcula', it: 'Rucola', de: 'Rucola', pt: 'Rúcula', nl: 'Rucola', ru: 'Руккола', tr: 'Roka', ar: 'جرجير', zh: '芝麻菜', ja: 'ルッコラ', ko: '루꼴라', hy: 'ռուկոլա' },
  burrata: { en: 'Burrata', es: 'Burrata', it: 'Burrata', de: 'Burrata', pt: 'Burrata', nl: 'Burrata', ru: 'Буррата', tr: 'Burrata', ar: 'بوراتا', zh: '布拉塔', ja: 'ブラータ', ko: '부라타', hy: 'բուրատա' },
  graines: { en: 'Seeds', es: 'Semillas', it: 'Semi', de: 'Samen', pt: 'Sementes', nl: 'Zaden', ru: 'Семена', tr: 'Tohumlar', ar: 'بذور', zh: '籽', ja: 'シード', ko: '씨앗', hy: 'սերմեր' },
  courge: { en: 'Squash', es: 'Calabaza', it: 'Zucca', de: 'Kürbis', pt: 'Abóbora', nl: 'Pompoen', ru: 'Тыква', tr: 'Kabak', ar: 'قرع', zh: '南瓜', ja: 'かぼちゃ', ko: '호박', hy: 'դդում' },
  'sauce blanche': { en: 'White sauce', es: 'Salsa blanca', it: 'Salsa bianca', de: 'Weiße Sauce', pt: 'Molho branco', nl: 'Witte saus', ru: 'Белый соус', tr: 'Beyaz sos', ar: 'صلصة بيضاء', zh: '白酱', ja: 'ホワイトソース', ko: '화이트 소스', hy: 'սպիտակ սոուս' },
  'sauce piquante': { en: 'Hot sauce', es: 'Salsa picante', it: 'Salsa piccante', de: 'Scharfe Sauce', pt: 'Molho picante', nl: 'Pittige saus', ru: 'Острый соус', tr: 'Acı sos', ar: 'صلصة حارة', zh: '辣酱', ja: '辛口ソース', ko: '매운 소스', hy: 'կծու սոուս' },
  'sauce epicee': { en: 'Spicy sauce', es: 'Salsa picante', it: 'Salsa piccante', de: 'Würzige Sauce', pt: 'Molho picante', nl: 'Pittige saus', ru: 'Пряный соус', tr: 'Baharatlı sos', ar: 'صلصة حارة', zh: '香辣酱', ja: 'スパイシーソース', ko: '매콤 소스', hy: 'կծու սոուս' },
  'sauce maison': { en: 'House sauce', es: 'Salsa de la casa', it: 'Salsa della casa', de: 'Hausgemachte Sauce', pt: 'Molho da casa', nl: 'Huissaus', ru: 'Фирменный соус', tr: 'Ev sosu', ar: 'صلصة المنزل', zh: '招牌酱', ja: '自家製ソース', ko: '수제 소스', hy: 'տնական սոուս' },
  'sans sauce': { en: 'No sauce', es: 'Sin salsa', it: 'Senza salsa', de: 'Ohne Sauce', pt: 'Sem molho', nl: 'Zonder saus', ru: 'Без соуса', tr: 'Sossuz', ar: 'بدون صلصة', zh: '不加酱', ja: 'ソースなし', ko: '소스 없이', hy: 'առանց սոուսի' },
  "niveau d'epice": { en: 'Spice level', es: 'Nivel de picante', it: 'Livello di piccante', de: 'Schärfegrad', pt: 'Nível de picante', nl: 'Pittigheid', ru: 'Острота', tr: 'Acı seviyesi', ar: 'درجة الحرارة', zh: '辣度', ja: '辛さ', ko: '맵기', hy: 'Կծվության աստիճան' },
  doux: { en: 'Mild', es: 'Suave', it: 'Delicato', de: 'Mild', pt: 'Suave', nl: 'Mild', ru: 'Мягкий', tr: 'Az acı', ar: 'خفيف', zh: '微辣', ja: '甘口', ko: '순한맛', hy: 'մեղմ' },
  moyen: { en: 'Medium', es: 'Medio', it: 'Medio', de: 'Mittel', pt: 'Médio', nl: 'Medium', ru: 'Средний', tr: 'Orta', ar: 'متوسط', zh: '中辣', ja: '中辛', ko: '보통맛', hy: 'միջին' },
  'tres epice': { en: 'Very spicy', es: 'Muy picante', it: 'Molto piccante', de: 'Sehr scharf', pt: 'Muito picante', nl: 'Zeer pittig', ru: 'Очень острый', tr: 'Çok acı', ar: 'حار جداً', zh: '重辣', ja: '激辛', ko: '아주 매운맛', hy: 'շատ կծու' },
  gratin: { en: 'Gratin', es: 'Gratén', it: 'Gratin', de: 'Gratin', pt: 'Gratinado', nl: 'Gratin', ru: 'Гратен', tr: 'Graten', ar: 'غراتان', zh: '焗菜', ja: 'グラタン', ko: '그라탱', hy: 'գրատեն' },

  // --- vocabulaire des descriptions de la carte ---
  'au four': { en: 'oven-baked', es: 'al horno', it: 'al forno', de: 'im Ofen gebacken', pt: 'no forno', nl: 'uit de oven', ru: 'запечённый в духовке', tr: 'fırında', ar: 'في الفرن', zh: '烤箱烘烤', ja: 'オーブン焼き', ko: '오븐구이', hy: 'ջեռոցում թխած' },
  oignons: { en: 'onions', es: 'cebollas', it: 'cipolle', de: 'Zwiebeln', pt: 'cebolas', nl: 'uien', ru: 'лук', tr: 'soğanlar', ar: 'بصل', zh: '洋葱', ja: '玉ねぎ', ko: '양파', hy: 'սոխ' },
  'pain de campagne': { en: 'country bread', es: 'pan de pueblo', it: 'pane casereccio', de: 'Landbrot', pt: 'pão rústico', nl: 'landbrood', ru: 'деревенский хлеб', tr: 'köy ekmeği', ar: 'خبز ريفي', zh: '乡村面包', ja: 'カンパーニュ', ko: '시골빵', hy: 'գյուղական հաց' },
  mijotes: { en: 'slow-cooked', es: 'estofados', it: 'stufate', de: 'geschmort', pt: 'estufados', nl: 'gestoofd', ru: 'тушёные', tr: 'yahni', ar: 'مطهو ببطء', zh: '慢炖', ja: '煮込み', ko: '조림', hy: 'շոգեխաշած' },
  gratine: { en: 'gratinated', es: 'gratinado', it: 'gratinato', de: 'überbacken', pt: 'gratinado', nl: 'gegratineerd', ru: 'запечённый', tr: 'graten', ar: 'غراتان', zh: '焗', ja: 'グラタン', ko: '그라탱', hy: 'գրատեն' },
  midi: { en: 'lunch', es: 'mediodía', it: 'pranzo', de: 'Mittag', pt: 'almoço', nl: 'lunch', ru: 'обед', tr: 'öğle', ar: 'الغداء', zh: '午市', ja: 'ランチ', ko: '점심', hy: 'ճաշ' },
  decouverte: { en: 'tasting', es: 'degustación', it: 'degustazione', de: 'Entdecker', pt: 'degustação', nl: 'ontdekking', ru: 'дегустационный', tr: 'keşif', ar: 'اكتشاف', zh: '品鉴', ja: 'おまかせ', ko: '테이스팅', hy: 'ճաշակման' },
  ardoise: { en: 'daily board', es: 'pizarra del día', it: 'lavagna del giorno', de: 'Tagestafel', pt: 'quadro do dia', nl: 'dagbord', ru: 'доска дня', tr: 'günün tahtası', ar: 'لوح اليوم', zh: '每日黑板', ja: '本日の黒板', ko: '오늘의 메뉴판', hy: 'օրվա ցանկ' },
  servi: { en: 'served', es: 'servido', it: 'servito', de: 'serviert', pt: 'servido', nl: 'geserveerd', ru: 'подаётся', tr: 'servis edilir', ar: 'يُقدَّم', zh: '供应', ja: '提供', ko: '제공', hy: 'մատուցվում է' },
  'au choix': { en: 'of your choice', es: 'a elegir', it: 'a scelta', de: 'nach Wahl', pt: 'à escolha', nl: 'naar keuze', ru: 'на выбор', tr: 'seçmeli', ar: 'حسب الاختيار', zh: '任选', ja: 'お好みで', ko: '선택', hy: 'ձեր ընտրությամբ' },
  cafe: { en: 'coffee', es: 'café', it: 'caffè', de: 'Kaffee', pt: 'café', nl: 'koffie', ru: 'кофе', tr: 'kahve', ar: 'قهوة', zh: '咖啡', ja: 'コーヒー', ko: '커피', hy: 'սուրճ' },
  mardi: { en: 'Tuesday', es: 'martes', it: 'martedì', de: 'Dienstag', pt: 'terça', nl: 'dinsdag', ru: 'вторник', tr: 'salı', ar: 'الثلاثاء', zh: '周二', ja: '火曜', ko: '화요일', hy: 'երեքշաբթի' },
  vendredi: { en: 'Friday', es: 'viernes', it: 'venerdì', de: 'Freitag', pt: 'sexta', nl: 'vrijdag', ru: 'пятница', tr: 'cuma', ar: 'الجمعة', zh: '周五', ja: '金曜', ko: '금요일', hy: 'ուրբաթ' },
  quartier: { en: 'neighbourhood', es: 'barrio', it: 'quartiere', de: 'Viertel', pt: 'bairro', nl: 'buurt', ru: 'квартал', tr: 'mahalle', ar: 'الحي', zh: '街区', ja: '街', ko: '동네', hy: 'թաղամաս' },
  cave: { en: 'cellar', es: 'bodega', it: 'cantina', de: 'Weinkeller', pt: 'adega', nl: 'wijnkelder', ru: 'винный погреб', tr: 'şarap mahzeni', ar: 'قبو النبيذ', zh: '酒窖', ja: 'ワインセラー', ko: '와인 저장고', hy: 'գինու նկուղ' },
  'vins nature': { en: 'natural wines', es: 'vinos naturales', it: 'vini naturali', de: 'Naturweine', pt: 'vinhos naturais', nl: 'natuurwijnen', ru: 'натуральные вина', tr: 'doğal şaraplar', ar: 'نبيذ طبيعي', zh: '自然酒', ja: '自然派ワイン', ko: '내추럴 와인', hy: 'բնական գինիներ' },
  vin: { en: 'wine', es: 'vino', it: 'vino', de: 'Wein', pt: 'vinho', nl: 'wijn', ru: 'вино', tr: 'şarap', ar: 'نبيذ', zh: '葡萄酒', ja: 'ワイン', ko: '와인', hy: 'գինի' },
  rouge: { en: 'red', es: 'tinto', it: 'rosso', de: 'rot', pt: 'tinto', nl: 'rood', ru: 'красный', tr: 'kırmızı', ar: 'أحمر', zh: '红', ja: '赤', ko: '레드', hy: 'կարմիր' },
  dos: { en: 'fillet', es: 'lomo', it: 'filetto', de: 'Rückenfilet', pt: 'lombo', nl: 'rugfilet', ru: 'филе', tr: 'fileto', ar: 'فيليه', zh: '鱼柳', ja: '背身', ko: '등살', hy: 'ֆիլե' },
  croquants: { en: 'crunchy', es: 'crujientes', it: 'croccanti', de: 'knackig', pt: 'crocantes', nl: 'knapperig', ru: 'хрустящие', tr: 'çıtır', ar: 'مقرمشة', zh: '爽脆', ja: 'シャキシャキ', ko: '아삭한', hy: 'խրթխրթան' },
  fondante: { en: 'melting', es: 'fundente', it: 'fondente', de: 'zart', pt: 'fundente', nl: 'smeltend', ru: 'нежный', tr: 'yumuşacık', ar: 'طري', zh: '入口即化', ja: 'とろける', ko: '부드러운', hy: 'հալվող' },
  'fleur de sel': { en: 'fleur de sel', es: 'flor de sal', it: 'fior di sale', de: 'Fleur de Sel', pt: 'flor de sal', nl: 'fleur de sel', ru: 'флёр-де-сель', tr: 'çiçek tuzu', ar: 'زهرة الملح', zh: '盐之花', ja: 'ゲランドの塩', ko: '플뢰르 드 셀', hy: 'ծովի աղ' },
  'noir': { en: 'dark', es: 'negro', it: 'fondente', de: 'Zartbitter', pt: 'preto', nl: 'puur', ru: 'тёмный', tr: 'bitter', ar: 'داكن', zh: '黑', ja: 'ダーク', ko: '다크', hy: 'սև' },
  boules: { en: 'scoops', es: 'bolas', it: 'palline', de: 'Kugeln', pt: 'bolas', nl: 'bollen', ru: 'шарика', tr: 'top', ar: 'كرات', zh: '球', ja: 'スクープ', ko: '스쿱', hy: 'գնդիկ' },
  vanille: { en: 'vanilla', es: 'vainilla', it: 'vaniglia', de: 'Vanille', pt: 'baunilha', nl: 'vanille', ru: 'ваниль', tr: 'vanilya', ar: 'فانيليا', zh: '香草', ja: 'バニラ', ko: '바닐라', hy: 'վանիլ' },
  caramel: { en: 'caramel', es: 'caramelo', it: 'caramello', de: 'Karamell', pt: 'caramelo', nl: 'karamel', ru: 'карамель', tr: 'karamel', ar: 'كراميل', zh: '焦糖', ja: 'キャラメル', ko: '카라멜', hy: 'կարամել' },
  'beurre sale': { en: 'salted butter', es: 'mantequilla salada', it: 'burro salato', de: 'gesalzene Butter', pt: 'manteiga salgada', nl: 'gezouten boter', ru: 'солёное масло', tr: 'tuzlu tereyağı', ar: 'زبدة مملحة', zh: '咸黄油', ja: '塩バター', ko: '가염버터', hy: 'աղի կարագ' },
  selection: { en: 'selection', es: 'selección', it: 'selezione', de: 'Auswahl', pt: 'seleção', nl: 'selectie', ru: 'подборка', tr: 'seçki', ar: 'تشكيلة', zh: '精选', ja: 'セレクション', ko: '셀렉션', hy: 'ընտրանի' },
  mois: { en: 'month', es: 'mes', it: 'mese', de: 'Monat', pt: 'mês', nl: 'maand', ru: 'месяц', tr: 'ay', ar: 'الشهر', zh: '月', ja: '月', ko: '월', hy: 'ամիս' },
  taille: { en: 'cut', es: 'cortado', it: 'tagliato', de: 'geschnitten', pt: 'cortado', nl: 'gesneden', ru: 'нарезанный', tr: 'kesilmiş', ar: 'مقطّع', zh: '切', ja: 'カット', ko: '썬', hy: 'կտրատած' },
  couteau: { en: 'knife', es: 'cuchillo', it: 'coltello', de: 'Messer', pt: 'faca', nl: 'mes', ru: 'нож', tr: 'bıçak', ar: 'سكين', zh: '刀', ja: 'ナイフ', ko: '칼', hy: 'դանակ' },
  capres: { en: 'capers', es: 'alcaparras', it: 'capperi', de: 'Kapern', pt: 'alcaparras', nl: 'kappertjes', ru: 'каперсы', tr: 'kapari', ar: 'كبر', zh: '刺山柑', ja: 'ケッパー', ko: '케이퍼', hy: 'կապար' },
  echalote: { en: 'shallot', es: 'chalota', it: 'scalogno', de: 'Schalotte', pt: 'chalota', nl: 'sjalot', ru: 'лук-шалот', tr: 'arpacık soğan', ar: 'كراث', zh: '青葱', ja: 'エシャロット', ko: '샬롯', hy: 'սոխուկ' },
  jaune: { en: 'yolk', es: 'yema', it: 'tuorlo', de: 'Eigelb', pt: 'gema', nl: 'dooier', ru: 'желток', tr: 'sarısı', ar: 'صفار', zh: '蛋黄', ja: '黄身', ko: '노른자', hy: 'դեղնուց' },
  roquefort: { en: 'roquefort', es: 'roquefort', it: 'roquefort', de: 'Roquefort', pt: 'roquefort', nl: 'roquefort', ru: 'рокфор', tr: 'rokfor', ar: 'روكفور', zh: '洛克福', ja: 'ロックフォール', ko: '로크포르', hy: 'ռոկֆոր' },
  toast: { en: 'toast', es: 'tostada', it: 'crostino', de: 'Toast', pt: 'torrada', nl: 'toast', ru: 'тост', tr: 'kızarmış ekmek', ar: 'خبز محمص', zh: '吐司', ja: 'トースト', ko: '토스트', hy: 'տոստ' },
  saison: { en: 'season', es: 'temporada', it: 'stagione', de: 'Saison', pt: 'época', nl: 'seizoen', ru: 'сезон', tr: 'mevsim', ar: 'الموسم', zh: '时令', ja: '季節', ko: '제철', hy: 'սեզոն' },
  assortiment: { en: 'assortment', es: 'surtido', it: 'assortimento', de: 'Auswahl', pt: 'sortido', nl: 'assortiment', ru: 'ассорти', tr: 'karışık', ar: 'تشكيلة', zh: '拼盘', ja: '盛り合わせ', ko: '모둠', hy: 'տեսականի' },
  marinade: { en: 'marinated', es: 'marinado', it: 'marinato', de: 'mariniert', pt: 'marinado', nl: 'gemarineerd', ru: 'маринованный', tr: 'marine', ar: 'متبل', zh: '腌制', ja: 'マリネ', ko: '마리네이드', hy: 'մարինացված' },
  marine: { en: 'marinated', es: 'marinado', it: 'marinato', de: 'mariniert', pt: 'marinado', nl: 'gemarineerd', ru: 'маринованный', tr: 'marine', ar: 'متبل', zh: '腌制', ja: 'マリネ', ko: '마리네이드', hy: 'մարինացված' },
  ail: { en: 'garlic', es: 'ajo', it: 'aglio', de: 'Knoblauch', pt: 'alho', nl: 'knoflook', ru: 'чеснок', tr: 'sarımsak', ar: 'ثوم', zh: '大蒜', ja: 'にんにく', ko: '마늘', hy: 'սխտոր' },
  coriandre: { en: 'coriander', es: 'cilantro', it: 'coriandolo', de: 'Koriander', pt: 'coentros', nl: 'koriander', ru: 'кинза', tr: 'kişniş', ar: 'كزبرة', zh: '香菜', ja: 'パクチー', ko: '고수', hy: 'համեմ' },
  persil: { en: 'parsley', es: 'perejil', it: 'prezzemolo', de: 'Petersilie', pt: 'salsa', nl: 'peterselie', ru: 'петрушка', tr: 'maydanoz', ar: 'بقدونس', zh: '欧芹', ja: 'パセリ', ko: '파슬리', hy: 'մաղադանոս' },
  haricots: { en: 'beans', es: 'frijoles', it: 'fagioli', de: 'Bohnen', pt: 'feijões', nl: 'bonen', ru: 'фасоль', tr: 'fasulye', ar: 'فاصولياء', zh: '豆', ja: '豆', ko: '콩', hy: 'լոբի' },
  concombre: { en: 'cucumber', es: 'pepino', it: 'cetriolo', de: 'Gurke', pt: 'pepino', nl: 'komkommer', ru: 'огурец', tr: 'salatalık', ar: 'خيار', zh: '黄瓜', ja: 'きゅうり', ko: '오이', hy: 'վարունգ' },
  pomme: { en: 'apple', es: 'manzana', it: 'mela', de: 'Apfel', pt: 'maçã', nl: 'appel', ru: 'яблоко', tr: 'elma', ar: 'تفاح', zh: '苹果', ja: 'りんご', ko: '사과', hy: 'խնձոր' },
  amandes: { en: 'almonds', es: 'almendras', it: 'mandorle', de: 'Mandeln', pt: 'amêndoas', nl: 'amandelen', ru: 'миндаль', tr: 'badem', ar: 'لوز', zh: '杏仁', ja: 'アーモンド', ko: '아몬드', hy: 'նուշ' },
  cacahuetes: { en: 'peanuts', es: 'cacahuetes', it: 'arachidi', de: 'Erdnüsse', pt: 'amendoins', nl: 'pinda’s', ru: 'арахис', tr: 'yer fıstığı', ar: 'فول سوداني', zh: '花生', ja: 'ピーナッツ', ko: '땅콩', hy: 'գետնանուշ' },
  farine: { en: 'flour', es: 'harina', it: 'farina', de: 'Mehl', pt: 'farinha', nl: 'meel', ru: 'мука', tr: 'un', ar: 'دقيق', zh: '面粉', ja: '小麦粉', ko: '밀가루', hy: 'ալյուր' },
  ble: { en: 'wheat', es: 'trigo', it: 'grano', de: 'Weizen', pt: 'trigo', nl: 'tarwe', ru: 'пшеница', tr: 'buğday', ar: 'قمح', zh: '小麦', ja: '小麦', ko: '밀', hy: 'ցորեն' },
  sans: { en: 'without', es: 'sin', it: 'senza', de: 'ohne', pt: 'sem', nl: 'zonder', ru: 'без', tr: 'siz', ar: 'بدون', zh: '不含', ja: 'なし', ko: '없이', hy: 'առանց' },
  'sucre ajoute': { en: 'added sugar', es: 'azúcar añadido', it: 'zucchero aggiunto', de: 'Zuckerzusatz', pt: 'açúcar adicionado', nl: 'toegevoegde suiker', ru: 'добавленный сахар', tr: 'ilave şeker', ar: 'سكر مضاف', zh: '添加糖', ja: '砂糖不使用', ko: '첨가당', hy: 'ավելացրած շաքար' },
  presses: { en: 'pressed', es: 'prensados', it: 'spremuti', de: 'gepresst', pt: 'espremidos', nl: 'geperst', ru: 'свежевыжатые', tr: 'sıkma', ar: 'معصور', zh: '鲜榨', ja: '搾りたて', ko: '착즙', hy: 'քամած' },
  'presse minute': { en: 'freshly pressed', es: 'recién exprimido', it: 'spremuto al momento', de: 'frisch gepresst', pt: 'espremido na hora', nl: 'vers geperst', ru: 'свежевыжатый', tr: 'anında sıkılmış', ar: 'معصور طازج', zh: '现榨', ja: '搾りたて', ko: '즉석 착즙', hy: 'թարմ քամած' },
  jus: { en: 'juice', es: 'zumo', it: 'succo', de: 'Saft', pt: 'sumo', nl: 'sap', ru: 'сок', tr: 'suyu', ar: 'عصير', zh: '汁', ja: 'ジュース', ko: '주스', hy: 'հյութ' },
  rotis: { en: 'roasted', es: 'asados', it: 'arrostiti', de: 'geröstet', pt: 'assados', nl: 'geroosterd', ru: 'запечённый', tr: 'kavrulmuş', ar: 'محمص', zh: '烤', ja: 'ロースト', ko: '구운', hy: 'բովված' },
  bowl: { en: 'bowl', es: 'bol', it: 'bowl', de: 'Bowl', pt: 'bowl', nl: 'bowl', ru: 'боул', tr: 'kase', ar: 'وعاء', zh: '碗', ja: 'ボウル', ko: '볼', hy: 'բոուլ' },
  bowls: { en: 'Bowls', es: 'Boles', it: 'Bowl', de: 'Bowls', pt: 'Bowls', nl: 'Bowls', ru: 'Боулы', tr: 'Kaseler', ar: 'الأوعية', zh: '碗物', ja: 'ボウル', ko: '볼', hy: 'Բոուլներ' },
  brochettes: { en: 'skewers', es: 'brochetas', it: 'spiedini', de: 'Spieße', pt: 'espetadas', nl: 'spiesjes', ru: 'шашлычки', tr: 'şiş', ar: 'أسياخ', zh: '串', ja: '串', ko: '꼬치', hy: 'խորոված շամփուրներ' },
  grillades: { en: 'Grills', es: 'Parrilladas', it: 'Grigliate', de: 'Gegrilltes', pt: 'Grelhados', nl: 'Grillgerechten', ru: 'Гриль', tr: 'Izgaralar', ar: 'المشاوي', zh: '烧烤', ja: '炭火焼き', ko: '구이', hy: 'Խորովածներ' },
  mezze: { en: 'Mezze', es: 'Mezze', it: 'Mezze', de: 'Mezze', pt: 'Mezze', nl: 'Mezze', ru: 'Мезе', tr: 'Meze', ar: 'مقبلات', zh: '前菜拼盘', ja: 'メゼ', ko: '메제', hy: 'Մեզե' },
  pizzas: { en: 'Pizzas', es: 'Pizzas', it: 'Pizze', de: 'Pizzen', pt: 'Pizzas', nl: 'Pizza’s', ru: 'Пиццы', tr: 'Pizzalar', ar: 'بيتزا', zh: '披萨', ja: 'ピザ', ko: '피자', hy: 'Պիցցաներ' },
  antipasti: { en: 'Antipasti', es: 'Antipasti', it: 'Antipasti', de: 'Antipasti', pt: 'Antipasti', nl: 'Antipasti', ru: 'Антипасти', tr: 'Antipasti', ar: 'مقبلات', zh: '前菜', ja: '前菜', ko: '전채', hy: 'Անտիպաստի' },
  'petites assiettes': { en: 'Small plates', es: 'Platos pequeños', it: 'Piccoli piatti', de: 'Kleine Teller', pt: 'Pratos pequenos', nl: 'Kleine gerechten', ru: 'Маленькие тарелки', tr: 'Küçük tabaklar', ar: 'أطباق صغيرة', zh: '小碟', ja: '小皿', ko: '작은 접시', hy: 'Փոքր ափսեներ' },
  'riz & nouilles': { en: 'Rice & noodles', es: 'Arroz y fideos', it: 'Riso e noodles', de: 'Reis & Nudeln', pt: 'Arroz e noodles', nl: 'Rijst & noedels', ru: 'Рис и лапша', tr: 'Pilav ve erişte', ar: 'أرز ومعكرونة', zh: '饭与面', ja: 'ご飯と麺', ko: '밥과 면', hy: 'Բրինձ և արիշտա' },
  'a partager': { en: 'To share', es: 'Para compartir', it: 'Da condividere', de: 'Zum Teilen', pt: 'Para partilhar', nl: 'Om te delen', ru: 'На компанию', tr: 'Paylaşımlık', ar: 'للمشاركة', zh: '分享', ja: 'シェア', ko: '나눔', hy: 'Կիսվելու համար' },
  'petits dejeuners': { en: 'Breakfast', es: 'Desayunos', it: 'Colazioni', de: 'Frühstück', pt: 'Pequenos-almoços', nl: 'Ontbijt', ru: 'Завтраки', tr: 'Kahvaltı', ar: 'الفطور', zh: '早餐', ja: '朝食', ko: '아침식사', hy: 'Նախաճաշեր' },
  plat: { en: 'dish', es: 'plato', it: 'piatto', de: 'Gericht', pt: 'prato', nl: 'gerecht', ru: 'блюдо', tr: 'yemek', ar: 'طبق', zh: '菜', ja: '料理', ko: '요리', hy: 'ուտեստ' },
  sur: { en: 'on', es: 'en', it: 'su', de: 'auf', pt: 'em', nl: 'op', ru: 'на', tr: 'üzerinde', ar: 'على', zh: '于', ja: 'の', ko: '위', hy: 'վրա' },
  marche: { en: 'market', es: 'mercado', it: 'mercato', de: 'Markt', pt: 'mercado', nl: 'markt', ru: 'рынок', tr: 'pazar', ar: 'السوق', zh: '市集', ja: '市場', ko: '시장', hy: 'շուկա' },
  bistrot: { en: 'bistro', es: 'bistró', it: 'bistrot', de: 'Bistro', pt: 'bistrô', nl: 'bistro', ru: 'бистро', tr: 'bistro', ar: 'بيسترو', zh: '小酒馆', ja: 'ビストロ', ko: '비스트로', hy: 'բիստրո' },
  "d'oeuf": { en: 'of egg', es: 'de huevo', it: 'd’uovo', de: 'vom Ei', pt: 'de ovo', nl: 'van ei', ru: 'яичный', tr: 'yumurta', ar: 'بيض', zh: '蛋', ja: '卵', ko: '계란', hy: 'ձվի' },
  'plat du jour': { en: 'Dish of the day', es: 'Plato del día', it: 'Piatto del giorno', de: 'Tagesgericht', pt: 'Prato do dia', nl: 'Dagschotel', ru: 'Блюдо дня', tr: 'Günün yemeği', ar: 'طبق اليوم', zh: '每日精选', ja: '本日のおすすめ', ko: '오늘의 요리', hy: 'Օրվա ուտեստ' },

  // --- burgers ---
  burger: { en: 'burger', es: 'hamburguesa', it: 'hamburger', de: 'Burger', pt: 'hambúrguer', nl: 'burger', ru: 'бургер', tr: 'burger', ar: 'برغر', zh: '汉堡', ja: 'バーガー', ko: '버거', hy: 'բուրգեր' },
  burgers: { en: 'Burgers', es: 'Hamburguesas', it: 'Hamburger', de: 'Burger', pt: 'Hambúrgueres', nl: 'Burgers', ru: 'Бургеры', tr: 'Burgerler', ar: 'برغر', zh: '汉堡', ja: 'バーガー', ko: '버거', hy: 'Բուրգերներ' },
  cheddar: { en: 'cheddar', es: 'cheddar', it: 'cheddar', de: 'Cheddar', pt: 'cheddar', nl: 'cheddar', ru: 'чеддер', tr: 'çedar', ar: 'تشيدر', zh: '切达奶酪', ja: 'チェダーチーズ', ko: '체다치즈', hy: 'չեդդեռ' },
  bacon: { en: 'bacon', es: 'panceta', it: 'pancetta', de: 'Speck', pt: 'bacon', nl: 'bacon', ru: 'бекон', tr: 'pastırma', ar: 'بيكون', zh: '培根', ja: 'ベーコン', ko: '베이컨', hy: 'բեկոն' },
  caramelises: { en: 'caramelized', es: 'caramelizadas', it: 'caramellate', de: 'karamellisiert', pt: 'caramelizadas', nl: 'gekarameliseerd', ru: 'карамелизированный', tr: 'karamelize', ar: 'مكرمل', zh: '焦糖', ja: 'キャラメリゼ', ko: '캐러멜라이즈드', hy: 'կարամելացված' },
  croustillant: { en: 'crispy', es: 'crujiente', it: 'croccante', de: 'knusprig', pt: 'crocante', nl: 'krokant', ru: 'хрустящий', tr: 'çıtır', ar: 'مقرمش', zh: '香脆', ja: 'カリカリ', ko: '바삭한', hy: 'խրթխրթան' },
  "rondelles d'oignon": { en: 'onion rings', es: 'aros de cebolla', it: 'anelli di cipolla', de: 'Zwiebelringe', pt: 'argolas de cebola', nl: 'uienringen', ru: 'луковые кольца', tr: 'soğan halkaları', ar: 'حلقات البصل', zh: '洋葱圈', ja: 'オニオンリング', ko: '어니언링', hy: 'սոխի օղակներ' },
  milkshake: { en: 'milkshake', es: 'batido', it: 'frappè', de: 'Milchshake', pt: 'batido', nl: 'milkshake', ru: 'молочный коктейль', tr: 'milkshake', ar: 'ميلك شيك', zh: '奶昔', ja: 'ミルクシェイク', ko: '밀크셰이크', hy: 'կաթնային կոկտեյլ' },
  cookie: { en: 'cookie', es: 'galleta', it: 'biscotto', de: 'Keks', pt: 'biscoito', nl: 'koekje', ru: 'печенье', tr: 'kurabiye', ar: 'كوكيز', zh: '曲奇', ja: 'クッキー', ko: '쿠키', hy: 'թխվածքաբլիթ' },

  // --- indien ---
  samoussas: { en: 'samosas', es: 'samosas', it: 'samosa', de: 'Samosas', pt: 'samosas', nl: 'samosa’s', ru: 'самса', tr: 'samosa', ar: 'سمبوسة', zh: '咖喱角', ja: 'サモサ', ko: '사모사', hy: 'սամոսա' },
  tikka: { en: 'tikka', es: 'tikka', it: 'tikka', de: 'Tikka', pt: 'tikka', nl: 'tikka', ru: 'тикка', tr: 'tikka', ar: 'تكة', zh: '提卡', ja: 'ティッカ', ko: '티카', hy: 'տիկկա' },
  curry: { en: 'curry', es: 'curry', it: 'curry', de: 'Curry', pt: 'caril', nl: 'curry', ru: 'карри', tr: 'köri', ar: 'كاري', zh: '咖喱', ja: 'カレー', ko: '카레', hy: 'քարի' },
  korma: { en: 'korma', es: 'korma', it: 'korma', de: 'Korma', pt: 'korma', nl: 'korma', ru: 'корма', tr: 'korma', ar: 'كورما', zh: '克玛', ja: 'コルマ', ko: '코르마', hy: 'կորմա' },
  dahl: { en: 'dal', es: 'dal', it: 'dal', de: 'Dal', pt: 'dal', nl: 'dal', ru: 'дал', tr: 'dal', ar: 'دال', zh: '达尔豆', ja: 'ダール', ko: '달', hy: 'դալ' },
  lentilles: { en: 'lentils', es: 'lentejas', it: 'lenticchie', de: 'Linsen', pt: 'lentilhas', nl: 'linzen', ru: 'чечевица', tr: 'mercimek', ar: 'عدس', zh: '扁豆', ja: 'レンズ豆', ko: '렌틸콩', hy: 'ոսպ' },
  corail: { en: 'red', es: 'rojas', it: 'rosse', de: 'rot', pt: 'vermelhas', nl: 'rode', ru: 'красная', tr: 'kırmızı', ar: 'أحمر', zh: '红', ja: 'レッド', ko: '레드', hy: 'կարմիր' },
  basmati: { en: 'basmati', es: 'basmati', it: 'basmati', de: 'Basmati', pt: 'basmati', nl: 'basmati', ru: 'басмати', tr: 'basmati', ar: 'بسمتي', zh: '巴斯马蒂', ja: 'バスマティ', ko: '바스마티', hy: 'բասմաթի' },
  naan: { en: 'naan', es: 'naan', it: 'naan', de: 'Naan', pt: 'naan', nl: 'naan', ru: 'наан', tr: 'naan', ar: 'نان', zh: '馕', ja: 'ナン', ko: '난', hy: 'նան' },
  masala: { en: 'masala', es: 'masala', it: 'masala', de: 'Masala', pt: 'masala', nl: 'masala', ru: 'масала', tr: 'masala', ar: 'ماسالا', zh: '马萨拉', ja: 'マサラ', ko: '마살라', hy: 'մասալա' },
  lassi: { en: 'lassi', es: 'lassi', it: 'lassi', de: 'Lassi', pt: 'lassi', nl: 'lassi', ru: 'ласси', tr: 'lassi', ar: 'لاسي', zh: '拉西', ja: 'ラッシー', ko: '라씨', hy: 'լասսի' },
  mangue: { en: 'mango', es: 'mango', it: 'mango', de: 'Mango', pt: 'manga', nl: 'mango', ru: 'манго', tr: 'mango', ar: 'مانجو', zh: '芒果', ja: 'マンゴー', ko: '망고', hy: 'մանգո' },
  paneer: { en: 'paneer', es: 'paneer', it: 'paneer', de: 'Paneer', pt: 'paneer', nl: 'paneer', ru: 'панир', tr: 'paneer', ar: 'بانير', zh: '印度奶酪', ja: 'パニール', ko: '파니르', hy: 'պանիր' },
  biryani: { en: 'biryani', es: 'biryani', it: 'biryani', de: 'Biryani', pt: 'biryani', nl: 'biryani', ru: 'бирьяни', tr: 'biryani', ar: 'برياني', zh: '印度香饭', ja: 'ビリヤニ', ko: '비리야니', hy: 'բիրիանի' },
  cardamome: { en: 'cardamom', es: 'cardamomo', it: 'cardamomo', de: 'Kardamom', pt: 'cardamomo', nl: 'kardemom', ru: 'кардамон', tr: 'kakule', ar: 'هيل', zh: '小豆蔻', ja: 'カルダモン', ko: '카다멈', hy: 'կարդամոն' },
  pistaches: { en: 'pistachios', es: 'pistachos', it: 'pistacchi', de: 'Pistazien', pt: 'pistácios', nl: 'pistachenoten', ru: 'фисташки', tr: 'antep fıstığı', ar: 'فستق', zh: '开心果', ja: 'ピスタチオ', ko: '피스타치오', hy: 'պիստակ' },
  'gulab jamun': { en: 'gulab jamun', es: 'gulab jamun', it: 'gulab jamun', de: 'Gulab Jamun', pt: 'gulab jamun', nl: 'gulab jamun', ru: 'гулаб джамун', tr: 'gulab jamun', ar: 'جولاب جامون', zh: '古拉甜奶球', ja: 'グラブジャムン', ko: '굴랍자문', hy: 'գուլաբ ջամուն' },
  cumin: { en: 'cumin', es: 'comino', it: 'cumino', de: 'Kreuzkümmel', pt: 'cominho', nl: 'komijn', ru: 'тмин', tr: 'kimyon', ar: 'كمون', zh: '孜然', ja: 'クミン', ko: '커민', hy: 'չաման' },
  curcuma: { en: 'turmeric', es: 'cúrcuma', it: 'curcuma', de: 'Kurkuma', pt: 'curcuma', nl: 'kurkuma', ru: 'куркума', tr: 'zerdeçal', ar: 'كركم', zh: '姜黄', ja: 'ターメリック', ko: '강황', hy: 'քրքում' },

  // --- thaï ---
  nems: { en: 'spring rolls', es: 'rollitos de primavera', it: 'involtini primavera', de: 'Frühlingsrollen', pt: 'rolinhos primavera', nl: 'loempia’s', ru: 'спринг-роллы', tr: 'baharat rulosu', ar: 'لفائف الربيع', zh: '春卷', ja: '春巻き', ko: '스프링롤', hy: 'գարնանային ռուլետ' },
  papaye: { en: 'papaya', es: 'papaya', it: 'papaya', de: 'Papaya', pt: 'papaia', nl: 'papaja', ru: 'папайя', tr: 'papaya', ar: 'بابايا', zh: '木瓜', ja: 'パパイヤ', ko: '파파야', hy: 'պապայա' },
  vert: { en: 'green', es: 'verde', it: 'verde', de: 'grün', pt: 'verde', nl: 'groen', ru: 'зелёный', tr: 'yeşil', ar: 'أخضر', zh: '绿', ja: 'グリーン', ko: '그린', hy: 'կանաչ' },
  'pad thai': { en: 'pad thai', es: 'pad thai', it: 'pad thai', de: 'Pad Thai', pt: 'pad thai', nl: 'pad thai', ru: 'пад тай', tr: 'pad thai', ar: 'باد تاي', zh: '泰式炒河粉', ja: 'パッタイ', ko: '팟타이', hy: 'փադ թայ' },
  nouilles: { en: 'noodles', es: 'fideos', it: 'noodles', de: 'Nudeln', pt: 'noodles', nl: 'noedels', ru: 'лапша', tr: 'erişte', ar: 'نودلز', zh: '面条', ja: '麺', ko: '면', hy: 'արիշտա' },
  sautees: { en: 'stir-fried', es: 'salteados', it: 'saltati', de: 'gebraten', pt: 'salteados', nl: 'gebakken', ru: 'обжаренные', tr: 'sote', ar: 'مقلي', zh: '炒', ja: '炒め', ko: '볶은', hy: 'տապակած' },
  saute: { en: 'stir-fried', es: 'salteado', it: 'saltato', de: 'gebraten', pt: 'salteado', nl: 'gebakken', ru: 'обжаренный', tr: 'sote', ar: 'مقلي', zh: '炒', ja: '炒め', ko: '볶음', hy: 'տապակած' },
  'lait de coco': { en: 'coconut milk', es: 'leche de coco', it: 'latte di cocco', de: 'Kokosmilch', pt: 'leite de coco', nl: 'kokosmelk', ru: 'кокосовое молоко', tr: 'hindistan cevizi sütü', ar: 'حليب جوز الهند', zh: '椰奶', ja: 'ココナッツミルク', ko: '코코넛 밀크', hy: 'կոկոսի կաթ' },
  beignets: { en: 'fritters', es: 'buñuelos', it: 'frittelle', de: 'Beignets', pt: 'bolinhos fritos', nl: 'beignets', ru: 'пончики', tr: 'çörek', ar: 'فطائر مقلية', zh: '油炸饼', ja: '揚げ物', ko: '튀김', hy: 'խմորեղեն' },
  banane: { en: 'banana', es: 'plátano', it: 'banana', de: 'Banane', pt: 'banana', nl: 'banaan', ru: 'банан', tr: 'muz', ar: 'موز', zh: '香蕉', ja: 'バナナ', ko: '바나나', hy: 'բանան' },
  ananas: { en: 'pineapple', es: 'piña', it: 'ananas', de: 'Ananas', pt: 'ananás', nl: 'ananas', ru: 'ананас', tr: 'ananas', ar: 'أناناس', zh: '菠萝', ja: 'パイナップル', ko: '파인애플', hy: 'արքայախնձոր' },
  gingembre: { en: 'ginger', es: 'jengibre', it: 'zenzero', de: 'Ingwer', pt: 'gengibre', nl: 'gember', ru: 'имбирь', tr: 'zencefil', ar: 'زنجبيل', zh: '姜', ja: '生姜', ko: '생강', hy: 'կոճապղպեղ' },

  // --- chinois ---
  raviolis: { en: 'dumplings', es: 'raviolis', it: 'ravioli', de: 'Ravioli', pt: 'raviólis', nl: 'ravioli', ru: 'равиоли', tr: 'mantı', ar: 'رافيولي', zh: '饺子', ja: '餃子', ko: '만두', hy: 'ռավիոլի' },
  laque: { en: 'glazed', es: 'glaseado', it: 'glassato', de: 'glasiert', pt: 'glaceado', nl: 'geglazuurd', ru: 'глазированный', tr: 'sırlı', ar: 'مزجج', zh: '脆皮', ja: 'つや焼き', ko: '유약을 바른', hy: 'փայլեցված' },
  'aigre-douce': { en: 'sweet and sour', es: 'agridulce', it: 'agrodolce', de: 'süß-sauer', pt: 'agridoce', nl: 'zoetzuur', ru: 'кисло-сладкий', tr: 'ekşi tatlı', ar: 'حلو وحامض', zh: '糖醋', ja: '甘酢', ko: '새콤달콤한', hy: 'թթու-քաղցր' },
  cantonais: { en: 'Cantonese', es: 'cantonés', it: 'cantonese', de: 'kantonesisch', pt: 'cantonês', nl: 'Kantonees', ru: 'кантонский', tr: 'Kanton usulü', ar: 'كانتوني', zh: '广式', ja: '広東風', ko: '광둥식', hy: 'կանտոնական' },
  'dim sum': { en: 'dim sum', es: 'dim sum', it: 'dim sum', de: 'Dim Sum', pt: 'dim sum', nl: 'dim sum', ru: 'дим-сам', tr: 'dim sum', ar: 'ديم سام', zh: '点心', ja: '点心', ko: '딤섬', hy: 'դիմ սում' },
  assortis: { en: 'assorted', es: 'surtidos', it: 'misti', de: 'gemischt', pt: 'sortidos', nl: 'gemengd', ru: 'ассорти', tr: 'karışık', ar: 'متنوع', zh: '什锦', ja: '盛り合わせ', ko: '모둠', hy: 'խառը' },

  // --- japonais ---
  gyoza: { en: 'gyoza', es: 'gyoza', it: 'gyoza', de: 'Gyoza', pt: 'gyoza', nl: 'gyoza', ru: 'гёдза', tr: 'gyoza', ar: 'جيوزا', zh: '煎饺', ja: '餃子', ko: '교자', hy: 'գյոզա' },
  edamame: { en: 'edamame', es: 'edamame', it: 'edamame', de: 'Edamame', pt: 'edamame', nl: 'edamame', ru: 'эдамаме', tr: 'edamame', ar: 'إدامامي', zh: '毛豆', ja: '枝豆', ko: '에다마메', hy: 'էդամամե' },
  ramen: { en: 'ramen', es: 'ramen', it: 'ramen', de: 'Ramen', pt: 'ramen', nl: 'ramen', ru: 'рамен', tr: 'ramen', ar: 'رامن', zh: '拉面', ja: 'ラーメン', ko: '라멘', hy: 'ռամեն' },
  miso: { en: 'miso', es: 'miso', it: 'miso', de: 'Miso', pt: 'miso', nl: 'miso', ru: 'мисо', tr: 'miso', ar: 'ميسو', zh: '味噌', ja: '味噌', ko: '미소', hy: 'միսո' },
  japonais: { en: 'Japanese', es: 'japonés', it: 'giapponese', de: 'japanisch', pt: 'japonês', nl: 'Japans', ru: 'японский', tr: 'Japon', ar: 'ياباني', zh: '日式', ja: '日本風', ko: '일본식', hy: 'ճապոնական' },
  mochi: { en: 'mochi', es: 'mochi', it: 'mochi', de: 'Mochi', pt: 'mochi', nl: 'mochi', ru: 'моти', tr: 'mochi', ar: 'موتشي', zh: '麻糬', ja: '餅', ko: '모찌', hy: 'մոչի' },
  matcha: { en: 'matcha', es: 'matcha', it: 'matcha', de: 'Matcha', pt: 'matcha', nl: 'matcha', ru: 'матча', tr: 'matcha', ar: 'ماتشا', zh: '抹茶', ja: '抹茶', ko: '말차', hy: 'մատչա' },

  // --- pizza & italien ---
  bruschetta: { en: 'bruschetta', es: 'bruschetta', it: 'bruschetta', de: 'Bruschetta', pt: 'bruschetta', nl: 'bruschetta', ru: 'брускетта', tr: 'bruschetta', ar: 'بروسكيتا', zh: '意式烤面包', ja: 'ブルスケッタ', ko: '브루스케타', hy: 'բրուսկետա' },
  margherita: { en: 'margherita', es: 'margarita', it: 'margherita', de: 'Margherita', pt: 'margherita', nl: 'margherita', ru: 'маргарита', tr: 'margarita', ar: 'مارغريتا', zh: '玛格丽特', ja: 'マルゲリータ', ko: '마르게리타', hy: 'մարգարիտա' },
  napolitaine: { en: 'Neapolitan', es: 'napolitana', it: 'napoletana', de: 'neapolitanisch', pt: 'napolitana', nl: 'Napolitaans', ru: 'неаполитанская', tr: 'Napoli usulü', ar: 'نابولي', zh: '那不勒斯风味', ja: 'ナポリ風', ko: '나폴리식', hy: 'նեապոլիտանական' },
  reine: { en: 'ham & mushroom', es: 'reina', it: 'regina', de: 'Königin', pt: 'rainha', nl: 'koningin', ru: 'королева', tr: 'kraliçe', ar: 'الملكة', zh: '皇后', ja: 'レジーナ', ko: '레지나', hy: 'թագուհի' },
  calzone: { en: 'calzone', es: 'calzone', it: 'calzone', de: 'Calzone', pt: 'calzone', nl: 'calzone', ru: 'кальцоне', tr: 'calzone', ar: 'كالزوني', zh: '卡佐尼', ja: 'カルツォーネ', ko: '칼초네', hy: 'կալցոնե' },
  'panna cotta': { en: 'panna cotta', es: 'panna cotta', it: 'panna cotta', de: 'Panna Cotta', pt: 'panna cotta', nl: 'panna cotta', ru: 'панна-котта', tr: 'panna cotta', ar: 'بانا كوتا', zh: '意式奶冻', ja: 'パンナコッタ', ko: '판나코타', hy: 'պաննա կոտա' },
  anchois: { en: 'anchovies', es: 'anchoas', it: 'acciughe', de: 'Sardellen', pt: 'anchovas', nl: 'ansjovis', ru: 'анчоусы', tr: 'ançüez', ar: 'أنشوجة', zh: '鳀鱼', ja: 'アンチョビ', ko: '앤초비', hy: 'խեցգետնաձուկ' },
  origan: { en: 'oregano', es: 'orégano', it: 'origano', de: 'Oregano', pt: 'orégão', nl: 'oregano', ru: 'орегано', tr: 'kekik', ar: 'أوريغانو', zh: '牛至', ja: 'オレガノ', ko: '오레가노', hy: 'սուսամբար' },

  // --- gourmand végétal & bistrot ---
  houmous: { en: 'hummus', es: 'hummus', it: 'hummus', de: 'Hummus', pt: 'húmus', nl: 'hummus', ru: 'хумус', tr: 'humus', ar: 'حمص', zh: '鹰嘴豆泥', ja: 'フムス', ko: '후무스', hy: 'հումուս' },
  falafel: { en: 'falafel', es: 'falafel', it: 'falafel', de: 'Falafel', pt: 'falafel', nl: 'falafel', ru: 'фалафель', tr: 'falafel', ar: 'فلافل', zh: '法拉费', ja: 'ファラフェル', ko: '팔라펠', hy: 'ֆալաֆել' },
  tofu: { en: 'tofu', es: 'tofu', it: 'tofu', de: 'Tofu', pt: 'tofu', nl: 'tofu', ru: 'тофу', tr: 'tofu', ar: 'توفو', zh: '豆腐', ja: '豆腐', ko: '두부', hy: 'տոֆու' },
  risotto: { en: 'risotto', es: 'risotto', it: 'risotto', de: 'Risotto', pt: 'risoto', nl: 'risotto', ru: 'ризотто', tr: 'risotto', ar: 'ريزوتو', zh: '意式烩饭', ja: 'リゾット', ko: '리조또', hy: 'ռիզոտո' },
  fruits: { en: 'fruits', es: 'frutas', it: 'frutta', de: 'Früchte', pt: 'frutas', nl: 'fruit', ru: 'фрукты', tr: 'meyveler', ar: 'فواكه', zh: '水果', ja: 'フルーツ', ko: '과일', hy: 'մրգեր' },
  betterave: { en: 'beetroot', es: 'remolacha', it: 'barbabietola', de: 'Rote Bete', pt: 'beterraba', nl: 'bieten', ru: 'свёкла', tr: 'pancar', ar: 'شمندر', zh: '甜菜根', ja: 'ビーツ', ko: '비트', hy: 'ճակնդեղ' },
  mayonnaise: { en: 'mayonnaise', es: 'mayonesa', it: 'maionese', de: 'Mayonnaise', pt: 'maionese', nl: 'mayonaise', ru: 'майонез', tr: 'mayonez', ar: 'مايونيز', zh: '蛋黄酱', ja: 'マヨネーズ', ko: '마요네즈', hy: 'մայոնեզ' },
  ciboulette: { en: 'chives', es: 'cebollino', it: 'erba cipollina', de: 'Schnittlauch', pt: 'cebolinho', nl: 'bieslook', ru: 'зелёный лук', tr: 'kuşkonmaz', ar: 'ثوم معمر', zh: '细香葱', ja: 'チャイブ', ko: '차이브', hy: 'ուրց' },
  terrine: { en: 'terrine', es: 'terrina', it: 'terrina', de: 'Terrine', pt: 'terrine', nl: 'terrine', ru: 'террин', tr: 'terrin', ar: 'تيرين', zh: '肉冻', ja: 'テリーヌ', ko: '테린', hy: 'տերին' },
  campagne: { en: 'country-style', es: 'campestre', it: 'di campagna', de: 'nach Landart', pt: 'do campo', nl: 'van het platteland', ru: 'деревенский', tr: 'köy usulü', ar: 'ريفي', zh: '乡村', ja: '田舎風', ko: '시골풍', hy: 'գյուղական' },
  cornichons: { en: 'gherkins', es: 'pepinillos', it: 'cetriolini', de: 'Gewürzgurken', pt: 'pepinos em conserva', nl: 'augurken', ru: 'корнишоны', tr: 'turşu', ar: 'مخلل خيار', zh: '腌黄瓜', ja: 'コルニッション', ko: '피클', hy: 'թթու վարունգ' },
  blanquette: { en: 'veal stew', es: 'blanquette', it: 'blanquette', de: 'Blanquette', pt: 'blanquette', nl: 'blanquette', ru: 'бланкет', tr: 'dana yahnisi', ar: 'بلانكيت', zh: '白汁炖肉', ja: 'ブランケット', ko: '블랑케트', hy: 'բլանկետ' },
  confit: { en: 'confit', es: 'confitado', it: 'confit', de: 'Confit', pt: 'confitado', nl: 'confit', ru: 'конфи', tr: 'confit', ar: 'كونفي', zh: '油封', ja: 'コンフィ', ko: '콩피', hy: 'կոնֆի' },
  sarladaises: { en: 'sarlat-style', es: 'a la sarladesa', it: 'alla sarladese', de: 'nach Sarlat-Art', pt: 'à sarladesa', nl: 'op Sarlat-wijze', ru: 'по-сарладски', tr: 'sarlat usulü', ar: 'على طريقة سارلا', zh: '萨拉风味', ja: 'サルラ風', ko: '사를라식', hy: 'սառլայի ոճով' },
  steak: { en: 'steak', es: 'filete', it: 'bistecca', de: 'Steak', pt: 'bife', nl: 'steak', ru: 'стейк', tr: 'biftek', ar: 'ستيك', zh: '牛排', ja: 'ステーキ', ko: '스테이크', hy: 'սթեյք' },
  mousse: { en: 'mousse', es: 'mousse', it: 'mousse', de: 'Mousse', pt: 'mousse', nl: 'mousse', ru: 'мусс', tr: 'mus', ar: 'موس', zh: '慕斯', ja: 'ムース', ko: '무스', hy: 'մուս' },
  'ile flottante': { en: 'floating island', es: 'isla flotante', it: 'isola galleggiante', de: 'schwimmende Insel', pt: 'ilha flutuante', nl: 'drijvend eiland', ru: 'плавучий остров', tr: 'yüzen ada', ar: 'جزيرة عائمة', zh: '漂浮岛', ja: '浮島', ko: '떠 있는 섬', hy: 'լողացող կղզի' },
  'blancs en neige': { en: 'whipped egg whites', es: 'claras montadas', it: 'albumi montati', de: 'Eischnee', pt: 'claras em castelo', nl: 'opgeklopt eiwit', ru: 'взбитые белки', tr: 'çırpılmış yumurta akı', ar: 'بياض بيض مخفوق', zh: '打发蛋白', ja: 'メレンゲ', ko: '휘핑한 흰자', hy: 'ձվի սպիտակուցի փրփուր' },
  'creme anglaise': { en: 'custard', es: 'crema inglesa', it: 'crema inglese', de: 'Vanillesauce', pt: 'creme inglês', nl: 'vanillesaus', ru: 'английский крем', tr: 'İngiliz kreması', ar: 'كريمة إنجليزية', zh: '英式蛋奶酱', ja: 'カスタードソース', ko: '커스터드 소스', hy: 'անգլիական կրեմ' },
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
