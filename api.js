// =============================================================================
// api.js — Gestion des requêtes vers l'API publique Parcoursup (data.gouv.fr)
//
// Objectif pour la soutenance : Montrer qu'on sait forger dynamiquement une URL
// avec des filtres complexes et gérer des requêtes asynchrones (async/await)
// pour récupérer l'historique d'une formation sur plusieurs années.
// =============================================================================

// Échappe les apostrophes pour éviter de casser la syntaxe de la requête de type SQL
// Ex: "Licence d'histoire" -> "Licence d\'histoire"
function echapperValeur(valeur) {
  return String(valeur).replace(/'/g, "\\'");
}

// Construit l'URL avec les paramètres de pagination et la clause "where" contenant les filtres
export function construireURL(requete, limite = 20, decalage = 0, filtres = {}) {

  var url = "https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-parcoursup/records?";

  // Paramètres de base pour la pagination (limite de résultats et offset)
  url += "limit="  + limite;
  url += "&offset=" + decalage;

  var conditions = [];

  // Recherche plein texte : utilise la commande "search" spécifique de l'API ODS (OpenDataSoft)
  if (requete && requete.trim() !== "") {
    conditions.push("search(lib_for_voe_ins, '" + echapperValeur(requete.trim()) + "')");
  }

  // Filtrage par filière (BTS, BUT, Licence...)
  if (filtres.filiere && filtres.filiere !== "") {
    conditions.push("fili='" + echapperValeur(filtres.filiere) + "'");
  }

  // Filtrage par sélectivité (sélective / non sélective)
  if (filtres.selectivite && filtres.selectivite !== "") {
    conditions.push("select_form='" + echapperValeur(filtres.selectivite) + "'");
  }

  // Filtrage par région géographique de l'établissement
  if (filtres.region && filtres.region !== "") {
    conditions.push("region_etab_aff='" + echapperValeur(filtres.region) + "'");
  }

  // Application de filtres numériques (taux d'accès minimum et maximum)
  if (filtres.tauxMin && filtres.tauxMin > 0) {
    conditions.push("taux_acces_ens>=" + filtres.tauxMin);
  }
  if (filtres.tauxMax && filtres.tauxMax < 100) {
    conditions.push("taux_acces_ens<=" + filtres.tauxMax);
  }

  // Assemblage de toutes les conditions séparées par un opérateur ET logique
  // On utilise encodeURIComponent pour assurer la validité de l'URL finale
  if (conditions.length > 0) {
    url += "&where=" + encodeURIComponent(conditions.join(" AND "));
  }

  return url;
}

// Effectue la requête HTTP vers l'URL construite
// Fonction asynchrone qui retourne une promesse résolue avec les résultats JSON
export async function chargerFormations(requete, limite = 20, decalage = 0, filtres = {}) {

  var url     = construireURL(requete, limite, decalage, filtres);
  var reponse = await fetch(url);

  // Gestion des erreurs HTTP (ex: 400 Bad Request, 500 Internal Server Error)
  if (!reponse.ok) {
    throw new Error("Erreur HTTP " + reponse.status);
  }

  // Extraction et retour du corps de la réponse au format JSON
  return await reponse.json();
}

// Fonction métier complexe : reconstitue l'historique d'une formation sur plusieurs années
// Démontre l'orchestration de multiples appels API asynchrones
export async function chargerHistoriqueFormation(codUai, nomFormation) {

  // Table de correspondance entre l'année et le nom du dataset sur open data
  var jeuDeDonnees = {
    2020: "fr-esr-parcoursup_2020",
    2021: "fr-esr-parcoursup_2021",
    2022: "fr-esr-parcoursup_2022",
    2023: "fr-esr-parcoursup_2023",
    2024: "fr-esr-parcoursup_2024",
    2025: "fr-esr-parcoursup"       // L'année en cours est sur le dataset par défaut
  };

  var historique = [];
  var nomCourt   = echapperValeur((nomFormation || "").substring(0, 40));
  var codeUai    = echapperValeur(codUai);
  var annees     = [2020, 2021, 2022, 2023, 2024, 2025];

  // Requête itérative pour consolider les données par année
  for (var i = 0; i < annees.length; i++) {

    var annee   = annees[i];
    var dataset = jeuDeDonnees[annee];

    try {
      // On croise le code établissement (cod_uai) avec le nom de formation pour être précis
      var where = "cod_uai='" + codeUai + "' AND search(lib_for_voe_ins, '" + nomCourt + "')";

      // On limite à 5 résultats max et on sélectionne uniquement les colonnes nécessaires (optimisation)
      var url = "https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/"
        + dataset + "/records?"
        + "limit=5"
        + "&where=" + encodeURIComponent(where)
        + "&select=" + encodeURIComponent("cod_uai,lib_for_voe_ins,voe_tot,acc_tot,pct_sansmention,pct_ab,pct_b,pct_tb,pct_tbf,pct_bg,pct_bt,pct_bp");

      var reponse = await fetch(url);

      if (reponse.ok) {
        var donnees = await reponse.json();

        if (donnees.results && donnees.results.length > 0) {
          var ligne = donnees.results[0]; // On prend le premier résultat trouvé
          var taux  = 0;

          // Calcul mathématique propre du taux d'accès pour éviter une division par zéro
          if (ligne.voe_tot && ligne.voe_tot > 0) {
            taux = Math.round((ligne.acc_tot / ligne.voe_tot) * 100);
          }

          // Formatage d'un objet normalisé pour le graphique Riot
          historique.push({
            annee:          annee,
            tauxAcces:      taux,
            candidats:      ligne.voe_tot || 0,
            admis:          ligne.acc_tot || 0,
            pctSansMention: ligne.pct_sansmention || 0,
            pctAB:          ligne.pct_ab  || 0,
            pctB:           ligne.pct_b   || 0,
            pctTB:          ligne.pct_tb  || 0,
            pctTBF:         ligne.pct_tbf || 0,
            pctGeneral:     ligne.pct_bg  || 0,
            pctTechno:      ligne.pct_bt  || 0,
            pctPro:         ligne.pct_bp  || 0
          });
        }
      }

    } catch (e) {
      // Le bloc try/catch empêche l'échec de la boucle entière si une seule année est en erreur (ex: dataset absent)
      console.warn("L'année " + annee + " n'a pas pu être récupérée :", e);
    }
  }

  return historique;
}