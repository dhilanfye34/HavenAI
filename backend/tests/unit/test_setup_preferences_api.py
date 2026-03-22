
def test_update_preferences_requires_phone_when_sms_enabled(app_client):
    response = app_client.put('/setup/preferences', json={'sms_enabled': True, 'sms_phone': None})
    assert response.status_code == 400
    assert 'SMS is enabled but no SMS phone number is set.' in response.text


def test_update_preferences_accepts_thresholds_and_phone(app_client):
    response = app_client.put(
        '/setup/preferences',
        json={
            'sms_enabled': True,
            'sms_phone': '+1 (305) 555-1234',
            'sms_min_severity': 'critical',
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body['sms_enabled'] is True
    assert body['sms_phone'] == '+13055551234'
    assert body['sms_min_severity'] == 'critical'
