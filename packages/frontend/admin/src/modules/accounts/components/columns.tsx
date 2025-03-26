import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@affine/admin/components/ui/avatar';
import type { UserType } from '@affine/graphql';
import { FeatureType } from '@affine/graphql';
import { AccountIcon, LockIcon, UnlockIcon } from '@blocksuite/icons/rc';
import type { ColumnDef } from '@tanstack/react-table';
import { cssVarV2 } from '@toeverything/theme/v2';
import { MailIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Checkbox } from '../../../components/ui/checkbox';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

const StatusItem = ({
  condition,
  IconTrue,
  IconFalse,
  textTrue,
  textFalse,
}: {
  condition: boolean | null;
  IconTrue: ReactNode;
  IconFalse: ReactNode;
  textTrue: string;
  textFalse: string;
}) => (
  <div
    className="flex gap-1 items-center"
    style={{
      color: condition ? cssVarV2('text/secondary') : cssVarV2('status/error'),
    }}
  >
    {condition ? (
      <>
        {IconTrue}
        {textTrue}
      </>
    ) : (
      <>
        {IconFalse}
        {textFalse}
      </>
    )}
  </div>
);

export const columns: ColumnDef<UserType>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'info',
    header: ({ column }) => (
      <DataTableColumnHeader className="text-xs" column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex gap-4 items-center max-w-[50vw] overflow-hidden">
        <Avatar className="w-10 h-10">
          <AvatarImage src={row.original.avatarUrl ?? undefined} />
          <AvatarFallback>
            <AccountIcon fontSize={20} />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 max-w-full overflow-hidden">
          <div className="text-sm font-medium max-w-full overflow-hidden gap-[6px]">
            <span>{row.original.name}</span>
            {row.original.features.includes(FeatureType.Admin) && (
              <span
                className="ml-2 rounded px-2 py-0.5 text-xs h-5 border text-center inline-flex items-center font-normal"
                style={{
                  borderRadius: '4px',
                  backgroundColor: cssVarV2('chip/label/blue'),
                  borderColor: cssVarV2('layer/insideBorder/border'),
                }}
              >
                Admin
              </span>
            )}
            {row.original.disabled && (
              <span
                className="ml-2 rounded px-2 py-0.5 text-xs h-5 border"
                style={{
                  borderRadius: '4px',
                  backgroundColor: cssVarV2('chip/label/white'),
                  borderColor: cssVarV2('layer/insideBorder/border'),
                }}
              >
                Disabled
              </span>
            )}
          </div>
          <div
            className="text-xs font-medium max-w-full overflow-hidden"
            style={{
              color: cssVarV2('text/secondary'),
            }}
          >
            {row.original.email}
          </div>
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'property',
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-xs max-md:hidden"
        column={column}
        title="UUID"
      />
    ),
    cell: ({ row: { original: user } }) => (
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-2 text-xs max-md:hidden">
          <div className="flex justify-start">{user.id}</div>
          <div className="flex gap-3 items-center justify-start">
            <StatusItem
              condition={user.hasPassword}
              IconTrue={
                <LockIcon
                  fontSize={16}
                  color={cssVarV2('selfhost/icon/tertiary')}
                />
              }
              IconFalse={<UnlockIcon fontSize={16} />}
              textTrue="Password Set"
              textFalse="No Password"
            />
            <StatusItem
              condition={user.emailVerified}
              IconTrue={
                <MailIcon
                  size={16}
                  color={cssVarV2('selfhost/icon/tertiary')}
                />
              }
              IconFalse={<MailIcon size={16} />}
              textTrue="Email Verified"
              textFalse="Email Not Verified"
            />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-xs"
        column={column}
        title="Actions"
      />
    ),
    cell: ({ row: { original: user } }) => <DataTableRowActions user={user} />,
  },
];
