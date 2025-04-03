import { LiveData, Service } from '@toeverything/infra';
import { setElementVars } from '@vanilla-extract/dynamic';
import { distinctUntilChanged, scan } from 'rxjs';

import { globalVars } from '../../../styles/variables.css';
import type { VirtualKeyboardProvider } from '../providers/virtual-keyboard';

export class VirtualKeyboardService extends Service {
  readonly visible$ = new LiveData(false);
  readonly height$ = new LiveData(0);

  constructor(
    private readonly virtualKeyboardProvider: VirtualKeyboardProvider
  ) {
    super();
    this._observe();
  }

  private _observe() {
    this.disposables.push(
      this.virtualKeyboardProvider.onChange(info => {
        this.visible$.next(info.visible);
        this.height$.next(info.height);
      })
    );

    // record the static keyboard height to css var
    const subscription = this.height$
      .pipe(
        scan((lastHeight, currentHeight) =>
          this.visible$.value ? currentHeight : lastHeight
        ),
        distinctUntilChanged()
      )
      .subscribe(height => {
        setElementVars(document.body, {
          [globalVars.appKeyboardHeight]: `${height}px`,
        });
      });
    this.disposables.push(() => subscription.unsubscribe());
  }
}
