import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, ElementRef, inject, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatOption, ThemePalette } from '@angular/material/core';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatCarouselComponent,
  MatCarouselSlideComponent,
  Orientation,
} from '@kovalenko/material-carousel';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    MatAccordion,
    MatButton,
    MatCard,
    MatCardContent,
    MatCarouselComponent,
    MatCarouselSlideComponent,
    MatCheckbox,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatIcon,
    MatInput,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatOption,
    MatSelect,
    MatToolbar,
    MatTooltip,
  ],
  providers: [MatSnackBar],
})
export class AppComponent {
  private static readonly INSTALL_TEXT =
    'npm install @kovalenko/material-carousel';

  readonly slidesList = new Array<number>(5);
  showContent = false;

  parentHeight = 'auto';
  timings = '250ms ease-in';
  autoplay = true;
  interval = 5000;
  loop = true;
  hideArrows = false;
  hideIndicators = false;
  color: ThemePalette = 'accent';
  maxWidth = 'auto';
  maintainAspectRatio = true;
  proportion = 25;
  slideHeight = '200px';
  slides = this.slidesList.length;
  overlayColor = '#00000040';
  hideOverlay = false;
  useKeyboard = true;
  useMouseWheel = false;
  orientation: Orientation = 'ltr';
  log: string[] = [];
  darkMode = false;

  readonly carouselSlides = viewChildren(MatCarouselSlideComponent);

  private readonly snackBar = inject(MatSnackBar);
  private readonly overlayContainer = inject(OverlayContainer);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  get code(): string {
    return `
<div [style.height]="${this.parentHeight}">
  <mat-carousel
    timings="${this.timings}"
    [autoplay]="${this.autoplay}"
    interval="${this.interval}"
    color="${this.color}"
    maxWidth="${this.maxWidth}"
    proportion="${this.proportion}"
    slides="${this.slides}"
    [loop]="${this.loop}"
    [hideArrows]="${this.hideArrows}"
    [hideIndicators]="${this.hideIndicators}"
    [useKeyboard]="${this.useKeyboard}"
    [useMouseWheel]="${this.useMouseWheel}"
    orientation="${this.orientation}"
  >
    @for (slide of slides; track $index; let i = $index) {
      <mat-carousel-slide
        #matCarouselSlide
        [image]="slide.image"
        overlayColor="${this.overlayColor}"
        [hideOverlay]="${this.hideOverlay}"
      >${this.showContent ? this.innerCode : ''}</mat-carousel-slide>
    }
  </mat-carousel>
</div>
    `;
  }

  private innerCode = `
    <div
      style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center"
    >
      <h1>{{ i }}</h1>
      <p>disabled: {{ matCarouselSlide.disabled }}</p>
      <button
        mat-flat-button
        (click)="matCarouselSlide.disabled = !matCarouselSlide.disabled"
      >
        Click me!
      </button>
    </div>
  `;

  toggleTheme(): void {
    this.darkMode = !this.darkMode;

    const elems = [
      this.elementRef.nativeElement,
      this.overlayContainer.getContainerElement(),
    ];

    for (const elem of elems) {
      if (this.darkMode) {
        elem.classList.add('demo-dark-theme');
        continue;
      }

      elem.classList.remove('demo-dark-theme');
    }
  }

  copy(): void {
    const textarea = document.createElement('textarea');
    textarea.value = AppComponent.INSTALL_TEXT;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-99999px';

    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    this.snackBar.open('Command was successfully copied to clipboard!', '', {
      duration: 2000,
    });
  }

  resetSlides(): void {
    this.carouselSlides().forEach(item => (item.disabled = false));
  }

  onChange(index: number): void {
    this.log.push(`MatCarousel#change emitted with index ${index}`);
  }
}
