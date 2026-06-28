import AppDataSource from '../data-source';
import { NotificationDevice } from '../entities/NotificationDevice';
import { toNotificationDeviceDto, type NotificationDeviceDto, type NotificationTokenDisabledDto } from '../dtos/notification-device.dto';
import type { RegisterNotificationTokenInput, RemoveNotificationTokenInput } from '../validations/notification.validation';

export class NotificationService {
  async registerToken(userId: string, input: RegisterNotificationTokenInput): Promise<NotificationDeviceDto> {
    const repo = AppDataSource.getRepository(NotificationDevice);
    const now = new Date();
    let device = await repo.findOne({ where: { fcmToken: input.token } });

    if (!device) {
      device = repo.create({
        userId,
        fcmToken: input.token,
        platform: input.platform ?? null,
        enabled: true,
        lastSeenAt: now,
      });
    } else {
      device.userId = userId;
      device.platform = input.platform ?? device.platform;
      device.enabled = true;
      device.lastSeenAt = now;
    }

    return toNotificationDeviceDto(await repo.save(device));
  }

  async disableToken(userId: string, input: RemoveNotificationTokenInput): Promise<NotificationTokenDisabledDto> {
    const repo = AppDataSource.getRepository(NotificationDevice);
    const device = await repo.findOne({ where: { userId, fcmToken: input.token } });

    if (!device) {
      return { disabled: false };
    }

    device.enabled = false;
    device.lastSeenAt = new Date();
    await repo.save(device);

    return { disabled: true };
  }
}
