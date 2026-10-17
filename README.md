# Parcoursup Explorer

Application web permettant de consulter les données ouvertes de Parcoursup pour aider à l'orientation des lycéens. 

Ce projet a été réalisé dans le cadre des modules R4.01 et R4.A.10.

## 🌐 Démo en ligne

👉 **[https://dwarves.iut-fbleau.fr/~yolou/parcoursup2/public-html2/parcoursup/#/](https://dwarves.iut-fbleau.fr/~yolou/parcoursup2/public-html2/parcoursup/#/)**

## Fonctionnalités principales

* **Recherche** de formations par mots-clés (via l'API OpenData)
* **Visualisation cartographique** des établissements avec Leaflet
* **Consultation détaillée** d'une formation (taux d'accès, profil des admis, évolution multi-années)
* **Graphiques statistiques** intégrés avec Charts.css
* **Comparateur de sélection** pour estimer ses chances d'admission
* **Espace utilisateur** connecté avec Firebase Auth et Firestore (persistance avancée)

---

## Architecture et Composants (Riot.js)

L'application est construite de façon déclarative et modulaire avec le framework **Riot.js (v9)** et utilise le routeur officiel **@riotjs/route** pour la navigation SPA (Single Page Application).

### 1. `app.riot` (Composant Racine)
C'est le chef d'orchestre de l'application.
* **Fonction :** Gère le routage principal, l'état global (données de recherche, sélection) et coordonne les autres composants.
* **État (State) :** Stocke les résultats de recherche (`state.results`), la formation active (`state.selected`), la sélection pour comparaison (`state.selectedFormations`), et l'utilisateur connecté (`state.user`).
* **Enfants :**
  * Charge `<search-bar>`, `<map-view>`, `<result-list>` sur la route `/`
  * Charge `<detail-view>` sur la route `/formation/:id`
  * Charge `<comparateur-view>` sur la route `/comparateur`

### 2. `components/search-bar.riot`
* **Fonction :** Moteur de recherche et filtres.
* **Entrées :** L'utilisateur tape sa requête (mot clé) et peut appliquer des filtres avancés (filière, sélectivité, région...).
* **Sorties :** Déclenche l'événement `onsearch` qui remonte jusqu'à `<app>` pour lancer la requête API (`lancerRecherche`).

### 3. `components/result-list.riot`
* **Fonction :** Affiche la liste paginée des formations correspondant à la recherche.
* **Props :**
  * `results` : tableau des données renvoyées par l'API
  * `loading` : booléen pour l'état d'attente
  * `hasSearched` : détermine si la liste doit s'afficher
* **Sorties (Events) :**
  * `ondetail(index)` : L'application navigue vers la vue détaillée d'une formation.
  * `onselect(index)` : Ajoute la formation au tableau "Comparateur".

### 4. `components/detail-view.riot`
* **Fonction :** Affiche une fiche complète de la formation sélectionnée avec statistiques approfondies et graphiques via Charts.css.
* **Props :**
  * `formation` : l'objet complet de la formation courante.
* **Sorties (Events) :**
  * `onback()` : Demande de retour à l'écran de recherche principal.
* **Interactions :** Fait un appel API supplémentaire (via `window.chargerHistoriqueFormation`) pour récupérer l'historique sur 6 ans depuis l'API Parcoursup.

### 5. `components/map-view.riot`
* **Fonction :** Affiche une carte interactive Leaflet.
* **Props :**
  * `results` : La liste courante des formations de la vue recherche.
* **Interactions :** Instancie Leaflet dans `onMounted`, place les marqueurs sur carte selon les coordonnées latitude/longitude récupérées, et se redessine automatiquement avec `onUpdated()`. Fournit également une API window globale (`window.mapFocus`) que `result-list` utilise pour recentrer la carte.

### 6. `components/auth-panel.riot`
* **Fonction :** Panneau de connexion / inscription de l'utilisateur (Bonus Firebase).
* **Props :**
  * `user` (objet utilisateur Firebase passé par `<app>`).
* **Sorties (Events) :**
  * `onauth()` et `onlogout()` pour notifier `<app>` des changements de session, ce qui déclenche la synchronisation de la sélection `localStorage` <-> `Firestore`.

### 7. `components/comparateur.riot`
* **Fonction :** Comparateur de formations permettant à l'utilisateur d'estimer ses chances d'admission selon son profil (note, série de bac).
* **Props :**
  * `formations` : le tableau des formations sélectionnées (passé par `<app>`).
  * `onretirer(id)` : callback pour retirer une formation de la sélection.
  * `onvider()` : callback pour vider toute la sélection.
* **État interne (State) :** Gère `note`, `serie` et `sortBy` — paramètres propres à l'affichage du comparateur, sans impacter le reste de l'app.
* **Logique :** Calcule un score sur 100 pour chaque formation (taux d'accès + note + proportion de la série) via `calculerScore()`, puis retourne une estimation textuelle (`"Favorable"`, `"Possible"`, etc.).

---

## Modèle de Données et API

### `api.js` (Modèle de communication HTTP)
Contient les modules d'appel réseau `fetch`.
* `chargerFormations()` : Requete paginée avec filtres croisés vers l'API Data ESR.
* `chargerHistoriqueFormation()` : Requete intelligente multi-datasets (2020-2025) ciblant le code UAI d'un établissement précis pour en extraire l'historique d'admission.

### `formation.js` (Modèle Métier)
* **Fonction :** Isoler et abstraire la complexité du schéma JSON renvoyé par l'API Parcoursup.
* Transforme `brut.acc_tot` ou `brut.lib_for_voe_ins` en un objet lisible clair pour les composants (ex: `formation.admis` ou `formation.nom`), et y précalcule certains champs de base (comme le `tauxAcces`).

### `firebase.js` (Service Backend As a Service)
* Gère l'authentification (Emai/Password) avec `firebase-auth`.
* Gère la persistance cloud de la sélection de vœux dans `users/{uid}` via `firebase-firestore`.


## Routing (Hash Router)
L'application utilise un système de routage manuel natif basé sur l'API `window.location.hash` :
* Écoute de l'événement natif `hashchange` dans `app.riot`.
* Routage conditionnel géré par la fonction `gererRoute()` (`#/`, `#/formation/:id`, `#/comparateur`).
* Affichage conditionnel des composants via les directives natives `if={ state.view === ... }`.

***
## Cycle de vie de l'application

### Initialisation de la carte dans map-view.riot
```javascript
onMounted() {
  this.map = L.map(element).setView([46.8, 2.5], 6)  // crée la carte Leaflet
  L.tileLayer('https://...').addTo(this.map)           // ajoute les tuiles OpenStreetMap
}
```

**Étape 9 — L'application est prête, elle attend l'utilisateur**

À ce stade le navigateur affiche la page avec la barre de recherche, la carte vide centrée sur la France, et aucun résultat. Tout est en mémoire, prêt à réagir.

**Étape 10 — L'utilisateur interagit**
```
L'utilisateur tape "BUT informatique" et clique Rechercher
    → le navigateur déclenche l'événement onclick sur le bouton
        → Riot appelle submitSearch() dans search-bar.riot
            → qui appelle props.onsearch(requete, filtres)
                → qui appelle lancerRecherche() dans app.riot
                    → qui appelle chargerPage(1)
                        → qui appelle fetch() vers l'API
                            → l'API retourne le JSON
                                → app.riot fait this.update({ resultats: formations })
                                    → Riot détecte que le state a changé
                                        → Riot re-rend le HTML automatiquement
                                            → les cards de résultats apparaissent
                                            → map-view reçoit les nouvelles props
                                                → refreshMarkers() place les marqueurs
```

**Résumé de l'ordre d'exécution :**
```
1. index.html chargé
2. CSS téléchargés (style.css, leaflet.css, charts.css)
3. JS externes téléchargés (riot, leaflet)
4. Fichiers .riot téléchargés (pas exécutés)
5. Modules JS importés (api.js, formation.js, firebase.js, estimation.js, selection.js)
6. Firebase se connecte
7. Tout exposé sur window
8. riot.compile() → compile les .riot en JS
9. riot.mount('app') → monte le composant principal
10. onMounted() → charge localStorage, écoute Firebase, écoute hashchange
11. gererRoute() → lit le hash → affiche la vue recherche
12. Composants enfants montés (search-bar, map-view, result-list)
13. Application prête → attend les interactions utilisateur
```

***
*Réalisé par Aylane Sehl, Jenson Val et Séri-Khane Yolou à l'IUT Sénart-Fontainebleau (UPEC).*
