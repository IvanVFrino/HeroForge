
import { DndClass, SkillName, StartingEquipmentItem, DamageType, ClassSpellcastingProgressionEntry } from '../types';
import { SKILL_DEFINITIONS } from './skills';

const ALL_SKILL_NAMES = SKILL_DEFINITIONS.map(skillDef => skillDef.name as SkillName);

// Example Spell Slot Progression (full casters like Bard, Cleric, Druid, Wizard)
const FULL_CASTER_SPELL_SLOTS_L1_TO_3: Record<number, number[]> = {
  1: [2, 0, 0, 0, 0, 0, 0, 0, 0], // L1: 2 L1 slots
  2: [3, 0, 0, 0, 0, 0, 0, 0, 0], // L2: 3 L1 slots
  3: [4, 2, 0, 0, 0, 0, 0, 0, 0], // L3: 4 L1 slots, 2 L2 slots
  // ... up to L20
};

// Example Bard Spellcasting Progression
const BARD_SPELLCASTING_PROGRESSION: Record<number, ClassSpellcastingProgressionEntry> = {
  1: { cantripsKnown: 2, spellsKnown: 4, spellSlots: FULL_CASTER_SPELL_SLOTS_L1_TO_3[1] },
  2: { cantripsKnown: 2, spellsKnown: 5, spellSlots: FULL_CASTER_SPELL_SLOTS_L1_TO_3[2] },
  3: { cantripsKnown: 2, spellsKnown: 6, spellSlots: FULL_CASTER_SPELL_SLOTS_L1_TO_3[3] },
  // ... up to L20
};


export const CLASSES_DATA: DndClass[] = [
  {
    id: 'base-barbarian',
    name: 'Bárbaro',
    hitDie: 12,
    primaryAbilities: ['Strength', 'Constitution'],
    savingThrowProficiencies: ['Strength', 'Constitution'],
    armorProficiencies: ['Armadura Ligera', 'Armadura Media', 'Escudos'],
    weaponProficiencies: ['Armas Simples', 'Armas Marciales'],
    toolProficiencies: { choices: [], count: 0 },
    skillProficiencies: { 
      choices: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'], 
      count: 2 
    },
    startingEquipmentBundles: [
      { 
        key: 'barb_A', 
        description: "(a) Gran Hacha o (b) cualquier arma cuerpo a cuerpo marcial",
        isInstructional: true,
        items: [],
      },
      {
        key: 'barb_A1',
        description: "Gran Hacha",
        items: [{
          name: "Gran Hacha", 
          quantity: 1, 
          category: "Weapon", 
          weaponDetails: { damageDice: "1d12", damageType: "Slashing" as DamageType, properties: ["Heavy", "Two-Handed"] }
        }],
      },
      {
        key: 'barb_A2',
        description: "Cualquier arma marcial cuerpo a cuerpo (ej. Espada Larga)",
        items: [{
          name: "Espada Larga", 
          quantity: 1, 
          category: "Weapon", 
          weaponDetails: { damageDice: "1d8", damageType: "Slashing" as DamageType, properties: ["Versatile"], versatileDamage: "1d10" }
        }],
      },
      {
        key: 'barb_B',
        description: "(a) Dos hachas de mano o (b) cualquier arma simple",
        isInstructional: true,
        items: [],
      },
      {
        key: 'barb_B1',
        description: "Dos hachas de mano",
        items: [{
          name: "Hacha de Mano", 
          quantity:2, 
          category: "Weapon", 
          weaponDetails: { damageDice: "1d6", damageType: "Slashing" as DamageType, properties: ["Light", "Thrown"], rangeNormal: 20, rangeLong: 60 }
        }],
      },
      {
        key: 'barb_B2',
        description: "Cualquier arma simple (ej. Jabalina)",
        items: [{
          name: "Jabalina", 
          quantity:1, 
          category: "Weapon", 
          weaponDetails: { damageDice: "1d6", damageType: "Piercing" as DamageType, properties: ["Thrown"], rangeNormal: 30, rangeLong: 120 }
        }],
      },
      { 
        key: 'barb_fixed',
        description: "Un paquete de explorador y cuatro jabalinas",
        items: [
          {name:"Paquete de Explorador", quantity:1},
          {
            name: "Jabalina", 
            quantity:4, 
            category: "Weapon", 
            weaponDetails: { damageDice: "1d6", damageType: "Piercing" as DamageType, properties: ["Thrown"], rangeNormal: 30, rangeLong: 120 }
          }
        ], 
      }
    ],
    classFeaturesByLevel: {
      1: [
        { name: 'Furia', description: 'En batalla, luchas con ferocidad primigenia. En tu turno, puedes entrar en furia como acción adicional.', source: 'Class' },
        { name: 'Defensa sin Armadura', description: 'Mientras no lleves armadura, tu Clase de Armadura es igual a 10 + tu modificador de Destreza + tu modificador de Constitución. Puedes usar un escudo y seguir obteniendo este beneficio.', source: 'Class' }
      ],
      2: [
        { name: 'Ataque Temerario', description: 'Puedes exponerte al peligro para atacar con mayor fiereza. Cuando haces tu primer ataque en tu turno, puedes decidir atacar temerariamente.', source: 'Class'},
        { name: 'Sentido del Peligro', description: 'Tienes ventaja en las tiradas de salvación de Destreza contra efectos que puedas ver, como trampas y conjuros.', source: 'Class'}
      ],
      3: [
        { name: 'Camino Primario', description: 'Eliges un camino que moldea la naturaleza de tu furia. (Elección de Subclase)', source: 'Class'}
      ]
      // ... Populate up to level 20
    },
    subclassChoiceLevel: 3,
    availableSubclassIds: [], // Example: ['path-of-the-totem-warrior', 'path-of-the-zealot']
    weaponMasteriesKnown: 2,
    isCustom: false,
  },
  {
    id: 'base-bard',
    name: 'Bardo',
    hitDie: 8,
    primaryAbilities: ['Charisma'],
    savingThrowProficiencies: ['Dexterity', 'Charisma'],
    armorProficiencies: ['Armadura Ligera'],
    weaponProficiencies: ['Armas Simples', 'Ballestas de Mano', 'Espadas Largas', 'Estoques', 'Espadas Cortas'],
    toolProficiencies: { choices: ["Tres instrumentos musicales cualesquiera"], count: 3 },
    skillProficiencies: { choices: ALL_SKILL_NAMES, count: 3 },
    startingEquipmentBundles: [
      { key: 'bard_weapon_choice_instr', description: "Elige (a) un Estoque, (b) una Espada Larga, o (c) cualquier arma simple", isInstructional: true, items: [] },
      { key: 'bard_weapon_rapier', description: 'Un Estoque', items: [{ name: 'Estoque', quantity: 1 }] }, 
      { key: 'bard_weapon_longsword', description: 'Una Espada Larga', items: [{ 
          name: 'Espada Larga', 
          quantity: 1, 
          category: "Weapon", 
          weaponDetails: { damageDice: "1d8", damageType: "Slashing" as DamageType, properties: ["Versatile"], versatileDamage: "1d10" } 
      }] },
      { key: 'bard_weapon_simple', description: 'Cualquier arma simple (ej. Daga)', items: [{ name: 'Daga', quantity: 1 }] }, 
      
      { key: 'bard_pack_choice_instr', description: "Elige (a) un Paquete de Diplomático o (b) un Paquete de Artista", isInstructional: true, items: [] },
      { key: 'bard_pack_diplomat', description: "Un Paquete de Diplomático", items: [{ 
          name: "Paquete de Diplomático", 
          quantity: 1, 
          category: "Miscellaneous",
          description: "Incluye un cofre, dos estuches para mapas y pergaminos, un conjunto de ropas finas, una botella de tinta, una pluma, una lámpara, dos frascos de aceite, 5 hojas de papel, un vial de perfume, cera para sellar y jabón.",
          cost: {quantity: 39, unit: 'gp'}, 
          weight: {value: 30, unit: 'lb'} 
      }] },
      { key: 'bard_pack_artist', description: "Un Paquete de Artista", items: [{ 
          name: "Paquete de Artista", 
          quantity: 1,
          category: "Miscellaneous",
          description: "Incluye mochila, saco de dormir, 2 disfraces, 5 velas, 5 días de raciones, odre y kit de disfraz.",
          cost: { quantity: 10, unit: 'gp' }, 
          weight: { value: 12, unit: 'lb'}
      }] },
      
      { key: 'bard_instrument_choice_instr', description: "Elige (a) un Laúd o (b) cualquier otro instrumento musical", isInstructional: true, items: []},
      { key: 'bard_lute', description: "Un Laúd", items: [{ 
          name: 'Laúd', 
          quantity: 1,
          category: "Miscellaneous",
          description: "Un instrumento musical.",
          cost: { quantity: 35, unit: 'gp' }, 
          weight: { value: 2, unit: 'lb' }
      }] },
      { key: 'bard_other_instrument', description: "Otro instrumento musical (ej. Flauta)", items: [{ 
          name: 'Flauta', 
          quantity: 1,
          category: "Miscellaneous",
          description: "Un instrumento musical." 
      }] },

      { key: 'bard_fixed', description: "Adicionalmente: Armadura de Cuero y una Daga", items: [
          { name: 'Armadura de Cuero', quantity: 1 }, 
          { name: 'Daga', quantity: 1 } 
      ] },
    ],
    classFeaturesByLevel: {
      1: [
        { name: 'Lanzamiento de Conjuros (Bardo)', description: 'Has aprendido a desenredar y remodelar el tejido de la realidad en armonía con tus deseos y música.', source: 'Class' },
        { name: 'Inspiración Bárdica (d6)', description: 'Puedes inspirar a otros mediante palabras conmovedoras o música. Para ello, usas una acción adicional en tu turno para elegir una criatura que no seas tú a 60 pies de ti que pueda oírte. Esa criatura gana un dado de Inspiración Bárdica, un d6.', source: 'Class' }
      ],
      2: [
        { name: 'Mil Usos', description: 'Puedes añadir la mitad de tu bonificador de competencia, redondeado hacia abajo, a cualquier prueba de característica que hagas que no incluya ya tu bonificador de competencia.', source: 'Class' },
        { name: 'Canción de Descanso (d6)', description: 'Durante un descanso corto, puedes usar música o narración para ayudar a tus aliados a revitalizarse. Si tú o cualquier criatura amistosa que pueda oír tu interpretación recuperáis puntos de golpe al final del descanso corto gastando uno o más Dados de Golpe, cada una de esas criaturas recupera 1d6 puntos de golpe adicionales.', source: 'Class' },
      ],
      3: [
        { name: 'Colegio Bárdico', description: 'Eliges un colegio bárdico, que representa tu especialización. (Elección de Subclase)', source: 'Class'},
        { name: 'Pericia (Bardo)', description: 'Elige dos de tus competencias de habilidad. Tu bonificador de competencia se duplica para cualquier prueba de característica que hagas que use cualquiera de las competencias elegidas.', source: 'Class'}
      ]
      // ... Populate up to level 20
    },
    subclassChoiceLevel: 3,
    availableSubclassIds: [], // Example: ['college-of-lore', 'college-of-valor']
    spellcasting: {
      ability: 'Charisma',
      preparationType: 'known',
      progression: BARD_SPELLCASTING_PROGRESSION,
      spellList: ["Burla Cruel", "Luz", "Mano de Mago", "Palabra de Sanación", "Hechizar Persona", "Dormir", "Onda Atronadora", "Detectar Magia", "Risa Horrible de Tasha", "Susurros Disonantes", "Caída de Pluma", "Curar Heridas"] // Example spell list
    },
    isCustom: false,
  },
  {
    id: 'base-rogue',
    name: 'Pícaro',
    hitDie: 8,
    primaryAbilities: ['Dexterity'],
    savingThrowProficiencies: ['Dexterity', 'Intelligence'],
    armorProficiencies: ['Armadura Ligera'],
    weaponProficiencies: ['Armas Simples', 'Ballestas de Mano', 'Espadas Largas', 'Estoques', 'Espadas Cortas'],
    toolProficiencies: { fixed: ["Herramientas de Ladrón"] },
    skillProficiencies: { 
      choices: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'], 
      count: 4 
    },
    startingEquipmentBundles: [
      { key: 'rogue_choice1_instr', description: "Elige (a) un Estoque o (b) una Espada Corta", isInstructional: true, items: [] },
      { key: 'rogue_choice1_a', description: 'Un Estoque', items: [{ name: 'Estoque', quantity: 1 }] }, 
      { key: 'rogue_choice1_b', description: 'Una Espada Corta', items: [{ name: 'Espada Corta', quantity: 1 }] }, 
      
      { key: 'rogue_choice2_instr', description: "Elige (a) un Arco Corto y Carcaj con 20 Flechas o (b) una Espada Corta", isInstructional: true, items: [] },
      { key: 'rogue_choice2_a', description: 'Un Arco Corto y Carcaj con 20 Flechas', items: [
          { name: 'Arco Corto', quantity: 1 }, 
          { name: 'Carcaj', quantity: 1 }, 
          { name: 'Flechas (20)', quantity: 1} 
      ]},
      { key: 'rogue_choice2_b', description: 'Una Espada Corta', items: [{ name: 'Espada Corta', quantity: 1 }] }, 

      { key: 'rogue_choice3_instr', description: "Elige (a) un Paquete de Ladrón, (b) un Paquete de Dungeonero o (c) un Paquete de Explorador", isInstructional: true, items: [] },
      { key: 'rogue_choice3_a', description: "Un Paquete de Ladrón", items: [{ name: "Paquete de Ladrón", quantity: 1 }] }, 
      { key: 'rogue_choice3_b', description: "Un Paquete de Dungeonero", items: [{ name: "Paquete de Dungeonero", quantity: 1 }] }, 
      { key: 'rogue_choice3_c', description: "Un Paquete de Explorador", items: [{ name: "Paquete de Explorador", quantity: 1 }] }, 
      
      { 
        key: 'rogue_fixed', 
        description: "Adicionalmente, recibes: Armadura de Cuero, Dos Dagas y Herramientas de Ladrón.", 
        items: [
          { name: 'Armadura de Cuero', quantity: 1 }, 
          { name: 'Daga', quantity: 2 }, 
          { name: "Herramientas de Ladrón", quantity: 1 } 
        ],
      }
    ],
    classFeaturesByLevel: {
      1: [
        { name: 'Pericia', description: 'En el nivel 1, elige dos de tus competencias de habilidad, o una de tus competencias de habilidad y tu competencia con herramientas de ladrón. Tu bonificador de competencia se duplica para cualquier prueba de característica que hagas que use cualquiera de las competencias elegidas.', source: 'Class' },
        { name: 'Ataque Furtivo (1d6)', description: 'A partir del nivel 1, sabes cómo golpear sutilmente y explotar la distracción de un enemigo. Una vez por turno, puedes infligir 1d6 de daño adicional a una criatura que golpees con un ataque si tienes ventaja en la tirada de ataque. El ataque debe usar un arma sutil o a distancia.', source: 'Class' },
        { name: "Jerga de Ladrones", description: "Durante tu entrenamiento como pícaro aprendiste la jerga de ladrones, una mezcla secreta de dialecto, jerga y código que te permite ocultar mensajes en conversaciones aparentemente normales.", source: 'Class'}
      ],
      2: [
        { name: 'Acción Astuta', description: 'Tu rapidez mental y agilidad te permiten moverte y actuar rápidamente. Puedes usar una acción adicional en cada uno de tus turnos en combate. Esta acción solo puede usarse para realizar las acciones de Correr, Retirarse o Esconderse.', source: 'Class'}
      ],
      3: [
        { name: 'Arquetipo de Pícaro', description: 'Eliges un arquetipo que representa tu especialización como pícaro. (Elección de Subclase)', source: 'Class'}
      ]
      // ... Populate up to level 20
    },
    subclassChoiceLevel: 3,
    availableSubclassIds: [], // Example: ['thief', 'assassin']
    isCustom: false,
  },
];
