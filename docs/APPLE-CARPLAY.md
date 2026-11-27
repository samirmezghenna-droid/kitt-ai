# Préparation Apple CarPlay

## État actuel (27 novembre 2026)

KITT AI est actuellement une PWA publiée avec GitHub Pages. Elle n'est pas une application iOS native et ne peut pas apparaître dans CarPlay. Le dépôt ne contient pas encore de cible Xcode/Swift.

## Catégorie CarPlay visée

La catégorie à demander en priorité est **CarPlay Voice-Based Conversation App**, avec l'entitlement :

`com.apple.developer.carplay-voice-based-conversation`

Apple documente cette catégorie à partir d'iOS 26.4. Elle vise les apps qui répondent aux questions ou demandes et effectuent des actions. C'est la catégorie qui correspond le mieux à KITT (assistant vocal, réponses parlées, commandes telles que demander une information ou transmettre une destination à Waze).

La catégorie Navigation (`com.apple.developer.carplay-maps`) ne doit être demandée que si KITT devient lui-même une véritable application de navigation fournissant des itinéraires et un guidage virage par virage. Ouvrir Waze via un lien ne transforme pas KITT en application de navigation.

Apple doit approuver l'entitlement avant que l'application puisse être affichée dans CarPlay. La demande se fait depuis le portail Apple Developer : https://developer.apple.com/contact/carplay

## Compte Apple et coût

- Un compte Apple habituel permet de créer gratuitement un compte développeur Apple et d'accéder à la documentation et aux outils de base.
- Pour signer et distribuer l'application, notamment via TestFlight ou l'App Store, il faudra adhérer à l'Apple Developer Program (99 USD/an, prix local affiché par Apple).
- L'inscription individuelle demande un compte Apple avec authentification à deux facteurs, des informations personnelles exactes et une vérification d'identité.
- Ne pas payer l'abonnement avant d'avoir examiné les exigences et le périmètre de la demande CarPlay. L'achat et l'acceptation des contrats doivent être faits par le titulaire du compte Apple.

## Architecture cible

Conserver la PWA actuelle pendant la création d'une application iOS native :

- `core.js` : commandes locales et extraction de destinations ; formaliser un contrat de commande portable vers Swift.
- Service IA : API HTTPS derrière un proxy serveur ; aucune clé fournisseur dans le client.
- Couche vocale : abstraction entre reconnaissance, synthèse et logique conversationnelle. La PWA conserve les API Web ; l'app native utilise les API iOS autorisées.
- App iOS : cible Swift/SwiftUI, identifiant de bundle propre, gestion des autorisations micro/audio et du cycle de vie iOS.
- CarPlay : scène et interface conformes aux templates autorisés pour la catégorie approuvée. Le modulateur rouge KITT peut inspirer l'identité visuelle, mais l'écran CarPlay ne peut pas être un tableau de bord HTML arbitraire ; les règles Apple et de sécurité priment.
- Navigation : transmettre la destination à Waze par un mécanisme iOS pris en charge, après confirmation appropriée.

## Plan de réalisation

1. Garder la PWA actuelle fonctionnelle pendant le développement natif.
2. Préparer le squelette iOS et le contrat de commandes sans intégrer de secret ni de certificat.
3. Vérifier les exigences Apple et déposer la demande d'entitlement Voice-Based Conversation.
4. Après approbation et adhésion développeur si nécessaire, configurer l'App ID, les capabilities et profils de signature.
5. Implémenter les scènes CarPlay et les interactions vocales autorisées.
6. Mettre en place une compilation macOS à distance (CI) afin que le propriétaire du projet n'ait pas besoin de posséder un Mac. La signature et la distribution resteront dépendantes du compte développeur et de ses validations.
7. Tester sur simulateur et véhicule compatible, puis soumettre à la revue Apple.

## À ne pas faire

- Ne pas annoncer la compatibilité CarPlay avant qu'une application native avec entitlement ait été approuvée et testée.
- Ne pas supposer qu'une PWA, un raccourci iOS ou une URL Waze donne accès à l'écran CarPlay.
- Ne pas promettre une écoute permanente si iOS ne l'autorise pas dans le contexte considéré.
- Ne pas afficher de commandes complexes ou de texte libre nécessitant l'attention du conducteur.

## Critères d'acceptation

- L'entitlement demandé est accordé par Apple et activé sur l'App ID.
- L'application native est signée et installable.
- Une scène CarPlay s'ouvre avec les templates autorisés.
- Les commandes vocales, retours audio et actions vers Waze sont testés, y compris sans réseau.
- La documentation distingue clairement les fonctions iPhone et CarPlay.
