
// Fix: Import SKILL_DEFINITIONS from '../constants/skills' instead of '../types'
import { SKILL_DEFINITIONS } from '../constants/skills';
import { AbilityScoreName, AbilityScores, CharacterSheet, SkillName } from '../types';

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

  // 2. Determine Proficiency Bonus (already set at level 1, but good for future scaling)
  newSheet.proficiencyBonus = newSheet.proficiencyBonus || 2; // Default for Lvl 1

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
  let maxHp = 0;
  if (newSheet.class) {
    maxHp = newSheet.class.hitDie + modifiers.Constitution;
  }
  newSheet.maxHp = maxHp;
  // Set current HP to max if not already set or if it's a new character (currentHp typically 0 initially)
  newSheet.currentHp = (newSheet.currentHp === 0 && maxHp > 0) ? maxHp : (newSheet.currentHp > maxHp ? maxHp : newSheet.currentHp);
  if (!newSheet.hitDice || newSheet.hitDice.type === 0) { // Ensure hit dice type is set
      newSheet.hitDice = { total: 1, type: newSheet.class?.hitDie || 0, remaining: 1 };
  }


  // 6. Calculate Initiative
  newSheet.initiative = modifiers.Dexterity;

  // 7. Calculate Passive Perception
  newSheet.passivePerception = 10 + (newSkills.Perception?.value !== undefined ? newSkills.Perception.value : modifiers.Wisdom);
  
  // 8. Calculate Armor Class
  let calculatedAC = 10 + modifiers.Dexterity; // Default base AC (unarmored)
  let unarmoredDefenseFeatureActive = false;

  const equippedBodyArmor = newSheet.equipment.find(
    item => item.equipped && item.category === 'Armor' && item.armorDetails?.armorType && ['Light', 'Medium', 'Heavy'].includes(item.armorDetails.armorType)
  );
  const equippedShield = newSheet.equipment.find(
    item => item.equipped && item.category === 'Armor' && item.armorDetails && !item.armorDetails.armorType 
  );

  // Check for Unarmored Defense features ONLY if no body armor is worn
  if (!equippedBodyArmor) {
    if (newSheet.class?.name === 'Bárbaro' && newSheet.featuresAndTraits.some(ft => ft.name === 'Defensa sin Armadura')) { // Updated class name
      calculatedAC = 10 + modifiers.Dexterity + modifiers.Constitution;
      unarmoredDefenseFeatureActive = true; // Barbarian can use shield with this
    } else if (newSheet.class?.name === 'Monk' && newSheet.featuresAndTraits.some(ft => ft.name === 'Unarmored Defense')) { // Assuming Monk has a similar Spanish name structure or you add specific logic
      // Monk Unarmored Defense: 10 + Dex + Wis, NO armor, NO shield
      if (!equippedShield) {
        calculatedAC = 10 + modifiers.Dexterity + modifiers.Wisdom;
        unarmoredDefenseFeatureActive = true;
      }
    }
  }

  // Apply AC from equipped body armor (this overrides unarmored defense)
  if (equippedBodyArmor && equippedBodyArmor.armorDetails) {
    const armor = equippedBodyArmor.armorDetails;
    calculatedAC = armor.baseAC; // Start with armor's base AC
    if (armor.addDexModifier) {
      let dexBonusToAdd = modifiers.Dexterity;
      if (armor.armorType === 'Medium' && armor.maxDexBonus !== undefined && dexBonusToAdd > armor.maxDexBonus) {
        dexBonusToAdd = armor.maxDexBonus; // Cap Dex bonus for Medium armor
      }
      // Heavy armor does not add Dex modifier (unless specific item property says otherwise, not handled here)
      if (armor.armorType !== 'Heavy') {
        calculatedAC += dexBonusToAdd;
      }
    }
    unarmoredDefenseFeatureActive = false; // Body armor overrides Unarmored Defense AC calculation
  }

  // Add AC from equipped shield
  if (equippedShield && equippedShield.armorDetails) {
    // Monk Unarmored Defense cannot be used with a shield.
    // If Monk UD was active, it means no shield was equipped.
    // So, if we are here and Monk UD was active, something is wrong, but logic should be: Monk UD is off if shield on.
    // If Barbarian UD is active, shield bonus applies.
    // If normal armor is worn, shield bonus applies.
    // If default unarmored (10+Dex), shield bonus applies.
    
    let canAddShieldBonus = true;
    if (newSheet.class?.name === 'Monk' && 
        newSheet.featuresAndTraits.some(ft => ft.name === 'Unarmored Defense') &&
        !equippedBodyArmor) { // Only consider Monk UD if no body armor
      canAddShieldBonus = false; // Monk UD explicitly disallows shields for its AC calc
    }

    if (canAddShieldBonus) {
      calculatedAC += equippedShield.armorDetails.baseAC;
    }
  }
  newSheet.armorClass = calculatedAC;


  // 9. Calculate Spellcasting Stats
  if (newSheet.class?.spellcasting) {
    newSheet.spellcastingAbility = newSheet.class.spellcasting.ability;
    newSheet.spellSaveDC = 8 + newSheet.proficiencyBonus + modifiers[newSheet.spellcastingAbility];
    newSheet.spellAttackBonus = newSheet.proficiencyBonus + modifiers[newSheet.spellcastingAbility];
    // knownCantrips, preparedSpells, spellSlots are typically set from coreData or class choices
    newSheet.knownCantrips = newSheet.knownCantrips || [];
    newSheet.preparedSpells = newSheet.preparedSpells || [];
    newSheet.spellSlots = newSheet.spellSlots || {};
  } else {
    delete newSheet.spellcastingAbility;
    delete newSheet.spellSaveDC;
    delete newSheet.spellAttackBonus;
  }

  // 10. Speed (already set by species in reconstructSheetFromCoreData)
  newSheet.speed = newSheet.species?.speed || newSheet.speed || 30;

  return newSheet;
};