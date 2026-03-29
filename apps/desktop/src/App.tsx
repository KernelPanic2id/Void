import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamProvider } from './context/StreamContext';
import { VoiceProvider } from './context/VoiceContext';
import { ToastProvider } from './context/ToastContext';
import { LoginView } from './components/auth/LoginView';
import { ToastContainer } from './components/ui/ToastContainer';
import Dashboard from './components/Dashboard';

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <VoiceProvider>
                    <StreamProvider>
                        <AppContent />
                        <ToastContainer />
                    </StreamProvider>
                </VoiceProvider>
            </ToastProvider>
        </AuthProvider>
    );
}

function AppContent() {
    const { isAuthenticated, login } = useAuth();
    return isAuthenticated ? <Dashboard /> : <LoginView onLogin={login} />;
}
