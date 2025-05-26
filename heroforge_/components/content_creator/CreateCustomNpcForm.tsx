
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { 
    NPCData, Size, Alignment, AbilityScoreName, SkillName, Trait, AbilityScores, ParsedNpcAttackAction, ParsedNpcAttackActionDetails, ParsedNpcDamageDetails, DAMAGE_TYPES_CONST, DamageType, SavingThrowDetails
} from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
// Fix: Import GoogleGenAI and GenerateContentResponse correctly
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { parseNpcAttackAction, parseDiceString } from '../../utils/diceRoller';

const SIZES_LIST: Size[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
const ALIGNMENTS_LIST: Alignment[] = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];
const ABILITY_SCORE_NAMES_ORDERED: AbilityScoreName[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

const SIZE_ES_MAP: Record<Size, string> = { Tiny: "Diminuta", Small: "Pequeña", Medium: "Mediana", Large: "Grande", Huge: "Enorme", Gargantuan: "Gargantuesca" };
const ALIGNMENT_ES_MAP: Record<Alignment, string> = {
  'Lawful Good': 'Legal Bueno', 'Neutral Good': 'Neutral Bueno', 'Chaotic Good': 'Caótico Bueno',
  'Lawful Neutral': 'Legal Neutral', 'True Neutral': 'Neutral Auténtico', 'Chaotic Neutral': 'Caótico Neutral',
  'Lawful Evil': 'Legal Malvado', 'Neutral Evil': 'Neutral Malvado', 'Chaotic Evil': 'Caótico Malvado',
};
const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = {
    Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
    Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
};
const ALL_SKILL_NAMES_OBJECT = SKILL_DEFINITIONS.map(skill => ({ name: skill.name, nombre: skill.nombre }));
const DAMAGE_TYPE_ES_MAP: Record<DamageType, string> = {
  Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico'
};


interface AiGeneratedNpcData extends Omit<NPCData, 'id' | 'isCustom' | 'abilityScores' | 'savingThrows' | 'skills' | 'specialAbilities' | 'actions' | 'reactions' | 'legendaryActions'> {
    abilityScores?: Partial<AbilityScores>;
    savingThrows?: Array<{ability: AbilityScoreName, bonus: number}>; 
    skills?: Array<{skill: SkillName, bonus: number}>; 
    specialAbilities?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    actions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    reactions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
    legendaryActions?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>;
}

type TraitActionType = 'attack' | 'savingThrow' | 'other';
interface CurrentTraitInput {
    name: string;
    description: string;
    actionType: TraitActionType;
    // For 'attack' type
    attackBonus?: number;
    damageDice?: string;
    damageType?: DamageType;
    versatileDamageDice?: string;
    // For 'savingThrow' type
    saveDC?: number;
    saveAbility?: AbilityScoreName;
    saveDamageDice?: string; // Damage on failed save
    saveDamageType?: DamageType; // Type of damage on failed save
}

const initialTraitInputState: CurrentTraitInput = {
    name: '', description: '', actionType: 'other',
    attackBonus: undefined, damageDice: '', damageType: DAMAGE_TYPES_CONST[0], versatileDamageDice: '',
    saveDC: undefined, saveAbility: ABILITY_SCORE_NAMES_ORDERED[0], saveDamageDice: '', saveDamageType: DAMAGE_TYPES_CONST[0]
};

const CreateCustomNpcForm: React.FC = () => {
    const { dispatch } = useHeroForge();
    // Fix: Initialize GoogleGenAI with apiKey from process.env
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const initialAbilityScores: AbilityScores = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

    const [name, setName] = useState('');
    const [size, setSize] = useState<Size>('Medium');
    const [type, setType] = useState(''); 
    const [alignment, setAlignment] = useState<Alignment>('True Neutral');
    const [armorClass, setArmorClass] = useState<number>(10);
    const [acType, setAcType] = useState('');
    const [hitPoints, setHitPoints] = useState<number>(10);
    const [hitDice, setHitDice] = useState('');
    const [speed, setSpeed] = useState('30 pies');
    const [abilityScores, setAbilityScores] = useState<AbilityScores>({...initialAbilityScores});
    
    const [savingThrows, setSavingThrows] = useState<Partial<Record<AbilityScoreName, number>>>({});
    const [skills, setSkills] = useState<Partial<Record<SkillName, number>>>({});

    const [damageVulnerabilities, setDamageVulnerabilities] = useState<string[]>([]);
    const [currentDamageVuln, setCurrentDamageVuln] = useState('');
    const [damageResistances, setDamageResistances] = useState<string[]>([]);
    const [currentDamageRes, setCurrentDamageRes] = useState('');
    const [damageImmunities, setDamageImmunities] = useState<string[]>([]);
    const [currentDamageImm, setCurrentDamageImm] = useState('');
    const [conditionImmunities, setConditionImmunities] = useState<string[]>([]);
    const [currentConditionImm, setCurrentConditionImm] = useState('');

    const [senses, setSenses] = useState('');
    const [languages, setLanguages] = useState('');
    const [challengeRating, setChallengeRating] = useState('1/2');
    const [xp, setXp] = useState<number | undefined>(100);

    const [specialAbilities, setSpecialAbilities] = useState<Trait[]>([]);
    const [actions, setActions] = useState<Trait[]>([]);
    const [reactions, setReactions] = useState<Trait[]>([]);
    const [legendaryActions, setLegendaryActions] = useState<Trait[]>([]);
    
    const [currentTraitInput, setCurrentTraitInput] = useState<CurrentTraitInput>(initialTraitInputState);

    const [npcDescription, setNpcDescription] = useState('');
    const [source, setSource] = useState('');

    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);


    const handleAbilityScoreChange = (ability: AbilityScoreName, value: string) => {
        setAbilityScores(prev => ({ ...prev, [ability]: parseInt(value) || 0 }));
    };

    const addToListGeneric = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, currentItem: string, setCurrentItem: React.Dispatch<React.SetStateAction<string>>) => {
        if (currentItem.trim() && !list.includes(currentItem.trim())) {
            setList([...list, currentItem.trim()]);
            setCurrentItem('');
        }
    };
    const removeFromListGeneric = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, itemToRemove: string) => {
        setList(list.filter(item => item !== itemToRemove));
    };

    const addTraitToList = (
        targetListSetter: React.Dispatch<React.SetStateAction<Trait[]>>
    ) => {
        const { name, description, actionType, 
                attackBonus, damageDice, damageType, versatileDamageDice,
                saveDC, saveAbility, saveDamageDice, saveDamageType } = currentTraitInput;

        if (!name.trim() || !description.trim()) {
            alert("El nombre y la descripción del rasgo son obligatorios.");
            return;
        }

        let parsedAttack: ParsedNpcAttackAction = {}; // Initialize as empty object

        if (actionType === 'attack') {
            if (attackBonus === undefined || !damageDice?.trim() || !damageType) {
                alert("Para acciones de ataque, se requieren Bonificación de Ataque, Dados de Daño y Tipo de Daño.");
                return;
            }
            parsedAttack.attack = { bonus: attackBonus };
            parsedAttack.hit = { diceString: damageDice.trim(), damageType: damageType, fullText: '' };
            if (versatileDamageDice?.trim()) {
                parsedAttack.versatile = { diceString: versatileDamageDice.trim(), damageType: damageType, fullText: '' };
            }
            // Supplement with parsed description for reach/range/target
            const descParsed = parseNpcAttackAction(description.trim());
            if (descParsed?.attack) {
                parsedAttack.attack.reach = descParsed.attack.reach;
                parsedAttack.attack.range = descParsed.attack.range;
                parsedAttack.attack.target = descParsed.attack.target;
            }
        } else if (actionType === 'savingThrow') {
            if (saveDC === undefined || !saveAbility || !saveDamageDice?.trim() || !saveDamageType) {
                alert("Para efectos de tirada de salvación, se requieren DC, Característica de Salvación, Dados de Daño (en fallo) y Tipo de Daño.");
                return;
            }
            parsedAttack.savingThrow = { dc: saveDC, ability: saveAbility };
            parsedAttack.hit = { diceString: saveDamageDice.trim(), damageType: saveDamageType, fullText: '' }; // Damage on failed save
        } else { // actionType === 'other'
            // Try to parse from description as a fallback, might be an attack hidden in text
            const descParsed = parseNpcAttackAction(description.trim());
            if (descParsed) {
                parsedAttack = descParsed;
            }
        }
        
        // Only include parsedAttack if it has meaningful data
        const finalParsedAttack = (parsedAttack.attack || parsedAttack.hit || parsedAttack.savingThrow) ? parsedAttack : undefined;

        targetListSetter(prevList => [
            ...prevList, 
            { name: name.trim(), description: description.trim(), parsedAttack: finalParsedAttack }
        ]);
        setCurrentTraitInput(initialTraitInputState); // Reset input fields
    };

    const removeTraitFromList = (
        targetListSetter: React.Dispatch<React.SetStateAction<Trait[]>>, 
        traitName: string
    ) => {
        targetListSetter(prevList => prevList.filter(trait => trait.name !== traitName));
    };

    const resetFormFields = (includeAiPrompt = true) => {
        setName(''); setSize('Medium'); setType(''); setAlignment('True Neutral');
        setArmorClass(10); setAcType(''); setHitPoints(10); setHitDice('');
        setSpeed('30 pies'); setAbilityScores({...initialAbilityScores});
        setSavingThrows({}); setSkills({});
        setDamageVulnerabilities([]); setCurrentDamageVuln('');
        setDamageResistances([]); setCurrentDamageRes('');
        setDamageImmunities([]); setCurrentDamageImm('');
        setConditionImmunities([]); setCurrentConditionImm('');
        setSenses(''); setLanguages(''); setChallengeRating('1/2'); setXp(100);
        setSpecialAbilities([]); setActions([]); setReactions([]); setLegendaryActions([]);
        setCurrentTraitInput(initialTraitInputState);
        setNpcDescription(''); setSource('');
        if(includeAiPrompt) setAiPrompt('');
        setAiError(null);
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
          setAiError("Por favor, introduce una descripción para el PNJ que quieres crear.");
          return;
        }
        setIsAiLoading(true); setAiError(null); resetFormFields(false);
    
        const systemPrompt = `
          Eres un experto creador de PNJs y monstruos de D&D 5e. Basándote en la idea del usuario, genera un objeto JSON que describa al PNJ/monstruo.
          El objeto JSON debe seguir la siguiente estructura (omite claves opcionales si no son relevantes o no hay información):
          {
            "name": "Nombre del PNJ (string)",
            "size": "Uno de: ${SIZES_LIST.join(' | ')}",
            "type": "Tipo (string, ej: 'Humanoide (humano)', 'Bestia', 'No muerto')",
            "alignment": "Uno de: ${ALIGNMENTS_LIST.join(' | ')}",
            "armorClass": "CA (number)",
            "acType": "Tipo de CA (string, ej: 'Armadura natural', '(Escudo)')",
            "hitPoints": "Puntos de Golpe (number)",
            "hitDice": "Dados de Golpe (string, ej: '4d8 + 4')",
            "speed": "Velocidad (string, ej: '30 pies, volar 60 pies')",
            "abilityScores": { "Strength": 10, "Dexterity": 10, "Constitution": 10, "Intelligence": 10, "Wisdom": 10, "Charisma": 10 },
            "savingThrows": [ {"ability": "Dexterity", "bonus": 5}, {"ability": "Wisdom", "bonus": 3} ],
            "skills": [ {"skill": "Stealth", "bonus": 7}, {"skill": "Perception", "bonus": 5} ],
            "damageVulnerabilities": ["string array"], "damageResistances": ["string array"], "damageImmunities": ["string array"], "conditionImmunities": ["string array"],
            "senses": "string", "languages": "string",
            "challengeRating": "string", "xp": "number",
            "specialAbilities": [ { "name": "Nombre Habilidad", "description": "Descripción", "parsedAttack": { /* estructura ParsedNpcAttackAction, ver abajo */ } } ],
            "actions": [ { "name": "Nombre Acción", "description": "Descripción", "parsedAttack": { /* ... */ } } ],
            "reactions": [ { "name": "Nombre Reacción", "description": "Descripción", "parsedAttack": { /* ... */ } } ],
            "legendaryActions": [ { "name": "Nombre Acción Leg.", "description": "Descripción", "parsedAttack": { /* ... */ } } ],
            "description": "string", "source": "string"
          }
          Para los campos 'specialAbilities', 'actions', 'reactions', 'legendaryActions':
          - Cada elemento es un objeto Trait con 'name' y 'description'.
          - Si el rasgo es un ataque directo, DEBES incluir un campo "parsedAttack" con:
            "parsedAttack": {
              "attack": { "bonus": number, "reach": "string?", "range": "string?", "target": "string?" },
              "hit": { "diceString": "string (ej: 2d6+3)", "damageType": "string (DamageType válido)" },
              "versatile": { "diceString": "string", "damageType": "string" } // Opcional
            }
          - Si el rasgo es un efecto que fuerza una tirada de salvación, DEBES incluir "parsedAttack" con:
            "parsedAttack": {
              "savingThrow": { "dc": number, "ability": "AbilityScoreName" },
              "hit": { "diceString": "string (daño en fallo)", "damageType": "string (tipo de daño en fallo)" }
            }
          - Si el rasgo NO es ni un ataque directo ni un efecto de salvación, omite "parsedAttack" o establécelo a null.
          - La 'description' del rasgo debe seguir conteniendo el texto completo de la habilidad o acción.
          - 'damageType' siempre debe ser un valor válido de ${DAMAGE_TYPES_CONST.join(' | ')}.
          - 'ability' en savingThrow debe ser un AbilityScoreName válido.
          Idea del PNJ del usuario: "${aiPrompt}"
          Responde ÚNICAMENTE con el objeto JSON. No incluyas explicaciones adicionales.
        `;
    
        try {
          const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17", contents: systemPrompt, config: { responseMimeType: "application/json" }
          });
          let jsonStr = response.text.trim();
          const match = jsonStr.match(/^```(\w*)?\s*\n?(.*?)\n?\s*```$/s);
          if (match && match[2]) jsonStr = match[2].trim();
          
          const aiData: AiGeneratedNpcData = JSON.parse(jsonStr);
    
          setName(aiData.name || '');
          setSize(SIZES_LIST.includes(aiData.size as Size) ? aiData.size as Size : 'Medium');
          setType(aiData.type || '');
          setAlignment(ALIGNMENTS_LIST.includes(aiData.alignment as Alignment) ? aiData.alignment as Alignment : 'True Neutral');
          setArmorClass(aiData.armorClass || 10);
          setAcType(aiData.acType || '');
          setHitPoints(aiData.hitPoints || 10);
          setHitDice(aiData.hitDice || '');
          setSpeed(aiData.speed || '30 pies');
          setAbilityScores({ ...initialAbilityScores, ...(aiData.abilityScores || {}) });
          
          const parsedSTs: Partial<Record<AbilityScoreName, number>> = {};
          if (Array.isArray(aiData.savingThrows)) {
            aiData.savingThrows.forEach(st => {
              if (st.ability && ABILITY_SCORE_NAMES_ORDERED.includes(st.ability) && typeof st.bonus === 'number') {
                parsedSTs[st.ability] = st.bonus;
              }
            });
          }
          setSavingThrows(parsedSTs);

          const parsedSkills: Partial<Record<SkillName, number>> = {};
            if (Array.isArray(aiData.skills)) {
            aiData.skills.forEach(sk => {
                if (sk.skill && ALL_SKILL_NAMES_OBJECT.map(s=>s.name).includes(sk.skill) && typeof sk.bonus === 'number') {
                parsedSkills[sk.skill] = sk.bonus;
                }
            });
          }
          setSkills(parsedSkills);

          setDamageVulnerabilities(aiData.damageVulnerabilities || []);
          setDamageResistances(aiData.damageResistances || []);
          setDamageImmunities(aiData.damageImmunities || []);
          setConditionImmunities(aiData.conditionImmunities || []);
          setSenses(aiData.senses || '');
          setLanguages(aiData.languages || '');
          setChallengeRating(aiData.challengeRating || '1/2');
          setXp(aiData.xp);
          
          const processTraits = (aiTraits?: Array<Partial<Trait> & { parsedAttack?: ParsedNpcAttackAction }>): Trait[] => {
            return (aiTraits || []).map(t => {
                const desc = t.description || '';
                let finalParsedAttack: ParsedNpcAttackAction | undefined = undefined;

                if (t.parsedAttack) { // Prioritize AI provided structure
                    finalParsedAttack = {};
                    if (t.parsedAttack.attack) finalParsedAttack.attack = t.parsedAttack.attack;
                    if (t.parsedAttack.hit) finalParsedAttack.hit = t.parsedAttack.hit;
                    if (t.parsedAttack.versatile) finalParsedAttack.versatile = t.parsedAttack.versatile;
                    if (t.parsedAttack.savingThrow) finalParsedAttack.savingThrow = t.parsedAttack.savingThrow;
                    // If parsedAttack object is empty after checks, make it undefined
                    if (Object.keys(finalParsedAttack).length === 0) finalParsedAttack = undefined;
                } else { // Fallback to parsing description if AI didn't provide structured attack
                    finalParsedAttack = parseNpcAttackAction(desc) || undefined;
                }
                
                return { 
                    name: t.name || 'Rasgo sin nombre', 
                    description: desc,
                    parsedAttack: finalParsedAttack
                };
            });
          };

          setSpecialAbilities(processTraits(aiData.specialAbilities));
          setActions(processTraits(aiData.actions));
          setReactions(processTraits(aiData.reactions));
          setLegendaryActions(processTraits(aiData.legendaryActions));

          setNpcDescription(aiData.description || '');
          setSource(aiData.source || 'Personalizado (IA)');
    
        } catch (e) {
          console.error("Error al generar PNJ con IA:", e);
          setAiError(`Falló la generación de detalles del PNJ. Error: ${(e as Error).message}. Revisa la consola.`);
        } finally {
          setIsAiLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !type.trim() || !hitDice.trim() || !challengeRating.trim()) {
            alert('Nombre, Tipo, Dados de Golpe y Valor de Desafío son obligatorios.');
            return;
        }

        const npcData: Omit<NPCData, 'id' | 'isCustom'> = {
            name: name.trim(), size, type: type.trim(), alignment, armorClass, acType: acType.trim() || undefined,
            hitPoints, hitDice: hitDice.trim(), speed: speed.trim(), abilityScores,
            savingThrows: Object.keys(savingThrows).length > 0 ? savingThrows : undefined,
            skills: Object.keys(skills).length > 0 ? skills : undefined,
            damageVulnerabilities: damageVulnerabilities.length > 0 ? damageVulnerabilities : undefined,
            damageResistances: damageResistances.length > 0 ? damageResistances : undefined,
            damageImmunities: damageImmunities.length > 0 ? damageImmunities : undefined,
            conditionImmunities: conditionImmunities.length > 0 ? conditionImmunities : undefined,
            senses: senses.trim() || undefined, languages: languages.trim() || undefined,
            challengeRating: challengeRating.trim(), xp,
            specialAbilities, actions, reactions, legendaryActions,
            description: npcDescription.trim() || undefined,
            source: source.trim() || 'Personalizado',
        };
        dispatch({ type: 'ADD_CUSTOM_NPC', payload: npcData });
        alert(`¡PNJ "${name.trim()}" creado con éxito!`);
        resetFormFields(true);
    };
    
    const renderTraitListManager = (
        title: string,
        list: Trait[],
        setList: React.Dispatch<React.SetStateAction<Trait[]>>
    ) => (
        <fieldset className="form-section">
            <legend className="legend-title">{title}</legend>
            {list.map(trait => (
                <div key={trait.name} className="form-subsection">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium">{trait.name}</h4>
                        <button type="button" onClick={() => removeTraitFromList(setList, trait.name)} className="btn-remove"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                    <p className="text-xs whitespace-pre-line">{trait.description}</p>
                     {trait.parsedAttack && (
                        <div className="mt-1 text-2xs p-1 bg-purple-100 dark:bg-purple-900/30 rounded border border-purple-300 dark:border-purple-700">
                            <span className="font-semibold text-purple-700 dark:text-purple-300">Detectado/Manual: </span>
                            {trait.parsedAttack.attack && <span>Ataque: {trait.parsedAttack.attack.bonus >=0 ? '+' : ''}{trait.parsedAttack.attack.bonus}. </span>}
                            {trait.parsedAttack.savingThrow && <span>Salvación: DC {trait.parsedAttack.savingThrow.dc} {ABILITY_SCORE_ES_MAP[trait.parsedAttack.savingThrow.ability]}. </span>}
                            {trait.parsedAttack.hit && <span>Daño: {trait.parsedAttack.hit.diceString} {trait.parsedAttack.hit.damageType}. </span>}
                            {trait.parsedAttack.versatile && <span>Versátil: {trait.parsedAttack.versatile.diceString} {trait.parsedAttack.versatile.damageType}.</span>}
                        </div>
                    )}
                </div>
            ))}
            <div className="form-subsection border-dashed">
                <input type="text" value={currentTraitInput.name} onChange={e => setCurrentTraitInput({...currentTraitInput, name: e.target.value})} placeholder={`Nombre de ${title.slice(0,-1)}`} className="input-field mb-1"/>
                <textarea value={currentTraitInput.description} onChange={e => setCurrentTraitInput({...currentTraitInput, description: e.target.value})} placeholder={`Descripción de ${title.slice(0,-1)}`} rows={3} className="input-field mb-1"/>
                
                <div className="mt-2 mb-1">
                    <label htmlFor={`traitActionType-${title}`} className="block text-xs font-medium">Tipo de Acción/Rasgo:</label>
                    <select 
                        id={`traitActionType-${title}`} 
                        value={currentTraitInput.actionType} 
                        onChange={e => setCurrentTraitInput({...currentTraitInput, actionType: e.target.value as TraitActionType})}
                        className="input-field-small"
                    >
                        <option value="other">Otro/Utilidad (solo descripción)</option>
                        <option value="attack">Ataque Directo</option>
                        <option value="savingThrow">Efecto de Tirada de Salvación</option>
                    </select>
                </div>

                {currentTraitInput.actionType === 'attack' && (
                    <div className="mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/30 space-y-2">
                        <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Detalles de Ataque Directo</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label htmlFor={`traitAttackBonus-${title}`} className="block text-2xs font-medium">Bonif. Ataque (ej: 7)</label>
                                <input type="number" id={`traitAttackBonus-${title}`} value={currentTraitInput.attackBonus === undefined ? '' : currentTraitInput.attackBonus} onChange={e => setCurrentTraitInput({...currentTraitInput, attackBonus: e.target.value === '' ? undefined : parseInt(e.target.value)})} placeholder="+X" className="input-field-small"/>
                            </div>
                            <div>
                                <label htmlFor={`traitDamageDice-${title}`} className="block text-2xs font-medium">Dados Daño (ej: 2d6+3)</label>
                                <input type="text" id={`traitDamageDice-${title}`} value={currentTraitInput.damageDice} onChange={e => setCurrentTraitInput({...currentTraitInput, damageDice: e.target.value})} placeholder="XdY+Z" className="input-field-small"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           <div>
                                <label htmlFor={`traitDamageType-${title}`} className="block text-2xs font-medium">Tipo Daño</label>
                                <select id={`traitDamageType-${title}`} value={currentTraitInput.damageType} onChange={e => setCurrentTraitInput({...currentTraitInput, damageType: e.target.value as DamageType})} className="input-field-small">
                                    {DAMAGE_TYPES_CONST.map(dt => <option key={dt} value={dt}>{DAMAGE_TYPE_ES_MAP[dt]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`traitVersatileDamage-${title}`} className="block text-2xs font-medium">Daño Versátil (opc.)</label>
                                <input type="text" id={`traitVersatileDamage-${title}`} value={currentTraitInput.versatileDamageDice} onChange={e => setCurrentTraitInput({...currentTraitInput, versatileDamageDice: e.target.value})} placeholder="XdY+Z" className="input-field-small"/>
                            </div>
                        </div>
                    </div>
                )}

                {currentTraitInput.actionType === 'savingThrow' && (
                     <div className="mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/30 space-y-2">
                        <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Detalles de Efecto de Salvación</h5>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label htmlFor={`traitSaveDC-${title}`} className="block text-2xs font-medium">DC Salvación (ej: 15)</label>
                                <input type="number" id={`traitSaveDC-${title}`} value={currentTraitInput.saveDC === undefined ? '' : currentTraitInput.saveDC} onChange={e => setCurrentTraitInput({...currentTraitInput, saveDC: e.target.value === '' ? undefined : parseInt(e.target.value)})} placeholder="DC" className="input-field-small"/>
                            </div>
                            <div>
                                <label htmlFor={`traitSaveAbility-${title}`} className="block text-2xs font-medium">Característica Salvación</label>
                                <select id={`traitSaveAbility-${title}`} value={currentTraitInput.saveAbility} onChange={e => setCurrentTraitInput({...currentTraitInput, saveAbility: e.target.value as AbilityScoreName})} className="input-field-small">
                                    {ABILITY_SCORE_NAMES_ORDERED.map(ab => <option key={ab} value={ab}>{ABILITY_SCORE_ES_MAP[ab]}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label htmlFor={`traitSaveDamageDice-${title}`} className="block text-2xs font-medium">Dados Daño (en fallo)</label>
                                <input type="text" id={`traitSaveDamageDice-${title}`} value={currentTraitInput.saveDamageDice} onChange={e => setCurrentTraitInput({...currentTraitInput, saveDamageDice: e.target.value})} placeholder="XdY+Z" className="input-field-small"/>
                            </div>
                            <div>
                                <label htmlFor={`traitSaveDamageType-${title}`} className="block text-2xs font-medium">Tipo Daño (en fallo)</label>
                                <select id={`traitSaveDamageType-${title}`} value={currentTraitInput.saveDamageType} onChange={e => setCurrentTraitInput({...currentTraitInput, saveDamageType: e.target.value as DamageType})} className="input-field-small">
                                    {DAMAGE_TYPES_CONST.map(dt => <option key={dt} value={dt}>{DAMAGE_TYPE_ES_MAP[dt]}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                <button type="button" onClick={() => addTraitToList(setList)} className="btn-secondary w-full mt-2">Añadir {title.slice(0,-1)}</button>
            </div>
        </fieldset>
    );

    const renderStringListManager = (
        title: string,
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>,
        currentItem: string,
        setCurrentItem: React.Dispatch<React.SetStateAction<string>>,
        placeholder: string
    ) => (
         <div>
            <label className="block text-sm font-medium">{title}</label>
            <div className="flex items-center gap-2 mt-1">
                <input type="text" value={currentItem} onChange={e => setCurrentItem(e.target.value)} placeholder={placeholder} className="input-field flex-grow"/>
                <button type="button" onClick={() => addToListGeneric(list, setList, currentItem, setCurrentItem)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
            </div>
            <ul className="list-styled">{list.map(item => <li key={item}>{item} <button type="button" onClick={() => removeFromListGeneric(list, setList, item)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear PNJ/Monstruo Personalizado</h1>
                <Link to="/content-creator" className="inline-flex items-center px-3 py-1 btn-secondary-link">
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />Volver al Menú
                </Link>
            </div>

            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500 dark:text-yellow-400" /> Asistente de Ideas de PNJs con IA
                </h2>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: Un golem de obsidiana con ojos ardientes, inmune al fuego y que puede lanzar rocas fundidas." rows={3} className="w-full p-2 input-field" disabled={isAiLoading}/>
                <button onClick={handleGenerateWithAi} disabled={isAiLoading || !aiPrompt.trim()} className="mt-3 w-full btn-ai-generate">{isAiLoading ? 'Generando...' : 'Generar con IA'}</button>
                {aiError && <div className="mt-3 p-3 error-box"><ExclamationTriangleIcon className="h-5 w-5 mr-2 error-icon"/><pre className="whitespace-pre-wrap font-sans">{aiError}</pre></div>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="npcName" className="block text-sm font-medium">Nombre*</label><input type="text" id="npcName" value={name} onChange={e=>setName(e.target.value)} required className="mt-1 input-field"/></div>
                    <div><label htmlFor="npcSize" className="block text-sm font-medium">Tamaño*</label><select id="npcSize" value={size} onChange={e=>setSize(e.target.value as Size)} className="mt-1 input-field">{SIZES_LIST.map(s=><option key={s} value={s}>{SIZE_ES_MAP[s]}</option>)}</select></div>
                    <div><label htmlFor="npcType" className="block text-sm font-medium">Tipo* (ej: Humanoide (humano))</label><input type="text" id="npcType" value={type} onChange={e=>setType(e.target.value)} required className="mt-1 input-field"/></div>
                    <div><label htmlFor="npcAlignment" className="block text-sm font-medium">Alineamiento*</label><select id="npcAlignment" value={alignment} onChange={e=>setAlignment(e.target.value as Alignment)} className="mt-1 input-field">{ALIGNMENTS_LIST.map(a=><option key={a} value={a}>{ALIGNMENT_ES_MAP[a]}</option>)}</select></div>
                </div>

                {/* Combat Stats */}
                <fieldset className="form-section">
                    <legend className="legend-title">Estadísticas de Combate</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label htmlFor="npcAC" className="block text-xs font-medium">Clase de Armadura*</label><input type="number" id="npcAC" value={armorClass} onChange={e=>setArmorClass(parseInt(e.target.value)||0)} required className="mt-1 input-field-small"/></div>
                        <div><label htmlFor="npcAcType" className="block text-xs font-medium">Tipo de CA (ej: natural)</label><input type="text" id="npcAcType" value={acType} onChange={e=>setAcType(e.target.value)} className="mt-1 input-field-small"/></div>
                        <div><label htmlFor="npcHP" className="block text-xs font-medium">Puntos de Golpe*</label><input type="number" id="npcHP" value={hitPoints} onChange={e=>setHitPoints(parseInt(e.target.value)||0)} required className="mt-1 input-field-small"/></div>
                        <div><label htmlFor="npcHitDice" className="block text-xs font-medium">Dados de Golpe* (ej: 2d8+2)</label><input type="text" id="npcHitDice" value={hitDice} onChange={e=>setHitDice(e.target.value)} required className="mt-1 input-field-small"/></div>
                        <div className="md:col-span-2"><label htmlFor="npcSpeed" className="block text-xs font-medium">Velocidad* (ej: 30 pies, volar 60 pies)</label><input type="text" id="npcSpeed" value={speed} onChange={e=>setSpeed(e.target.value)} required className="mt-1 input-field-small"/></div>
                    </div>
                </fieldset>

                {/* Ability Scores */}
                <fieldset className="form-section">
                    <legend className="legend-title">Puntuaciones de Característica</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {ABILITY_SCORE_NAMES_ORDERED.map(absName => (
                            <div key={absName}>
                                <label htmlFor={`npc${absName}`} className="block text-xs font-medium text-center">{ABILITY_SCORE_ES_MAP[absName]}</label>
                                <input type="number" id={`npc${absName}`} value={abilityScores[absName]} onChange={e => handleAbilityScoreChange(absName, e.target.value)} className="mt-1 input-field-small text-center"/>
                            </div>
                        ))}
                    </div>
                </fieldset>

                {/* Saving Throws & Skills Modifiers */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <fieldset className="form-section">
                        <legend className="legend-title-small">Modificadores de Salvación</legend>
                        {ABILITY_SCORE_NAMES_ORDERED.map(absName => (
                            <div key={absName} className="flex items-center justify-between mb-1">
                                <label htmlFor={`st-${absName}`} className="text-xs mr-2">{ABILITY_SCORE_ES_MAP[absName]}</label>
                                <input type="number" id={`st-${absName}`} placeholder="Mod" value={savingThrows[absName] === undefined ? '' : savingThrows[absName]} onChange={e => setSavingThrows({...savingThrows, [absName]: e.target.value === '' ? undefined : parseInt(e.target.value)})} className="input-field-small w-20 text-center"/>
                            </div>
                        ))}
                    </fieldset>
                    <fieldset className="form-section">
                        <legend className="legend-title-small">Modificadores de Habilidad</legend>
                        {ALL_SKILL_NAMES_OBJECT.slice(0, Math.ceil(ALL_SKILL_NAMES_OBJECT.length / 2)).map(skill => ( 
                            <div key={skill.name} className="flex items-center justify-between mb-1">
                                <label htmlFor={`sk-${skill.name}`} className="text-xs mr-2">{skill.nombre}</label>
                                <input type="number" id={`sk-${skill.name}`} placeholder="Mod" value={skills[skill.name] === undefined ? '' : skills[skill.name]} onChange={e => setSkills({...skills, [skill.name]: e.target.value === '' ? undefined : parseInt(e.target.value)})} className="input-field-small w-20 text-center"/>
                            </div>
                        ))}
                        {ALL_SKILL_NAMES_OBJECT.slice(Math.ceil(ALL_SKILL_NAMES_OBJECT.length / 2)).map(skill => ( 
                            <div key={skill.name} className="flex items-center justify-between mb-1">
                                <label htmlFor={`sk-${skill.name}`} className="text-xs mr-2">{skill.nombre}</label>
                                <input type="number" id={`sk-${skill.name}`} placeholder="Mod" value={skills[skill.name] === undefined ? '' : skills[skill.name]} onChange={e => setSkills({...skills, [skill.name]: e.target.value === '' ? undefined : parseInt(e.target.value)})} className="input-field-small w-20 text-center"/>
                            </div>
                        ))}
                    </fieldset>
                </div>

                {/* Resistances, Vulnerabilities, Immunities */}
                <fieldset className="form-section">
                    <legend className="legend-title">Resistencias, Vulnerabilidades, Inmunidades</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderStringListManager("Vulnerabilidades al Daño", damageVulnerabilities, setDamageVulnerabilities, currentDamageVuln, setCurrentDamageVuln, "Ej: Fuego")}
                        {renderStringListManager("Resistencias al Daño", damageResistances, setDamageResistances, currentDamageRes, setCurrentDamageRes, "Ej: Frío")}
                        {renderStringListManager("Inmunidades al Daño", damageImmunities, setDamageImmunities, currentDamageImm, setCurrentDamageImm, "Ej: Veneno")}
                        {renderStringListManager("Inmunidades a Condiciones", conditionImmunities, setConditionImmunities, currentConditionImm, setCurrentConditionImm, "Ej: Hechizado")}
                    </div>
                </fieldset>

                {/* Senses, Languages, CR, XP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="npcSenses" className="block text-sm font-medium">Sentidos (ej: Visión Osc. 60ft, Perc.Pasiva 12)</label><input type="text" id="npcSenses" value={senses} onChange={e=>setSenses(e.target.value)} className="mt-1 input-field"/></div>
                    <div><label htmlFor="npcLanguages" className="block text-sm font-medium">Idiomas (ej: Común, Infernal)</label><input type="text" id="npcLanguages" value={languages} onChange={e=>setLanguages(e.target.value)} className="mt-1 input-field"/></div>
                    <div><label htmlFor="npcCR" className="block text-sm font-medium">Valor de Desafío* (ej: 1/4, 5)</label><input type="text" id="npcCR" value={challengeRating} onChange={e=>setChallengeRating(e.target.value)} required className="mt-1 input-field"/></div>
                    <div><label htmlFor="npcXP" className="block text-sm font-medium">PX</label><input type="number" id="npcXP" value={xp === undefined ? '' : xp} onChange={e=>setXp(e.target.value === '' ? undefined : parseInt(e.target.value))} className="mt-1 input-field"/></div>
                </div>

                {/* Traits sections */}
                {renderTraitListManager("Habilidades Especiales", specialAbilities, setSpecialAbilities)}
                {renderTraitListManager("Acciones", actions, setActions)}
                {renderTraitListManager("Reacciones", reactions, setReactions)}
                {renderTraitListManager("Acciones Legendarias", legendaryActions, setLegendaryActions)}
                
                {/* Description & Source */}
                <div><label htmlFor="npcDesc" className="block text-sm font-medium">Descripción (Lore, Apariencia)</label><textarea id="npcDesc" value={npcDescription} onChange={e=>setNpcDescription(e.target.value)} rows={3} className="mt-1 input-field"/></div>
                <div><label htmlFor="npcSource" className="block text-sm font-medium">Fuente (ej: Manual de Monstruos)</label><input type="text" id="npcSource" value={source} onChange={e=>setSource(e.target.value)} className="mt-1 input-field"/></div>
                
                <div className="pt-4">
                    <button type="submit" className="w-full btn-primary">
                        <PlusCircleIcon className="h-5 w-5 mr-2" />Crear PNJ/Monstruo
                    </button>
                </div>
            </form>
             <style>{`
                .input-field { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; color: #111827; }
                .dark .input-field { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                .input-field-small { margin-top: 0.25rem; display: block; width: 100%; padding: 0.25rem 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; color: #111827; }
                .dark .input-field-small { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                .list-styled { list-style: none; padding-left: 0; margin-top: 0.25rem; font-size: 0.875rem; }
                .list-styled li { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background-color: #e5e7eb; border-radius: 0.25rem; margin-bottom: 0.25rem; color: #1f2937; }
                .dark .list-styled li { background-color: #374151; color: #e5e7eb; }
                .btn-add { padding: 0.5rem; background-color: #4f46e5; color: white; border-radius: 0.375rem; }
                .dark .btn-add { background-color: #818cf8; }
                .btn-remove-small { padding: 0.125rem; color: #f43f5e; }
                .dark .btn-remove-small { color: #fb7185; }
                .btn-remove { padding: 0.25rem; color: #ef4444; }
                .dark .btn-remove { color: #f87171; }
                
                .form-section { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; margin-top: 1rem; background-color: #f9fafb; }
                .dark .form-section { border-color: #374151; background-color: #1f2937; }
                .legend-title { font-size: 1.125rem; font-weight: 600; color: #4f46e5; margin-bottom: 0.5rem; }
                .dark .legend-title { color: #818cf8; }
                .legend-title-small { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
                .form-subsection { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; margin-top: 0.5rem; background-color: #ffffff; }
                .dark .form-subsection { border-color: #4b5563; background-color: #374151; }
                .form-subsection.border-dashed { border-style: dashed; }

                .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; border: 1px solid transparent; font-size: 1rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: white; background-color: #16a34a; }
                .btn-primary:hover { background-color: #15803d; }
                .btn-secondary { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #2563eb; }
                .btn-secondary:hover { background-color: #1d4ed8; }
                .btn-secondary-link { font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: #4f46e5; background-color: #e0e7ff; }
                .dark .btn-secondary-link { color: #a5b4fc; background-color: #3730a3; }
                
                .btn-ai-generate { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: #1f2937; background-color: #facc15; }
                .dark .btn-ai-generate { color: #111827; background-color: #fde047; }
                .btn-ai-generate:disabled { background-color: #9ca3af; cursor: not-allowed; }
                .dark .btn-ai-generate:disabled { background-color: #4b5563; }
                .error-box { padding: 0.75rem; background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 0.375rem; color: #b91c1c; font-size: 0.875rem; display:flex; align-items: flex-start; }
                .dark .error-box { background-color: #5f2120; border-color: #b91c1c; color: #fca5a5;}
                .error-icon { height: 1.25rem; width: 1.25rem; margin-right: 0.5rem; flex-shrink: 0; color: #dc2626; }
                .dark .error-icon { color: #f87171;}
            `}</style>
        </div>
    );
};

export default CreateCustomNpcForm;
