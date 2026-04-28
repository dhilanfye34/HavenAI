export type DesktopPlatform = 'darwin' | 'win32' | 'linux' | string;

export interface PlatformCopy {
  secureStorageName: string;
  permissionSettingsName: string;
  setupDescriptions: {
    file: string;
    process: string;
    network: string;
  };
  stillBlockedMessage: string;
}

export function getDesktopPlatform(): DesktopPlatform {
  if (typeof window === 'undefined') return 'unknown';
  return (window as any).havenai?.platform || 'unknown';
}

export function getPlatformCopy(platform: DesktopPlatform = getDesktopPlatform()): PlatformCopy {
  if (platform === 'darwin') {
    return {
      secureStorageName: 'macOS Keychain',
      permissionSettingsName: 'Privacy settings',
      setupDescriptions: {
        file:
          'macOS needs Full Disk Access to let HavenAI see activity inside Desktop and Downloads. Grant it in System Settings and we will pick it up automatically.',
        process:
          'HavenAI lists running apps and flags suspicious spawns. This usually works without extra permissions, but the re-check below will confirm.',
        network:
          'Full Disk Access helps here too. Without it, macOS hides the process-to-socket mapping. You will still get most signals even if this stays limited.',
      },
      stillBlockedMessage:
        'Still blocked. In Privacy & Security > Full Disk Access, make sure HavenAI is toggled on. macOS sometimes needs a moment to apply it.',
    };
  }

  if (platform === 'win32') {
    return {
      secureStorageName: 'Windows DPAPI',
      permissionSettingsName: 'Windows privacy settings',
      setupDescriptions: {
        file:
          'Windows usually lets HavenAI watch your Desktop and Downloads without extra setup. If access is blocked, check Windows privacy or security settings, then re-check here.',
        process:
          'HavenAI lists running apps and flags suspicious spawns. This normally works without extra Windows permissions, but the re-check below will confirm.',
        network:
          'HavenAI watches outbound connections and suspicious remote hosts. Windows normally allows this in standard mode, but the re-check below will confirm what is available.',
      },
      stillBlockedMessage:
        'Still blocked. Check Windows privacy or security settings for HavenAI, then try the re-check again.',
    };
  }

  if (platform === 'linux') {
    return {
      secureStorageName: 'your system keychain',
      permissionSettingsName: 'system permissions',
      setupDescriptions: {
        file:
          'Linux usually lets HavenAI watch your home folders without extra setup. If access is blocked, check folder permissions or sandbox settings, then re-check here.',
        process:
          'HavenAI lists running processes and flags suspicious spawns. This normally works without extra Linux permissions, but the re-check below will confirm.',
        network:
          'HavenAI watches outbound connections and suspicious remote hosts. Some process-level network details may depend on your distro permissions.',
      },
      stillBlockedMessage:
        'Still blocked. Check folder, process, or sandbox permissions for HavenAI, then try the re-check again.',
    };
  }

  return {
    secureStorageName: 'your operating system secure storage',
    permissionSettingsName: 'system permissions',
    setupDescriptions: {
      file:
        'HavenAI watches your important folders for unusual writes and bulk edits. If access is blocked, check your system permissions, then re-check here.',
      process:
        'HavenAI lists running apps and flags suspicious spawns. This usually works without extra permissions, but the re-check below will confirm.',
      network:
        'HavenAI watches outbound connections and suspicious remote hosts. Some details may depend on your operating system permissions.',
    },
    stillBlockedMessage:
      'Still blocked. Check your operating system permissions for HavenAI, then try the re-check again.',
  };
}
