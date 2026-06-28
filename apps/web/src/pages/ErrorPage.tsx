import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export function ErrorPage() {
    const { t } = useTranslation();
    const [params] = useSearchParams();
    const message = params.get('message') ?? t('error.unexpectedError');

    return (
        <div className="flex flex-col min-h-screen font-sans items-center justify-center bg-[var(--bg-brand-canvas)]">
            <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/50 max-w-sm shadow-sm">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-slate-800">{t('error.initError')}</h3>
                <p className="text-xs text-slate-500 mt-2">{message}</p>
                <button
                    onClick={() => window.location.replace('/')}
                    className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
                >
                    {t('error.tryAgain')}
                </button>
            </div>
        </div>
    );
}
