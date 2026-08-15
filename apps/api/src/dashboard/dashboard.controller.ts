import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from '@agendamiento/shared';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(): Promise<DashboardStats> {
    return this.dashboardService.getStats();
  }
}
