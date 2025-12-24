from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
from django.core.mail.message import EmailMultiAlternatives
import requests
import json
import logging

logger = logging.getLogger(__name__)

class ZeptoEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently)
        self.api_url = getattr(settings, 'ZEPTO_API_URL', "https://api.zeptomail.in/v1.1/email")
        self.api_key = getattr(settings, 'ZEPTO_API_KEY', None)
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@18pluspdf.com')

    def send_messages(self, email_messages):
        if not self.api_key:
            if self.fail_silently:
                return 0
            raise ValueError("ZEPTO_API_KEY is missing in settings")

        sent_count = 0
        for message in email_messages:
            if self._send(message):
                sent_count += 1
        return sent_count

    def _send(self, email_message):
        if not email_message.recipients():
            return False

        to_list = [{"email_address": {"address": addr}} for addr in email_message.to]
        
        # Handle reply-to
        reply_to = []
        if email_message.reply_to:
            reply_to = [{"address": email_message.reply_to[0]}]

        # Content
        html_body = ""
        text_body = email_message.body

        # Check for HTML alternative
        if isinstance(email_message, EmailMultiAlternatives):
            for content, mimetype in email_message.alternatives:
                if mimetype == 'text/html':
                    html_body = content
                    break
        
        # Fallback if the body itself is HTML (some legacy calls might do this)
        # But strictly speaking Django main body is text. 
        # For simplicity, if html_body is empty, we send text only or check content_subtype
        if not html_body and email_message.content_subtype == "html":
            html_body = email_message.body
            text_body = "" # Clear text body if it was actually HTML

        payload = {
            "from": {"address": self.from_email},
            "to": to_list,
            "subject": email_message.subject,
            "htmlbody": html_body or f"<div>{text_body}</div>",
            "textbody": text_body,
        }
        
        if reply_to:
            payload['reply_to'] = reply_to

        headers = {
            'accept': "application/json",
            'content-type': "application/json",
            'authorization': self.api_key,
        }

        try:
            response = requests.post(self.api_url, data=json.dumps(payload), headers=headers, timeout=10)
            response.raise_for_status()
            logger.info(f"ZeptoMail success: {response.text}")
            return True
        except Exception as e:
            if not self.fail_silently:
                raise e
            logger.error(f"ZeptoMail error: {e}")
            # If response exists, log it
            if 'response' in locals() and hasattr(response, 'text'):
                logger.error(f"Response: {response.text}")
            return False
