"""
Download Routes

Provides download links and metadata for the HavenAI desktop app.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

APP_VERSION = "0.1.5"
REPO_SLUG = "dhilanfye34/HavenAI"
RELEASE_BASE = f"https://github.com/{REPO_SLUG}/releases/download/v{APP_VERSION}"


def _asset_url(filename: str) -> str:
    """Build a direct GitHub release asset URL for this project."""
    return f"{RELEASE_BASE}/{filename}"

DOWNLOADS = {
    "macos": {
        "platform": "macos",
        "label": "macOS",
        "filename": f"HavenAI-{APP_VERSION}-arm64.dmg",
        "url": _asset_url(f"HavenAI-{APP_VERSION}-arm64.dmg"),
        "size": "130 MB",
        "min_os": "macOS 12 (Monterey)",
        "arch": "Apple Silicon (M1+) · Intel via Rosetta",
    },
    "windows": {
        "platform": "windows",
        "label": "Windows",
        "filename": f"HavenAI-Setup-{APP_VERSION}.exe",
        "url": _asset_url(f"HavenAI-Setup-{APP_VERSION}.exe"),
        "size": "78 MB",
        "min_os": "Windows 10 (64-bit)",
        "arch": "x64",
    },
    "linux": {
        "platform": "linux",
        "label": "Linux",
        "filename": f"HavenAI-{APP_VERSION}.AppImage",
        "url": _asset_url(f"HavenAI-{APP_VERSION}.AppImage"),
        "size": "90 MB",
        "min_os": "Ubuntu 20.04+ / Fedora 34+",
        "arch": "x64",
    },
}


class DownloadInfo(BaseModel):
    platform: str
    label: str
    filename: str
    url: str
    size: str
    min_os: str
    arch: str


class DownloadsResponse(BaseModel):
    version: str
    platforms: dict[str, DownloadInfo]


@router.get("", response_model=DownloadsResponse)
async def get_downloads():
    """
    Get download links for all platforms.
    """
    return DownloadsResponse(
        version=APP_VERSION,
        platforms={k: DownloadInfo(**v) for k, v in DOWNLOADS.items()},
    )


@router.get("/{platform}", response_model=DownloadInfo)
async def get_download_for_platform(platform: str):
    """
    Get the download link for a specific platform (macos, windows, linux).
    """
    platform = platform.lower()
    if platform not in DOWNLOADS:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No download available for platform '{platform}'. Valid: macos, windows, linux",
        )
    return DownloadInfo(**DOWNLOADS[platform])
