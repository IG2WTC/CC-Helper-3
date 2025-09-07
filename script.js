// script.js - Hauptmodul für Cosmic Battle Simulator
// ===================================================

import { loadCardData, CARD_ID_MAP } from './dataMapping.js';
import { parseSaveString, extractGlobalUpgrades, mapOwnedCardsToCatalog, extractSkills } from './saveParser.js';
import { battleSystem } from './battle.js';
import { calculateBattleStateFromSkills } from './skills.js';

// Neue modulare Imports
import { $, $$, badge, formatPercent, log } from './ui.js';
import {
  State,
  sortDirectionsRoster,
  sortDirectionsBoss,
  combineCardWithSave,
  createCombatCard,
  getCardAdditionalProperties,
  adjustTeamSize
} from './state.js';
import { fmt, getBossSpecialRules, measurePerformanceAsync } from './utils.js';
import { renderBossList as renderBossListUI, toggleStart, addToTeam, renderRoster, renderTeam, debouncedRenderTeam, debouncedRenderRoster, renderBoss } from './ui.js';

/**
 * Initialisiert die Anwendung beim Laden der Seite
 * Lädt Kartendaten, rendert UI-Elemente und bindet Events
 * @async
 */
async function init() {
  await loadCardData();  // holt cards.json und füllt CARD_ID_MAP
  renderRoster();
  renderTeam();
  updateGlobalEffects(); // Globale Effekte auch beim ersten Laden aktualisieren
  renderBossList(); // Bossliste rendern
  wireEvents();
  // Simulation Mode ist standardmäßig aktiv, also Eingabefeld anzeigen
  const simulationInput = $("#simulation-count");
  simulationInput.style.display = "inline-block";
  simulationInput.value = "10";
  const statusEl = $("#status-text");
  if(statusEl) statusEl.textContent = "Bereit";
}
document.addEventListener("DOMContentLoaded", init);

// Lokale renderBossList Funktion mit selectBoss Callback
function renderBossList() {
  renderBossListUI(selectBoss);
  renderBoss(); // Boss mit HP Bar rendern
}

/**
 * Wählt einen Boss aus und aktualisiert die UI
 * Berechnet Boss-Stats und zeigt Spezialregeln an
 * @param {Object} boss - Das Boss-Objekt mit name, attack, hp, etc.
 */
function selectBoss(boss){
  State.selectedBoss = boss;
  $("#boss-name").textContent = boss.name;
  
  // Berechne Boss-Stats
  const bossAttack = battleSystem.calculateBossAttack(boss);
  const bossHp = battleSystem.calculateBossHP(boss);
  $("#boss-stats").textContent = `ATK ${fmt(bossAttack)} · HP ${fmt(bossHp)}`;
  
  // Füge die berechneten Stats zum Boss-Objekt hinzu
  State.selectedBoss.attack = bossAttack;
  State.selectedBoss.hp = bossHp;
  
  $("#boss-art").src = boss.art || "";
  $("#boss-art").alt = boss.name;
  
  // Sonderregeln anzeigen
  const specialRules = getBossSpecialRules(boss);
  const bossInfo = $("#boss-info") || document.createElement("div");
  if (specialRules.length > 0) {
    bossInfo.innerHTML = "<h4>Special Rules:</h4><ul>" + 
      specialRules.map(rule => `<li>${rule}</li>`).join("") + "</ul>";
    bossInfo.id = "boss-info";
    const bossSection = $("#boss-art").parentNode;
    if (!$("#boss-info")) {
      bossSection.appendChild(bossInfo);
    }
  } else {
    if ($("#boss-info")) $("#boss-info").remove();
  }
  
  renderBoss(); // Boss mit HP Bar aktualisieren
  toggleStart();
}

// --- Import / Export --------------------------------------------------------
/**
 * Importiert einen Save-String und aktualisiert den State
 * Parst den Save, extrahiert Karten und Skills, und rendert die UI neu
 * @param {string} raw - Der rohe Save-String aus dem Spiel
 */
function importSaveString(raw){
  try {
    const saveObj = parseSaveString(raw);
    if (!saveObj) throw new Error("Empty Save Object");

    State.parsedSave = saveObj;
    State.ownedCards = saveObj.ownedCards || saveObj.cards || {};
    State.upgrades = extractGlobalUpgrades(saveObj);
    State.skills = extractSkills(saveObj);
    State.battleState = calculateBattleStateFromSkills(State.skills);
    
    const cardsToMap = saveObj.ownedCards || saveObj.cards || {};
    const mappedCards = mapOwnedCardsToCatalog(cardsToMap);
    
    State.team = [];
    
    renderTeam();
    renderRoster();
    updateGlobalEffects(); // Globale Effekte aktualisieren
    toggleStart();
    const statusEl = $("#status-text");
    if(statusEl) statusEl.textContent = "Import successful";
  } catch(e) {
    const statusEl2 = $("#status-text");
    if(statusEl2) statusEl2.textContent = "Import failed: " + e.message;
    console.error("Import error:", e);
  }
}

// --- Events -----------------------------------------------------------------
/**
 * Bindet alle Event-Handler für UI-Interaktionen
 * Behandelt Klicks, Eingaben, Drag & Drop und andere User-Events
 */
function wireEvents(){
  $("#btn-import").addEventListener("click", () => { 
    $("#import-dialog").showModal(); 
    $("#import-text").value = ""; 
  });
  
  $("#btn-import-apply").addEventListener("click", () => { 
    importSaveString($("#import-text").value); 
    $("#import-dialog").close(); 
  });
  
  $("#btn-import-cancel").addEventListener("click", () => $("#import-dialog").close());
  
  $("#btn-reset").addEventListener("click", () => { 
    State.team=[]; 
    State.reserve = []; 
    State.selectedBoss=null; 
    renderTeam(); 
    toggleStart(); 
    $("#battle-log").innerHTML=""; 
  });
  
  $("#btn-start").addEventListener("click", startBattle);
  $("#btn-clear-log").addEventListener("click", () => {
    $("#battle-log").innerHTML = "";
  });
  
  // Simulation mode toggle
  $("#chk-simulation").addEventListener("change", (e) => {
    const simulationInput = $("#simulation-count");
    if (e.target.checked) {
      simulationInput.style.display = "inline-block";
      simulationInput.value = "10"; // Default value
    } else {
      simulationInput.style.display = "none";
      simulationInput.value = "";
    }
  });
  
  // Roster events
  $("#team-search").addEventListener("input", () => { debouncedRenderRoster(); debouncedRenderTeam(); });
  // Custom dropdown for realms
  const dropdownToggle = $("#realm-dropdown-toggle");
  const dropdownMenu = $("#realm-dropdown-menu");
  const allCheckbox = $("#realm-all");

  dropdownToggle.addEventListener("click", () => {
    document.querySelector('.custom-dropdown').classList.toggle('open');
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest('.custom-dropdown')) {
      document.querySelector('.custom-dropdown').classList.remove('open');
    }
  });

  // Handle "All Realms" checkbox
  allCheckbox.addEventListener("change", () => {
    const checkboxes = $$('#realm-dropdown-menu input[type="checkbox"]:not(#realm-all)');
    checkboxes.forEach(cb => cb.checked = allCheckbox.checked);
    updateDropdownText();
    debouncedRenderRoster(); debouncedRenderTeam();
  });

  // Handle individual checkboxes
  $$('#realm-dropdown-menu input[type="checkbox"]:not(#realm-all)').forEach(cb => {
    cb.addEventListener("change", () => {
      const checkboxes = $$('#realm-dropdown-menu input[type="checkbox"]:not(#realm-all)');
      const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
      allCheckbox.checked = checkedCount === checkboxes.length;
      updateDropdownText();
      debouncedRenderRoster(); debouncedRenderTeam();
    });
  });

  function updateDropdownText() {
    const checkboxes = $$('#realm-dropdown-menu input[type="checkbox"]:not(#realm-all)');
    const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
    if (allCheckbox.checked || checkedCount === checkboxes.length) {
      dropdownToggle.textContent = "All Realms";
    } else if (checkedCount === 0) {
      dropdownToggle.textContent = "No Realms";
    } else if (checkedCount === 1) {
      const checked = Array.from(checkboxes).find(c => c.checked);
      const label = checked.parentElement.textContent.trim();
      dropdownToggle.textContent = label;
    } else {
      dropdownToggle.textContent = `${checkedCount} Realms`;
    }
  }

  // Initial update
  updateDropdownText();
  $("#team-sort").addEventListener("change", () => {
    const sortBy = $("#team-sort").value;
    const direction = sortDirectionsRoster[sortBy] || 1;
    $("#toggle-sort-direction-roster").textContent = direction === 1 ? "↑" : "↓";
    debouncedRenderRoster(); debouncedRenderTeam();
  });
  $("#toggle-sort-direction-roster").addEventListener("click", () => {
    const sortBy = $("#team-sort").value;
    sortDirectionsRoster[sortBy] *= -1;
    const direction = sortDirectionsRoster[sortBy];
    $("#toggle-sort-direction-roster").textContent = direction === 1 ? "↑" : "↓";
    debouncedRenderRoster(); debouncedRenderTeam();
  });
  
  // Boss events
  $("#search").addEventListener("input", renderBossList);
  $("#boss-realm-filters").addEventListener("change", renderBossList);
  $("#sort").addEventListener("change", () => {
    const sortBy = $("#sort").value;
    const direction = sortDirectionsBoss[sortBy] || 1;
    $("#toggle-sort-direction-boss").textContent = direction === 1 ? "↑" : "↓";
    renderBossList();
  });
  $("#toggle-sort-direction-boss").addEventListener("click", () => {
    const sortBy = $("#sort").value;
    sortDirectionsBoss[sortBy] *= -1;
    const direction = sortDirectionsBoss[sortBy];
    $("#toggle-sort-direction-boss").textContent = direction === 1 ? "↑" : "↓";
    renderBossList();
  });

  // Datei-Upload für Spielstand
  $("#import-file").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { $("#import-text").value = reader.result; };
    reader.readAsText(file);
  });

  // Locked card dialog events
  $("#locked-save").addEventListener("click", () => {
    const card = window.currentLockedCard;
    if (!card) return;
    const level = parseInt($("#locked-level").value) || 1;
    const tier = parseInt($("#locked-tier").value) || 1;
    const quantity = parseInt($("#locked-quantity").value) || 1;
    State.ownedCards[card.id] = { level, tier, quantity, locked: false };
    $("#locked-card-dialog").close();
    addToTeam(card, renderTeam, toggleStart);
    debouncedRenderRoster(); // Aktualisiere die Cards-Anzeige
  });

  $("#locked-cancel").addEventListener("click", () => {
    $("#locked-card-dialog").close();
  });
}

/**
 * Startet einen Kampf oder eine Simulation
 * Bereitet Kampf-Parameter vor und führt Einzelkampf oder Mehrfachsimulation aus
 */
function startBattle(){
  // HP Bars initialisieren
  initializeHPBars();
  
  const isSimulation = $("#chk-simulation").checked;
  let simulationCount = parseInt($("#simulation-count").value) || 1;
  
  // Limit simulation count to 500
  if (simulationCount > 500) {
    simulationCount = 500;
    $("#simulation-count").value = 500; // Update the input field
    log("Simulation count limited to 500 for performance reasons.", "info");
  }
  
  if (isSimulation && simulationCount > 1) {
    // Simulation mode - measure performance
    measurePerformanceAsync(`Simulation (${simulationCount} battles)`, () => runSimulations(simulationCount));
  } else {
    // Single battle
    const fast = $("#chk-fast") && $("#chk-fast").checked;
    
    // Calculate log frequency based on expected battle length
    let logFrequency = 1;
    if (!isSimulation) {
      const sumATK = State.team.reduce((sum, c) => sum + battleSystem.calculateAttackPower(c, State.upgrades), 0);
      const bossHP = battleSystem.calculateBossHP(State.selectedBoss);
      const ratio = bossHP / sumATK;
      logFrequency = Math.max(1, Math.floor(ratio / 100) * 5);
    }
    
    // Measure single battle performance
    measurePerformanceAsync(`Single Battle vs ${State.selectedBoss.name}`, () =>
      battleSystem.startBattle(State.team, State.selectedBoss, fast, State.upgrades, State.reserve, logFrequency, State.battleState)
    ).then(result => {
        // Aktualisiere Boss HP nach dem Kampf
        if (State.selectedBoss) {
          State.selectedBoss.curHp = result.bossHealth;
        }
        renderBoss(); // Boss HP Bar aktualisieren
        
        // Add info message if log frequency > 1
        if (logFrequency > 1 && !isSimulation) {
          result.logs.push("Info: The big Number of Log calls would cause lag spikes so we group them. The calculated result is still the same. Simulation Mode should not have this Problem.");
        }
        
        // Loggen der Ergebnisse
        result.logs.forEach(logLine => {
          if (logLine.startsWith("—")) {
            log(logLine);
          } else {
            const cls = logLine.includes('hits for') ? 'damage-boss' : 
                       logLine.includes('got hit') ? 'damage-team' : 
                       logLine.includes('beaten') ? 'kill' : 
                       logLine.includes('moves up!') ? 'info' : 
                       logLine.includes('misses!') ? 'miss' : 
                       '';
            log(logLine, cls);
          }
        });
      })
      .catch(error => {
        console.error("Battle error:", error);
        log("Battle error: " + error.message, "error");
      });
  }
}

/**
 * Führt mehrere Kampfsimulationen aus und zeigt Statistiken an
 * @param {number} count - Anzahl der auszuführenden Simulationen
 */
async function runSimulations(count) {
  log(`Starting ${count} battle simulations...`);
  log(""); // Empty line
  
  let victories = 0;
  let totalTeamHpRemaining = 0;
  let totalBossHpRemaining = 0;
  let totalRounds = 0;
  
  for (let i = 1; i <= count; i++) {
    try {
      const result = await battleSystem.startBattle(
        State.team, 
        State.selectedBoss, 
        true, // Always fast mode for simulations
        State.upgrades, 
        State.reserve,
        1, // logFrequency
        State.battleState
      );
      
      // Log fight result
      const fightHeader = `Fight ${i}`;
      log(fightHeader, "info");
      
      // Show result with color
      const resultText = result.result;
      const resultClass = result.result === "Victory" ? "victory" : "defeat";
      log(`Result: ${resultText}!`, resultClass);
      
      // Show surviving team members with HP
      if (result.finalTeam && result.finalTeam.length > 0) {
        const survivors = result.finalTeam.filter(c => c.curHp > 0);
        if (survivors.length > 0) {
          survivors.forEach(card => {
            log(`${card.name}: ${fmt(card.curHp)}/${fmt(card.hp)} HP`, "info");
          });
          totalTeamHpRemaining += survivors.reduce((sum, c) => sum + c.curHp, 0);
        }
      }
      
      // Update statistics
      if (result.result === "Victory") victories++;
      totalBossHpRemaining += result.bossHealth;
      totalRounds += result.logs.filter(line => line.startsWith("— Round")).length;
      
      if (i < count) log(""); // Empty line between fights
      
    } catch (error) {
      log(`Fight ${i} error: ${error.message}`, "error");
    }
  }
  
  // Show final statistics
  log("");
  log("=== SIMULATION RESULTS ===", "info");
  log(`Total Fights: ${count}`, "info");
  log(`Victories: ${victories}`, "victory");
  log(`Defeats: ${count - victories}`, "defeat");
  log(`Win Rate: ${((victories / count) * 100).toFixed(1)}%`, victories > count/2 ? "victory" : "defeat");
  
  if (victories > 0) {
    log(`Average Team HP Remaining: ${fmt(totalTeamHpRemaining / victories)}`, "info");
  }
  log(`Average Boss HP Remaining: ${fmt(totalBossHpRemaining / count)}`, "info");
}

// Export für ui.js
export { selectBoss };
/**
 * Aktualisiert die Anzeige der globalen Effekte in der UI
 * Zeigt Crit-Chance, Crit-Damage und maximale Team-Größe an
 */
function updateGlobalEffects(){
  const critChanceEl = $("#global-crit-chance");
  const critDamageEl = $("#global-crit-damage");
  const teamSizeEl = $("#global-team-size");

  if (!State.battleState || !State.battleState.battle) {
    if (critChanceEl) critChanceEl.textContent = "0%";
    if (critDamageEl) critDamageEl.textContent = "0%";
    if (teamSizeEl) teamSizeEl.textContent = "3";
    return;
  }

  const battle = State.battleState.battle;

  if (critChanceEl) {
    critChanceEl.textContent = battle.critChance > 0 ? `+${(battle.critChance * 100).toFixed(1)}%` : "0%";
  }
  if (critDamageEl) {
    critDamageEl.textContent = battle.critDamage > 0 ? `+${(battle.critDamage * 100).toFixed(0)}%` : "0%";
  }
  if (teamSizeEl) {
    teamSizeEl.textContent = battle.slotLimit || 6;
  }
}

// HP Bars initialisieren
function initializeHPBars() {
  // Team HP Bars initialisieren
  State.team.forEach(card => {
    card.maxHp = card.hp; // Ursprüngliches HP als max HP speichern
  });
  
  // Boss HP Bar initialisieren
  if (State.selectedBoss) {
    State.selectedBoss.maxHp = State.selectedBoss.hp;
  }
  
  // UI aktualisieren
  renderTeam();
  renderBoss();
}

// HP Bars während des Kampfes aktualisieren
function updateHPBars(teamCards, bossCard) {
  // Team HP Bars aktualisieren
  teamCards.forEach((card, index) => {
    if (State.team[index]) {
      State.team[index].hp = card.hp;
    }
  });
  
  // Boss HP Bar aktualisieren
  if (bossCard && State.selectedBoss) {
    State.selectedBoss.hp = bossCard.hp;
  }
  
  // UI aktualisieren
  renderTeam();
  renderBoss();
}
