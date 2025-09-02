// dataMapping.js
export let CARD_ID_MAP = {};

export async function loadCardData(url = 'cards.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fehler beim Laden von ${url}`);
  const cards = await res.json();
  CARD_ID_MAP = {};
  for (const c of cards) {
    CARD_ID_MAP[c.id] = {
      id: c.id,
      name: c.name,
      realm: c.realm,
      power: c.power || 0,
      defense: c.defense || 0,
      rarity: c.rarity || 'unknown',
      art: `assets/cards/${c.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}.jpg`,
      notes: [], // Hier könnten wir Hinweise aus Effekten oder fehlenden Feldern einfügen
      effects: [...mapEffects(c.baseEffects), ...mapEffects(c.specialEffects)]
    };
  }
}

function mapEffects(effects = []) {
  // Wandelt Effekte aus der JSON ins interne Format um
  return effects.map(e => {
    if (e.type === 'currencyPerPoke') {
      return `currencyPerPoke:${e.currency}:${e.value}`;
    }
    if (e.type === 'flatCurrencyPerPoke') {
      return `flatCurrencyPerPoke:${e.currency}:${e.value}@lvl${e.requirement?.amount || 0}`;
    }
    return `effect:${e.type}`;
  });
}
