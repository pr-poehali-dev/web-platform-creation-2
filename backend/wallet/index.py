'''
Business: API для управления балансом, транзакциями и рефералами пользователей
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with request_id, function_name attributes
Returns: HTTP response dict with statusCode, headers, body
'''

import json
import os
from typing import Dict, Any, Optional
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'userId is required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT * FROM users WHERE user_id = %s",
                (user_id,)
            )
            user = cur.fetchone()
            
            if not user:
                referral_code = user_id
                cur.execute(
                    "INSERT INTO users (user_id, referral_code) VALUES (%s, %s) RETURNING *",
                    (user_id, referral_code)
                )
                user = cur.fetchone()
                conn.commit()
            
            cur.execute(
                "SELECT * FROM transactions WHERE user_id = %s ORDER BY created_at DESC LIMIT 10",
                (user_id,)
            )
            transactions = cur.fetchall()
            
            cur.execute(
                "SELECT COUNT(*) as count FROM referrals WHERE referrer_id = %s AND status = 'completed'",
                (user_id,)
            )
            referral_count = cur.fetchone()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user': dict(user),
                    'transactions': [dict(t) for t in transactions],
                    'referralCount': referral_count['count']
                }, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            user_id = body_data.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'userId is required'}),
                    'isBase64Encoded': False
                }
            
            if action == 'withdraw':
                amount = float(body_data.get('amount', 0))
                phone = body_data.get('phone')
                bank = body_data.get('bank')
                
                cur.execute("SELECT balance FROM users WHERE user_id = %s", (user_id,))
                user = cur.fetchone()
                
                if not user or user['balance'] < amount:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Insufficient balance'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "UPDATE users SET balance = balance - %s WHERE user_id = %s",
                    (amount, user_id)
                )
                
                cur.execute(
                    "INSERT INTO transactions (user_id, type, amount, status, phone, bank, description) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (user_id, 'withdraw', amount, 'completed', phone, bank, 'Вывод через СБП')
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Withdrawal successful'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'topup':
                amount = float(body_data.get('amount', 0))
                
                cur.execute(
                    "UPDATE users SET balance = balance + %s WHERE user_id = %s",
                    (amount, user_id)
                )
                
                cur.execute(
                    "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, 'topup', amount, 'completed', 'Пополнение через СБП')
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Top-up successful'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'cardBonus':
                bonus = 500.00
                
                cur.execute(
                    "UPDATE users SET balance = balance + %s, card_earnings = card_earnings + %s WHERE user_id = %s",
                    (bonus, bonus, user_id)
                )
                
                cur.execute(
                    "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, 'card_bonus', bonus, 'completed', 'Бонус за оформление карты')
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Card bonus added'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'referralBonus':
                referred_id = body_data.get('referredId')
                bonus = 200.00
                
                cur.execute(
                    "UPDATE users SET balance = balance + %s, referral_earnings = referral_earnings + %s WHERE user_id = %s",
                    (bonus, bonus, user_id)
                )
                
                cur.execute(
                    "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, 'referral_bonus', bonus, 'completed', 'Реферальный бонус')
                )
                
                cur.execute(
                    "INSERT INTO referrals (referrer_id, referred_id, status) VALUES (%s, %s, %s)",
                    (user_id, referred_id, 'completed')
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Referral bonus added'}),
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
