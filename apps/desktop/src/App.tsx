import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamProvider } from './context/StreamContext';
import { VoiceProvider } from './context/VoiceContext';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './context/ToastContext';
import { ServerProvider } from './context/ServerContext';
import { LoginView } from './components/auth/LoginView';
import { ToastContainer } from './components/ui/ToastContainer';
import { TitleBar } from './components/layout/TitleBar';
import { ServerSidebar } from './components/sidebar/ServerSidebar';
import Dashboard from './components/Dashboard';
import bgImage from './assets/background.png';
import { BentoLayoutProvider } from "./context/BentoLayoutContext";

/**
 * Root application component that wraps the main interface with necessary context providers.
 * Sets up authentication, toasts, voice, chat, and stream contexts before rendering
 * the application content.
 *
 * @returns {JSX.Element} The rendered application component hierarchy.
 */
export default function App() {
    return (
        <div
            className="flex flex-col h-screen overflow-hidden relative"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Dark overlay for readability on top of background image */}
            <div className="absolute inset-0 bg-[#020208]/35 pointer-events-none z-0" />
            <TitleBar />
            <AuthProvider>
                <ToastProvider>
                    <ServerProvider>
                        <VoiceProvider>
                            <ChatProvider>
                                <StreamProvider>
                                    {/* --- Ajout du provider Bento ici --- */}
                                    <BentoLayoutProvider>
                                        <AppContent />
                                        <ToastContainer />
                                    </BentoLayoutProvider>
                                </StreamProvider>
                            </ChatProvider>
                        </VoiceProvider>
                    </ServerProvider>
                </ToastProvider>
            </AuthProvider>
        </div>
    );
}

/**
 * Renders the main content of the application based on the user's authentication state.
 * Displays the Dashboard for authenticated users, or the LoginView otherwise.
 *
 * @returns {JSX.Element} The conditional view component based on auth state.
 */
function AppContent() {
    const { isAuthenticated, login } = useAuth();
    if (!isAuthenticated) return <LoginView onLogin={login} />;
    return (
        <>
            <ServerSidebar />
            <Dashboard />
        </>
    );
}
