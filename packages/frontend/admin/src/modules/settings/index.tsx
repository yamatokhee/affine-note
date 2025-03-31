import { Button } from '@affine/admin/components/ui/button';
import { ScrollArea } from '@affine/admin/components/ui/scroll-area';
import { Separator } from '@affine/admin/components/ui/separator';
import { get } from 'lodash-es';
import { CheckIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Header } from '../header';
import { useNav } from '../nav/context';
import {
  ALL_CONFIG,
  ALL_CONFIGURABLE_MODULES,
  type ConfigDescriptor,
} from './config';
import { ConfigInput } from './config-input';
import { ConfirmChanges } from './confirm-changes';
import { RuntimeSettingRow } from './runtime-setting-row';
import { useAppConfig } from './use-app-config';

export function SettingsPage() {
  const { appConfig, update, save, updates } = useAppConfig();
  const [open, setOpen] = useState(false);
  const onOpen = useCallback(() => setOpen(true), [setOpen]);

  const disableSave = Object.keys(updates).length === 0;

  const saveChanges = useCallback(() => {
    if (disableSave) {
      return;
    }
    save(
      Object.entries(updates).map(([key, { to }]) => {
        const splitAt = key.indexOf('.');
        const [module, field] = [key.slice(0, splitAt), key.slice(splitAt + 1)];
        return {
          module,
          key: field,
          value: to,
        };
      })
    );
    setOpen(false);
  }, [save, disableSave, updates]);

  return (
    <div className=" h-screen flex-1 flex-col flex">
      <Header
        title="Settings"
        endFix={
          <Button
            type="submit"
            size="icon"
            className="w-7 h-7"
            variant="ghost"
            onClick={onOpen}
            disabled={disableSave}
          >
            <CheckIcon size={20} />
          </Button>
        }
      />
      <AdminPanel onUpdate={update} appConfig={appConfig} />
      <ConfirmChanges
        updates={updates}
        open={open}
        onOpenChange={setOpen}
        onConfirm={saveChanges}
      />
    </div>
  );
}

export const AdminPanel = ({
  appConfig,
  onUpdate,
}: {
  appConfig: Record<string, any>;
  onUpdate: (module: string, field: string, value: any) => void;
}) => {
  const { currentModule } = useNav();

  return (
    <ScrollArea>
      <div className="flex flex-col h-full gap-3 py-5 px-6 w-full max-w-[800px] mx-auto">
        {ALL_CONFIGURABLE_MODULES.filter(
          module => module === currentModule
        ).map(module => {
          const fields = Object.keys(ALL_CONFIG[module]);
          return (
            <div
              className="flex flex-col gap-5"
              id={`config-module-${module}`}
              key={module}
            >
              <div className="text-xl font-semibold">{module}</div>
              {fields.map((field, index) => {
                // @ts-expect-error allow
                const { desc, type } = ALL_CONFIG[module][
                  field
                ] as ConfigDescriptor;

                return (
                  <div key={field} className="flex flex-col gap-10">
                    {index !== 0 && <Separator />}
                    <RuntimeSettingRow
                      key={field}
                      id={field}
                      description={desc}
                      orientation={
                        type === 'Boolean' ? 'horizontal' : 'vertical'
                      }
                    >
                      <ConfigInput
                        module={module}
                        field={field}
                        type={type}
                        defaultValue={get(appConfig[module], field)}
                        onChange={onUpdate}
                      />
                    </RuntimeSettingRow>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export { SettingsPage as Component };
