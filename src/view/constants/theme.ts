/**
 * Eine zentrale Sammlung aller Farben der App.
 * Ersetzt die lokalen "themeColors" Objekte in den Screens.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

const common = {
  primary: '#58cc02',   // Das typische Grün
  wrong: '#ea2b2b',     // Rot für Fehler
  gold: '#FFD700',      // Sterne/Trophy
  blue: '#1cb0f6',      // Info/Speaker
};

export const Colors = {
  light: {
    ...common,
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    
    // UI Spezifisch
    card: '#f9f9f9',
    cardBorder: '#f0f0f0',
    border: '#e5e5e5',
    subText: '#777',
    
    // Practice & Lesson
    sectionTitle: '#444',
    mistakeBtnBg: '#fff',
    mistakeBtnBorder: '#ffdfe0',
    countBtnBg: '#fff',
    countBtnSelectedBg: '#ddf4ff',
    inputBg: '#f7f7f7',
    optionSelectedBg: '#ddf4ff',
    speakerBg: '#ddf4ff',
    progressBarBg: '#e5e5e5',
    feedbackSuccessBg: '#d7ffb8',
    feedbackErrorBg: '#ffdfe0',
    feedbackText: '#3c3c3c',
  },
  dark: {
    ...common,
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    // UI Spezifisch
    card: '#232526',
    cardBorder: '#333',
    border: '#333',
    subText: '#9BA1A6',

    // Practice & Lesson
    sectionTitle: '#ccc',
    mistakeBtnBg: '#2C1A1A',
    mistakeBtnBorder: '#5c2b2b',
    countBtnBg: '#232526',
    countBtnSelectedBg: '#1a3b1a',
    inputBg: '#232526',
    optionSelectedBg: '#1a3b1a',
    speakerBg: '#232526',
    progressBarBg: '#333',
    feedbackSuccessBg: '#1e3a1e',
    feedbackErrorBg: '#3a1e1e',
    feedbackText: '#ECEDEE',
  },
};