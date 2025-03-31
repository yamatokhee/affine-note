import { Input } from '@affine/admin/components/ui/input';
import { Switch } from '@affine/admin/components/ui/switch';
import { useCallback, useState } from 'react';

import { Textarea } from '../../components/ui/textarea';
import { isEqual } from './utils';

interface ConfigInputProps {
  module: string;
  field: string;
  type: string;
  defaultValue: any;
  onChange: (module: string, field: string, value: any) => void;
}

const Inputs: Record<
  string,
  React.ComponentType<{
    defaultValue: any;
    onChange: (value?: any) => void;
  }>
> = {
  Boolean: function SwitchInput({ defaultValue, onChange }) {
    const handleSwitchChange = (checked: boolean) => {
      onChange(checked);
    };

    return (
      <Switch
        defaultChecked={defaultValue}
        onCheckedChange={handleSwitchChange}
      />
    );
  },
  String: function StringInput({ defaultValue, onChange }) {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <Input
        type="text"
        minLength={1}
        defaultValue={defaultValue}
        onChange={handleInputChange}
      />
    );
  },
  Number: function NumberInput({ defaultValue, onChange }) {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value));
    };

    return (
      <Input
        type="number"
        defaultValue={defaultValue}
        onChange={handleInputChange}
      />
    );
  },
  JSON: function ObjectInput({ defaultValue, onChange }) {
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
        const value = JSON.parse(e.target.value);
        onChange(value);
      } catch {}
    };

    return (
      <Textarea
        defaultValue={JSON.stringify(defaultValue)}
        onChange={handleInputChange}
        className="w-full"
      />
    );
  },
};

export const ConfigInput = ({
  module,
  field,
  type,
  defaultValue,
  onChange,
}: ConfigInputProps) => {
  const [value, setValue] = useState(defaultValue);

  const onValueChange = useCallback(
    (value?: any) => {
      onChange(module, field, value);
      setValue(value);
    },
    [module, field, onChange]
  );

  const Input = Inputs[type] ?? Inputs.JSON;

  const isValueEqual = isEqual(value, defaultValue);

  return (
    <div className="flex flex-col items-end gap-2 w-full">
      <Input defaultValue={defaultValue} onChange={onValueChange} />
      <div
        className="w-full break-words"
        style={{
          opacity: isValueEqual ? 0 : 1,
          height: isValueEqual ? 0 : 'auto',
        }}
      >
        <span
          className="line-through"
          style={{
            color: 'rgba(198, 34, 34, 1)',
            backgroundColor: 'rgba(254, 213, 213, 1)',
          }}
        >
          {JSON.stringify(defaultValue)}
        </span>{' '}
        =&gt;{' '}
        <span
          style={{
            color: 'rgba(20, 147, 67, 1)',
            backgroundColor: 'rgba(225, 250, 177, 1)',
          }}
        >
          {JSON.stringify(value)}
        </span>
      </div>
    </div>
  );
};
