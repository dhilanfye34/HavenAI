from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import downloads


def test_get_downloads_includes_linux_entry():
    app = FastAPI()
    app.include_router(downloads.router, prefix="/downloads")

    with TestClient(app) as client:
        response = client.get("/downloads")

    assert response.status_code == 200
    body = response.json()
    assert "linux" in body["platforms"]
    linux = body["platforms"]["linux"]
    assert linux["platform"] == "linux"
    assert linux["filename"].endswith(".AppImage")
    assert linux["url"].endswith(".AppImage")


def test_get_download_for_linux_returns_appimage_metadata():
    app = FastAPI()
    app.include_router(downloads.router, prefix="/downloads")

    with TestClient(app) as client:
        response = client.get("/downloads/linux")

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "linux"
    assert body["filename"].endswith(".AppImage")
    assert body["arch"] == "x64"
