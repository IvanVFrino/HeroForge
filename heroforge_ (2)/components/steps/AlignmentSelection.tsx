
import React from 'react';
import { useCharacter } from '../../context/CharacterContext';
// Fix: Import ALIGNMENTS_LIST from types.ts
import { Alignment, ALIGNMENTS_LIST } from '../../types';

const ALIGNMENT_ES: Record<Alignment, string> = {
  'Lawful Good': 'Legal Bueno',
  'Neutral Good': 'Neutral Bueno',
  'Chaotic Good': 'Caótico Bueno',
  'Lawful Neutral': 'Legal Neutral',
  'True Neutral': 'Neutral Auténtico',
  'Chaotic Neutral': 'Caótico Neutral',
  'Lawful Evil': 'Legal Malvado',
  'Neutral Evil': 'Neutral Malvado',
  'Chaotic Evil': 'Caótico Malvado',
};


const AlignmentSelection: React.FC = () => {
  const { character, dispatch } = useCharacter();

  const handleAlignmentSelect = (alignment: Alignment) => {
    dispatch({ type: 'SET_ALIGNMENT', payload: alignment });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-purple-600 dark:text-purple-400 mb-6">Elige tu Alineamiento</h2>
      <p className="text-slate-700 dark:text-slate-300 mb-4">
        El alineamiento es una combinación de dos factores: uno identifica la moralidad (bueno, malvado o neutral),
        y el otro describe las actitudes hacia la sociedad y el orden (legal, caótico o neutral).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {ALIGNMENTS_LIST.map((alignment) => (
          <button
            key={alignment}
            onClick={() => handleAlignmentSelect(alignment)}
            className={`p-4 rounded-lg shadow-lg transition-all duration-200 border-2 text-center ${
              character.alignment === alignment
                ? 'bg-purple-600 border-purple-400 text-white scale-105'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-purple-500 text-slate-900 dark:text-slate-100'
            }`}
          >
            <h3 className="text-lg font-medium">{ALIGNMENT_ES[alignment]}</h3>
          </button>
        ))}
      </div>
      {character.alignment && (
        <p className="mt-6 text-center text-xl text-slate-800 dark:text-slate-200">
          Alineamiento Seleccionado: <span className="font-bold text-purple-700 dark:text-purple-300">{ALIGNMENT_ES[character.alignment]}</span>
        </p>
      )}
    </div>
  );
};

export default AlignmentSelection;
