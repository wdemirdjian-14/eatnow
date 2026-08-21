import type {
  Allergen, AppState, Category, Cuisine, Dish, DishOptionGroup, DietTag, FixedMenu,
  Lang, Owner, Restaurant,
} from '../types'
import { field } from '../lib/translate'
import { slugify } from '../lib/format'
import { demoArt } from './dishArt'

/** [libellé du choix, supplément en euros] */
type ChoiceSeed = [string, number]
/** [nom du groupe, choix obligatoire, choix multiple, choix possibles] */
type GroupSeed = [string, boolean, boolean, ChoiceSeed[]]

/** Tuple compact : [nom, description, prix, catégorie, allergènes, tags, options] */
type DishSeed = [
  string, string, number, string, Allergen[], DietTag[],
  {
    promo?: number
    jour?: boolean
    off?: boolean
    groups?: GroupSeed[]
    art?: ['viande' | 'poisson' | 'vegetal' | 'dessert', number]
  }?,
]

interface RestoSeed {
  name: string
  emoji: string
  /** Illustration de couverture de démonstration. */
  art?: ['viande' | 'poisson' | 'vegetal' | 'dessert', number]
  hue: number
  cuisines: Cuisine[]
  priceRange: 1 | 2 | 3 | 4
  address: string
  postalCode: string
  city: string
  lat: number
  lng: number
  phone: string
  website?: string
  desc: string
  hours: string
  rating: number
  reviews: number
  published: boolean
  plan: Restaurant['plan']
  purchased: Lang[]
  owner: { name: string; email: string }
  categories: string[]
  dishes: DishSeed[]
  menus: { name: string; desc: string; price: number; picks: string[] }[]
  createdAt: string
}

const SEED: RestoSeed[] = [
  {
    name: 'Le Comptoir Bleu', emoji: '🍷', hue: 188, art: ['viande', 1],
    cuisines: ['bistrot', 'francaise'], priceRange: 2,
    address: '14 rue des Lombards', postalCode: '75001', city: 'Paris',
    lat: 48.8601, lng: 2.3479, phone: '01 42 33 18 04', website: 'lecomptoirbleu.fr',
    desc: 'Bistrot de quartier, ardoise du marché et cave à vins nature.',
    hours: 'Mar–Sam · 12h–14h30 · 19h–22h30', rating: 4.6, reviews: 412,
    published: true, plan: 'pro', purchased: ['es', 'it', 'de', 'ja'],
    owner: { name: 'Camille Roussel', email: 'camille@lecomptoirbleu.fr' },
    categories: ['Entrées', 'Plats', 'Desserts', 'Boissons'],
    dishes: [
      ['Soupe à l’oignon gratinée', 'Oignons mijotés, pain de campagne et fromage gratiné au four.', 9.5, 'Entrées', ['gluten', 'lait', 'sulfites'], ['maison']],
      ['Tartare de bœuf au couteau', 'Bœuf taillé au couteau, câpres, échalote, jaune d’œuf.', 12, 'Entrées', ['oeufs', 'moutarde'], []],
      ['Chèvre chaud sur toast', 'Chèvre frais, miel, roquette et pain grillé.', 10.5, 'Entrées', ['lait', 'gluten', 'fruits-a-coque'], ['vegetarien']],
      ['Entrecôte grillée et frites maison', 'Entrecôte 300 g, beurre maître d’hôtel, frites maison.', 26, 'Plats', ['lait'], ['maison'],
        { art: ['viande', 0], groups: [
          ['Cuisson', true, false, [['Bleu', 0], ['Saignant', 0], ['À point', 0], ['Bien cuit', 0]]],
          ['Accompagnement', true, false, [['Frites maison', 0], ['Légumes de saison', 0], ['Salade verte', 0], ['Gratin de pommes de terre', 3]]],
        ] }],
      ['Magret de canard au miel', 'Magret rosé, sauce miel et légumes de saison.', 24, 'Plats', ['sulfites'], [],
        { groups: [['Cuisson', true, false, [['Rosé', 0], ['À point', 0]]]] }],
      ['Cabillaud vapeur et légumes', 'Dos de cabillaud vapeur, légumes croquants, huile d’olive.', 21, 'Plats', ['poissons'], ['sans-gluten'],
        { jour: true, art: ['poisson', 1] }],
      ['Risotto aux champignons', 'Riz carnaroli, champignons de saison, parmesan.', 18, 'Plats', ['lait', 'celeri'], ['vegetarien'], { promo: 15 }],
      ['Tarte au chocolat', 'Tarte au chocolat noir et fleur de sel.', 8.5, 'Desserts', ['gluten', 'lait', 'oeufs'], ['maison'],
        { art: ['dessert', 2] }],
      ['Glace vanille et caramel', 'Deux boules de glace vanille, caramel beurre salé.', 7, 'Desserts', ['lait', 'oeufs'], []],
      ['Verre de vin rouge', 'Sélection du mois, vin nature.', 6.5, 'Boissons', ['sulfites'], [],
        { groups: [['Contenance', true, false, [['Verre 12 cl', 0], ['Verre 25 cl', 4]]]] }],
    ],
    menus: [
      { name: 'Menu du midi', desc: 'Entrée + plat + café, servi du mardi au vendredi.', price: 22, picks: ['Soupe à l’oignon gratinée', 'Cabillaud vapeur et légumes'] },
      { name: 'Menu découverte', desc: 'Entrée, plat et dessert au choix sur l’ardoise.', price: 39, picks: ['Tartare de bœuf au couteau', 'Entrecôte grillée et frites maison', 'Tarte au chocolat'] },
    ],
    createdAt: '2025-11-04',
  },
  {
    name: 'Trattoria Sole', emoji: '🍝', hue: 14, art: ['vegetal', 2],
    cuisines: ['italienne', 'pizza'], priceRange: 2,
    address: '5 rue Tiquetonne', postalCode: '75002', city: 'Paris',
    lat: 48.8648, lng: 2.3466, phone: '01 40 26 77 12',
    desc: 'Pâtes fraîches faites chaque matin et pizzas au feu de bois.',
    hours: 'Lun–Dim · 12h–23h', rating: 4.4, reviews: 986,
    published: true, plan: 'starter', purchased: ['es'],
    owner: { name: 'Marco Bianchi', email: 'marco@trattoriasole.fr' },
    categories: ['Antipasti', 'Pâtes', 'Pizzas', 'Desserts'],
    dishes: [
      ['Burrata et tomates', 'Burrata des Pouilles, tomates, basilic et huile d’olive.', 12, 'Antipasti', ['lait'], ['vegetarien']],
      ['Salade de poulpe', 'Poulpe grillé, pommes de terre et citron.', 13.5, 'Antipasti', ['mollusques', 'celeri'], []],
      ['Pâtes à la truffe', 'Tagliatelles fraîches, crème et truffe noire.', 23, 'Pâtes', ['gluten', 'lait', 'oeufs'], ['maison'],
        { jour: true, groups: [['Portion', true, false, [['Portion normale', 0], ['Grande portion', 4]]]] }],
      ['Pâtes aux crevettes', 'Linguine, crevettes, tomates cerises et basilic.', 19, 'Pâtes', ['gluten', 'crustaces', 'oeufs'], []],
      ['Pizza mozzarella et basilic', 'Sauce tomate, mozzarella, basilic frais.', 13, 'Pizzas', ['gluten', 'lait'], ['vegetarien'],
        { art: ['vegetal', 1], groups: [
          ['Suppléments', false, true, [['Jambon', 2], ['Roquette', 1.5], ['Burrata', 3], ['Champignons', 1.5]]],
        ] }],
      ['Pizza aux champignons', 'Champignons, mozzarella et parmesan.', 15, 'Pizzas', ['gluten', 'lait'], ['vegetarien'], { promo: 12 }],
      ['Tiramisu maison', 'Mascarpone, café et cacao.', 8, 'Desserts', ['lait', 'oeufs', 'gluten'], ['maison']],
    ],
    menus: [
      { name: 'Formule pranzo', desc: 'Antipasto + pâtes du jour, midi en semaine.', price: 19.5, picks: ['Burrata et tomates', 'Pâtes à la truffe'] },
    ],
    createdAt: '2026-01-19',
  },
  {
    name: 'Sakura Izakaya', emoji: '🍣', hue: 340, art: ['poisson', 0],
    cuisines: ['japonaise', 'coreen'], priceRange: 3,
    address: '22 rue Sainte-Anne', postalCode: '75001', city: 'Paris',
    lat: 48.8664, lng: 2.3355, phone: '01 47 03 55 90', website: 'sakura-izakaya.paris',
    desc: 'Izakaya contemporain : petites assiettes, saké et grillades au charbon.',
    hours: 'Mar–Dim · 18h–00h', rating: 4.8, reviews: 1543,
    published: true, plan: 'pro', purchased: ['es', 'zh', 'ko', 'it'],
    owner: { name: 'Yuki Tanaka', email: 'yuki@sakura-izakaya.paris' },
    categories: ['Petites assiettes', 'Grillades', 'Riz & nouilles', 'Desserts'],
    dishes: [
      ['Tartare de thon', 'Thon rouge, avocat, sésame et sauce soja.', 16, 'Petites assiettes', ['poissons', 'soja', 'sesame'], ['epice']],
      ['Saumon grillé au miel', 'Pavé de saumon laqué, sésame torréfié.', 18, 'Grillades', ['poissons', 'soja', 'sesame'], []],
      ['Poulet grillé au charbon', 'Brochettes de poulet, sauce maison.', 14, 'Grillades', ['soja', 'gluten'], ['maison'],
        { jour: true, art: ['viande', 2], groups: [
          ['Sauce', true, false, [['Sauce maison', 0], ['Sauce épicée', 0], ['Sans sauce', 0]]],
          ['Suppléments', false, true, [['Riz supplémentaire', 3], ['Œuf mariné', 2]]],
        ] }],
      ['Aubergine grillée au miso', 'Aubergine fondante, miso sucré, sésame.', 11, 'Petites assiettes', ['soja', 'sesame'], ['vegetarien', 'vegan']],
      ['Riz aux crevettes', 'Riz sauté, crevettes, œuf et légumes.', 17, 'Riz & nouilles', ['crustaces', 'oeufs', 'soja'], []],
      ['Bœuf mijoté au riz', 'Bœuf mijoté 6 h, riz vinaigré, oignon.', 21, 'Riz & nouilles', ['soja', 'gluten'], [], { promo: 18 }],
      ['Glace au thé matcha', 'Glace matcha et haricot rouge.', 8, 'Desserts', ['lait'], ['vegetarien']],
    ],
    menus: [
      { name: 'Menu omakase', desc: 'Six assiettes choisies par le chef.', price: 58, picks: ['Tartare de thon', 'Aubergine grillée au miso', 'Saumon grillé au miel', 'Glace au thé matcha'] },
    ],
    createdAt: '2025-09-22',
  },
  {
    name: 'Beyrouth Café', emoji: '🥙', hue: 96, art: ['vegetal', 1],
    cuisines: ['libanaise', 'vegetarien'], priceRange: 1,
    address: '31 rue Saint-Antoine', postalCode: '75004', city: 'Paris',
    lat: 48.8541, lng: 2.3651, phone: '01 44 61 09 33',
    desc: 'Mezze, grillades et pâtisseries libanaises à emporter ou sur place.',
    hours: 'Lun–Sam · 11h30–22h', rating: 4.5, reviews: 674,
    published: true, plan: 'starter', purchased: ['ar'],
    owner: { name: 'Nadia Khoury', email: 'nadia@beyrouthcafe.fr' },
    categories: ['Mezze', 'Grillades', 'Desserts'],
    dishes: [
      ['Houmous aux pois chiches', 'Pois chiches, sésame, huile d’olive et citron.', 6.5, 'Mezze', ['sesame'], ['vegetarien', 'vegan', 'sans-gluten']],
      ['Salade de tomates et persil', 'Tomates, persil, boulgour fin et citron.', 7, 'Mezze', ['gluten'], ['vegetarien', 'vegan']],
      ['Aubergine au sésame', 'Aubergine fumée, crème de sésame.', 7.5, 'Mezze', ['sesame'], ['vegetarien', 'vegan']],
      ['Agneau grillé et riz', 'Brochettes d’agneau, riz et légumes grillés.', 17, 'Grillades', ['fruits-a-coque'], [],
        { jour: true, groups: [
          ['Accompagnement', true, false, [['Riz', 0], ['Frites maison', 0], ['Salade verte', 0]]],
          ['Sauce', false, true, [['Sauce blanche', 0], ['Sauce piquante', 0]]],
        ] }],
      ['Poulet grillé au citron', 'Poulet mariné au citron et ail, frites maison.', 14.5, 'Grillades', [], ['maison']],
      ['Pâtisseries au miel', 'Assortiment de pâtisseries au miel et fruits à coque.', 6, 'Desserts', ['fruits-a-coque', 'gluten', 'lait'], ['vegetarien']],
    ],
    menus: [
      { name: 'Assiette mezze', desc: 'Cinq mezze au choix, pain chaud inclus.', price: 16, picks: ['Houmous aux pois chiches', 'Salade de tomates et persil', 'Aubergine au sésame'] },
    ],
    createdAt: '2026-03-02',
  },
  {
    name: 'La Criée d’Or', emoji: '🦞', hue: 205, art: ['poisson', 2],
    cuisines: ['poisson', 'francaise'], priceRange: 4,
    address: '2 avenue de Wagram', postalCode: '75017', city: 'Paris',
    lat: 48.8748, lng: 2.2951, phone: '01 45 72 11 88', website: 'lacrieedor.com',
    desc: 'Poissons de petits bateaux, plateaux de fruits de mer et grands blancs.',
    hours: 'Mar–Sam · 12h–14h · 19h30–22h', rating: 4.7, reviews: 328,
    published: true, plan: 'pro', purchased: ['es', 'it', 'de', 'ru', 'hy', 'zh', 'ja', 'ko', 'ar'],
    owner: { name: 'Hélène Vasseur', email: 'helene@lacrieedor.com' },
    categories: ['Entrées', 'Plats', 'Desserts'],
    dishes: [
      ['Saint-Jacques au beurre', 'Noix de Saint-Jacques snackées, beurre citronné.', 28, 'Entrées', ['mollusques', 'lait'], []],
      ['Tartare de saumon', 'Saumon, avocat, citron et huile d’olive.', 24, 'Entrées', ['poissons'], ['sans-gluten']],
      ['Cabillaud et légumes vapeur', 'Cabillaud de ligne, légumes vapeur, sauce citron.', 38, 'Plats', ['poissons', 'lait'], [], { jour: true }],
      ['Poulpe grillé à la plancha', 'Poulpe grillé, pommes de terre et huile d’olive.', 34, 'Plats', ['mollusques'], ['sans-gluten']],
      ['Tarte au citron', 'Tarte au citron meringuée.', 14, 'Desserts', ['gluten', 'oeufs', 'lait'], ['maison']],
    ],
    menus: [
      { name: 'Menu de la marée', desc: 'Entrée, poisson du jour et dessert.', price: 72, picks: ['Saint-Jacques au beurre', 'Cabillaud et légumes vapeur', 'Tarte au citron'] },
    ],
    createdAt: '2025-06-15',
  },
  {
    name: 'Green & Bowl', emoji: '🥗', hue: 140, art: ['vegetal', 0],
    cuisines: ['vegetarien'], priceRange: 1,
    address: '9 rue de Turbigo', postalCode: '75002', city: 'Paris',
    lat: 48.8657, lng: 2.3496, phone: '01 42 21 60 30',
    desc: 'Bowls de saison, jus pressés et desserts sans sucre ajouté.',
    hours: 'Lun–Ven · 11h30–15h', rating: 4.2, reviews: 205,
    published: false, plan: 'essai', purchased: [],
    owner: { name: 'Léa Fontaine', email: 'lea@greenandbowl.fr' },
    categories: ['Bowls', 'Desserts', 'Boissons'],
    dishes: [
      ['Bowl aux pois chiches', 'Pois chiches rôtis, riz complet, légumes de saison.', 12.5, 'Bowls', ['sesame'], ['vegetarien', 'vegan'],
        { art: ['vegetal', 0], groups: [
          ['Base', true, false, [['Riz complet', 0], ['Quinoa', 0], ['Salade verte', 0]]],
          ['Suppléments', false, true, [['Avocat', 2], ['Œuf', 1.5], ['Graines de courge', 1]]],
        ] }],
      ['Bowl à l’avocat', 'Avocat, quinoa, tomates et graines de sésame.', 13.5, 'Bowls', ['sesame'], ['vegetarien', 'vegan']],
      ['Gâteau au chocolat sans gluten', 'Chocolat noir, amandes, sans farine de blé.', 6.5, 'Desserts', ['fruits-a-coque', 'oeufs'], ['vegetarien', 'sans-gluten']],
      ['Jus de légumes frais', 'Pressé minute : concombre, pomme, citron.', 5.5, 'Boissons', [], ['vegetarien', 'vegan']],
    ],
    menus: [],
    createdAt: '2026-07-28',
  },
  {
    name: 'El Burrito Loco', emoji: '🌮', hue: 30, art: ['viande', 2],
    cuisines: ['mexicaine'], priceRange: 1,
    address: '48 rue de la Roquette', postalCode: '75011', city: 'Paris',
    lat: 48.8551, lng: 2.3742, phone: '01 43 57 22 41',
    desc: 'Tacos, burritos et margaritas dans une cantina colorée.',
    hours: 'Mar–Dim · 18h–01h', rating: 4.1, reviews: 512,
    published: false, plan: 'essai', purchased: [],
    owner: { name: 'Diego Ramos', email: 'diego@burritoloco.fr' },
    categories: ['À partager', 'Plats', 'Desserts'],
    dishes: [
      ['Guacamole et tortillas', 'Avocat écrasé, citron, coriandre et tortillas maison.', 8.5, 'À partager', ['gluten'], ['vegetarien', 'maison']],
      ['Tacos au bœuf épicé', 'Bœuf mijoté épicé, oignon, coriandre.', 13, 'Plats', ['gluten', 'lait'], ['epice'],
        { groups: [['Niveau d’épice', true, false, [['Doux', 0], ['Moyen', 0], ['Très épicé', 0]]]] }],
      ['Burrito au poulet', 'Poulet grillé, riz, haricots et fromage.', 12.5, 'Plats', ['gluten', 'lait'], []],
      ['Glace à la vanille et caramel', 'Glace vanille, caramel et cacahuètes.', 6, 'Desserts', ['lait', 'arachides'], ['vegetarien']],
    ],
    menus: [],
    createdAt: '2026-08-06',
  },
]

/** Construit l'état initial de l'application à partir des données de démo. */
export function buildSeedState(): AppState {
  const restaurants: Restaurant[] = []
  const categories: Category[] = []
  const dishes: Dish[] = []
  const menus: FixedMenu[] = []
  const owners: Owner[] = []

  SEED.forEach((s, ri) => {
    const rid = `r${ri + 1}`
    const oid = `o${ri + 1}`

    owners.push({ id: oid, name: s.owner.name, email: s.owner.email, password: 'eatnow', restaurantId: rid })

    restaurants.push({
      id: rid, slug: slugify(s.name), ownerId: oid, name: s.name,
      description: field(s.desc), cuisines: s.cuisines, priceRange: s.priceRange,
      address: s.address, postalCode: s.postalCode, city: s.city, lat: s.lat, lng: s.lng,
      phone: s.phone, website: s.website, emoji: s.emoji, hue: s.hue,
      rating: s.rating, reviews: s.reviews, hours: s.hours, sourceLang: 'fr',
      photo: s.art ? demoArt(s.art[0], s.art[1]) : undefined,
      purchasedLangs: s.purchased, published: s.published, plan: s.plan, createdAt: s.createdAt,
    })

    const catId = new Map<string, string>()
    s.categories.forEach((c, ci) => {
      const id = `${rid}c${ci + 1}`
      catId.set(c, id)
      categories.push({ id, restaurantId: rid, name: field(c), order: ci })
    })

    const dishId = new Map<string, string>()
    s.dishes.forEach((d, di) => {
      const [name, desc, price, cat, allergens, tags, opts] = d
      const id = `${rid}d${di + 1}`
      dishId.set(name, id)
      const groups: DishOptionGroup[] = (opts?.groups ?? []).map(([gName, required, multiple, choices], gi) => ({
        id: `${id}g${gi + 1}`,
        name: field(gName),
        required,
        multiple,
        choices: choices.map(([label, priceDelta], ci) => ({
          id: `${id}g${gi + 1}c${ci + 1}`,
          label: field(label),
          priceDelta,
        })),
      }))
      dishes.push({
        id, restaurantId: rid, categoryId: catId.get(cat)!,
        name: field(name), description: field(desc), price,
        promoPrice: opts?.promo, allergens, tags,
        available: !opts?.off, dishOfDay: !!opts?.jour, order: di,
        photo: opts?.art ? demoArt(opts.art[0], opts.art[1]) : undefined,
        options: groups,
      })
    })

    s.menus.forEach((m, mi) => {
      menus.push({
        id: `${rid}m${mi + 1}`, restaurantId: rid, name: field(m.name),
        description: field(m.desc), price: m.price,
        dishIds: m.picks.map((p) => dishId.get(p)!).filter(Boolean), order: mi,
      })
    })
  })

  return { restaurants, categories, dishes, menus, owners, purchases: [] }
}

/**
 * Mots de passe des comptes de démonstration.
 *
 * Ils ne servent qu'au chargement initial de la base par le serveur
 * (`npm run export:seed` puis `npm run seed`). L'application, elle, ne connaît
 * aucun mot de passe : l'authentification est vérifiée côté serveur, contre
 * des empreintes scrypt.
 */
export const DEMO_OWNER_PASSWORD = 'eatnow'
