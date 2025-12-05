import AppLogoIcon from './app-logo-icon';

export default function AppLogo({ position }: { position: 'left' | 'right' }) {
    return (
        <div className={`w-full flex items-center justify-center group-data-[collapsible=icon]:w-auto ${position === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md overflow-hidden shrink-0">
                <AppLogoIcon className="size-8 object-contain" />
            </div>
            <div className={`grid flex-1 truncate text-sm leading-none font-semibold group-data-[collapsible=icon]:hidden ${position === 'right' ? 'mr-1 text-right' : 'ml-1 text-left'}`}>
                ESSU HRMS
            </div>
        </div>
    );
}
