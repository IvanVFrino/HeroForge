
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { 
  DndSpecies, DndClass, DndBackground, Item, NPCData,
  ItemCategory, ITEM_CATEGORIES, 
  AbilityScoreName, SkillName, Trait, StartingEquipmentItem, ClassSpellcasting,
  WEAPON_PROPERTIES_CONST, DAMAGE_TYPES_CONST, ARMOR_TYPES_CONST, Size, Alignment,
  ParsedNpcAttackAction,
  AbilityScores, 
  // Fix: Correctly import these from types.ts
  ABILITY_SCORE_NAMES_ORDERED as VALID_ABILITY_SCORE_NAMES,
  SIZES_LIST,
  ALIGNMENTS_LIST,
} from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { ArrowUturnLeftIcon, SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, BoltIcon } from '@heroicons/react/24/outline';
// Fix: Import GoogleGenAI and GenerateContentResponse correctly
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Define expected structure from AI

// For an element within the createdNPCs array from AI
interface AiNpcObject extends Omit<NPCData, 'id' | 'isCustom' | 'savingThrows' | 'skills' | 'abilityScores' | 'specialAbilities' | 'actions' | 'reactions' | 'legendaryActions'> {
    abilityScores?: Partial<AbilityScores>; // AI might not provide all
    savingThrows?: Array<{ability: AbilityScoreName, bonus: number}>;
    skills?: Array<{skill: SkillName, bonus: number}>;
    specialAbilities?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    actions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    reactions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    legendaryActions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
}

interface AiGeneratedMassData {
  createdClasses?: Array<Omit<DndClass, 'id' | 'isCustom'>>;
  createdSpecies?: Array<Omit<DndSpecies, 'id' | 'isCustom'>>;
  createdBackgrounds?: Array<Omit<DndBackground, 'id' | 'isCustom'>>;
  createdItems?: Array<Omit<Item, 'id' | 'isCustom' | 'quantity'>>;
  createdNPCs?: Array<AiNpcObject>;
}

const ALL_VALID_SKILL_NAMES = SKILL_DEFINITIONS.map(sd => sd.name);
// Fix: Define default ability scores for NPCs
const defaultNpcAbilityScores: AbilityScores = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };


const MassContentCreator: React.FC = () => {
  const { dispatch } = useHeroForge();
  // Fix: Initialize GoogleGenAI with apiKey from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const [userPrompt, setUserPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim()) {
      setAiError("Por favor, introduce una descripción del contenido que deseas generar.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setSuccessMessage(null);

    const systemPrompt = `
      Eres un asistente experto en Dungeons & Dragons 5ª Edición, especializado en la creación de contenido personalizado.
      El usuario te proporcionará una descripción de varios elementos de juego que desea crear (clases, especies, trasfondos, objetos, PNJs/monstruos).
      Tu tarea es interpretar la solicitud y generar un único objeto JSON que contenga arrays para cada tipo de contenido solicitado.
      La estructura del JSON de respuesta DEBE ser:
      {
        "createdClasses": [ /* Array de objetos DndClass. Omitir si no se piden clases. */ ],
        "createdSpecies": [ /* Array de objetos DndSpecies. Omitir si no se piden especies. */ ],
        "createdBackgrounds": [ /* Array de objetos DndBackground. Omitir si no se piden trasfondos. */ ],
        "createdItems": [ /* Array de objetos Item (sin id, isCustom, quantity). Omitir si no se piden objetos. */ ],
        "createdNPCs": [ /* Array de objetos NPCData. Omitir si no se piden PNJs. */ ]
      }

      Para cada tipo de contenido, adhiérete estrictamente a las siguientes definiciones de estructura y validaciones:

      1. DndClass: (ver prompt anterior para detalles si es necesario)
         - name: string, hitDie: number (4,6,8,10,12), primaryAbilities: AbilityScoreName[], savingThrowProficiencies: AbilityScoreName[], armorProficiencies: string[], weaponProficiencies: string[],
         - toolProficiencies: { choices?: string[], count?: number, fixed?: string[] },
         - skillProficiencies: { choices: SkillName[], count: number } (SkillName de: ${ALL_VALID_SKILL_NAMES.join(', ')}),
         - startingEquipmentBundles: Array<{ key: string, description: string, items: StartingEquipmentItem[], gold?: number, isInstructional?: boolean }>. Items deben tener category, weaponDetails/armorDetails si aplican.
         - classFeaturesLevel1: Trait[] (Trait: { name: string, description: string }),
         - weaponMasteriesKnown?: number, spellcasting?: ClassSpellcasting.

      2. DndSpecies: (ver prompt anterior para detalles si es necesario)
         - name: string, size: Size (de: ${SIZES_LIST.join(' | ')}), speed: number, languages: string[], traits: Trait[].

      3. DndBackground: (ver prompt anterior para detalles si es necesario)
         - name: string, skillProficiencies: SkillName[], toolProficiencies?: string[], languages?: string[],
         - startingEquipment: { items: StartingEquipmentItem[], gold: number } (Items como en DndClass),
         - originFeat: string, asi: { options: AbilityScoreName[] }.

      4. Item (para createdItems): (ver prompt anterior para detalles si es necesario)
         - name: string, category: ItemCategory (de: ${ITEM_CATEGORIES.join(' | ')}), description?: string, cost?: string | { quantity: number, unit: "gp"|"sp"|"cp" }, weight?: string | { value: number, unit: "lb" },
         - weaponDetails?: WeaponDetails (damageDice, damageType (de: ${DAMAGE_TYPES_CONST.join(' | ')}) obligatorios. properties: WeaponProperty[] (de: ${WEAPON_PROPERTIES_CONST.join(' | ')})),
         - armorDetails?: ArmorDetails (baseAC, addDexModifier obligatorios. armorType (de: ${ARMOR_TYPES_CONST.join(' | ')})).

      5. NPCData (para createdNPCs):
         - name: string, size: Size, type: string, alignment: Alignment (de: ${ALIGNMENTS_LIST.join(' | ')}),
         - armorClass: number, acType?: string, hitPoints: number, hitDice: string, speed: string,
         - abilityScores: { Strength: number, Dexterity: number, Constitution: number, Intelligence: number, Wisdom: number, Charisma: number },
         - savingThrows?: Array<{ability: AbilityScoreName, bonus: number}>, (ability de: ${VALID_ABILITY_SCORE_NAMES.join(', ')}),
         - skills?: Array<{skill: SkillName, bonus: number}>, (skill de: ${ALL_VALID_SKILL_NAMES.join(', ')})
         - damageVulnerabilities?: string[], damageResistances?: string[], damageImmunities?: string[], conditionImmunities?: string[],
         - senses?: string, languages?: string, challengeRating: string, xp?: number,
         - specialAbilities?: Trait[], actions?: Trait[], reactions?: Trait[], legendaryActions?: Trait[],
         - description?: string, source?: string.
         - **IMPORTANTE para Traits en NPCData (specialAbilities, actions, etc.)**:
           Cada Trait tiene 'name', 'description' Y opcionalmente 'parsedAttack'.
           - Si el Trait es un **ataque directo**: \`parsedAttack: { attack: { bonus: number, reach?: string, range?: string, target?: string }, hit: { diceString: string, damageType: DamageType }, versatile?: { diceString: string, damageType: DamageType } }\`.
           - Si el Trait es un **efecto de salvación**: \`parsedAttack: { savingThrow: { dc: number, ability: AbilityScoreName }, hit: { diceString: string (daño en fallo), damageType: DamageType } }\`.
           - Si no es ni ataque ni salvación, \`parsedAttack\` debe ser \`null\` u omitido.
           - \`damageType\` en \`parsedAttack.hit\` y \`parsedAttack.versatile\` DEBE ser uno de: ${DAMAGE_TYPES_CONST.join(' | ')}.
           - \`ability\` en \`parsedAttack.savingThrow\` DEBE ser uno de: ${VALID_ABILITY_SCORE_NAMES.join(', ')}.

      Consideraciones Generales:
      - Omite claves opcionales si no son relevantes o no hay información. No uses objetos vacíos ({}) para detalles opcionales; omite la clave o usa null.
      - Responde ÚNICAMENTE con el objeto JSON.

      Solicitud del usuario: "${userPrompt}"
    `;

    try {
      // Fix: Use ai.models.generateContent for text generation
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17", // Use a valid text model
        contents: systemPrompt,
        config: { responseMimeType: "application/json" }
      });

      // Fix: Access text from GenerateContentResponse using response.text
      if (typeof response.text !== 'string') {
        setAiError("La respuesta de la IA no contiene texto válido para procesar.");
        setIsAiLoading(false);
        return;
      }
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      const aiData: AiGeneratedMassData = JSON.parse(jsonStr);
      let createdCount = 0;
      let createdNames: string[] = [];

      if (aiData.createdClasses && Array.isArray(aiData.createdClasses)) {
        aiData.createdClasses.forEach(classData => {
          if (classData.name && classData.hitDie) {
            dispatch({ type: 'ADD_CUSTOM_CLASS', payload: classData });
            createdCount++;
            createdNames.push(`${classData.name} (Clase)`);
          }
        });
      }
      if (aiData.createdSpecies && Array.isArray(aiData.createdSpecies)) {
        aiData.createdSpecies.forEach(speciesData => {
          if (speciesData.name && speciesData.size && speciesData.speed) {
            dispatch({ type: 'ADD_CUSTOM_SPECIES', payload: speciesData });
            createdCount++;
            createdNames.push(`${speciesData.name} (Especie)`);
          }
        });
      }
      if (aiData.createdBackgrounds && Array.isArray(aiData.createdBackgrounds)) {
        aiData.createdBackgrounds.forEach(backgroundData => {
          if (backgroundData.name && backgroundData.skillProficiencies && backgroundData.originFeat && backgroundData.asi) {
            dispatch({ type: 'ADD_CUSTOM_BACKGROUND', payload: backgroundData });
            createdCount++;
            createdNames.push(`${backgroundData.name} (Trasfondo)`);
          }
        });
      }
      if (aiData.createdItems && Array.isArray(aiData.createdItems)) {
        aiData.createdItems.forEach(itemData => {
          if (itemData.name && itemData.category) {
            dispatch({ type: 'ADD_CUSTOM_ITEM', payload: itemData });
            createdCount++;
            createdNames.push(`${itemData.name} (Objeto)`);
          }
        });
      }
      if (aiData.createdNPCs && Array.isArray(aiData.createdNPCs)) {
        aiData.createdNPCs.forEach(npcData => { // npcData is AiNpcObject here
          if (npcData.name && npcData.type && npcData.hitPoints && npcData.challengeRating) {
            const finalSavingThrows: Partial<Record<AbilityScoreName, number>> = {};
            if (Array.isArray(npcData.savingThrows)) {
                npcData.savingThrows.forEach(st => {
                    if (st.ability && typeof st.bonus === 'number') {
                        finalSavingThrows[st.ability] = st.bonus;
                    }
                });
            }
            const finalSkills: Partial<Record<SkillName, number>> = {};
             if (Array.isArray(npcData.skills)) {
                npcData.skills.forEach(sk => {
                    if (sk.skill && typeof sk.bonus === 'number') {
                        finalSkills[sk.skill] = sk.bonus;
                    }
                });
            }
            // Construct the payload to match Omit<NPCData, 'id' | 'isCustom'>
            const payloadForDispatch: Omit<NPCData, 'id' | 'isCustom'> = {
                name: npcData.name,
                size: npcData.size,
                type: npcData.type,
                alignment: npcData.alignment,
                armorClass: npcData.armorClass,
                acType: npcData.acType,
                hitPoints: npcData.hitPoints,
                hitDice: npcData.hitDice,
                speed: npcData.speed,
                // Fix: Ensure abilityScores is a full AbilityScores object
                abilityScores: { ...defaultNpcAbilityScores, ...(npcData.abilityScores || {}) },
                savingThrows: finalSavingThrows,
                skills: finalSkills,
                damageVulnerabilities: npcData.damageVulnerabilities,
                damageResistances: npcData.damageResistances,
                damageImmunities: npcData.damageImmunities,
                conditionImmunities: npcData.conditionImmunities,
                senses: npcData.senses,
                languages: npcData.languages,
                challengeRating: npcData.challengeRating,
                xp: npcData.xp,
                specialAbilities: npcData.specialAbilities as Trait[] | undefined, // Cast as Trait[] assuming AI provides full Trait objects
                actions: npcData.actions as Trait[] | undefined,
                reactions: npcData.reactions as Trait[] | undefined,
                legendaryActions: npcData.legendaryActions as Trait[] | undefined,
                description: npcData.description,
                source: npcData.source
            };
            dispatch({ type: 'ADD_CUSTOM_NPC', payload: payloadForDispatch });
            createdCount++;
            createdNames.push(`${npcData.name} (PNJ/Monstruo)`);
          }
        });
      }


      if (createdCount > 0) {
        setSuccessMessage(`¡Contenido generado y añadido con éxito!\n- ${createdNames.join('\n- ')}`);
        setUserPrompt(''); 
      } else {
        setAiError("La IA no pudo generar contenido válido basado en tu descripción o la respuesta no fue la esperada.");
      }

    } catch (e) {
      console.error("Error al generar contenido en masa con IA:", e);
      setAiError(`Falló la generación de contenido. Error: ${(e as Error).message}. Revisa la consola para más detalles.`);
    } finally {
      setIsAiLoading(false);
    }
  };
  

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400 flex items-center">
          <BoltIcon className="h-8 w-8 mr-2 text-yellow-500 dark:text-yellow-400" />
          Creador de Contenido en Masa (IA)
        </h1>
        <Link
          to="/main-menu"
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700"
        >
          <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
          Volver al Menú
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
        <div>
          <label htmlFor="userPrompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Describe el contenido que deseas crear
          </label>
          <textarea
            id="userPrompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Ejemplo: Una clase de guerrero estoico enfocada en defensa, una especie elfo del bosque sigiloso, un trasfondo de erudito y un amuleto mágico de curación."
            rows={6}
            className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            disabled={isAiLoading}
            aria-label="Descripción del contenido a generar con IA"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Puedes pedir múltiples tipos de contenido (clases, especies, trasfondos, objetos, PNJs) en una sola petición.
          </p>
        </div>

        {aiError && (
          <div role="alert" className="p-3 bg-red-100 dark:bg-red-900/70 text-red-700 dark:text-red-200 text-sm rounded-md border border-red-300 dark:border-red-700 flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-red-500 dark:text-red-300" aria-hidden="true" />
            <pre className="whitespace-pre-wrap font-sans">{aiError}</pre>
          </div>
        )}
        {successMessage && (
          <div role="alert" className="p-3 bg-green-100 dark:bg-green-900/70 text-green-700 dark:text-green-200 text-sm rounded-md border border-green-300 dark:border-green-700 flex items-start">
            <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-green-500 dark:text-green-300" aria-hidden="true" />
            <pre className="whitespace-pre-wrap font-sans">{successMessage}</pre>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isAiLoading || !userPrompt.trim()}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-slate-800 dark:text-white bg-yellow-400 dark:bg-yellow-500 hover:bg-yellow-500 dark:hover:bg-yellow-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
            aria-live="polite"
          >
            {isAiLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando Contenido...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                Generar con IA
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MassContentCreator;
