// ── Types ────────────────────────────────────────────────────────────────────

export interface ParseResult {
  amount: number;           // ml
  confidence: 'high' | 'medium' | 'low';
  interpreted: string;      // human-readable interpretation
}

// ── Container Mappings ───────────────────────────────────────────────────────

const CONTAINERS: Record<string, number> = {
  // Common containers
  'sip':        100,
  'small sip':  50,
  'big sip':    150,
  'gulp':       150,
  'mouthful':   100,

  // Glasses & cups
  'glass':      250,
  'cup':        250,
  'mug':        300,
  'small glass': 200,
  'big glass':  350,
  'large glass': 350,
  'tall glass': 350,
  'pint':       473,

  // Bottles
  'bottle':     500,
  'small bottle': 330,
  'big bottle': 750,
  'large bottle': 750,
  'water bottle': 500,
  'sports bottle': 750,

  // Measurement
  'liter':      1000,
  'litre':      1000,
  'half liter': 500,
  'half litre': 500,
  'half a liter': 500,
  'half a litre': 500,
  'quarter liter': 250,
  'quarter litre': 250,

  // Informal
  'some water':  250,
  'a bit':       150,
  'a lot':       500,
  'plenty':      500,
};

// ── Quantity Words ───────────────────────────────────────────────────────────

const QUANTITY_WORDS: Record<string, number> = {
  'a':      1,
  'one':    1,
  'two':    2,
  'three':  3,
  'four':   4,
  'five':   5,
  'six':    6,
  'half':   0.5,
  'couple': 2,
  'few':    3,
  'several': 4,
};

// ── Size Modifiers ───────────────────────────────────────────────────────────

const SIZE_MULTIPLIERS: Record<string, number> = {
  'small':  0.7,
  'tiny':   0.5,
  'little': 0.7,
  'big':    1.4,
  'large':  1.4,
  'huge':   1.8,
  'tall':   1.3,
};

// ── Parser ───────────────────────────────────────────────────────────────────

export function parseNaturalLanguage(input: string): ParseResult {
  const raw = input.trim().toLowerCase();

  if (!raw) {
    return { amount: 250, confidence: 'low', interpreted: 'default glass (250 ml)' };
  }

  // 1. Direct ml/L values: "500ml", "0.5L", "750 ml"
  const mlMatch = raw.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (mlMatch) {
    const amount = Math.round(parseFloat(mlMatch[1]));
    return {
      amount: clamp(amount),
      confidence: 'high',
      interpreted: `${amount} ml`,
    };
  }

  const literMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|litre|liters|litres)/);
  if (literMatch) {
    const amount = Math.round(parseFloat(literMatch[1]) * 1000);
    return {
      amount: clamp(amount),
      confidence: 'high',
      interpreted: `${parseFloat(literMatch[1])} liters (${amount} ml)`,
    };
  }

  // 2. Try matching "N container" or "quantity-word container"
  let quantity = 1;
  let sizeMultiplier = 1;
  let matchedContainer: string | null = null;
  let containerMl = 250;

  // Extract numeric quantity
  const numMatch = raw.match(/^(\d+(?:\.\d+)?)\s+/);
  if (numMatch) {
    quantity = parseFloat(numMatch[1]);
  }

  // Extract word quantity
  for (const [word, val] of Object.entries(QUANTITY_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`);
    if (re.test(raw) && !numMatch) {
      quantity = val;
      break;
    }
  }

  // Extract size modifier
  for (const [word, mult] of Object.entries(SIZE_MULTIPLIERS)) {
    if (raw.includes(word)) {
      sizeMultiplier = mult;
      break;
    }
  }

  // Match container (longest match first)
  const sortedContainers = Object.entries(CONTAINERS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [name, ml] of sortedContainers) {
    if (raw.includes(name)) {
      matchedContainer = name;
      containerMl = ml;
      break;
    }
  }

  // If we matched a multi-word container that already has size, don't double-apply
  const sizedContainers = ['small glass', 'big glass', 'large glass', 'tall glass',
    'small bottle', 'big bottle', 'large bottle', 'small sip', 'big sip',
    'half liter', 'half litre', 'half a liter', 'half a litre',
    'quarter liter', 'quarter litre', 'sports bottle'];

  if (matchedContainer && sizedContainers.includes(matchedContainer)) {
    sizeMultiplier = 1; // size is already baked into the container ml
  }

  if (matchedContainer) {
    const amount = Math.round(quantity * containerMl * sizeMultiplier);
    const qStr = quantity === 1 ? '' : `${quantity} × `;
    const sStr = sizeMultiplier !== 1 && !sizedContainers.includes(matchedContainer)
      ? ` (${Object.entries(SIZE_MULTIPLIERS).find(([, v]) => v === sizeMultiplier)?.[0] ?? ''} size)`
      : '';

    return {
      amount: clamp(amount),
      confidence: quantity >= 1 ? 'high' : 'medium',
      interpreted: `${qStr}${matchedContainer}${sStr} (${amount} ml)`,
    };
  }

  // 3. Plain number only: "250", "500"
  const plainNum = raw.match(/^(\d+)$/);
  if (plainNum) {
    const amount = parseInt(plainNum[1], 10);
    if (amount >= 50 && amount <= 5000) {
      return { amount, confidence: 'high', interpreted: `${amount} ml` };
    }
  }

  // 4. Couldn't parse — default with low confidence
  return {
    amount: 250,
    confidence: 'low',
    interpreted: `Couldn't understand "${input}" — defaulting to 250 ml`,
  };
}

// ── Utility ──────────────────────────────────────────────────────────────────

function clamp(ml: number): number {
  return Math.max(50, Math.min(ml, 5000));
}
