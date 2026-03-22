import pytest

from app.schemas import SetupPreferencesUpdate


def test_phone_normalization_accepts_symbols_and_plus():
    payload = SetupPreferencesUpdate(sms_phone='+1 (305) 555-1234')
    assert payload.sms_phone == '+13055551234'


def test_phone_normalization_rejects_alpha_characters():
    with pytest.raises(Exception) as exc_info:
        SetupPreferencesUpdate(sms_phone='+1 305 ABC 1234')
    assert 'Phone number must contain only digits' in str(exc_info.value)
