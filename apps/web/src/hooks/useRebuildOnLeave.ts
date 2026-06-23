import { useEffect } from 'react';
import { DailyService } from '../services/daily.ts';

export function useRebuildOnLeave(): void {
  useEffect(() => {
    const service = DailyService.getInstance();

    const onLocalUserLeft = (event?: { participant?: { local?: boolean } }) => {
      if (event?.participant?.local) {
        service.rebuild();
      }
    };

    service.callObject.on('participant-left', onLocalUserLeft);

    service.onCallObjectChanged((callObject) => {
      callObject.on('participant-left', onLocalUserLeft);
    });

    return () => {
      service.callObject.off('participant-left', onLocalUserLeft);
    };
  }, []);
}
