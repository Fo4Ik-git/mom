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
      cost: 4.1,
      value: 10.2,
    },
    {
      name: 'Oxi',
      cost: 0.38,
      value: 1.7,
    },
    {
      name: 'Пудра эконом',
      cost: 2.5,
      value: 5.1,
    },
    {
      name: 'Пудра lux',
      cost: 3,
      value: 6,
    },
    {
      name: 'Активи',
      cost: 13.5,
      value: 57,
    },
    {
      name: 'Пенная баня',
      cost: 80,
      value: 250,
    },
    {
      name: 'Время',
      cost: 0,
      value: 1000,
    },
    {
      name: 'База маска',
      cost: 0.4,
      value: 1.2,
    },
    {
      name: 'Маска Color',
      cost: 2.5,
      value: 5,
    },
    {
      name: 'Рассходники',
      cost: 1,
      value: 0,
      presets: [150, 200, 250, 400, 500],
    },
  ];

  @ViewChildren('productInput') productInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor() {}

  calculate() {
    let sum = 0;
    let costSum = 0;
    let work = 0;

    this.productInputs.forEach((input, index) => {
      const count = Number(input.nativeElement.value);
      const product = this.products[index];
      let intermediateSum = 0, consumablesValue = 0;

      switch (product.name) {
        case 'Рассходники':
          consumablesValue = count;
          intermediateSum = 0;
          break;
        case 'Время':
          work = product.value * count;
          intermediateSum = product.value * count;
          break;
        default:
          intermediateSum = product.value * count;
      }

      const productCost = product.cost * count;
      sum += intermediateSum + consumablesValue;
      costSum += productCost - consumablesValue;
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
