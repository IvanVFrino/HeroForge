import React from 'react';
import { CharacterSheet, Trait } from '../../types';

interface TraitsTabContentProps {
    characterSheet: CharacterSheet;
    onMouseEnter: (trait: Trait, event: React.MouseEvent<HTMLElement>) => void;
    onMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
}

const TraitsTabContent: React.FC<TraitsTabContentProps> = ({ characterSheet, onMouseEnter, onMouseMove, onMouseLeave }) => {
  const { featuresAndTraits } = characterSheet;
  
  const traitsGroupedBySource = featuresAndTraits.reduce((acc, trait) => {
    const source = trait.source || 'Otros';
    if (!acc[source]) acc[source] = [];
    acc[source].push(trait);
    return acc;
  }, {} as Record<string, Trait[]>);

  const sourceOrder: Record<string, number> = { 'Species': 1, 'Class': 2, 'Subclass': 3, 'Background': 4, 'Otros': 5 };
  const sortedSources = Object.keys(traitsGroupedBySource).sort((a,b) => (sourceOrder[a] || 99) - (sourceOrder[b] || 99));

  return (
    <div className="p-1 md:p-4 space-y-4 text-slate-700 dark:text-slate-200">
      <h3 className="text-2xl font-semibold text-purple-700 dark:text-purple-400">Rasgos y Atributos</h3>
      {sortedSources.map(sourceName => {
        const sourceTraits = traitsGroupedBySource[sourceName];
        if (sourceTraits.length > 0) {
          return (
            <div key={sourceName}>
              <h4 className="text-lg font-medium text-purple-500 dark:text-purple-300 border-b border-slate-300 dark:border-slate-600 pb-1 mb-2">{sourceName}</h4>
              <ul className="list-none space-y-1">
                {sourceTraits.map((trait) => (
                  <li key={`${sourceName}-${trait.name}`} 
                      className="text-sm p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      onMouseEnter={(e) => onMouseEnter(trait, e)}
                      onMouseMove={onMouseMove}
                      onMouseLeave={onMouseLeave}
                  >
                    <strong>{trait.name}:</strong> {trait.description.length > 100 ? `${trait.description.substring(0,97)}...` : trait.description}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return null;
      })}
       {featuresAndTraits.length === 0 && <p className="italic">No hay rasgos o atributos listados.</p>}
    </div>
  );
};
export default TraitsTabContent;
