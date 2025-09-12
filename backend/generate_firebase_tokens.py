"""
🔥 GENERADOR DE TOKENS FIREBASE PARA PRUEBAS - Postman
Este script te ayuda a obtener tokens reales de Firebase para probar en Postman
"""

import firebase_admin
from firebase_admin import credentials, auth
import os
import sys

def init_firebase():
    """Inicializar Firebase Admin SDK"""
    try:
        # Buscar archivo de credenciales
        cred_file = None
        for file in os.listdir('.'):
            if 'firebase-adminsdk' in file and file.endswith('.json'):
                cred_file = file
                break
        
        if not cred_file:
            print("❌ No se encontró archivo de credenciales Firebase")
            return False
            
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)
        print(f"✅ Firebase inicializado con {cred_file}")
        return True
        
    except Exception as e:
        print(f"❌ Error inicializando Firebase: {e}")
        return False

def create_custom_token(uid, email, role):
    """Crear token personalizado para pruebas"""
    try:
        # Claims adicionales con información del usuario
        additional_claims = {
            'email': email,
            'role': role,
            'testing': True
        }
        
        # Crear token personalizado
        custom_token = auth.create_custom_token(uid, additional_claims)
        return custom_token.decode('utf-8')
        
    except Exception as e:
        print(f"❌ Error creando token: {e}")
        return None

def main():
    print("🔥 GENERADOR DE TOKENS FIREBASE PARA POSTMAN")
    print("=" * 50)
    
    if not init_firebase():
        return
    
    # Usuarios de prueba disponibles
    test_users = [
        {"uid": "Zq8wE8RjDmfYYPveOwbG534QYu02", "email": "tenjocamilo4@gmail.com", "role": "Auditor"},
        {"uid": "test_administrator", "email": "admin@bytedental.com", "role": "Administrator"},
        {"uid": "test_auditor", "email": "auditor@bytedental.com", "role": "Auditor"},
        {"uid": "test_assistant", "email": "assistant@bytedental.com", "role": "Assistant"},
        {"uid": "BrTJVeoznBSE5iALGAnS9pgWu202", "email": "juan.perez@bytedental.com", "role": "Doctor"}
    ]
    
    print("\n🎫 TOKENS GENERADOS PARA POSTMAN:")
    print("-" * 50)
    
    for user in test_users:
        token = create_custom_token(user["uid"], user["email"], user["role"])
        if token:
            print(f"\n👤 {user['role']} ({user['email']}):")
            print(f"🆔 UID: {user['uid']}")
            print(f"🎫 TOKEN (para Postman):")
            print(f"Bearer {token}")
            print(f"📋 Header completo:")
            print(f"Authorization: Bearer {token}")
            print("-" * 30)
    
    print("\n📚 INSTRUCCIONES PARA POSTMAN:")
    print("1. Copiar el token del rol que quieres probar")
    print("2. En Postman, ir a Headers")
    print("3. Agregar: Authorization: Bearer <TOKEN>")
    print("4. Probar endpoints según el rol")
    
    print("\n🎯 ENDPOINTS PARA PROBAR:")
    print("• GET /api/users (Solo Administrator)")
    print("• POST /api/users (Solo Administrator)")  
    print("• GET /api/auditoria (Solo Auditor)")
    print("• GET /health (Público)")

if __name__ == "__main__":
    main()
