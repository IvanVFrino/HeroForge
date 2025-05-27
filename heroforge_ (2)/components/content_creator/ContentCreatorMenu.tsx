
import React from 'react';
import { Link } from 'react-router-dom';
import { UserGroupIcon, ShieldCheckIcon, BookOpenIcon, UsersIcon as NpcIcon, CubeIcon, SparklesIcon as SpellIcon, AcademicCapIcon } from '@heroicons/react/24/outline'; // Added AcademicCapIcon

const ContentCreatorMenu: React.FC = () => {
  const creatorSections = [
    { name: 'Objetos Personalizados', path: '/content-creator/item/new', icon: CubeIcon, description: "Forja objetos únicos, desde artefactos mágicos hasta equipo mundano." },
    { name: 'Especies Personalizadas', path: '/content-creator/species/new', icon: UserGroupIcon, description: "Diseña especies jugables únicas con sus propios rasgos." },
    { name: 'Clases Personalizadas', path: '/content-creator/class/new', icon: ShieldCheckIcon, description: "Forja nuevas clases de personaje base." },
    { name: 'Subclases Personalizadas', path: '/content-creator/subclass/new', icon: AcademicCapIcon, description: "Crea especializaciones y arquetipos para tus clases." }, // Added
    { name: 'Trasfondos Personalizados', path: '/content-creator/background/new', icon: BookOpenIcon, description: "Crea trasfondos de personaje e historias de origen convincentes." },
    { name: 'PNJs Personalizados', path: '/content-creator/npc/new', icon: NpcIcon, description: "Crea personajes no jugadores y monstruos para tus campañas." },
    { name: 'Conjuros Personalizados', path: '/content-creator/spell/new', icon: SpellIcon, description: "Diseña nuevos conjuros, trucos y rituales mágicos." }, 
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-8 text-center">Creador de Contenido</h1>
      <p className="text-center text-slate-700 dark:text-slate-300 mb-10 max-w-2xl mx-auto">
        ¡Desata tu creatividad! Diseña tus propios elementos de juego para Dungeons & Dragons.
        Usa los formularios o el asistente de IA para ayudarte a crear contenido.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {creatorSections.map((section) => (
          <Link
            key={section.name}
            to={section.path} 
            className={`block p-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300 ease-in-out group`}
          >
            <section.icon className="h-10 w-10 text-purple-500 dark:text-purple-400 mb-3 transition-transform duration-300 group-hover:rotate-3" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">{section.name}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ContentCreatorMenu;
