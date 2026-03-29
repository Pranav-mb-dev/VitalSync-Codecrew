import '../../globals.css';
import '../i18n/index.js';
import { useRouter } from 'next/router';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { AlertProvider } from '../context/AlertContext';
import PatientLayout from './patient/layout';
import CaregiverLayout from './caregiver/layout';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname;

  const isPatientPage = path.startsWith('/patient/');
  const isCaregiverPage = path.startsWith('/caregiver/');

  const content = <Component {...pageProps} />;

  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          {isPatientPage ? (
            <PatientLayout>{content}</PatientLayout>
          ) : isCaregiverPage ? (
            <CaregiverLayout>{content}</CaregiverLayout>
          ) : (
            content
          )}
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
