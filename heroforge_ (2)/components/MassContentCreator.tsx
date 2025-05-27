// Author: GeminiFrontendExpert
// OS support: All modern browsers with ESModule support
// Description: Component for mass content creation using AI.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import {
  DndSpecies, DndClass, DndBackground, Item, NPCData, SpellDefinition,
  ItemCategory, ITEM_CATEGORIES,
  AbilityScoreName, SkillName, Trait, StartingEquipmentItem, ClassSpellcasting, ClassSpellcastingProgressionEntry, EquipmentBundle,
  WEAPON_PROPERTIES_CONST, DAMAGE_TYPES_CONST, ARMOR_TYPES_CONST, Size, Alignment,
  ParsedNpcAttackAction,
  AbilityScores,
  ABILITY_SCORE_NAMES_ORDERED as VALID_ABILITY_SCORE_NAMES,
  SIZES_LIST,
  ALIGNMENTS_LIST,
  SpellSchoolName,
  DamageType,
  WeaponProperty,
  ArmorType,
  WeaponDetails,
  ArmorDetails
} from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { SPELL_SCHOOLS_DATA } from '../../constants/spells';
import { ArrowUturnLeftIcon, SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, BoltIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { parseNpcAttackAction } from '../../utils/diceRoller';

const ALL_VALID_SKILL_NAMES = SKILL_DEFINITIONS.map(sd => sd.name);
const defaultNpcAbilityScores: AbilityScores = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };
const HIT_DICE_OPTIONS = [4, 6, 8, 10, 12];

interface AiNpcObject extends Omit<NPCData, 'id' | 'isCustom' | 'savingThrows' | 'skills' | 'abilityScores' | 'specialAbilities' | 'actions' | 'reactions' | 'legendaryActions'> {
    abilityScores?: Partial<AbilityScores>;
    savingThrows?: Array<{ability: AbilityScoreName, bonus: number}>;
    skills?: Array<{skill: SkillName, bonus: number}>;
    specialAbilities?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    actions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    reactions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    legendaryActions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
}

interface AiGeneratedDndClassFlatSpellcasting {
    ability: AbilityScoreName;
    preparationType?: 'known' | 'prepared';
    spellList?: string[];
    knownCantripsL1?: number;
    spellsKnownL1?: number;
    spellSlotsL1Array?: number[];
}

interface AiGeneratedDndClass extends Omit<DndClass, 'id' | 'isCustom' | 'spellcasting' | 'classFeaturesByLevel' | 'startingEquipmentBundles'> {
    classFeaturesLevel1?: Array<Partial<Trait>>;
    classFeaturesByLevel?: Record<number, Array<Partial<Trait>>>;
    spellcasting?: Partial<ClassSpellcasting> | AiGeneratedDndClassFlatSpellcasting;
    startingEquipmentBundles?: Array<Partial<EquipmentBundle> & {items?: Array<Partial<StartingEquipmentItem>>}>;
}

interface AiGeneratedMassData {
  createdClasses?: Array<AiGeneratedDndClass>;
  createdSpecies?: Array<Omit<DndSpecies, 'id' | 'isCustom'>>;
  createdBackgrounds?: Array<Omit<DndBackground, 'id' | 'isCustom'>>;
  createdItems?: Array<Omit<Item, 'id' | 'isCustom' | 'quantity'>>;
  createdNPCs?: Array<AiNpcObject>;
  createdSpells?: Array<Omit<SpellDefinition, 'id' | 'isCustom'>>;
}


const MassContentCreator: React.FC = () => {
  const { dispatch } = useHeroForge();
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
      El usuario te proporcionará una descripción de varios elementos de juego que desea crear (clases, especies, trasfondos, objetos, PNJs/monstruos, conjuros).
      Tu tarea es interpretar la solicitud y generar un único objeto JSON que contenga arrays para cada tipo de contenido solicitado.
      La estructura del JSON de respuesta DEBE ser:
      {
        "createdClasses": [ /* Array de objetos DndClass. Omitir si no se piden clases. */ ],
        "createdSpecies": [ /* Array de objetos DndSpecies. Omitir si no se piden especies. */ ],
        "createdBackgrounds": [ /* Array de objetos DndBackground. Omitir si no se piden trasfondos. */ ],
        "createdItems": [ /* Array de objetos Item (sin id, isCustom, quantity). Omitir si no se piden objetos. */ ],
        "createdNPCs": [ /* Array de objetos NPCData. Omitir si no se piden PNJs. */ ],
        "createdSpells": [ /* Array de objetos SpellDefinition (sin id, isCustom). Omitir si no se piden conjuros. */ ]
      }

      IMPORTANTE: Para cada tipo de contenido, sigue la estructura y validaciones de los formularios individuales (ej., CreateCustomClassForm, CreateCustomItemForm, etc.).
      - Para Clases: 'name', 'hitDie' (de ${HIT_DICE_OPTIONS.join(', ')}), 'primaryAbilities' (array de AbilityScoreName), 'savingThrowProficiencies' (array de AbilityScoreName), 'skillProficiencies.choices' (array de SkillName de ${ALL_VALID_SKILL_NAMES.join(', ')}), 'skillProficiencies.count', 'classFeaturesByLevel' (objeto con niveles como claves, ej {"1": [{"name":"feat1", "description":"..."}]}). Si la clase tiene 'spellcasting', debe tener 'ability', 'preparationType', 'spellList', y 'progression' (objeto con niveles como claves y valores con 'cantripsKnown', 'spellsKnown', 'spellSlots' como array de 9 números). Si 'spellcasting' se devuelve como una estructura plana con solo datos de L1 (ej. 'knownCantripsL1', 'spellsKnownL1', 'spellSlotsL1Array'), asegúrate de que sea convertible a la estructura 'progression'. 'startingEquipmentBundles' es un array de objetos EquipmentBundle.
      - Para Especies: 'name', 'size' (de ${SIZES_LIST.join(' | ')}), 'speed', 'languages' (array de strings), 'traits' (array de objetos Trait).
      - Para Trasfondos: 'name', 'skillProficiencies' (array de SkillName), 'originFeat', 'asi.options' (array de AbilityScoreName), 'startingEquipment' (con 'items' y 'gold').
      - Para Objetos: 'name', 'category' (de ${ITEM_CATEGORIES.join(' | ')}). Si es 'Weapon', incluir 'weaponDetails' con 'damageDice', 'damageType' (de ${DAMAGE_TYPES_CONST.join(' | ')}), 'properties' (array de ${WEAPON_PROPERTIES_CONST.join(' | ')}). Si es 'Armor', incluir 'armorDetails' con 'baseAC', 'armorType' (de ${ARMOR_TYPES_CONST.join(' | ')}).
      - Para PNJs: 'name', 'size', 'type', 'alignment', 'armorClass', 'hitPoints', 'hitDice', 'speed'. 'abilityScores' DEBE ser un objeto completo con las 6 características. 'savingThrows' y 'skills' DEBEN ser arrays de objetos {ability/skill: Name, bonus: number}. 'specialAbilities', 'actions', 'reactions', 'legendaryActions' son arrays de objetos Trait; si un rasgo es un ataque o efecto de salvación, INCLUYE 'parsedAttack' con los detalles apropiados ('attack', 'hit', 'versatile', 'savingThrow').
      - Para Conjuros: 'name', 'level' (0-9), 'school' (SpellSchoolName de ${SPELL_SCHOOLS_DATA.map(s => s.name).join(' | ')}), 'description'.

      Si un tipo de contenido no se solicita, su array correspondiente debe estar vacío u omitido del JSON.
      Genera tantos objetos como se soliciten, dentro de sus respectivos arrays.
      Asegúrate de que todos los campos obligatorios para cada tipo estén presentes y que los tipos de datos sean correctos.
      Los nombres de habilidades, características, etc., deben ser consistentes con D&D 5e.

      Solicitud del usuario: "${userPrompt}"

      Responde ÚNICAMENTE con el objeto JSON. No incluyas explicaciones adicionales.
    `;

    try {
      const geminiResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: systemPrompt,
        config: { responseMimeType: "application/json" }
      });

      if (typeof geminiResponse.text !== 'string') {
        setAiError("Respuesta de IA inválida: el contenido del texto está ausente o no es una cadena.");
        setIsAiLoading(false);
        return;
      }
      
      let jsonStr = geminiResponse.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      
      if (match && typeof match[2] === 'string') {
        jsonStr = match[2].trim();
      } else if (match && match[2] === undefined) {
        jsonStr = ""; 
        console.warn("AI response markdown fence found, but content group was undefined. Parsing as empty JSON.");
      }


      const aiData: AiGeneratedMassData = JSON.parse(jsonStr);
      let createdCount = 0;
      let errors: string[] = [];

      if (aiData.createdClasses) {
        aiData.createdClasses.forEach(clsData => {
          if (!clsData.name || !clsData.hitDie || !clsData.primaryAbilities || !clsData.savingThrowProficiencies || !clsData.skillProficiencies) {
            errors.push(`Clase omitida (${clsData.name || 'Sin Nombre'}) debido a campos obligatorios faltantes.`);
            return;
          }

          let spellcastingData: ClassSpellcasting | undefined = undefined;
          if (clsData.spellcasting) {
              const sc = clsData.spellcasting as any;
              if (sc.ability && (sc.progression || (sc.knownCantripsL1 !== undefined && sc.spellsKnownL1 !== undefined && sc.spellSlotsL1Array))) {
                  let progression: Record<number, ClassSpellcastingProgressionEntry> = {};
                  if (sc.progression) {
                      progression = sc.progression;
                  } else {
                      progression[1] = {
                          cantripsKnown: sc.knownCantripsL1 || 0,
                          spellsKnown: sc.spellsKnownL1 || 0,
                          spellSlots: Array.isArray(sc.spellSlotsL1Array) && sc.spellSlotsL1Array.length === 9 ? sc.spellSlotsL1Array : [0,0,0,0,0,0,0,0,0]
                      };
                  }
                  spellcastingData = {
                      ability: sc.ability,
                      preparationType: sc.preparationType || 'known',
                      spellList: sc.spellList || [],
                      progression: progression
                  };
              }
          }
          
          let features = clsData.classFeaturesByLevel || {};
          if (!clsData.classFeaturesByLevel && clsData.classFeaturesLevel1) {
              features[1] = (clsData.classFeaturesLevel1 as Trait[]).filter(f => f.name && f.description);
          }


          const finalClass: Omit<DndClass, 'id' | 'isCustom'> = {
            name: clsData.name,
            hitDie: HIT_DICE_OPTIONS.includes(clsData.hitDie) ? clsData.hitDie : 8,
            primaryAbilities: clsData.primaryAbilities.filter(ab => VALID_ABILITY_SCORE_NAMES.includes(ab as AbilityScoreName)) as AbilityScoreName[],
            savingThrowProficiencies: clsData.savingThrowProficiencies.filter(ab => VALID_ABILITY_SCORE_NAMES.includes(ab as AbilityScoreName)) as AbilityScoreName[],
            armorProficiencies: clsData.armorProficiencies || [],
            weaponProficiencies: clsData.weaponProficiencies || [],
            toolProficiencies: clsData.toolProficiencies || { choices: [], count: 0, fixed: [] },
            skillProficiencies: {
                choices: (clsData.skillProficiencies.choices || []).filter(sk => ALL_VALID_SKILL_NAMES.includes(sk as SkillName)) as SkillName[],
                count: clsData.skillProficiencies.count || 2
            },
            startingEquipmentBundles: (clsData.startingEquipmentBundles || []).map(b => ({
                key: b?.key || `bundle_${Math.random().toString(36).substring(2, 7)}`,
                description: b?.description || "Equipo inicial",
                items: (b?.items || []).map(i => ({
                    name: i?.name || 'Objeto',
                    quantity: i?.quantity || 1,
                    category: i?.category && ITEM_CATEGORIES.includes(i.category) ? i.category : 'Miscellaneous',
                    weaponDetails: i?.weaponDetails as WeaponDetails | undefined,
                    armorDetails: i?.armorDetails as ArmorDetails | undefined,
                })),
                gold: b?.gold || 0
            })) as EquipmentBundle[],
            classFeaturesByLevel: features as Record<number, Trait[]>,
            subclassChoiceLevel: clsData.subclassChoiceLevel || 3,
            availableSubclassIds: clsData.availableSubclassIds || [],
            weaponMasteriesKnown: clsData.weaponMasteriesKnown,
            spellcasting: spellcastingData,
          };
          dispatch({ type: 'ADD_CUSTOM_CLASS', payload: finalClass });
          createdCount++;
        });
      }

      if (aiData.createdSpecies) {
        aiData.createdSpecies.forEach(spData => {
          if (!spData.name || !spData.size || !spData.speed || !spData.languages || !spData.traits) {
            errors.push(`Especie omitida (${spData.name || 'Sin Nombre'}) debido a campos obligatorios faltantes.`);
            return;
          }
          const finalSpecies: Omit<DndSpecies, 'id' | 'isCustom'> = {
            name: spData.name,
            size: SIZES_LIST.includes(spData.size) ? spData.size : 'Medium',
            speed: typeof spData.speed === 'number' ? spData.speed : 30,
            languages: Array.isArray(spData.languages) ? spData.languages : ['Común'],
            traits: (spData.traits as Trait[]).filter(t => t.name && t.description)
          };
          dispatch({ type: 'ADD_CUSTOM_SPECIES', payload: finalSpecies });
          createdCount++;
        });
      }

      if (aiData.createdBackgrounds) {
        aiData.createdBackgrounds.forEach(bgData => {
          if (!bgData.name || !bgData.skillProficiencies || !bgData.originFeat || !bgData.asi || !bgData.startingEquipment) {
            errors.push(`Trasfondo omitido (${bgData.name || 'Sin Nombre'}) debido a campos obligatorios faltantes.`);
            return;
          }
          const finalBackground: Omit<DndBackground, 'id' | 'isCustom'> = {
            name: bgData.name,
            skillProficiencies: (bgData.skillProficiencies as SkillName[]).filter(sk => ALL_VALID_SKILL_NAMES.includes(sk)),
            toolProficiencies: bgData.toolProficiencies || [],
            languages: bgData.languages || [],
            startingEquipment: {
              items: (bgData.startingEquipment.items || []).map(i => ({
                name: i.name || 'Objeto',
                quantity: i.quantity || 1,
                category: i.category && ITEM_CATEGORIES.includes(i.category) ? i.category : 'Miscellaneous',
                weaponDetails: i.weaponDetails as WeaponDetails | undefined,
                armorDetails: i.armorDetails as ArmorDetails | undefined,
              })),
              gold: bgData.startingEquipment.gold || 0
            },
            originFeat: bgData.originFeat,
            asi: { options: (bgData.asi.options || []).filter(ab => VALID_ABILITY_SCORE_NAMES.includes(ab as AbilityScoreName)) as AbilityScoreName[] }
          };
          dispatch({ type: 'ADD_CUSTOM_BACKGROUND', payload: finalBackground });
          createdCount++;
        });
      }
      
      if (aiData.createdItems) {
        aiData.createdItems.forEach(itemData => {
            if(!itemData.name || !itemData.category) {
                errors.push(`Objeto omitido (${itemData.name || 'Sin Nombre'}) debido a campos obligatorios faltantes.`);
                return;
            }
            const finalItem: Omit<Item, 'id' | 'isCustom' | 'quantity'> = {
                name: itemData.name,
                category: ITEM_CATEGORIES.includes(itemData.category) ? itemData.category : 'Miscellaneous',
                description: itemData.description,
                cost: itemData.cost,
                weight: itemData.weight,
                weaponDetails: itemData.weaponDetails as WeaponDetails | undefined,
                armorDetails: itemData.armorDetails as ArmorDetails | undefined
            };
            dispatch({type: 'ADD_CUSTOM_ITEM', payload: finalItem });
            createdCount++;
        });
      }

      if (aiData.createdNPCs) {
        aiData.createdNPCs.forEach(npcData => {
            if (!npcData.name || !npcData.size || !npcData.type || !npcData.alignment || npcData.armorClass === undefined || npcData.hitPoints === undefined || !npcData.hitDice || !npcData.speed) {
                errors.push(`PNJ omitido (${npcData.name || 'Sin Nombre'}) debido a campos obligatorios faltantes.`);
                return;
            }
            const finalNpc: Omit<NPCData, 'id' | 'isCustom'> = {
                ...npcData,
                size: SIZES_LIST.includes(npcData.size) ? npcData.size : 'Medium',
                alignment: ALIGNMENTS_LIST.includes(npcData.alignment) ? npcData.alignment : 'True Neutral',
                abilityScores: { ...defaultNpcAbilityScores, ...(npcData.abilityScores || {})},
                savingThrows: (npcData.savingThrows || []).reduce((acc, st) => { if(st.ability && st.bonus !== undefined) acc[st.ability] = st.bonus; return acc; }, {} as Partial<Record<AbilityScoreName, number>>),
                skills: (npcData.skills || []).reduce((acc, sk) => { if(sk.skill && sk.bonus !== undefined) acc[sk.skill] = sk.bonus; return acc; }, {} as Partial<Record<SkillName, number>>),
                specialAbilities: (npcData.specialAbilities || []).map(t => ({name: t.name || "Habilidad", description: t.description || "", parsedAttack: t.parsedAttack || parseNpcAttackAction(t.description || "") || undefined})),
                actions: (npcData.actions || []).map(t => ({name: t.name || "Acción", description: t.description || "", parsedAttack: t.parsedAttack || parseNpcAttackAction(t.description || "") || undefined})),
                reactions: (npcData.reactions || []).map(t => ({name: t.name || "Reacción", description: t.description || "", parsedAttack: t.parsedAttack || parseNpcAttackAction(t.description || "") || undefined})),
                legendaryActions: (npcData.legendaryActions || []).map(t => ({name: t.name || "Acción Legendaria", description: t.description || "", parsedAttack: t.parsedAttack || parseNpcAttackAction(t.description || "") || undefined})),
            };
            dispatch({ type: 'ADD_CUSTOM_NPC', payload: finalNpc });
            createdCount++;
        });
      }

      if (aiData.createdSpells) {
        aiData.createdSpells.forEach(spellData => {
            if(!spellData.name || spellData.level === undefined || !spellData.school || !spellData.description) {
                errors.push(`Conjuro omitido (${spellData.name || 'Sin Nombre'}) debido a campos obligatorios faltantes.`);
                return;
            }
            const finalSpell: Omit<SpellDefinition, 'id' | 'isCustom'> = {
                ...spellData,
                school: SPELL_SCHOOLS_DATA.some(s => s.name === spellData.school) ? spellData.school as SpellSchoolName : SPELL_SCHOOLS_DATA[0].name,
            };
            dispatch({ type: 'ADD_CUSTOM_SPELL', payload: finalSpell });
            createdCount++;
        });
      }


      if (createdCount > 0) {
        setSuccessMessage(`¡${createdCount} piezas de contenido generadas y añadidas con éxito! ${errors.length > 0 ? `Algunos errores: ${errors.join(', ')}` : ''}`);
        setUserPrompt('');
      } else if (errors.length > 0) {
        setAiError(`No se generó contenido. Errores: ${errors.join(', ')}`);
      } else {
        setAiError("La IA no devolvió ningún contenido procesable.");
      }

    } catch (error) {
      console.error("Error al generar contenido masivo con IA:", error);
      setAiError(`Error al procesar la respuesta de la IA: ${(error as Error).message}. Revisa la consola para más detalles.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400 flex items-center">
          <BoltIcon className="h-8 w-8 mr-2 text-yellow-500 dark:text-yellow-400" />
          Creador de Contenido en Masa
        </h1>
        <Link
          to="/main-menu"
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700"
        >
          <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
          Volver al Menú Principal
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Describe el contenido que deseas generar (clases, especies, objetos, PNJs, conjuros, etc.).
          La IA intentará crear múltiples piezas de contenido basadas en tu descripción.
          Por ejemplo: "Crea una clase de guerrero arcano, una especie de reptiliano del desierto, y una espada mágica que inflige daño de fuego."
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="massPrompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Descripción del Contenido a Generar:
            </label>
            <textarea
              id="massPrompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={6}
              className="mt-1 block w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400"
              placeholder="Ej: Tres conjuros de nivel 1 para magos, dos PNJs bandidos con diferentes estadísticas, un objeto mágico (un anillo protector)."
              disabled={isAiLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isAiLoading || !userPrompt.trim()}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-slate-800 dark:text-white bg-yellow-400 dark:bg-yellow-500 hover:bg-yellow-500 dark:hover:bg-yellow-600 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed"
          >
            {isAiLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando Contenido...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5 mr-2" />
                Generar Contenido con IA
              </>
            )}
          </button>
        </form>

        {aiError && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-800/70 text-red-700 dark:text-red-200 text-sm rounded-md border border-red-300 dark:border-red-700 flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-red-500 dark:text-red-300" />
            <pre className="whitespace-pre-wrap font-sans">{aiError}</pre>
          </div>
        )}
        {successMessage && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-800/70 text-green-700 dark:text-green-200 text-sm rounded-md border border-green-300 dark:border-green-700 flex items-start">
            <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-green-500 dark:text-green-300" />
            <p>{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassContentCreator;
// --- End of components/MassContentCreator.tsx ---
