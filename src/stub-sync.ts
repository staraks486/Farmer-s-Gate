// Stub SyncManager and PeriodicSyncManager prototype/instance to prevent background sync DOMExceptions in iframe/sandboxed/headless/automated environments.
if (typeof self !== 'undefined') {
  try {
    const mockSyncManager = {
      register: function(tag: string) {
        console.warn(`[Sync Stub] Bypassed registering sync tag "${tag}" to avoid DOMException.`);
        return Promise.resolve();
      },
      getTags: function() {
        return Promise.resolve([]);
      },
      unregister: function() {
        return Promise.resolve();
      }
    };

    // Stub the constructors if they exist in global scope (self)
    if ('SyncManager' in self) {
      try {
        (self as any).SyncManager.prototype.register = function(tag: string) {
          console.warn(`[Sync Stub] register bypassed on SyncManager.prototype for "${tag}".`);
          return Promise.resolve();
        };
      } catch (e) {}
    }
    if ('PeriodicSyncManager' in self) {
      try {
        (self as any).PeriodicSyncManager.prototype.register = function(tag: string) {
          console.warn(`[Sync Stub] register bypassed on PeriodicSyncManager.prototype for "${tag}".`);
          return Promise.resolve();
        };
      } catch (e) {}
    }

    // Intercept getters on ServiceWorkerRegistration prototype
    if ('ServiceWorkerRegistration' in self) {
      const swrProto = (self as any).ServiceWorkerRegistration.prototype;

      try {
        Object.defineProperty(swrProto, 'sync', {
          configurable: true,
          enumerable: true,
          get: function() {
            return mockSyncManager;
          }
        });
      } catch (e) {
        console.warn('[Sync Stub] Failed to define sync getter on prototype:', e);
      }

      try {
        Object.defineProperty(swrProto, 'periodicSync', {
          configurable: true,
          enumerable: true,
          get: function() {
            return mockSyncManager;
          }
        });
      } catch (e) {
        console.warn('[Sync Stub] Failed to define periodicSync getter on prototype:', e);
      }
    }

    // Comprehensive interception of navigator.serviceWorker registration APIs
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const swContainer = navigator.serviceWorker;
      
      const stubRegistration = (reg: any) => {
        if (!reg) return reg;
        try {
          Object.defineProperty(reg, 'sync', {
            configurable: true,
            enumerable: true,
            get: function() { return mockSyncManager; }
          });
        } catch (e) {}
        try {
          Object.defineProperty(reg, 'periodicSync', {
            configurable: true,
            enumerable: true,
            get: function() { return mockSyncManager; }
          });
        } catch (e) {}
        return reg;
      };

      // 1. Intercept register method
      const origRegister = swContainer.register;
      swContainer.register = function(...args: any[]) {
        return origRegister.apply(this, args).then((reg) => stubRegistration(reg));
      };

      // 2. Intercept getRegistration method
      const origGetRegistration = swContainer.getRegistration;
      swContainer.getRegistration = function(...args: any[]) {
        return origGetRegistration.apply(this, args).then((reg) => stubRegistration(reg));
      };

      // 3. Intercept getRegistrations method
      const origGetRegistrations = swContainer.getRegistrations;
      swContainer.getRegistrations = function(...args: any[]) {
        return origGetRegistrations.apply(this, args).then((regs) => {
          if (regs && Array.isArray(regs)) {
            regs.forEach(stubRegistration);
          }
          return regs;
        });
      };

      // 4. Intercept ready getter property
      try {
        const origReadyDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(swContainer), 'ready');
        if (origReadyDesc && origReadyDesc.get) {
          Object.defineProperty(swContainer, 'ready', {
            configurable: true,
            enumerable: true,
            get: function() {
              return origReadyDesc.get!.call(this).then((reg: any) => stubRegistration(reg));
            }
          });
        } else {
          // Fallback if prototype getter description is not accessible
          const origReady = swContainer.ready;
          if (origReady && typeof origReady.then === 'function') {
            Object.defineProperty(swContainer, 'ready', {
              configurable: true,
              enumerable: true,
              get: function() {
                return origReady.then((reg: any) => stubRegistration(reg));
              }
            });
          }
        }
      } catch (e) {
        console.warn('[Sync Stub] Failed to intercept navigator.serviceWorker.ready:', e);
      }
    }
  } catch (err) {
    console.warn('[Sync Stub] Failed to establish bulletproof sync stub:', err);
  }
}

