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

export interface AuthUser {
    name: string;
    email: string;
    avatar: string | null;
    admin: boolean;
}

export interface SharedData {
    name: string;
    tools: Tool[];
    categories: Record<ToolCategory, string>;
    binaries: Record<string, BinaryStatus>;
    maxUploadMb: number;
    auth: { user: AuthUser | null };
    flash: { error?: string | null; success?: string | null };
    [key: string]: unknown;
}

// --- Estadísticas (solo admin) ---

export interface StatsTotals {
    conversiones: number;
    exitos: number;
    archivos: number;
    bytes: number;
    duracionMs: number;
    usuariosActivos: number;
}

export interface StatsPoint {
    label: string;
    total: number;
    ok: number;
}

export interface StatsTool {
    tool: string;
    total: number;
    ok: number;
    bytes: number;
}

export interface StatsUser {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    admin: boolean;
    blocked: boolean;
    ultimoLogin: string | null;
    conversiones: number;
    exitos: number;
    archivos: number;
    bytes: number;
    ultimoUso: string | null;
}

export interface ToolPageProps {
    tool: Tool;
}
