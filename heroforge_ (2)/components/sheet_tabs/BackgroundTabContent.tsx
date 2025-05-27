import React from 'react';
import { CharacterSheet } from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';

interface BackgroundTabContentProps {
    characterSheet: CharacterSheet;
}

const BackgroundTabContent: React.FC<BackgroundTabContentProps> = ({ characterSheet }) => {
  const { background } = characterSheet;
  if (!background) return <p className="italic p-4">Sin trasfondo seleccionado.</p>;
  return (
    <div className="p-1 md:p-4 space-y-3 text-slate-700 dark:text-slate-200">
      <h3 className="text-2xl font-semibold text-purple-700 dark:text-purple-400">{background.name}</h3>
      <p className="text-sm"><strong>Dote de Origen:</strong> {background.originFeat}</p>
      <p className="text-sm"><strong>Competencias en Habilidades:</strong> {background.skillProficiencies.map(s => SKILL_DEFINITIONS.find(sd => sd.name === s)?.nombre || s).join(', ')}</p>
      {background.toolProficiencies && background.toolProficiencies.length > 0 && (
        <p className="text-sm"><strong>Competencias en Herramientas:</strong> {background.toolProficiencies.join(', ')}</p>
      )}
      {background.languages && background.languages.length > 0 && (
        <p className="text-sm"><strong>Idiomas Adicionales:</strong> {background.languages.join(', ')}</p>
      )}
      <div className="mt-2">
        <h4 className="font-semibold text-md text-purple-600 dark:text-purple-300">Equipo Inicial del Trasfondo:</h4>
        <ul className="list-disc list-inside text-sm ml-4">
          {background.startingEquipment.items.map((item, idx) => <li key={idx}>{item.name} (x{item.quantity})</li>)}
          <li>{background.startingEquipment.gold} piezas de oro</li>
        </ul>
      </div>
    </div>
  );
};

export default BackgroundTabContent;
