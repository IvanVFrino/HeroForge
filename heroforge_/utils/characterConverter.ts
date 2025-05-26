
import { CharacterSheet, SavedCharacterCoreData, DndClass, DndBackground, DndSpecies, AbilityScores, Proficiency, StartingEquipmentItem, EquipmentBundle } from '../types';
import { SKILL_DEFINITIONS } from '../constants/skills';
// Removed unused calculateAbilityModifier, calculateProficiencyValue from this file

export const convertSheetToCoreData = (sheet: CharacterSheet): SavedCharacterCoreData => {
  const coreData: SavedCharacterCoreData = {
    id: sheet._savedCoreDataHelper?.id || Date.now().toString(), 
    characterName: sheet.name,
    playerName: sheet.playerName,
    level: sheet.level,
    classId: sheet.class?.id || '',
    backgroundId: sheet.background?.id || '',
    speciesId: sheet.species?.id || '',
    alignment: sheet.alignment,
    baseAbilityScores: sheet._savedCoreDataHelper?.baseAbilityScores || sheet.abilityScores, 
    backgroundAsiChoices: sheet._savedCoreDataHelper?.backgroundAsiChoices,
    chosenClassSkillProficiencies: sheet.proficiencies
        .filter(p => p.type === 'skill' && p.source === 'ClassChoice')
        .map(p => p.name as any), 
    chosenClassEquipmentBundleKey: sheet._savedCoreDataHelper?.chosenClassEquipmentBundleKey,
    chosenClassEquipmentSelections: sheet._savedCoreDataHelper?.chosenClassEquipmentSelections, // Added
    
    chosenKnownCantrips: sheet.knownCantrips,
    chosenPreparedSpells: sheet.preparedSpells,
    
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
        if (trait.name === "Keen Senses" && !proficiencies.some(p => p.name === "Perception" && p.type === "skill")) {
            proficiencies.push({name: "Perception", type: "skill", source: "Species"});
        }
    });
  }
  if (!proficiencies.some(p => p.name === "Common" && p.type === 'language')) {
    proficiencies.push({name: "Common", type: "language", source: "Origin"});
  }

  const featuresAndTraits = [
    ...(selectedClass?.classFeaturesLevel1.map(f => ({...f, source: 'Class'})) || []),
    ...(selectedBackground?.originFeat ? [{name: selectedBackground.originFeat, description: `Origin Feat from ${selectedBackground.name}.`, source: 'Background'}] : []),
    ...(selectedSpecies?.traits.map(t => ({...t, source: 'Species'})) || []),
  ];

  // Initialize equipment and gold from coreData directly if they exist
  // The actual application of class equipment from selections will happen in CharacterContext if needed
  let equipmentFromCore = coreData.equipment || [];
  let goldFromCore = coreData.gold || 0;

  const sheet: CharacterSheet = {
    name: coreData.characterName,
    playerName: coreData.playerName,
    class: selectedClass,
    level: coreData.level,
    background: selectedBackground,
    species: selectedSpecies,
    alignment: coreData.alignment,
    abilityScores: initialScores,
    abilityScoreModifiers: {} as any, 
    maxHp: 0, 
    currentHp: 0, 
    temporaryHp: 0,
    armorClass: 10, 
    initiative: 0, 
    speed: selectedSpecies?.speed || 30,
    proficiencyBonus: 2, 
    proficiencies: Array.from(new Map(proficiencies.map(item => [`${item.name}-${item.type}-${item.source}`, item])).values()), 
    savingThrows: {}, 
    skills: {}, 
    passivePerception: 10, 
    hitDice: { total: 1, type: selectedClass?.hitDie || 0, remaining: 1 },
    attacksAndSpellcasting: [],
    equipment: equipmentFromCore, 
    gold: goldFromCore, 
    featuresAndTraits,
    weaponMasteries: [], 
    knownCantrips: coreData.chosenKnownCantrips || [],
    preparedSpells: coreData.chosenPreparedSpells || [],
    spellSlots: {}, 
    _savedCoreDataHelper: { 
      ...coreData, 
      chosenClassEquipmentBundleKey: coreData.chosenClassEquipmentBundleKey,
      chosenClassEquipmentSelections: coreData.chosenClassEquipmentSelections || {} // Ensure it's initialized
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
  
  // Note: The actual logic to re-apply items based on chosenClassEquipmentSelections
  // would typically live in the CharacterContext reducer when it processes the loaded sheet,
  // or FinalDetails would re-trigger the choice application logic.
  // For now, this function primarily reconstructs the sheet; equipment items from choices are part of coreData.equipment.

  return sheet;
};
