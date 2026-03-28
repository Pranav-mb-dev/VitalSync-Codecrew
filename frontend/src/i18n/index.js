import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ta from './ta.json';
import hi from './hi.json';
import kn from './kn.json';
import te from './te.json';

const resources = { en: { translation: en }, ta: { translation: ta }, hi: { translation: hi }, kn: { translation: kn }, te: { translation: te } };
const initialLanguage = typeof window === 'undefined' ? 'en' : localStorage.getItem('vs-lang') || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
