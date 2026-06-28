import type { NotificationDevice } from '../entities/NotificationDevice';

export type NotificationDeviceDto = {
  id: string;
  platform: 'web' | 'android' | 'ios' | null;
  enabled: boolean;
  lastSeenAt: string;
};

export type NotificationTokenDisabledDto = {
  disabled: boolean;
};

export function toNotificationDeviceDto(device: NotificationDevice): NotificationDeviceDto {
  return {
    id: device.id,
    platform: device.platform,
    enabled: device.enabled,
    lastSeenAt: device.lastSeenAt.toISOString(),
  };
}
