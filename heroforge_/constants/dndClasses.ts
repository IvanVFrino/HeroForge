
import { DndClass, SkillName, StartingEquipmentItem, DamageType } from '../types';
import { SKILL_DEFINITIONS } from './skills';

const ALL_SKILL_NAMES = SKILL_DEFINITIONS.map(skillDef => skillDef.name as SkillName);

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
    classFeaturesLevel1: [
      { name: 'Furia', description: 'En batalla, luchas con ferocidad primigenia. En tu turno, puedes entrar en furia como acción adicional.', source: 'Class' },
      { name: 'Defensa sin Armadura', description: 'Mientras no lleves armadura, tu Clase de Armadura es igual a 10 + tu modificador de Destreza + tu modificador de Constitución. Puedes usar un escudo y seguir obteniendo este beneficio.', source: 'Class' }
    ],
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
      { key: 'bard_weapon_rapier', description: 'Un Estoque', items: [{ name: 'Estoque', quantity: 1 }] }, // Estoque is in standardEquipment
      { key: 'bard_weapon_longsword', description: 'Una Espada Larga', items: [{ 
          name: 'Espada Larga', 
          quantity: 1, 
          category: "Weapon", 
          weaponDetails: { damageDice: "1d8", damageType: "Slashing" as DamageType, properties: ["Versatile"], versatileDamage: "1d10" } 
      }] },
      { key: 'bard_weapon_simple', description: 'Cualquier arma simple (ej. Daga)', items: [{ name: 'Daga', quantity: 1 }] }, // Daga is in standardEquipment
      
      { key: 'bard_pack_choice_instr', description: "Elige (a) un Paquete de Diplomático o (b) un Paquete de Artista", isInstructional: true, items: [] },
      { key: 'bard_pack_diplomat', description: "Un Paquete de Diplomático", items: [{ 
          name: "Paquete de Diplomático", 
          quantity: 1, 
          category: "Miscellaneous",
          description: "Incluye un cofre, dos estuches para mapas y pergaminos, un conjunto de ropas finas, una botella de tinta, una pluma, una lámpara, dos frascos de aceite, 5 hojas de papel, un vial de perfume, cera para sellar y jabón.",
          cost: {quantity: 39, unit: 'gp'}, // Approx based on PHB for contents
          weight: {value: 30, unit: 'lb'} // Approx
      }] },
      { key: 'bard_pack_artist', description: "Un Paquete de Artista", items: [{ 
          name: "Paquete de Artista", 
          quantity: 1,
          category: "Miscellaneous",
          description: "Incluye mochila, saco de dormir, 2 disfraces, 5 velas, 5 días de raciones, odre y kit de disfraz.",
          cost: { quantity: 10, unit: 'gp' }, // Values for Artist's Pack
          weight: { value: 12, unit: 'lb'}
      }] },
      
      { key: 'bard_instrument_choice_instr', description: "Elige (a) un Laúd o (b) cualquier otro instrumento musical", isInstructional: true, items: []},
      { key: 'bard_lute', description: "Un Laúd", items: [{ 
          name: 'Laúd', 
          quantity: 1,
          category: "Miscellaneous",
          description: "Un instrumento musical.",
          cost: { quantity: 35, unit: 'gp' }, // From Lute in standard equipment
          weight: { value: 2, unit: 'lb' }
      }] },
      { key: 'bard_other_instrument', description: "Otro instrumento musical (ej. Flauta)", items: [{ 
          name: 'Flauta', 
          quantity: 1,
          category: "Miscellaneous",
          description: "Un instrumento musical." 
          // Flute not in standardEquipment.ts, so details are minimal.
      }] },

      { key: 'bard_fixed', description: "Adicionalmente: Armadura de Cuero y una Daga", items: [
          { name: 'Armadura de Cuero', quantity: 1 }, // In standardEquipment
          { name: 'Daga', quantity: 1 } // In standardEquipment
      ] },
    ],
    classFeaturesLevel1: [
      { name: 'Lanzamiento de Conjuros', description: 'Has aprendido a desenredar y remodelar el tejido de la realidad en armonía con tus deseos y música.', source: 'Class' },
      { name: 'Inspiración Bárdica (d6)', description: 'Puedes inspirar a otros mediante palabras conmovedoras o música. Para ello, usas una acción adicional en tu turno para elegir una criatura que no seas tú a 60 pies de ti que pueda oírte. Esa criatura gana un dado de Inspiración Bárdica, un d6.', source: 'Class' }
    ],
    spellcasting: {
      ability: 'Charisma',
      knownCantrips: 2,
      preparedSpells: 4, 
      spellSlotsLevel1: 2,
      spellList: ["Burla Cruel", "Palabra de Sanación", "Hechizar Persona", "Dormir", "Onda Atronadora", "Detectar Magia", "Risa Horrible de Tasha", "Susurros Disonantes"]
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
      { key: 'rogue_choice1_a', description: 'Un Estoque', items: [{ name: 'Estoque', quantity: 1 }] }, // In standardEquipment
      { key: 'rogue_choice1_b', description: 'Una Espada Corta', items: [{ name: 'Espada Corta', quantity: 1 }] }, // In standardEquipment
      
      { key: 'rogue_choice2_instr', description: "Elige (a) un Arco Corto y Carcaj con 20 Flechas o (b) una Espada Corta", isInstructional: true, items: [] },
      { key: 'rogue_choice2_a', description: 'Un Arco Corto y Carcaj con 20 Flechas', items: [
          { name: 'Arco Corto', quantity: 1 }, // In standardEquipment
          { name: 'Carcaj', quantity: 1 }, // In standardEquipment
          { name: 'Flechas (20)', quantity: 1} // In standardEquipment
      ]},
      { key: 'rogue_choice2_b', description: 'Una Espada Corta', items: [{ name: 'Espada Corta', quantity: 1 }] }, // In standardEquipment

      { key: 'rogue_choice3_instr', description: "Elige (a) un Paquete de Ladrón, (b) un Paquete de Dungeonero o (c) un Paquete de Explorador", isInstructional: true, items: [] },
      { key: 'rogue_choice3_a', description: "Un Paquete de Ladrón", items: [{ name: "Paquete de Ladrón", quantity: 1 }] }, // In standardEquipment
      { key: 'rogue_choice3_b', description: "Un Paquete de Dungeonero", items: [{ name: "Paquete de Dungeonero", quantity: 1 }] }, // In standardEquipment
      { key: 'rogue_choice3_c', description: "Un Paquete de Explorador", items: [{ name: "Paquete de Explorador", quantity: 1 }] }, // In standardEquipment
      
      { 
        key: 'rogue_fixed', 
        description: "Adicionalmente, recibes: Armadura de Cuero, Dos Dagas y Herramientas de Ladrón.", 
        items: [
          { name: 'Armadura de Cuero', quantity: 1 }, // In standardEquipment
          { name: 'Daga', quantity: 2 }, // In standardEquipment
          { name: "Herramientas de Ladrón", quantity: 1 } // In standardEquipment
        ],
      }
    ],
    classFeaturesLevel1: [
      { name: 'Pericia', description: 'En el nivel 1, elige dos de tus competencias de habilidad, o una de tus competencias de habilidad y tu competencia con herramientas de ladrón. Tu bonificador de competencia se duplica para cualquier prueba de característica que hagas que use cualquiera de las competencias elegidas.', source: 'Class' },
      { name: 'Ataque Furtivo', description: 'A partir del nivel 1, sabes cómo golpear sutilmente y explotar la distracción de un enemigo. Una vez por turno, puedes infligir 1d6 de daño adicional a una criatura que golpees con un ataque si tienes ventaja en la tirada de ataque. El ataque debe usar un arma sutil o a distancia.', source: 'Class' },
      { name: "Jerga de Ladrones", description: "Durante tu entrenamiento como pícaro aprendiste la jerga de ladrones, una mezcla secreta de dialecto, jerga y código que te permite ocultar mensajes en conversaciones aparentemente normales.", source: 'Class'}
    ],
    isCustom: false,
  },
];