# Sky Soccer Showdown ⚽🏙️

Duel de frappes de précision au sommet des gratte-ciel : trois nations, un toit,
un but de l'autre côté du vide — le plus précis reste debout.

Jeu web 3D (Three.js), jouable à la souris ou au doigt, inspiré d'une publicité
jouable de *Top Eleven*. Le concept complet est décrit dans
[GAME_DESIGN.md](GAME_DESIGN.md).

## ▶️ Jouer

Le jeu est 100 % statique (aucun build, Three.js embarqué dans `vendor/`) :
il suffit de servir le dossier et d'ouvrir la page.

```bash
# au choix :
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
# ou
npx serve .                   # puis ouvrir le port affiché (3000 par défaut)
```

Fonctionne aussi hors-ligne.

## 🎮 Règles & contrôles

- **Choisissez votre nation** (🇩🇪 n°5, 🇮🇹 n°12 ou 🇪🇸 n°2) puis **JOUER**.
- **Glissez vers le bas** pour régler la puissance, **latéralement** pour la
  direction (une trajectoire en pointillés vous guide), **relâchez** pour tirer.
- Chaque manche, les trois tireurs frappent : **but = +1 point**,
  **tir raté = une planche brisée**. Trois planches brisées → la plateforme
  cède et le tireur bascule dans le vide.
- À partir de la manche 3, **le vent se lève** (affiché dans le HUD, invisible
  dans la prévisualisation : à vous de compenser) et le but **s'éloigne**
  à chaque manche.
- 8 manches ; meilleur score gagnant, mort subite en cas d'égalité.

## 🗂 Structure

| Fichier | Rôle |
|---|---|
| `index.html` / `style.css` | page, HUD, écrans (DOM par-dessus le canvas) |
| `src/main.js` | bootstrap, boucle de rendu, entrées |
| `src/world.js` | ciel, ville, toits, cage, lumière |
| `src/players.js` | tireurs low-poly, planches, badges, animations |
| `src/game.js` | machine à états, balistique, IA, score, caméra |
| `src/fx.js` | traînées comète, débris, confettis |
| `src/audio.js` | sons synthétisés (WebAudio) |
| `src/ui.js` | liaison DOM (HUD, écrans, messages) |
| `src/assets.js` | textures générées en canvas (drapeaux, fenêtres…) |
| `vendor/three.module.min.js` | Three.js r170 vendorisé |

L'équilibrage (précision de l'IA, fenêtres de tir, vent) a été calibré par
simulation numérique — détails dans [GAME_DESIGN.md](GAME_DESIGN.md), §4.

## 🧭 Feuille de route

- **v0 — prototype jouable** ✅ *(vous êtes ici)*
- **v1 — polish** : tutoriel, équilibrage affiné, sons enrichis, vrais modèles
- **v2** : gardien mobile, cibles bonus, duel local à 2, déploiement GitHub Pages
