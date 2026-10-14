import { Component, signal } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { MatCarouselSlideComponent } from './carousel-slide/carousel-slide.component';
import { MatCarouselComponent } from './carousel.component';

@Component({
  selector: 'mat-carousel-test-wrapper-component',
  standalone: true,
  imports: [MatCarouselComponent, MatCarouselSlideComponent],
  template: `
    <mat-carousel
      [autoplay]="autoplay()"
      [interval]="interval()"
      [loop]="loop()"
      [slides]="slidesInput()"
      (animationStart)="animationStarts.push($event)"
      (change)="changes.push($event)"
    >
      @for (slide of slides; track $index) {
        <mat-carousel-slide></mat-carousel-slide>
      }
    </mat-carousel>
  `,
})
class MatCarouselTestWrapperComponent {
  readonly slides = new Array<number>(5);
  readonly autoplay = signal(false);
  readonly interval = signal(5000);
  readonly loop = signal(true);
  readonly slidesInput = signal<number | undefined>(undefined);
  readonly animationStarts: number[] = [];
  readonly changes: number[] = [];
}

describe('MatCarouselComponent', () => {
  let component: MatCarouselComponent;
  let wrapper: MatCarouselTestWrapperComponent;
  let fixture: ComponentFixture<MatCarouselTestWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatCarouselTestWrapperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MatCarouselTestWrapperComponent);
    wrapper = fixture.componentInstance;
    component = fixture.debugElement.children[0].componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with index 0', () => {
    expect(component.currentIndex()).toBe(0);
  });

  it('should have 5 children', () => {
    expect(component.visibleSlides().length).toBe(5);
  });

  it('should adjust itself to have 3 children', () => {
    wrapper.slidesInput.set(3);
    fixture.detectChanges();

    expect(component.visibleSlides().length).toBe(3);
  });

  it('should change index to 1', () => {
    component.next();

    expect(component.currentIndex()).toBe(1);
  });

  it('should change index to last element', () => {
    component.slideTo(component.visibleSlides().length - 1);

    expect(component.currentIndex()).toBe(4);
  });

  it('should go from last to first slide', () => {
    component.slideTo(component.visibleSlides().length - 1);
    component.next();

    expect(component.currentIndex()).toBe(0);
  });

  it('should go from first to last slide', () => {
    component.previous();

    expect(component.currentIndex()).toBe(4);
  });

  it('should not loop to previous', () => {
    wrapper.loop.set(false);
    fixture.detectChanges();

    component.previous();

    expect(component.currentIndex()).toBe(0);
  });

  describe('@Output(change) and @Output(animationStart)', () => {
    beforeEach(() => {
      wrapper.changes.length = 0;
      wrapper.animationStarts.length = 0;
    });

    it('should emit when slideTo is called', fakeAsync(() => {
      const idx = (component.currentIndex() + 1) % component.visibleSlides().length;
      component.slideTo(idx);
      tick(1000);

      expect(wrapper.animationStarts).toEqual([idx]);
      expect(wrapper.changes).toEqual([idx]);
    }));

    it('should emit when next is called', fakeAsync(() => {
      component.next();
      tick(1000);

      expect(wrapper.animationStarts).toEqual([1]);
      expect(wrapper.changes).toEqual([1]);
    }));

    it('should emit when previous is called', fakeAsync(() => {
      component.previous();
      tick(1000);

      expect(wrapper.animationStarts).toEqual([
        component.visibleSlides().length - 1,
      ]);
      expect(wrapper.changes).toEqual([component.visibleSlides().length - 1]);
    }));

    it('should emit when autoplay is set', fakeAsync(() => {
      wrapper.interval.set(100);
      wrapper.autoplay.set(true);
      fixture.detectChanges();

      tick(100);
      fixture.detectChanges();

      wrapper.autoplay.set(false);
      fixture.detectChanges();

      tick(1000);

      expect(wrapper.animationStarts).toContain(1);
      expect(wrapper.changes).toContain(1);
    }));
  });

  describe('drag interaction', () => {
    it('should not capture the pointer on pointerdown, keeping nested buttons clickable', () => {
      const li = fixture.nativeElement.querySelector('li.carousel-slide') as HTMLElement;
      const pointerId = 7;
      const captureSpy = spyOn(li, 'setPointerCapture');

      li.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId, clientX: 100, clientY: 100, bubbles: true })
      );
      li.dispatchEvent(
        new PointerEvent('pointerup', { pointerId, clientX: 100, clientY: 100, bubbles: true })
      );

      expect(captureSpy).not.toHaveBeenCalled();
      expect(component['dragging']).toBe(false);
    });

    it('should not drag when the pointer moves without a press', () => {
      const li = fixture.nativeElement.querySelector('li.carousel-slide') as HTMLElement;
      const pointerId = 7;
      const captureSpy = spyOn(li, 'setPointerCapture');

      li.dispatchEvent(
        new PointerEvent('pointermove', { pointerId, clientX: 150, clientY: 104, bubbles: true })
      );

      expect(component['dragging']).toBe(false);
      expect(captureSpy).not.toHaveBeenCalled();
    });

    it('should start dragging only after a horizontal movement threshold', () => {
      const li = fixture.nativeElement.querySelector('li.carousel-slide') as HTMLElement;
      const pointerId = 7;
      const captureSpy = spyOn(li, 'setPointerCapture');

      li.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId, clientX: 100, clientY: 100, bubbles: true })
      );

      li.dispatchEvent(
        new PointerEvent('pointermove', { pointerId, clientX: 105, clientY: 102, bubbles: true })
      );
      expect(component['dragging']).toBe(false);
      expect(captureSpy).not.toHaveBeenCalled();

      li.dispatchEvent(
        new PointerEvent('pointermove', { pointerId, clientX: 150, clientY: 104, bubbles: true })
      );
      expect(component['dragging']).toBe(true);
      expect(captureSpy).toHaveBeenCalled();
    });
  });
});
