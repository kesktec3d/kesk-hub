// Logique d'incrémentation automatique déterministe
// Démarre à 200 kg le 2024-03-01, ajoute 200g–1.2kg toutes les 2–3 jours
// La valeur est la même pour tous les utilisateurs à un instant donné (pas de DB)

const START_DATE = new Date('2025-07-01T00:00:00Z');
const START_KG   = 200;

// LCG seeded PRNG — reproductible pour un index donné
function seeded(n) {
  let s = (n * 2654435761) >>> 0;
  s ^= s >>> 16;
  s  = (s * 2246822519) >>> 0;
  s ^= s >>> 13;
  s  = (s * 3266489917) >>> 0;
  s ^= s >>> 16;
  return (s >>> 0) / 0xFFFFFFFF; // [0, 1)
}

function computeKg() {
  const elapsedDays = (Date.now() - START_DATE.getTime()) / 86400000;
  let kg = START_KG;
  let day = 0;
  let i = 0;

  while (day < elapsedDays) {
    // Durée de la période : 2.0 à 3.0 jours
    const periodLen = 2 + seeded(i * 2);           // 2–3 days
    // Incrément : 0.2 à 1.2 kg
    const increment = 0.2 + seeded(i * 2 + 1);     // 0.2–1.2 kg

    day += periodLen;
    if (day <= elapsedDays) kg += increment;
    i++;
  }

  return Math.round(kg * 10) / 10;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const kg_total = computeKg();
    return res.status(200).json({ kg_total });
  }

  return res.status(405).end();
}
