import type { Lang } from '../types'

/**
 * Textes de l'interface publique.
 *
 * MVP : l'interface est traduite en fr / en / es / it / de ; les autres langues
 * retombent sur l'anglais. Le contenu des cartes, lui, est traduit dans les
 * 13 langues gérées par le moteur de traduction (c'est le cœur du produit).
 */
type Row = { fr: string; en: string; es?: string; it?: string; de?: string; hy?: string }

const DICT = {
  'nav.discover': { fr: 'Découvrir', en: 'Discover', es: 'Descubrir', it: 'Scopri', de: 'Entdecken', hy: 'Բացահայտել' },
  'nav.pro': { fr: 'Espace restaurateur', en: 'Restaurant login', es: 'Área restaurante', it: 'Area ristoratore', de: 'Gastro-Login', hy: 'Ռեստորատորի տարածք' },
  'nav.admin': { fr: 'Administration', en: 'Admin', es: 'Administración', it: 'Amministrazione', de: 'Verwaltung', hy: 'Կառավարում' },
  'nav.logout': { fr: 'Se déconnecter', en: 'Log out', es: 'Cerrar sesión', it: 'Esci', de: 'Abmelden', hy: 'Դուրս գալ' },
  'nav.back': { fr: 'Retour', en: 'Back', es: 'Volver', it: 'Indietro', de: 'Zurück', hy: 'Հետ' },

  'home.tagline': { fr: 'La carte des restaurants, dans votre langue', en: 'Every menu around you, in your language', es: 'La carta de los restaurantes, en tu idioma', it: 'Il menu dei ristoranti, nella tua lingua', de: 'Die Speisekarte in deiner Sprache', hy: 'Ռեստորանների ճաշացանկը՝ ձեր լեզվով' },
  'home.sub': { fr: 'Trouvez un restaurant autour de vous et lisez sa carte — plats, prix et allergènes — traduite instantanément.', en: 'Find a restaurant near you and read its menu — dishes, prices and allergens — instantly translated.', es: 'Encuentra un restaurante cerca y lee su carta — platos, precios y alérgenos — traducida al instante.', it: 'Trova un ristorante vicino a te e leggi il menu — piatti, prezzi e allergeni — tradotto all’istante.', de: 'Finde ein Restaurant in deiner Nähe und lies die Karte — Gerichte, Preise, Allergene — sofort übersetzt.', hy: 'Գտեք ռեստորան ձեր մոտակայքում և կարդացեք նրա ճաշացանկը՝ ուտեստներ, գներ և ալերգեններ, թարգմանված ակնթարթորեն։' },
  'home.search': { fr: 'Nom, cuisine, quartier…', en: 'Name, cuisine, area…', es: 'Nombre, cocina, barrio…', it: 'Nome, cucina, zona…', de: 'Name, Küche, Viertel…', hy: 'Անուն, խոհանոց, թաղամաս…' },
  'home.locate': { fr: 'Autour de moi', en: 'Near me', es: 'Cerca de mí', it: 'Vicino a me', de: 'In meiner Nähe', hy: 'Իմ մոտակայքում' },
  'home.locating': { fr: 'Localisation…', en: 'Locating…', es: 'Localizando…', it: 'Localizzazione…', de: 'Ortung…', hy: 'Տեղորոշում…' },
  'home.filters': { fr: 'Filtres', en: 'Filters', es: 'Filtros', it: 'Filtri', de: 'Filter', hy: 'Զտիչներ' },
  'home.cuisine': { fr: 'Type de cuisine', en: 'Cuisine', es: 'Tipo de cocina', it: 'Tipo di cucina', de: 'Küche', hy: 'Խոհանոցի տեսակ' },
  'home.price': { fr: 'Tranche de prix', en: 'Price range', es: 'Rango de precio', it: 'Fascia di prezzo', de: 'Preisklasse', hy: 'Գնային միջակայք' },
  'home.radius': { fr: 'Distance max.', en: 'Max distance', es: 'Distancia máx.', it: 'Distanza max', de: 'Max. Entfernung', hy: 'Առավելագույն հեռավորություն' },
  'home.translatedOnly': { fr: 'Menu traduit (inscrit à Eatnow)', en: 'Translated menu (Eatnow member)', es: 'Carta traducida (miembro Eatnow)', it: 'Menu tradotto (iscritto Eatnow)', de: 'Übersetzte Karte (Eatnow-Mitglied)', hy: 'Թարգմանված ճաշացանկ (գրանցված է Eatnow-ում)' },
  'home.results': { fr: 'restaurants trouvés', en: 'restaurants found', es: 'restaurantes encontrados', it: 'ristoranti trovati', de: 'Restaurants gefunden', hy: 'ռեստորան գտնվեց' },
  'home.none': { fr: 'Aucun restaurant ne correspond à ces critères.', en: 'No restaurant matches these filters.', es: 'Ningún restaurante coincide.', it: 'Nessun ristorante corrisponde.', de: 'Kein Restaurant passt zu diesen Filtern.', hy: 'Այս զտիչներին համապատասխանող ռեստորան չկա։' },
  'home.reset': { fr: 'Réinitialiser', en: 'Reset', es: 'Restablecer', it: 'Azzera', de: 'Zurücksetzen', hy: 'Զրոյացնել' },
  'home.sort': { fr: 'Trier par', en: 'Sort by', es: 'Ordenar por', it: 'Ordina per', de: 'Sortieren nach', hy: 'Դասավորել ըստ' },
  'home.sort.distance': { fr: 'Distance', en: 'Distance', es: 'Distancia', it: 'Distanza', de: 'Entfernung', hy: 'Հեռավորության' },
  'home.sort.rating': { fr: 'Note', en: 'Rating', es: 'Valoración', it: 'Valutazione', de: 'Bewertung', hy: 'Գնահատականի' },
  'home.sort.price': { fr: 'Prix', en: 'Price', es: 'Precio', it: 'Prezzo', de: 'Preis', hy: 'Գնի' },
  'home.position': { fr: 'Position', en: 'Location', es: 'Ubicación', it: 'Posizione', de: 'Standort', hy: 'Դիրք' },

  'card.translated': { fr: 'Carte traduite', en: 'Translated menu', es: 'Carta traducida', it: 'Menu tradotto', de: 'Übersetzte Karte', hy: 'Թարգմանված ճաշացանկ' },
  'card.reviews': { fr: 'avis', en: 'reviews', es: 'reseñas', it: 'recensioni', de: 'Bewertungen', hy: 'կարծիք' },
  'card.see': { fr: 'Voir la carte', en: 'View menu', es: 'Ver la carta', it: 'Vedi il menu', de: 'Karte ansehen', hy: 'Տեսնել ճաշացանկը' },

  'resto.menu': { fr: 'La carte', en: 'Menu', es: 'La carta', it: 'Il menu', de: 'Die Karte', hy: 'Ճաշացանկ' },
  'resto.formulas': { fr: 'Formules & menus', en: 'Set menus', es: 'Menús', it: 'Menu fissi', de: 'Menüs', hy: 'Կոմպլեկտ ճաշացանկեր' },
  'resto.dishOfDay': { fr: 'Plat du jour', en: 'Dish of the day', es: 'Plato del día', it: 'Piatto del giorno', de: 'Tagesgericht', hy: 'Օրվա ուտեստ' },
  'resto.promo': { fr: 'Promo', en: 'Deal', es: 'Oferta', it: 'Promo', de: 'Angebot', hy: 'Զեղչ' },
  'resto.allergens': { fr: 'Allergènes', en: 'Allergens', es: 'Alérgenos', it: 'Allergeni', de: 'Allergene', hy: 'Ալերգեններ' },
  'resto.noAllergen': { fr: 'Aucun allergène déclaré', en: 'No declared allergen', es: 'Sin alérgenos declarados', it: 'Nessun allergene dichiarato', de: 'Keine Allergene angegeben', hy: 'Հայտարարված ալերգեն չկա' },
  'resto.unavailable': { fr: 'Indisponible', en: 'Unavailable', es: 'No disponible', it: 'Non disponibile', de: 'Nicht verfügbar', hy: 'Հասանելի չէ' },
  'resto.readIn': { fr: 'Lire la carte en', en: 'Read the menu in', es: 'Leer la carta en', it: 'Leggi il menu in', de: 'Karte lesen auf', hy: 'Կարդալ ճաշացանկը' },
  'resto.notTranslated': { fr: 'Ce restaurant n’a pas encore publié sa carte sur Eatnow.', en: 'This restaurant has not published its menu on Eatnow yet.', es: 'Este restaurante aún no ha publicado su carta en Eatnow.', it: 'Questo ristorante non ha ancora pubblicato il menu su Eatnow.', de: 'Dieses Restaurant hat seine Karte noch nicht veröffentlicht.', hy: 'Այս ռեստորանը դեռ չի հրապարակել իր ճաշացանկը Eatnow-ում։' },
  'resto.langNotBought': { fr: 'Cette langue n’est pas encore proposée par le restaurant — texte affiché en', en: 'This language is not offered by the restaurant yet — showing', es: 'Este idioma aún no está disponible — se muestra en', it: 'Questa lingua non è ancora disponibile — testo in', de: 'Diese Sprache ist noch nicht verfügbar — angezeigt auf', hy: 'Այս լեզուն դեռ առաջարկվում չէ ռեստորանի կողմից — ցուցադրվում է' },
  'resto.machine': { fr: 'Traduction automatique vérifiée par le restaurateur.', en: 'Machine translation reviewed by the restaurant.', es: 'Traducción automática revisada por el restaurante.', it: 'Traduzione automatica verificata dal ristorante.', de: 'Maschinelle Übersetzung, vom Restaurant geprüft.', hy: 'Ավտոմատ թարգմանություն, ստուգված ռեստորանի կողմից։' },
  'resto.call': { fr: 'Appeler', en: 'Call', es: 'Llamar', it: 'Chiama', de: 'Anrufen', hy: 'Զանգահարել' },
  'resto.route': { fr: 'Itinéraire', en: 'Directions', es: 'Cómo llegar', it: 'Indicazioni', de: 'Route', hy: 'Ուղղություններ' },


  'resto.tapHint': { fr: 'Touchez un plat pour voir le texte original', en: 'Tap a dish to see the original text', es: 'Toca un plato para ver el texto original', it: 'Tocca un piatto per vedere il testo originale', de: 'Tippe auf ein Gericht für den Originaltext', hy: 'Հպեք ուտեստին՝ բնագիր տեքստը տեսնելու համար' },
  'resto.original': { fr: 'Texte original', en: 'Original text', es: 'Texto original', it: 'Testo originale', de: 'Originaltext', hy: 'Բնագիր տեքստ' },

  'opt.required': { fr: 'obligatoire', en: 'required', es: 'obligatorio', it: 'obbligatorio', de: 'erforderlich', hy: 'պարտադիր' },
  'opt.optional': { fr: 'facultatif', en: 'optional', es: 'opcional', it: 'facoltativo', de: 'optional', hy: 'ըստ ցանկության' },
  'opt.multiple': { fr: 'choix multiple', en: 'multiple choice', es: 'opción múltiple', it: 'scelta multipla', de: 'Mehrfachauswahl', hy: 'բազմակի ընտրություն' },
  'opt.chooseFirst': { fr: 'Choisissez d’abord', en: 'Please choose first', es: 'Elige primero', it: 'Scegli prima', de: 'Bitte zuerst wählen', hy: 'Նախ ընտրեք' },

  'sel.add': { fr: 'Ajouter à ma sélection', en: 'Add to my selection', es: 'Añadir a mi selección', it: 'Aggiungi alla selezione', de: 'Zur Auswahl hinzufügen', hy: 'Ավելացնել իմ ընտրությանը' },
  'sel.added': { fr: 'Ajouté à votre sélection', en: 'Added to your selection', es: 'Añadido a tu selección', it: 'Aggiunto alla selezione', de: 'Zur Auswahl hinzugefügt', hy: 'Ավելացվեց ձեր ընտրությանը' },
  'sel.title': { fr: 'Ma sélection', en: 'My selection', es: 'Mi selección', it: 'La mia selezione', de: 'Meine Auswahl', hy: 'Իմ ընտրությունը' },
  'sel.view': { fr: 'Voir ma sélection', en: 'View my selection', es: 'Ver mi selección', it: 'Vedi la selezione', de: 'Auswahl ansehen', hy: 'Տեսնել իմ ընտրությունը' },
  'sel.empty': { fr: 'Votre sélection est vide. Touchez le + à côté d’un plat.', en: 'Your selection is empty. Tap the + next to a dish.', es: 'Tu selección está vacía. Toca el + junto a un plato.', it: 'La selezione è vuota. Tocca il + accanto a un piatto.', de: 'Deine Auswahl ist leer. Tippe auf das + neben einem Gericht.', hy: 'Ձեր ընտրությունը դատարկ է։ Հպեք ուտեստի կողքի + նշանին։' },
  'sel.total': { fr: 'Total', en: 'Total', es: 'Total', it: 'Totale', de: 'Gesamt', hy: 'Ընդամենը' },
  'sel.validate': { fr: 'Valider ma sélection', en: 'Confirm my selection', es: 'Confirmar mi selección', it: 'Conferma la selezione', de: 'Auswahl bestätigen', hy: 'Հաստատել իմ ընտրությունը' },
  'sel.clear': { fr: 'Tout retirer', en: 'Clear all', es: 'Vaciar', it: 'Svuota', de: 'Alles entfernen', hy: 'Մաքրել ամբողջը' },
  'sel.items': { fr: 'articles', en: 'items', es: 'artículos', it: 'articoli', de: 'Artikel', hy: 'ուտեստ' },

  'order.title': { fr: 'Ma commande', en: 'My order', es: 'Mi pedido', it: 'Il mio ordine', de: 'Meine Bestellung', hy: 'Իմ պատվերը' },
  'order.show': { fr: 'Montrez cet écran au serveur', en: 'Show this screen to your waiter', es: 'Muestra esta pantalla al camarero', it: 'Mostra questo schermo al cameriere', de: 'Zeige diesen Bildschirm dem Kellner', hy: 'Ցույց տվեք այս էկրանը մատուցողին' },
  'order.yours': { fr: 'Votre langue', en: 'Your language', es: 'Tu idioma', it: 'La tua lingua', de: 'Deine Sprache', hy: 'Ձեր լեզուն' },
  'order.staff': { fr: 'Pour le restaurant', en: 'For the restaurant', es: 'Para el restaurante', it: 'Per il ristorante', de: 'Für das Restaurant', hy: 'Ռեստորանի համար' },
  'order.back': { fr: 'Modifier ma sélection', en: 'Edit my selection', es: 'Editar mi selección', it: 'Modifica la selezione', de: 'Auswahl bearbeiten', hy: 'Փոփոխել իմ ընտրությունը' },
  'order.note': { fr: 'Sélection indicative — la commande reste passée auprès du serveur.', en: 'Indicative selection — the order is still placed with your waiter.', es: 'Selección indicativa — el pedido se realiza con el camarero.', it: 'Selezione indicativa — l’ordine si effettua con il cameriere.', de: 'Unverbindliche Auswahl — bestellt wird beim Kellner.', hy: 'Ընտրությունը տեղեկատվական է — պատվերը կատարվում է մատուցողի միջոցով։' },

  'offline.title': { fr: 'Vous êtes hors connexion', en: 'You are offline', es: 'Estás sin conexión', it: 'Sei offline', de: 'Sie sind offline', hy: 'Դուք օֆլայն եք' },
  'offline.menu': { fr: 'La carte reste consultable : elle est enregistrée sur votre appareil.', en: 'The menu stays available — it is saved on your device.', es: 'La carta sigue disponible: está guardada en tu dispositivo.', it: 'Il menu resta consultabile: è salvato sul tuo dispositivo.', de: 'Die Karte bleibt verfügbar — sie ist auf Ihrem Gerät gespeichert.', hy: 'Ճաշացանկը մնում է հասանելի՝ պահված ձեր սարքում։' },
  'offline.ready': { fr: 'Disponible hors connexion', en: 'Available offline', es: 'Disponible sin conexión', it: 'Disponibile offline', de: 'Offline verfügbar', hy: 'Հասանելի է առանց ինտերնետի' },

  'lang.pick': { fr: 'Langue', en: 'Language', es: 'Idioma', it: 'Lingua', de: 'Sprache', hy: 'Լեզու' },
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
