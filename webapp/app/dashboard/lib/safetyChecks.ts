// Known-safe fragments for process names and network hosts.
// Used across the dashboard to decide whether to flag an item as suspicious.

export const KNOWN_SAFE_FRAGMENTS = [
  // macOS core UI
  'finder', 'dock', 'systemuiserver', 'loginwindow', 'windowserver',
  'controlcenter', 'windowmanager', 'notificationcenter',
  'universalcontrol', 'universalaccess', 'airplayuiagent',
  // macOS kernel & init
  'launchd', 'kernel_task', 'spotlight',
  // Spotlight & metadata
  'mds', 'mds_stores', 'mdworker', 'corespotlightd',
  // Audio & media
  'coreaudiod', 'audioaccessoryd', 'mediaremoted', 'mediaanalysisd',
  // Networking
  'bluetoothd', 'airportd', 'configd', 'distnoted',
  'wifid', 'apsd', 'identityservices', 'networkserviceproxy',
  'mDNSResponder', 'WiFiAgent', 'rapportd', 'sharingd',
  // Power, time, scheduling
  'timed', 'powerd', 'thermald', 'thermalmonitord', 'coreduetd',
  'dasd', 'routined', 'duetexpertd', 'chronod',
  // Logging, diagnostics, crash reporting
  'logd', 'syslogd', 'diagnosticd', 'analyticsd', 'symptomsd',
  'reportcrash', 'spindump',
  // Security & auth
  'trustd', 'securityd', 'endpointsecurity', 'syspolicyd',
  'amfid', 'keybagd', 'tccd', 'sandboxd', 'taskgated',
  // Cloud & sync
  'bird', 'cloudd', 'nsurlsessiond', 'cloudtelemetryservice',
  'cloudpaird', 'cloudphotod', 'secd',
  // Contacts, calendar, comms
  'contactsd', 'contactsdonationagent', 'calendaragent',
  'addressbooksourcesync', 'callservicesd', 'commcenter',
  'imagent', 'imdpersistenceagent', 'imtransferagent',
  // Intelligence & biome
  'biomeagent', 'knowledgeconstructiond', 'contextstored',
  'categoriesservice', 'translationd',
  // Siri & assistant
  'assistantd', 'siri', 'siriknowledged', 'suggestd',
  // Config & prefs
  'cfprefsd', 'opendirectoryd', 'containermanagerd',
  // Fonts & extensions
  'fontd', 'fontworker', 'extensionkitservice', 'pluginkit', 'pkd',
  // App Store & updates
  'appstoreagent', 'softwareupdated', 'storeaccountd', 'storekitagent',
  'amsaccountsd', 'amsengagementd', 'ampdevicediscoveryagent',
  // File system
  'fseventsd', 'diskarbitrationd', 'revisiond',
  // Continuity & Sidecar
  'sidecarrelay', 'continuitycaptureagent', 'continuityd',
  // Intents & Siri shortcuts
  'intents_', 'intentsd', 'sabortagent',
  // News & widgets
  'newstoday', 'newstoday2',
  // WebKit & UI helpers
  'com.apple.webkit', 'webkit', 'webcontentprocess',
  'viewbridgeauxiliary', 'textinputmenuagent', 'textinputmenu',
  'nsattributedstringagent', 'quicklookuiservice',
  // Software update
  'softwareupdatenotificationmanager', 'softwareupdate',
  // Proactive intelligence
  'proactived', 'promotedcontentd', 'contextstoreagent',
  // User events
  'usereventagent',
  // WiFi
  'wifiagent',
  // Linking & misc
  'linkd', 'keychainaccess', 'securityagent',
  // Other system
  'usernoted', 'coreservices', 'coreservicesd',
  'iconservices', 'lsd', 'corebrightness',
  'watchdogd', 'axvisual', 'voiceover',
  'backupd', 'remoted', 'dmd',
  'openwith', 'applepushserviced', 'trustdfilehelper',
  'com.apple.appkit', 'openandsavepanelservice',
  'screentimewidget', 'bluetoothuserd', 'diagnostics_agent',
  // Browsers
  'chrome', 'google chrome', 'safari', 'firefox', 'arc', 'brave',
  // Communication apps
  'slack', 'discord', 'zoom', 'microsoft teams', 'teams',
  // Dev tools
  'code', 'visual studio code', 'cursor',
  'iterm', 'terminal', 'warp', 'alacritty',
  'docker', 'node', 'python', 'ruby', 'java', 'go',
  // Productivity
  'figma', 'notion', 'obsidian', 'linear',
  'notes', 'reminders', 'calendar', 'mail',
  'messages', 'facetime', 'photos',
  'preview', 'textedit', 'pages', 'numbers', 'keynote',
  'activity monitor', 'system preferences', 'system settings',
  // Media
  'spotify', 'music', 'apple music',
  // Widgets
  'stocks', 'stockswidget', 'weather', 'weatherwidget',
  // HavenAI
  'electron', 'havenai', 'haven',
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
