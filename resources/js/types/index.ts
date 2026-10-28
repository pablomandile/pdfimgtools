export type ToolCategory = 'organizar' | 'convertir' | 'editar' | 'seguridad' | 'optimizar';

export interface Tool {
    slug: string;
    name: string;
    description: string;
    category: ToolCategory;
    icon: string;
    component: string;
    mode: 'client' | 'server';
    requires?: 'gs' | 'qpdf' | 'soffice';
    accept: string;
    multiple: boolean;
}

export interface BinaryStatus {
    label: string;
    available: boolean;
    install: string;
}

export interface SharedData {
    name: string;
    tools: Tool[];
    categories: Record<ToolCategory, string>;
    binaries: Record<string, BinaryStatus>;
    maxUploadMb: number;
    [key: string]: unknown;
}

export interface ToolPageProps {
    tool: Tool;
}
