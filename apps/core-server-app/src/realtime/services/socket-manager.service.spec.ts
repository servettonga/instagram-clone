import { SocketManagerService } from './socket-manager.service';

describe('SocketManagerService', () => {
  let service: SocketManagerService;

  beforeEach(() => {
    service = new SocketManagerService();
  });

  it('tracks sockets per user', () => {
    service.addSocket('user-1', 'socket-a');
    service.addSocket('user-1', 'socket-b');

    expect(service.getUserSockets('user-1')).toEqual(
      expect.arrayContaining(['socket-a', 'socket-b']),
    );
    expect(service.getTotalConnections()).toBe(2);
    expect(service.isUserOnline('user-1')).toBe(true);
  });

  it('removes sockets and cleans up empty users', () => {
    service.addSocket('user-1', 'socket-a');
    service.addSocket('user-1', 'socket-b');

    service.removeSocket('user-1', 'socket-a');
    expect(service.getUserSockets('user-1')).toEqual(['socket-b']);
    expect(service.isUserOnline('user-1')).toBe(true);

    service.removeSocket('user-1', 'socket-b');
    expect(service.getUserSockets('user-1')).toEqual([]);
    expect(service.isUserOnline('user-1')).toBe(false);
    expect(service.getOnlineUsers()).toEqual([]);
  });

  it('supports multiple users independently', () => {
    service.addSocket('user-1', 'socket-a');
    service.addSocket('user-2', 'socket-b');

    expect(service.getOnlineUsers().sort()).toEqual(['user-1', 'user-2']);
    expect(service.getUserIdBySocket('socket-b')).toBe('user-2');
  });

  it('returns aggregated stats', () => {
    service.addSocket('user-1', 'socket-a');
    service.addSocket('user-2', 'socket-b');

    const stats = service.getStats();
    expect(stats.totalUsers).toBe(2);
    expect(stats.totalConnections).toBe(2);
    expect(stats.onlineUsers.sort()).toEqual(['user-1', 'user-2']);
  });
});
