import {ReactNode} from "react";

export default interface Props {
    sidebar: ReactNode;
    children: ReactNode;
    rightPanel?: ReactNode;
    footer?: ReactNode;
    sidebarFooter?: ReactNode;
}