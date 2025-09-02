// utils.js - Hilfsfunktionen
// ===========================
// Allgemeine Utility-Funktionen für Formatierung und Berechnungen

// Performance-Monitoring
/**
 * Misst die Ausführungszeit einer Funktion
 * @param {string} label - Beschriftung für die Messung
 * @param {Function} fn - Die zu messende Funktion
 * @returns {*} Das Ergebnis der Funktion
 */
function measurePerformance(label, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`${label} took ${(end - start).toFixed(2)}ms`);
  return result;
}

/**
 * Wrapper für async Funktionen mit Performance-Messung
 * @param {string} label - Beschriftung für die Messung
 * @param {Function} asyncFn - Die zu messende async Funktion
 * @returns {Promise} Promise mit dem Ergebnis der Funktion
 */
async function measurePerformanceAsync(label, asyncFn) {
  const start = performance.now();
  const result = await asyncFn();
  const end = performance.now();
  console.log(`${label} took ${(end - start).toFixed(2)}ms`);
  return result;
}

// Zahlen-Formatierung
/**
 * Formatiert große Zahlen in lesbare Einheiten (K, M, B, T)
 * @param {number} n - Die zu formatierende Zahl
 * @returns {string} Formatierte Zahl mit Einheit (z.B. "1.5M", "2.3K")
 */
function fmt(n) {
  if(n >= 1e12) return (n/1e12).toFixed(2)+"T";
  if(n >= 1e9) return (n/1e9).toFixed(2)+"B";
  if(n >= 1e6) return (n/1e6).toFixed(2)+"M";
  if(n >= 1e3) return (n/1e3).toFixed(2)+"K";
  return ""+n;
}

// Funktion für Boss-Sonderregeln
/**
 * Gibt die speziellen Kampfregeln für einen bestimmten Boss zurück
 * @param {Object} boss - Das Boss-Objekt mit name-Eigenschaft
 * @returns {string[]} Array von Beschreibungen der Sonderregeln
 */
function getBossSpecialRules(boss) {
  const rules = [];

  switch(boss.name) {
    case 'Darth Vader':
      rules.push('Mitigates 97% of incoming damage');
      break;
    case 'Typhon':
      rules.push('2.5% chance to heal from damage');
      break;
    case 'Dr Wily':
      rules.push('25% chance to dodge attacks');
      break;
    case 'Agent Smith':
      rules.push('75% chance to dodge attacks');
      break;
    case 'Arceus':
      rules.push('5% chance to redirect attacks to random team member');
      break;
    case 'Kaguya':
      rules.push('Only takes damage from the first card');
      rules.push('2 attacks (first on first card, second on last)');
      break;
    case 'Zeus':
      rules.push('3 attacks on random targets');
      break;
    case 'Isshin':
      rules.push('3 attacks on random targets');
      break;
    case 'Chaos':
      rules.push('2 attacks');
      break;
    case 'Cronus':
      rules.push('50% chance for 2 attacks');
      break;
    case 'Your Ego':
      rules.push('50% chance for 2 attacks on random targets');
      rules.push('5% chance for 5x damage');
      break;
    case 'Aizen':
      rules.push('Variable number of attacks (cumulative 50% chance)');
      break;
    case 'Genghis Khan':
      rules.push('25% chance for 3x damage');
      break;
    case 'Sauron':
      rules.push('8% chance for 101% of target HP damage');
      break;
    case 'Bowser':
      rules.push('Reflects 10% of damage back');
      break;
    case 'Godzilla':
      rules.push('Reflects 20% of damage back');
      break;
    case 'Galactus':
      rules.push('Attack +50% when a team member dies');
      break;
  }

  return rules;
}

// Export für andere Module
export { fmt, getBossSpecialRules, measurePerformance, measurePerformanceAsync };
