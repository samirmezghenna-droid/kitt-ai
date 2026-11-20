# KITT AI

Prototype PWA mobile de KITT AI, assistant inspiré du tableau de bord noir et rouge de KITT (K2000). Le prototype est une application web statique, utilisable sur iPhone sans Mac ni Xcode.

## Fonctions livrées
- Interface noire et rouge, scanner à trois barres animées.
- Commandes locales : « Bonjour KITT », aide, heure et ouverture de Waze avec destination.
- Destinations reconnues : « Ouvre Waze et va à la Tour Eiffel », « Navigue vers Lyon », « Conduis-moi à l'aéroport Charles-de-Gaulle ».
- Synthèse vocale française avec réglage de hauteur et de débit (effet robotique léger, pas un véritable vocodeur).
- Dictée via Web Speech Recognition si le navigateur l'expose.
- Mot-clé « Bonjour KITT » au premier plan après activation explicite et permission micro, uniquement si l'API est disponible.
- Connexion IA facultative par proxy Cloudflare Worker ; la clé API reste côté serveur.
- Manifeste PWA et cache hors ligne de l'interface.

## Limites
- Aucune écoute permanente en arrière-plan : iOS peut suspendre Safari lorsque l'app passe en arrière-plan.
- La reconnaissance vocale dépend du navigateur et de la version iOS. Sinon, utilisez la saisie ou la dictée iOS du clavier.
- La voix dépend des voix françaises installées. Le pitch/rate ne sont pas un traitement audio temps réel.
- L'IA n'est pas connectée par défaut : sans Worker, seules les commandes locales fonctionnent.
- Waze est ouvert via son lien universel ; l'application Waze doit être installée pour basculer dans celle-ci.
- CarPlay n'est pas implémenté. Une PWA ne peut pas se déclarer application CarPlay.

## Installation iPhone
1. Fusionnez la branche prototype puis ouvrez GitHub → Settings → Pages.
2. Activez Pages depuis la branche main, dossier racine.
3. Ouvrez l'URL HTTPS publiée dans Safari sur iPhone.
4. Partager → Sur l'écran d'accueil pour installer la PWA.
5. Autorisez le microphone et testez le bouton Parler à KITT. Le mot-clé ne marche que si le navigateur supporte l'API et tant que la page reste au premier plan.

Le site doit être servi en HTTPS (ou localhost) pour les API navigateur et le service worker.

## Commandes vocales / destinations
- « Bonjour KITT »
- « Quelle heure est-il ? »
- « Ouvre Waze »
- « Ouvre Waze et va à la Tour Eiffel »
- « Navigue vers Lyon »
- « Conduis-moi à l'aéroport Charles-de-Gaulle »

La destination extraite est encodée dans le lien universel Waze (q=...&navigate=yes). Vérifiez l'adresse proposée par Waze avant de démarrer. Si la reconnaissance vocale iOS n'est pas disponible dans Safari, utilisez la dictée intégrée au clavier.

## Connecter l'IA (facultatif)
1. Créez un Cloudflare Worker et copiez le fichier server/worker.js.
2. Configurez le secret OPENAI_API_KEY dans le Worker.
3. Optionnel : définissez MODEL (par défaut gpt-4o-mini).
4. Définissez ALLOWED_ORIGIN sur l'origine exacte de votre site GitHub Pages. Évitez le joker en production.
5. Déployez le Worker et collez son URL dans KITT → Réglages.

Ne placez jamais la clé API dans app.js, dans les réglages du navigateur ou dans GitHub.

## Tests
Node.js 18+ : exécutez npm test. Pour servir localement, utilisez npx serve . puis ouvrez localhost. L'ouverture file:// ne permet pas le service worker.

## Fichiers
- index.html : interface.
- styles.css : tableau de bord et scanner.
- app.js : voix, conversation et réglages.
- core.js : commandes locales et destinations Waze.
- manifest.webmanifest, sw.js, assets/ : PWA.
- server/worker.js : proxy IA.
- tests/ : tests Node natifs.
- docs/APPLE-CARPLAY.md : trajectoire documentée vers une app iOS native et CarPlay.

## Prochaines étapes
1. Tester sur les versions iOS/Safari ciblées.
2. Sécuriser le proxy IA avec quotas et authentification.
3. Étudier un véritable traitement vocal audio.
4. Étudier séparément une application iOS native et les règles Apple CarPlay. Ne pas annoncer CarPlay avant validation.

## Sécurité
N'utilisez les commandes vocales que dans des conditions sûres. Ne manipulez pas l'écran en conduisant. Vérifiez toujours la destination dans Waze avant de partir. Ces fonctions expérimentales ne remplacent pas les commandes du véhicule ni une assistance de sécurité.
