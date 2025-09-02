// ui.js - DOM-Manipulation und Rendering
// ========================================
// Verantwortlich für alle UI-Rendering-Funktionen, DOM-Manipulation
// und User-Interface-Interaktionen des Cosmic Battle Simulators

// Imports für Rendering-Funktionen
import { CARD_ID_MAP } from './dataMapping.js';
import { battleSystem } from './battle.js';
import { State, sortDirectionsBoss, sortDirectionsRoster, combineCardWithSave, createCombatCard, getCardAdditionalProperties } from './state.js';
import { fmt, getBossSpecialRules } from './utils.js';

// Debounced rendering to prevent excessive re-renders
let renderTimeout = null;
let rosterTimeout = null;
function debouncedRenderTeam() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    renderTeam();
  }, 10); // Small delay to batch rapid changes
}

function debouncedRenderRoster() {
  if (rosterTimeout) clearTimeout(rosterTimeout);
  rosterTimeout = setTimeout(() => {
    renderRoster();
  }, 10); // Small delay to batch rapid changes
}

// DOM-Helper
/**
 * DOM querySelector shortcut - findet ein einzelnes Element
 * @param {string} sel - CSS-Selektor
 * @returns {Element|null} Das gefundene Element oder null
 */
const $ = sel => document.querySelector(sel);

/**
 * DOM querySelectorAll shortcut - findet alle passenden Elemente
 * @param {string} sel - CSS-Selektor
 * @returns {NodeList} Liste der gefundenen Elemente
 */
const $$ = sel => document.querySelectorAll(sel);

// Badge-Funktion für Skill-Anzeigen
/**
 * Erstellt ein Badge-Element für Skill-Anzeigen
 * @param {string} text - Der anzuzeigende Text
 * @param {string} cls - Zusätzliche CSS-Klassen
 * @param {string} tooltip - Tooltip-Text für Hover
 * @returns {HTMLSpanElement} Das erstellte Badge-Element
 */
function badge(text, cls="", tooltip=""){
  const s = document.createElement("span");
  s.className = `badge ${cls}`;
  s.textContent = text;
  if(tooltip) s.title = tooltip;
  return s;
}

// Prozent-Formatierung
/**
 * Formatiert einen Dezimalwert als Prozentzahl
 * Rundet auf 1 Dezimalstelle und entfernt .0 bei Ganzzahlen
 * @param {number} value - Dezimalwert (0.15 = 15%)
 * @returns {string} Formatierte Prozentzahl mit %-Symbol
 */
function formatPercent(value) {
  const percent = value * 100;
  const rounded = Math.round(percent * 10) / 10; // Runde auf 1 Dezimalstelle
  return rounded % 1 === 0 ? rounded.toFixed(0) + '%' : rounded.toFixed(1) + '%';
}

// Logging-Funktion
/**
 * Fügt eine Log-Nachricht zum Battle-Log hinzu
 * @param {string} line - Die Log-Nachricht
 * @param {string} cls - CSS-Klasse für Styling (victory, defeat, info, etc.)
 */
function log(line, cls=""){
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = line;
  $("#battle-log").appendChild(el);
  $("#battle-log").scrollTop = $("#battle-log").scrollHeight;
}

// Export für andere Module
export { $, $$, badge, formatPercent, log };

// Boss-Liste rendern
function renderBossList(selectBossCallback = null) {
  const wrap = $("#boss-list");
  wrap.innerHTML = "";

  const search = ($("#search")?.value || "").toLowerCase();
  const sortBy = $("#sort")?.value || "name";
  const selectedBossRealms = Array.from(document.querySelectorAll('#boss-realm-filters input:checked')).map(cb => parseInt(cb.value));

  let bosses = Object.values(CARD_ID_MAP)
    .filter(boss => selectedBossRealms.includes(boss.realm) && (!search || boss.name.toLowerCase().includes(search)))
    .sort((a, b) => {
      const direction = sortDirectionsBoss[sortBy] || 1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * direction;
      if (sortBy === "realm") return (a.realm - b.realm) * direction;
      if (sortBy === "attack") {
        const aAtk = battleSystem.calculateBossAttack(a);
        const bAtk = battleSystem.calculateBossAttack(b);
        return (aAtk - bAtk) * direction;
      }
      if (sortBy === "hp") {
        const aHp = battleSystem.calculateBossHP(a);
        const bHp = battleSystem.calculateBossHP(b);
        return (aHp - bHp) * direction;
      }
      return 0;
    });

  bosses.forEach(boss => {
    const tpl = $("#tpl-boss").content.firstElementChild.cloneNode(true);
    tpl.querySelector(".art").src = boss.art;
    tpl.querySelector(".art").alt = boss.name;
    tpl.querySelector(".title").textContent = boss.name;
    const bossAttack = battleSystem.calculateBossAttack(boss);
    const bossHp = battleSystem.calculateBossHP(boss);
    tpl.querySelector(".sub").textContent = `ATK ${fmt(bossAttack)} · HP ${fmt(bossHp)}`;

    // Sonderregeln hinzufügen
    const specialRules = getBossSpecialRules(boss);
    const badgesContainer = tpl.querySelector(".badges");
    if (specialRules.length > 0) {
      specialRules.forEach(rule => {
        const badge = document.createElement("span");
        badge.className = "badge warn";
        badge.textContent = "Special";
        badge.title = rule; // Tooltip mit der Regel
        badgesContainer.appendChild(badge);
      });
    }

    tpl.querySelector(".select-boss").addEventListener("click", () => {
      if (selectBossCallback) {
        selectBossCallback(boss);
      } else {
        console.log("Boss selected:", boss.name);
      }
    });
    wrap.appendChild(tpl);
  });

  // Update toggle button text
  const direction = sortDirectionsBoss[sortBy] || 1;
  $("#toggle-sort-direction-boss").textContent = direction === 1 ? "↑" : "↓";
}

// Export der Rendering-Funktion
export { renderBossList };

// Start-Button Status aktualisieren
function toggleStart(){
  $("#btn-start").disabled = !(State.team.length && State.selectedBoss);
}

// Export der UI-Funktion
export { toggleStart };

// Karte zum Team hinzufügen
function addToTeam(card, renderTeamCallback = () => {}, toggleStartCallback = () => {}){
  const ownedData = State.ownedCards[card.id];
  const cardWithSave = combineCardWithSave(card, ownedData);
  const combatCard = createCombatCard(cardWithSave, State.upgrades);

  const maxTeamSize = State.battleState.battle.slotLimit || 6;
  if (State.team.length < maxTeamSize) {
    State.team.push(combatCard);
  } else {
    State.reserve = State.reserve || [];
    State.reserve.push(combatCard);
  }
  renderTeamCallback();
  toggleStartCallback();
  renderRoster();
  renderBoss(); // Boss auch aktualisieren
}

// Export der Team-Funktion
export { addToTeam };

// Karte mit Animation entfernen
function removeCardFromTeam(index, withAnimation = true) {
  if (index < 0 || index >= State.team.length) return;
  
  const cardElement = document.querySelector(`#team-list li[data-index="${index}"]`);
  
  if (withAnimation && cardElement) {
    // Death Animation anwenden
    cardElement.classList.add('card-dying');
    
    // Nach Animation entfernen
    setTimeout(() => {
      State.team.splice(index, 1);
      
      // Reserve-Karte nachrücken lassen
      if (State.reserve && State.reserve.length > 0) {
        const newCard = State.reserve.shift();
        newCard.isNew = true; // Markierung für Slide-In Animation
        State.team.push(newCard);
      }
      
      debouncedRenderTeam();
      toggleStart();
      renderRoster();
      renderBoss();
    }, 800); // 800ms für Death Animation
  } else {
    // Sofort entfernen ohne Animation
    State.team.splice(index, 1);
    
    // Reserve-Karte nachrücken lassen
    if (State.reserve && State.reserve.length > 0) {
      State.team.push(State.reserve.shift());
    }
    
    debouncedRenderTeam();
    toggleStart();
    renderRoster();
    renderBoss();
  }
}

// Export der Remove-Funktion
export { removeCardFromTeam };

// Boss mit HP Bar rendern
function renderBoss(){
  const bossArt = $("#boss-art");
  const bossName = $("#boss-name");
  const bossStats = $("#boss-stats");
  const bossInfo = $("#boss-info");
  
  if (!State.selectedBoss) {
    bossArt.src = "";
    bossName.textContent = "Kein Boss gewählt";
    bossStats.innerHTML = "";
    bossInfo.innerHTML = "";
    return;
  }
  
  const boss = State.selectedBoss;
  bossArt.src = boss.art;
  bossArt.alt = boss.name;
  bossName.textContent = boss.name;
  
  // Boss Stats mit HP Bar
  bossStats.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong>ATK:</strong> ${fmt(boss.attack)} | <strong>HP:</strong> ${fmt(boss.hp)}
    </div>
  `;
  
  // HP Bar für Boss
  const hpBarContainer = document.createElement("div");
  hpBarContainer.className = "hp-bar-container";
  hpBarContainer.style.marginBottom = "8px";
  
  const hpBar = document.createElement("div");
  hpBar.className = "hp-bar";
  
  // Berechne HP-Prozentsatz
  const maxHp = boss.hp; // Ursprüngliches HP als max HP
  const hpPercent = Math.max(0, Math.min(100, (boss.hp / maxHp) * 100));
  
  hpBar.style.width = `${hpPercent}%`;
  hpBar.style.backgroundColor = hpPercent > 60 ? '#2ecc71' : hpPercent > 30 ? '#ffb144' : '#ff5e6a';
  
  const hpText = document.createElement("div");
  hpText.className = "hp-text";
  hpText.textContent = `${fmt(boss.hp)}/${fmt(maxHp)} HP`;
  
  hpBarContainer.appendChild(hpBar);
  hpBarContainer.appendChild(hpText);
  bossStats.appendChild(hpBarContainer);
  
  // Boss Info (Realm, etc.)
  bossInfo.innerHTML = `
    <div><strong>Realm:</strong> ${boss.realm}</div>
    <div><strong>Level:</strong> ${boss.level || 1}</div>
  `;
}

// Export der Boss-Funktion
export { renderBoss };

// Roster (Karten-Liste) rendern
/**
 * Rendert die Karten-Liste (Roster) mit Filter- und Sortieroptionen
 * Zeigt alle verfügbaren Karten mit Such-, Realm- und Sortierfiltern an
 */
function renderRoster(){
  const wrap = $("#player-cards");
  wrap.innerHTML = "";

  const search = ($("#team-search")?.value || "").toLowerCase();
  const sortBy = $("#team-sort")?.value || "name";
  const selectedRealms = Array.from(document.querySelectorAll('#realm-dropdown-menu input:checked')).map(cb => cb.value).filter(v => v !== 'all');
  const showLocked = $("#locked-filter")?.checked;

  let cards = Object.values(CARD_ID_MAP).map(card => combineCardWithSave(card, State.ownedCards[card.id])).filter(card => {
    if (search && !card.name.toLowerCase().includes(search)) return false;
    if (selectedRealms.length > 0 && !selectedRealms.includes(card.realm.toString())) return false;
    if (!showLocked && card.locked) return false;
    return true;
  }).sort((a, b) => {
    const direction = sortDirectionsRoster[sortBy] || 1;
    if (sortBy === "name") return a.name.localeCompare(b.name) * direction;
    if (sortBy === "realm") return (a.realm - b.realm) * direction;
    if (sortBy === "attack") {
      const aAtk = battleSystem.calculateAttackPower(a, State.upgrades);
      const bAtk = battleSystem.calculateAttackPower(b, State.upgrades);
      return (aAtk - bAtk) * direction;
    }
    if (sortBy === "hp") {
      const aHp = battleSystem.calculateHP(a, State.upgrades);
      const bHp = battleSystem.calculateHP(b, State.upgrades);
      return (aHp - bHp) * direction;
    }
    return 0;
  });

  cards.forEach(card => {
    const tpl = $("#tpl-card").content.firstElementChild.cloneNode(true);

    const teamCard = State.team.find(c => c.id === card.id);
    const reserveCard = State.reserve?.find(c => c.id === card.id);
    const isAlreadyAdded = teamCard || reserveCard;
    
    let displayAttack, displayHp;
    if (teamCard) {
      displayAttack = teamCard.attack;
      displayHp = teamCard.hp;
    } else {
      const cardWithSave = combineCardWithSave(card, State.ownedCards[card.id]);
      displayAttack = battleSystem.calculateAttackPower(cardWithSave, State.upgrades);
      displayHp = battleSystem.calculateHP(cardWithSave, State.upgrades);
    }

    // Check if card has missing stats (NaN values or locked) or is already added
    const hasMissingStats = isNaN(displayAttack) || isNaN(displayHp) || card.locked;
    const shouldDisable = hasMissingStats || isAlreadyAdded;
    if(shouldDisable) tpl.classList.add('locked');

    tpl.querySelector(".art").src = card.art;
    tpl.querySelector(".art").alt = card.name;
    tpl.querySelector(".title").textContent = card.name;
    tpl.querySelector(".atk").textContent = `ATK ${fmt(displayAttack)}`;
    tpl.querySelector(".hp").textContent = `HP ${fmt(displayHp)}`;

    const flags = tpl.querySelector(".flags");
    if(card.notes?.length) flags.appendChild(badge("Unsicher", "info"));

    // Zusätzliche Eigenschaften aus Skills anzeigen
    const additionalProps = getCardAdditionalProperties(card, State.battleState);
    for (const [prop, value] of Object.entries(additionalProps)) {
      let label = prop;
      let displayValue = formatPercent(value);
      let tooltip = "";

      switch(prop) {
        case 'dodgeChance':
          label = 'D';
          tooltip = `Dodge: ${displayValue} chance to avoid attacks`;
          break;
        case 'stunChance':
          label = 'S';
          tooltip = `Stun: ${displayValue} chance to stun the enemy card, forcing it to miss its next attack (stuns stack)`;
          break;
        case 'damageAbsorption':
          label = 'A';
          tooltip = `Damage Absorption: Reduces damage taken by ${displayValue}`;
          break;
        case 'protectionChance':
          label = 'P';
          tooltip = `Protection: ${displayValue} chance to reduce damage to Card in Front by 50%`;
          break;
        case 'evolutionChance':
          label = 'E';
          tooltip = `Evolution Chance: ${displayValue} chance to gain attack equal to half that percentage on each attack (stacks multiplicatively)`;
          break;
        case 'extraAttackChance':
          label = 'EA';
          tooltip = `Extra Attack: ${displayValue} chance for attack again (can proc multiple times)`;
          break;
        case 'empowerment':
          label = 'Em';
          tooltip = `Empowerment: Increases damage of Card behind by ${displayValue}`;
          break;
        case 'weakPointChance':
          label = 'WP';
          tooltip = `Weak Point: On Critical Hit ${displayValue} chance to deal extra damage equal to 1% of enemy current health`;
          break;
        case 'dismemberChance':
          label = 'Di';
          tooltip = `Dismember: On Critical Hit ${displayValue} chance to reduce enemy attack by 1% (stacks multiplicatively)`;
          break;
        case 'resourcefulAttack':
          label = 'RA';
          displayValue = value;
          tooltip = `Resourceful Attack: Gain resources equal to ${displayValue} Pokes on attack`;
          break;
      }

      flags.appendChild(badge(`${label} ${displayValue}`, "skill", tooltip));
    }

    tpl.querySelector(".add-to-team").addEventListener("click", () => {
      if(hasMissingStats){
        const dialogTitle = card.locked ? "Locked Card" : "Missing Stats";
        const dialogText = card.locked
          ? "In your Save this Card is currently locked. If you want you can still use it but you might have to insert missing Stats:"
          : "This Card is missing important Stats. You can add them yourself:";

        $("#locked-card-dialog").querySelector("h3").textContent = dialogTitle;
        $("#locked-card-dialog").querySelector("p").textContent = dialogText;

        $("#locked-card-dialog").showModal();
        $("#locked-level").value = State.ownedCards[card.id]?.level || 1;
        $("#locked-tier").value = State.ownedCards[card.id]?.tier || 1;
        $("#locked-quantity").value = State.ownedCards[card.id]?.quantity || 1;
        window.currentLockedCard = card;
      } else if (isAlreadyAdded) {
        // Karte ist bereits hinzugefügt - nichts tun
        return;
      } else {
        addToTeam(card, renderTeam, toggleStart);
      }
    });

    // Button-Text ändern wenn Karte bereits hinzugefügt
    const addButton = tpl.querySelector(".add-to-team");
    if (isAlreadyAdded) {
      addButton.textContent = "Already Added";
      addButton.disabled = true;
    } else if (hasMissingStats) {
      addButton.textContent = card.locked ? "Locked" : "Missing Stats";
      addButton.disabled = false; // Button aktiv lassen, damit Popup erscheint
    } else {
      addButton.textContent = "Add";
      addButton.disabled = false;
    }
    wrap.appendChild(tpl);
  });

  // Update toggle button text
  const direction = sortDirectionsRoster[sortBy] || 1;
  $("#toggle-sort-direction-roster").textContent = direction === 1 ? "↑" : "↓";
}

// Team rendern
/**
 * Rendert das aktuelle Team mit Drag & Drop Funktionalität
 * Zeigt Team-Karten und Reserve-Karten mit allen Interaktionsmöglichkeiten
 */
function renderTeam(){
  const ul = $("#team-list");
  ul.innerHTML = "";
  
  // Make the list a drop zone
  ul.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  
  ul.addEventListener("drop", (e) => {
    e.preventDefault();
    const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
    
    if (dragData.type === "reserve") {
      // Karte von der Reserve ans Ende des Teams verschieben
      const draggedIndex = State.reserve.findIndex(card => card.id === dragData.cardId);
      if (draggedIndex !== -1) {
        const draggedCard = State.reserve[draggedIndex];
        State.reserve.splice(draggedIndex, 1);
        State.team.push(draggedCard);
        debouncedRenderTeam();
        toggleStart();
        renderRoster(); // Roster aktualisieren, damit "Already Added" sichtbar wird
        renderBoss();
        renderBoss();
      }
    }
  });

  // Verwende die ursprüngliche Team-Reihenfolge ohne Filter/Sortierung
  State.team.forEach((c, idx) => {
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.index = idx;
    li.dataset.type = "team";
    
    // Neue Karten bekommen eine Slide-In Animation
    if (c.isNew) {
      li.classList.add('card-sliding');
      setTimeout(() => {
        li.classList.remove('card-sliding');
        delete c.isNew;
      }, 500);
    }
    
    const img = document.createElement("img");
    img.src = c.art;
    img.alt = c.name;
    li.appendChild(img);
    
    // Zusätzliche Eigenschaften aus Skills anzeigen
    const additionalProps = getCardAdditionalProperties(c, State.battleState);
    let propText = '';
    for (const [prop, value] of Object.entries(additionalProps)) {
      let label = prop;
      let displayValue = formatPercent(value);
      switch(prop) {
        case 'dodgeChance': label = 'D'; break;
        case 'stunChance': label = 'S'; break;
        case 'damageAbsorption': label = 'A'; break;
        case 'protectionChance': label = 'P'; break;
        case 'evolutionChance': label = 'E'; break;
        case 'extraAttackChance': label = 'EA'; break;
        case 'empowerment': label = 'Em'; break;
        case 'weakPointChance': label = 'WP'; break;
        case 'dismemberChance': label = 'Di'; break;
        case 'resourcefulAttack': 
          label = 'RA'; 
          displayValue = value;
          break;
      }
      propText += ` ${label}${displayValue}`;
    }
    
    li.appendChild(document.createTextNode(`${idx+1}. ${c.name} (ATK ${fmt(c.attack)} · HP ${fmt(c.hp)})${propText}`));
    
    // HP Bar hinzufügen
    const hpBarContainer = document.createElement("div");
    hpBarContainer.className = "hp-bar-container";
    hpBarContainer.style.marginTop = "4px";
    
    const hpBar = document.createElement("div");
    hpBar.className = "hp-bar";
    
    // Berechne HP-Prozentsatz (angenommen max HP ist das ursprüngliche HP)
    const maxHp = c.hp; // Hier könntest du auch einen separaten maxHp Wert speichern
    const hpPercent = Math.max(0, Math.min(100, (c.hp / maxHp) * 100));
    
    hpBar.style.width = `${hpPercent}%`;
    hpBar.style.backgroundColor = hpPercent > 60 ? '#2ecc71' : hpPercent > 30 ? '#ffb144' : '#ff5e6a';
    
    const hpText = document.createElement("div");
    hpText.className = "hp-text";
    hpText.textContent = `${fmt(c.hp)}/${fmt(maxHp)} HP`;
    
    hpBarContainer.appendChild(hpBar);
    hpBarContainer.appendChild(hpText);
    li.appendChild(hpBarContainer);
    
    const btn = document.createElement("button");
    btn.className = "btn tiny";
    btn.textContent = "Remove";
    btn.style.marginLeft = "8px";
    btn.addEventListener("click", () => {
      const realIdx = State.team.indexOf(c);
      removeCardFromTeam(realIdx, true); // Mit Animation entfernen
    });
    li.appendChild(btn);
    
    // Drag and Drop Event Handler
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ cardId: c.id, type: "team" }));
      li.classList.add("dragging");
    });
    
    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
    });
    
    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingElement = document.querySelector(".dragging");
      if (draggingElement && draggingElement !== li) {
        const rect = li.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
          li.parentNode.insertBefore(draggingElement, li);
        } else {
          li.parentNode.insertBefore(draggingElement, li.nextSibling);
        }
      }
    });
    
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
      
      if (dragData.type === "team") {
        // Finde die aktuelle Position der gezogenen Karte
        const draggedIndex = State.team.findIndex(card => card.id === dragData.cardId);
        
        // Finde die Zielposition basierend auf der DOM-Position
        const allLis = Array.from(ul.children);
        const targetIndex = allLis.indexOf(li);
        
        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
          // Reorder the State.team array
          const draggedCard = State.team[draggedIndex];
          State.team.splice(draggedIndex, 1);
          State.team.splice(targetIndex, 0, draggedCard);
          
          debouncedRenderTeam();
          toggleStart();
          renderRoster(); // Roster aktualisieren nach Reordering
          renderBoss();
        }
      } else if (dragData.type === "reserve") {
        // Karte von der Reserve ins Team verschieben
        const draggedIndex = State.reserve.findIndex(card => card.id === dragData.cardId);
        const allLis = Array.from(ul.children);
        const targetIndex = allLis.indexOf(li);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          const draggedCard = State.reserve[draggedIndex];
          State.reserve.splice(draggedIndex, 1);
          State.team.splice(targetIndex, 0, draggedCard);
          
          debouncedRenderTeam();
          toggleStart();
        }
      }
    });
    
    ul.appendChild(li);
  });

  const reserveUl = $("#reserve-list");
  if (reserveUl) {
    reserveUl.innerHTML = "";
    
    // Make the reserve list a drop zone
    reserveUl.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    
    reserveUl.addEventListener("drop", (e) => {
      e.preventDefault();
      const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
      
      if (dragData.type === "team") {
        // Karte vom Team ans Ende der Reserve verschieben
        const draggedIndex = State.team.findIndex(card => card.id === dragData.cardId);
        if (draggedIndex !== -1) {
          const draggedCard = State.team[draggedIndex];
          State.team.splice(draggedIndex, 1);
          State.reserve.push(draggedCard);
          debouncedRenderTeam();
          toggleStart();
        }
      }
    });
    (State.reserve || []).forEach((c, idx) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.dataset.index = idx;
      li.dataset.type = "reserve";
      
      const img = document.createElement("img");
      img.src = c.art;
      img.alt = c.name;
      li.appendChild(img);
      li.appendChild(document.createTextNode(`${c.name} (ATK ${fmt(c.attack)} · HP ${fmt(c.hp)})`));
      
      const btn = document.createElement("button");
      btn.className = "btn tiny";
      btn.textContent = "Remove";
      btn.style.marginLeft = "8px";
      btn.addEventListener("click", () => {
        State.reserve.splice(idx,1);
        debouncedRenderTeam();
        toggleStart();
        renderRoster(); // Roster aktualisieren, damit entfernte Karten wieder hinzugefügbar werden
        renderBoss();
      });
      li.appendChild(btn);
      
      // Drag and Drop Event Handler für Reserve
      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ cardId: c.id, type: "reserve" }));
        li.classList.add("dragging");
      });
      
      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
      });
      
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggingElement = document.querySelector(".dragging");
        if (draggingElement && draggingElement !== li) {
          const rect = li.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (e.clientY < midpoint) {
            li.parentNode.insertBefore(draggingElement, li);
          } else {
            li.parentNode.insertBefore(draggingElement, li.nextSibling);
          }
        }
      });
      
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
        
        if (dragData.type === "team") {
          // Karte vom Team zur Reserve verschieben
          const draggedIndex = State.team.findIndex(card => card.id === dragData.cardId);
          const allLis = Array.from(reserveUl.children);
          const targetIndex = allLis.indexOf(li);
          
          if (draggedIndex !== -1 && targetIndex !== -1) {
            const draggedCard = State.team[draggedIndex];
            State.team.splice(draggedIndex, 1);
            State.reserve.splice(targetIndex, 0, draggedCard);
            
            debouncedRenderTeam();
            toggleStart();
            renderRoster(); // Roster aktualisieren, damit "Already Added" sichtbar wird
            renderBoss();
            renderBoss();
          }
        } else if (dragData.type === "reserve") {
          // Innerhalb der Reserve reorder
          const draggedIndex = State.reserve.findIndex(card => card.id === dragData.cardId);
          const allLis = Array.from(reserveUl.children);
          const targetIndex = allLis.indexOf(li);
          
          if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
            const draggedCard = State.reserve[draggedIndex];
            State.reserve.splice(draggedIndex, 1);
            State.reserve.splice(targetIndex, 0, draggedCard);
            
            debouncedRenderTeam();
            toggleStart();
            renderRoster(); // Roster aktualisieren nach Reordering
            renderBoss();
            renderBoss();
          }
        }
      });
      
      reserveUl.appendChild(li);
    });
  }
}

// Export der Team-Funktion
export { renderTeam, debouncedRenderTeam, renderRoster, debouncedRenderRoster };
