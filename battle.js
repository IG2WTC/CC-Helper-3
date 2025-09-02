// battle.js - Kampfsystem und Berechnungen
// =========================================
// Implementiert das Kampfsystem mit allen Mechaniken und Berechnungen

import { CARD_ID_MAP } from './dataMapping.js';

/**
 * Haupt-Kampfsystem-Klasse für den Cosmic Battle Simulator
 * Behandelt alle Kampfmechaniken, Schadensberechnungen und Skill-Effekte
 */
export class BattleSystem {
  constructor() {
    this.MAX_TEAM_SIZE = 3;
  }

  getCardSkills(card, battleState) {
    if (!battleState || !battleState.battle) return {};
    
    const skills = {};
    const realm = card.realm;
    
    // Realm-spezifische Mechaniken
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
    
    const mechanic = REALM_MECHANICS[realm];
    if (mechanic) {
      const baseChance = battleState.battle[mechanic] || 0;
      skills[mechanic] = baseChance;
    }
    
    // Fusion-Mechaniken
    if (battleState.battle.resourcefulAttackRealms?.has(realm)) {
      skills.resourcefulAttack = battleState.battle.resourcefulAttack || 0.5;
    }
    if (battleState.battle.extraAttackRealms?.has(realm)) {
      skills.extraAttackChance = (skills.extraAttackChance || 0) + (battleState.battle.extraAttackChance || 0.04);
    }
    if (battleState.battle.empowermentRealms?.has(realm)) {
      skills.empowerment = battleState.battle.empowerment || 0.025;
    }
    if (battleState.battle.protectionRealms?.has(realm)) {
      skills.protectionChance = (skills.protectionChance || 0) + (battleState.battle.protectionChance || 0.05);
    }
    if (battleState.battle.dodgeRealms?.has(realm)) {
      skills.dodgeChance = (skills.dodgeChance || 0) + (battleState.battle.dodgeChance || 0.025);
    }
    if (battleState.battle.damageAbsorptionRealms?.has(realm)) {
      skills.damageAbsorption = (skills.damageAbsorption || 0) + (battleState.battle.damageAbsorption || 0.1);
    }
    if (battleState.battle.stunRealms?.has(realm)) {
      skills.stunChance = (skills.stunChance || 0) + (battleState.battle.stunChance || 0.01);
    }
    if (battleState.battle.evolutionRealms?.has(realm)) {
      skills.evolutionChance = (skills.evolutionChance || 0) + (battleState.battle.evolutionChance || 0.01);
    }
    if (battleState.battle.weakPointRealms?.has(realm)) {
      skills.weakPointChance = (skills.weakPointChance || 0) + (battleState.battle.weakPointChance || 0.01);
    }
    if (battleState.battle.dismemberRealms?.has(realm)) {
      skills.dismemberChance = (skills.dismemberChance || 0) + (battleState.battle.dismemberChance || 0.01);
    }
    
    return skills;
  }

  /**
   * Berechnet die Angriffskraft einer Karte basierend auf ihren Stats und Upgrades
   * @param {Object} card - Die Karte mit power, tier, level Eigenschaften
   * @param {Object} battleState - Kampf-Status mit globalAttackMult
   * @returns {number} Die berechnete Angriffskraft
   */
  calculateAttackPower(card, battleState) {
    return Math.floor(card.power * card.tier * Math.sqrt(card.level || card.lvl || 1) * battleState.globalAttackMult);
  }

  /**
   * Berechnet die HP einer Karte basierend auf ihren Stats und Upgrades
   * @param {Object} card - Die Karte mit defense, quantity Eigenschaften
   * @param {Object} battleState - Kampf-Status mit globalHPMult
   * @returns {number} Die berechneten HP
   */
  calculateHP(card, battleState) {
    return Math.floor(card.defense * Math.sqrt(card.quantity || card.qty || 1) * battleState.globalHPMult);
  }
  
  calculateBossAttack(boss) {
    let attack = boss.power * 10;
    if (boss.name === 'Your Ego') attack *= 100;
    return Math.floor(attack);
  }

  calculateBossHP(boss) {
    return Math.floor(boss.defense * (boss.realm === 11 ? 100000 : 400000));
  }

  /**
   * Führt einen kompletten Kampf zwischen Team und Boss aus
   * @param {Object[]} teamCards - Array der Team-Karten
   * @param {Object} selectedBoss - Der ausgewählte Boss
   * @param {boolean} fastMode - Schnellkampf-Modus (reduzierte Logs)
   * @param {Object} stateUpgrades - Globale Upgrades (Angriff/HP Multiplikatoren)
   * @param {Object[]} reserve - Reserve-Karten für eventuellen Ersatz
   * @param {number} logFrequency - Wie oft Logs ausgegeben werden sollen
   * @param {Object} battleState - Aktueller Kampf-Status mit Mechanik-Werten
   * @returns {Promise<Object>} Kampf-Ergebnis mit Logs und Statistiken
   */
  async startBattle(teamCards, selectedBoss, fastMode = false, stateUpgrades = {}, reserve = [], logFrequency = 1, battleState = null) {
    const logLines = [];
    
    if (!selectedBoss) {
      logLines.push("No boss selected");
      return { result: "error", logs: logLines };
    }
    
    if (!teamCards.length) {
      logLines.push("Empty team");
      return { result: "error", logs: logLines };
    }

    let team = teamCards.map(c => ({
      ...structuredClone(c),
      attack: this.calculateAttackPower(c, stateUpgrades),
      hp: this.calculateHP(c, stateUpgrades),
      curHp: this.calculateHP(c, stateUpgrades),
      // Skill-Effekte hinzufügen
      skills: this.getCardSkills(c, battleState),
      // Zusätzliche Status-Effekte
      stunTurns: 0,
      evolutionBonus: 0,
      dismemberStacks: 0
    }));

    let reserveCopy = [...reserve];

    const boss = structuredClone(selectedBoss);
    boss.attack = this.calculateBossAttack(boss);
    boss.hp = this.calculateBossHP(boss);
    boss.curHp = boss.hp;
    boss.stunTurns = 0;

    logLines.push(`Battle starts: Team (${team.length}) vs ${boss.name} (HP ${this.fmt(boss.curHp)})`);

    let round = 1;
    
    while(team.some(c => c.curHp>0) && boss.curHp>0){
      if(!fastMode && round % logFrequency === 0) logLines.push(`— Round ${round} —`);
      
      for(const c of team){
        if(c.curHp<=0) continue;
        
        // Stun-Check
        if (c.stunTurns > 0) {
          c.stunTurns--;
          if(!fastMode && round % logFrequency === 0) logLines.push(`${c.name} is stunned and misses turn`);
          continue;
        }
        
        let damage = c.attack;
        let isCritical = false;
        let extraAttacks = 0;
        
        // Evolution Bonus anwenden
        if (c.evolutionBonus > 0) {
          damage *= (1 + c.evolutionBonus);
          damage = Math.floor(damage);
        }
        
        // Empowerment von vorheriger Karte
        const cardIndex = team.indexOf(c);
        if (cardIndex > 0 && team[cardIndex - 1].skills?.empowerment) {
          const empowerBonus = team[cardIndex - 1].skills.empowerment;
          damage *= (1 + empowerBonus);
          damage = Math.floor(damage);
        }
        
        // Crit Chance (global)
        if (battleState?.battle?.critChance && Math.random() < battleState.battle.critChance) {
          isCritical = true;
          damage *= (1 + (battleState.battle.critDamage || 0));
          damage = Math.floor(damage);
        }
        
        // Weak Point bei Critical Hit
        if (isCritical && c.skills?.weakPointChance) {
          const weakPointDamage = Math.floor(boss.curHp * c.skills.weakPointChance);
          damage += weakPointDamage;
        }
        
        // Dismember bei Critical Hit
        if (isCritical && c.skills?.dismemberChance) {
          boss.dismemberStacks = (boss.dismemberStacks || 0) + 1;
          boss.attack *= (1 - c.skills.dismemberChance);
          boss.attack = Math.floor(boss.attack);
        }
        
        // Evolution Chance
        if (c.skills?.evolutionChance && Math.random() < c.skills.evolutionChance) {
          c.evolutionBonus += c.skills.evolutionChance;
          if(!fastMode && round % logFrequency === 0) logLines.push(`${c.name} evolves! Attack increased by ${Math.floor(c.skills.evolutionChance * 100)}%`);
        }
        
        // Extra Attack Chance
        if (c.skills?.extraAttackChance && Math.random() < c.skills.extraAttackChance) {
          extraAttacks++;
          // Kann multiple Male procken
          while (Math.random() < c.skills.extraAttackChance && extraAttacks < 5) {
            extraAttacks++;
          }
        }
        
        // Special boss effects on team attacks
        if(boss.name === 'Darth Vader' && Math.random() < 0.97) {
          // Darth Vader mitigates 97% of damage
          damage *= 0.03;
          damage = Math.floor(damage);
          specialType = 'mitigated';
        } else if(boss.name === 'Typhon' && Math.random() < 0.025) {
          // Typhon has 2.5% chance to heal from damage
          boss.curHp += damage;
          if(!fastMode) logLines.push(`${boss.name} heals for ${this.fmt(damage)}`);
          specialType = 'heal';
        } else if((boss.name === 'Dr Wily' && Math.random() < 0.25) || 
                  (boss.name === 'Agent Smith' && Math.random() < 0.75)) {
          // Dodge chance
          if(!fastMode) logLines.push(`${c.name} misses!`);
          continue;
        } else if(boss.name === 'Arceus' && Math.random() < 0.05) {
          // Arceus redirects damage to random team member
          const randomTarget = team[Math.floor(Math.random() * team.length)];
          randomTarget.curHp -= damage;
          if(!fastMode) logLines.push(`${boss.name} confuses ${c.name}'s attack to ${randomTarget.name} for ${this.fmt(damage)}`);
          if(randomTarget.curHp <= 0) {
            // Handle death, but simplified
            randomTarget.curHp = 0;
          }
          continue;
        } else if(boss.name === 'Kaguya' && team.indexOf(c) !== 0) {
          // Kaguya only takes damage from first card unless multiple attacks
          continue;
        }
        
        boss.curHp -= damage;
        if(!fastMode && round % logFrequency === 0) {
          let msg = `${c.name} hits for ${this.fmt(damage)}`;
          if(isCritical) msg += ` (CRIT!)`;
          msg += ` - ${this.fmt(boss.curHp)}/${this.fmt(boss.hp)}`;
          logLines.push(msg);
        }
        
        // Extra Attacks
        for (let i = 0; i < extraAttacks; i++) {
          let extraDamage = c.attack;
          
          // Evolution Bonus für Extra Attacks
          if (c.evolutionBonus > 0) {
            extraDamage *= (1 + c.evolutionBonus);
            extraDamage = Math.floor(extraDamage);
          }
          
          // Empowerment für Extra Attacks
          if (cardIndex > 0 && team[cardIndex - 1].skills?.empowerment) {
            const empowerBonus = team[cardIndex - 1].skills.empowerment;
            extraDamage *= (1 + empowerBonus);
            extraDamage = Math.floor(extraDamage);
          }
          
          boss.curHp -= extraDamage;
          if(!fastMode && round % logFrequency === 0) {
            logLines.push(`${c.name} hits again for ${this.fmt(extraDamage)} - ${this.fmt(boss.curHp)}/${this.fmt(boss.hp)}`);
          }
        }
      }
      
      if(boss.curHp<=0){ 
        if(!fastMode) logLines.push(`${boss.name} beaten!`, "kill"); 
        break; 
      }
      
      const alive = team.filter(c => c.curHp>0);
      if(!alive.length) break;
      
      // Determine number of boss attacks
      let numAttacks = 1;
      if(boss.name === 'Zeus' || boss.name === 'Isshin') {
        numAttacks = 3;
      } else if(boss.name === 'Chaos' || boss.name === 'Kaguya') {
        numAttacks = 2;
      } else if(boss.name === 'Cronus' || boss.name === 'Your Ego') {
        if(Math.random() < 0.5) numAttacks = 2;
      } else if(boss.name === 'Aizen') {
        while(Math.random() < 0.5) numAttacks += 1;
      }
      
      for(let i = 0; i < numAttacks; i++) {
        // Select target
        let targetIdx = alive.findIndex(c => c.curHp > 0); // Default: first alive
        if((boss.name === 'Zeus' || boss.name === 'Isshin' || boss.name === 'Your Ego') && i > 0) {
          // Random target for multi-attacks
          targetIdx = Math.floor(Math.random() * alive.length);
        }
        if(boss.name === 'Kaguya' && i > 0) {
          // Last card for multi-attacks
          targetIdx = alive.length - 1;
        }
        
        const target = alive[targetIdx];
        let damage = boss.attack;
        let specialType = null;
        
        // Boss Attack Modifier durch Dismember
        if (boss.dismemberStacks > 0) {
          damage *= Math.pow(0.99, boss.dismemberStacks); // 1% reduction per stack
          damage = Math.floor(damage);
        }
        
        // Special damage modifiers
        if(boss.name === 'Genghis Khan' && Math.random() < 0.25) {
          damage *= 3;
          specialType = 'empowerment';
        } else if(boss.name === 'Your Ego' && Math.random() < 0.05) {
          damage *= 5;
          specialType = 'empowerment';
        } else if(boss.name === 'Sauron' && Math.random() < 0.08) {
          damage = target.hp * 1.01; // 101% of target's max HP
          specialType = 'empowerment';
        }
        
        // Skill-Effekte der Ziel-Karte anwenden
        let damageReduced = false;
        let protectionActivated = false;
        
        // Dodge
        if (target.skills?.dodgeChance && Math.random() < target.skills.dodgeChance) {
          if(!fastMode) logLines.push(`${target.name} dodges the attack!`);
          continue;
        }
        
        // Protection (reduziert Schaden der Karte davor um 50%)
        if (target.skills?.protectionChance && Math.random() < target.skills.protectionChance) {
          const protectIndex = alive.indexOf(target) - 1;
          if (protectIndex >= 0) {
            const protectTarget = alive[protectIndex];
            if (protectTarget.curHp > 0) {
              const reducedDamage = Math.floor(damage * 0.5);
              protectTarget.curHp -= reducedDamage;
              damage = 0; // Original target takes no damage
              protectionActivated = true;
              if(!fastMode) logLines.push(`${target.name} protects ${protectTarget.name}, reducing damage by 50%`);
              if(protectTarget.curHp <= 0) {
                protectTarget.curHp = 0;
              }
            }
          }
        }
        
        // Damage Absorption
        if (!protectionActivated && target.skills?.damageAbsorption) {
          damage *= (1 - target.skills.damageAbsorption);
          damage = Math.floor(damage);
          damageReduced = true;
        }
        
        // Stun Chance
        let stunActivated = false;
        if (target.skills?.stunChance && Math.random() < target.skills.stunChance) {
          boss.stunTurns = (boss.stunTurns || 0) + 1;
          stunActivated = true;
          if(!fastMode) logLines.push(`${target.name} stuns ${boss.name}!`);
        }
        
        // Boss Stun Check
        if (boss.stunTurns > 0) {
          boss.stunTurns--;
          if(!fastMode) logLines.push(`${boss.name} is stunned and misses turn`);
          continue;
        }
        
        // Apply damage
        if (!protectionActivated) {
          target.curHp -= damage;
        }
        
        if(!fastMode) {
          let msg = `${target.name} got hit for ${this.fmt(damage)}`;
          if(specialType) msg += ` (${specialType})`;
          if(damageReduced) msg += ` (absorbed)`;
          if(stunActivated) msg += ` (stunned)`;
          if(protectionActivated) msg += ` (protected)`;
          if(!protectionActivated) msg += ` - ${this.fmt(target.curHp)}/${this.fmt(target.hp)}`;
          logLines.push(msg);
        }
        
        // Special effects after damage
        if(boss.name === 'Bowser') {
          const reflect = Math.floor(damage * 0.1);
          target.curHp -= reflect;
          if(!fastMode) logLines.push(`${boss.name} reflects ${this.fmt(reflect)} to ${target.name}`);
        } else if(boss.name === 'Godzilla') {
          const reflect = Math.floor(damage * 0.2);
          target.curHp -= reflect;
          if(!fastMode) logLines.push(`${boss.name} reflects ${this.fmt(reflect)} to ${target.name}`);
        }
        
        // Handle death
        if(target.curHp <= 0) {
          // Simplified: remove from alive
          alive.splice(targetIdx, 1);
          if(boss.name === 'Galactus') {
            boss.attack *= 1.5;
            if(!fastMode) logLines.push(`${boss.name}'s attack increases!`);
          }
        }
      }
      
      // Update team with alive cards
      const newAlive = team.filter(c => c.curHp > 0);
      const deadCount = team.length - newAlive.length;
      team.splice(0, team.length, ...newAlive);
      
      // Reserve moves up
      for(let i = 0; i < deadCount && reserveCopy.length > 0; i++){
        team.push(reserveCopy.shift());
        if(!fastMode) logLines.push(`${team[team.length-1].name} moves up!`, "info");
      }
      
      round++;
    }

    const result = boss.curHp <= 0 ? "Victory" : "Defeat";
    logLines.push(`Result: ${result}`);

    return {
      result,
      logs: logLines,
      finalTeam: team,
      bossHealth: boss.curHp
    };
  }

  fmt(n) {
    if(n >= 1e12) return (n/1e12).toFixed(2)+"T";
    if(n >= 1e9) return (n/1e9).toFixed(2)+"B";
    if(n >= 1e6) return (n/1e6).toFixed(2)+"M";
    if(n >= 1e3) return (n/1e3).toFixed(2)+"K";
    return ""+n;
  }
}

export const battleSystem = new BattleSystem();
