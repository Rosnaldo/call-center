import { useEffect } from 'react';
import { useDaily } from '@daily-co/daily-react';
import { useDailyStore } from '../states/daily/store.ts';

export const DailyInit: React.FC = () => {
  const daily = useDaily();
  const initDaily = useDailyStore(s => s.initDaily);

  useEffect(() => {
    initDaily(daily);
  }, [daily, initDaily]);

  return null;
};
