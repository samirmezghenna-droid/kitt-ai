# Préparation Apple CarPlay

## État actuel

KITT AI est une PWA. **Aucune intégration CarPlay n'est présente dans ce dépôt** et le site ne sera pas visible comme application CarPlay dans un véhicule. Ce document fixe une trajectoire technique sans simuler une compatibilité.

## Architecture cible

Conserver la PWA comme prototype UI et extraire progressivement les fonctions indépendantes du navigateur :

- core.js : commandes locales pures et normalisation, réutilisables dans les tests et portables vers Swift.
- Contrat de commande : une requête utilisateur peut produire une réponse parlée ou une action typée (par exemple navigate avec une destination).
- Service IA : API HTTPS derrière un proxy serveur ; aucune clé fournisseur dans le client.
- Couche vocale : interface abstraite entre reconnaissance, synthèse et logique conversationnelle. La PWA utilise les API Web ; une app native utilisera les API iOS autorisées.

## Étapes d'intégration native

1. Créer ultérieurement une cible iOS native (Swift / SwiftUI) et réutiliser le service IA et le contrat de commandes.
2. Étudier les frameworks CarPlay actuels et les catégories d'applications autorisées par Apple. Les modèles CarPlay et leurs interactions sont encadrés ; un tableau de bord HTML arbitraire ne peut pas être affiché librement.
3. Si le produit fournit réellement une fonction de navigation, étudier les API CarPlay de navigation, les scènes CarPlay et les exigences d'entitlements.
4. Déposer une demande d'entitlement CarPlay auprès d'Apple, puis implémenter les scènes et templates correspondant à la catégorie approuvée.
5. Tester sur simulateur et matériel compatible, puis suivre le processus de revue et de distribution Apple.

## À ne pas faire

- Ne pas annoncer la compatibilité CarPlay avant qu'une application native avec entitlement ait été acceptée et testée.
- Ne pas supposer qu'une PWA, un raccourci iOS ou une URL Waze donne accès à l'écran CarPlay.
- Ne pas afficher de commandes complexes ou de texte libre nécessitant l'attention du conducteur. Les interactions embarquées doivent rester compatibles avec les exigences de sécurité et les templates autorisés.

## Critères d'acceptation futurs

- L'app est reconnue par CarPlay après activation de l'entitlement.
- Une scène CarPlay s'ouvre et utilise uniquement les templates autorisés.
- Les commandes vocales, retours audio et actions de navigation sont testés en conditions réelles, avec comportement sûr en cas de perte réseau.
- La documentation produit distingue explicitement les fonctions iPhone, les fonctions CarPlay et les fonctions indisponibles.
