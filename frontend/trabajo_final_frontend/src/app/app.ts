import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginService } from './services/login';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [LoginService], //servicio de login
})
export class App {
constructor(private analyticsService: AnalyticsService) {

}

}
