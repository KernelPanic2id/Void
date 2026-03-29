import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamProvider } from './context/StreamContext';
import { VoiceProvider } from './context/VoiceContext';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './context/ToastContext';
import { LoginView } from './components/auth/LoginView';
import { ToastContainer } from './components/ui/ToastContainer';
import Dashboard from './components/Dashboard';

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <VoiceProvider>
                    <ChatProvider>
                        <StreamProvider>
                            <AppContent />
                            <ToastContainer />
                        </StreamProvider>
                    </ChatProvider>
                </VoiceProvider>
            </ToastProvider>
        </AuthProvider>
    );
}

function AppContent() {
    const { isAuthenticated, login } = useAuth();
    return isAuthenticated ? <Dashboard /> : <LoginView onLogin={login} />;
}
