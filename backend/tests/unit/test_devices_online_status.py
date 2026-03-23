from datetime import datetime, timedelta, timezone

from app.db.models import Device
from app.routers.devices import _is_device_online


def _device_with_last_seen(last_seen):
    return Device(
        id='device-test-1',
        user_id='user-test-1',
        name='Test Device',
        os_type='windows',
        last_seen=last_seen,
    )


def test_is_device_online_returns_false_when_last_seen_missing():
    device = _device_with_last_seen(None)
    assert _is_device_online(device) is False


def test_is_device_online_handles_timezone_aware_last_seen():
    last_seen = datetime.now(timezone.utc) - timedelta(minutes=1)
    device = _device_with_last_seen(last_seen)
    assert _is_device_online(device) is True


def test_is_device_online_handles_timezone_naive_last_seen():
    last_seen = (datetime.now(timezone.utc) - timedelta(minutes=1)).replace(tzinfo=None)
    device = _device_with_last_seen(last_seen)
    assert _is_device_online(device) is True


def test_is_device_online_returns_false_for_stale_timestamp():
    last_seen = datetime.now(timezone.utc) - timedelta(minutes=10)
    device = _device_with_last_seen(last_seen)
    assert _is_device_online(device) is False
