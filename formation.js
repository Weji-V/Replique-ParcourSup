// =============================================================================
// formation.js — Couche de mapping et de normalisation
//
// Objectif pour la soutenance : Démontrer le Design Pattern "Adapter" / "DTO".
// Les données brutes de l'API ont des noms de champs très abrégés et abscons.
// Ce ficher permet de tout transformer avec des noms de variables explicites
// pour faciliter le travail et éviter la dette technique dans les composants UI.
// =============================================================================

export function creerFormation(brut) {

  // Calcul systématique du taux d'accès : pourcentage = (admis / candidats) * 100
  var taux = 0;
  if (brut.voe_tot && brut.voe_tot > 0) {
    taux = Math.round((brut.acc_tot / brut.voe_tot) * 100);
  }

  // Les coordonnées géographiques peuvent être absentes pour certaines formations.
  // On s'en prémunit en les déclarant explicitement comme `null` le cas échéant.
  var latitude  = null;
  var longitude = null;
  if (brut.g_olocalisation_des_formations) {
    latitude  = brut.g_olocalisation_des_formations.lat;
    longitude = brut.g_olocalisation_des_formations.lon;
  }

  return {
    // Création d'une clé d'identification unique requise par notre application
    // pour retrouver ou différencier deux éléments (ex: pour la carte ou la sélection)
    id:            brut.cod_uai + "-" + brut.lib_for_voe_ins,

    // Métadonnées administratives et géographiques de l'établissement
    nom:            brut.lib_for_voe_ins,
    etablissement:  brut.g_ea_lib_vx,
    ville:          brut.ville_etab,
    departement:    brut.dep,
    departementLib: brut.dep_lib,
    region:         brut.region_etab_aff,
    academie:       brut.acad_mies,
    contrat:        brut.contrat_etab,

    // Cursus et niveau
    filiere:        brut.fili,
    selectivite:    brut.select_form,

    // Statistiques principales d'admission
    capacite:   brut.capa_fin,
    candidats:  brut.voe_tot,
    admis:      brut.acc_tot,
    tauxAcces:  taux,

    // Placement sur la carte
    latitude,
    longitude,

    // Indicateurs du profil étudiant entrant (sociologique)
    pctFemmes:    brut.pct_f,
    pctBoursiers: brut.pct_bours,
    pctNeoBac:    brut.pct_neobac,

    // Origine académique par type du Bac précédent
    pctGeneral: brut.pct_bg,
    pctTechno:  brut.pct_bt,
    pctPro:     brut.pct_bp,

    // Niveaux scolaires par les mentions obtenues
    pctSansMention: brut.pct_sansmention,
    pctAB:          brut.pct_ab,
    pctB:           brut.pct_b,
    pctTB:          brut.pct_tb,
    pctTBF:         brut.pct_tbf,

    // Dynamique temporelle : comment la formation s'est remplie durant la procédure
    pctDebutPhase: brut.pct_acc_debutpp,  // 30 mai (lancement)
    pctDateBac:    brut.pct_acc_datebac,  // 16 juin (résultats)
    pctFinPhase:   brut.pct_acc_finpp,    // 11 juillet

    admisDebutPhase: brut.acc_debutpp,
    admisDateBac:    brut.acc_datebac,
    admisFinPhase:   brut.acc_finpp,

    // Détails de la Phase Principale — Les effectifs découpés par filière d'origine
    voePPGeneral: brut.nb_voe_pp_bg,
    voePPTechno:  brut.nb_voe_pp_bt,
    voePPPro:     brut.nb_voe_pp_bp,
    voePPAutres:  brut.nb_voe_pp_at,
    voePPTotal:   brut.nb_voe_pp,

    classesPPGeneral: brut.nb_cla_pp_bg,
    classesPPTechno:  brut.nb_cla_pp_bt,
    classesPPPro:     brut.nb_cla_pp_bp,
    classesPPAutres:  brut.nb_cla_pp_at,
    classesPPTotal:   brut.nb_cla_pp,

    propositionsPPGeneral: brut.prop_tot_bg,
    propositionsPPTechno:  brut.prop_tot_bt,
    propositionsPPPro:     brut.prop_tot_bp,
    propositionsPPAutres:  brut.prop_tot_at,
    propositionsPPTotal:   brut.prop_tot,

    acceptesPPGeneral: brut.acc_bg,
    acceptesPPTechno:  brut.acc_bt,
    acceptesPPPro:     brut.acc_bp,
    acceptesPPAutres:  brut.acc_at,
    acceptesPPTotal:   brut.acc_pp,

    // Détails de la Phase Complémentaire — Session de rattrapage
    voePCGeneral: brut.nb_voe_pc_bg,
    voePCTechno:  brut.nb_voe_pc_bt,
    voePCPro:     brut.nb_voe_pc_bp,
    voePCAutres:  brut.nb_voe_pc_at,
    voePCTotal:   brut.nb_voe_pc,

    classesPCTotal:  brut.nb_cla_pc,
    acceptesPCTotal: brut.acc_pc
  };
}