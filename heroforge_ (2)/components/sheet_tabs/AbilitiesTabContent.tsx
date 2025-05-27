import React from 'react';
import { CharacterSheet, AbilityScoreName, SkillName, AttackRollMode } from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { ABILITY_SCORE_ES_MAP } from '../../constants/displayMaps';


interface AbilitiesTabContentProps {
    characterSheet: CharacterSheet;
    onRoll: (description: string, dice: number, sides: number, modifier: number, mode?: AttackRollMode) => void;
    currentRollMode: AttackRollMode;
}

const AbilitiesTabContent: React.FC<AbilitiesTabContentProps> = ({ characterSheet, onRoll, currentRollMode }) => {
  const { abilityScores, abilityScoreModifiers, savingThrows, skills, proficiencyBonus } = characterSheet;

  const getAbilityName = (ab: AbilityScoreName) => ABILITY_SCORE_ES_MAP[ab];
  const getSkillName = (skill: SkillName) => SKILL_DEFINITIONS.find(s => s.name === skill)?.nombre || skill;

  return (
    <div className="p-1 md:p-4 space-y-3 text-slate-700 dark:text-slate-200">
      <h3 className="text-2xl font-semibold text-purple-700 dark:text-purple-400">Puntuaciones y Habilidades</h3>
      <p className="text-sm">Bonificador de Competencia: <strong className="text-green-600 dark:text-green-400">+{proficiencyBonus}</strong></p>
      <p className="text-xs italic">Haz clic en un botón para realizar una tirada con el modo de tirada seleccionado ({currentRollMode}).</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-lg font-medium text-purple-500 dark:text-purple-300 mb-1.5">Puntuaciones y Salvaciones</h4>
          {(Object.keys(abilityScores) as AbilityScoreName[]).map(abName => (
            <div key={abName} className="flex items-center justify-between text-sm py-1 border-b border-slate-300 dark:border-slate-600 last:border-b-0">
              <div className="flex-1">
                <strong className="text-slate-800 dark:text-slate-100">{getAbilityName(abName)}:</strong> {abilityScores[abName]} ({abilityScoreModifiers[abName] >= 0 ? '+' : ''}{abilityScoreModifiers[abName]})
              </div>
              <div className="flex gap-1">
                  <button onClick={() => onRoll(`Prueba de ${getAbilityName(abName)}`, 1, 20, abilityScoreModifiers[abName], currentRollMode)} className="btn-roll-small">Prueba</button>
                  <button onClick={() => onRoll(`Salvación de ${getAbilityName(abName)}`, 1, 20, savingThrows[abName]?.value ?? abilityScoreModifiers[abName], currentRollMode)} className={`btn-roll-small ${savingThrows[abName]?.proficient ? 'proficient' : ''}`}>
                      Salv. ({savingThrows[abName]?.value !== undefined ? (savingThrows[abName]!.value >= 0 ? '+' : '') + savingThrows[abName]!.value : 'N/A'})
                  </button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h4 className="text-lg font-medium text-purple-500 dark:text-purple-300 mb-1.5">Habilidades</h4>
          {(Object.keys(skills) as SkillName[]).map(skillName => {
            const skillData = skills[skillName];
            if (!skillData) return null;
            return (
                <div key={skillName} className="flex items-center justify-between text-sm py-1 border-b border-slate-300 dark:border-slate-600 last:border-b-0">
                    <div className="flex-1">
                      <span className={`${skillData.proficient ? 'font-semibold text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'}`}>{getSkillName(skillName)}</span> 
                      <span className="text-xs text-slate-500 dark:text-slate-400"> ({ABILITY_SCORE_ES_MAP[skillData.ability].substring(0,3)})</span>: {skillData.value >= 0 ? '+' : ''}{skillData.value}
                    </div>
                    <button onClick={() => onRoll(`Prueba de ${getSkillName(skillName)}`, 1, 20, skillData.value, currentRollMode)} className="btn-roll-small">Prueba</button>
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AbilitiesTabContent;
