# Sky Soccer Showdown ⚽🏙️

Duel de frappes de précision au sommet des gratte-ciel : trois nations, un toit,
un but de l'autre côté du vide — le plus précis reste debout.

Jeu web 3D (Three.js), jouable à la souris ou au doigt, inspiré d'une publicité
jouable de *Top Eleven*. Le concept complet est décrit dans
[GAME_DESIGN.md](GAME_DESIGN.md).

## ▶️ Jouer

**En ligne (mobile et bureau)** : <https://lordwlk.github.io/Sky-Soccer-Showdown/>
— déployé automatiquement par GitHub Actions à chaque push.

**En local** : le jeu est 100 % statique (aucun build, Three.js embarqué dans
`vendor/`) : il suffit de servir le dossier et d'ouvrir la page.

```bash
# au choix :
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
# ou
npx serve .                   # puis ouvrir le port affiché (3000 par défaut)
```

Fonctionne aussi hors-ligne.

## 🎮 Règles & contrôles

- **Choisissez votre nation** (8 équipes), votre **défi** et votre
  **difficulté** (Normal / 🔥 Difficile), puis **JOUER**. Six défis :
  - ⚔️ **Duel** — 8 manches contre 2 rivaux, le plus précis reste debout ;
  - 👥 **Duel à 2** — deux joueurs sur le même écran + une IA ;
  - 🏆 **Tournoi** — quart, demie, finale : 3 duels de 5 manches contre
    6 nations distinctes, IA de plus en plus précise, gardien assuré en
    finale ;
  - ⛳ **Parcours 3 trous** / 🏙️ **Parcours 9 trous** — golf urbain généré
    procéduralement, contre deux rivales ;
  - 📅 **Parcours du jour** — 3 trous identiques pour le monde entier
    (graine = date UTC, vent compris), un nouveau défi chaque jour, record
    du jour et partage « battez-moi ».
- Au premier lancement, un **tutoriel** de trois pictos explique l'essentiel ;
  en jeu, **⏸ met en pause** (reprendre ou quitter) et **⚙️ sur l'écran
  titre** règle volume et vibrations (persistés sur l'appareil).
- **Glissez vers le bas** pour régler la puissance, **latéralement** pour la
  direction (une trajectoire en pointillés vous guide), **relâchez** pour tirer.
- Chaque manche, les trois tireurs frappent : **but = +1 point**,
  **tir raté = une planche brisée**. Trois planches brisées → la plateforme
  cède et le tireur bascule dans le vide.
- Dès la manche 2, **le vent se lève** (affiché et audible, invisible dans la
  prévisualisation : à vous de compenser) et le but **s'éloigne** à chaque
  manche ; la nuit tombe au fil de la partie.
- **Les lucarnes valent double** (coins dorés de la cage) et un **gardien**
  monte sur le toit dans les dernières manches.
- Au Parcours : deux clubs (🎯 tendu / 🌙 cloche), jauge de puissance avec
  repère du but, marqueur d'atterrissage au bout de la trajectoire.
- 8 manches ; meilleur score gagnant, mort subite en cas d'égalité.
- **Records locaux** et bouton de partage sur l'écran de fin ; le jeu est une
  **PWA** : installable sur l'écran d'accueil et jouable hors-ligne.

## 🗂 Structure

| Fichier | Rôle |
|---|---|
| `index.html` / `style.css` | page, HUD, écrans (DOM par-dessus le canvas) |
| `src/main.js` | bootstrap, boucle de rendu, entrées |
| `src/world.js` | ciel, ville, toits, cage, lumière |
| `src/players.js` | tireurs low-poly, planches, badges, animations |
| `src/game.js` | machine à états (Duel, Tournoi, Parcours), balistique, IA, score, caméra |
| `src/course.js` | générateur procédural de parcours (graine, Parcours du jour) |
| `src/fx.js` | traînées comète, débris, confettis |
| `src/audio.js` | sons synthétisés (WebAudio), volume/vibrations réglables |
| `src/ui.js` | liaison DOM (HUD, écrans, messages) |
| `src/records.js` | records locaux et préférences (localStorage) |
| `src/assets.js` | textures générées en canvas (drapeaux, fenêtres…) |
| `vendor/three.module.min.js` | Three.js r170 vendorisé |

L'équilibrage (précision de l'IA, fenêtres de tir, vent) a été calibré par
simulation numérique — détails dans [GAME_DESIGN.md](GAME_DESIGN.md), §4.

## 🧭 Feuille de route

- **v0 — prototype jouable** ✅
- **v1 — la grande passe** ✅ : lucarnes ×2, gardien, jour/nuit, clubs,
  duel à 2, difficultés, records + partage, PWA, ralenti de but
- **v2 — parcours infinis & tournoi** ✅ *(vous êtes ici)* : générateur
  procédural, Parcours 9 trous, Parcours du jour, mode Tournoi, pause,
  réglages, tutoriel
- **v3 — idées** : obstacles entre les toits, toits spéciaux, duel en ligne,
  classement mondial du Parcours du jour
