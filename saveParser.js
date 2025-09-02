// saveParser.js - Komplette überarbeitete Version
import { CARD_ID_MAP } from './dataMapping.js';

export function parseSaveString(raw) {
  let text = raw.trim();
  try {
    return JSON.parse(text);
  } catch(e) {
    throw new Error("Ungültiges JSON-Format: " + e.message);
  }
}

export function extractGlobalUpgrades(saveObj) {
  return {
    globalAttackMult: saveObj.battle?.globalAttackMult || saveObj.upgrades?.globalAttackMult || 1.0,
    globalHPMult: saveObj.battle?.globalHPMult || saveObj.upgrades?.globalHPMult || 1.0
  };
}

export function extractSkills(saveObj) {
  const skills = {};
  const purchasedSkills = saveObj.purchasedSkills || [];
  
  // Konvertiere das Array in ein Objekt mit Skill-IDs als Keys
  purchasedSkills.forEach(skillId => {
    skills[skillId] = true;
  });
  
  return skills;
}

export function mapOwnedCardsToCatalog(ownedCards) {
  if (!ownedCards) return [];
  
  let entries = [];
  if (Array.isArray(ownedCards)) {
    entries = ownedCards;
  } else if (typeof ownedCards === 'object') {
    entries = Object.entries(ownedCards).map(([id, data]) => ({ id, ...data }));
  } else {
    return [];
  }
  
  return entries.map(saveEntry => {
    const id = String(saveEntry.id);
    const baseMeta = CARD_ID_MAP[id];
    if (!baseMeta) return null;
    
    return {
      ...baseMeta,
      level: saveEntry.lvl || saveEntry.level || baseMeta.level || 1,
      tier: saveEntry.tier || baseMeta.tier || 1,
      quantity: saveEntry.qty || saveEntry.quantity || baseMeta.quantity || 1,
      locked: saveEntry.locked || false,
      lvl: saveEntry.lvl || saveEntry.level || baseMeta.level || 1,
      qty: saveEntry.qty || saveEntry.quantity || baseMeta.quantity || 1
    };
  }).filter(Boolean);
}

// Neue Funktion zum Erstellen einer .txt-Datei mit den verarbeiteten Daten
export function generateSaveDataTxt(saveObj, ownedCards, globalUpgrades, mappedCards) {
  let txtContent = "=== SAVE PARSER OUTPUT ===\n\n";
  
  txtContent += "1. Parsed Save Object:\n";
  txtContent += JSON.stringify(saveObj, null, 2) + "\n\n";
  
  txtContent += "2. Owned Cards from Save:\n";
  txtContent += JSON.stringify(ownedCards, null, 2) + "\n\n";
  
  txtContent += "3. Extracted Global Upgrades:\n";
  txtContent += JSON.stringify(globalUpgrades, null, 2) + "\n\n";
  
  txtContent += "4. Mapped Cards to Catalog:\n";
  txtContent += JSON.stringify(mappedCards, null, 2) + "\n\n";
  
  // Erstelle Blob und Download-Link
  const blob = new Blob([txtContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'save_parser_output.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Hauptfunktion zum Verarbeiten eines gespeicherten Spiels
export function processSave(rawSave) {
  const saveObj = parseSaveString(rawSave);
  const globalUpgrades = extractGlobalUpgrades(saveObj);
  const ownedCards = saveObj.cards; // oder wie auch immer die Owned Cards extrahiert werden
  const mappedCards = mapOwnedCardsToCatalog(ownedCards);
  generateSaveDataTxt(saveObj, ownedCards, globalUpgrades, mappedCards);
}