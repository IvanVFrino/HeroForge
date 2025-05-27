
// Fix: Import SKILL_DEFINITIONS from '../constants/skills' instead of '../types'
import { SKILL_DEFINITIONS } from '../constants/skills';
import { AbilityScoreName, AbilityScores, CharacterSheet, DamageType, EquippedItem, SkillName, WeaponDetails } from '../types';
import { parseDiceString } from './diceRoller';


export const calculateAbilityModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

export const calculateProficiencyValue = (abilityModifier: number, proficiencyBonusValue: number | 0): number => {
  return abilityModifier + proficiencyBonusValue;
};

export const calculateAllDerivedStats = (sheet: CharacterSheet): CharacterSheet => {
  const newSheet = { ...sheet };

  // 1. Calculate Ability Score Modifiers
  const modifiers = {} as CharacterSheet['abilityScoreModifiers'];
  for (const key in newSheet.abilityScores) {
    modifiers[key as AbilityScoreName] = calculateAbilityModifier(newSheet.abilityScores[key as AbilityScoreName]);
  }
  newSheet.abilityScoreModifiers = modifiers;

  // 2. Determine Proficiency Bonus (Placeholder - should scale with actual level later)
  // Proficiency Bonus progression: Level 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6
  if (newSheet.level >= 17) newSheet.proficiencyBonus = 6;
  else if (newSheet.level >= 13) newSheet.proficiencyBonus = 5;
  else if (newSheet.level >= 9) newSheet.proficiencyBonus = 4;
  else if (newSheet.level >= 5) newSheet.proficiencyBonus = 3;
  else newSheet.proficiencyBonus = 2;


  // 3. Calculate Skills
  const newSkills = { ...newSheet.skills };
  SKILL_DEFINITIONS.forEach(skillDef => {
    const isProficient = newSheet.proficiencies.some(p => p.name === skillDef.name && p.type === 'skill');
    newSkills[skillDef.name] = {
      value: calculateProficiencyValue(modifiers[skillDef.ability], isProficient ? newSheet.proficiencyBonus : 0),
      proficient: isProficient,
      ability: skillDef.ability,
    };
  });
  newSheet.skills = newSkills;

  // 4. Calculate Saving Throws
  const newSavingThrows = { ...newSheet.savingThrows };
  (Object.keys(modifiers) as Array<AbilityScoreName>).forEach(abilityName => {
    const isProficient = newSheet.proficiencies.some(p => p.name === abilityName && p.type === 'savingThrow');
    newSavingThrows[abilityName] = {
      value: calculateProficiencyValue(modifiers[abilityName], isProficient ? newSheet.proficiencyBonus : 0),
      proficient: isProficient,
    };
  });
  newSheet.savingThrows = newSavingThrows;

  // 5. Calculate Max HP
  // This is simplified for L1. True HP calculation needs to sum hit die rolls or averages for higher levels + con mod per level.
  // For now, this sets L1 HP. Actual leveling logic would increment this.
  let maxHp = 0;
  if (newSheet.class) {
    maxHp = newSheet.class.hitDie + modifiers.Constitution;
    // For levels > 1, HP would be: (L1 HP) + sum_of_rolls_for_L2_to_currentLevel + (ConMod * (currentLevel -1))
    // This calculation needs to happen during a "LEVEL_UP" action, not here.
    // This function assumes maxHp is either for L1 or already set by a leveling process.
  }
  newSheet.maxHp = newSheet.maxHp > 0 ? newSheet.maxHp : maxHp; // Preserve existing HP if already set (e.g. from load)
  newSheet.currentHp = (newSheet.currentHp === 0 && newSheet.maxHp > 0) ? newSheet.maxHp : (newSheet.currentHp > newSheet.maxHp ? newSheet.maxHp : newSheet.currentHp);
  
  if (!newSheet.hitDice || newSheet.hitDice.type === 0) { 
      newSheet.hitDice = { total: newSheet.level, type: newSheet.class?.hitDie || 0, remaining: newSheet.level };
  } else {
      newSheet.hitDice.total = newSheet.level; // Ensure total dice match level
      newSheet.hitDice.type = newSheet.class?.hitDie || newSheet.hitDice.type;
      // remaining should be managed by gameplay, not reset here unless it's an explicit reset.
  }


  // 6. Calculate Initiative
  newSheet.initiative = modifiers.Dexterity;

  // 7. Calculate Passive Perception
  newSheet.passivePerception = 10 + (newSkills.Perception?.value !== undefined ? newSkills.Perception.value : modifiers.Wisdom);
  
  // 8. Calculate Armor Class (logic seems okay, depends on equipment)
  let calculatedAC = 10 + modifiers.Dexterity; 
  let unarmoredDefenseFeatureActive = false;

  const equippedBodyArmor = newSheet.equipment.find(
    item => item.equipped && item.category === 'Armor' && item.armorDetails?.armorType && ['Light', 'Medium', 'Heavy'].includes(item.armorDetails.armorType)
  );
  const equippedShield = newSheet.equipment.find(
    item => item.equipped && item.category === 'Armor' && item.armorDetails && !item.armorDetails.armorType 
  );

  if (!equippedBodyArmor) {
    if (newSheet.class?.name === 'Bárbaro' && newSheet.featuresAndTraits.some(ft => ft.name === 'Defensa sin Armadura')) {
      calculatedAC = 10 + modifiers.Dexterity + modifiers.Constitution;
      unarmoredDefenseFeatureActive = true; 
    } else if (newSheet.class?.name === 'Monk' && newSheet.featuresAndTraits.some(ft => ft.name === 'Unarmored Defense')) { 
      if (!equippedShield) {
        calculatedAC = 10 + modifiers.Dexterity + modifiers.Wisdom;
        unarmoredDefenseFeatureActive = true;
      }
    }
  }

  if (equippedBodyArmor && equippedBodyArmor.armorDetails) {
    const armor = equippedBodyArmor.armorDetails;
    calculatedAC = armor.baseAC || 0; 
    if (armor.addDexModifier) {
      let dexBonusToAdd = modifiers.Dexterity;
      if (armor.armorType === 'Medium' && armor.maxDexBonus !== undefined && dexBonusToAdd > armor.maxDexBonus) {
        dexBonusToAdd = armor.maxDexBonus; 
      }
      if (armor.armorType !== 'Heavy') {
        calculatedAC += dexBonusToAdd;
      }
    }
    unarmoredDefenseFeatureActive = false; 
  }

  if (equippedShield && equippedShield.armorDetails) {
    let canAddShieldBonus = true;
    if (newSheet.class?.name === 'Monk' && 
        newSheet.featuresAndTraits.some(ft => ft.name === 'Unarmored Defense') &&
        !equippedBodyArmor) { 
      canAddShieldBonus = false; 
    }
    if (canAddShieldBonus) {
      calculatedAC += equippedShield.armorDetails.baseAC || 0;
    }
  }
  newSheet.armorClass = calculatedAC;


  // 9. Calculate Spellcasting Stats
  if (newSheet.class?.spellcasting) {
    newSheet.spellcastingAbility = newSheet.class.spellcasting.ability;
    newSheet.spellSaveDC = 8 + newSheet.proficiencyBonus + modifiers[newSheet.spellcastingAbility];
    newSheet.spellAttackBonus = newSheet.proficiencyBonus + modifiers[newSheet.spellcastingAbility];
    
    const levelProgression = newSheet.class.spellcasting.progression?.[newSheet.level];
    if (levelProgression) {
        const newSpellSlots: CharacterSheet['spellSlots'] = {};
        levelProgression.spellSlots.forEach((numSlots, index) => {
            const spellLevelKey = (index + 1).toString();
            newSpellSlots[spellLevelKey] = {
                total: numSlots,
                // Preserve used slots if character sheet already has them for this level, otherwise default to 0
                used: newSheet.spellSlots?.[spellLevelKey]?.used ?? (newSheet._savedCoreDataHelper?.spellSlotsUsed?.[spellLevelKey] ?? 0)
            };
        });
        newSheet.spellSlots = newSpellSlots;
    } else {
        // Fallback or clear if no progression for current level (should not happen for valid levels)
        newSheet.spellSlots = {}; 
    }

    newSheet.knownCantrips = newSheet.knownCantrips || [];
    newSheet.preparedSpells = newSheet.preparedSpells || [];
  } else {
    delete newSheet.spellcastingAbility;
    delete newSheet.spellSaveDC;
    delete newSheet.spellAttackBonus;
    newSheet.spellSlots = {}; // Clear spell slots if no spellcasting
  }

  // 10. Speed (already set by species or default)
  newSheet.speed = newSheet.species?.speed || newSheet.speed || 30;

  return newSheet;
};

// Helper for PC weapon attack bonus
export const getPcWeaponAttackBonus = (weapon: EquippedItem, sheet: CharacterSheet): number => {
  if (!weapon.weaponDetails) return 0;
  let abilityMod = sheet.abilityScoreModifiers.Strength; 
  const props = weapon.weaponDetails.properties;
  
  const isRangedWeaponAttack = props.includes('Ammunition') || 
                             props.includes('Range') || 
                             (props.includes('Thrown') && !props.includes('Finesse')); 

  if (props.includes('Finesse')) {
      abilityMod = Math.max(sheet.abilityScoreModifiers.Strength, sheet.abilityScoreModifiers.Dexterity);
  } else if (isRangedWeaponAttack && props.includes('Thrown') && !props.includes('Finesse')) {
      abilityMod = sheet.abilityScoreModifiers.Strength; 
  } else if (isRangedWeaponAttack) {
      abilityMod = sheet.abilityScoreModifiers.Dexterity; 
  }
  
  // Simplified proficiency check - assumes proficiency if equipped. 
  // A full check needs to verify against `sheet.proficiencies` (weapon name, or category like "Simple Weapons", "Martial Weapons")
  // For now, this simplified approach is kept.
  let isProficientWithWeapon = true; // Placeholder for actual proficiency check
  // Example (very basic) check:
  // const weaponTypeProficiency = sheet.proficiencies.find(p => p.type === 'weapon' && (p.name.toLowerCase() === weapon.name.toLowerCase() || weapon.weaponDetails?.properties.some(prop => p.name.toLowerCase().includes(prop.toLowerCase())) ));
  // if (!weaponTypeProficiency) isProficientWithWeapon = false;


  return abilityMod + (isProficientWithWeapon ? sheet.proficiencyBonus : 0);
};

// Helper for PC weapon damage details
export const getPcWeaponDamageDetails = (weapon: EquippedItem, sheet: CharacterSheet, useVersatile: boolean = false): { dice: string, modifier: number, type: DamageType } | null => {
  if (!weapon.weaponDetails) return null;
  const wd = weapon.weaponDetails;
  let abilityMod = sheet.abilityScoreModifiers.Strength;
  const props = wd.properties;

  const isRangedWeaponAttack = props.includes('Ammunition') || 
                             props.includes('Range') || 
                             (props.includes('Thrown') && !props.includes('Finesse'));

  if (props.includes('Finesse')) {
      abilityMod = Math.max(sheet.abilityScoreModifiers.Strength, sheet.abilityScoreModifiers.Dexterity);
  } else if (isRangedWeaponAttack && props.includes('Thrown') && !props.includes('Finesse')) {
      abilityMod = sheet.abilityScoreModifiers.Strength; 
  } else if (isRangedWeaponAttack) {
      // Ranged weapons (bows, crossbows) use Dexterity for damage IF they don't have the Thrown property without Finesse.
      // This logic is slightly simplified as some specific ranged weapons might deviate.
      // For now, assuming general rule: Dex for ranged, unless Thrown (Str) or Finesse (higher of Str/Dex).
      abilityMod = sheet.abilityScoreModifiers.Dexterity; 
  }
  
  const diceString = (useVersatile && wd.versatileDamage) ? wd.versatileDamage : wd.damageDice;
  const { bonus: bonusFromDice } = parseDiceString(diceString); 
  
  return {
      dice: diceString,
      modifier: abilityMod + bonusFromDice, 
      type: wd.damageType
  };
};
