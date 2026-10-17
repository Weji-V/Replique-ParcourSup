# 📚 Fiche de Révision – Fonctions JS — Parcoursup Explorer

> Préparée pour la soutenance. Tous les fichiers `.js` et `.riot` (partie `<script>`) ont été analysés.

---

## 🗂️ Vue d'ensemble des fichiers JS

| Fichier | Rôle |
|---|---|
| `api.js` | Appels HTTP à l'API Parcoursup (Open Data) |
| `firebase.js` | Authentification et base de données Firebase |
| `formation.js` | Transformation des données brutes de l'API en objet propre |
| `main.js` | *(ancien fichier de test, remplacé par app.riot)* |
| `app.riot` | Composant principal — état global, routing, comparateur |
| `components/auth-panel.riot` | Connexion / inscription / déconnexion |
| `components/search-bar.riot` | Barre de recherche et filtres avancés |
| `components/result-list.riot` | Affichage de la liste de résultats |
| `components/detail-view.riot` | Page détail d'une formation + graphiques |
| `components/map-view.riot` | Carte interactive Leaflet |

---

## 📄 `api.js` — Appels à l'API Parcoursup

### `echapperValeur(valeur)` *(fonction privée, non exportée)*
- **Rôle** : Sécurise une valeur avant de l'injecter dans une clause `where` de l'URL.
- **Comment** : Convertit en `String`, puis remplace les apostrophes `'` par `\'` avec une **regex**.
- **Concepts clés** : `String()`, `.replace()`, **expression régulière** `/'/g`

```js
function echapperValeur(valeur) {
  return String(valeur).replace(/'/g, "\\'");
}
```

---

### `construireURL(requete, limite, decalage, filtres)` *(exportée)*
- **Rôle** : Construit l'URL complète de requête vers l'API Open Data.
- **Paramètres** :
  - `requete` → texte tapé par l'utilisateur
  - `limite` → nombre de résultats (défaut : 20)
  - `decalage` → offset pour la pagination (défaut : 0)
  - `filtres` → objet `{ filiere, selectivite, region, tauxMin, tauxMax }`
- **Retourne** : une URL (string)
- **Concepts clés** : **valeurs par défaut** (`limite = 20`), `encodeURIComponent()`, tableau `conditions`, `.join(" AND ")`

---

### `chargerFormations(requete, limite, decalage, filtres)` *(async, exportée)*
- **Rôle** : Appelle l'URL construite via `fetch()` et parse le JSON.
- **Retourne** : l'objet JSON de l'API (contient `results`, `total_count`)
- **Concepts clés** :
  - `async` / `await`
  - `fetch()` — requête HTTP
  - `reponse.ok` — vérifie le statut HTTP
  - `reponse.json()` — parse le corps de la réponse
  - `throw new Error()` — lève une exception si erreur

---

### `chargerHistoriqueFormation(codUai, nomFormation)` *(async, exportée)*
- **Rôle** : Charge les données de la même formation sur plusieurs années (2020 → 2025), en appelant 6 datasets différents.
- **Retourne** : un tableau d'objets `{ annee, tauxAcces, candidats, admis, pctAB, ... }`
- **Concepts clés** :
  - Boucle `for` sur un tableau d'années
  - `try / catch` pour gérer les erreurs par année sans bloquer le reste
  - `Math.round()` pour calculer le taux d'accès
  - `.substring(0, 40)` — tronque le nom de la formation
  - `historique.push(...)` — accumule les résultats
  - `console.warn()` — affiche un avertissement sans bloquer

---

## 📄 `firebase.js` — Authentification & Base de données

### Imports Firebase (SDK modulaire)
```js
import { initializeApp } from "firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, ... } from "firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "firebase-firestore.js";
```
> **À savoir** : Firebase est importé directement depuis une URL CDN (pas de npm ici).

### `createAccount(email, password)` *(async)*
- Crée un compte avec `createUserWithEmailAndPassword(auth, email, password)`

### `login(email, password)` *(async)*
- Connecte un utilisateur avec `signInWithEmailAndPassword(auth, email, password)`

### `logout()` *(async)*
- Déconnecte avec `signOut(auth)`

### `onUserChanged(callback)` *(sync)*
- **Rôle** : Écoute les changements d'état de connexion (connecté / déconnecté).
- Utilise `onAuthStateChanged(auth, callback)` — appelle `callback` à chaque changement.
- **Concept clé** : **callback** / **écouteur d'évènement**

### `saveUserData(uid, data)` *(async)*
- Sauvegarde des données dans Firestore avec `setDoc(doc(db, "users", uid), data, { merge: true })`
- `merge: true` → ne **pas écraser** les champs existants, juste **fusionner**

### `loadUserData(uid)` *(async)*
- Lit un document Firestore avec `getDoc(doc(db, "users", uid))`
- Vérifie avec `snap.exists()` avant de retourner `snap.data()`

---

## 📄 `formation.js` — Transformation des données

### `creerFormation(brut)` *(exportée)*
- **Rôle** : Prend un enregistrement brut de l'API (avec des noms de champs techniques comme `lib_for_voe_ins`, `voe_tot`, `acc_tot`…) et retourne un objet **propre et lisible**.
- **Concepts clés** :
  - Objet littéral `{}`
  - Accès aux propriétés imbriquées : `brut.g_olocalisation_des_formations.lat`
  - `Math.round()` pour calculer `tauxAcces`
  - Valeurs par défaut avec `||` : `brut.voe_tot || 0`

---

## 📄 `app.riot` — Composant principal (Riot.js)

### Cycle de vie Riot.js
| Méthode | Déclenchement |
|---|---|
| `onMounted()` | Quand le composant est ajouté au DOM |
| `onUpdated()` | Après chaque `this.update()` |
| `onBeforeUnmount()` | Juste avant la suppression du composant |

### `onMounted()`
- Lit la sélection sauvegardée avec `localStorage.getItem('selectionFormations')`
- Parse le JSON avec `JSON.parse(saved)` (dans un `try/catch`)
- Appelle `window.firebaseServices.onUserChanged(...)` pour surveiller la connexion
- Écoute les changements de hash URL avec `window.addEventListener('hashchange', ...)`
- Appelle `this.gererRoute()` pour démarrer le bon affichage

### `gererRoute()`
- **Rôle** : Système de **routing par hash** (`#/`, `#/formation/id`, `#/comparateur`)
- Lit `window.location.hash`
- Utilise `chemin.startsWith('/formation/')` et `decodeURIComponent()`
- Met à jour `state.view` pour afficher le bon écran

### `chargerFormationParId(id)` *(async)*
- Cherche d'abord dans `state.results`, puis dans `state.selectedFormations`
- Si non trouvé → appelle `window.chargerFormations()` pour récupérer depuis l'API

### `lancerRecherche(requete, filtres)` *(async)*
- Remet `page` à 1, met `loading: true`, puis appelle `this.chargerPage(1)`

### `chargerPage(page)` *(async)*
- Calcule `decalage = (page - 1) * this.state.limit`
- Appelle `window.chargerFormations(...)` et transforme les résultats avec `window.creerFormation()`
- Met à jour `results`, `total`, `page`, `loading`

### `nombreTotalPages()`
- **Formule** : `Math.ceil(total / limit)` — arrondit au supérieur

### `pageSuivante()` / `pagePrecedente()` *(async)*
- Vérifient les bornes (`page < nombreTotalPages()`, `page > 1`) avant d'appeler `chargerPage()`

### `ajouterSelection(index)` / `retirerSelection(id)` / `viderSelection()`
- Gèrent un tableau `selectedFormations`
- `.slice()` → copie le tableau avant modification (évite mutation directe du state)
- Appellent `this.sauvegarderSelection(selection)` après chaque modification

### `sauvegarderSelection(selection)` *(async)*
- `localStorage.setItem(...)` — persistance locale (dans navigateur)
- `window.firebaseServices.saveUserData(...)` — persistance cloud si connecté

### `obtenirSelectionTriee()`
- Trie avec `Array.sort()` et des **fonctions de comparaison**
- `localeCompare()` — compare des chaînes alphabétiquement (avec accents)
- `calculerScore()` — tri par score d'estimation

### `calculerScore(f)`
- Algorithme de scoring en 3 critères : taux d'accès + note de l'étudiant + % de sa série
- Retourne un score numérique (0 à 100)

### `estimerFormation(f)`
- Appelle `calculerScore()` et retourne un libellé : `"Très favorable"`, `"Favorable"`, `"Possible"`, `"Difficile"`, `"Très difficile"`

### `classeEstimation(f)` / `classeCarte(f)`
- Retournent une **classe CSS** selon l'estimation → pour coloriser les cartes

### `surDeconnexion()`
- Vide `selectedFormations` et supprime de localStorage avec `localStorage.removeItem(...)`

---

## 📄 `components/auth-panel.riot`

### `ouvrirModale()` / `fermerModale()`
- `this.update({ visible: true })` / `this.update({ visible: false })` — affiche/cache la modale

### `cliquerFond(e)`
- `e.target === e.currentTarget` → vérifie qu'on a cliqué sur le **fond** et non sur la modale elle-même

### `afficherConnexion()` / `afficherInscription()`
- Changent `state.mode` (entre `'connexion'` et `'inscription'`) et les labels affichés

### `validerFormulaire(e)` *(async)*
- `e.preventDefault()` — empêche le rechargement de page (comportement par défaut du formulaire)
- Récupère email et password depuis `e.target.email.value`
- Attrape les erreurs Firebase avec `err.code` pour afficher des messages lisibles
- Codes gérés : `auth/email-already-in-use`, `auth/wrong-password`, `auth/weak-password`, `auth/user-not-found`, `auth/invalid-email`

### `seDeconnecter()` *(async)*
- Appelle `window.firebaseServices.logout()`

---

## 📄 `components/search-bar.riot`

### `updateQuery(e)` / `updateFiliere(e)` / `updateSelectivite(e)` / `updateRegion(e)` / `updateTauxMin(e)` / `updateTauxMax(e)`
- Tous liés à des événements `oninput` ou `onchange`
- Mettent à jour le `state` avec `this.update({ champ: e.target.value })`
- `Number(e.target.value)` pour les taux (convertit string → nombre)

### `handleKey(e)`
- `e.key === 'Enter'` → déclenche `this.submitSearch()` si on appuie Entrée

### `toggleFilters()`
- Inverse `state.showFilters` et change le label du bouton

### `submitSearch()`
- Construit l'objet `filters` depuis le state et appelle `this.props.onsearch(...)` — **communication enfant → parent** via props

---

## 📄 `components/result-list.riot`

### `afficherDetail(index)`
- Appelle `this.props.ondetail(index)` — **communication vers le parent**

### `ajouterALaSelection(index)`
- Appelle `this.props.onselect(index)`

### `localiserSurCarte(formation)`
- Appelle `window.mapFocus(formation.id)` — **communication globale via window** entre deux composants frères

---

## 📄 `components/detail-view.riot`

### `onMounted()` / `onUpdated()`
- Appellent `afficherGraphiques()` et `chargerHistorique()` lors du montage/mise à jour

### `retourListe()`
- `this.props.onback()` — dit au parent de revenir à la liste

### `limiterValeur(val)`
- **Rôle** : Ramène une valeur entre 0 et 1 pour Charts.css (qui utilise des variables CSS `--size`)
- Gère `null`, `undefined`, `NaN` avec `isNaN()`
- Formule : `val / 100`, clampé entre 0 et 1

### `afficherGraphiques()`
- Sélectionne les éléments DOM avec `this.$('[ref="graphBac"]')` — sélecteur Riot
- Appelle `construireGraphiqueColonnes()` et `construireGraphiqueBarres()` pour injecter du HTML

### `chargerHistorique()` *(async)*
- Extrait le `codUai` depuis `f.id.split('-')[0]`
- Appelle `window.chargerHistoriqueFormation(codUai, f.nom)`
- Met à jour `state.historique`

### `afficherGraphiquesHistoriques()`
- Construit les graphiques historiques en HTML (charts CSS) en itérant sur `state.historique`
- Pour candidats vs admis : calcule une taille relative `(valeur / max) * 100`

### `construireGraphiqueColonnes(elements)` / `construireGraphiqueBarres(elements)`
- **Rôle** : Génèrent du HTML de tableau `<table>` pour la lib **Charts.css**
- Paramètre : tableau `[{ label, valeur, couleur }]`
- Retournent un string HTML avec variables CSS `--size` et `--color`

---

## 📄 `components/map-view.riot` — Carte Leaflet

### `onMounted()`
- `L.map(divCarte).setView([46.8, 2.5], 6)` — initialise la carte centrée sur la France
- `L.layerGroup().addTo(this.carte)` — groupe de marqueurs pour les vider facilement
- `L.tileLayer(...)` — ajoute les tuiles OpenStreetMap
- `setTimeout(..., 200)` et `setTimeout(..., 500)` — force un recalcul de taille après rendu (bug Leaflet classique)
- `window.mapFocus = function(id) {...}` — expose une fonction globale pour que `result-list` puisse y accéder

### `onUpdated()`
- Recharge les marqueurs et invalide la taille de la carte

### `onBeforeUnmount()`
- `this.carte.remove()` — détruit la carte proprement pour éviter les **memory leaks**
- `this.carte = null`

### `afficherMarqueurs()`
- `this.groupeMarqueurs.clearLayers()` — vide tous les marqueurs existants avant d'en re-créer
- Crée un `L.marker([lat, lon])` pour chaque formation avec coordonnées
- `.bindPopup(...)` — popup d'info au clic
- `.addTo(this.groupeMarqueurs)` — ajoute au groupe
- `this.carte.fitBounds(coordonnees, { padding: [20, 20] })` — ajuste le zoom pour tout voir

### `centrerSurFormation(id)`
- Récupère le marqueur dans `this.marqueursIndex[id]`
- `divCarte.scrollIntoView({ behavior: 'smooth' })` — scrolle vers la carte
- `this.carte.setView(marqueur.getLatLng(), 13, { animate: true })` — centre et zoom
- `marqueur.openPopup()` — ouvre la bulle d'info

---

## 🔑 Concepts JavaScript clés à bien connaître

| Concept | Où dans le projet |
|---|---|
| `async` / `await` | `chargerFormations`, `chargerHistoriqueFormation`, `validerFormulaire`, etc. |
| `fetch()` + `.json()` | `api.js` — appels API |
| `try / catch` | Partout pour gérer les erreurs réseau et Firebase |
| `Promise` + `.then()` + `.catch()` | `app.riot` — `loadUserData().then(...)` |
| `localStorage` | `app.riot` — sauvegarder la sélection |
| `JSON.parse()` / `JSON.stringify()` | Lecture/écriture dans `localStorage` |
| `encodeURIComponent()` | Encoder les paramètres dans l'URL API |
| `Array.push()`, `.slice()`, `.sort()` | Gestion de la sélection et du tri |
| `Math.round()`, `Math.ceil()` | Calcul taux d'accès, pagination |
| `String.localeCompare()` | Tri alphabétique avec accents |
| `String.split('-')`, `.startsWith()`, `.substring()` | Parsing d'ID, routing |
| `e.preventDefault()` | Formulaire auth (empêche rechargement) |
| `e.target === e.currentTarget` | Détection clic sur fond de modale |
| `window.addEventListener('hashchange', ...)` | Routing SPA par hash |
| `setTimeout()` | Délai pour corriger bug affichage Leaflet |
| `isNaN()` | Vérification valeur numérique dans Charts.css |
| Regex `/'/g` | Échapper les apostrophes dans les requêtes API |

---

## 🌐 Bibliothèques et APIs externes utilisées

| Bibliothèque/API | Usage | Comment importé |
|---|---|---|
| **Firebase Auth** | Connexion / inscription / déconnexion | CDN (`gstatic.com`) |
| **Firebase Firestore** | Stockage de la sélection en cloud | CDN (`gstatic.com`) |
| **Riot.js** | Framework composants UI | Via `index.html` |
| **Leaflet.js (`L`)** | Carte interactive | Via `index.html` (variable globale `L`) |
| **Charts.css** | Graphiques en CSS pur | Via `index.html` |
| **API Open Data Parcoursup** | Données des formations | `fetch()` vers `data.enseignementsup-recherche.gouv.fr` |
| **OpenStreetMap** | Tuiles de fond de carte | URL `tile.openstreetmap.org` |

---

## ❓ Questions probables du prof — Réponses préparées

**Q : Pourquoi utilises-tu `async/await` ?**  
→ Parce que `fetch()` et les appels Firebase sont **asynchrones** (ils prennent du temps). Sans `await`, le code continuerait sans attendre la réponse, ce qui rendrait le résultat `undefined`.

**Q : À quoi sert `encodeURIComponent()` ?**  
→ L'URL ne peut pas contenir certains caractères spéciaux (espaces, apostrophes, `&`...). Cette fonction les convertit en codes URL sûrs (ex: `%20` pour l'espace).

**Q : Pourquoi utilises-tu `localStorage` ?**  
→ Pour **persister** la sélection de formations entre les visites, même sans être connecté. C'est un stockage côté navigateur, sans serveur.

**Q : Qu'est-ce que `e.preventDefault()` ?**  
→ Empêche le **comportement par défaut** du navigateur. Sur un `<form>`, le comportement par défaut est de recharger la page. On l'annule pour gérer la soumission en JavaScript.

**Q : Pourquoi `this.carte.remove()` dans `onBeforeUnmount()` ?**  
→ Leaflet attache des **event listeners** et occupe de la mémoire. Si on ne détruit pas proprement la carte, cela crée des **memory leaks** (fuites mémoire).

**Q : Qu'est-ce que `merge: true` dans Firestore `setDoc(...)` ?**  
→ Cela **fusionne** les données avec celles existantes au lieu de tout écraser. Utile pour ne mettre à jour qu'un seul champ (la sélection) sans toucher aux autres.

**Q : Comment fonctionne le routing de ton app ?**  
→ On utilise les **hash URL** (`#/`, `#/formation/id`, `#/comparateur`). On écoute l'événement `hashchange` pour détecter les changements, et on affiche le bon écran via `state.view`. C'est un routing côté client, sans rechargement de page — c'est ce qu'on appelle une **SPA** (Single Page Application).
