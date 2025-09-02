// skills.js - Skill-System und Effekte
// ====================================
// Implementiert alle Skill-Effekte und Kampfmechaniken

/**
 * Wendet einen Skill-Effekt auf den Kampf-Status an
 * @param {Object} state - Der Kampf-Status der aktualisiert werden soll
 * @param {number} skillId - Die ID des anzuwendenden Skills
 */
function applySkillEffect(state, skillId) {
  switch(skillId) {
    // Crit Chance skills
    case 26001: // Crit Chance for all
      state.battle.critChance += 0.05;
      break;
    case 26002:
    case 26003:
    case 26004:
    case 26005:
    case 26006:
      state.battle.critChance += 0.02;
      break;
      
    // Crit Damage skills
    case 26101:
    case 26102:
    case 26103:
    case 26104:
    case 26105:
    case 26106:
    case 26107:
    case 26108:
    case 26109:
    case 26110:      
    case 26111:
    case 26112:
    case 26113:
    case 26114:
    case 26115:
      state.battle.critDamage += 0.1;
      break;
      
    // Team size skills
    case 26201:
    case 26202:
    case 26203:
      state.battle.slotLimit += 1;
      break;
      
    // Dodge skills
    case 26301:
    case 26302:
    case 26303:
    case 26304:
    case 26305:
    case 26306:
    case 26307:
    case 26308:
    case 26309:
    case 26310:
      state.battle.dodgeChance += 0.025;
      break;
    case 26311:
      state.battle.dodgeChance += 0.08;
      break;
      
    // Stun skills
    case 26401:
    case 26402:
    case 26403:
    case 26404:
    case 26405:
    case 26406:
    case 26407:
    case 26408:
    case 26409:
    case 26410:
      state.battle.stunChance += 0.01;
      break;
    case 26411:
      state.battle.stunChance += 0.025;
      break;
      
    // Damage Absorption skills
    case 26501:
    case 26502:
    case 26503:
    case 26504:
    case 26505:
      state.battle.damageAbsorption += 0.1;
      break;
    case 26506:
      state.battle.damageAbsorption += 0.16;
      break;
      
    // Protection skills
    case 26601:
    case 26602:
    case 26603:
    case 26604:
    case 26605:
    case 26606:
    case 26607:
    case 26608:
    case 26609:
    case 26610:
      state.battle.protectionChance += 0.05;
      break;
    case 26611:
      state.battle.protectionChance += 0.16;
      break;
      
    // Evolution skills
    case 27701:
    case 27702:
    case 27703:
    case 27704:
    case 27705:
    case 27706:
    case 27707:
    case 27708:
    case 27709:
    case 27710:
      state.battle.evolutionChance += 0.01;
      break;
    case 27711:
      state.battle.evolutionChance += 0.05;
      break;
      
    // Extra Attack skills
    case 27801:
    case 27802:
    case 27803:
    case 27804:
    case 27805:
    case 27806:
    case 27807:
    case 27808:
    case 27809:
    case 27810:
      state.battle.extraAttackChance += 0.04;
      break;
    case 27811:
      state.battle.extraAttackChance += 0.1;
      break;
      
    // Resourceful Attack skills
    case 27901:
    case 27902:
    case 27903:
    case 27904:
    case 27905:
    case 27906:
    case 27907:
    case 27908:
    case 27909:
    case 27910:
      state.battle.resourcefulAttack += 0.5;
      break;
      
    // Empowerment skills
    case 28001:
    case 28002:
    case 28003:
    case 28004:
    case 28005:
    case 28006:
    case 28007:
    case 28008:
    case 28009:
    case 28010:
      state.battle.empowerment += 0.025;
      break;
    case 28011:
      state.battle.empowerment += 0.08;
      break;
      
    // Weak Point skills
    case 28101:
    case 28102:
    case 28103:
    case 28104:
    case 28105:
    case 28106:
    case 28107:
    case 28108:
    case 28109:
    case 28110:
      state.battle.weakPointChance += 0.01;
      break;
    case 28111:
      state.battle.weakPointChance += 0.025;
      break;
      
    // Dismember skills
    case 28201:
    case 28202:
    case 28203:
    case 28204:
    case 28205:
    case 28206:
    case 28207:
    case 28208:
    case 28209:
    case 28210:
      state.battle.dismemberChance += 0.01;
      break;
    case 28211:
      state.battle.dismemberChance += 0.025;
      break;
      
    // Realm-specific skills
    case 29001:
      state.battle.resourcefulAttackRealms.add(4);
      state.battle.extraAttackRealms.add(8);
      break;
    case 29002:
      state.battle.empowermentRealms.add(2);
      state.battle.protectionRealms.add(5);
      break;
    case 29003:
      state.battle.dodgeRealms.add(1);
      state.battle.damageAbsorptionRealms.add(9);
      break;
    case 29004:
      state.battle.dismemberRealms.add(6);
      state.battle.stunRealms.add(10);
      break;
    case 29005:
      state.battle.weakPointRealms.add(3);
      state.battle.evolutionRealms.add(7);
      break;
      
    // Empty cases (placeholders)
    case 29101:
    case 29102:
    case 29103:
    case 29104:
    case 30001:
      break;
      
    case 30002:
      if (loadFinished) {
        bossMechanicsByName = getBossMechanicsByName();
      }
      break;
      
    case 30003:
      realms[11].cooldown -= 3600 * 180;
      if (loadFinished) {
        updatePokeFilterStats();
        renderRealmFilters();
      }
      break;
  }
}

/**
 * Berechnet den Kampf-Status basierend auf aktivierten Skills
 * @param {Object} skills - Objekt mit Skill-IDs als Keys
 * @returns {Object} Kampf-Status mit allen Mechanik-Werten
 */
export function calculateBattleStateFromSkills(skills) {
  const state = {
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
      resourcefulAttack: 0,
      empowerment: 0,
      weakPointChance: 0,
      dismemberChance: 0,
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
  };

  for (const skillId in skills) {
    if (skills[skillId]) {
      applySkillEffect(state, parseInt(skillId));
    }
  }
  return state;
}