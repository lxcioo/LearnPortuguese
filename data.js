export const courseData = {
  id: 'course_1',
  title: 'Portugiesisch A1',
  lessons: [
    {
      id: 'l1',
      title: 'Begrüßung',
      icon: 'star', 
      color: '#58cc02',
      exercises: [
        {
          id: 'ex1',
          type: 'translate_to_pt', // Deutsch -> Portugiesisch
          question: 'Hallo, wie geht es dir?',
          correctAnswer: 'Olá, como estás?',
          alternativeAnswers: ['Olá como estás', 'Como estás'],
        },
        {
          id: 'ex2',
          type: 'multiple_choice',
          question: 'Was bedeutet "Obrigado"?',
          options: ['Hallo', 'Danke', 'Tschüss', 'Bitte'],
          correctAnswer: 'Danke',
          correctAnswerIndex: 1, 
          optionsLanguage: 'de-DE'
        },
      ],
    },
    {
      id: 'l2',
      title: 'Essen & Trinken',
      icon: 'cafe',
      color: '#ce82ff',
      exercises: [
        {
          id: 'ex3',
          type: 'translate_to_pt',
          question: 'Ich trinke Wasser.',
          correctAnswer: 'Eu bebo água.',
          alternativeAnswers: ['Bebo água'],
        },
        // --- NEU: Portugiesisch -> Deutsch ---
        {
          id: 'ex4',
          type: 'translate_to_de', // NEUER TYP
          question: 'O pão é bom.',  // Portugiesische Frage
          correctAnswer: 'Das Brot ist gut.', // Deutsche Antwort
          alternativeAnswers: ['Brot ist gut'],
          optionsLanguage: 'de-DE'
        },
      ],
    },
  ],
};