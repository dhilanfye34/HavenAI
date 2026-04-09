// Known-safe fragments for process names and network hosts.
// Used across the dashboard to decide whether to flag an item as suspicious.

export const KNOWN_SAFE_FRAGMENTS = [
  'finder', 'dock', 'systemuiserver', 'loginwindow', 'windowserver',
  'launchd', 'kernel_task', 'spotlight', 'mds',
  'coreaudiod', 'bluetoothd', 'airportd', 'configd', 'distnoted',
  'chrome', 'google chrome', 'safari', 'firefox', 'arc', 'brave',
  'slack', 'discord', 'zoom', 'microsoft teams', 'teams',
  'code', 'visual studio code', 'cursor',
  'iterm', 'terminal', 'warp', 'alacritty',
  'spotify', 'music', 'apple music',
  'notes', 'reminders', 'calendar', 'mail',
  'messages', 'facetime', 'photos',
  'preview', 'textedit', 'pages', 'numbers', 'keynote',
  'activity monitor', 'system preferences', 'system settings',
  'figma', 'notion', 'obsidian', 'linear',
  'docker', 'node', 'python', 'ruby', 'java', 'go',
  'electron', 'havenai', 'haven',
  'stocks', 'stockswidget', 'weather', 'weatherwidget',
  'notificationcenter', 'usernoted', 'coreservices',
  'cfprefsd', 'nsurlsessiond', 'trustd', 'opendirectoryd',
  'logd', 'syslogd', 'sharingd', 'rapportd',
  'bird', 'cloudd', 'assistantd', 'siri', 'suggestd',
  'backupd', 'timed', 'powerd', 'thermald',
  'amfid', 'endpointsecurity', 'syspolicyd',
  'axvisual', 'universalaccess', 'voiceover',
  'iconservices', 'lsd', 'corebrightness',
  'watchdogd', 'symptomsd', 'networkserviceproxy',
  'wifid', 'apsd', 'identityservices',
];

export function isKnownSafe(name: string): boolean {
  const lower = name.toLowerCase();
  return KNOWN_SAFE_FRAGMENTS.some((frag) => lower.includes(frag));
}

export const SAFE_HOST_FRAGMENTS = [
  'apple.com', 'icloud.com', 'googleapis.com', 'google.com', 'gstatic.com',
  'googleusercontent.com', 'googlevideo.com', 'google-analytics.com',
  'microsoft.com', 'office.com', 'office365.com', 'live.com', 'msn.com',
  'github.com', 'githubusercontent.com', 'github.io',
  'cloudflare.com', 'cloudflare-dns.com', 'cloudflare.net',
  'amazonaws.com', 'aws.amazon.com', 'amazon.com',
  'slack.com', 'discord.com', 'discord.gg',
  'spotify.com', 'scdn.co',
  'akamai.net', 'akamaized.net', 'akamaitechnologies.com',
  'fastly.net', 'fastlylb.net',
  'cloudfront.net',
  'facebook.com', 'meta.com', 'whatsapp.com', 'fbcdn.net', 'instagram.com',
  'notion.so', 'figma.com', 'linear.app', 'vercel.app', 'vercel-dns.com',
  'anthropic.com', 'openai.com',
  'docker.com', 'docker.io',
  'npmjs.org', 'npmjs.com', 'yarnpkg.com',
  'sentry.io', 'segment.io', 'segment.com',
  'stripe.com', 'twilio.com',
  'zoom.us', 'zoomgov.com',
  'dropbox.com', 'dropboxapi.com',
  'adobe.com', 'typekit.net',
  'stackoverflow.com', 'stackexchange.com',
  'wikipedia.org', 'wikimedia.org',
  'reddit.com', 'redd.it',
  'twitter.com', 'x.com', 'twimg.com',
  'linkedin.com',
  'youtube.com', 'ytimg.com', 'yt3.ggpht.com',
];

export function isSafeHost(hostname?: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return SAFE_HOST_FRAGMENTS.some((frag) => h.includes(frag));
}
