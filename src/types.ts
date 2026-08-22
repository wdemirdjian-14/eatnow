/** Codes langue supportés par Eatnow pour la traduction des cartes. */
export const LANGS = [
  'fr', 'en', 'es', 'it', 'de', 'pt', 'nl', 'ru', 'tr', 'hy', 'ar', 'zh', 'ja', 'ko',
] as const
export type Lang = (typeof LANGS)[number]

export const LANG_META: Record<Lang, { label: string; native: string; flag: string; rtl?: boolean }> = {
  fr: { label: 'Français', native: 'Français', flag: '🇫🇷' },
  en: { label: 'Anglais', native: 'English', flag: '🇬🇧' },
  es: { label: 'Espagnol', native: 'Español', flag: '🇪🇸' },
  it: { label: 'Italien', native: 'Italiano', flag: '🇮🇹' },
  de: { label: 'Allemand', native: 'Deutsch', flag: '🇩🇪' },
  pt: { label: 'Portugais', native: 'Português', flag: '🇵🇹' },
  nl: { label: 'Néerlandais', native: 'Nederlands', flag: '🇳🇱' },
  ru: { label: 'Russe', native: 'Русский', flag: '🇷🇺' },
  tr: { label: 'Turc', native: 'Türkçe', flag: '🇹🇷' },
  hy: { label: 'Arménien', native: 'Հայերեն', flag: '🇦🇲' },
  ar: { label: 'Arabe', native: 'العربية', flag: '🇸🇦', rtl: true },
  zh: { label: 'Chinois', native: '中文', flag: '🇨🇳' },
  ja: { label: 'Japonais', native: '日本語', flag: '🇯🇵' },
  ko: { label: 'Coréen', native: '한국어', flag: '🇰🇷' },
}

/** Langues incluses dans l'offre de base (les autres sont achetables). */
export const INCLUDED_LANGS: Lang[] = ['fr', 'en']

export const CUISINES = [
  'francaise', 'italienne', 'japonaise', 'libanaise', 'indienne', 'mexicaine',
  'chinoise', 'thai', 'burger', 'vegetarien', 'poisson', 'bistrot', 'pizza', 'coreen',
] as const
export type Cuisine = (typeof CUISINES)[number]

export const CUISINE_LABEL: Record<Cuisine, string> = {
  francaise: 'Française', italienne: 'Italienne', japonaise: 'Japonaise', libanaise: 'Libanaise',
  indienne: 'Indienne', mexicaine: 'Mexicaine', chinoise: 'Chinoise', thai: 'Thaï',
  burger: 'Burger', vegetarien: 'Végétarien', poisson: 'Poisson & fruits de mer',
  bistrot: 'Bistrot', pizza: 'Pizzeria', coreen: 'Coréen',
}

/** Les 14 allergènes à déclaration obligatoire (règlement UE 1169/2011). */
export const ALLERGENS = [
  'gluten', 'crustaces', 'oeufs', 'poissons', 'arachides', 'soja', 'lait',
  'fruits-a-coque', 'celeri', 'moutarde', 'sesame', 'sulfites', 'lupin', 'mollusques',
] as const
export type Allergen = (typeof ALLERGENS)[number]

export const ALLERGEN_LABEL: Record<Allergen, { fr: string; icon: string }> = {
  gluten: { fr: 'Gluten', icon: '🌾' },
  crustaces: { fr: 'Crustacés', icon: '🦐' },
  oeufs: { fr: 'Œufs', icon: '🥚' },
  poissons: { fr: 'Poissons', icon: '🐟' },
  arachides: { fr: 'Arachides', icon: '🥜' },
  soja: { fr: 'Soja', icon: '🫘' },
  lait: { fr: 'Lait', icon: '🥛' },
  'fruits-a-coque': { fr: 'Fruits à coque', icon: '🌰' },
  celeri: { fr: 'Céleri', icon: '🥬' },
  moutarde: { fr: 'Moutarde', icon: '🌭' },
  sesame: { fr: 'Sésame', icon: '🫓' },
  sulfites: { fr: 'Sulfites', icon: '🍷' },
  lupin: { fr: 'Lupin', icon: '🌱' },
  mollusques: { fr: 'Mollusques', icon: '🦪' },
}

export const DIET_TAGS = ['vegetarien', 'vegan', 'sans-gluten', 'epice', 'maison', 'nouveau'] as const
export type DietTag = (typeof DIET_TAGS)[number]

export const DIET_LABEL: Record<DietTag, { fr: string; icon: string }> = {
  vegetarien: { fr: 'Végétarien', icon: '🥗' },
  vegan: { fr: 'Vegan', icon: '🌱' },
  'sans-gluten': { fr: 'Sans gluten', icon: '🚫🌾' },
  epice: { fr: 'Épicé', icon: '🌶️' },
  maison: { fr: 'Fait maison', icon: '👨‍🍳' },
  nouveau: { fr: 'Nouveau', icon: '✨' },
}

/**
 * Champ multilingue : un texte source saisi par le restaurateur,
 * ses traductions automatiques, et les forçages manuels qui priment dessus.
 */
export interface I18nField {
  source: string
  auto: Partial<Record<Lang, string>>
  manual: Partial<Record<Lang, string>>
}

/** Un choix dans un groupe d'options : « Saignant », « Frites », « Sans oignon ». */
export interface DishOptionChoice {
  id: string
  label: I18nField
  /** Supplément appliqué au prix du plat (0 = inclus). */
  priceDelta: number
}

/** Un groupe d'options attaché à un plat : « Cuisson », « Accompagnement ». */
export interface DishOptionGroup {
  id: string
  name: I18nField
  /** Le client doit choisir avant d'ajouter le plat à sa sélection. */
  required: boolean
  /** Plusieurs choix possibles dans le groupe. */
  multiple: boolean
  choices: DishOptionChoice[]
}

export interface Category {
  id: string
  restaurantId: string
  name: I18nField
  order: number
}

export interface Dish {
  id: string
  restaurantId: string
  categoryId: string
  name: I18nField
  description: I18nField
  price: number
  promoPrice?: number
  allergens: Allergen[]
  tags: DietTag[]
  available: boolean
  dishOfDay: boolean
  order: number
  /** Photo du plat, optionnelle, stockée en data URL (redimensionnée à l'import). */
  photo?: string
  options: DishOptionGroup[]
}

/** Formule / menu à prix fixe composé de plats de la carte. */
export interface FixedMenu {
  id: string
  restaurantId: string
  name: I18nField
  description: I18nField
  price: number
  dishIds: string[]
  order: number
}

export type Plan = 'essai' | 'starter' | 'pro'

export interface Restaurant {
  id: string
  slug: string
  ownerId: string
  name: string
  description: I18nField
  cuisines: Cuisine[]
  priceRange: 1 | 2 | 3 | 4
  address: string
  postalCode: string
  city: string
  lat: number
  lng: number
  phone: string
  website?: string
  emoji: string
  /** Photo de couverture, servie depuis /uploads. */
  photo?: string
  hue: number
  rating: number
  reviews: number
  hours: string
  sourceLang: Lang
  /** Langues achetées en plus des langues incluses. */
  purchasedLangs: Lang[]
  /** Inscrit à Eatnow => carte traduite publiée. */
  published: boolean
  plan: Plan
  createdAt: string
}

export interface Owner {
  id: string
  name: string
  /** Identifiant de connexion du restaurateur. */
  email: string
  password: string
  restaurantId: string
  /** Création du compte, renseignée par le serveur. */
  createdAt?: string
  /** Dernière connexion par mot de passe ; absente si le compte n'a jamais servi. */
  lastLoginAt?: string
}

export interface PurchaseLine {
  id: string
  restaurantId: string
  lang: Lang
  amount: number
  date: string
}

/** Une ligne de la sélection en cours d'un client. */
export interface SelectionLine {
  id: string
  restaurantId: string
  dishId: string
  /** Identifiants des choix retenus, tous groupes confondus. */
  choiceIds: string[]
  qty: number
}

export type Session =
  | { role: 'guest' }
  | { role: 'owner'; ownerId: string }
  /** `impersonating` : identifiant du restaurateur dont l'admin endosse l'espace. */
  | { role: 'admin'; login: string; impersonating?: string }

export interface AppState {
  restaurants: Restaurant[]
  categories: Category[]
  dishes: Dish[]
  menus: FixedMenu[]
  owners: Owner[]
  purchases: PurchaseLine[]
}
