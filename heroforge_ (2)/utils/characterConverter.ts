// Fix: Import Trait
import { CharacterSheet, SavedCharacterCoreData, DndClass, DndBackground, DndSpecies, AbilityScores, Proficiency, StartingEquipmentItem, EquipmentBundle, Trait } from '../types';
import { SKILL_DEFINITIONS } from '../constants/skills';
// Removed unused calculateAbilityModifier, calculateProficiencyValue from this file

export const convertSheetToCoreData = (sheet: CharacterSheet): SavedCharacterCoreData => {
  const spellSlotsUsed: Record<string, number> = {};
  if (sheet.spellSlots) {
    for (const levelKey in sheet.spellSlots) {
      if (sheet.spellSlots[levelKey].used > 0) {
        spellSlotsUsed[levelKey] = sheet.spellSlots[levelKey].used;
      }
    }
  }

  const coreData: SavedCharacterCoreData = {
    id: sheet._savedCoreDataHelper?.id || Date.now().toString(), 
    characterName: sheet.name,
    playerName: sheet.playerName,
    level: sheet.level,
    classId: sheet.class?.id || '',
    subclassId: sheet.subclassId,
    subclassName: sheet.subclassName,
    backgroundId: sheet.background?.id || '',
    speciesId: sheet.species?.id || '',
    alignment: sheet.alignment,
    baseAbilityScores: sheet._savedCoreDataHelper?.baseAbilityScores || sheet.abilityScores, 
    backgroundAsiChoices: sheet._savedCoreDataHelper?.backgroundAsiChoices,
    chosenClassSkillProficiencies: sheet.proficiencies
        .filter(p => p.type === 'skill' && p.source === 'ClassChoice')
        .map(p => p.name as any), 
    chosenClassEquipmentBundleKey: sheet._savedCoreDataHelper?.chosenClassEquipmentBundleKey,
    chosenClassEquipmentSelections: sheet._savedCoreDataHelper?.chosenClassEquipmentSelections,
    
    maxHp: sheet.maxHp, // Added for HP persistence
    currentHp: sheet.currentHp, // Added for HP persistence

    knownCantrips: sheet.knownCantrips,
    preparedSpells: sheet.preparedSpells,
    spellSlotsUsed: Object.keys(spellSlotsUsed).length > 0 ? spellSlotsUsed : undefined,
    
    equipment: sheet.equipment || [], 
    gold: sheet.gold || 0, 
    notes: `${sheet.personalityTraits || ''}\n${sheet.ideals || ''}\n${sheet.bonds || ''}\n${sheet.flaws || ''}`.trim() || undefined,
  };
  return coreData;
};

export const reconstructSheetFromCoreData = (
  coreData: SavedCharacterCoreData,
  allClasses: DndClass[],
  allBackgrounds: DndBackground[],
  allSpecies: DndSpecies[]
): CharacterSheet => {
  const selectedClass = allClasses.find(c => c.id === coreData.classId);
  const selectedBackground = allBackgrounds.find(b => b.id === coreData.backgroundId);
  const selectedSpecies = allSpecies.find(s => s.id === coreData.speciesId);

  let initialScores = { ...coreData.baseAbilityScores };
  if (coreData.backgroundAsiChoices && selectedBackground) { 
    coreData.backgroundAsiChoices.forEach(choice => {
      initialScores[choice.ability] = Math.min(20, (initialScores[choice.ability] || 0) + choice.amount);
    });
  }
  
  const proficiencies: Proficiency[] = [];
  if (selectedClass) {
    selectedClass.armorProficiencies.forEach(ap => proficiencies.push({ name: ap, type: 'armor', source: 'Class'}));
    selectedClass.weaponProficiencies.forEach(wp => proficiencies.push({ name: wp, type: 'weapon', source: 'Class'}));
    selectedClass.savingThrowProficiencies.forEach(st => proficiencies.push({ name: st, type: 'savingThrow', source: 'Class'}));
    if(selectedClass.toolProficiencies?.fixed) selectedClass.toolProficiencies.fixed.forEach(tp => proficiencies.push({name: tp, type: 'tool', source: 'Class'}));
    coreData.chosenClassSkillProficiencies?.forEach(skillName => {
        proficiencies.push({name: skillName, type: 'skill', source: 'ClassChoice'});
    });
  }
  if (selectedBackground) {
    selectedBackground.skillProficiencies.forEach(sp => proficiencies.push({ name: sp, type: 'skill', source: 'Background'}));
    if(selectedBackground.toolProficiencies) selectedBackground.toolProficiencies.forEach(tp => proficiencies.push({ name: tp, type: 'tool', source: 'Background'}));
    if(selectedBackground.languages) selectedBackground.languages.forEach(lang => proficiencies.push({ name: lang, type: 'language', source: 'Background'}));
  }
  if (selectedSpecies) {
    selectedSpecies.languages.forEach(lang => {
        if (lang !== "Common" && lang !== "One extra language of your choice" && !proficiencies.some(p => p.name === lang && p.type === 'language')) {
             proficiencies.push({ name: lang, type: 'language', source: 'Species' });
        }
    });
    selectedSpecies.traits.forEach(trait => {
        // Example: if Elves get Perception proficiency from Keen Senses trait
        if (trait.name === "Keen Senses" /* Or a more robust check based on trait content */ && !proficiencies.some(p => p.name === "Perception" && p.type === "skill")) {
            proficiencies.push({name: "Perception", type: "skill", source: "Species"});
        }
    });
  }
  if (!proficiencies.some(p => p.name === "Common" && p.type === 'language')) {
    proficiencies.push({name: "Common", type: "language", source: "Origin"}); // Assume Common is always granted
  }

  const featuresAndTraits: Trait[] = [];
  if (selectedClass) {
    for (let level = 1; level <= coreData.level; level++) {
      if (selectedClass.classFeaturesByLevel[level]) {
        featuresAndTraits.push(...selectedClass.classFeaturesByLevel[level].map(f => ({...f, source: 'Class'})));
      }
    }
  }
  if (selectedBackground?.originFeat) {
    featuresAndTraits.push({name: selectedBackground.originFeat, description: `Origin Feat from ${selectedBackground.name}.`, source: 'Background'});
  }
  if (selectedSpecies?.traits) {
    featuresAndTraits.push(...selectedSpecies.traits.map(t => ({...t, source: 'Species'})));
  }


  let equipmentFromCore = coreData.equipment || [];
  let goldFromCore = coreData.gold || 0;

  const initialSpellSlots: CharacterSheet['spellSlots'] = {};
  if (selectedClass?.spellcasting?.progression?.[coreData.level]) {
    const levelProg = selectedClass.spellcasting.progression[coreData.level];
    levelProg.spellSlots.forEach((numSlots, index) => {
      const spellLvlKey = (index + 1).toString();
      initialSpellSlots[spellLvlKey] = {
        total: numSlots,
        used: coreData.spellSlotsUsed?.[spellLvlKey] || 0,
      };
    });
  }


  const sheet: CharacterSheet = {
    name: coreData.characterName,
    playerName: coreData.playerName,
    class: selectedClass,
    subclassId: coreData.subclassId,
    subclassName: coreData.subclassName,
    level: coreData.level,
    background: selectedBackground,
    species: selectedSpecies,
    alignment: coreData.alignment,
    abilityScores: initialScores,
    abilityScoreModifiers: {} as any, 
    maxHp: coreData.maxHp !== undefined ? coreData.maxHp : 0, // Use saved maxHp
    currentHp: coreData.currentHp !== undefined ? coreData.currentHp : (coreData.maxHp !== undefined ? coreData.maxHp : 0), // Use saved currentHp
    temporaryHp: 0,
    armorClass: 10, 
    initiative: 0, 
    speed: selectedSpecies?.speed || 30,
    proficiencyBonus: 2, // Will be calculated based on level
    proficiencies: Array.from(new Map(proficiencies.map(item => [`${item.name}-${item.type}-${item.source}`, item])).values()), 
    savingThrows: {}, 
    skills: {}, 
    passivePerception: 10, 
    hitDice: { total: coreData.level, type: selectedClass?.hitDie || 0, remaining: coreData.level }, // Needs adjustment for used dice
    attacksAndSpellcasting: [],
    equipment: equipmentFromCore, 
    gold: goldFromCore, 
    featuresAndTraits,
    weaponMasteries: [], 
    knownCantrips: coreData.knownCantrips || [],
    preparedSpells: coreData.preparedSpells || [],
    spellSlots: initialSpellSlots, 
    _savedCoreDataHelper: { 
      ...coreData, 
      chosenClassEquipmentBundleKey: coreData.chosenClassEquipmentBundleKey,
      chosenClassEquipmentSelections: coreData.chosenClassEquipmentSelections || {} 
    }
  };
  
  SKILL_DEFINITIONS.forEach(skillDef => {
    sheet.skills[skillDef.name] = {
      value: 0, proficient: false, ability: skillDef.ability,
    };
  });
  (Object.keys(sheet.abilityScores) as Array<keyof AbilityScores>).forEach(abilityName => {
    sheet.savingThrows[abilityName] = {
      value: 0, proficient: false,
    };
  });
  
  return sheet;
};