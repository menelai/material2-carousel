import { ListKeyManagerOption } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  inject,
  input,
  model,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
  selector: 'mat-carousel-slide',
  templateUrl: './carousel-slide.component.html',
  styleUrls: ['./carousel-slide.component.scss'],
  standalone: true,
})
export class MatCarouselSlideComponent implements ListKeyManagerOption {
  readonly image = input<string>();

  readonly overlayColor = input('#00000040');

  readonly hideOverlay = input(false);

  readonly disabledInput = model(false, { alias: 'disabled' });

  readonly templateRef = viewChild.required(TemplateRef);

  private readonly sanitizer = inject(DomSanitizer);

  readonly backgroundImage = computed<SafeStyle | null>(() => {
    const image = this.image();
    return image ? this.sanitizer.bypassSecurityTrustStyle(`url('${image}')`) : null;
  });

  get disabled(): boolean {
    return this.disabledInput();
  }

  set disabled(value: boolean) {
    this.disabledInput.set(value);
  }
}
