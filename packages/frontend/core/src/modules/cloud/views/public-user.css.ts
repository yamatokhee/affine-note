import { style } from '@vanilla-extract/css';

export const publicUserLabel = style({
  fontSize: 'inherit',
});

export const publicUserLabelLoading = style([
  publicUserLabel,
  {
    opacity: 0.5,
  },
]);

export const publicUserLabelRemoved = style([
  publicUserLabel,
  {
    opacity: 0.5,
    textDecoration: 'line-through',
  },
]);
