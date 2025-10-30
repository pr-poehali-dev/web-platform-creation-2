'''
Business: Telegram авторизация и проверка прав администратора
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with request_id, function_name attributes
Returns: HTTP response dict with statusCode, headers, body
'''

import json
import os
import hashlib
import hmac
from typing import Dict, Any
from urllib.parse import unquote
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def verify_telegram_auth(auth_data: Dict[str, str]) -> bool:
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return False
    
    check_hash = auth_data.pop('hash', '')
    data_check_string = '\n'.join([f'{k}={v}' for k, v in sorted(auth_data.items())])
    
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    return calculated_hash == check_hash

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'telegram_login':
                auth_data = body_data.get('authData', {})
                
                if not verify_telegram_auth(auth_data):
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid authentication'}),
                        'isBase64Encoded': False
                    }
                
                telegram_id = int(auth_data.get('id'))
                first_name = auth_data.get('first_name', '')
                last_name = auth_data.get('last_name', '')
                username = auth_data.get('username', '')
                photo_url = auth_data.get('photo_url', '')
                
                admin_telegram_id = os.environ.get('ADMIN_TELEGRAM_ID')
                is_admin = str(telegram_id) == admin_telegram_id
                
                cur.execute(
                    "SELECT * FROM users WHERE telegram_id = %s",
                    (telegram_id,)
                )
                user = cur.fetchone()
                
                if user:
                    cur.execute(
                        "UPDATE users SET first_name = %s, last_name = %s, username = %s, photo_url = %s, is_admin = %s, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = %s RETURNING *",
                        (first_name, last_name, username, photo_url, is_admin, telegram_id)
                    )
                    user = cur.fetchone()
                else:
                    user_id = f'TG{telegram_id}'
                    referral_code = user_id
                    
                    cur.execute(
                        "INSERT INTO users (user_id, telegram_id, first_name, last_name, username, photo_url, referral_code, is_admin) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
                        (user_id, telegram_id, first_name, last_name, username, photo_url, referral_code, is_admin)
                    )
                    user = cur.fetchone()
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'user': dict(user)
                    }, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'check_admin':
                user_id = body_data.get('userId')
                
                cur.execute(
                    "SELECT is_admin FROM users WHERE user_id = %s",
                    (user_id,)
                )
                user = cur.fetchone()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'isAdmin': user['is_admin'] if user else False
                    }),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()
