import { Routes } from '@angular/router';
import { OuterComponent } from './pages/outer/outer';
import { NestedComponent } from './pages/nested/nested';

export const routes: Routes = [
  { path: '', component: OuterComponent },
  { path: 'nested', component: NestedComponent },
];
