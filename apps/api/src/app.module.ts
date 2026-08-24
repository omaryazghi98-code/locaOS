import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './modules/common/errors.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AuthGuard, PermissionsGuard } from './modules/auth/guards.js';
import { FleetController } from './modules/fleet/fleet.controller.js';
import { CustomersController } from './modules/customers/customers.controller.js';
import { ReservationsController } from './modules/reservations/reservations.controller.js';
import { ContractsController } from './modules/contracts/contracts.controller.js';
import { InspectionsController } from './modules/inspections/inspections.controller.js';
import { FinanceController } from './modules/finance/finance.controller.js';
import { OpsController } from './modules/ops/ops.controller.js';
import { AlertsController } from './modules/alerts/alerts.controller.js';
import { FilesController } from './modules/files/files.controller.js';

@Module({
  controllers: [
    AuthController, FleetController, CustomersController, ReservationsController,
    ContractsController, InspectionsController, FinanceController, OpsController,
    AlertsController, FilesController,
  ],
  providers: [
    AuthGuard, PermissionsGuard,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
