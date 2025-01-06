import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export const appConfig: ApplicationConfig = {
  providers: [
    // For Angular 18, you can enable the new change detection mode:
    // provideZoneChangeDetection({ eventCoalescing: true }),
    importProvidersFrom(TranslateModule.forRoot())
  ],
};