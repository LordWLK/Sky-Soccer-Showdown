// Localisation FR / EN. Les CLÉS sont les textes français (langue source du
// jeu) : t('BUT ⚽ !') rend la traduction en anglais, ou la clé telle quelle
// en français — une entrée manquante retombe donc sans casse sur le français.
// Les gabarits utilisent {x} : t('Manche {n} / {max}', { n: 2, max: 5 }).

let lang = 'fr';

const EN = {
  // --- écran titre
  'Trois nations, un toit, un but de l\'autre côté du vide. Le plus précis reste debout.':
    'Three nations, one rooftop, a goal across the void. The sharpest shooter stays standing.',
  'Choisissez votre équipe': 'Pick your team',
  'Équipe du joueur 1': 'Player 1 team',
  'Équipe du joueur 2': 'Player 2 team',
  'Choisissez votre défi': 'Pick your challenge',
  'Duel': 'Duel',
  '8 manches contre 2 rivaux — le plus précis reste debout': '8 rounds against 2 rivals — the sharpest stays standing',
  'Duel à 2': '2-player duel',
  '2 joueurs sur cet écran + une IA — chacun son tir': '2 players on this screen + an AI — one shot each',
  'Tournoi': 'Tournament',
  'Quart, demie, finale : 3 duels de plus en plus relevés': 'Quarter, semi, final: 3 ever-tougher duels',
  'Parcours 3 trous': '3-hole course',
  'De toit en toit contre 2 rivales — parcours généré': 'Roof to roof against 2 rivals — generated course',
  'Parcours 9 trous': '9-hole course',
  'La grande traversée de la ville, nouvelle à chaque partie': 'The grand city crossing, new every game',
  'Parcours du jour': 'Daily course',
  '3 trous identiques pour tous, un nouveau défi chaque jour': 'Same 3 holes for everyone, a new challenge every day',
  'Défis': 'Trick shots',
  '20 tirs d\'exception à réussir en trois étoiles': '20 exceptional shots to master for three stars',
  'Normal': 'Normal',
  'Difficile': 'Hard',
  'JOUER': 'PLAY',
  'Glissez pour viser, relâchez pour tirer. Un tir raté brise une planche — trois planches brisées et c\'est la chute !':
    'Drag to aim, release to shoot. A missed shot breaks a plank — three broken planks and down you go!',

  // --- tutoriel
  'COMMENT JOUER': 'HOW TO PLAY',
  'Glissez vers le bas comme une fronde pour doser la puissance, sur les côtés pour orienter le tir, relâchez pour tirer. Un geste en arc de cercle brosse le ballon. Le repère ⚽ de la jauge indique la puissance parfaite pour la cage.':
    'Drag down like a slingshot to set the power, sideways to steer, release to shoot. A curved swipe puts spin on the ball. The ⚽ mark on the gauge shows the perfect power for the goal.',
  'Le vent pousse le ballon en plein vol : visez à côté pour compenser.': 'Wind pushes the ball mid-flight: aim off-center to compensate.',
  'En Duel, un tir raté brise une planche — trois planches et c\'est la chute. Au Parcours, un ballon dans le vide coûte +1 coup.':
    'In Duel, a miss breaks a plank — three planks and you fall. On the course, a ball lost to the void costs +1 stroke.',
  'C\'EST PARTI !': 'LET\'S GO!',

  // --- pause & réglages
  'PAUSE': 'PAUSED',
  'RÉGLAGES': 'SETTINGS',
  '🔊 Volume': '🔊 Volume',
  '📳 Vibrations': '📳 Vibration',
  '🎵 Musique': '🎵 Music',
  '🌐 Langue': '🌐 Language',
  '▶ REPRENDRE': '▶ RESUME',
  '✔ FERMER': '✔ CLOSE',
  '🚪 QUITTER': '🚪 QUIT',

  // --- HUD
  'Manche {n} / {max}': 'Round {n} / {max}',
  '⚡ Mort subite': '⚡ Sudden death',
  '💨 vent nul': '💨 no wind',
  'Coups : {n} · but à {d} m': 'Strokes: {n} · goal {d} m away',
  'Glissez vers le bas pour viser, relâchez pour tirer': 'Drag down to aim, release to shoot',
  'Enchaînez les toits jusqu\'au but — le vide coûte +1 coup': 'Hop the rooftops to the goal — the void costs +1 stroke',
  'Tendu': 'Driven',
  'Cloche': 'Lofted',
  'Objectif : LUCARNE': 'Goal: TOP CORNER',
  'Objectif : marquer': 'Goal: score',
  '· Tir {n} / {max}': '· Shot {n} / {max}',
  '🎯 Défi {n} — {name}': '🎯 Trick shot {n} — {name}',
  'Quart': 'Quarter',
  'Demie': 'Semi',
  'Finale': 'Final',

  // --- messages en jeu
  'Manche {n}': 'Round {n}',
  '⚡ Mort subite !': '⚡ Sudden death!',
  'BUT ⚽ !': 'GOAL ⚽!',
  'LUCARNE ! +2 🎯': 'TOP CORNER! +2 🎯',
  'Raté…': 'Missed…',
  'Raté — {n}': 'Missed — {n}',
  'But — {n}': 'Goal — {n}',
  'Lucarne — {n}': 'Top corner — {n}',
  'Arrêt du gardien !': 'Saved by the keeper!',
  'Un gardien monte sur le toit ! 🧤': 'A goalkeeper takes the roof! 🧤',
  'Astuce : glissez en arc de cercle pour brosser le tir 🌀': 'Tip: swipe in an arc to curl your shot 🌀',
  'Le vent se lève… compensez !': 'The wind is picking up… compensate!',
  'Vos planches cèdent !': 'Your planks give way!',
  '{n} tombe !': '{n} falls!',
  'À toi, {n} !': 'Your turn, {n}!',
  '⚠️ Obstacles entre les toits !': '⚠️ Obstacles between the rooftops!',
  'Câble ! ⚡': 'Cable! ⚡',
  'Drone percuté ! 🚁': 'Drone hit! 🚁',
  'La grue ! 🏗️': 'The crane! 🏗️',
  'Bâche élastique ! 🤸': 'Bouncy tarp! 🤸',
  'Courant ascendant ! 🌬️': 'Updraft! 🌬️',
  'Héliport ! −1 coup 🚁': 'Helipad! −1 stroke 🚁',
  'Dans le vide ! +1 coup': 'Into the void! +1 stroke',
  'Limite de coups atteinte…': 'Stroke limit reached…',
  'TROU EN UN ! 🎯': 'HOLE IN ONE! 🎯',
  'EAGLE 🦅': 'EAGLE 🦅',
  'BIRDIE 🐦': 'BIRDIE 🐦',
  'PAR ✔': 'PAR ✔',
  'Bogey': 'Bogey',
  'Double bogey': 'Double bogey',
  '⛳ {name} / {count} — Par {par}': '⛳ {name} / {count} — Par {par}',
  '⛳ {n} termine en {s}': '⛳ {n} holes out in {s}',
  'Trou {n}': 'Hole {n}',
  'Score copié !': 'Score copied!',
  'Tir {n} / {max}': 'Shot {n} / {max}',
  'Objectif : LUCARNE (coins dorés) !': 'Goal: TOP CORNER (golden corners)!',
  '🏆 {stage} — face à {a} et {b}': '🏆 {stage} — facing {a} and {b}',
  'Quart de finale': 'Quarter-final',
  'Demi-finale': 'Semi-final',

  // --- écrans de fin
  '🏆 VICTOIRE !': '🏆 VICTORY!',
  '💥 DÉFAITE…': '💥 DEFEAT…',
  'ÉGALITÉ': 'DRAW',
  'ÉGALITÉ EN TÊTE': 'TIED FOR THE LEAD',
  '💥 LES DEUX JOUEURS SONT TOMBÉS…': '💥 BOTH PLAYERS FELL…',
  '🏆 {n} GAGNE !': '🏆 {n} WINS!',
  '💥 L\'IA ({n}) vous a battus…': '💥 The AI ({n}) beat you…',
  '✅ QUART DE FINALE REMPORTÉ !': '✅ QUARTER-FINAL WON!',
  '✅ DEMI-FINALE REMPORTÉE !': '✅ SEMI-FINAL WON!',
  '🏆 CHAMPION DU TOURNOI !': '🏆 TOURNAMENT CHAMPION!',
  '💥 ÉLIMINATION EN {stage}…': '💥 KNOCKED OUT IN THE {stage}…',
  'DÉFI RÉUSSI !': 'TRICK SHOT DONE!',
  'DÉFI MANQUÉ…': 'TRICK SHOT MISSED…',
  'tombée au champ d\'honneur': 'fell with honors',
  ' (vous)': ' (you)',
  'Prochain match — {stage} : {a} et {b}': 'Next match — {stage}: {a} and {b}',
  '↻ REJOUER': '↻ REPLAY',
  '➜ CONTINUER': '➜ CONTINUE',
  '➜ DÉFI SUIVANT': '➜ NEXT SHOT',
  'PARTAGER': 'SHARE',
  'Total — Par {n}': 'Total — Par {n}',
  'par': 'par',
  '⭐ NOUVEAU RECORD ! ': '⭐ NEW RECORD! ',
  '⭐ RECORD DU DÉFI ! ': '⭐ SHOT RECORD! ',
  'Record : {b} · {v} en {m}': 'Record: {b} · {v} in {m}',
  'but': 'goal',
  'victoire': 'win',
  'match': 'game',
  'Victoire': 'Victory',
  '🏆 Tournois remportés : {w} sur {r}': '🏆 Tournaments won: {w} of {r}',
  'Étoiles totales : {n} / {max}': 'Total stars: {n} / {max}',
  'Parcours du jour ({d})': 'Daily course ({d})',
  'Meilleur parcours 9 trous': 'Best 9-hole course',
  'Meilleur parcours 3 trous': 'Best 3-hole course',
  '{n} coups (par {p})': '{n} strokes (par {p})',
  'au par': 'level par',
  '{n} sous le par': '{n} under par',
  '{n} au-dessus du par': '{n} over par',
  '🔥 Série : {c} jour(s) · record {b} · {p} joué(s) en tout': '🔥 Streak: {c} day(s) · best {b} · {p} played overall',
  // --- partages
  '⚽ Sky Soccer Showdown — {r} : {n} avec {nat} ! {url}': '⚽ Sky Soccer Showdown — {r}: {n} with {nat}! {url}',
  '⛳ Sky Soccer Showdown — Parcours {h} trous bouclé en {n} coups ({d}) avec {nat} ! {url}':
    '⛳ Sky Soccer Showdown — {h}-hole course finished in {n} strokes ({d}) with {nat}! {url}',
  '⛳ Sky Soccer Showdown — Parcours du jour {date}\n{grid} {n} coups ({d}) · Série {s} 🔥\nBattez-moi ! {url}':
    '⛳ Sky Soccer Showdown — Daily course {date}\n{grid} {n} strokes ({d}) · Streak {s} 🔥\nBeat me! {url}',
  '🎯 Sky Soccer Showdown — Défi « {name} » réussi {stars} ! {url}':
    '🎯 Sky Soccer Showdown — Trick shot “{name}” done {stars}! {url}',
  '🎯 Sky Soccer Showdown — le défi « {name} » me résiste… {url}':
    '🎯 Sky Soccer Showdown — trick shot “{name}” still resists me… {url}',
  '🏆 Sky Soccer Showdown — Champion du tournoi avec {nat} ! {url}':
    '🏆 Sky Soccer Showdown — Tournament champion with {nat}! {url}',
  '⚽ Sky Soccer Showdown — Tournoi : élimination en {stage} avec {nat}. {url}':
    '⚽ Sky Soccer Showdown — Tournament: knocked out in the {stage} with {nat}. {url}',
  '⚽ Sky Soccer Showdown — En route vers la {stage} du tournoi avec {nat} ! {url}':
    '⚽ Sky Soccer Showdown — On to the tournament {stage} with {nat}! {url}',
  '⚽ Sky Soccer Showdown — {title} {url}': '⚽ Sky Soccer Showdown — {title} {url}',

  // --- Défis (écran)
  '🎯 DÉFIS': '🎯 TRICK SHOTS',
  'Réussissez chaque tir en un minimum d\'essais : 1er tir = ⭐⭐⭐, 2e = ⭐⭐, 3e = ⭐.':
    'Nail each shot in as few tries as you can: 1st try = ⭐⭐⭐, 2nd = ⭐⭐, 3rd = ⭐.',
  'Échauffement': 'Warm-up',
  'Vent de travers': 'Crosswind',
  'Longue portée': 'Long range',
  'Lucarne !': 'Top corner!',
  'Le gardien': 'The keeper',
  'Câble bas': 'Low cable',
  'Vent du large': 'Sea breeze',
  'Drone de garde': 'Guard drone',
  'Lucarne ventée': 'Windy corner',
  'Gardien éclair': 'Lightning keeper',
  'Double câble': 'Double cable',
  'Nuit noire': 'Dead of night',
  'Lucarne gardée': 'Guarded corner',
  'Duo infernal': 'Infernal duo',
  'Le mur': 'The wall',
  'Grue de chantier': 'Tower crane',
  'Tempête': 'Storm',
  'Nid de drones': 'Drone nest',
  'Lucarne du soir': 'Evening corner',
  'L\'exploit': 'The feat',

  // --- stats & succès
  '🏅 VOTRE PALMARÈS': '🏅 YOUR RECORD',
  'Parcours du jour — 5 dernières semaines': 'Daily course — last 5 weeks',
  'Succès': 'Achievements',
  '⚽ Buts marqués': '⚽ Goals scored',
  '🎯 Lucarnes': '🎯 Top corners',
  '🏅 Duels gagnés': '🏅 Duels won',
  '🏆 Tournois gagnés': '🏆 Tournaments won',
  '🐦 Birdies · 🦅 Eagles': '🐦 Birdies · 🦅 Eagles',
  '🎳 Trous en un': '🎳 Holes in one',
  '🌟 Étoiles des Défis': '🌟 Trick-shot stars',
  '🔥 Série du jour': '🔥 Daily streak',
  '🏅 Succès débloqué : {n} {i}': '🏅 Achievement unlocked: {n} {i}',
  'Premier but': 'First goal',
  'Marquer votre premier but': 'Score your first goal',
  'Serial buteur': 'Serial scorer',
  'Marquer 50 buts': 'Score 50 goals',
  'Marquer en pleine lucarne': 'Score right in the top corner',
  'Artificier': 'Pyrotechnician',
  '10 lucarnes dorées': '10 golden top corners',
  'Première victoire': 'First win',
  'Gagner un Duel': 'Win a Duel',
  'Sans trembler': 'Nerves of steel',
  'Gagner un duel sans perdre une planche': 'Win a duel without losing a plank',
  'Champion': 'Champion',
  'Remporter un Tournoi': 'Win a Tournament',
  'Dynastie': 'Dynasty',
  'Remporter 3 Tournois': 'Win 3 Tournaments',
  'Birdie': 'Birdie',
  'Un trou sous le par': 'A hole under par',
  'Eagle': 'Eagle',
  'Un trou en −2 ou mieux': 'A hole at −2 or better',
  'Trou en un': 'Hole in one',
  'La cage en un seul coup': 'The goal in a single stroke',
  'Sous le par': 'Under par',
  'Boucler un parcours sous le par': 'Finish a course under par',
  'Trois d\'affilée': 'Three in a row',
  'Série de 3 Parcours du jour': 'A 3-day daily streak',
  'Semaine parfaite': 'Perfect week',
  'Série de 7 Parcours du jour': 'A 7-day daily streak',
  'Étoile des Défis': 'Trick-shot star',
  '30 étoiles aux Défis': '30 trick-shot stars',
  'Acrobate': 'Acrobat',
  '5 rebonds de bâche élastique': '5 bouncy-tarp bounces',

  'VOUS': 'YOU',
  // --- nations
  'Allemagne': 'Germany',
  'Italie': 'Italy',
  'Espagne': 'Spain',
  'France': 'France',
  'Brésil': 'Brazil',
  'Angleterre': 'England',
  'Argentine': 'Argentina',
  'Portugal': 'Portugal',
};

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'fr';
  document.documentElement.lang = lang;
}

export function getLang() { return lang; }

export function t(key, vars) {
  let s = lang === 'en' ? (EN[key] || key) : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}

// « Trou 3 » → « Hole 3 » : le numéro est extrait du nom généré en français
export function tHole(frName) {
  const m = String(frName).match(/(\d+)/);
  return m ? t('Trou {n}', { n: m[1] }) : t(String(frName));
}

// Textes statiques : les éléments marqués data-i18n sont (re)traduits depuis
// leur contenu français d'origine, mémorisé (clé normalisée + HTML brut) au
// premier passage — revenir au français restitue l'original à l'identique.
export function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (!el.dataset.i18nSrc) {
      el.dataset.i18nSrc = el.textContent.trim().replace(/\s+/g, ' ');
      el.dataset.i18nRaw = el.innerHTML;
    }
    if (lang === 'fr') {
      // texte d'origine si mémorisé, sinon la clé française elle-même
      if (el.dataset.i18nRaw != null) el.innerHTML = el.dataset.i18nRaw;
      else el.textContent = el.dataset.i18nSrc;
    } else {
      el.textContent = t(el.dataset.i18nSrc);
    }
  });
}
