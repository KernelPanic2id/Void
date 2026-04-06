import {ReactNode} from "react";

export default interface Props {
    sidebar: ReactNode;
    children: ReactNode;
    rightPanel?: ReactNode;
    footer?: ReactNode;
    sidebarFooter?: ReactNode;
    isInVoice?: boolean;
    sidebarWidth?: number;
    sidebarHeight?: number;
    onResizeRight?: (e: React.MouseEvent) => void;
    onResizeBottom?: (e: React.MouseEvent) => void;
    onResizeCorner?: (e: React.MouseEvent) => void;
    sidebarPosition?: { x: number; y: number };
    onSidebarDrag?: (e: React.MouseEvent) => void;
}