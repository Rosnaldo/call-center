import { useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';

export function useReset<T>(
  key: string,
  transform?: (oldData: T | undefined) => T
) {
  const queryClient = useQueryClient();

  const reset = () => {
    const scrollPos = window.scrollY;

    queryClient.setQueryData<T | undefined>([key], oldData => {
        if (!transform) return oldData;

        const newData = transform(oldData);

        // só atualiza se mudou de fato
        if (!_.isEqual(oldData, newData)) {
            return newData;
        }

        return oldData; // mantém referência para evitar re-render
    });

    queryClient.invalidateQueries({ queryKey: [key], exact: true });

    window.scrollTo(0, scrollPos);
  };

  return reset;
}