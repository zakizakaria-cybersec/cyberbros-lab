import cron from 'node-cron';
import { VMService } from '../services/vmService';

const vmService = new VMService();

export const startVMCleanupJob = (): void => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('🧹 Running VM cleanup job...');
    try {
      const deletedCount = await vmService.deleteExpiredVMs();
      console.log(`✅ Cleaned up ${deletedCount} expired VMs`);
    } catch (error) {
      console.error('❌ VM cleanup job error:', error);
    }
  });

  console.log('✅ VM cleanup job scheduled (runs every 15 minutes)');
};
