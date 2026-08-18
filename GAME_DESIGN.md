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

- Une partie = **3 trous** (par 3, par 4, par 5), de plus en plus longs et
  tortueux : décalages latéraux (doglegs), toits plus hauts ou plus bas
  (monter coûte de la portée), toits plus petits en fin de parcours.
- **Vent à chaque coup** dès le trou 1 (léger, puis sensible) : c'est l'âme
  du mode.
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
- Classement au **total de coups sur les 3 trous** ; le HUD affiche le cumul
  de chaque nation en direct. Victoire si vous êtes strictement en tête.
- Ensuite : choix du club (cloche haute / tir tendu), toits spéciaux
  (héliports bonus, toits pentus).

### Générations des parcours

- Parcours générés par graine (seed) : suite de toits espacés de 28 à 42 m,
  dérive latérale progressive, variation de hauteur ±4 m, dimensions 8–16 m.
- Le toit final reprend la cage et le mini-terrain du Duel.

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
  - `src/game.js` — machines à états (Duel et Parcours), balistique, IA, score
  - `src/fx.js` — traînées, confettis, débris
  - `src/audio.js` — synthèse WebAudio
  - `src/ui.js` — liaison DOM (HUD, écrans)
  - `src/assets.js` — textures générées en canvas (drapeaux, fenêtres, visages…)
  - `src/nations.js` — données des trois nations (couleurs, numéros, coiffures)
- **Physique maison** : intégration semi-implicite (position/vitesse), aucune
  dépendance physique.

## 7. Feuille de route

- **v0 — prototype jouable** *(cette itération)* : tout le §2 à §5 ci-dessus.
- **v1 — polish** : vrais modèles/animations, sons enrichis, tutoriel, équilibrage
  fin de l'IA, mode « série de tirs » solo (high score).
- **v2 — idées** : gardien mobile sur les dernières manches, cibles bonus
  (lucarne ×2), obstacles entre les toits (câbles, drones), duel local à 2,
  déploiement GitHub Pages pour jouer sur mobile.

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
