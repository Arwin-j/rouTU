# api/process_schedule.py

import os
import json
import mimetypes
from parse import parse_schedule_with_gemini
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs
import base64

class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)

        content_type = self.headers.get('Content-Type', '')

        if "multipart/form-data" in content_type:
            # NOTE: Vercel serverless doesn't support complex multipart parsing in this form.
            # You'll need to switch to a JS backend or use text-only processing for now.
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Image/Audio upload not supported in Python Vercel functions. Use text input.")
            return

        try:
            data = json.loads(body.decode('utf-8'))
            input_type = data.get('type')
            if input_type == "text":
                text_input = data.get("text_input", "")
                locations, times = parse_schedule_with_gemini(input_text=text_input, input_type='text')

                classes = []
                for loc, time in zip(locations, times):
                    classes.append({
                        'class_name': 'Class',
                        'days': None,
                        'start_time': time.split('-')[0].strip() if '-' in time else time,
                        'end_time': time.split('-')[1].strip() if '-' in time else '',
                        'full_address': loc,
                        'map_link': f'https://www.google.com/maps/search/{loc.replace(" ", "+")}'
                    })

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'classes': classes}).encode())
            else:
                raise ValueError("Only 'text' input is supported via Vercel Python functions.")
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
