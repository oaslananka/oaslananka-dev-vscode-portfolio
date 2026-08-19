import type { SVGProps } from 'react';

import { UI_ICON_SPRITE_URL } from '@/lib/static-assets';
import type { UiIconName } from '@/lib/ui-icons';

export interface UiIconProps
  extends Omit<SVGProps<SVGSVGElement>, 'children' | 'height' | 'width'> {
  name: UiIconName;
  size?: number | string;
}

export default function UiIcon({
  name,
  size = '1em',
  'aria-hidden': ariaHidden = true,
  focusable = false,
  ...props
}: UiIconProps) {
  return (
    <svg
      width={size}
      height={size}
      aria-hidden={ariaHidden}
      focusable={focusable}
      {...props}
    >
      <use href={`${UI_ICON_SPRITE_URL}#${name}`} />
    </svg>
  );
}
