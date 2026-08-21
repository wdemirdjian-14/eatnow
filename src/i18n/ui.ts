import type { Lang } from '../types'

/**
 * Textes de l'interface publique.
 *
 * MVP : l'interface est traduite en fr / en / es / it / de ; les autres langues
 * retombent sur l'anglais. Le contenu des cartes, lui, est traduit dans les
 * 13 langues gérées par le moteur de traduction (c'est le cœur du produit).
 */
type Row = { fr: string; en: string; es?: string; it?: string; de?: string }

const DICT = {
  'nav.discover': { fr: 'Découvrir', en: 'Discover', es: 'Descubrir', it: 'Scopri', de: 'Entdecken' },
  'nav.pro': { fr: 'Espace restaurateur', en: 'Restaurant login', es: 'Área restaurante', it: 'Area ristoratore', de: 'Gastro-Login' },
  'nav.admin': { fr: 'Administration', en: 'Admin', es: 'Administración', it: 'Amministrazione', de: 'Verwaltung' },
  'nav.logout': { fr: 'Se déconnecter', en: 'Log out', es: 'Cerrar sesión', it: 'Esci', de: 'Abmelden' },
  'nav.back': { fr: 'Retour', en: 'Back', es: 'Volver', it: 'Indietro', de: 'Zurück' },

  'home.tagline': { fr: 'La carte des restaurants, dans votre langue', en: 'Every menu around you, in your language', es: 'La carta de los restaurantes, en tu idioma', it: 'Il menu dei ristoranti, nella tua lingua', de: 'Die Speisekarte in deiner Sprache' },
  'home.sub': { fr: 'Trouvez un restaurant autour de vous et lisez sa carte — plats, prix et allergènes — traduite instantanément.', en: 'Find a restaurant near you and read its menu — dishes, prices and allergens — instantly translated.', es: 'Encuentra un restaurante cerca y lee su carta — platos, precios y alérgenos — traducida al instante.', it: 'Trova un ristorante vicino a te e leggi il menu — piatti, prezzi e allergeni — tradotto all’istante.', de: 'Finde ein Restaurant in deiner Nähe und lies die Karte — Gerichte, Preise, Allergene — sofort übersetzt.' },
  'home.search': { fr: 'Nom, cuisine, quartier…', en: 'Name, cuisine, area…', es: 'Nombre, cocina, barrio…', it: 'Nome, cucina, zona…', de: 'Name, Küche, Viertel…' },
  'home.locate': { fr: 'Autour de moi', en: 'Near me', es: 'Cerca de mí', it: 'Vicino a me', de: 'In meiner Nähe' },
  'home.locating': { fr: 'Localisation…', en: 'Locating…', es: 'Localizando…', it: 'Localizzazione…', de: 'Ortung…' },
  'home.filters': { fr: 'Filtres', en: 'Filters', es: 'Filtros', it: 'Filtri', de: 'Filter' },
  'home.cuisine': { fr: 'Type de cuisine', en: 'Cuisine', es: 'Tipo de cocina', it: 'Tipo di cucina', de: 'Küche' },
  'home.price': { fr: 'Tranche de prix', en: 'Price range', es: 'Rango de precio', it: 'Fascia di prezzo', de: 'Preisklasse' },
  'home.radius': { fr: 'Distance max.', en: 'Max distance', es: 'Distancia máx.', it: 'Distanza max', de: 'Max. Entfernung' },
  'home.translatedOnly': { fr: 'Menu traduit (inscrit à Eatnow)', en: 'Translated menu (Eatnow member)', es: 'Carta traducida (miembro Eatnow)', it: 'Menu tradotto (iscritto Eatnow)', de: 'Übersetzte Karte (Eatnow-Mitglied)' },
  'home.results': { fr: 'restaurants trouvés', en: 'restaurants found', es: 'restaurantes encontrados', it: 'ristoranti trovati', de: 'Restaurants gefunden' },
  'home.none': { fr: 'Aucun restaurant ne correspond à ces critères.', en: 'No restaurant matches these filters.', es: 'Ningún restaurante coincide.', it: 'Nessun ristorante corrisponde.', de: 'Kein Restaurant passt zu diesen Filtern.' },
  'home.reset': { fr: 'Réinitialiser', en: 'Reset', es: 'Restablecer', it: 'Azzera', de: 'Zurücksetzen' },
  'home.sort': { fr: 'Trier par', en: 'Sort by', es: 'Ordenar por', it: 'Ordina per', de: 'Sortieren nach' },
  'home.sort.distance': { fr: 'Distance', en: 'Distance', es: 'Distancia', it: 'Distanza', de: 'Entfernung' },
  'home.sort.rating': { fr: 'Note', en: 'Rating', es: 'Valoración', it: 'Valutazione', de: 'Bewertung' },
  'home.sort.price': { fr: 'Prix', en: 'Price', es: 'Precio', it: 'Prezzo', de: 'Preis' },
  'home.position': { fr: 'Position', en: 'Location', es: 'Ubicación', it: 'Posizione', de: 'Standort' },

  'card.translated': { fr: 'Carte traduite', en: 'Translated menu', es: 'Carta traducida', it: 'Menu tradotto', de: 'Übersetzte Karte' },
  'card.reviews': { fr: 'avis', en: 'reviews', es: 'reseñas', it: 'recensioni', de: 'Bewertungen' },
  'card.see': { fr: 'Voir la carte', en: 'View menu', es: 'Ver la carta', it: 'Vedi il menu', de: 'Karte ansehen' },

  'resto.menu': { fr: 'La carte', en: 'Menu', es: 'La carta', it: 'Il menu', de: 'Die Karte' },
  'resto.formulas': { fr: 'Formules & menus', en: 'Set menus', es: 'Menús', it: 'Menu fissi', de: 'Menüs' },
  'resto.dishOfDay': { fr: 'Plat du jour', en: 'Dish of the day', es: 'Plato del día', it: 'Piatto del giorno', de: 'Tagesgericht' },
  'resto.promo': { fr: 'Promo', en: 'Deal', es: 'Oferta', it: 'Promo', de: 'Angebot' },
  'resto.allergens': { fr: 'Allergènes', en: 'Allergens', es: 'Alérgenos', it: 'Allergeni', de: 'Allergene' },
  'resto.noAllergen': { fr: 'Aucun allergène déclaré', en: 'No declared allergen', es: 'Sin alérgenos declarados', it: 'Nessun allergene dichiarato', de: 'Keine Allergene angegeben' },
  'resto.unavailable': { fr: 'Indisponible', en: 'Unavailable', es: 'No disponible', it: 'Non disponibile', de: 'Nicht verfügbar' },
  'resto.readIn': { fr: 'Lire la carte en', en: 'Read the menu in', es: 'Leer la carta en', it: 'Leggi il menu in', de: 'Karte lesen auf' },
  'resto.notTranslated': { fr: 'Ce restaurant n’a pas encore publié sa carte sur Eatnow.', en: 'This restaurant has not published its menu on Eatnow yet.', es: 'Este restaurante aún no ha publicado su carta en Eatnow.', it: 'Questo ristorante non ha ancora pubblicato il menu su Eatnow.', de: 'Dieses Restaurant hat seine Karte noch nicht veröffentlicht.' },
  'resto.langNotBought': { fr: 'Cette langue n’est pas encore proposée par le restaurant — texte affiché en', en: 'This language is not offered by the restaurant yet — showing', es: 'Este idioma aún no está disponible — se muestra en', it: 'Questa lingua non è ancora disponibile — testo in', de: 'Diese Sprache ist noch nicht verfügbar — angezeigt auf' },
  'resto.machine': { fr: 'Traduction automatique vérifiée par le restaurateur.', en: 'Machine translation reviewed by the restaurant.', es: 'Traducción automática revisada por el restaurante.', it: 'Traduzione automatica verificata dal ristorante.', de: 'Maschinelle Übersetzung, vom Restaurant geprüft.' },
  'resto.call': { fr: 'Appeler', en: 'Call', es: 'Llamar', it: 'Chiama', de: 'Anrufen' },
  'resto.route': { fr: 'Itinéraire', en: 'Directions', es: 'Cómo llegar', it: 'Indicazioni', de: 'Route' },


  'resto.tapHint': { fr: 'Touchez un plat pour voir le texte original', en: 'Tap a dish to see the original text', es: 'Toca un plato para ver el texto original', it: 'Tocca un piatto per vedere il testo originale', de: 'Tippe auf ein Gericht für den Originaltext' },
  'resto.original': { fr: 'Texte original', en: 'Original text', es: 'Texto original', it: 'Testo originale', de: 'Originaltext' },

  'opt.required': { fr: 'obligatoire', en: 'required', es: 'obligatorio', it: 'obbligatorio', de: 'erforderlich' },
  'opt.optional': { fr: 'facultatif', en: 'optional', es: 'opcional', it: 'facoltativo', de: 'optional' },
  'opt.multiple': { fr: 'choix multiple', en: 'multiple choice', es: 'opción múltiple', it: 'scelta multipla', de: 'Mehrfachauswahl' },
  'opt.chooseFirst': { fr: 'Choisissez d’abord', en: 'Please choose first', es: 'Elige primero', it: 'Scegli prima', de: 'Bitte zuerst wählen' },

  'sel.add': { fr: 'Ajouter à ma sélection', en: 'Add to my selection', es: 'Añadir a mi selección', it: 'Aggiungi alla selezione', de: 'Zur Auswahl hinzufügen' },
  'sel.added': { fr: 'Ajouté à votre sélection', en: 'Added to your selection', es: 'Añadido a tu selección', it: 'Aggiunto alla selezione', de: 'Zur Auswahl hinzugefügt' },
  'sel.title': { fr: 'Ma sélection', en: 'My selection', es: 'Mi selección', it: 'La mia selezione', de: 'Meine Auswahl' },
  'sel.view': { fr: 'Voir ma sélection', en: 'View my selection', es: 'Ver mi selección', it: 'Vedi la selezione', de: 'Auswahl ansehen' },
  'sel.empty': { fr: 'Votre sélection est vide. Touchez le + à côté d’un plat.', en: 'Your selection is empty. Tap the + next to a dish.', es: 'Tu selección está vacía. Toca el + junto a un plato.', it: 'La selezione è vuota. Tocca il + accanto a un piatto.', de: 'Deine Auswahl ist leer. Tippe auf das + neben einem Gericht.' },
  'sel.total': { fr: 'Total', en: 'Total', es: 'Total', it: 'Totale', de: 'Gesamt' },
  'sel.validate': { fr: 'Valider ma sélection', en: 'Confirm my selection', es: 'Confirmar mi selección', it: 'Conferma la selezione', de: 'Auswahl bestätigen' },
  'sel.clear': { fr: 'Tout retirer', en: 'Clear all', es: 'Vaciar', it: 'Svuota', de: 'Alles entfernen' },
  'sel.items': { fr: 'articles', en: 'items', es: 'artículos', it: 'articoli', de: 'Artikel' },

  'order.title': { fr: 'Ma commande', en: 'My order', es: 'Mi pedido', it: 'Il mio ordine', de: 'Meine Bestellung' },
  'order.show': { fr: 'Montrez cet écran au serveur', en: 'Show this screen to your waiter', es: 'Muestra esta pantalla al camarero', it: 'Mostra questo schermo al cameriere', de: 'Zeige diesen Bildschirm dem Kellner' },
  'order.yours': { fr: 'Votre langue', en: 'Your language', es: 'Tu idioma', it: 'La tua lingua', de: 'Deine Sprache' },
  'order.staff': { fr: 'Pour le restaurant', en: 'For the restaurant', es: 'Para el restaurante', it: 'Per il ristorante', de: 'Für das Restaurant' },
  'order.back': { fr: 'Modifier ma sélection', en: 'Edit my selection', es: 'Editar mi selección', it: 'Modifica la selezione', de: 'Auswahl bearbeiten' },
  'order.note': { fr: 'Sélection indicative — la commande reste passée auprès du serveur.', en: 'Indicative selection — the order is still placed with your waiter.', es: 'Selección indicativa — el pedido se realiza con el camarero.', it: 'Selezione indicativa — l’ordine si effettua con il cameriere.', de: 'Unverbindliche Auswahl — bestellt wird beim Kellner.' },

  'lang.pick': { fr: 'Langue', en: 'Language', es: 'Idioma', it: 'Lingua', de: 'Sprache' },
} satisfies Record<string, Row>

export type UIKey = keyof typeof DICT

export function t(key: UIKey, lang: Lang): string {
  const row = DICT[key] as Row
  return (row as Record<string, string | undefined>)[lang] ?? row.en
}

/** Fabrique un traducteur lié à une langue. */
export function useT(lang: Lang) {
  return (key: UIKey) => t(key, lang)
}
