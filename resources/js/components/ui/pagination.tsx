import { Link } from '@inertiajs/react';

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface PaginationData {
    links: LinkProps[];
    from: number;
    to: number;
    total: number;
}

interface PaginationProps {
    meta: PaginationData;
}

export const TablePagination = ({ meta }: PaginationProps) => {
    if (!meta.links?.length) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2 text-sm text-gray-700 md:flex-row md:items-center md:justify-between">
            <p>
                Showing <strong>{meta.from ?? 0}</strong> to <strong>{meta.to ?? 0}</strong> of{' '}
                <strong>{meta.total ?? 0}</strong> entries
            </p>

            <div className="flex flex-wrap gap-2">
                {meta.links.map((link, index) => (
                    <Link
                        className={`min-w-[2.5rem] rounded border px-3 py-1 text-center transition ${
                            link.active ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        href={link.url || '#'}
                        key={index}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
        </div>
    );
};
