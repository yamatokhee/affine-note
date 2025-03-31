import { type ReactNode } from 'react';

export const RuntimeSettingRow = ({
  id,
  description,
  orientation = 'horizontal',
  children,
}: {
  id: string;
  description: string;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
}) => {
  return (
    <div
      className={`flex justify-between flex-grow space-y-[10px] gap-5 ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}`}
      id={id}
    >
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold">{description}</div>
        <div className="">
          <code className="text-xs  bg-zinc-100 text-gray-500 px-[4px] py-[2px] rounded">
            {id}
          </code>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 mr-1">{children}</div>
    </div>
  );
};
