
import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import CharacterCreatorApp from './components/character_creator/CharacterCreatorApp';
import Settings from './components/Settings';
import CharacterManager from './components/CharacterManager'; 
import ViewCharacterSheet from './components/ViewCharacterSheet';
import ContentCreatorMenu from './components/content_creator/ContentCreatorMenu'; 
import CreateCustomItemForm from './components/content_creator/CreateCustomItemForm';
import CreateCustomSpeciesForm from './components/content_creator/CreateCustomSpeciesForm';
import CreateCustomClassForm from './components/content_creator/CreateCustomClassForm';
import CreateCustomSubclassForm from './components/content_creator/CreateCustomSubclassForm'; // Added
import CreateCustomBackgroundForm from './components/content_creator/CreateCustomBackgroundForm';
import CreateCustomNpcForm from './components/content_creator/CreateCustomNpcForm';
import CreateCustomSpellForm from './components/content_creator/CreateCustomSpellForm'; 
import { CustomContentManager } from './components/CustomContentManager'; // Changed to named import
import MassContentCreator from '@/components/MassContentCreator'; 
import Bestiary from './components/Bestiary';
import CombatTracker from './components/CombatTracker'; 
import { HomeIcon, UserPlusIcon, CogIcon, UsersIcon, SparklesIcon, ArrowLeftIcon, ArchiveBoxIcon, RectangleStackIcon, ShieldExclamationIcon, BoltIcon } from '@heroicons/react/24/outline';

const navLinks = [
  { path: '/main-menu', name: 'Menú Principal', icon: HomeIcon },
  { path: '/character-creator/new/class', name: 'Creador de Personajes', icon: UserPlusIcon },
  { path: '/character-manager', name: 'Gestor de Personajes', icon: UsersIcon },
  { path: '/bestiary', name: 'Bestiario', icon: ShieldExclamationIcon },
  { path: '/combat-tracker', name: 'Gestor de Combate', icon: BoltIcon }, 
  { path: '/content-creator', name: 'Creador de Contenido', icon: SparklesIcon },
  { path: '/mass-content-creator', name: 'Creador en Masa', icon: RectangleStackIcon },
  { path: '/custom-content-manager', name: 'Contenido Personalizado', icon: ArchiveBoxIcon },
  { path: '/settings', name: 'Configuración', icon: CogIcon },
];

export type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('heroforge-theme') as Theme | null;
    return storedTheme || 'dark'; // Default to dark theme
  });

  useEffect(() => {
    localStorage.setItem('heroforge-theme', theme);
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);

    if (theme === 'dark') {
      document.body.style.backgroundColor = '#0f172a'; 
      document.body.style.color = '#f1f5f9'; 
    } else {
      document.body.style.backgroundColor = '#f1f5f9'; 
      document.body.style.color = '#0f172a'; 
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const isCreatorActive = location.pathname.startsWith('/character-creator');
  const isSheetViewActive = location.pathname.startsWith('/character-sheet');
  const isContentCreatorFormsActive = location.pathname.startsWith('/content-creator/') && location.pathname !== '/content-creator';
  const isCustomContentManagerActive = location.pathname === '/custom-content-manager';
  const isMassContentCreatorActive = location.pathname === '/mass-content-creator';
  const isBestiaryActive = location.pathname === '/bestiary';
  const isCombatTrackerActive = location.pathname === '/combat-tracker'; 

  const showNavBar = !isCreatorActive && !isSheetViewActive && !isContentCreatorFormsActive && !isCustomContentManagerActive && !isMassContentCreatorActive && !isBestiaryActive && !isCombatTrackerActive;
  const showBackButton = isCreatorActive || isSheetViewActive || isContentCreatorFormsActive || isCustomContentManagerActive || isMassContentCreatorActive || isBestiaryActive || isCombatTrackerActive;
  const mainContentPadding = showNavBar ? 'p-6' : '';


  const getBackLinkPath = () => {
    if (isSheetViewActive) return "/character-manager";
    if (isContentCreatorFormsActive) return "/content-creator";
    if (isCustomContentManagerActive || isMassContentCreatorActive || isBestiaryActive || isCombatTrackerActive) return "/main-menu";
    return "/main-menu"; // Default for character creator
  };

  const getBackLinkText = () => {
    if (isSheetViewActive) return "Volver al Gestor";
    if (isContentCreatorFormsActive) return "Volver al Creador de Contenido";
    if (isCustomContentManagerActive || isMassContentCreatorActive || isBestiaryActive || isCombatTrackerActive) return "Volver al Menú Principal";
    return "Volver al Menú Principal";
  };

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-slate-100`}>
      {showNavBar && (
        <nav className="bg-slate-200 dark:bg-slate-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <NavLink to="/main-menu" className="flex-shrink-0 text-2xl font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300">
                  HeroForge
                </NavLink>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.name}
                      to={link.path}
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive || 
                          (link.name === 'Creador de Personajes' && isCreatorActive) ||
                          (link.name === 'Bestiario' && isBestiaryActive) || 
                          (link.name === 'Gestor de Combate' && isCombatTrackerActive) || 
                          (link.name === 'Creador de Contenido' && (location.pathname.startsWith('/content-creator') || isMassContentCreatorActive)) ||
                          (link.name === 'Contenido Personalizado' && isCustomContentManagerActive) 
                            ? 'bg-purple-600 text-white' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`
                      }
                    >
                      <link.icon className="h-5 w-5 inline-block mr-1 align-text-bottom" />
                      {link.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {showBackButton && (
         <div className="bg-slate-200 dark:bg-slate-800 shadow-md p-3 sticky top-0 z-20">
            <NavLink
                to={getBackLinkPath()}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-purple-500"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                {getBackLinkText()}
            </NavLink>
        </div>
      )}

      <main className={`flex-grow ${mainContentPadding}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/main-menu" replace />} />
          <Route path="/main-menu" element={<MainMenu />} />
          
          <Route path="/character-creator/new/*" element={<CharacterCreatorApp />} />
          <Route path="/character-creator" element={<Navigate to="/character-creator/new/class" replace />} />
          
          <Route path="/character-manager" element={<CharacterManager />} />
          <Route path="/character-sheet/:characterId" element={<ViewCharacterSheet />} />
          
          <Route path="/content-creator" element={<ContentCreatorMenu />} />
          <Route path="/content-creator/item/new" element={<CreateCustomItemForm />} />
          <Route path="/content-creator/species/new" element={<CreateCustomSpeciesForm />} />
          <Route path="/content-creator/class/new" element={<CreateCustomClassForm />} />
          <Route path="/content-creator/subclass/new" element={<CreateCustomSubclassForm />} /> {/* Added */}
          <Route path="/content-creator/background/new" element={<CreateCustomBackgroundForm />} />
          <Route path="/content-creator/npc/new" element={<CreateCustomNpcForm />} /> 
          <Route path="/content-creator/spell/new" element={<CreateCustomSpellForm />} /> 
          
          <Route path="/custom-content-manager" element={<CustomContentManager />} />
          <Route path="/mass-content-creator" element={<MassContentCreator />} />
          <Route path="/bestiary" element={<Bestiary />} /> 
          <Route path="/combat-tracker" element={<CombatTracker />} /> 

          <Route path="/settings" element={<Settings currentTheme={theme} onToggleTheme={toggleTheme} />} />
        </Routes>
      </main>

      {showNavBar && (
        <footer className="py-4 bg-slate-200 dark:bg-slate-800 text-center text-slate-600 dark:text-slate-500 text-xs border-t border-slate-300 dark:border-slate-700">
          &copy; {new Date().getFullYear()} HeroForge. Compatible con D&D 5e PHB 2024.
        </footer>
      )}
    </div>
  );
};

export default App;
