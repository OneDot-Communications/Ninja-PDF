"""
Google Sheets API Service

This service handles interactions with Google Sheets API to save feedback submissions.
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


class GoogleSheetsService:
    """Service for interacting with Google Sheets API"""
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self):
        self.spreadsheet_id = os.getenv('GOOGLE_SHEETS_SPREADSHEET_ID')
        
        if not self.spreadsheet_id:
            raise ValueError(
                "Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable."
            )
        
        # Try to get service account credentials
        self.credentials = self._get_credentials()
    
    def _get_credentials(self):
        """
        Get Google API credentials from Service Account JSON.
        
        Supports two methods:
        1. GOOGLE_SERVICE_ACCOUNT_JSON env variable with path to JSON file
        2. GOOGLE_SERVICE_ACCOUNT_KEY env variable with JSON string
        """
        # Method 1: Path to JSON file
        json_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
        if json_path and os.path.exists(json_path):
            return service_account.Credentials.from_service_account_file(
                json_path, scopes=self.SCOPES
            )
        
        # Method 2: JSON string in environment variable
        json_key = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY')
        if json_key:
            try:
                service_account_info = json.loads(json_key)
                return service_account.Credentials.from_service_account_info(
                    service_account_info, scopes=self.SCOPES
                )
            except json.JSONDecodeError:
                pass
        
        # If no credentials found, return None (will handle gracefully)
        return None
    
    def append_feedback(self, name: str, feedback_type: str, description: str) -> Dict[str, Any]:
        """
        Append feedback data to Google Sheet.
        
        Args:
            name: Name of the person providing feedback
            feedback_type: Type of feedback (bug, functionality, ui)
            description: Detailed description of the feedback
            
        Returns:
            Dict containing success status and message
        """
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # If no credentials, return success but log the data
            if not self.credentials:
                print(f"[FEEDBACK - No Google Sheets credentials] {name} | {feedback_type} | {description} | {timestamp}")
                return {
                    'success': True,
                    'message': 'Feedback recorded (Google Sheets not configured)',
                    'data': {
                        'name': name,
                        'feedback_type': feedback_type,
                        'description': description,
                        'timestamp': timestamp
                    }
                }
            
            # Build the Google Sheets service
            service = build('sheets', 'v4', credentials=self.credentials)
            
            # Prepare the data to append
            values = [[name, feedback_type, description, timestamp]]
            body = {'values': values}
            
            # Append to the sheet
            result = service.spreadsheets().values().append(
                spreadsheetId=self.spreadsheet_id,
                range='Sheet1!A:D',  # Appends to columns A-D
                valueInputOption='USER_ENTERED',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute()
            
            print(f"[FEEDBACK - Saved to Google Sheets] {name} | {feedback_type}")
            
            return {
                'success': True,
                'message': 'Feedback saved to Google Sheets successfully',
                'data': {
                    'name': name,
                    'feedback_type': feedback_type,
                    'description': description,
                    'timestamp': timestamp
                },
                'updates': result.get('updates')
            }
            
        except HttpError as error:
            error_message = f'Google Sheets API error: {str(error)}'
            print(f"[FEEDBACK - ERROR] {error_message}")
            return {
                'success': False,
                'message': error_message
            }
        except Exception as error:
            error_message = f'Error saving feedback: {str(error)}'
            print(f"[FEEDBACK - ERROR] {error_message}")
            return {
                'success': False,
                'message': error_message
            }


# Singleton instance
_sheets_service = None


def get_sheets_service() -> GoogleSheetsService:
    """Get or create GoogleSheetsService instance"""
    global _sheets_service
    if _sheets_service is None:
        _sheets_service = GoogleSheetsService()
    return _sheets_service
