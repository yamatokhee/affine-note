import { useMutation } from '@affine/admin/use-mutation';
import { useQuery } from '@affine/admin/use-query';
import { notify } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { UserFriendlyError } from '@affine/error';
import {
  appConfigQuery,
  type UpdateAppConfigInput,
  updateAppConfigMutation,
} from '@affine/graphql';
import { get, merge } from 'lodash-es';
import { useCallback, useState } from 'react';

export { type UpdateAppConfigInput };

export const useAppConfig = () => {
  const {
    data: { appConfig },
    mutate,
  } = useQuery({
    query: appConfigQuery,
  });

  const { trigger } = useMutation({
    mutation: updateAppConfigMutation,
  });

  const [updates, setUpdates] = useState<
    Record<string, { from: any; to: any }>
  >({});

  const save = useAsyncCallback(
    async (updates: UpdateAppConfigInput[]) => {
      try {
        const savedUpdates = await trigger({
          updates,
        });
        await mutate({ appConfig: merge({}, appConfig, savedUpdates) });
        setUpdates({});
        notify.success({
          title: 'Saved successfully',
          message: 'Runtime configurations have been saved successfully.',
        });
      } catch (e) {
        const error = UserFriendlyError.fromAny(e);
        notify.error({
          title: 'Failed to save',
          message: error.message,
        });
        console.error(e);
      }
    },
    [appConfig, mutate, trigger]
  );

  const update = useCallback(
    (module: string, field: string, value: any) => {
      setUpdates(prev => ({
        ...prev,
        [`${module}.${field}`]: {
          from: get(appConfig, `${module}.${field}`),
          to: value,
        },
      }));
    },
    [appConfig]
  );

  return {
    appConfig,
    update,
    save,
    updates,
  };
};
