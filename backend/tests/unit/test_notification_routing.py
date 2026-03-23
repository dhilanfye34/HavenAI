from app.db.models import Alert, User, UserSetupPreferences
from app.services.notifications import NotificationResult, NotificationService


class FakeNotificationService(NotificationService):
    def _send_email(self, *, alert, user, preferences):
        return NotificationResult(
            channel='email',
            attempted=True,
            success=True,
            status='sent',
            detail='stubbed',
        )

    def _send_twilio_message(self, *, channel: str, to_phone: str, body: str):
        return NotificationResult(
            channel=channel,
            attempted=True,
            success=True,
            status='sent',
            detail='stubbed',
        )

    def _send_twilio_call(self, *, to_phone: str, twiml: str):
        return NotificationResult(
            channel='voice_call',
            attempted=True,
            success=True,
            status='sent',
            detail='stubbed',
        )


def _alert(severity: str):
    return Alert(
        id='a1',
        device_id='d1',
        user_id='u1',
        type='suspicious_download',
        severity=severity,
        title='Suspicious file',
        description='Found bad artifact',
    )


def _user():
    return User(id='u1', email='u1@example.com', hashed_password='x', is_active=True)


def test_sms_and_voice_skip_when_below_threshold():
    service = FakeNotificationService()
    prefs = UserSetupPreferences(
        user_id='u1',
        email_enabled=False,
        sms_enabled=True,
        sms_phone='+13055551234',
        sms_min_severity='high',
        voice_call_enabled=True,
        voice_phone='+13055555678',
        voice_call_min_severity='critical',
    )

    metadata = service.dispatch_for_alert(alert=_alert('medium'), user=_user(), preferences=prefs)
    results = {result['channel']: result for result in metadata['results']}

    assert results['sms']['status'] == 'skipped'
    assert 'below SMS threshold' in (results['sms']['detail'] or '')
    assert results['voice_call']['status'] == 'skipped'
    assert 'below voice threshold' in (results['voice_call']['detail'] or '')


def test_sms_attempted_when_at_or_above_threshold():
    service = FakeNotificationService()
    prefs = UserSetupPreferences(
        user_id='u1',
        email_enabled=False,
        sms_enabled=True,
        sms_phone='+13055551234',
        sms_min_severity='high',
        voice_call_enabled=False,
    )

    metadata = service.dispatch_for_alert(alert=_alert('high'), user=_user(), preferences=prefs)
    results = {result['channel']: result for result in metadata['results']}

    assert results['sms']['status'] == 'sent'
