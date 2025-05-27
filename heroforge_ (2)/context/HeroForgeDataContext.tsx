
import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import { HeroForgeData, HeroForgeAction, HeroForgeContextState, SavedCharacterCoreData, DndSpecies, DndClass, DndBackground, Item, EquippedItem, NPCData, SpellDefinition, SubclassDefinition, AbilityScores, SkillName, Trait, StartingEquipmentItem, EquipmentBundle, Size, Alignment, DamageType, WeaponProperty, ArmorType, SpellSchoolName, ClassSpellcasting, ClassSpellcastingProgressionEntry } from '../types';

// Example Subclasses for demonstration
const EXAMPLE_SUBCLASSES: SubclassDefinition[] = [
  {
    id: 'subclass-totem-warrior',
    name: 'Camino del Guerrero Totémico',
    parentClassId: 'base-barbarian',
    description: 'Los guerreros totémicos siguen un camino que se inspira en los espíritus animales.',
    featuresByLevel: {
      3: [
        { name: 'Buscador de Espíritus', description: 'Aprendes a comulgar con los espíritus animales.' },
        { name: 'Aspecto del Tótem', description: 'Eliges un tótem animal y ganas un beneficio basado en él mientras estás en furia (Oso, Águila, Alce, Tigre o Lobo).' }
      ],
      6: [{ name: 'Aspecto de la Bestia', description: 'Ganas un beneficio mágico basado en tu tótem animal.' }],
      10: [{ name: 'Caminante Espiritual', description: 'Puedes lanzar el conjuro Comunión con la Naturaleza como un ritual.' }],
      14: [{ name: 'Armonía Totémica', description: 'Mientras estás en furia, el espíritu totémico te protege aún más.' }]
    },
    isCustom: false, // Mark as base content example
  },
  {
    id: 'subclass-college-of-lore',
    name: 'Colegio del Saber',
    parentClassId: 'base-bard',
    description: 'Los bardos del Colegio del Saber conocen historias y secretos de todas partes.',
    featuresByLevel: {
      3: [
        { name: 'Competencias Adicionales', description: 'Ganas competencia en tres habilidades de tu elección.' },
        { name: 'Secretos Adicionales', description: 'Aprendes dos conjuros de cualquier clase. Deben ser de un nivel que puedas lanzar, como se muestra en la tabla de Conjuros Conocidos del Bardo, o un truco.' },
        { name: 'Palabras Hirientes', description: 'También en el nivel 3, aprendes a usar tu ingenio para distraer, confundir y minar la confianza y competencia de otros. Cuando una criatura que puedes ver a 60 pies de ti hace una tirada de ataque, una prueba de característica o una tirada de daño, puedes usar tu reacción para gastar uno de tus usos de Inspiración Bárdica, tirando el dado de Inspiración Bárdica y restando el número obtenido de la tirada de la criatura.' }
      ],
      6: [{ name: 'Secretos Mágicos Adicionales', description: 'En el nivel 6, aprendes dos conjuros de tu elección de cualquier clase. Un conjuro que elijas debe ser de un nivel que puedas lanzar, como se muestra en la tabla de Conjuros Conocidos del Bardo, o un truco.' }],
      14: [{ name: 'Habilidad Inigualable', description: 'En el nivel 14, cuando haces una prueba de característica, puedes gastar un uso de Inspiración Bárdica. Tira ese dado de Inspiración Bárdica y añade el número obtenido a tu prueba de característica. Puedes elegir hacer esto después de tirar el dado para la prueba de característica, pero antes de que el DM diga si tienes éxito o no.' }]
    },
    isCustom: false, // Mark as base content example
  }
];


const initialHeroForgeData: HeroForgeData = {
  characters: [],
  customSpecies: [],
  customClasses: [],
  customSubclasses: EXAMPLE_SUBCLASSES, // Added example subclasses
  customBackgrounds: [],
  customItems: [],
  customNPCs: [],
  customSpells: [],
};

const HeroForgeContext = createContext<HeroForgeContextState | undefined>(undefined);

const heroForgeReducer = (state: HeroForgeData, action: HeroForgeAction): HeroForgeData => {
  switch (action.type) {
    case 'LOAD_DATA': {
      const loadedData = action.payload;
      const finalSubclasses = loadedData.customSubclasses?.map(sc => ({ ...sc, id: String(sc.id) })) || [];
      EXAMPLE_SUBCLASSES.forEach(exSub => {
        if (!finalSubclasses.some(fs => fs.id === exSub.id)) {
          finalSubclasses.push(exSub);
        }
      });

      return {
        ...initialHeroForgeData,
        characters: loadedData.characters?.map(c => ({ ...c, id: String(c.id) })) || [],
        customSpecies: loadedData.customSpecies?.map(s => ({ ...s, id: String(s.id) })) || [],
        customClasses: loadedData.customClasses?.map(c => ({ ...c, id: String(c.id) })) || [],
        customSubclasses: finalSubclasses,
        customBackgrounds: loadedData.customBackgrounds?.map(b => ({ ...b, id: String(b.id) })) || [],
        customItems: loadedData.customItems?.map(i => ({ ...i, id: String(i.id) })) || [],
        customNPCs: loadedData.customNPCs?.map(npc => ({ ...npc, id: String(npc.id) })) || [],
        customSpells: loadedData.customSpells?.map(spell => ({ ...spell, id: String(spell.id) })) || [],
      };
    }
    case 'ADD_CHARACTER': {
      const existingIndex = state.characters.findIndex(char => char.id === action.payload.id);
      if (existingIndex !== -1) {
        const updatedCharacters = [...state.characters];
        updatedCharacters[existingIndex] = action.payload;
        return { ...state, characters: updatedCharacters };
      }
      return { ...state, characters: [...state.characters, action.payload] };
    }
    case 'UPDATE_CHARACTER': {
      return {
        ...state,
        characters: state.characters.map(char =>
          char.id === action.payload.id ? action.payload : char
        ),
      };
    }
    case 'DELETE_CHARACTER': {
      return { ...state, characters: state.characters.filter(char => char.id !== action.payload) };
    }
    case 'UPDATE_CHARACTER_INVENTORY': {
      return {
        ...state,
        characters: state.characters.map(char =>
          char.id === action.payload.characterId
            ? { ...char, equipment: action.payload.newEquipment }
            : char
        ),
      };
    }
    case 'ADD_CUSTOM_ITEM': {
      const { name, category, description, cost, weight, weaponDetails, armorDetails } = action.payload;
      const newItem: Item = {
        id: `custom-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name, category, description, cost, weight, weaponDetails, armorDetails, isCustom: true,
      };
      return { ...state, customItems: [...state.customItems, newItem] };
    }
    case 'ADD_CUSTOM_SPECIES': {
      const { name, size, speed, languages, traits } = action.payload;
      const newSpecies: DndSpecies = {
        id: `custom-species-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name, size, speed, languages, traits, isCustom: true
      };
      return { ...state, customSpecies: [...state.customSpecies, newSpecies] };
    }
    case 'ADD_CUSTOM_CLASS': {
      const { name, hitDie, primaryAbilities, savingThrowProficiencies, armorProficiencies, weaponProficiencies, toolProficiencies, skillProficiencies, startingEquipmentBundles, classFeaturesByLevel, subclassChoiceLevel, availableSubclassIds, weaponMasteriesKnown, spellcasting } = action.payload;
      const newClass: DndClass = {
        id: `custom-class-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name, hitDie, primaryAbilities, savingThrowProficiencies, armorProficiencies, weaponProficiencies, toolProficiencies, skillProficiencies, startingEquipmentBundles, classFeaturesByLevel, subclassChoiceLevel, availableSubclassIds, weaponMasteriesKnown, spellcasting, isCustom: true
      };
      return { ...state, customClasses: [...state.customClasses, newClass] };
    }
    case 'ADD_CUSTOM_SUBCLASS': {
      const { name, description, parentClassId, featuresByLevel, spellcastingAugments } = action.payload;
      const newSubclass: SubclassDefinition = {
        id: `custom-subclass-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        name, description, parentClassId, featuresByLevel, spellcastingAugments, isCustom: true
      };
      return { ...state, customSubclasses: [...state.customSubclasses, newSubclass] };
    }
    case 'ADD_CUSTOM_BACKGROUND': {
      const { name, skillProficiencies, toolProficiencies, languages, startingEquipment, originFeat, asi } = action.payload;
      const newBackground: DndBackground = {
        id: `custom-background-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name, skillProficiencies, toolProficiencies, languages, startingEquipment, originFeat, asi, isCustom: true
      };
      return { ...state, customBackgrounds: [...state.customBackgrounds, newBackground] };
    }
    case 'ADD_CUSTOM_NPC': {
      const { name, size, type, alignment, armorClass, acType, hitPoints, hitDice, speed, abilityScores, savingThrows, skills, damageVulnerabilities, damageResistances, damageImmunities, conditionImmunities, senses, languages, challengeRating, xp, specialAbilities, actions, reactions, legendaryActions, lairActions, description, source } = action.payload;
      const newNpc: NPCData = {
        id: `custom-npc-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        name, size, type, alignment, armorClass, acType, hitPoints, hitDice, speed, abilityScores, savingThrows, skills, damageVulnerabilities, damageResistances, damageImmunities, conditionImmunities, senses, languages, challengeRating, xp, specialAbilities, actions, reactions, legendaryActions, lairActions, description, source, isCustom: true
      };
      return { ...state, customNPCs: [...state.customNPCs, newNpc] };
    }
    case 'ADD_CUSTOM_SPELL': {
      const { name, level, school, castingTime, range, components, duration, description, higherLevelDescription, requiresAttackRoll, requiresSavingThrow, savingThrowAbility, damageType } = action.payload;
      const newSpell: SpellDefinition = {
        id: `custom-spell-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        name, level, school, castingTime, range, components, duration, description, higherLevelDescription, requiresAttackRoll, requiresSavingThrow, savingThrowAbility, damageType, isCustom: true
      };
      return { ...state, customSpells: [...state.customSpells, newSpell] };
    }
    case 'UPDATE_CUSTOM_ITEM':
      return { ...state, customItems: state.customItems.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'UPDATE_CUSTOM_SPECIES':
      return { ...state, customSpecies: state.customSpecies.map(species => species.id === action.payload.id ? action.payload : species) };
    case 'UPDATE_CUSTOM_CLASS':
      return { ...state, customClasses: state.customClasses.map(cls => cls.id === action.payload.id ? action.payload : cls) };
    case 'UPDATE_CUSTOM_SUBCLASS':
      return { ...state, customSubclasses: state.customSubclasses.map(sc => sc.id === action.payload.id ? action.payload : sc) };
    case 'UPDATE_CUSTOM_BACKGROUND':
      return { ...state, customBackgrounds: state.customBackgrounds.map(bg => bg.id === action.payload.id ? action.payload : bg) };
    case 'UPDATE_CUSTOM_NPC':
      return { ...state, customNPCs: state.customNPCs.map(npc => npc.id === action.payload.id ? action.payload : npc) };
    case 'UPDATE_CUSTOM_SPELL':
      return { ...state, customSpells: state.customSpells.map(spell => spell.id === action.payload.id ? action.payload : spell) };
    case 'DELETE_CUSTOM_ITEM':
      return { ...state, customItems: state.customItems.filter(item => item.id !== action.payload) };
    case 'DELETE_CUSTOM_SPECIES':
      return { ...state, customSpecies: state.customSpecies.filter(species => species.id !== action.payload) };
    case 'DELETE_CUSTOM_CLASS':
      return { ...state, customClasses: state.customClasses.filter(cls => cls.id !== action.payload) };
    case 'DELETE_CUSTOM_SUBCLASS':
      return { ...state, customSubclasses: state.customSubclasses.filter(sc => sc.id !== action.payload) };
    case 'DELETE_CUSTOM_BACKGROUND':
      return { ...state, customBackgrounds: state.customBackgrounds.filter(bg => bg.id !== action.payload) };
    case 'DELETE_CUSTOM_NPC':
      return { ...state, customNPCs: state.customNPCs.filter(npc => npc.id !== action.payload) };
    case 'DELETE_CUSTOM_SPELL':
      return { ...state, customSpells: state.customSpells.filter(spell => spell.id !== action.payload) };
    default:
      return state;
  }
};

interface HeroForgeProviderProps {
  children: ReactNode;
}

export const HeroForgeProvider: React.FC<HeroForgeProviderProps> = ({ children }) => {
  const [data, dispatch] = useReducer(heroForgeReducer, initialHeroForgeData);

  return (
    <HeroForgeContext.Provider value={{ data, dispatch }}>
      {children}
    </HeroForgeContext.Provider>
  );
};

export const useHeroForge = (): HeroForgeContextState => {
  const context = useContext(HeroForgeContext);
  if (!context) {
    throw new Error('useHeroForge must be used within a HeroForgeProvider');
  }
  return context;
};
