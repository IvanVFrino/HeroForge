
import React, { useRef } from 'react';
import { useHeroForge } from '../context/HeroForgeDataContext';
import { HeroForgeData } from '../types';
import { downloadJson, parseJsonFile } from '../utils/fileManager';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, SunIcon, MoonIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { Theme } from '../App';

interface SettingsProps {
  currentTheme: Theme;
  onToggleTheme: () => void;
}

const Settings: React.FC<SettingsProps> = ({ currentTheme, onToggleTheme }) => {
  const { data: heroForgeData, dispatch } = useHeroForge();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = () => {
    downloadJson(heroForgeData, 'heroforge_data.json');
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const importedData = await parseJsonFile<HeroForgeData>(file);
        if (importedData && 'characters' in importedData) {
          dispatch({ type: 'LOAD_DATA', payload: importedData });
          alert('¡Datos importados con éxito!');
        } else {
          alert('Formato de archivo de datos inválido.');
        }
      } catch (error) {
        console.error('Error al importar datos:', error);
        alert('Error al importar datos. Asegúrate de que el archivo sea un JSON válido.');
      }
    }
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-4xl font-bold text-purple-400 dark:text-purple-400 mb-8 text-center">Configuración</h1>
      
      <div className="space-y-8">
        {/* Appearance Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Preferencias de Apariencia</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="language-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Idioma de la Aplicación
              </label>
              <div className="relative">
                <select
                  id="language-select"
                  value="es" // Hardcoded to Spanish for now
                  // onChange={(e) => {/* Logic to change language */}}
                  disabled 
                  className="w-full p-2 pr-8 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100 appearance-none disabled:opacity-70"
                >
                  <option value="es">Español</option>
                  {/* <option value="en">English</option> */}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-400">
                  <LanguageIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">El cambio de idioma completo estará disponible en futuras versiones.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tema de Color
              </label>
              <button
                onClick={onToggleTheme}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 focus:ring-purple-500"
              >
                {currentTheme === 'dark' ? (
                  <SunIcon className="h-5 w-5 mr-2 text-yellow-400" />
                ) : (
                  <MoonIcon className="h-5 w-5 mr-2 text-purple-400" />
                )}
                Cambiar a Tema {currentTheme === 'dark' ? 'Claro' : 'Oscuro'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Management Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Gestión de Datos</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
            Exporta todos tus datos de HeroForge (personajes, contenido personalizado) a un único archivo JSON.
            Puedes importar este archivo más tarde para restaurar tus datos o transferirlos a otro dispositivo.
          </p>
        
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExportData}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-green-500 transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Exportar Datos
            </button>
            
            <button
              onClick={triggerFileInput}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-purple-500 text-base font-medium rounded-md text-purple-600 dark:text-purple-300 bg-transparent hover:bg-purple-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-purple-400 transition-colors"
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
              Importar Datos
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImportData}
              className="hidden"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Al importar datos se sobrescribirá cualquier dato existente en la aplicación. Asegúrate de exportar tus datos actuales primero si deseas conservarlos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;