
import { DndSpecies, Size } from '../types';

export const SPECIES_DATA: DndSpecies[] = [
  {
    id: 'base-human',
    name: 'Humano',
    size: 'Medium',
    speed: 30,
    languages: ['Común', 'Un idioma adicional de tu elección'],
    traits: [
      { name: 'Ingenioso', description: 'Ganas una Dote de tu elección para la que califiques (el MdJ 2024 sugiere que aquí es donde se expresa la versatilidad humana). Esto a menudo se representa con el Trasfondo proporcionando una Dote de Origen.', source: 'Species' },
      { name: 'Habilidoso', description: 'Ganas competencia en una habilidad de tu elección.', source: 'Species' }
    ],
    isCustom: false,
  },
  {
    id: 'base-elf',
    name: 'Elfo',
    size: 'Medium',
    speed: 30,
    languages: ['Común', 'Élfico'],
    traits: [
      { name: 'Visión en la Oscuridad', description: 'Acostumbrado a los bosques crepusculares y el cielo nocturno, tienes una visión superior en condiciones de oscuridad y penumbra. Puedes ver en luz tenue a menos de 60 pies de ti como si fuera luz brillante, y en la oscuridad como si fuera luz tenue. No puedes discernir colores en la oscuridad, solo tonos de gris.', source: 'Species' },
      { name: 'Ascendencia Feérica', description: 'Tienes ventaja en las tiradas de salvación contra ser hechizado, y la magia no puede ponerte a dormir.', source: 'Species' },
      { name: 'Trance', description: 'Los elfos no necesitan dormir. En su lugar, meditan profundamente, permaneciendo semiconscientes, durante 4 horas al día. Después de descansar de esta manera, obtienes el mismo beneficio que un humano de 8 horas de sueño.', source: 'Species' },
      { name: 'Sentidos Agudos', description: 'Tienes competencia en la habilidad de Percepción.', source: 'Species'}
    ],
    isCustom: false,
  },
  // Add more species with 'id' and 'isCustom: false'
];