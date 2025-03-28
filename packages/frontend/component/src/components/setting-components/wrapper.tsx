import clsx from 'clsx';
import type { PropsWithChildren, ReactNode } from 'react';

import { wrapper, wrapperDisabled } from './share.css';

interface SettingWrapperProps {
  title?: ReactNode;
  disabled?: boolean;
}

export const SettingWrapper = ({
  title,
  children,
  disabled,
}: PropsWithChildren<SettingWrapperProps>) => {
  return (
    <div className={clsx(wrapper, disabled && wrapperDisabled)}>
      {title ? <div className="title">{title}</div> : null}
      {children}
    </div>
  );
};
