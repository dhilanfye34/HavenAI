from app.db.models import UserSetupPreferences
from app.routers import alerts
from app.services.notifications import NotificationResult


class StubNotificationService:
    def dispatch_for_alert(self, *, alert, user, preferences):
        assert preferences is not None
        return {
            'severity': alert.severity,
            'results': [
                NotificationResult(
                    channel='email',
                    attempted=True,
                    success=True,
                    status='sent',
                    detail='stubbed',
                ).as_dict(),
                NotificationResult(
                    channel='sms',
                    attempted=True,
                    success=True,
                    status='sent',
                    detail='stubbed',
                ).as_dict(),
            ],
        }


def test_create_alert_returns_notification_metadata(app_client, test_db_session):
    prefs = (
        test_db_session.query(UserSetupPreferences)
        .filter(UserSetupPreferences.user_id == 'user-1')
        .first()
    )
    prefs.sms_enabled = True
    prefs.sms_phone = '+13055551234'
    test_db_session.commit()

    app_client.app.dependency_overrides[alerts.get_notification_service] = (
        lambda: StubNotificationService()
    )

    response = app_client.post(
        '/alerts',
        json={
            'device_id': 'device-1',
            'type': 'phishing_email',
            'severity': 'high',
            'title': 'Phishing attempt blocked',
            'description': 'A malicious link was intercepted.',
            'details': {'source': 'mail-scanner'},
            'risk_score': 0.91,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body['notification_metadata'] is not None
    assert '"channel": "email"' in body['notification_metadata']
    assert body['severity'] == 'high'
