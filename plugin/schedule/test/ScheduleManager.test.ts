import assert from 'assert';
import path from 'path';
import {
  EggPrototypeLifecycleUtil,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
} from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggLoadUnitType } from '@eggjs/tegg-types';
import { LoaderUtil } from '@eggjs/module-test-util';
import { ScheduleManager } from '../lib/ScheduleManager';
import { ScheduleWorkerRegister } from '../lib/ScheduleWorkerRegister';
import { ScheduleWorkerLoadUnitHook } from '../lib/ScheduleWorkerLoadUnitHook';
import { SchedulePrototypeHook } from '../lib/SchedulePrototypeHook';

describe('plugin/schedule/test/ScheduleManager.test.ts', () => {
  describe('ScheduleManager', () => {
    it('should register and unregister schedules', async () => {
      const registeredSchedules: string[] = [];
      const unregisteredSchedules: string[] = [];

      // Mock app with scheduleWorker
      const mockApp = {
        scheduleWorker: {
          registerSchedule(item: { key: string }) {
            registeredSchedules.push(item.key);
          },
          unregisterSchedule(key: string) {
            unregisteredSchedules.push(key);
          },
        },
      } as any;

      const scheduleManager = new ScheduleManager(mockApp);
      const scheduleWorkerRegister = new ScheduleWorkerRegister(scheduleManager);
      const scheduleWorkerLoadUnitHook = new ScheduleWorkerLoadUnitHook(scheduleWorkerRegister);
      const schedulePrototypeHook = new SchedulePrototypeHook();

      // Register lifecycle hooks
      LoadUnitLifecycleUtil.registerLifecycle(scheduleWorkerLoadUnitHook);
      EggPrototypeLifecycleUtil.registerLifecycle(schedulePrototypeHook);

      try {
        // Create load unit
        const modulePath = path.join(__dirname, 'fixtures/schedule-app/app/simple-schedule-module');

        // Build global graph first
        LoaderUtil.buildGlobalGraph([ modulePath ]);

        const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
        await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);

        // Verify schedule was registered
        assert(registeredSchedules.length > 0, 'Schedule should be registered');
        assert(scheduleManager.size > 0, 'ScheduleManager should track registered schedules');
        const registeredKey = registeredSchedules[0];

        // Simulate beforeClose - unregister all schedules
        scheduleManager.unregisterAll();

        // Verify schedule was unregistered
        assert(unregisteredSchedules.length > 0, 'Schedule should be unregistered');
        assert.strictEqual(unregisteredSchedules[0], registeredKey, 'Unregistered key should match registered key');
        assert.strictEqual(scheduleManager.size, 0, 'ScheduleManager should be empty after unregisterAll');
      } finally {
        // Cleanup
        LoadUnitLifecycleUtil.deleteLifecycle(scheduleWorkerLoadUnitHook);
        EggPrototypeLifecycleUtil.deleteLifecycle(schedulePrototypeHook);
      }
    });

    it('should handle multiple schedules', async () => {
      const registeredSchedules: string[] = [];
      const unregisteredSchedules: string[] = [];

      const mockApp = {
        scheduleWorker: {
          registerSchedule(item: { key: string }) {
            registeredSchedules.push(item.key);
          },
          unregisterSchedule(key: string) {
            unregisteredSchedules.push(key);
          },
        },
      } as any;

      const scheduleManager = new ScheduleManager(mockApp);

      // Mock register multiple schedules
      const mockProto1 = { getMetaData: () => '/path/to/schedule1.ts' } as any;
      const mockProto2 = { getMetaData: () => '/path/to/schedule2.ts' } as any;

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      scheduleManager.register(mockProto1, { schedule: {}, task: () => {}, key: '/path/to/schedule1.ts' });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      scheduleManager.register(mockProto2, { schedule: {}, task: () => {}, key: '/path/to/schedule2.ts' });

      assert.strictEqual(scheduleManager.size, 2, 'Should have 2 registered schedules');
      assert.strictEqual(registeredSchedules.length, 2, 'Should have called registerSchedule twice');

      // Unregister all
      scheduleManager.unregisterAll();

      assert.strictEqual(scheduleManager.size, 0, 'Should have 0 registered schedules after unregisterAll');
      assert.strictEqual(unregisteredSchedules.length, 2, 'Should have called unregisterSchedule twice');
    });
  });
});
