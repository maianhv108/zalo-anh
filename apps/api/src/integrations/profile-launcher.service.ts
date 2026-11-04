import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtensionSyncService } from './extension-sync.service';
import { ConnectionStatus, ProviderType, AuditAction } from '@prisma/client';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface DevicePreset {
  deviceName: string;
  deviceModel: string;
  os: string;
  userAgent: string;
  viewport: { width: number; height: number };
}

export interface ProfileStatusItem {
  salesCode: string;
  salesName: string;
  userId: string;
  device: DevicePreset;
  isRunning: boolean;
  pid: number | null;
  profilePath: string;
  hasSession: boolean;
  connectionStatus: string;
  lastSyncAt: Date | null;
  conversationCount: number;
}

@Injectable()
export class ProfileLauncherService implements OnModuleInit {
  private readonly logger = new Logger(ProfileLauncherService.name);
  private activeProcesses = new Map<string, { pid: number; process: ChildProcess; launchedAt: Date }>();
  private activeWsBridges = new Map<number, any>();
  private qrCache = new Map<
    string,
    {
      qrImage: string | null;
      qrSvg?: string | null;
      status: 'STARTING' | 'WAITING_FOR_QR' | 'QR_READY' | 'LOGGED_IN' | 'ERROR';
      updatedAt: Date;
      error?: string;
      message?: string;
    }
  >();
  private capturingSet = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private extensionSyncService: ExtensionSyncService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Khởi động ProfileLauncherService & Cầu nối tự động đồng bộ tin nhắn CDP...');
    setInterval(async () => {
      try {
        const users = await this.prisma.user.findMany({
          where: { status: 'ACTIVE' },
          select: { code: true },
        });
        for (const u of users) {
          const port = this.getDebugPort(u.code);
          const state = await this.checkChromeSessionState(port);
          if (state.isAlive && state.isOnChat) {
            await this.ensureSyncBridge(port, u.code);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Lỗi vòng quét cầu nối đồng bộ: ${err.message}`);
      }
    }, 4000);
  }

  /**
   * Cổng gỡ lỗi riêng biệt cho từng nhân viên Sale
   */
  public getDebugPort(salesCode: string): number {
    const code = salesCode.toUpperCase();
    if (code === 'ADMIN01') return 9301;
    if (code === 'SALE01') return 9302;
    if (code === 'SALE02') return 9303;
    if (code === 'SALE03') return 9304;
    if (code === 'SALE04') return 9305;
    const match = code.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return 9300 + (num % 90);
    }
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) % 80;
    return 9310 + hash;
  }

  /**
   * Kiểm tra cổng gỡ lỗi CDP có đang hoạt động hay không
   */
  async isPortListening(port: number): Promise<boolean> {
    const net = await import('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(400);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  /**
   * Kiểm tra trạng thái phiên làm việc thực tế của cửa sổ Chrome (Đang mở, đã vào chat, hay đang ở trang đăng nhập)
   */
  async checkChromeSessionState(debugPort: number): Promise<{ isAlive: boolean; isOnChat: boolean; isOnLogin: boolean }> {
    const isAlive = await this.isPortListening(debugPort);
    if (!isAlive) return { isAlive: false, isOnChat: false, isOnLogin: false };

    try {
      const http = await import('http');
      const targets = await new Promise<any[]>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${debugPort}/json`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(800, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });

      const pages = targets.filter((t) => t.type === 'page');
      const isOnChat = pages.some(
        (p) => p.url?.includes('chat.zalo.me') && !p.url?.includes('id.zalo.me') && !p.title?.includes('Đăng nhập'),
      );
      const isOnLogin = pages.some((p) => p.url?.includes('id.zalo.me') || p.title?.includes('Đăng nhập'));
      return { isAlive: true, isOnChat, isOnLogin };
    } catch {
      return { isAlive: true, isOnChat: false, isOnLogin: false };
    }
  }

  /**
   * Đảm bảo tiện ích và cầu nối đồng bộ tin nhắn luôn chạy trực tiếp trên Zalo Web qua CDP
   */
  public async ensureSyncBridge(debugPort: number, salesCode: string): Promise<void> {
    if (this.activeWsBridges.has(debugPort)) {
      return;
    }

    try {
      const http = await import('http');
      const targets = await new Promise<any[]>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${debugPort}/json`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(800, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });

      const zaloPages = targets.filter((t) => t.type === 'page' && t.url?.includes('chat.zalo.me'));
      if (zaloPages.length === 0) return;

      // Đóng các tab Zalo bị trùng lặp để tránh Zalo hiện cảnh báo "Bạn đang mở Zalo trên một Tab khác"
      if (zaloPages.length > 1) {
        for (let i = 1; i < zaloPages.length; i++) {
          try {
            fetch(`http://127.0.0.1:${debugPort}/json/close/${zaloPages[i].id}`).catch(() => {});
          } catch {}
        }
      }

      const zaloPage = zaloPages[0];
      if (!zaloPage || !zaloPage.webSocketDebuggerUrl) return;

      const ws = new (globalThis as any).WebSocket(zaloPage.webSocketDebuggerUrl);
      this.activeWsBridges.set(debugPort, ws);

      const extDir = this.getExtensionDir();
      const contentCssPath = path.join(extDir, 'content.css');
      const contentJsPath = path.join(extDir, 'content.js');
      const contentCss = fs.existsSync(contentCssPath) ? fs.readFileSync(contentCssPath, 'utf8') : '';
      const contentJs = fs.existsSync(contentJsPath) ? fs.readFileSync(contentJsPath, 'utf8') : '';

      let heartbeatInterval: any = null;

      const checkAndInjectCode = `(() => {
        try {
          let style = document.getElementById('sales-zalo-injected-css');
          if (!style) {
            style = document.createElement('style');
            style.id = 'sales-zalo-injected-css';
            (document.head || document.documentElement).appendChild(style);
          }
          style.textContent = ${JSON.stringify(contentCss)};

          ${contentJs}
          return !!document.getElementById('sales-zalo-crm-widget');
        } catch(e) {
          console.error('[TourLuk Inject Error]', e);
          return false;
        }
      })()`;

      ws.onopen = () => {
        // 1. Kích hoạt Runtime, Page và Native Binding __tourluk_native_sync
        ws.send(JSON.stringify({ id: 100, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 101, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 102, method: 'Runtime.addBinding', params: { name: '__tourluk_native_sync' } }));

        // 2. Tự động nạp vào mọi tài liệu mới kể cả khi F5 / tải lại trang
        ws.send(JSON.stringify({
          id: 103,
          method: 'Page.addScriptToEvaluateOnNewDocument',
          params: { source: checkAndInjectCode }
        }));

        // 3. Thực thi ngay trên trang hiện tại
        ws.send(
          JSON.stringify({
            id: 104,
            method: 'Runtime.evaluate',
            params: { expression: checkAndInjectCode, returnByValue: true },
          }),
        );

        // 4. Cơ chế Heartbeat 24/7: Cứ 3 giây kiểm tra thanh widget một lần, nếu thiếu sẽ tự hồi phục ngay
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === 1) { // 1 = OPEN
            ws.send(
              JSON.stringify({
                id: 200,
                method: 'Runtime.evaluate',
                params: {
                  expression: `if (!document.getElementById('sales-zalo-crm-widget')) { ${checkAndInjectCode} }`,
                  returnByValue: true,
                },
              }),
            );
          } else {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
          }
        }, 3000);

        this.logger.log(`[Bridge] Đã kích hoạt cầu nối đồng bộ tin nhắn CDP 24/7 cho ${salesCode} (Port: ${debugPort})`);
      };

      ws.onmessage = async (event: any) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.bindingCalled' && msg.params?.name === '__tourluk_native_sync') {
            const rawPayload = msg.params.payload;
            const payload = JSON.parse(rawPayload);
            this.logger.log(
              `[Bridge] Nhận yêu cầu đồng bộ trực tiếp từ Zalo Web cho ${salesCode}, khách: ${payload.customer?.name}`,
            );

            try {
              const syncResult = await this.extensionSyncService.syncConversation(payload);
              // Gửi thông báo thành công trở lại giao diện Zalo Web
              const callbackExpr = `window.__tourluk_on_sync_done && window.__tourluk_on_sync_done(${JSON.stringify({ success: true, data: syncResult })})`;
              ws.send(JSON.stringify({ id: 103, method: 'Runtime.evaluate', params: { expression: callbackExpr } }));
            } catch (syncErr: any) {
              this.logger.error(`[Bridge] Lỗi syncConversation: ${syncErr.message}`);
              const callbackExpr = `window.__tourluk_on_sync_done && window.__tourluk_on_sync_done(${JSON.stringify({ success: false, error: syncErr.message })})`;
              ws.send(JSON.stringify({ id: 104, method: 'Runtime.evaluate', params: { expression: callbackExpr } }));
            }
          }
        } catch (err: any) {
          this.logger.error(`[Bridge] Lỗi xử lý đồng bộ: ${err.message}`);
        }
      };

      ws.onclose = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        this.activeWsBridges.delete(debugPort);
      };
      ws.onerror = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        this.activeWsBridges.delete(debugPort);
      };
    } catch (e: any) {
      this.activeWsBridges.delete(debugPort);
    }
  }

  /**
   * Đường dẫn gốc thư mục lưu trữ profile cô lập cho từng nhân viên
   */
  private getProfilesRootDir(): string {
    const root = path.resolve(process.cwd(), 'data', 'profiles');
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    return root;
  }

  /**
   * Đường dẫn thư mục tiện ích extension
   */
  private getExtensionDir(): string {
    const extPath = path.resolve(process.cwd(), '..', 'extension');
    if (fs.existsSync(extPath)) return extPath;
    const directPath = path.resolve(process.cwd(), 'apps', 'extension');
    if (fs.existsSync(directPath)) return directPath;
    return path.resolve('d:\\sales-zalo-project-docs\\apps\\extension');
  }

  /**
   * Tìm đường dẫn file thực thi Google Chrome trên máy chủ / hệ điều hành
   */
  private getChromeExecutable(): string {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ];

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    throw new BadRequestException(
      'Không tìm thấy trình duyệt Google Chrome trên máy chủ. Vui lòng cài đặt Google Chrome.',
    );
  }

  /**
   * Tạo cấu hình thiết bị giả lập độc lập cho từng nhân viên Sale
   */
  getDevicePreset(salesCode: string, salesName: string): DevicePreset {
    const code = salesCode.toUpperCase();
    switch (code) {
      case 'SALE01':
        return {
          deviceName: 'Thiết bị Giả lập 01 (Dell OptiPlex Win11)',
          deviceModel: 'Dell OptiPlex 7090 Micro',
          os: 'Windows 11 Pro 64-bit',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          viewport: { width: 1024, height: 800 },
        };
      case 'SALE02':
        return {
          deviceName: 'Thiết bị Giả lập 02 (Apple MacBook Pro M2)',
          deviceModel: 'MacBook Pro 14 (macOS Sonoma)',
          os: 'macOS 14.5 Sonoma',
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          viewport: { width: 1024, height: 800 },
        };
      case 'SALE03':
        return {
          deviceName: 'Thiết bị Giả lập 03 (Microsoft Surface Pro 9)',
          deviceModel: 'Surface Pro 9 (Win11 Tablet)',
          os: 'Windows 11 Pro',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          viewport: { width: 1024, height: 800 },
        };
      case 'SALE04':
        return {
          deviceName: 'Thiết bị Giả lập 04 (Lenovo ThinkPad X1)',
          deviceModel: 'ThinkPad X1 Carbon Gen 11',
          os: 'Windows 11 Pro',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          viewport: { width: 1024, height: 800 },
        };
      default:
        return {
          deviceName: `Thiết bị Giả lập ${code} (${salesName})`,
          deviceModel: `Workstation Riêng Biệt (${code})`,
          os: 'Windows 11 Workstation',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          viewport: { width: 1024, height: 800 },
        };
    }
  }

  /**
   * Chụp ảnh màn hình mã QR Zalo trực tiếp từ Chrome qua Chrome DevTools Protocol (CDP)
   */
  async captureQrFromCdp(salesCode: string, port: number): Promise<void> {
    if (this.capturingSet.has(salesCode)) {
      return;
    }
    this.capturingSet.add(salesCode);

    try {
      const http = await import('http');
      this.logger.log(`Bắt đầu trích xuất mã QR qua CDP cho ${salesCode} trên cổng ${port}...`);

      if (!this.qrCache.has(salesCode)) {
        this.qrCache.set(salesCode, {
          qrImage: null,
          status: 'STARTING',
          updatedAt: new Date(),
        });
      }

      // Thử kết nối tối đa 20 lần (nhanh chóng ở lần đầu, sau đó cách nhau 600ms)
      let connected = false;
      for (let i = 0; i < 20; i++) {
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 600));
        }
        try {
          const targets = await new Promise<any[]>((resolve, reject) => {
            http
              .get(`http://127.0.0.1:${port}/json`, (res) => {
                let d = '';
                res.on('data', (c) => (d += c));
                res.on('end', () => {
                  try {
                    resolve(JSON.parse(d));
                  } catch (e) {
                    reject(e);
                  }
                });
              })
              .on('error', reject);
          });

          const zaloPages = targets.filter(
            (t) => t.type === 'page' && (t.url.includes('zalo.me') || t.title.includes('Zalo')),
          );
          const page = zaloPages[zaloPages.length - 1];
          if (!page || !page.webSocketDebuggerUrl) continue;

          // Dùng WebSocket bản địa của Node.js
          const ws = new (globalThis as any).WebSocket(page.webSocketDebuggerUrl);

          await new Promise<void>((resolveWs, rejectWs) => {
            let checkInterval: any = null;
            let checkCount = 0;
            let hasCapturedQr = false;
            let lastCaptureTime = 0;
            let lastReloadTime = 0;

            // Cho phép chờ quét tối đa 3 phút (180 giây)
            const timeout = setTimeout(() => {
              if (checkInterval) clearInterval(checkInterval);
              try {
                ws.close();
              } catch {}
              rejectWs(new Error('WebSocket timeout sau 180s chờ quét QR'));
            }, 180000);

            let isCapturingScreenshot = false;

            const sendCheck = () => {
              checkCount++;
              if (checkCount > 300) {
                if (checkInterval) clearInterval(checkInterval);
                try {
                  ws.close();
                } catch {}
                rejectWs(new Error('QR check timeout'));
                return;
              }

              // Kiểm tra xem đã đăng nhập thành công hay chưa, hoặc lấy bounding box của QR
              ws.send(
                JSON.stringify({
                  id: 50,
                  method: 'Runtime.evaluate',
                  params: {
                    expression: `(() => {
                      const url = window.location.href;
                      const isOnIdZalo = url.includes('id.zalo.me');
                      const isOnChatZalo = url.includes('chat.zalo.me') || window.location.hostname.includes('chat.zalo.me');

                      // Kiểm tra đăng nhập thực sự trên chat.zalo.me bằng các thành phần giao diện chỉ có khi đã vào phiên
                      const hasAuthElements = Boolean(
                        document.querySelector('#main-tab') ||
                        document.querySelector('nav.nav__tabs') ||
                        document.querySelector('[data-id="div_Nav_Tab"]') ||
                        document.querySelector('[data-id="div_Tab_Chat"]') ||
                        document.querySelector('#contact-search-input') ||
                        document.querySelector('.conv-item') ||
                        document.querySelector('#chat-message-list') ||
                        document.querySelector('.chat-message-list') ||
                        document.querySelector('#zl-avatar') ||
                        document.querySelector('[data-id="div_Nav_Profile"]')
                      );

                      if (isOnChatZalo && !isOnIdZalo && hasAuthElements) {
                        return { isLoggedIn: true };
                      }

                      // Kiểm tra xem mã QR có bị hết hạn hay không
                      const expiredEl = document.querySelector('.qrcode-expired') || document.querySelector('[class*="expired"]');
                      const allText = document.body ? document.body.innerText : '';
                      const isExpired = Boolean(
                        (expiredEl &&
                         window.getComputedStyle(expiredEl).display !== 'none' &&
                         window.getComputedStyle(expiredEl).visibility !== 'hidden' &&
                         expiredEl.offsetWidth > 0) ||
                        (allText.includes('Mã QR hết hạn') && !hasAuthElements)
                      );

                      // Nếu mã QR hết hạn, tự động bấm 'Lấy mã mới' ngay lập tức
                      if (isExpired) {
                        const refreshBtn = (expiredEl ? (expiredEl.querySelector('a') || expiredEl.querySelector('.btn') || expiredEl.querySelector('button')) : null) ||
                          Array.from(document.querySelectorAll('a, button, div, span')).find(el => {
                            const t = (el.textContent || '').trim();
                            return (t === 'Lấy mã mới' || t.includes('Lấy mã mới')) && el.children.length === 0;
                          });

                        if (refreshBtn) {
                          try {
                            refreshBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                            refreshBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                            refreshBtn.click();
                          } catch (e) {}
                        }

                        // Trả về isExpired: true và KHÔNG trả về hasSvg / hasQr để tránh hiển thị mã hết hạn
                        return { isLoggedIn: false, isExpired: true, hasSvg: false, hasQr: false };
                      }

                      // Trích xuất mã QR dạng Vector SVG trực tiếp từ DOM Zalo (Ưu tiên số 1 - Sắc nét tuyệt đối)
                      const svgEl = document.querySelector('.qr-container svg') || document.querySelector('.qrcode svg');
                      if (svgEl) {
                        return {
                          isLoggedIn: false,
                          isExpired: false,
                          hasSvg: true,
                          svg: svgEl.outerHTML,
                        };
                      }

                      // Tìm vùng chứa mã QR thực tế (.qrcode hoặc .qr-container) làm dự phòng
                      const qrEl = document.querySelector('.qrcode') || document.querySelector('.qr-container');
                      if (qrEl) {
                        const rect = qrEl.getBoundingClientRect();
                        if (rect.width > 50 && rect.height > 50) {
                          return {
                            isLoggedIn: false,
                            isExpired: false,
                            hasQr: true,
                            clip: {
                              x: Math.round(rect.left),
                              y: Math.round(rect.top),
                              width: Math.round(rect.width),
                              height: Math.round(rect.height),
                            },
                          };
                        }
                      }

                      return { isLoggedIn: false, isExpired: false, hasQr: false };
                    })()`,
                    returnByValue: true,
                  },
                }),
              );
            };

            ws.onopen = () => {
              // Bật Page domain để bảo đảm Page.captureScreenshot hoạt động ổn định
              ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));

              this.qrCache.set(salesCode, {
                qrImage: this.qrCache.get(salesCode)?.qrImage || null,
                status: 'WAITING_FOR_QR',
                updatedAt: new Date(),
              });

              // Gửi kiểm tra ngay lập tức khi kết nối vừa mở
              sendCheck();

              // Vòng lặp kiểm tra định kỳ mỗi 800ms
              checkInterval = setInterval(sendCheck, 800);
            };

            ws.onmessage = async (event: any) => {
              try {
                const msg = JSON.parse(event.data);

                // Nhận kết quả kiểm tra DOM
                if (msg.id === 50) {
                  const info = msg.result?.result?.value;
                  if (!info) {
                    this.logger.warn(`CDP eval value is null/undefined: ${JSON.stringify(msg)}`);
                  }

                  if (info?.isLoggedIn) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    this.qrCache.set(salesCode, {
                      qrImage: null,
                      status: 'LOGGED_IN',
                      updatedAt: new Date(),
                    });
                    this.logger.log(`🎉 Tài khoản Zalo của ${salesCode} đã đăng nhập thành công!`);

                    // Cập nhật trạng thái ACTIVE vào cơ sở dữ liệu
                    try {
                      const u = await this.prisma.user.findFirst({
                        where: { OR: [{ code: salesCode }, { id: salesCode }] },
                      });
                      if (u) {
                        await this.prisma.integrationConnection.updateMany({
                          where: { userId: u.id, provider: ProviderType.ZALO_PERSONAL },
                          data: {
                            connectionStatus: ConnectionStatus.ACTIVE,
                            lastCheckedAt: new Date(),
                            lastErrorCode: null,
                          },
                        });
                      }
                    } catch (e: any) {
                      this.logger.warn(`Lỗi cập nhật connection ACTIVE cho ${salesCode}: ${e.message}`);
                    }

                    try {
                      ws.close();
                    } catch {}
                    resolveWs();
                    return;
                  }

                  // Xử lý khi mã QR bị hết hạn (Ưu tiên kiểm tra trước để không bao giờ hiển thị mã hết hạn)
                  if (info?.isExpired) {
                    const now = Date.now();
                    this.qrCache.set(salesCode, {
                      qrImage: this.qrCache.get(salesCode)?.qrImage || null,
                      status: 'WAITING_FOR_QR',
                      updatedAt: new Date(),
                      message: 'Mã QR đã hết hạn. Đang tự động đổi mã mới từ Zalo...',
                    });
                    if (now - lastReloadTime > 2500) {
                      lastReloadTime = now;
                      this.logger.log(`Mã QR của ${salesCode} bị hết hạn, đang tự động nạp lại trang...`);
                      ws.send(JSON.stringify({ id: 98, method: 'Page.reload' }));
                    }
                    return;
                  }

                  // Nếu mã QR có dạng SVG Vector (Ưu tiên số 1 - Sắc nét tuyệt đối, không lệch khung)
                  if (info?.hasSvg && info.svg) {
                    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(info.svg)}`;
                    this.qrCache.set(salesCode, {
                      qrImage: dataUri,
                      qrSvg: info.svg,
                      status: 'QR_READY',
                      updatedAt: new Date(),
                    });
                    if (!hasCapturedQr) {
                      hasCapturedQr = true;
                      this.logger.log(`✅ Đã trích xuất mã QR Vector sắc nét thành công cho ${salesCode}!`);
                    }
                  } else if (info?.hasQr && info.clip && !isCapturingScreenshot) {
                    // Dự phòng: Chụp ảnh mã QR từ CDP nếu không lấy được SVG
                    const now = Date.now();
                    const shouldCapture = !hasCapturedQr || (now - lastCaptureTime > 4000);
                    if (shouldCapture) {
                      isCapturingScreenshot = true;
                      lastCaptureTime = now;
                      this.logger.log(`Gửi lệnh Page.captureScreenshot cho ${salesCode} với clip: ${JSON.stringify(info.clip)}`);
                      ws.send(
                        JSON.stringify({
                          id: 52,
                          method: 'Page.captureScreenshot',
                          params: {
                            format: 'png',
                            clip: {
                              x: info.clip.x,
                              y: info.clip.y,
                              width: info.clip.width,
                              height: info.clip.height,
                              scale: 2,
                            },
                          },
                        }),
                      );
                    }
                  }
                }

                // Nhận kết quả chụp ảnh QR
                if (msg.id === 52) {
                  isCapturingScreenshot = false;
                  if (msg.error) {
                    this.logger.warn(`CDP screenshot error for ${salesCode}: ${JSON.stringify(msg.error)}`);
                  }
                  if (msg.result?.data) {
                    const dataUri = `data:image/png;base64,${msg.result.data}`;
                    this.qrCache.set(salesCode, {
                      qrImage: dataUri,
                      status: 'QR_READY',
                      updatedAt: new Date(),
                    });
                    if (!hasCapturedQr) {
                      hasCapturedQr = true;
                      this.logger.log(`✅ Đã chụp và cập nhật mã QR Zalo sắc nét thành công cho ${salesCode}!`);
                    }
                  }
                }
              } catch (err: any) {
                isCapturingScreenshot = false;
                this.logger.error(`Lỗi trong ws.onmessage: ${err.message}`);
              }
            };

            ws.onerror = (e: any) => {
              if (checkInterval) clearInterval(checkInterval);
              clearTimeout(timeout);
              rejectWs(e);
            };
          });

          connected = true;
          break;
        } catch (err: any) {
          // Tiếp tục thử lại ở lần lặp tiếp theo
        }
      }

      if (!connected) {
        this.qrCache.set(salesCode, {
          qrImage: null,
          status: 'ERROR',
          updatedAt: new Date(),
          error: 'Chưa thể tải trực tiếp ảnh QR qua giao thức nội bộ. Bạn có thể bấm "Mở Cửa Sổ Trình Duyệt" để quét trực tiếp.',
        });
      }
    } finally {
      this.capturingSet.delete(salesCode);
    }
  }

  /**
   * Lấy mã QR hiện tại của profile (Tự động phục hồi nếu Chrome chưa khởi chạy)
   */
  async getProfileQr(salesCode: string) {
    let item = this.qrCache.get(salesCode);
    const debugPort = this.getDebugPort(salesCode);
    const isListening = await this.isPortListening(debugPort);

    if (!isListening) {
      this.logger.log(`Port ${debugPort} chưa mở cho ${salesCode}, đang tự động khởi chạy Chrome profile...`);
      await this.launchProfile(salesCode, 'system');
      item = this.qrCache.get(salesCode);
    } else if (!this.capturingSet.has(salesCode) && (!item || (item.status !== 'QR_READY' && item.status !== 'LOGGED_IN'))) {
      this.captureQrFromCdp(salesCode, debugPort).catch(() => {});
    }

    if (!item) {
      return {
        status: 'WAITING_FOR_QR',
        qrImage: null,
        message: 'Đang khởi động thiết bị và chuẩn bị mã QR...',
      };
    }
    return item;
  }

  /**
   * Đưa cửa sổ Chrome của Sale lên đầu màn hình
   */
  async focusProfileWindow(salesCode: string) {
    const chromePath = this.getChromeExecutable();
    const rootDir = this.getProfilesRootDir();
    const profileDir = path.join(rootDir, salesCode);
    const targetUrl = `https://chat.zalo.me#salesCode=${salesCode}`;
    const debugPort = this.getDebugPort(salesCode);

    const isListening = await this.isPortListening(debugPort);
    if (!isListening) {
      await this.launchProfile(salesCode, 'system');
    }

    if (process.platform === 'win32') {
      try {
        const { exec } = await import('child_process');
        const psCmd = `powershell -NoProfile -NonInteractive -Command "$w = New-Object -ComObject WScript.Shell; $w.AppActivate('Zalo')"`;
        exec(psCmd, (err) => {
          if (err) this.logger.warn(`Không thể focus cửa sổ Chrome: ${err.message}`);
        });
      } catch (e: any) {
        this.logger.warn(`Không thể focus cửa sổ Chrome: ${e.message}`);
      }
    }

    return {
      success: true,
      message: `Đã đưa cửa sổ Zalo của ${salesCode} lên màn hình!`,
    };
  }

  /**
   * Kích hoạt làm mới mã QR trên Zalo Web (bấm nút Lấy mã mới hoặc tải lại)
   */
  async refreshProfileQr(salesCode: string) {
    const debugPort = this.getDebugPort(salesCode);
    const http = await import('http');
    try {
      const targets = await new Promise<any[]>((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${debugPort}/json`, (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => {
              try {
                resolve(JSON.parse(d));
              } catch (e) {
                reject(e);
              }
            });
          })
          .on('error', reject);
      });

      const zaloPages = targets.filter(
        (t) => t.type === 'page' && (t.url.includes('zalo.me') || t.title.includes('Zalo')),
      );
      const page = zaloPages[zaloPages.length - 1];
      if (page && page.webSocketDebuggerUrl) {
        const ws = new (globalThis as any).WebSocket(page.webSocketDebuggerUrl);
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              id: 99,
              method: 'Runtime.evaluate',
              params: {
                expression: `(() => {
                  const expiredEl = document.querySelector('.qrcode-expired') || document.querySelector('[class*="expired"]');
                  const refreshBtn = (expiredEl ? (expiredEl.querySelector('a') || expiredEl.querySelector('.btn') || expiredEl.querySelector('button')) : null) ||
                    Array.from(document.querySelectorAll('a, button, div, span')).find(el => {
                      const t = (el.textContent || '').trim();
                      return (t === 'Lấy mã mới' || t.includes('Lấy mã mới')) && el.children.length === 0;
                    });
                  if (refreshBtn) {
                    try {
                      refreshBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                      refreshBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                      refreshBtn.click();
                      return 'clicked';
                    } catch (e) {}
                  }
                  window.location.reload();
                  return 'reloaded';
                })()`,
              },
            }),
          );
          setTimeout(() => {
            try {
              ws.close();
            } catch {}
          }, 600);
        };
      }
    } catch (e: any) {
      this.logger.warn(`Lỗi refreshProfileQr cho ${salesCode}: ${e.message}`);
    }

    this.qrCache.delete(salesCode);
    // Kích hoạt ngay luồng trích xuất mã QR mới
    this.captureQrFromCdp(salesCode, debugPort).catch(() => {});
    return { success: true, message: 'Đã yêu cầu làm mới mã QR!' };
  }

  /**
   * Lấy danh sách tất cả các profile giả lập thiết bị và trạng thái vận hành
   */
  async getAllProfiles(): Promise<ProfileStatusItem[]> {
    const rootDir = this.getProfilesRootDir();
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        role: true,
        connections: {
          where: { provider: ProviderType.ZALO_PERSONAL },
          select: {
            id: true,
            connectionStatus: true,
            lastCheckedAt: true,
            accountLabel: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const result: ProfileStatusItem[] = [];

    for (const u of users) {
      const profilePath = path.join(rootDir, u.code);
      const conn = u.connections[0];
      const hasSession = fs.existsSync(profilePath);
      const runningInfo = this.activeProcesses.get(u.code);
      const debugPort = this.getDebugPort(u.code);

      // Kiểm tra trạng thái thực tế qua cổng CDP
      const sessionState = await this.checkChromeSessionState(debugPort);
      const isRunning = sessionState.isAlive;
      const pid = runningInfo?.pid || null;
      if (!sessionState.isAlive && runningInfo) {
        this.activeProcesses.delete(u.code);
      }

      // Xác định trạng thái kết nối chuẩn xác (Tuyệt đối không giả mạo ACTIVE nếu chưa đăng nhập thật)
      let connectionStatus: ConnectionStatus;

      if (!sessionState.isAlive) {
        // Trình duyệt chưa khởi chạy
        connectionStatus = hasSession ? ConnectionStatus.NOT_CONNECTED : ConnectionStatus.NOT_CONFIGURED;
      } else if (sessionState.isOnLogin) {
        // Trình duyệt đang chạy nhưng ở màn hình đăng nhập QR
        if (conn?.connectionStatus === ConnectionStatus.ACTIVE) {
          // Trước đó đã từng đăng nhập, nhưng giờ bị điều hướng về login -> Phiên hết hạn!
          connectionStatus = ConnectionStatus.ERROR;
          await this.prisma.integrationConnection
            .update({
              where: { id: conn.id },
              data: {
                connectionStatus: ConnectionStatus.ERROR,
                lastErrorCode: 'SESSION_EXPIRED',
                lastCheckedAt: new Date(),
              },
            })
            .catch(() => {});
        } else {
          // Chưa đăng nhập, đang chờ quét QR thực tế
          connectionStatus = ConnectionStatus.CONNECTING;
        }
      } else if (sessionState.isOnChat) {
        // Đang ở trong giao diện chat.zalo.me thật
        connectionStatus = ConnectionStatus.ACTIVE;
        if (conn && conn.connectionStatus !== ConnectionStatus.ACTIVE) {
          await this.prisma.integrationConnection
            .update({
              where: { id: conn.id },
              data: { connectionStatus: ConnectionStatus.ACTIVE, lastCheckedAt: new Date(), lastErrorCode: null },
            })
            .catch(() => {});
        }
      } else {
        // Đang khởi chạy hoặc nạp trang
        connectionStatus = ConnectionStatus.CONNECTING;
      }

      const device = this.getDevicePreset(u.code, u.name);

      result.push({
        salesCode: u.code,
        salesName: u.name,
        userId: u.id,
        device,
        isRunning,
        pid,
        profilePath,
        hasSession,
        connectionStatus,
        lastSyncAt: conn?.lastCheckedAt || null,
        conversationCount: u._count.conversations,
      });
    }

    return result;
  }

  /**
   * Khởi chạy cửa sổ Chrome giả lập thiết bị độc lập để quét mã QR Zalo
   */
  async launchProfile(salesCode: string, currentUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ code: salesCode }, { id: salesCode }],
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên Sale với mã: ${salesCode}`);
    }

    const chromePath = this.getChromeExecutable();
    const rootDir = this.getProfilesRootDir();
    const profileDir = path.join(rootDir, user.code);
    const extensionDir = this.getExtensionDir();

    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    const device = this.getDevicePreset(user.code, user.name);
    const debugPort = this.getDebugPort(user.code);

    // Kiểm tra cổng debug xem tiến trình thực sự còn sống hay không
    const isListening = await this.isPortListening(debugPort);
    if (isListening) {
      this.captureQrFromCdp(user.code, debugPort).catch(() => {});
      return {
        success: true,
        message: `Cửa sổ giả lập "${device.deviceName}" đang mở sẵn trên máy chủ (Port: ${debugPort})!`,
        profileDir,
        device,
        debugPort,
        isAlreadyRunning: true,
      };
    }

    this.activeProcesses.delete(user.code);

    // Thiết lập các tham số môi trường:
    // - --remote-debugging-port: Cho phép webapp trích xuất ảnh mã QR truyền trực tiếp vào Popup Modal
    // - --user-data-dir: Lưu riêng cookie, session vào thư mục của Sale
    // - --load-extension: Tự động nạp extension đồng bộ CRM
    const targetUrl = `https://chat.zalo.me#salesCode=${user.code}`;
    const args = [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      `--load-extension=${extensionDir}`,
      `--disable-extensions-except=${extensionDir}`,
      `--window-size=${device.viewport.width},${device.viewport.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-default-apps',
      '--new-window',
      targetUrl,
    ];

    this.logger.log(`Đang khởi chạy Chrome cho ${user.code} (Debug Port: ${debugPort}): ${args.join(' ')}`);

    const chromeProcess = spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore',
    });
    chromeProcess.unref();
    this.activeProcesses.set(user.code, {
      pid: chromeProcess.pid || 0,
      process: chromeProcess,
      launchedAt: new Date(),
    });

    // Đưa cửa sổ Chrome lên đầu màn hình để người dùng thấy ngay trên desktop
    if (process.platform === 'win32') {
      setTimeout(() => {
        this.focusProfileWindow(user.code).catch(() => {});
      }, 1500);
    }

    // Chụp ảnh mã QR từ CDP ngầm để truyền về Webapp Modal
    this.captureQrFromCdp(user.code, debugPort).catch((e) => {
      this.logger.warn(`Lỗi CDP capture cho ${user.code}: ${e.message}`);
    });

    // Cập nhật trạng thái kết nối trong DB (CONNECTING nếu chưa từng active)
    let connection = await this.prisma.integrationConnection.findFirst({
      where: {
        userId: user.id,
        provider: ProviderType.ZALO_PERSONAL,
      },
    });

    const existingIsActive = connection?.connectionStatus === ConnectionStatus.ACTIVE;
    const initialStatus = existingIsActive ? ConnectionStatus.ACTIVE : ConnectionStatus.CONNECTING;

    if (!connection) {
      connection = await this.prisma.integrationConnection.create({
        data: {
          userId: user.id,
          provider: ProviderType.ZALO_PERSONAL,
          accountLabel: `${device.deviceName} (${user.name})`,
          connectionStatus: initialStatus,
          lastCheckedAt: new Date(),
          isDemo: false,
        },
      });
    } else {
      await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          accountLabel: `${device.deviceName} (${user.name})`,
          connectionStatus: initialStatus,
          lastCheckedAt: new Date(),
          lastErrorCode: null,
        },
      });
    }

    // Ghi nhật ký kiểm toán (an toàn với foreign key)
    if (currentUserId && currentUserId !== 'system') {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: currentUserId,
            action: AuditAction.UPDATE_CONNECTION,
            resource: 'SIMULATED_DEVICE_PROFILE',
            resourceId: user.code,
            details: `Đã khởi chạy cửa sổ giả lập "${device.deviceName}" cho nhân viên ${user.name} (${user.code})`,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Lỗi ghi audit log: ${err.message}`);
      }
    }

    return {
      success: true,
      message: `Đã khởi chạy cửa sổ giả lập "${device.deviceName}". Mã QR đang được tải lên màn hình!`,
      pid: 0,
      profileDir,
      device,
      debugPort,
      isAlreadyRunning: false,
    };
  }

  /**
   * Tắt cửa sổ Chrome giả lập của nhân viên
   */
  async stopProfile(salesCode: string, currentUserId: string) {
    const running = this.activeProcesses.get(salesCode);
    const debugPort = this.getDebugPort(salesCode);

    this.logger.log(`Yêu cầu tắt cửa sổ giả lập cho ${salesCode} (Cổng ${debugPort}, PID đã lưu: ${running?.pid || 'không có'})...`);

    // 1. Thử gửi lệnh Browser.close qua CDP WebSocket (Đóng nhẹ nhàng và chuẩn xác)
    try {
      const http = await import('http');
      const version = await new Promise<any>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${debugPort}/json/version`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(800, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });

      if (version?.webSocketDebuggerUrl) {
        const ws = new (globalThis as any).WebSocket(version.webSocketDebuggerUrl);
        ws.onopen = () => {
          ws.send(JSON.stringify({ id: 100, method: 'Browser.close' }));
          setTimeout(() => {
            try {
              ws.close();
            } catch {}
          }, 300);
        };
      }
    } catch {}

    // Chờ 300ms để Chrome tự thoát
    await new Promise((r) => setTimeout(r, 300));

    // 2. Nếu tiến trình vẫn còn chạy (hoặc sau khi server khởi động lại mất activeProcesses):
    if (running?.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/F', '/T', '/PID', running.pid.toString()]);
        } else {
          process.kill(running.pid, 'SIGTERM');
        }
      } catch {}
    }

    // 3. Quét và kill mọi tiến trình đang chiếm cổng debugPort của nhân viên này
    if (process.platform === 'win32') {
      try {
        const { execSync } = await import('child_process');
        const out = execSync(`netstat -ano | findstr :${debugPort}`).toString();
        for (const line of out.split('\n')) {
          if (line.includes('LISTENING') || line.includes('Listen')) {
            const parts = line.trim().split(/\s+/);
            const pid = parseInt(parts[parts.length - 1], 10);
            if (pid && !isNaN(pid) && pid > 0) {
              try {
                execSync(`taskkill /F /T /PID ${pid}`);
                this.logger.log(`Đã taskkill PID ${pid} chiếm cổng ${debugPort} của ${salesCode}`);
              } catch {}
            }
          }
        }
      } catch {}
    }

    // 4. Xóa sạch cache theo dõi
    this.activeProcesses.delete(salesCode);
    this.qrCache.delete(salesCode);
    this.capturingSet.delete(salesCode);

    if (currentUserId && currentUserId !== 'system') {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: currentUserId,
            action: AuditAction.UPDATE_CONNECTION,
            resource: 'SIMULATED_DEVICE_PROFILE',
            resourceId: salesCode,
            details: `Đã dừng tiến trình cửa sổ giả lập ${salesCode}`,
          },
        });
      } catch {}
    }

    return { success: true, message: `Đã đóng cửa sổ giả lập của nhân viên ${salesCode}.` };
  }

  /**
   * Đặt lại phiên (Reset session) để quét mã QR lại từ đầu
   */
  async resetProfile(salesCode: string, currentUserId: string) {
    await this.stopProfile(salesCode, currentUserId);
    const rootDir = this.getProfilesRootDir();
    const profileDir = path.join(rootDir, salesCode);

    if (fs.existsSync(profileDir)) {
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
      } catch (err: any) {
        this.logger.warn(`Không thể xóa sạch thư mục profile ${profileDir}: ${err.message}`);
      }
    }

    this.qrCache.delete(salesCode);

    // Cập nhật lại connection trong DB về NOT_CONNECTED
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ code: salesCode }, { id: salesCode }] },
    });
    if (user) {
      await this.prisma.integrationConnection.updateMany({
        where: { userId: user.id, provider: ProviderType.ZALO_PERSONAL },
        data: {
          connectionStatus: ConnectionStatus.NOT_CONNECTED,
          lastErrorCode: 'SESSION_RESET',
        },
      });
    }

    if (currentUserId && currentUserId !== 'system') {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: currentUserId,
            action: AuditAction.UPDATE_CONNECTION,
            resource: 'SIMULATED_DEVICE_PROFILE',
            resourceId: salesCode,
            details: `Đã xóa dữ liệu phiên (Reset Profile) để quét QR lại từ đầu cho ${salesCode}`,
          },
        });
      } catch {}
    }

    return {
      success: true,
      message: `Đã đặt lại dữ liệu phiên của ${salesCode}. Khi mở lại sẽ hiển thị mã QR mới tinh để nhân viên quét lại.`,
    };
  }
}

