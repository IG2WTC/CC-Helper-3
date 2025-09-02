// state.js - State-Management
// =============================
// Zentrales State-Management für den Cosmic Battle Simulator
// Verwaltet Team, Reserve, Boss-Auswahl und Kampf-Status

import { battleSystem } from './battle.js';

// Realm to mechanic mapping
/**
 * Mapping von Realm-IDs zu ihren entsprechenden Kampfmechaniken
 * Wird verwendet, um Realm-spezifische Boni zu berechnen
 */
const REALM_MECHANICS = {
  1: 'damageAbsorption',  // Rocks
  2: 'protectionChance',  // Sea World
  3: 'evolutionChance',   // Bugdom
  4: 'extraAttackChance', // Aviary
  5: 'empowerment',       // Ancient Relics
  6: 'stunChance',        // Celestial Bodies
  7: 'weakPointChance',   // Mythical Beasts
  8: 'resourcefulAttack', // Incremental Games
  9: 'dodgeChance',       // Spirit Familiars
  10: 'dismemberChance'   // Weapons
};

// Haupt-State-Objekt
const State = {
  team: [],
  selectedBoss: null,
  upgrades: { globalAttackMult: 1.0, globalHPMult: 1.0 },
  parsedSave: null,
  ownedCards: {},
  skills: {},
  battleState: {
    battle: {
      critChance: 0,
      critDamage: 0,
      slotLimit: 3,
      dodgeChance: 0,
      stunChance: 0,
      damageAbsorption: 0,
      protectionChance: 0,
      evolutionChance: 0,
      extraAttackChance: 0,
      empowerment: 0,
      weakPointChance: 0,
      dismemberChance: 0,
      resourcefulAttack: 0,
      resourcefulAttackRealms: new Set(),
      extraAttackRealms: new Set(),
      empowermentRealms: new Set(),
      protectionRealms: new Set(),
      dodgeRealms: new Set(),
      damageAbsorptionRealms: new Set(),
      stunRealms: new Set(),
      evolutionRealms: new Set(),
      weakPointRealms: new Set(),
      dismemberRealms: new Set()
    }
  }
};

// Sort directions per sort type: 1 for ascending, -1 for descending
let sortDirectionsRoster = { name: 1, realm: 1, attack: -1, hp: -1 };
let sortDirectionsBoss = { name: 1, realm: 1, attack: -1, hp: -1 };

// Hilfsfunktion zum Kombinieren von Karten mit Save-Daten
/**
 * Kombiniert Kartendaten aus der Datenbank mit gespeicherten Spielerdaten
 * @param {Object} card - Basis-Kartendaten aus cards.json
 * @param {Object} ownedData - Spieler-spezifische Daten (level, tier, quantity, locked)
 * @returns {Object} Kombinierte Kartendaten mit allen Eigenschaften
 */
function combineCardWithSave(card, ownedData) {
  if (!ownedData) return card;
  return {
    ...card,
    level: ownedData.level || card.level,
    tier: ownedData.tier || card.tier,
    quantity: ownedData.quantity || card.quantity,
    locked: ownedData.locked || false
  };
}

// Hilfsfunktion zum Erstellen einer Kampf-Karte
function createCombatCard(cardWithSave, upgrades) {
  return {
    ...structuredClone(cardWithSave),
    attack: battleSystem.calculateAttackPower(cardWithSave, upgrades),
    hp: battleSystem.calculateHP(cardWithSave, upgrades),
    curHp: battleSystem.calculateHP(cardWithSave, upgrades)
  };
}

// Funktion um zusätzliche Eigenschaften für eine Card zu berechnen
/**
 * Berechnet zusätzliche Eigenschaften für eine Karte basierend auf Realm-Mechaniken
 * @param {Object} card - Die Karte mit realm-Eigenschaft
 * @param {Object} battleState - Der aktuelle Kampf-Status mit Mechanik-Werten
 * @returns {Object} Objekt mit zusätzlichen Eigenschaften (z.B. {damageAbsorption: 0.15})
 */
function getCardAdditionalProperties(card, battleState) {
  if (!battleState || !battleState.battle) return {};

  const properties = {};
  const realm = card.realm;
  const mechanic = REALM_MECHANICS[realm];

  if (mechanic) {
    // Basis-Mechanik für den Realm - immer verfügbar für Karten aus diesem Realm
    const baseChance = battleState.battle[mechanic] || 0;

    properties[mechanic] = baseChance;
  }

  // Fusion-Mechaniken
  if (battleState.battle.resourcefulAttackRealms?.has(realm)) {
    properties.resourcefulAttack = battleState.battle.resourcefulAttack || 0.5;
  }
  if (battleState.battle.extraAttackRealms?.has(realm)) {
    properties.extraAttackChance = (properties.extraAttackChance || 0) + (battleState.battle.extraAttackChance || 0.04);
  }
  if (battleState.battle.empowermentRealms?.has(realm)) {
    properties.empowerment = battleState.battle.empowerment || 0.025;
  }
  if (battleState.battle.protectionRealms?.has(realm)) {
    properties.protectionChance = (properties.protectionChance || 0) + (battleState.battle.protectionChance || 0.05);
  }
  if (battleState.battle.dodgeRealms?.has(realm)) {
    properties.dodgeChance = (properties.dodgeChance || 0) + (battleState.battle.dodgeChance || 0.025);
  }

  return properties;
}

// Team-Größe anpassen
function adjustTeamSize() {
  const maxSize = State.battleState.battle.slotLimit || 3;
  if (State.team.length > maxSize) {
    // Verschiebe überschüssige Karten zur Reserve
    const excess = State.team.splice(maxSize);
    if (!State.reserve) State.reserve = [];
    State.reserve.unshift(...excess);
  }
}

// Export für andere Module
export {
  State,
  sortDirectionsRoster,
  sortDirectionsBoss,
  combineCardWithSave,
  createCombatCard,
  getCardAdditionalProperties,
  adjustTeamSize
};
