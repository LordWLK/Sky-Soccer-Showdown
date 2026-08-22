# Sky Soccer Showdown — Document de game design

> Duel de frappes de précision au sommet des gratte-ciel.
> Concept inspiré d'une publicité jouable de *Top Eleven* (voir « Référence visuelle » en fin de document).

## 1. Vision

- **Genre** : arcade / adresse (hyper-casual), matchs courts de 2 à 4 minutes.
- **Plateforme cible** : navigateur web (souris **et** tactile), sans installation.
- **Sensation recherchée** : le vertige du tir au-dessus du vide + la satisfaction
  de la trajectoire parfaite qui finit en pleine lucarne.
- **Une phrase** : *« Trois nations, un toit, un but de l'autre côté du vide :
  le plus précis reste debout. »*

## 2. Boucle de jeu

```
Choisir sa nation → Viser (glisser) → Tirer (relâcher)
     ↑                                        ↓
Manche suivante  ←  Résolution (buts, planches cassées, éliminations)
(le but s'éloigne, le vent se lève)
```

Une partie = une succession de **manches**. À chaque manche, les trois tireurs
(vous + deux IA) frappent leur ballon vers la cage posée sur le toit d'en face.

**Huit nations jouables** (le trio de la pub — Allemagne, Italie, Espagne —
plus France, Brésil, Angleterre, Argentine et Portugal, chacune avec drapeau,
maillot, coiffure et couleur de comète). Vous êtes toujours **au centre du
trio**, caméra exactement derrière vous ; vos deux adversaires sont **tirés au
sort** parmi les autres nations à chaque partie.

- **But marqué** : +1 point.
- **Tir raté** (dans le vide, sur la façade, à côté de la cage) : une planche de
  votre plateforme se brise.
- **3 planches brisées** : la plateforme cède, le tireur bascule dans le vide —
  **éliminé**.

### Fin de partie

- Vous êtes éliminé → **défaite** (le score final des IA est affiché).
- Les deux IA sont éliminées → **victoire immédiate**.
- Au bout de **8 manches** : le meilleur score gagne. En cas d'égalité en tête,
  **mort subite** : manches supplémentaires jusqu'à ce qu'un tireur se détache.

## 3. Contrôles

| Action | Souris | Tactile |
|---|---|---|
| Viser | cliquer-glisser (fronde : tirer vers le bas/l'arrière) | glisser le doigt |
| Régler la puissance | longueur du glisser | idem |
| Ajuster à gauche/droite | glisser latéralement (sens fronde, inversé) | idem |
| Tirer | relâcher | lever le doigt |

- Pendant la visée, une **prévisualisation en pointillés** montre la trajectoire
  (sans le vent : compenser le vent, c'est le skill), et une **jauge de
  puissance** s'affiche sur le bord gauche, avec un repère ⚽ marquant la
  puissance exacte du centre de la cage.
- L'élévation du tir est fixe (~40°, frappe tendue) : on ne règle que puissance
  et direction, pour rester lisible sur mobile. Le glisser est **linéaire en
  distance** (la portée croît en v², donc v ∝ √glisser : tirer 2× plus loin =
  glisser 2× plus long). La puissance est **lissée** (filtre les tremblements)
  et une **aide à la visée discrète** rentre les tirs qui frôlent la cage à
  ~30 cm près — le tir balistique est si sensible à la puissance qu'un jeu
  sans aide serait injouable (validé par simulation).

## 4. Systèmes de jeu

### 4.1 Balistique

- Gravité arcade (`g ≈ 18 m/s²`) pour des cloches lisibles et des vols de ~2 s.
- Le ballon laisse une **traînée comète** aux couleurs de la nation
  (Allemagne : or, Italie : cyan, Espagne : rose — comme dans la pub).

### 4.2 La cible

- Une cage (4,4 m × 2,0 m) sur un mini-terrain vert, au sommet de la tour d'en face.
- Détection : le ballon franchit la ligne entre les poteaux, sous la barre → **BUT**.
- Filet qui absorbe le ballon, confettis, gros « BUT ! » à l'écran.
- Toucher le toit adverse sans marquer, la façade, ou tomber dans le vide → raté.

### 4.3 Progression de la difficulté (par manche)

| Manche | Distance du but | Vent |
|---|---|---|
| 1 | proche (~30 m) | aucun |
| 2–3 | moyenne (~34–38 m) | léger |
| 4–5 | lointaine (~42–46 m) | modéré |
| 6–8+ | très lointaine (~50–58 m) | fort, variable |

- Le **vent** est latéral, affiché dans le HUD (direction + force), tiré au sort à
  chaque manche. Il dévie le ballon en vol mais n'apparaît pas dans la prévisualisation.
- La tour cible **s'éloigne** entre les manches (animation de translation).

### 4.4 Les adversaires IA

- Chaque IA **exécute parfaitement** mais **vise un point dispersé** autour de la
  bouche de la cage (dispersion gaussienne en mètres) : c'est le seul modèle qui
  permette de régler son taux de réussite indépendamment de la distance
  (une erreur sur la *puissance* donnerait des mètres d'écart, cf. simulation).
- L'IA compense partiellement le vent (elle « lit » 55–95 % de sa force).
- Sa précision **s'améliore au fil des manches** : ~76 % de réussite en manche 1,
  ~95 % en manche 8 — la fin de partie met la pression. Réglages validés par
  simulation numérique (4 000 tirs par manche), durcis après les retours de
  jeu (« trop facile ») : vent dès la manche 2, aide à la visée resserrée
  (~30 cm), IA plus fine.
- Les trois tirs partent quasi simultanément (léger décalage aléatoire), comme
  dans la pub : trois comètes traversent le vide en même temps.

### 4.5 Sanction d'échec — les planches

- Chaque tireur démarre sur une pile de **3 planches** (affichées dans son badge HUD).
- Un raté = une planche qui éclate (débris projetés, secousse).
- Troisième raté = le personnage bascule dans le vide en moulinant des bras
  (chute cartoon, badge grisé). Aucun réalisme, uniquement du comique de situation.

## 4 bis. Mode « Parcours » — le golf urbain

> Deuxième mode de jeu, choisi sur l'écran titre à côté du **Duel**.
> Ici le but est à 100–250 m : hors de portée d'un seul tir (~60 m max).
> Il faut **naviguer de toit en toit**, comme au golf.

### Boucle

1. Le ballon part du toit de départ ; le but est visible au loin.
2. Chaque coup se joue **là où le ballon s'est arrêté** : le tireur se
   repositionne sur le toit avec lui, la caméra se replace derrière le ballon,
   orientée vers le but.
3. Se poser sur un toit intermédiaire = coup suivant depuis ce toit.
   **Ballon dans le vide = +1 coup de pénalité**, on rejoue du même endroit.
4. Ballon au fond de la cage = trou terminé : le score est le **nombre de
   coups**, comparé au **par** du trou (nombre de sauts minimal + le tir au but).

### Structure

- Trois formats : **Parcours 3 trous**, **Parcours 9 trous** (la grande
  traversée) et **Parcours du jour** (3 trous, mêmes pour tout le monde).
- Trous de plus en plus longs et tortueux : décalages latéraux (doglegs),
  toits plus hauts ou plus bas (monter coûte de la portée), toits plus
  petits en fin de parcours ; mélange de pars 3/4/5 qui s'allonge vers la fin.
- **Vent fixé par trou** dès le trou 1 (léger, puis sensible) : c'est l'âme
  du mode. Il est tiré avec la graine du parcours — sur le Parcours du jour,
  tout le monde affronte exactement les mêmes conditions (difficulté imposée
  à Normal pour la même raison).
- Appréciations golf à chaque trou (Eagle / Birdie / Par / Bogey…), carte de
  score cumulée à la fin.
- Les planches et l'élimination sont propres au Duel — au Parcours, la
  sanction, c'est le coup de pénalité.

### Les rivales

- **Les deux autres nations jouent le parcours en même temps que vous**,
  chacune son ballon et sa comète, à leur propre rythme : le jeu n'attend
  jamais le joueur.
- Elles visent la prochaine plateforme (ou la cage à portée) avec une
  dispersion gaussienne, lisent 60–90 % du vent, subissent les mêmes
  pénalités et le même plafond par+5.
- Si vous terminez le trou avant elles, leurs derniers coups sont **résolus
  en accéléré** (même solveur, même dispersion, sans animation) et annoncés.
- Classement au **total de coups du parcours** ; le HUD affiche le cumul
  de chaque nation en direct. Victoire si vous êtes strictement en tête.

### Génération des parcours (`src/course.js`)

- Générateur **entièrement déterministe** à partir d'une graine (PRNG
  mulberry32) : sauts de 31 à 45 m (portée max ~60 m), montées plafonnées à
  +3,5 m par saut (la cloche existe pour ça), demi-largeur des toits ≥ 4,6 m,
  dérive latérale bornée au couloir de la ville, doglegs alternés à 70 %.
- Difficulté croissante le long du parcours (toits plus petits, sauts plus
  longs, vent plus fort) ; validé par échantillonnage massif (6 000 trous
  générés : tous solvables avec les deux clubs, aucun chevauchement).
- **Parcours du jour** : la graine est dérivée de la date UTC — le monde
  entier joue le même tracé, un nouveau chaque jour.
- Le toit final reprend la cage et le mini-terrain du Duel.

## 4 ter. Mode « Tournoi »

- Trois duels éliminatoires : **quart de finale → demi-finale → finale**,
  face à **six nations distinctes** tirées au sort (deux par match).
- Matchs raccourcis à **5 manches** (la cage recule de 7 m par manche : mêmes
  distances finales qu'en Duel), mort subite puis élimination en cas
  d'égalité persistante.
- Les adversaires **gagnent en précision à chaque tour** ; en finale, le
  gardien monte sur le toit dès la manche 3 quelle que soit la difficulté.
- L'écran de fin d'étape annonce le prochain match (bouton **CONTINUER**) ;
  le titre de champion s'ajoute aux records locaux.

## 5. Présentation

### 5.1 Direction artistique

- 3D stylisée low-poly : personnages trapus, gros ballon (rayon exagéré pour
  la lisibilité).
- **Joueurs détaillés** (v0.2) : formes arrondies (capsules), membres articulés
  en deux segments (genoux et coudes qui plient pendant la frappe), visage
  (yeux, sourcils), coiffures propres à chaque joueur, cols et manches du
  maillot, chaussettes rayées, crampons avec bout renforcé, écusson au torse,
  numéro dans le dos. Célébration bras levés après un but.
- **Palette** : tours bleu nuit constellées de fenêtres allumées, ciel crépusculaire
  pastel, pelouses vert saturé — sur lesquels tranchent les traînées néon et la
  grosse flèche rouge qui désigne votre tireur.
- Lumière rasante et ombres portées longues (fin de journée).
- Brume de profondeur pour asseoir l'échelle de la ville.

### 5.2 Caméra

- Posée derrière et au-dessus des tireurs, orientée vers la cage : le vide et la
  cible se lisent d'un coup d'œil.
- Léger suivi du ballon du joueur pendant le vol, puis retour en position.

### 5.3 Interface

- **Écran titre** : logo, choix de la nation (🇩🇪 🇮🇹 🇪🇸), bouton **JOUER** (clin
  d'œil au bouton de la pub).
- **HUD** : trois badges nation (score + planches restantes), numéro de manche,
  indicateur de vent, message d'aide à la première visée.
- **Messages** : « BUT ! », « Raté… », « Manche N », éliminations.
- **Écran de fin** : victoire/défaite, tableau des scores, bouton rejouer.
- **Pause** (⏸ en jeu) : partie figée à l'image près, reprise ou abandon ;
  le même panneau sert de **réglages** (⚙️ sur l'écran titre) — volume et
  vibrations, persistés sur l'appareil.
- **Tutoriel** au tout premier lancement : trois pictos (glisser = puissance
  et direction, vent à compenser, planches / pénalités), puis « C'EST PARTI ».
- Textes en **français** (localisation possible plus tard).

### 5.4 Audio

- Sons synthétisés en WebAudio (aucun asset externe) : impact de frappe,
  carillon de but, bris de planche, chute.

## 6. Architecture technique

- **Stack** : HTML/CSS/JS (modules ES) + **Three.js** (vendorisé dans `vendor/`,
  fonctionne hors-ligne). Aucun build, aucun bundler : un serveur statique suffit.
- **Découpage** :
  - `index.html` / `style.css` — page, HUD, écrans (DOM par-dessus le canvas)
  - `src/main.js` — bootstrap, boucle de rendu, entrées pointeur
  - `src/world.js` — ciel, ville, toits, cage, parcours du mode golf
  - `src/players.js` — tireurs articulés, planches, badges drapeaux, flèche
  - `src/game.js` — machines à états (Duel, Tournoi, Parcours), balistique, IA, score
  - `src/course.js` — générateur procédural de parcours (graine, Parcours du jour)
  - `src/fx.js` — traînées, confettis, débris
  - `src/audio.js` — synthèse WebAudio (+ volume et vibrations réglables)
  - `src/ui.js` — liaison DOM (HUD, écrans)
  - `src/records.js` — records locaux et préférences (localStorage)
  - `src/assets.js` — textures générées en canvas (drapeaux, fenêtres, visages…)
  - `src/nations.js` — données des huit nations (couleurs, numéros, coiffures)
- **Physique maison** : intégration semi-implicite (position/vitesse), aucune
  dépendance physique.

## 7. Feuille de route

- **v0 — prototype jouable** ✅ : tout le §2 à §5 ci-dessus.
- **v1 — la grande passe** ✅ *(cette itération)* :
  - **Lisibilité du tir** : marqueur d'atterrissage doré au bout de la
    prévisualisation, ralenti-caméra sur les buts du joueur.
  - **Duel enrichi** : lucarnes ×2 (coins dorés, l'IA les tente dès la
    manche 4), gardien mobile sur les dernières manches (l'IA écarte alors
    ses tirs), nuit qui tombe au fil des manches.
  - **Parcours enrichi** : choix du club 🎯 tendu / 🌙 cloche (les rivales
    sortent la cloche pour grimper).
  - **Modes & réglages** : Duel local à 2 (J1 puis J2 sur le même écran,
    une IA en trouble-fête), difficulté Normal / 🔥 Difficile (aide à la
    visée, précision de l'IA, vent, arrivée du gardien).
  - **Ambiance** : clameur de foule sur vos buts, souffle du vent audible,
    vibrations mobiles, cycle jour → nuit.
  - **Méta** : records locaux + partage de score, PWA installable et
    jouable hors-ligne (manifest + service worker + icônes).
- **v2 — parcours infinis & tournoi** ✅ *(cette itération)* :
  - **Générateur procédural de parcours** (`src/course.js`) : déterministe
    par graine, difficulté croissante, validé sur 6 000 trous.
  - **Parcours 9 trous** et **Parcours du jour** (graine = date UTC, même
    tracé et même vent pour tous, difficulté imposée, record du jour et
    partage « battez-moi »).
  - **Tournoi** : quart → demie → finale contre 6 nations distinctes,
    matchs de 5 manches, IA de plus en plus précise, gardien assuré en
    finale, bouton CONTINUER entre les matchs, trophées comptabilisés.
  - **Confort grand public** : pause en jeu (partie figée), réglages volume
    / vibrations persistés, tutoriel au premier lancement.
- **v3 — idées** : obstacles entre les toits (câbles, grues, drones),
  toits spéciaux (héliport bonus, pentes), duel à 2 en ligne,
  classement en ligne du Parcours du jour.

## 8. Référence visuelle — la publicité d'origine

- Toits d'une métropole au crépuscule ; tours bleu nuit aux fenêtres allumées,
  une tour à façade géodésique à droite.
- Trois joueurs côte à côte sur une pelouse de toit, chacun sur un tas de planches :
  🇩🇪 Allemagne (blanc, n°5), 🇮🇹 Italie (bleu, n°12), 🇪🇸 Espagne (rouge/jaune, n°2),
  médaillon-drapeau au-dessus de chacun.
- Grosse flèche rouge cartoon sur le tireur contrôlé.
- Cage blanche sur mini-terrain vert, sur le toit d'en face.
- Trois ballons en vol, traînées comète graduées : or, cyan, rose.
- Bouton « JOUER » (format *playable ad* ; le vrai *Top Eleven* est un jeu de
  management — ce mini-jeu relève du gameplay publicitaire, repris ici comme
  concept à part entière).
