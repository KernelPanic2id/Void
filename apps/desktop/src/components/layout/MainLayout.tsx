import Props from "../../models/props.model.ts";

export const MainLayout = ({ sidebar, children, sidebarFooter, channelName }: Props & { channelName?: string }) => {
    return (
        <div className="flex h-screen w-full bg-[#313338] text-[#dbdee1] select-none overflow-hidden">
            {/* Barre des serveurs (Icons) */}
            <nav className="w-18 bg-[#1e1f22] flex flex-col items-center py-3 gap-3 border-r border-black/30">
                <div className="w-12 h-12 bg-[#5865f2] rounded-2xl flex items-center justify-center text-white font-bold hover:rounded-xl transition-all duration-200 cursor-pointer hover:shadow-[0_0_12px_rgba(88,101,242,0.5)]">
                    SOS
                </div>
                <div className="w-8 h-0.5 bg-[#3f4147] rounded" />
                <div className="w-12 h-12 bg-[#2b2d31] rounded-[20px] flex items-center justify-center text-gray-300 hover:bg-[#248046] hover:text-white hover:rounded-xl transition-all duration-200 cursor-pointer">
                    +
                </div>
            </nav>

            {/* Sidebar des Salons + UserBar en bas */}
            <aside className="w-60 bg-[#2b2d31] flex flex-col border-r border-black/20 min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    {sidebar}
                </div>
                {sidebarFooter && (
                    <div className="flex-shrink-0">
                        {sidebarFooter}
                    </div>
                )}
            </aside>

            {/* Zone Principale */}
            <main className="flex-1 flex flex-col bg-[#313338] min-w-0">
                <header className="h-12 flex items-center px-4 border-b border-[#1f2124] shadow-sm bg-[#313338] flex-shrink-0">
                    <span className="text-gray-400 mr-2 font-bold text-xl">#</span>
                    <h1 className="font-semibold text-white text-[15px]">{channelName || 'vocal-general'}</h1>
                </header>

                <div className="flex-1 min-h-0 relative">
                    {children}
                </div>
            </main>
        </div>
    );
};
