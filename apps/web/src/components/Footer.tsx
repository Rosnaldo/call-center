/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 text-center text-xs text-slate-400 font-sans">
      <p className="flex items-center justify-center gap-1">
        Made for Google AI Studio App Developer workflows
        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
      </p>
    </footer>
  );
};
