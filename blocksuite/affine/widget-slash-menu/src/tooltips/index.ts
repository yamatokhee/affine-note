import type { SlashMenuTooltip } from '../types';
import { CopyTooltip } from './copy';
import { DeleteTooltip } from './delete';
import { EdgelessTooltip } from './edgeless';
import { FigmaTooltip } from './figma';
import { GithubRepoTooltip } from './github-repo';
import { LinearTooltip } from './linear';
import { LinkDocTooltip } from './link-doc';
import { MoveDownTooltip } from './move-down';
import { MoveUpTooltip } from './move-up';
import { NewDocTooltip } from './new-doc';
import { NowTooltip } from './now';
import { TodayTooltip } from './today';
import { TomorrowTooltip } from './tomorrow';
import { TweetTooltip } from './tweet';
import { YesterdayTooltip } from './yesterday';
import { YoutubeVideoTooltip } from './youtube-video';

export const slashMenuToolTips: Record<string, SlashMenuTooltip> = {
  'New Doc': {
    figure: NewDocTooltip,
    caption: 'New Doc',
  },

  'Linked Doc': {
    figure: LinkDocTooltip,
    caption: 'Link Doc',
  },

  Github: {
    figure: GithubRepoTooltip,
    caption: 'GitHub Repo',
  },

  YouTube: {
    figure: YoutubeVideoTooltip,
    caption: 'YouTube Video',
  },

  'X (Twitter)': {
    figure: TweetTooltip,
    caption: 'Tweet',
  },

  Figma: {
    figure: FigmaTooltip,
    caption: 'Figma',
  },

  Linear: {
    figure: LinearTooltip,
    caption: 'Linear',
  },

  Today: {
    figure: TodayTooltip,
    caption: 'Today',
  },

  Tomorrow: {
    figure: TomorrowTooltip,
    caption: 'Tomorrow',
  },

  Yesterday: {
    figure: YesterdayTooltip,
    caption: 'Yesterday',
  },

  Now: {
    figure: NowTooltip,
    caption: 'Now',
  },

  'Move Up': {
    figure: MoveUpTooltip,
    caption: 'Move Up',
  },

  'Move Down': {
    figure: MoveDownTooltip,
    caption: 'Move Down',
  },

  Copy: {
    figure: CopyTooltip,
    caption: 'Copy / Duplicate',
  },

  Delete: {
    figure: DeleteTooltip,
    caption: 'Delete',
  },

  'Group & Frame': {
    figure: EdgelessTooltip,
    caption: 'Edgeless',
  },
};
