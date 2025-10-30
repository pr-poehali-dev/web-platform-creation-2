'''
Business: Админ-панель для управления пользователями, транзакциями и бонусами
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with request_id, function_name attributes
Returns: HTTP response dict with statusCode, headers, body
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def check_admin(user_id: str, conn) -> bool:
    cur = conn.cursor()
    cur.execute("SELECT is_admin FROM users WHERE user_id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    return user and user['is_admin']

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = None
    
    try:
        headers = event.get('headers', {})
        admin_id = headers.get('x-admin-id') or headers.get('X-Admin-Id')
        
        if not admin_id or not check_admin(admin_id, conn):
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Access denied'}),
                'isBase64Encoded': False
            }
        
        cur = conn.cursor()
        
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            action = params.get('action')
            
            if action == 'users':
                limit = int(params.get('limit', 50))
                offset = int(params.get('offset', 0))
                
                cur.execute(
                    "SELECT * FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s",
                    (limit, offset)
                )
                users = cur.fetchall()
                
                cur.execute("SELECT COUNT(*) as count FROM users")
                total = cur.fetchone()['count']
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'users': [dict(u) for u in users],
                        'total': total
                    }, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'transactions':
                limit = int(params.get('limit', 50))
                offset = int(params.get('offset', 0))
                
                cur.execute(
                    "SELECT * FROM transactions ORDER BY created_at DESC LIMIT %s OFFSET %s",
                    (limit, offset)
                )
                transactions = cur.fetchall()
                
                cur.execute("SELECT COUNT(*) as count FROM transactions")
                total = cur.fetchone()['count']
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'transactions': [dict(t) for t in transactions],
                        'total': total
                    }, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'stats':
                cur.execute("SELECT COUNT(*) as count FROM users")
                total_users = cur.fetchone()['count']
                
                cur.execute("SELECT SUM(balance) as total FROM users")
                total_balance = cur.fetchone()['total'] or 0
                
                cur.execute("SELECT COUNT(*) as count FROM transactions WHERE type = 'withdraw' AND status = 'completed'")
                total_withdrawals = cur.fetchone()['count']
                
                cur.execute("SELECT COUNT(*) as count FROM transactions WHERE type = 'topup' AND status = 'completed'")
                total_topups = cur.fetchone()['count']
                
                cur.execute("SELECT COUNT(*) as count FROM referrals WHERE status = 'completed'")
                total_referrals = cur.fetchone()['count']
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'totalUsers': total_users,
                        'totalBalance': float(total_balance),
                        'totalWithdrawals': total_withdrawals,
                        'totalTopups': total_topups,
                        'totalReferrals': total_referrals
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'add_bonus':
                user_id = body_data.get('userId')
                amount = float(body_data.get('amount'))
                bonus_type = body_data.get('type', 'card_bonus')
                description = body_data.get('description', 'Бонус от администратора')
                
                if bonus_type == 'card_bonus':
                    cur.execute(
                        "UPDATE users SET balance = balance + %s, card_earnings = card_earnings + %s WHERE user_id = %s",
                        (amount, amount, user_id)
                    )
                elif bonus_type == 'referral_bonus':
                    cur.execute(
                        "UPDATE users SET balance = balance + %s, referral_earnings = referral_earnings + %s WHERE user_id = %s",
                        (amount, amount, user_id)
                    )
                else:
                    cur.execute(
                        "UPDATE users SET balance = balance + %s WHERE user_id = %s",
                        (amount, user_id)
                    )
                
                cur.execute(
                    "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, bonus_type, amount, 'completed', description)
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Bonus added'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'update_balance':
                user_id = body_data.get('userId')
                new_balance = float(body_data.get('balance'))
                
                cur.execute(
                    "UPDATE users SET balance = %s WHERE user_id = %s",
                    (new_balance, user_id)
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Balance updated'}),
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
        if cur:
            cur.close()
        conn.close()