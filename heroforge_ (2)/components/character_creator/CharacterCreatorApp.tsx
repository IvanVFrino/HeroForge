import React, { useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import ClassSelection from '../steps/ClassSelection';
import OriginSelection from '../steps/OriginSelection';
import AbilityScores from '../steps/AbilityScores';
import AlignmentSelection from '../steps/AlignmentSelection';
import FinalDetails from '../steps/FinalDetails';
import CharacterSummary from '../CharacterSummary';
import { ArrowRightIcon, UserCircleIcon, PuzzlePieceIcon, CalculatorIcon, ScaleIcon, DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCharacter } from '../../context/CharacterContext';

const steps = [
  { path: 'class', name: 'Clase', icon: PuzzlePieceIcon },
  { path: 'origin', name: 'Origen', icon: UserCircleIcon },
  { path: 'ability-scores', name: 'Puntuaciones de Característica', icon: CalculatorIcon },
  { path: 'alignment', name: 'Alineamiento', icon: ScaleIcon },
  { path: 'final-details', name: 'Detalles Finales', icon: DocumentTextIcon },
];

const CharacterCreatorApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate(); 
  const { character, dispatch: characterDispatch } = useCharacter();

  useEffect(() => {
    if (!character.class && (!character._savedCoreDataHelper?.id || !character._savedCoreDataHelper.id.startsWith('new_'))) {
      characterDispatch({ type: 'RESET_CHARACTER_SHEET' });
    }
  }, [characterDispatch, character.class, character._savedCoreDataHelper?.id]);


  const basePath = '/character-creator/new'; 
  const relativePath = location.pathname.replace(basePath + '/', '');
  const currentIndex = steps.findIndex(step => step.path === relativePath);
  
  if (currentIndex === -1 && (location.pathname === basePath || location.pathname === basePath + '/')) {
    return <Navigate to={`${basePath}/${steps[0].path}`} replace />;
  }
  
  const currentStepInfo = steps[currentIndex];

  const canProceed = (targetIndex: number): boolean => {
    if (targetIndex > 0 && !character.class) return false;
    if (targetIndex > 1 && (!character.background || !character.species)) return false;
    if (targetIndex > 2) {
        const scores = character._savedCoreDataHelper?.baseAbilityScores || character.abilityScores;
        if (!scores || Object.values(scores).some(s => s === undefined)) return false; 
        const sum = Object.values(scores).reduce<number>((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
        if (sum === 60 && Object.values(scores).every(s => s === 10)) return false; 
        if (Object.values(scores).length < 6) return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-0">
      <header className="mb-8 text-center mt-5">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          Creador de Personajes D&D 5e
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
          ¡Crea tu héroe legendario para las aventuras de 2024!
        </p>
      </header>

      <div className="w-full max-w-6xl bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-1/4 border-r border-slate-200 dark:border-slate-700 pr-0 md:pr-6 mb-6 md:mb-0">
          <nav className="space-y-2">
            {steps.map((step, index) => (
              <NavLink
                key={step.path}
                to={`${basePath}/${step.path}`}
                className={({ isActive }) =>
                  `flex items-center p-3 rounded-lg transition-all duration-200 ease-in-out group ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  } ${index > currentIndex && !canProceed(index) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`
                }
                onClick={(e) => {
                  if (index > currentIndex && !canProceed(index)) e.preventDefault();
                }}
              >
                <step.icon className={`h-6 w-6 mr-3 transition-transform duration-200 ${currentStepInfo?.path === step.path ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="font-medium">{step.name}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-h-[60vh] flex flex-col">
          <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg shadow-inner flex-grow mb-6">
            <Routes>
              <Route path="class" element={<ClassSelection />} />
              <Route path="origin" element={<OriginSelection />} />
              <Route path="ability-scores" element={<AbilityScores />} />
              <Route path="alignment" element={<AlignmentSelection />} />
              <Route path="final-details" element={<FinalDetails />} />
              <Route index element={<Navigate to="class" replace />} />
            </Routes>
          </div>
           <div className="flex justify-between mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
            {currentIndex > 0 && (
              <NavLink
                to={`${basePath}/${steps[currentIndex - 1].path}`}
                className="bg-slate-500 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Anterior
              </NavLink>
            )}
             <div className="flex-grow"></div> {/* Spacer */}
            {currentIndex < steps.length - 1 && (
              <NavLink
                to={`${basePath}/${steps[currentIndex + 1].path}`}
                onClick={(e) => { if (!canProceed(currentIndex + 1)) e.preventDefault(); }}
                className={`bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center ${!canProceed(currentIndex+1) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Siguiente
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </NavLink>
            )}
          </div>
        </main>
        
        <aside className="hidden lg:block w-full md:w-1/3 border-l border-slate-200 dark:border-slate-700 pl-0 md:pl-6">
           <CharacterSummary />
        </aside>
      </div>
      <footer className="mt-12 text-center text-slate-600 dark:text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Módulo Creador de Personajes. HeroForge.</p>
      </footer>
    </div>
  );
};

export default CharacterCreatorApp;