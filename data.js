// Complete offline starter vocabulary. Keep IDs stable for saved progress.
// Fields: ID, English, Spanish, Spanish example, English example,
// optional note, optional English aliases, optional Spanish aliases.
export const UNITS = [
  { title: 'First words', subtitle: 'Polite everyday conversation', symbol: '✳', colour: 'peach' },
  { title: 'People', subtitle: 'Meet the people around you', symbol: '◒', colour: 'lavender' },
  { title: 'Numbers', subtitle: 'Count from one to ten', symbol: '№', colour: 'yellow' },
  { title: 'At home', subtitle: 'Things you see every day', symbol: '⌂', colour: 'mint' },
  { title: 'Food & drink', subtitle: 'Order and shop with confidence', symbol: '◌', colour: 'peach' },
  { title: 'Getting around', subtitle: 'Find your way in Spanish', symbol: '↗', colour: 'lavender' },
  { title: 'Time', subtitle: 'Make plans and talk about days', symbol: '◷', colour: 'yellow' },
  { title: 'Essential verbs', subtitle: 'The building blocks of sentences', symbol: '✺', colour: 'mint' },
  { title: 'Descriptions', subtitle: 'Describe people and things', symbol: '✦', colour: 'peach' },
  { title: 'Useful questions', subtitle: 'Start having real conversations', symbol: '?', colour: 'lavender' }
];

const ITEMS = [
  // First words
  ['hello', 'hello', 'hola', '¡Hola!', 'Hello!'],
  ['goodbye', 'goodbye', 'adiós', 'Adiós, María.', 'Goodbye, María.'],
  ['yes', 'yes', 'sí', 'Sí, gracias.', 'Yes, thank you.'],
  ['no', 'no', 'no', 'No, gracias.', 'No, thank you.'],
  ['thank-you', 'thank you', 'gracias', 'Muchas gracias.', 'Thank you very much.'],
  ['please', 'please', 'por favor', 'Agua, por favor.', 'Water, please.'],
  ['good-morning', 'good morning', 'buenos días', '¡Buenos días!', 'Good morning!'],
  ['good-night', 'good night', 'buenas noches', 'Buenas noches, papá.', 'Good night, Dad.', 'Also used as an evening greeting.'],
  ['sorry', "I'm sorry", 'lo siento', 'Lo siento mucho.', "I'm very sorry.", '', 'sorry'],
  ['excuse-me', 'excuse me', 'perdón', 'Perdón, ¿dónde está?', 'Excuse me, where is it?', 'Also means “sorry” in some situations.'],

  // People
  ['i', 'I', 'yo', 'Yo soy Ana.', 'I am Ana.'],
  ['you', 'you (informal, singular)', 'tú', 'Tú eres mi amigo.', 'You are my friend.', 'Used when addressing one person informally.', 'you'],
  ['he', 'he', 'él', 'Él es Juan.', 'He is Juan.'],
  ['she', 'she', 'ella', 'Ella es Ana.', 'She is Ana.'],
  ['we', 'we (masculine or mixed group)', 'nosotros', 'Nosotros estamos aquí.', 'We are here.', 'The feminine form is “nosotras”.', 'we'],
  ['they', 'they (masculine or mixed group)', 'ellos', 'Ellos están aquí.', 'They are here.', 'The feminine form is “ellas”.', 'they'],
  ['man', 'man', 'el hombre', 'El hombre está aquí.', 'The man is here.'],
  ['woman', 'woman', 'la mujer', 'La mujer está aquí.', 'The woman is here.'],
  ['friend', 'friend (male)', 'el amigo', 'Él es mi amigo.', 'He is my friend.', 'For a female friend, use “la amiga”.', 'friend'],
  ['family', 'family', 'la familia', 'Mi familia es grande.', 'My family is big.'],

  // Numbers
  ['one', 'one', 'uno', 'Uno, dos, tres.', 'One, two, three.', 'Often becomes “un” before a masculine singular noun.'],
  ['two', 'two', 'dos', 'Tengo dos libros.', 'I have two books.'],
  ['three', 'three', 'tres', 'Hay tres mesas.', 'There are three tables.'],
  ['four', 'four', 'cuatro', 'Son las cuatro.', "It's four o'clock."],
  ['five', 'five', 'cinco', 'Tengo cinco euros.', 'I have five euros.'],
  ['six', 'six', 'seis', 'Son las seis.', "It's six o'clock."],
  ['seven', 'seven', 'siete', 'Son las siete.', "It's seven o'clock."],
  ['eight', 'eight', 'ocho', 'Ocho días.', 'Eight days.'],
  ['nine', 'nine', 'nueve', 'Nueve personas.', 'Nine people.'],
  ['ten', 'ten', 'diez', 'Diez minutos.', 'Ten minutes.'],

  // At home
  ['water', 'water', 'el agua', 'Quiero agua.', 'I want water.', '“Agua” is feminine but uses “el” in the singular.'],
  ['food', 'food', 'la comida', 'La comida está buena.', 'The food is good.'],
  ['house', 'house', 'la casa', 'La casa es grande.', 'The house is big.'],
  ['book', 'book', 'el libro', 'El libro es nuevo.', 'The book is new.'],
  ['table', 'table', 'la mesa', 'La mesa es pequeña.', 'The table is small.'],
  ['chair', 'chair', 'la silla', 'La silla está aquí.', 'The chair is here.'],
  ['door', 'door', 'la puerta', 'La puerta está abierta.', 'The door is open.'],
  ['telephone', 'phone', 'el teléfono', 'Mi teléfono está aquí.', 'My phone is here.', '', 'telephone'],
  ['bag', 'bag', 'la bolsa', 'La bolsa es grande.', 'The bag is big.'],
  ['money', 'money', 'el dinero', 'Tengo dinero.', 'I have money.'],
  // Food & drink
  ['bread', 'bread', 'el pan', 'Quiero pan.', 'I want bread.'],
  ['coffee', 'coffee', 'el café', 'Un café, por favor.', 'A coffee, please.'],
  ['tea', 'tea', 'el té', 'Tomo té.', 'I drink tea.'],
  ['milk', 'milk', 'la leche', 'Café con leche.', 'Coffee with milk.'],
  ['apple', 'apple', 'la manzana', 'Una manzana roja.', 'A red apple.'],
  ['rice', 'rice', 'el arroz', 'Como arroz.', 'I eat rice.'],
  ['egg', 'egg', 'el huevo', 'Quiero un huevo.', 'I want an egg.'],
  ['cheese', 'cheese', 'el queso', 'Pan con queso.', 'Bread with cheese.'],
  ['chicken', 'chicken', 'el pollo', 'Como pollo.', 'I eat chicken.'],
  ['juice', 'juice', 'el zumo', 'Zumo de naranja.', 'Orange juice.', 'Common in Spain; “jugo” is common in Latin America.', '', 'el jugo'],

  // Getting around
  ['street', 'street', 'la calle', 'La calle es larga.', 'The street is long.'],
  ['train', 'train', 'el tren', 'El tren llega hoy.', 'The train arrives today.'],
  ['station', 'station', 'la estación', '¿Dónde está la estación?', 'Where is the station?'],
  ['airport', 'airport', 'el aeropuerto', 'Voy al aeropuerto.', "I'm going to the airport."],
  ['city', 'city', 'la ciudad', 'La ciudad es bonita.', 'The city is pretty.'],
  ['country', 'country', 'el país', 'España es un país.', 'Spain is a country.'],
  ['bathroom', 'bathroom', 'el baño', '¿Dónde está el baño?', 'Where is the bathroom?', '', 'toilet|restroom'],
  ['hotel', 'hotel', 'el hotel', 'El hotel está cerca.', 'The hotel is nearby.'],
  ['shop', 'shop', 'la tienda', 'La tienda está abierta.', 'The shop is open.', '', 'store'],
  ['restaurant', 'restaurant', 'el restaurante', 'El restaurante está aquí.', 'The restaurant is here.'],

  // Time
  ['today', 'today', 'hoy', 'Hoy es lunes.', 'Today is Monday.'],
  ['tomorrow', 'tomorrow', 'mañana', 'Hasta mañana.', 'See you tomorrow.'],
  ['yesterday', 'yesterday', 'ayer', 'Ayer fue domingo.', 'Yesterday was Sunday.'],
  ['now', 'now', 'ahora', 'Vamos ahora.', "Let's go now."],
  ['later', 'later', 'después', 'Hablamos después.', "We'll talk later.", '', 'más tarde'],
  ['day', 'day', 'el día', 'Es un buen día.', "It's a good day.", '“Día” is masculine despite ending in -a.'],
  ['night', 'night', 'la noche', 'Por la noche.', 'At night.'],
  ['morning', 'morning', 'la mañana', 'Por la mañana.', 'In the morning.', 'Also “tomorrow” when used without an article.'],
  ['week', 'week', 'la semana', 'Esta semana.', 'This week.'],
  ['year', 'year', 'el año', 'Un año más.', 'One more year.'],

  // Essential verbs
  ['to-be-identity', 'to be (identity or defining trait)', 'ser', 'Soy estudiante.', 'I am a student.', '“Ser” is used for identity, origin and defining traits.', 'to be|be'],
  ['to-be-state', 'to be (state or location)', 'estar', 'Estoy aquí.', 'I am here.', '“Estar” is used for location and many temporary states.', 'to be|be'],
  ['to-have', 'to have', 'tener', 'Tengo una pregunta.', 'I have a question.', '', 'have'],
  ['to-go', 'to go', 'ir', 'Voy a casa.', "I'm going home.", '', 'go'],
  ['to-do', 'to do / make', 'hacer', 'Quiero hacer café.', 'I want to make coffee.', '', 'do|make|to do|to make'],
  ['to-want', 'to want', 'querer', 'Quiero agua.', 'I want water.', '', 'want'],
  ['to-be-able', 'to be able to', 'poder', 'Puedo hablar español.', 'I can speak Spanish.', '', 'can|be able to'],
  ['to-eat', 'to eat', 'comer', 'Quiero comer.', 'I want to eat.', '', 'eat'],
  ['to-drink', 'to drink', 'beber', 'Quiero beber agua.', 'I want to drink water.', '', 'drink'],
  ['to-speak', 'to speak', 'hablar', 'Hablo español.', 'I speak Spanish.', '', 'speak|talk|to talk'],

  // Descriptions
  ['big', 'big', 'grande', 'Una casa grande.', 'A big house.', '', 'large'],
  ['small', 'small (masculine form)', 'pequeño', 'Un perro pequeño.', 'A small dog.', 'Use “pequeña” with feminine nouns.', 'small'],
  ['good', 'good (masculine form)', 'bueno', 'Es un libro bueno.', 'It is a good book.', '“Buena” is feminine; “buen” comes before certain masculine nouns.', 'good'],
  ['bad', 'bad (masculine form)', 'malo', 'Es un día malo.', 'It is a bad day.', '“Mala” is the feminine form.', 'bad'],
  ['hot', 'hot', 'caliente', 'El té está caliente.', 'The tea is hot.', 'Usually used for something hot to the touch.'],
  ['cold', 'cold (masculine form)', 'frío', 'El agua está fría.', 'The water is cold.', '“Fría” is the feminine form.', 'cold'],
  ['happy', 'happy', 'feliz', 'Estoy feliz.', 'I am happy.'],
  ['tired', 'tired (masculine form)', 'cansado', 'Estoy cansado.', 'I am tired.', '“Cansada” is the feminine form.', 'tired'],
  ['new', 'new (masculine form)', 'nuevo', 'Un coche nuevo.', 'A new car.', '“Nueva” is the feminine form.', 'new'],
  ['old', 'old (masculine form)', 'viejo', 'Un libro viejo.', 'An old book.', '“Vieja” is the feminine form.', 'old'],

  // Useful questions
  ['what', 'what?', '¿qué?', '¿Qué es eso?', 'What is that?', 'Remember the accent in a question.', 'what'],
  ['where', 'where?', '¿dónde?', '¿Dónde está el baño?', 'Where is the bathroom?', '', 'where'],
  ['who', 'who?', '¿quién?', '¿Quién es?', 'Who is it?', '', 'who'],
  ['when', 'when?', '¿cuándo?', '¿Cuándo vamos?', 'When are we going?', '', 'when'],
  ['how', 'how?', '¿cómo?', '¿Cómo estás?', 'How are you?', '', 'how'],
  ['why', 'why?', '¿por qué?', '¿Por qué no?', 'Why not?', 'Two words, with an accent on “qué”.', 'why'],
  ['how-much', 'how much?', '¿cuánto?', '¿Cuánto cuesta?', 'How much does it cost?', '“Cuánta” agrees with feminine nouns.', 'how much'],
  ['i-dont-understand', "I don't understand", 'no entiendo', 'Lo siento, no entiendo.', "Sorry, I don't understand.", '', 'i do not understand'],
  ['i-need', 'I need', 'necesito', 'Necesito ayuda.', 'I need help.'],
  ['help', 'help!', '¡ayuda!', '¡Ayuda, por favor!', 'Help, please!', '', 'help']
];

export const WORDS = ITEMS.map((item, index) => {
  const [id, en, es, exampleEs, exampleEn, note = '', altEn = '', altEs = ''] = item;
  return {
    id, en, es, exampleEs, exampleEn, note,
    englishAliases: altEn ? altEn.split('|') : [],
    spanishAliases: altEs ? altEs.split('|') : [],
    unit: Math.floor(index / 10)
  };
});

export const WORD_BY_ID = Object.fromEntries(WORDS.map(word => [word.id, word]));
