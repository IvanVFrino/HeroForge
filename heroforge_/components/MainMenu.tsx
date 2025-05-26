

import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlusIcon, UsersIcon, SparklesIcon, CogIcon, BookOpenIcon, ArchiveBoxIcon, RectangleStackIcon, ShieldExclamationIcon, BoltIcon } from '@heroicons/react/24/outline';

const MainMenu: React.FC = () => {
  const menuItems = [
    { name: 'Creador de Personajes', path: '/character-creator/new/class', icon: UserPlusIcon, description: "Crea nuevos personajes de D&D 5e paso a paso." },
    { name: 'Gestor de Personajes', path: '/character-manager', icon: UsersIcon, description: "Visualiza, edita o elimina tus personajes guardados." },
    { name: 'Bestiario', path: '/bestiary', icon: ShieldExclamationIcon, description: "Explora y gestiona PNJs y monstruos personalizados." },
    { name: 'Gestor de Combate', path: '/combat-tracker', icon: BoltIcon, description: "Organiza y dirige encuentros de combate dinámicos." },
    { name: 'Creador de Contenido', path: '/content-creator', icon: SparklesIcon, description: "Diseña especies, clases, trasfondos, PNJs y más." },
    { name: 'Creador de Contenido en Masa', path: '/mass-content-creator', icon: RectangleStackIcon, description: "Usa IA para generar múltiples contenidos a la vez." },
    { name: 'Contenido Personalizado', path: '/custom-content-manager', icon: ArchiveBoxIcon, description: "Gestiona y visualiza todo tu contenido personalizado." },
    // { name: 'Compendio', path: '/compendium', icon: BookOpenIcon, description: "Explora reglas, hechizos, objetos y monstruos." },
    { name: 'Configuración', path: '/settings', icon: CogIcon, description: "Importa o exporta tus datos de HeroForge y ajusta preferencias." },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
          Bienvenido a HeroForge
        </h1>
        <p className="mt-4 text-xl text-slate-700 dark:text-slate-300">
          Tu conjunto de herramientas todo-en-uno para aventuras de Dungeons & Dragons 5ª Edición.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className="block p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300 ease-in-out group"
          >
            <item.icon className="h-12 w-12 text-purple-600 dark:text-purple-400 mb-4 transition-transform duration-300 group-hover:rotate-6" />
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{item.name}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{item.description}</p>
          </Link>
        ))}
      </div>
       <div className="mt-16 text-center">
         <p className="text-slate-600 dark:text-slate-400">
            Usando directrices del Manual del Jugador de D&D 5e 2024.
        </p>
      </div>
    </div>
  );
};

export default MainMenu;