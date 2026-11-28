import React from 'react';
import { Store } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { BRANCH_OPTIONS } from '../../../shared/utils/devicePrefs';

const BranchSelectModal = ({ lang, onSelect }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold text-center mb-2">{t('selectBranch', lang)}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">{t('selectBranchSubtitle', lang)}</p>

            <div className="space-y-3">
                {BRANCH_OPTIONS.map(branch => (
                    <button
                        key={branch.id}
                        onClick={() => onSelect(branch.id)}
                        className="w-full py-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-bold text-lg active:bg-orange-100 flex items-center justify-center gap-2"
                    >
                        <Store size={20} />
                        {branch.label[lang] || branch.label.en}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

export default BranchSelectModal;
