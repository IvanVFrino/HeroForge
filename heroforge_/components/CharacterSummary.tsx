
import React from 'react';
import { useCharacter } from '../context/CharacterContext';
// Fix: Import Alignment type
import { CharacterSheet, AbilityScoreName, SkillName, AbilityScores, Alignment, Trait } from '../types';
import { SKILL_DEFINITIONS } from '../constants/skills'; // For Spanish skill names

const SectionTitle: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <h4 className="text-lg font-semibold text-purple-500 dark:text-purple-300 mt-3 mb-1 border-b border-slate-300 dark:border-slate-700 pb-1">{children}</h4>
);

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  isButton?: boolean; 
}

const DetailItem: React.FC<DetailItemProps> = ({label, value, onClick, isButton}) => {
  const commonClasses = "text-xs";
  const buttonClasses = "w-full text-left px-1 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-400";

  if (isButton && onClick) {
    return (
      <button onClick={onClick} className={`${commonClasses} ${buttonClasses}`}>
        <strong className="font-medium text-slate-800 dark:text-slate-100">{label}:</strong> 
        <span className="text-slate-600 dark:text-slate-300 ml-1">{value === undefined || value === null || value === '' ? 'N/A' : value}</span>
      </button>
    );
  }
 return (
   <p className={commonClasses}>
     <strong className="font-medium text-slate-800 dark:text-slate-100">{label}:</strong> 
     <span className="text-slate-600 dark:text-slate-300 ml-1">{value === undefined || value === null || value === '' ? 'N/A' : value}</span>
   </p>
 );
};

interface CharacterSummaryProps {
  sheet?: CharacterSheet;
  onInitiativeClick?: () => void;
  onSavingThrowClick?: (abilityName: AbilityScoreName) => void;
  onSkillClick?: (skillName: SkillName) => void;
  onAbilityScoreClick?: (abilityName: AbilityScoreName) => void;
  onFeatureTraitMouseEnter?: (trait: Trait, event: React.MouseEvent<HTMLLIElement>) => void;
  onFeatureTraitMouseMove?: (event: React.MouseEvent<HTMLLIElement>) => void;
  onFeatureTraitMouseLeave?: () => void;
}

const CharacterSummary: React.FC<CharacterSummaryProps> = ({ 
  sheet: propSheet, 
  onInitiativeClick,
  onSavingThrowClick,
  onSkillClick,
  onAbilityScoreClick,
  onFeatureTraitMouseEnter,
  onFeatureTraitMouseMove,
  onFeatureTraitMouseLeave
}) => {
  const contextCharacter = useCharacter();
  const characterToDisplay = propSheet || contextCharacter.character;

  if (!characterToDisplay) {
    return <p className="text-slate-600 dark:text-slate-400">Datos del personaje aún no disponibles.</p>;
  }
  
  const {
    name, class: charClass, level, background, species, alignment,
    currentHp = 0, maxHp = 0, armorClass = 10, speed = 30, initiative = 0, proficiencyBonus = 2, passivePerception = 10,
    abilityScores = {} as AbilityScores, 
    abilityScoreModifiers = {}, savingThrows = {}, skills = {},
    proficiencies = [], featuresAndTraits = []
  } = characterToDisplay;

  const getAbilityDisplayName = (abilityName: AbilityScoreName): string => {
    const map: Record<AbilityScoreName, string> = {
        Strength: "Fue", Dexterity: "Des", Constitution: "Con",
        Intelligence: "Int", Wisdom: "Sab", Charisma: "Car"
    };
    return map[abilityName] || abilityName.substring(0,3).toUpperCase();
  };

  const getSkillDisplayName = (skillName: SkillName): string => {
    return SKILL_DEFINITIONS.find(s => s.name === skillName)?.nombre || skillName;
  };

  const getAlignmentDisplayName = (alignmentValue?: Alignment): string => {
    if (!alignmentValue) return 'N/A';
    const map: Record<Alignment, string> = {
        'Lawful Good': 'Legal Bueno', 'Neutral Good': 'Neutral Bueno', 'Chaotic Good': 'Caótico Bueno',
        'Lawful Neutral': 'Legal Neutral', 'True Neutral': 'Neutral Auténtico', 'Chaotic Neutral': 'Caótico Neutral',
        'Lawful Evil': 'Legal Malvado', 'Neutral Evil': 'Neutral Malvado', 'Chaotic Evil': 'Caótico Malvado',
    };
    return map[alignmentValue] || alignmentValue;
  };

  return (
    <div className="p-1 bg-slate-200 dark:bg-slate-800 rounded-lg shadow-md text-slate-800 dark:text-slate-100">
      
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs mb-2">
        <DetailItem label="Clase" value={charClass?.name} />
        <DetailItem label="Nivel" value={level} />
        <DetailItem label="Trasfondo" value={background?.name} />
        <DetailItem label="Especie" value={species?.name} />
        <DetailItem label="Alineamiento" value={getAlignmentDisplayName(alignment)} />
      </div>

      <SectionTitle>Estadísticas Principales</SectionTitle>
      <div className="grid grid-cols-3 gap-1 text-center mb-2">
        <div className="bg-slate-300 dark:bg-slate-700 p-1 rounded">
          <div className="text-slate-600 dark:text-slate-400 text-xs">PG</div>
          <div className="font-bold text-base text-green-700 dark:text-green-400">{currentHp}/{maxHp}</div>
        </div>
        <div className="bg-slate-300 dark:bg-slate-700 p-1 rounded">
          <div className="text-slate-600 dark:text-slate-400 text-xs">CA</div>
          <div className="font-bold text-base text-sky-700 dark:text-sky-400">{armorClass}</div>
        </div>
        <div className="bg-slate-300 dark:bg-slate-700 p-1 rounded">
          <div className="text-slate-600 dark:text-slate-400 text-xs">Velocidad</div>
          <div className="font-bold text-base text-yellow-700 dark:text-yellow-400">{speed} pies</div>
        </div>
         <div className="bg-slate-300 dark:bg-slate-700 p-1 rounded">
          {onInitiativeClick ? (
            <button onClick={onInitiativeClick} className="w-full text-center hover:bg-slate-400 dark:hover:bg-slate-600 p-0.5 rounded transition-colors">
              <div className="text-slate-600 dark:text-slate-400 text-xs">Iniciativa</div>
              <div className="font-bold text-base">{initiative >= 0 ? `+${initiative}` : initiative}</div>
            </button>
          ) : (
            <>
              <div className="text-slate-600 dark:text-slate-400 text-xs">Iniciativa</div>
              <div className="font-bold text-base">{initiative >= 0 ? `+${initiative}` : initiative}</div>
            </>
          )}
        </div>
        <div className="bg-slate-300 dark:bg-slate-700 p-1 rounded">
          <div className="text-slate-600 dark:text-slate-400 text-xs">Bono Comp.</div>
          <div className="font-bold text-base">+{proficiencyBonus}</div>
        </div>
        <div className="bg-slate-300 dark:bg-slate-700 p-1 rounded">
          <div className="text-slate-600 dark:text-slate-400 text-xs">Percep. Pasiva</div>
          <div className="font-bold text-base">{passivePerception}</div>
        </div>
      </div>


      <SectionTitle>Puntuaciones de Característica</SectionTitle>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {(Object.entries(abilityScores) as [AbilityScoreName, number][]).map(([key, value]) => (
           <div key={key} className={`bg-slate-300 dark:bg-slate-700 p-1 rounded text-center ${onAbilityScoreClick ? 'hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors' : ''}`}>
            {onAbilityScoreClick ? (
              <button onClick={() => onAbilityScoreClick(key as AbilityScoreName)} className="w-full h-full flex flex-col items-center justify-center">
                <div className="text-slate-600 dark:text-slate-400 text-xs uppercase">{getAbilityDisplayName(key)}</div>
                <div className="font-semibold text-sm">{value} 
                  <span className="text-slate-500 dark:text-slate-400 text-xs"> ({(abilityScoreModifiers[key] || 0) >= 0 ? '+' : ''}{(abilityScoreModifiers[key] || 0)})</span>
                </div>
              </button>
            ) : (
              <>
                <div className="text-slate-600 dark:text-slate-400 text-xs uppercase">{getAbilityDisplayName(key)}</div>
                <div className="font-semibold text-sm">{value} 
                  <span className="text-slate-500 dark:text-slate-400 text-xs"> ({(abilityScoreModifiers[key] || 0) >= 0 ? '+' : ''}{(abilityScoreModifiers[key] || 0)})</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <SectionTitle>Tiradas de Salvación</SectionTitle>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs mb-2">
        {Object.entries(savingThrows).map(([key, st]) => {
          const abilityKey = key as AbilityScoreName;
          return st ? <DetailItem 
            key={key} 
            label={`${st.proficient ? '◉' : '○'} ${getAbilityDisplayName(abilityKey)}.`} 
            value={`${st.value >= 0 ? '+' : ''}${st.value}`} 
            isButton={!!onSavingThrowClick}
            onClick={onSavingThrowClick ? () => onSavingThrowClick(abilityKey) : undefined}
          /> : <DetailItem key={key} label={`${getAbilityDisplayName(abilityKey)}.`} value="N/A" />
        })}
      </div>

      <SectionTitle>Habilidades</SectionTitle>
      <div className="grid grid-cols-1 gap-y-0.5 text-xs mb-2">
        {Object.entries(skills).map(([key, skill]) => {
          const skillKey = key as SkillName;
          return skill ? <DetailItem 
            key={key} 
            label={`${skill.proficient ? '◉' : '○'} ${getSkillDisplayName(skillKey)}`} 
            value={`${skill.value >= 0 ? '+' : ''}${skill.value} (${getAbilityDisplayName(skill.ability)})`} 
            isButton={!!onSkillClick}
            onClick={onSkillClick ? () => onSkillClick(skillKey) : undefined}
          /> : <DetailItem key={key} label={getSkillDisplayName(skillKey)} value="N/A" />
        })}
      </div>
      
      <SectionTitle>Competencias e Idiomas</SectionTitle>
      <div className="text-xs text-slate-700 dark:text-slate-300 mb-2 p-1 bg-slate-300/50 dark:bg-slate-700/30 rounded max-h-24 overflow-y-auto">
        {proficiencies.filter(p => p.type !== 'skill' && p.type !== 'savingThrow').map(p => p.name).join(', ') || "Ninguna"}
      </div>

      <SectionTitle>Rasgos y Atributos</SectionTitle>
      <ul className="list-none space-y-0.5 text-xs text-slate-700 dark:text-slate-300 p-1 bg-slate-300/50 dark:bg-slate-700/30 rounded max-h-32 overflow-y-auto">
        {featuresAndTraits.map(ft => (
          <li 
            key={ft.name}
            className={`p-0.5 rounded ${onFeatureTraitMouseEnter ? 'hover:bg-slate-400/50 dark:hover:bg-slate-600/50 cursor-pointer' : ''}`}
            onMouseEnter={onFeatureTraitMouseEnter ? (e) => onFeatureTraitMouseEnter(ft, e) : undefined}
            onMouseMove={onFeatureTraitMouseMove ? (e) => onFeatureTraitMouseMove(e) : undefined}
            onMouseLeave={onFeatureTraitMouseLeave ? () => onFeatureTraitMouseLeave() : undefined}
            aria-label={ft.name} 
            tabIndex={onFeatureTraitMouseEnter ? 0 : undefined} 
            role={onFeatureTraitMouseEnter ? "button" : undefined}
            aria-describedby={onFeatureTraitMouseEnter ? `tooltip-trait-${ft.name.replace(/\s+/g, '-')}` : undefined}
          >
            {ft.name}
          </li>
        ))}
        {featuresAndTraits.length === 0 && <li>Ninguno</li>}
      </ul>
    </div>
  );
};

export default CharacterSummary;