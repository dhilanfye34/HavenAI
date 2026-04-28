const { notarize } = require("@electron/notarize");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  if (!process.env.APPLE_ID || !process.env.APPLE_APP_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log("Skipping macOS notarization because Apple notarization credentials are not configured.");
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appPath}...`);

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log("Notarization complete.");
};
