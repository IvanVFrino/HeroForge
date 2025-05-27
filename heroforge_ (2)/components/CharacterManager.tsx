
import React from 'react';
import { useHeroForge } from '../context/HeroForgeDataContext';
import { Link } from 'react-router-dom';
import { TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { CLASSES_DATA } from '../constants/dndClasses';
import { SPECIES_DATA } from '../constants/dndSpecies';


const CharacterManager: React.FC = () => {
  const { data, dispatch } = useHeroForge();

  const handleDeleteCharacter = (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este personaje? Esta acción no se puede deshacer.")) {
        dispatch({ type: 'DELETE_CHARACTER', payload: id });
    }
  };

  const getClassName = (id: string) => CLASSES_DATA.find(c => c.id === id)?.name || id.replace('base-','');
  const getSpeciesName = (id: string) => SPECIES_DATA.find(s => s.id === id)?.name || id.replace('base-','');


  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-8 text-center">Gestor de Personajes</h1>
      {data.characters.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
          <p className="text-slate-700 dark:text-slate-300 text-xl mb-4">No se encontraron personajes.</p>
          <Link 
            to="/character-creator/new/class"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-purple-500"
          >
            Crea Tu Primer Personaje
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.characters.map((char) => (
            <div key={char.id} className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-xl flex flex-col">
              <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-2">{char.characterName || 'Personaje Sin Nombre'}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Nivel {char.level} {getSpeciesName(char.speciesId)} {getClassName(char.classId)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Alineamiento: {char.alignment || 'No establecido'}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-2">
                <Link
                  to={`/character-sheet/${char.id}`} 
                  title="Ver Hoja de Personaje"
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
                >
                  <EyeIcon className="h-5 w-5" />
                </Link>
                <button 
                  onClick={() => handleDeleteCharacter(char.id)}
                  title="Eliminar Personaje"
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CharacterManager;