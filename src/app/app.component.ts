import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Calculator';

  sum = 0;
  costSum = 0;
  work = 0;
  result = "";
  products = [
    {
      name: 'Surface',
      cost: 6,
      value: 12,
    },
    {
      name: 'Lakme/BerryWell',
      cost: 3.8,
      value: 9,
    },
    {
      name: 'Oxi',
      cost: 0.31,
      value: 1.5,
    },
    {
      name: 'Пудра эконом',
      cost: 1.3,
      value: 3.1,
    },
    {
      name: 'Пудра lux',
      cost: 2,
      value: 4.8,
    },
    {
      name: 'Активи',
      cost: 12,
      value: 50,
    },
    {
      name: 'Пенная баня',
      cost: 70,
      value: 220,
    },
    {
      name: 'Время',
      cost: 0,
      value: 850,
    },
    {
      name: 'База маска',
      cost: 0.26,
      value: 1,
    },
    {
      name: 'Рассходники',
      cost: 1,
      value: 0,
    },
  ];

  @ViewChildren('productInput') productInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor() {}

  calculate() {
    let sum = 0;
    let costSum = 0;
    let work = 0;

    this.productInputs.forEach((input, index) => {
      const i = Number(input.nativeElement.value);
      const product = this.products[index];
      let s = 0, a = 0;

      switch (product.name) {
        case 'Рассходники':
          a = i;
          s = 0;
          break;
        case 'Время':
          work = product.value * i;
          s = product.value * i;
          break;
        default:
          s = product.value * i;
      }

      const u = product.cost * i;
      sum += s + a;
      costSum += u - a;
    });

    this.result = `
      Прибыль: ${sum - costSum}<br/>
      Себестоимость: ${costSum}<br/>
      Косметика: ${sum - work}<br/>
      Работа: ${work}<br/>
      Стоимость: ${sum}
    `;
  }

  clear() {
    this.productInputs.forEach(input => (input.nativeElement.value = '0'));
    this.result = '';
  }
}
