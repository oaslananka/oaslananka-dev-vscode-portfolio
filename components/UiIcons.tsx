import type { ComponentType } from 'react';

import UiIcon, { type UiIconProps } from '@/components/UiIcon';
import type { UiIconName } from '@/lib/ui-icons';

export type IconType = ComponentType<Omit<UiIconProps, 'name'>>;

function createIcon(name: UiIconName, displayName: string): IconType {
  const Icon: IconType = (props) => <UiIcon name={name} {...props} />;
  Icon.displayName = displayName;
  return Icon;
}

export const VscAccount = createIcon('account', 'VscAccount');
export const VscArrowLeft = createIcon('arrow-left', 'VscArrowLeft');
export const VscArrowRight = createIcon('arrow-right', 'VscArrowRight');
export const VscBell = createIcon('bell', 'VscBell');
export const VscBook = createIcon('book', 'VscBook');
export const VscBriefcase = createIcon('briefcase', 'VscBriefcase');
export const VscCalendar = createIcon('calendar', 'VscCalendar');
export const VscCheck = createIcon('check', 'VscCheck');
export const VscChevronRight = createIcon('chevron-right', 'VscChevronRight');
export const VscCircuitBoard = createIcon('circuit-board', 'VscCircuitBoard');
export const VscClose = createIcon('close', 'VscClose');
export const VscCode = createIcon('code', 'VscCode');
export const VscColorMode = createIcon('color-mode', 'VscColorMode');
export const VscEdit = createIcon('edit', 'VscEdit');
export const VscError = createIcon('error', 'VscError');
export const VscFiles = createIcon('files', 'VscFiles');
export const VscFolderOpened = createIcon('folder-opened', 'VscFolderOpened');
export const VscGear = createIcon('gear', 'VscGear');
export const VscGithub = createIcon('github', 'VscGithub');
export const VscGithubAlt = createIcon('github-alt', 'VscGithubAlt');
export const VscGlobe = createIcon('globe', 'VscGlobe');
export const VscGoToFile = createIcon('go-to-file', 'VscGoToFile');
export const VscHome = createIcon('home', 'VscHome');
export const VscLinkExternal = createIcon('link-external', 'VscLinkExternal');
export const VscMail = createIcon('mail', 'VscMail');
export const VscPerson = createIcon('person', 'VscPerson');
export const VscPulse = createIcon('pulse', 'VscPulse');
export const VscRepo = createIcon('repo', 'VscRepo');
export const VscRepoForked = createIcon('repo-forked', 'VscRepoForked');
export const VscSearch = createIcon('search', 'VscSearch');
export const VscSend = createIcon('send', 'VscSend');
export const VscServer = createIcon('server', 'VscServer');
export const VscSettings = createIcon('settings', 'VscSettings');
export const VscShield = createIcon('shield', 'VscShield');
export const VscSourceControl = createIcon('source-control', 'VscSourceControl');
export const VscStarEmpty = createIcon('star-empty', 'VscStarEmpty');
export const VscSymbolColor = createIcon('symbol-color', 'VscSymbolColor');
export const VscTag = createIcon('tag', 'VscTag');
export const VscTerminal = createIcon('terminal', 'VscTerminal');
export const VscWarning = createIcon('warning', 'VscWarning');
export const SiNextdotjs = createIcon('nextjs', 'SiNextdotjs');
export const MdNavigateNext = createIcon('navigate-next', 'MdNavigateNext');
