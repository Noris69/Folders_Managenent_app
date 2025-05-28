import { Routes } from '@angular/router';
import { RegisterComponent } from './user/auth/register/register.component';
import { LoginComponent } from './user/auth/login/login.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { HomeUserComponent } from './home-user/home-user.component';

export const routes: Routes = [
    { path: 'home', component: DashboardComponent },
    { path: 'documents', component: HomeUserComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: '', redirectTo: 'login', pathMatch: 'full' }, // redirige par défaut vers login
    { path: '**', redirectTo: 'login' }, // fallback
];
