// =============================================================================
// firebase.js — Gestion de la base de données et de l'authentification Firebase
//
// Objectif pour la soutenance : Montrer l'intégration d'un Backend-as-a-Service,
// l'utilisation de modules ES externes et la séparation entre les accès BDD
// (Firestore) et la gestion des comptes (Auth).
// =============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// Clés publiques. La sécurité réelle des données se configure côté Firebase
// grâce aux Firestore Security Rules (qui empêcheraient un uid de lire la data d'un autre uid).
const firebaseConfig = {
  apiKey:            "AIzaSyDr1jMgGm0Oj_bOiWY-8Gy27IlzkmAzlOM",
  authDomain:        "parcoursupp-expl.firebaseapp.com",
  projectId:         "parcoursupp-expl",
  storageBucket:     "parcoursupp-expl.firebasestorage.app",
  messagingSenderId: "973054617217",
  appId:             "1:973054617217:web:4d52af4280396976228f80"
};

// Initialisation des services uniques pour toute l'app
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);      // Service dédié à l'authentification
const db   = getFirestore(app); // Service base de données


// --- Services d'authentification ---

// Encapsulation des méthodes Firebase pour des appels asynchrones simplifiés dans nos composants
async function createAccount(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function logout() {
  return signOut(auth);
}

// Le pattern de listener (callback) : permet de réagir à tout changement de session
// sans avoir à vérifier en permanence l'état de l'utilisateur.
function onUserChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

// --- Services base de données Firestore ---

// Utilise { merge: true } pour ne mettre à jour que le champ `selection`
// sans écraser d'éventuelles autres données de l'utilisateur si on complexifie l'app plus tard.
async function saveUserData(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

// Récupère l'état enregistré au format JSON document.
// S'il n'existe pas, on retourne poliment null.
async function loadUserData(uid) {
  var snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}


export { auth, db, createAccount, login, logout, onUserChanged, saveUserData, loadUserData };