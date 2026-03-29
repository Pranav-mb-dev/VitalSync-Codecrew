'use client';

import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { AlertProvider } from '../context/AlertContext';
import { VoiceProvider } from '../context/VoiceContext';
import VoiceNavigator from '../components/VoiceNavigator';
import '../i18n/index.js';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <VoiceProvider>
            {children}
            <VoiceNavigator language="en-US" />
          </VoiceProvider>
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
