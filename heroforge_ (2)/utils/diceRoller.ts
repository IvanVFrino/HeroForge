

import { ParsedNpcAttackAction } from '../types';

export interface RollResult {
  individualRolls: number[];
  diceSum: number;
  modifier: number;
  total: number;
  description: string; 
  rollModeUsed?: 'advantage' | 'disadvantage'; // Optional to indicate if one was used
}

const rollSingleDie = (sides: number): number => {
  return Math.floor(Math.random() * sides) + 1;
};

export const performRoll = (
  numberOfDice: number,
  dieSides: number,
  modifier: number = 0,
  rollMode: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): RollResult => {
  let individualRolls: number[] = [];
  let diceSumInternal = 0;
  let descriptionSuffix = "";
  let actualRollModeUsed : 'advantage' | 'disadvantage' | undefined = undefined;

  if (numberOfDice === 1 && dieSides === 20) { // Typical d20 check (attack, save, skill)
    const roll1 = rollSingleDie(dieSides);
    if (rollMode === 'advantage' || rollMode === 'disadvantage') {
      const roll2 = rollSingleDie(dieSides);
      individualRolls = [roll1, roll2];
      diceSumInternal = rollMode === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
      descriptionSuffix = rollMode === 'advantage' ? " (Ventaja)" : " (Desventaja)";
      actualRollModeUsed = rollMode;
    } else {
      individualRolls = [roll1];
      diceSumInternal = roll1;
    }
  } else { // Damage rolls or other dice
    for (let i = 0; i < numberOfDice; i++) {
      const roll = rollSingleDie(dieSides);
      individualRolls.push(roll);
      diceSumInternal += roll;
    }
  }

  const total = diceSumInternal + modifier;
  const modifierString = modifier === 0 ? '' : (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`);
  const description = `${numberOfDice}d${dieSides}${modifierString}${descriptionSuffix}`;

  return {
    individualRolls,
    diceSum: diceSumInternal, // This is the sum of dice before modifier, or the chosen d20 roll
    modifier,
    total,
    description,
    rollModeUsed: actualRollModeUsed
  };
};

export const parseDiceString = (diceString: string): { numDice: number; dieSides: number; bonus: number } => {
  // Matches XdY, XdY+Z, XdY-Z. Allows spaces around +/-.
  const match = diceString.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
  if (match) {
    const numDice = parseInt(match[1], 10);
    const dieSides = parseInt(match[2], 10);
    let bonus = 0;
    if (match[3] && match[4]) {
      bonus = parseInt(match[4], 10);
      if (match[3] === '-') {
        bonus *= -1;
      }
    }
    return { numDice, dieSides, bonus };
  }
  // Handle case of just a flat number (e.g., "5" or "-2") as 0d0 + bonus
  const flatBonusMatch = diceString.match(/^([+-]?\d+)$/);
  if (flatBonusMatch) {
      return { numDice: 0, dieSides: 0, bonus: parseInt(flatBonusMatch[1], 10)};
  }
  console.warn(`Could not parse dice string: ${diceString}`);
  return { numDice: 0, dieSides: 0, bonus: 0 };
};

export const parseNpcAttackAction = (description: string): ParsedNpcAttackAction | null => {
  const result: ParsedNpcAttackAction = {};

  const attackRegex = /(Melee|Ranged)\s+(Weapon|Spell)\s+Attack:\s*([+-]\d+)\s*to\s*hit(?:,\s*reach\s*([^,]+))?(?:,\s*range\s*([^,]+))?(?:,\s*([^.]+))?\.?/i;
  const attackMatch = description.match(attackRegex);
  
  if (attackMatch) {
    result.attack = {
      bonus: parseInt(attackMatch[3]),
      reach: attackMatch[4]?.trim(),
      range: attackMatch[5]?.trim(),
      target: attackMatch[6]?.trim().replace(/\.$/, ''), // Remove trailing period if any
    };
  }

  const hitRegex = /Hit:\s*(?:(\d+)\s*\()?\s*([\dd\s+-]+)\s*\)?\s*(\w+(?:\s+\w+)*?)\s*damage/i;
  const hitFullTextMatch = description.match(/Hit:(.*?)(\.|$)/i); // Capture everything after "Hit:" up to a period or end of string
  
  if (hitFullTextMatch) {
      const hitDescriptionPart = hitFullTextMatch[1];
      const hitDamageMatch = hitDescriptionPart.match(hitRegex);

      if (hitDamageMatch) {
          result.hit = {
              averageDamage: hitDamageMatch[1] ? parseInt(hitDamageMatch[1]) : undefined,
              diceString: hitDamageMatch[2].replace(/\s/g, ''),
              damageType: hitDamageMatch[3].toLowerCase().trim(),
              fullText: `Hit:${hitDescriptionPart.trim()}`,
          };
      }

      // Check for versatile within the hitDescriptionPart, more specific to D&D format
      const versatileRegex = /or\s*(?:(\d+)\s*\()?\s*([\dd\s+-]+)\s*\)?\s*(\w+(?:\s+\w+)*?)\s*damage\s*(if\s*used\s*with\s*two\s*hands|while\s*wielding\s*with\s*two\s*hands)/i;
      const versatileMatch = hitDescriptionPart.match(versatileRegex);
      if (versatileMatch) {
          result.versatile = {
              averageDamage: versatileMatch[1] ? parseInt(versatileMatch[1]) : undefined,
              diceString: versatileMatch[2].replace(/\s/g, ''),
              damageType: versatileMatch[3].toLowerCase().trim(),
              fullText: versatileMatch[0].trim(),
          };
          // Remove versatile part from main hit fullText if it was captured there
          if (result.hit) {
            result.hit.fullText = result.hit.fullText.replace(versatileMatch[0], '').trim();
          }
      }
  }


  if (result.attack || result.hit) {
    return result;
  }
  return null;
};