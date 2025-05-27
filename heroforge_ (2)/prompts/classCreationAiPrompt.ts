
// prompts/classCreationAiPrompt.ts
import { HIT_DICE_OPTIONS, ALL_SKILL_NAMES_OBJECT, ITEM_CATEGORIES, DAMAGE_TYPES_LIST, WEAPON_PROPERTIES_LIST, ARMOR_TYPES_LIST } from '../constants/promptConstants'; // Assuming a new constants file for these
import { AbilityScoreName, SkillName } from '../types';


export const CLASS_CREATION_AI_PROMPT = (userInput: string) => `
Eres un diseñador experto de clases de D&D 5e. Genera un objeto JSON para una nueva clase basado en la idea del usuario.
El JSON debe seguir esta estructura:
{
    "name": "Nombre de la Clase (string)",
    "hitDie": "Dado de Golpe (number, uno de: ${HIT_DICE_OPTIONS.join(', ')})",
    "primaryAbilities": ["Array de AbilityScoreName, ej: ['Strength', 'Charisma']"],
    "savingThrowProficiencies": ["Array de AbilityScoreName para competencias en salvación"],
    "armorProficiencies": ["Array de strings, ej: ['Light Armor', 'Shields']"],
    "weaponProficiencies": ["Array de strings, ej: ['Simple Weapons', 'Longswords']"],
    "toolProficiencies": { "choices": ["Array de strings para opciones"], "count": "number de elecciones", "fixed": ["Array de strings para fijas"] },
    "skillProficiencies": { "choices": ["Array de SkillName de la lista: \${ALL_SKILL_NAMES_OBJECT.map(s=>s.name).join(', ')}"], "count": "number de elecciones (usualmente 2-4)" },
    "startingEquipmentBundles": [ { "key": "A", "description": "Descripción Lote A", "items": [ { "name": "Objeto", "quantity": 1, "category": "Weapon|Armor|Miscellaneous", "weaponDetails": {...}, "armorDetails": {...} } ], "gold": 10 } ],
    "classFeaturesByLevel": { "1": [{ "name": "Rasgo Nivel 1", "description": "..."}], "2": [...] },
    "subclassChoiceLevel": "Nivel en que se elige subclase (number, ej. 3)",
    "availableSubclassIds": ["Array de IDs de subclases (opcional, puede ser vacío)"],
    "weaponMasteriesKnown": "number o null (usualmente para clases marciales, ej. 2)",
    "spellcasting": { // Opcional, solo para clases lanzadoras de conjuros
        "ability": "AbilityScoreName", // Característica para lanzar conjuros
        "preparationType": "known | prepared", // Cómo se seleccionan los conjuros
        "spellList": ["Hechizo1", "Hechizo2"], // Lista de nombres/IDs de conjuros disponibles
        "progression": { // Record<number, SpellcastingLevelProgressionEntry>. Key: nivel del personaje (1, 2, ...)
            "1": { "cantripsKnown": 2, "spellsKnown": 4, "spellSlots": [2,0,0,0,0,0,0,0,0] }, // Ejemplo Nivel 1
            "2": { "cantripsKnown": 2, "spellsKnown": 5, "spellSlots": [3,0,0,0,0,0,0,0,0] }  // Ejemplo Nivel 2
            // ... y así sucesivamente para los niveles relevantes
        }
      }
}
Idea de la clase del usuario: "${userInput}"
Responde ÚNICAMENTE con el objeto JSON. Sé creativo pero mantén el equilibrio del juego.
Para 'items' en 'startingEquipmentBundles':
- Si es un arma, incluye 'weaponDetails'.
- Si es armadura, incluye 'armorDetails'.
- Si es misceláneo, omite 'weaponDetails' y 'armorDetails'.
- 'category' debe ser uno de: \${ITEM_CATEGORIES.join(' | ')}.
- 'damageType' (si aplica) debe ser uno de: \${DAMAGE_TYPES_LIST.join(' | ')}.
- 'properties' de arma (si aplica) debe ser un array de: \${WEAPON_PROPERTIES_LIST.join(' | ')}.
- 'armorType' (si aplica) debe ser uno de: \${ARMOR_TYPES_LIST.join(' | ')} o null/omitido para escudos/genéricos.
- 'weaponDetails' o 'armorDetails' pueden ser null u omitidos si no aplican a la categoría, PERO si se proveen, no deben ser un objeto vacío como {}. Si son {}, es mejor omitir la clave.
Para 'classFeaturesByLevel', la clave es el nivel (como string o número) y el valor es un array de objetos Trait.
Para 'spellcasting', 'preparationType' es importante, puede ser 'known' o 'prepared'. Si la clase es como un Mago o Clérigo, usa 'prepared'. Si es como Bardo o Hechicero, usa 'known'. Si dudas, usa 'known'.
Asegúrate que la estructura de 'spellcasting.progression' sea un objeto donde cada clave es un nivel de personaje (ej: "1", "2") y el valor es un objeto con cantripsKnown, spellsKnown y spellSlots (array de 9 números).
`;
