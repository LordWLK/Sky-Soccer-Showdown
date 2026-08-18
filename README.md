# Sky Soccer Showdown ⚽🏙️

Concept inspiré du mini-jeu montré dans une publicité Instagram de *Top Eleven* :
un concours de frappes de précision disputé sur les toits de gratte-ciel.
Ce document décrit la scène de la pub et le gameplay qu'on en déduit, pour servir
de cahier des charges au projet.

## Pitch

Trois footballeurs, chacun sous les couleurs de sa sélection nationale, s'affrontent
au sommet d'une tour. Objectif : expédier son ballon par-dessus le vide et le loger
dans une cage installée sur le toit d'un immeuble voisin. Chaque tireur est perché
sur une pile de planches en bois au bord du toit : la précision rapporte des points,
la maladresse peut coûter la chute.

## Ce que montre la publicité

- **Décor** : les toits d'une métropole au crépuscule — tours bleu nuit aux fenêtres
  allumées, ciel clair et brumeux à l'horizon, une tour à façade géodésique à droite.
- **Les tireurs** : trois joueurs côte à côte sur une pelouse de toit, chacun debout
  sur un tas de planches en bois, en pleine frappe :
  - 🇩🇪 Allemagne — maillot blanc, n°5
  - 🇮🇹 Italie — maillot bleu, n°12
  - 🇪🇸 Espagne — maillot rouge et jaune, n°2
- **Badges** : un médaillon circulaire avec le drapeau du pays flotte au-dessus de
  chaque joueur.
- **La flèche rouge** : une grosse flèche cartoon désigne le joueur allemand — c'est
  le personnage contrôlé par le joueur.
- **La cible** : un but blanc posé sur un mini-terrain vert, aménagé sur le toit
  d'une tour située de l'autre côté du vide.
- **Les tirs** : les trois ballons sont en vol, chacun laissant une traînée lumineuse
  façon comète, graduée de petits traits — jaune pour l'Allemagne, bleu clair pour
  l'Italie, rose pour l'Espagne.
- **Bouton « JOUER »** : l'appel à l'action de la publicité (format *playable ad*).

## Boucle de jeu (déduite)

1. **Viser** : régler la direction et la puissance du tir (geste de glisser-relâcher
   ou jauge de timing qui oscille — les deux standards du genre hyper-casual).
2. **Frapper** : le ballon part en cloche au-dessus du vide, traînée colorée à l'appui,
   qui matérialise la trajectoire et la distance.
3. **Marquer** : ballon dans la cage = points (bonus possible en pleine lucarne) ;
   ballon trop court ou trop long = tir perdu dans le vide.
4. **Survivre** : les planches sous le tireur suggèrent une sanction d'échec —
   un raté fait céder la plateforme (ou rapproche de l'élimination).
5. **Rejouer** : les adversaires IA (les deux autres nations) tirent en même temps
   ou chacun leur tour ; le meilleur score sur la manche l'emporte, puis la difficulté
   monte (cible plus lointaine, plus petite, vent…).

## Direction artistique

- 3D stylisée type mobile (personnages trapus, textures simples, ombres portées longues).
- Palette : bleu nuit des tours, vert saturé des pelouses, ciel pastel — sur lesquels
  tranchent les traînées néon (jaune / cyan / rose) et la flèche rouge.
- Caméra placée derrière et au-dessus des tireurs, regardant vers le but, pour lire
  d'un coup d'œil le vide à franchir et la cible.

## Pistes d'implémentation

- **Moteur** : Three.js ou Babylon.js pour une version web jouable (fidèle à l'esprit
  *playable ad*) ; Unity si version mobile native.
- **Physique** : balistique simple (impulsion initiale + gravité), pas besoin d'un
  moteur physique complet ; la traînée est un ruban de particules dans le sillage du ballon.
- **Détection du but** : volume déclencheur dans la cage ; zones de score optionnelles
  (lucarne, barre…).
- **Entités** : 3 tireurs (1 joueur + 2 IA), ballon par tireur, plateforme de planches
  destructible, but, décor de toits en skybox/props.

## Remarque

Il s'agit d'une *pub jouable* : le vrai *Top Eleven* est un jeu de management de club,
et ce mini-jeu de tirs sur les toits relève du gameplay publicitaire. On le prend ici
comme concept de jeu à part entière.
