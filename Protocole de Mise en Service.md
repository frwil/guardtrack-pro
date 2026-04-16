# 📋 Protocole de Mise en Service - GuardTrack Pro

## Document de Transition et Déploiement Progressif

---

## 1. INTRODUCTION

### 1.1 Objectif du Document

Ce document définit le protocole de mise en service progressive de GuardTrack Pro, en assurant une transition maîtrisée depuis les processus manuels existants vers l'automatisation complète.

### 1.2 Principes Directeurs

| Principe | Description |
|----------|-------------|
| **Progressivité** | Déploiement par phases indépendantes |
| **Double gestion** | Maintien du manuel pendant l'automatisation |
| **Réversibilité** | Possibilité de revenir en arrière à chaque phase |
| **Validation** | Points de contrôle avant passage à la phase suivante |

### 1.3 Durée Totale Estimée

**6 à 8 semaines** pour un déploiement complet et sécurisé.

---

## 2. PHASES DE DÉPLOIEMENT

### Vue d'Ensemble des Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CALENDRIER DE DÉPLOIEMENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Semaine 1-2    │  Semaine 3-4    │  Semaine 5-6    │  Semaine 7-8          │
│  ───────────────┼─────────────────┼─────────────────┼───────────────────────│
│  PHASE 1        │  PHASE 2        │  PHASE 3        │  PHASE 4              │
│  Infrastructure │  Données de     │  Opérations     │  Validation &         │
│  & Paramétrage  │  Base           │  Terrain        │  Finalisation         │
│                 │                 │                 │                       │
│  ████████████████│  ████████████████│  ████████████████│  ████████████████████  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1 : INFRASTRUCTURE ET PARAMÉTRAGE
### Durée : Semaines 1-2

### 1.1 Déploiement de l'Infrastructure (Jours 1-3)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **1.1.1** Mise en place environnement production | 2j | DevOps | Déploiement Vercel + Northflank avec configuration staging |
| **1.1.2** Configuration des domaines et SSL | 1j | DevOps | DNS + certificats Let's Encrypt |
| **1.1.3** Configuration des sauvegardes automatiques | 1j | DevOps | Backup quotidien BDD + fichiers |

**Point de contrôle :** ✅ Infrastructure accessible et sécurisée

### 1.2 Paramétrage de l'Application (Jours 4-7)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **1.2.1** Création du compte SuperAdmin | 30min | Admin | Configuration initiale + 2FA |
| **1.2.2** Paramétrage entreprise (logo, coordonnées) | 1h | Admin | Via `/admin/settings/personalization` |
| **1.2.3** Création des comptes administrateurs | 2h | SuperAdmin | 2-3 comptes admin avec rôles définis |
| **1.2.4** Configuration des rôles et permissions | 2h | SuperAdmin | Vérification matrice des droits |
| **1.2.5** Paramétrage IA (choix provider, seuils) | 1j | Admin | Configuration TensorFlow local + fallback |
| **1.2.6** Configuration des notifications email/SMS | 1j | Admin | Templates + expéditeur |

**Point de contrôle :** ✅ Application paramétrée et accessible aux admins

### 1.3 Création des Utilisateurs Pilotes (Jours 8-10)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **1.3.1** Création de 3-5 superviseurs pilotes | 2h | Admin | Formation individuelle de 30min chacun |
| **1.3.2** Création de 5-10 contrôleurs pilotes | 3h | Admin | Formation groupe + test application mobile |
| **1.3.3** Création de 10-20 agents pilotes | 4h | Admin | Formation collective + distribution identifiants |

**Point de contrôle :** ✅ Utilisateurs pilotes formés et connectés

### 1.4 Risques et Contraintes - Phase 1

| Risque | Probabilité | Impact | Mesure d'atténuation |
|--------|-------------|--------|---------------------|
| Retard DNS/propagation | Moyenne | Faible | Prévoir 48h d'avance |
| Résistance au changement | Moyenne | Moyenne | Communication préalable + formation |
| Oubli de paramétrage critique | Faible | Élevé | Checklist de validation |

---

## PHASE 2 : DONNÉES DE BASE
### Durée : Semaines 3-4

### 2.1 Création des Clients (Jours 1-4)

**Stratégie de double gestion :**
- Les clients existent déjà dans le système manuel (Excel/cahier)
- Création progressive dans GuardTrack
- Pendant cette phase, les deux systèmes coexistent

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **2.1.1** Extraction liste clients existants | 2h | Admin | Export depuis système actuel |
| **2.1.2** Nettoyage et validation des données | 4h | Admin | Vérification SIRET, adresses, contacts |
| **2.1.3** Création par lots (20% des clients) | 1j | Admin | Clients prioritaires (plus gros volume) |
| **2.1.4** Création par lots (30% des clients) | 1j | Admin | Clients secondaires |
| **2.1.5** Création par lots (50% des clients) | 2j | Admin | Clients restants |

**Procédure de double gestion Clients :**
```
┌─────────────────────────────────────────────────────────────────┐
│                    GESTION CLIENTS - PHASE 2                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Système Manuel (Excel)          GuardTrack Pro                │
│   ─────────────────────           ────────────────               │
│   │ Client A │ ✓                 │ Client A │ ✓                │
│   │ Client B │ ✓                 │ Client B │ ✓                │
│   │ Client C │ ✓                 │ Client C │ En création       │
│   │ Client D │ ✓                 │ Client D │ Non créé          │
│                                                                  │
│   Règle : Si client existe dans GuardTrack → Utiliser GuardTrack │
│          Si client n'existe pas → Utiliser Excel + Créer         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Création des Sites avec Géolocalisation (Jours 5-8)

**Contrainte majeure :** La géolocalisation nécessite une validation terrain.

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **2.2.1** Extraction liste des sites existants | 2h | Admin | Avec adresses complètes |
| **2.2.2** Création sites sans coordonnées GPS (phase 1) | 2j | Admin | Adresse + QR Code généré |
| **2.2.3** Déploiement des QR Codes physiques | 2j | Contrôleurs | Impression et affichage sur sites |
| **2.2.4** Validation géolocalisation par contrôleurs | 3j | Contrôleurs | Via visite site → bouton "Mettre à jour GPS" |
| **2.2.5** Vérification des coordonnées | 1j | Superviseur | Contrôle qualité des positions |

**Procédure de validation GPS terrain :**
```typescript
// Fonction disponible dans l'app contrôleur
async function validateSiteGPS(siteId: number) {
  // 1. Le contrôleur se rend physiquement sur le site
  // 2. Il ouvre l'app et va sur la fiche du site
  // 3. Il clique sur "Valider la position GPS"
  // 4. L'app capture les coordonnées actuelles
  // 5. Validation automatique si précision < 10m
  
  const position = await getCurrentPosition({ enableHighAccuracy: true });
  await sitesService.update(siteId, {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
}
```

### 2.3 Risques et Contraintes - Phase 2

| Risque | Probabilité | Impact | Mesure d'atténuation |
|--------|-------------|--------|---------------------|
| Erreurs dans les données clients | Élevée | Moyenne | Validation manuelle avant import |
| GPS imprécis sur certains sites | Moyenne | Moyenne | Possibilité de correction manuelle |
| QR Codes perdus/mal positionnés | Moyenne | Élevée | Régénération facile via interface |
| Oubli de sites dans la création | Moyenne | Moyenne | Rapports de contrôle croisé Excel/GuardTrack |
| Absence de réseau sur site | Élevée | Faible | Mode offline fonctionnel |

---

## PHASE 3 : OPÉRATIONS TERRAIN
### Durée : Semaines 5-6

### 3.1 Création des Affectations (Jours 1-3)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **3.1.1** Formation superviseurs aux affectations | 2h | Admin | Démo + exercices pratiques |
| **3.1.2** Création planning semaine 1 (20% des agents) | 1j | Superviseur | Agents pilotes uniquement |
| **3.1.3** Validation du planning par agents | 1j | Agents | Consultation planning via app |
| **3.1.4** Création planning semaine 2 (50% des agents) | 1j | Superviseur | Extension progressive |
| **3.1.5** Création planning complet | 1j | Superviseur | Tous les agents |

**Procédure de transition planning :**
```
┌─────────────────────────────────────────────────────────────────┐
│                 TRANSITION PLANNING - PHASE 3                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Planning Papier/Excel           GuardTrack Pro                │
│   ─────────────────────           ────────────────               │
│                                                                  │
│   Semaine 1 : 20% agents sur GuardTrack, 80% sur papier         │
│   Semaine 2 : 50% agents sur GuardTrack, 50% sur papier         │
│   Semaine 3 : 100% agents sur GuardTrack, papier = backup       │
│                                                                  │
│   En cas de bug : Le planning papier reste la référence          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Pointages et Présences (Jours 4-10)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **3.2.1** Pointages en double (manuel + app) - Jour 1-2 | 2j | Agents pilotes | Les agents pointent sur les deux systèmes |
| **3.2.2** Comparaison des pointages | 1j | Superviseur | Vérification concordance |
| **3.2.3** Correction des écarts | 1j | Superviseur | Analyse des différences |
| **3.2.4** Pointages app uniquement (avec backup manuel) | 3j | Tous agents | Le manuel reste disponible en cas de problème |
| **3.2.5** Validation des présences par contrôleurs | Continu | Contrôleurs | Via rondes ou validation manuelle |

**Procédure de gestion des écarts de pointage :**
```typescript
// Protocole en cas d'écart entre pointage app et pointage manuel
interface PointageEcart {
  date: string;
  agent: string;
  site: string;
  appCheckIn: string | null;
  manuelCheckIn: string;
  raison: 'OUBLI_APP' | 'BUG_TECHNIQUE' | 'ERREUR_AGENT' | 'RESEAU_INDISPONIBLE';
  resolution: 'CORRIGER_APP' | 'GARDER_MANUEL' | 'ATTENDRE_SYNC';
}

// Si écart détecté :
// 1. Superviseur documente l'écart
// 2. Si bug technique → escalade support IT
// 3. Si oubli agent → rappel procédure
// 4. Le pointage manuel fait foi pour la paie
```

### 3.3 Rondes et Incidents (Jours 6-10)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **3.3.1** Création rondes tests | 1j | Superviseur | 2-3 rondes simples |
| **3.3.2** Exécution rondes par contrôleurs pilotes | 2j | Contrôleurs | Avec double rapport (papier + app) |
| **3.3.3** Déclaration incidents tests | 2j | Agents/Contrôleurs | Incidents simulés |
| **3.3.4** Validation du workflow incidents | 1j | Superviseur | De la déclaration à la résolution |

### 3.4 Risques et Contraintes - Phase 3

| Risque | Probabilité | Impact | Mesure d'atténuation |
|--------|-------------|--------|---------------------|
| Panne réseau sur site | Élevée | Faible | Mode offline + sync automatique |
| Agents oubliant de pointer sur app | Élevée | Moyenne | Double pointage + rappels SMS |
| Bugs dans l'application | Moyenne | Élevé | Équipe support réactive + backup manuel |
| Contrôleurs ne validant pas à temps | Moyenne | Moyenne | Alertes automatiques superviseur |
| Photos floues/inutilisables | Moyenne | Faible | Validation IA + demande de reprise |
| Conflits de synchronisation | Faible | Moyenne | Résolution manuelle par superviseur |

---

## PHASE 4 : VALIDATION ET FINALISATION
### Durée : Semaines 7-8

### 4.1 Audit et Contrôle Qualité (Jours 1-5)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **4.1.1** Audit croisé des données | 2j | Admin | Comparaison GuardTrack vs données source |
| **4.1.2** Vérification exhaustivité clients/sites | 1j | Admin | Tous les clients et sites sont-ils créés ? |
| **4.1.3** Vérification pointages sur période complète | 1j | Superviseur | Analyse des écarts résiduels |
| **4.1.4** Test de charge et performance | 1j | DevOps | Simulation pic d'activité |

### 4.2 Formation Complète (Jours 3-7)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **4.2.1** Formation avancée superviseurs | 2h | Admin | Rapports, KPI, résolution conflits |
| **4.2.2** Formation avancée contrôleurs | 1h | Superviseur | Gestion des litiges, validation rapide |
| **4.2.3** Session Q&A agents | 1h | Superviseur | Réponses aux questions terrain |

### 4.3 Abandon du Système Manuel (Jours 8-10)

| Étape | Durée | Responsable | Procédure |
|-------|-------|-------------|-----------|
| **4.3.1** Décision Go/No-Go | 2h | Direction | Validation des métriques de succès |
| **4.3.2** Communication officielle | 1h | Direction | Annonce fin du système manuel |
| **4.3.3** Archivage des données manuelles | 1j | Admin | Conservation légale 5 ans |
| **4.3.4** Arrêt définitif du double pointage | - | Tous | GuardTrack devient la référence unique |

### 4.4 Critères de Succès (Go/No-Go)

| Critère | Seuil Minimum | Mesure |
|---------|---------------|--------|
| Taux de pointage app | ≥ 95% | Présences app / présences attendues |
| Écarts de pointage | ≤ 2% | Différences app vs manuel |
| Bugs critiques | 0 | Bloquants non résolus |
| Satisfaction utilisateurs | ≥ 80% | Sondage agents/contrôleurs |
| Disponibilité système | ≥ 99% | Uptime sur la période |

### 4.5 Risques et Contraintes - Phase 4

| Risque | Probabilité | Impact | Mesure d'atténuation |
|--------|-------------|--------|---------------------|
| Données historiques incomplètes | Moyenne | Moyenne | Conservation des archives manuelles |
| Résistance à l'abandon du manuel | Moyenne | Faible | Communication + démonstration bénéfices |
| Non-atteinte des critères Go | Faible | Élevé | Prolongation phase 3 d'une semaine |

---

## 3. GESTION DES INCIDENTS ET BUGS

### 3.1 Niveaux de Gravité

| Niveau | Description | Délai de résolution | Action |
|--------|-------------|---------------------|--------|
| **P0 - Critique** | Application inaccessible | 2h | Rollback + équipe complète |
| **P1 - Bloquant** | Fonctionnalité majeure HS | 4h | Équipe dédiée + backup manuel |
| **P2 - Majeur** | Fonctionnalité dégradée | 24h | Correction prioritaire |
| **P3 - Mineur** | Bug non bloquant | 72h | Correction planifiée |

### 3.2 Procédure de Signalement

```
┌─────────────────────────────────────────────────────────────────┐
│                    CIRCUIT DE SIGNALEMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agent/Contrôleur → Superviseur → Admin → Équipe technique       │
│         │               │            │            │              │
│         ▼               ▼            ▼            ▼              │
│    Signale bug    Confirme bug   Priorise    Corrige            │
│    via app        et escalade    et assigne  et déploie          │
│                                                                  │
│  En attendant la correction : Utilisation du système manuel      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Plan de Continuité par Phase

| Phase | Système Principal | Système de Backup | Basculement |
|-------|-------------------|-------------------|-------------|
| Phase 1 | Aucun (paramétrage) | N/A | N/A |
| Phase 2 | GuardTrack (création) | Excel | Immédiat si bug |
| Phase 3 | GuardTrack + Manuel | Manuel | Immédiat si bug |
| Phase 4 | GuardTrack | Manuel archivé | Retour possible 1 mois |

---

## 4. SUIVI ET REPORTING

### 4.1 Tableau de Bord de Transition

| Indicateur | Fréquence | Responsable | Cible |
|------------|-----------|-------------|-------|
| Nombre de clients créés | Quotidien | Admin | 100% J10 |
| Nombre de sites avec GPS | Quotidien | Admin | 100% J14 |
| Taux d'adoption agent | Quotidien | Superviseur | ≥ 80% S5 |
| Écarts de pointage | Quotidien | Superviseur | ≤ 5% S5 |
| Bugs signalés | Hebdomadaire | Admin | ↓ tendance |
| Temps de résolution | Hebdomadaire | Admin | ≤ 24h P2 |

### 4.2 Réunions de Suivi

| Réunion | Fréquence | Participants | Durée |
|---------|-----------|--------------|-------|
| Daily stand-up | Quotidien | Admin + Superviseur | 15min |
| Point hebdomadaire | Hebdomadaire | Direction + Équipe | 1h |
| Revue de phase | Fin de phase | Tous | 2h |

---

## 5. CHECKLISTS DE VALIDATION

### 5.1 Checklist Fin Phase 1

- [ ] Infrastructure déployée et stable
- [ ] Domaines et SSL configurés
- [ ] Sauvegardes automatiques actives
- [ ] Comptes administrateurs créés
- [ ] Paramétrage entreprise terminé
- [ ] Utilisateurs pilotes formés et connectés

### 5.2 Checklist Fin Phase 2

- [ ] Tous les clients créés dans GuardTrack
- [ ] Tous les sites créés avec QR Codes
- [ ] GPS validé pour ≥ 80% des sites
- [ ] QR Codes physiques déployés sur sites
- [ ] Double gestion documentée

### 5.3 Checklist Fin Phase 3

- [ ] Planning complet dans GuardTrack
- [ ] Pointages app ≥ 90% des pointages totaux
- [ ] Écarts de pointage documentés et résolus
- [ ] Rondes exécutées avec succès
- [ ] Incidents gérés de bout en bout

### 5.4 Checklist Fin Phase 4 (Go/No-Go)

- [ ] Tous les critères de succès atteints
- [ ] Audit données validé
- [ ] Formations complètes terminées
- [ ] Communication officielle faite
- [ ] Système manuel archivé

---

## 6. ANNEXES

### 6.1 Contacts Clés

| Rôle | Nom | Téléphone | Email |
|------|-----|-----------|-------|
| Chef de projet | [À compléter] | | |
| Responsable technique | [À compléter] | | |
| Superviseur principal | [À compléter] | | |
| Support IT | [À compléter] | | |

### 6.2 Documents de Référence

- Manuel utilisateur GuardTrack Pro
- Guide de résolution des conflits de synchronisation
- Procédure de backup et restauration
- Plan de reprise d'activité (PRA)

### 6.3 Glossaire

| Terme | Définition |
|-------|------------|
| **Double gestion** | Maintien simultané du système manuel et de GuardTrack |
| **Pointage** | Action de signaler son arrivée/départ sur un site |
| **Ronde** | Tournée de contrôle de plusieurs sites |
| **Sync** | Synchronisation des données offline vers le serveur |

---

**Document validé le :** [Date]

**Signatures :**
- Directeur Général : _________________
- Responsable Technique : _________________
- Chef de Projet : _________________