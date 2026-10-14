import { ListKeyManager } from '@angular/cdk/a11y';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  AfterContentInit,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  output,
  PLATFORM_ID,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { ThemePalette } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { interval, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { Orientation, SvgIconOverrides } from './carousel';
import { MatCarouselSlideComponent } from './carousel-slide/carousel-slide.component';

enum Direction {
  Left,
  Right,
  Index,
}

@Component({
  selector: 'mat-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  standalone: true,
  imports: [MatIconButton, MatMiniFabButton, MatIcon, NgTemplateOutlet],
})
export class MatCarouselComponent implements AfterContentInit {
  // Animations.
  readonly timings = input('250ms ease-in');
  readonly svgIconOverrides = input<SvgIconOverrides>();

  // Navigation.
  readonly autoplay = input(true);
  readonly interval = input(5000);
  readonly loop = input(true);
  readonly hideArrows = input(true);
  readonly hideIndicators = input(true);
  readonly pauseOnHover = input(true);

  // Appearance.
  readonly color = input<ThemePalette>('accent');
  readonly maxWidth = input('auto');
  readonly maintainAspectRatio = input(true);
  readonly proportion = input(25);
  readonly slideHeight = input('100%');
  readonly slides = input<number>();

  // Accessibility.
  readonly useKeyboard = input(false);
  readonly useMouseWheel = input(false);
  readonly orientation = input<Orientation>('ltr');

  readonly animationStart = output<number>();
  readonly change = output<number>();

  readonly currentIndex = signal(0);

  readonly slidesList = contentChildren(MatCarouselSlideComponent);

  readonly visibleSlides = computed(() => {
    const slides = this.slides();
    const list = this.slidesList();
    return slides != null && slides < list.length ? list.slice(0, slides) : list;
  });

  readonly carouselContainerRef = viewChild.required<ElementRef<HTMLDivElement>>(
    'carouselContainer'
  );
  readonly carouselListRef = viewChild.required<ElementRef<HTMLElement>>('carouselList');

  readonly translation = signal('translateX(0px)');

  private listKeyManager!: ListKeyManager<MatCarouselSlideComponent>;
  private timer$!: Observable<number>;
  private readonly timerStop$ = new Subject<void>();
  private animationPending = false;
  private animationTimeout: ReturnType<typeof setTimeout> | null = null;
  private pressed = false;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private readonly dragThreshold = 12;

  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  get currentSlide(): MatCarouselSlideComponent | null {
    return this.listKeyManager?.activeItem ?? null;
  }

  constructor() {
    effect(() => {
      const loop = this.loop();
      this.listKeyManager?.withWrap(loop);
    });

    effect(() => {
      const orientation = this.orientation();
      this.listKeyManager?.withHorizontalOrientation(orientation);
    });

    effect(() => {
      this.maxWidth();
      this.slideTo(0);
    });

    effect(() => {
      this.interval();
      this.autoplay();
      this.stopTimer();
      this.startTimer();
    });

    this.destroyRef.onDestroy(() => {
      this.clearAnimationTimeout();
      this.listKeyManager?.destroy();
    });
  }

  ngAfterContentInit(): void {
    this.listKeyManager = new ListKeyManager(this.visibleSlides, this.injector)
      .withVerticalOrientation(false)
      .withHorizontalOrientation(this.orientation())
      .withWrap(this.loop());

    this.listKeyManager.updateActiveItem(0);

    this.listKeyManager.change
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(index => {
        this.currentIndex.set(index);
        this.playAnimation();
      });
  }

  next(): void {
    this.goto(Direction.Right);
  }

  previous(): void {
    this.goto(Direction.Left);
  }

  slideTo(index: number): void {
    this.goto(Direction.Index, index);
  }

  @HostListener('keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (this.useKeyboard()) {
      this.listKeyManager?.onKeydown(event);
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.pauseOnHover()) {
      this.stopTimer();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.pauseOnHover()) {
      this.startTimer();
    }
  }

  @HostListener('mousewheel', ['$event'])
  onMouseWheel(event: Event): void {
    if (this.useMouseWheel()) {
      event.preventDefault(); // prevent window to scroll
      const delta = Math.sign((event as WheelEvent).deltaY);

      if (delta > 0) {
        this.next();
      } else if (delta < 0) {
        this.previous();
      }
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    // Reset carousel when window is resized
    // in order to avoid major glitches.
    this.slideTo(0);
  }

  @HostListener('transitionend', ['$event'])
  onTransitionEnd(event: TransitionEvent): void {
    if (
      event.target === this.carouselListRef().nativeElement &&
      event.propertyName === 'transform'
    ) {
      this.finishAnimation();
    }
  }

  onDragStart(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return; // only react to the primary button
    }
    this.pressed = true;
    this.dragging = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
  }

  onDrag(event: PointerEvent, slideElem: HTMLElement): void {
    if (!this.pressed) {
      return;
    }

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    // Begin the drag (and capture the pointer) only once the pointer has moved
    // beyond the threshold, otherwise pointerdown/up on nested elements would
    // swallow their click events.
    if (!this.dragging) {
      const isHorizontalDrag =
        Math.abs(deltaX) > this.dragThreshold && Math.abs(deltaX) > Math.abs(deltaY);
      if (!isHorizontalDrag) {
        return;
      }
      this.dragging = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }

    // If the vertical drag is greater, it's a drag up/down, so ignore.
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    let adjustedDelta = deltaX;
    if (this.isOutOfBounds()) {
      adjustedDelta *= 0.2; // decelerate movement;
    }

    this.renderer.setStyle(slideElem, 'cursor', 'grabbing');
    this.translation.set(this.getTranslation(this.getOffset() + adjustedDelta));
  }

  onDragEnd(event: PointerEvent, slideElem: HTMLElement): void {
    this.pressed = false;
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    this.renderer.removeStyle(slideElem, 'cursor');

    const deltaX = event.clientX - this.dragStartX;

    if (!this.isOutOfBounds() && Math.abs(deltaX) > this.getWidth() * 0.25) {
      if (deltaX <= 0) {
        this.next();
        return;
      }
      this.previous();
      return;
    }
    this.playAnimation(); // slide back, don't change current index
  }

  private isOutOfBounds(): boolean {
    const sign = this.orientation() === 'rtl' ? -1 : 1;
    const listEl = this.carouselListRef().nativeElement;
    const offsetParent = listEl.offsetParent;
    const parentLeft = offsetParent ? offsetParent.getBoundingClientRect().left : 0;
    const left = sign * (listEl.getBoundingClientRect().left - parentLeft);
    const lastIndex = this.visibleSlides().length - 1;
    const width = -this.getWidth() * lastIndex;

    return (
      (this.listKeyManager.activeItemIndex === 0 && left >= 0) ||
      (this.listKeyManager.activeItemIndex === lastIndex && left <= width)
    );
  }

  private isVisible(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const container = this.carouselContainerRef();
    if (!container) {
      return false;
    }

    const elem = container.nativeElement;
    const docViewTop = window.pageYOffset;
    const docViewBottom = docViewTop + window.innerHeight;
    const elemOffset = elem.getBoundingClientRect();
    const elemTop = docViewTop + elemOffset.top;
    const elemBottom = elemTop + elemOffset.height;

    return elemBottom <= docViewBottom || elemTop >= docViewTop;
  }

  private getOffset(): number {
    const offset = this.currentIndex() * this.getWidth();
    const sign = this.orientation() === 'rtl' ? 1 : -1;
    return sign * offset;
  }

  private getTranslation(offset: number): string {
    return `translateX(${offset}px)`;
  }

  private getWidth(): number {
    return this.carouselContainerRef().nativeElement.clientWidth;
  }

  private goto(direction: Direction, index?: number): void {
    if (!this.listKeyManager) {
      return;
    }
    const rtl = this.orientation() === 'rtl';

    switch (direction) {
      case Direction.Left:
        return rtl
          ? this.listKeyManager.setNextItemActive()
          : this.listKeyManager.setPreviousItemActive();
      case Direction.Right:
        return rtl
          ? this.listKeyManager.setPreviousItemActive()
          : this.listKeyManager.setNextItemActive();
      case Direction.Index:
        return this.listKeyManager.setActiveItem(index as number);
    }
  }

  private playAnimation(): void {
    this.translation.set(this.getTranslation(this.getOffset()));
    this.animationStart.emit(this.currentIndex());
    this.scheduleAnimationEnd();
  }

  private scheduleAnimationEnd(): void {
    this.clearAnimationTimeout();
    this.animationPending = true;
    const duration = this.getTransitionDuration(this.timings());
    this.animationTimeout = setTimeout(() => this.finishAnimation(), duration + 16);
  }

  private finishAnimation(): void {
    if (!this.animationPending) {
      return;
    }
    this.animationPending = false;
    this.clearAnimationTimeout();
    this.change.emit(this.currentIndex());
  }

  private getTransitionDuration(timings: string): number {
    const match = timings.match(/(\d+(?:\.\d+)?)(ms|s)/);
    if (!match) {
      return 250;
    }
    const value = parseFloat(match[1]);
    return match[2] === 's' ? value * 1000 : value;
  }

  private clearAnimationTimeout(): void {
    if (this.animationTimeout != null) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }
  }

  private resetTimer(): void {
    this.timer$ = interval(this.interval());
  }

  private startTimer(): void {
    if (!this.autoplay()) {
      return;
    }

    this.resetTimer();
    this.timer$
      .pipe(
        takeUntil(this.timerStop$),
        takeUntilDestroyed(this.destroyRef),
        filter(() => this.isVisible())
      )
      .subscribe(() => {
        this.listKeyManager?.withWrap(true).setNextItemActive();
        this.listKeyManager?.withWrap(this.loop());
      });
  }

  private stopTimer(): void {
    this.timerStop$.next(undefined);
  }
}
