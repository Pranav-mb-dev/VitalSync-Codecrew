'use client';

import { ThemeProvider } from '../src/context/ThemeContext';
import { AuthProvider } from '../src/context/AuthContext';
import { AlertProvider } from '../src/context/AlertContext';
import { VoiceProvider } from '../src/context/VoiceContext';
import VoiceNavigator from '../src/components/VoiceNavigator';
import '../src/i18n/index.js';

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
