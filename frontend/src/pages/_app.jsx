'use client';

import '../../globals.css';
import '../i18n/index.js';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { AlertProvider } from '../context/AlertContext';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
            <Component {...pageProps} />
          </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
